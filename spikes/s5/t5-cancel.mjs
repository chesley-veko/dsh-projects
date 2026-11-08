#!/usr/bin/env node
/**
 * t5-cancel.mjs — S5-5：session/cancel 在工具调用进行中取消，记录半写与后续 prompt。
 *
 * 用法：
 *   node t5-cancel.mjs --executor-cmd "dsh --profile acp" \
 *     --log-dir ./evidence/<run>/t5 --cwd /tmp/spike-s5-work
 *
 * 步骤：
 *   1. session/new 带薄代理 MCP；prompt 调用 projects_sleep（60 秒），
 *      待 tool_call 通知出现后发 session/cancel；记录 prompt 的
 *      stopReason、取消耗时、取消后执行者是否继续输出。
 *   2. 半写：prompt 调用 projects_slow_write（20 块 × 500ms），待文件
 *      出现且至少写入 1 块后取消；记录文件实际字节数/块数、prompt 的
 *      stopReason。
 *   3. 后续 prompt：取消后立即再发一轮 prompt（回 OK），确认会话仍可用。
 *   4. 反例 A：无进行中 prompt 时发 cancel，记录行为。
 *      反例 B：sleep 进行中连续发两次 cancel，记录行为。
 *
 * 依据：fcc0ad46 session.ts——cancel() 取消进行中 prompt，无 inflight
 * 时改为 agent.cancel({kind:'user'})。
 */
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient, sleep } from './rpc-client.mjs';
import { parseArgs, splitCmd, newRun } from './test-harness.mjs';

const args = parseArgs(process.argv.slice(2));
const executorCmd = args['executor-cmd'] ?? 'dsh --profile acp';
const label = args.label ?? 'executor';
const logDir = args['log-dir'] ?? `./evidence/t5-${label}`;
const cwd = resolve(args.cwd ?? '/tmp/spike-s5-work');
mkdirSync(cwd, { recursive: true });
const run = newRun({ test: 't5-cancel', executorCmd, logDir });
const [command, ...cmdArgs] = splitCmd(executorCmd);
const here = new URL('.', import.meta.url).pathname;
const nodeBin = process.execPath;
const proxyPath = resolve(here, 'projects-mcp-stdio.mjs');
const engineLog = join(logDir, 'fake-engine.jsonl');
const proxyLog = join(logDir, 'projects-mcp.jsonl');
const scratch = join(cwd, 'spike-scratch');

const engine = spawn(nodeBin, [resolve(here, 'fake-engine.mjs'), '--port', '8931', '--log', engineLog], { stdio: 'ignore' });
async function engineReady() {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch('http://127.0.0.1:8931/health');
      if (r.ok) return true;
    } catch { /* retry */ }
    await sleep(500);
  }
  return false;
}

let code = 1;
const client = createClient({ command, args: cmdArgs, logPath: join(logDir, 'rpc.jsonl'), label });
try {
  run.check('假 Engine 就绪', await engineReady(), 'http://127.0.0.1:8931/health');
  await client.request('initialize', { protocolVersion: '1.0', clientInfo: { name: 'spike-s5', version: '0.1.0' }, clientCapabilities: {} });
  const created = await client.request('session/new', {
    cwd,
    mcpServers: [{ name: 'projects', command: nodeBin, args: [proxyPath, '--log', proxyLog, '--engine-url', 'http://127.0.0.1:8931', '--scratch', scratch] }],
  }, { timeoutMs: 120000 });
  const sessionId = created.sessionId;
  run.check('session/new 成功', typeof sessionId === 'string', `sessionId=${sessionId}`);

  // 反例 A：无进行中 prompt 时取消。
  client.notify('session/cancel', { sessionId });
  await sleep(2000);
  run.info('反例 A：空闲时 cancel 未使会话出错', '（2 秒后会话仍在，见后续步骤）');

  // 1. sleep 进行中取消。
  const sleepP = client.request('session/prompt', {
    sessionId,
    prompt: [{ type: 'text', text: 'Call projects_sleep with ms 60000, then report DONE. Do not do anything else.' }],
  }, { timeoutMs: 300000 });
  try {
    await client.waitFor((e) => e.kind === 'notification' && e.method === 'session/update', { timeoutMs: 120000 });
  } catch { /* fall through: cancel anyway and record */ }
  await sleep(3000);
  const cancelAt = Date.now();
  client.notify('session/cancel', { sessionId });
  const sleepRes = await sleepP;
  run.info('sleep 取消后 prompt 结束', `stopReason=${sleepRes?.stopReason}，取消后 ${((Date.now() - cancelAt) / 1000).toFixed(1)}s 结束`);
  run.check('取消后 prompt 有明确结束原因', typeof sleepRes?.stopReason === 'string', `stopReason=${sleepRes?.stopReason}`);

  // 2. 半写：slow_write 进行中取消。
  const halfFile = join(scratch, 'half.txt');
  const writeP = client.request('session/prompt', {
    sessionId,
    prompt: [{ type: 'text', text: 'Call projects_slow_write with path "half.txt", chunks 20, chunkDelayMs 500, then report DONE. Do not do anything else.' }],
  }, { timeoutMs: 300000 });
  let halfBytes = 0;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    if (existsSync(halfFile)) {
      halfBytes = statSync(halfFile).size;
      if (halfBytes > 0) break;
    }
  }
  run.info('取消前半写文件已写入字节', `${halfBytes}`);
  client.notify('session/cancel', { sessionId });
  const writeRes = await writeP;
  await sleep(1000);
  const finalBytes = existsSync(halfFile) ? statSync(halfFile).size : 0;
  const finalText = existsSync(halfFile) ? readFileSync(halfFile, 'utf8') : '';
  const markers = finalText.match(/\[\d+\/(\d+)\]/g) ?? [];
  const totalChunks = markers.length > 0 ? Number(markers[0].match(/\/(\d+)\]/)[1]) : 0;
  const finalChunks = markers.length;
  run.info('半写文件最终状态', `bytes=${finalBytes} chunks=${finalChunks}/${totalChunks} stopReason=${writeRes?.stopReason}`);
  run.check('取消留下半写文件（未写满）', finalChunks > 0 && totalChunks > 0 && finalChunks < totalChunks, `chunks=${finalChunks}/${totalChunks}`);
  run.check('取消后 prompt 有明确结束原因', typeof writeRes?.stopReason === 'string', `stopReason=${writeRes?.stopReason}`);

  // 反例 B：sleep 进行中连续两次 cancel。
  const sleepP2 = client.request('session/prompt', {
    sessionId,
    prompt: [{ type: 'text', text: 'Call projects_sleep with ms 60000, then report DONE.' }],
  }, { timeoutMs: 300000 });
  await sleep(5000);
  client.notify('session/cancel', { sessionId });
  client.notify('session/cancel', { sessionId });
  const sleepRes2 = await sleepP2;
  run.info('反例 B：连续两次 cancel 后 prompt 结束', `stopReason=${sleepRes2?.stopReason}`);

  // 3. 后续 prompt：会话仍可用。
  const okP = await client.request('session/prompt', {
    sessionId,
    prompt: [{ type: 'text', text: 'Reply with exactly the word OK and nothing else.' }],
  }, { timeoutMs: 300000 });
  run.check('取消后下一轮 prompt 正常完成', okP?.stopReason !== undefined, `stopReason=${okP?.stopReason}`);
  run.info('后续 prompt 回执', client.updateTexts().slice(-300));

  code = run.finish({ sessionId, halfBytes: finalBytes, halfChunks: finalChunks });
} catch (e) {
  run.check('t5 主流程完成', false, String(e?.message ?? e));
  code = run.finish({ error: String(e?.message ?? e) });
} finally {
  await client.close();
  engine.kill('SIGTERM');
}
process.exit(code);
