#!/usr/bin/env node
/**
 * t2-session-new-mcp.mjs — S5-2：session/new 带 mcpServers，接薄代理并列出/调用工具。
 *
 * 用法：
 *   node t2-session-new-mcp.mjs --executor-cmd "dsh --profile acp" \
 *     --log-dir ./evidence/<run>/t2 --cwd /tmp/spike-s5-work
 *
 * 步骤：
 *   1. 起假 Engine（回环 HTTP）与薄代理配置；session/new 带 mcpServers
 *      （stdio，command 必须是绝对路径——fcc0ad46 mcp.ts 的硬性要求）。
 *   2. 发 prompt 让执行者列出并调用 projects_echo，断言：
 *      tool_call 通知出现、假 Engine 日志里收到该调用、模型回执含回显。
 *   3. 反例 A：两个同名 MCP 服务器 -> 应报 invalidParams（mcp.ts 去重）。
 *      反例 B：command 用相对路径 -> 应报 invalidParams（mcp.ts 绝对路径要求）。
 *      反例 C：command 指向不存在的文件 -> 应失败（failOnStartupError）。
 *
 * 注意：步骤 2 依赖模型按提示调用工具；断言以协议层证据为准
 * （tool_call 通知 + 假 Engine 日志），模型 prose 只作辅助证据。
 */
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient, sleep } from './rpc-client.mjs';
import { parseArgs, splitCmd, newRun } from './test-harness.mjs';

const args = parseArgs(process.argv.slice(2));
const executorCmd = args['executor-cmd'] ?? 'dsh --profile acp';
const label = args.label ?? 'executor';
const logDir = args['log-dir'] ?? `./evidence/t2-${label}`;
const cwd = resolve(args.cwd ?? '/tmp/spike-s5-work');
mkdirSync(cwd, { recursive: true });
const run = newRun({ test: 't2-session-new-mcp', executorCmd, logDir });
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

  const mcpServers = [{
    name: 'projects',
    command: nodeBin,
    args: [proxyPath, '--log', proxyLog, '--engine-url', 'http://127.0.0.1:8931', '--scratch', scratch],
  }];
  const created = await client.request('session/new', { cwd, mcpServers }, { timeoutMs: 120000 });
  run.check('session/new 返回 sessionId', typeof created.sessionId === 'string' && created.sessionId.length > 0, `sessionId=${created.sessionId}`);
  run.check('session/new 返回 configOptions', Array.isArray(created.configOptions), `options=${(created.configOptions ?? []).map((o) => o.configId).join(',')}`);
  const sessionId = created.sessionId;

  const promptP = client.request('session/prompt', {
    sessionId,
    prompt: [{ type: 'text', text: 'List the tools from the projects MCP server, then call projects_echo with text "spike-s5-probe" and report exactly what it returned. Do not do anything else.' }],
  }, { timeoutMs: 300000 });
  const promptRes = await promptP;
  run.info('prompt 结束', `stopReason=${promptRes?.stopReason ?? '(无)'}`);
  const toolCalls = client.toolCalls();
  run.check('执行者发起了工具调用（tool_call 通知）', toolCalls.length > 0, `${toolCalls.length} 次 tool_call/tool_call_update`);
  const echoCall = toolCalls.find((t) => JSON.stringify(t).includes('projects_echo'));
  run.check('其中包含 projects_echo 调用', echoCall !== undefined, echoCall ? JSON.stringify(echoCall).slice(0, 300) : '未见 projects_echo');
  await sleep(1000);
  const engineCalls = await (await fetch('http://127.0.0.1:8931/calls')).json().catch(() => ({ calls: [] }));
  const seen = (engineCalls.calls ?? []).find((c) => c.tool === 'projects_echo' && c.args?.text === 'spike-s5-probe');
  run.check('假 Engine 收到了 projects_echo(spike-s5-probe)', seen !== undefined, seen ? JSON.stringify(seen).slice(0, 300) : 'Engine 日志无此调用');
  run.info('模型回执文本（辅助证据）', client.updateTexts().slice(0, 1000));

  // 反例 A：同名 MCP 服务器。
  try {
    await client.request('session/new', { cwd, mcpServers: [mcpServers[0], { ...mcpServers[0] }] }, { timeoutMs: 60000 });
    run.check('反例 A：同名 MCP 服务器应被拒', false, '服务端接受了重复名字');
  } catch (e) {
    run.check('反例 A：同名 MCP 服务器被拒', /duplicate/i.test(e.message), e.message);
  }
  // 反例 B：相对路径 command。
  try {
    await client.request('session/new', { cwd, mcpServers: [{ name: 'bad', command: 'node', args: [proxyPath] }] }, { timeoutMs: 60000 });
    run.check('反例 B：相对路径 command 应被拒', false, '服务端接受了相对路径');
  } catch (e) {
    run.check('反例 B：相对路径 command 被拒', /absolute path/i.test(e.message), e.message);
  }
  // 反例 C：不存在的 command。
  try {
    await client.request('session/new', { cwd, mcpServers: [{ name: 'ghost', command: '/nonexistent/node', args: [] }] }, { timeoutMs: 60000 });
    run.check('反例 C：不存在的 command 应失败', false, '服务端接受了不存在的命令');
  } catch (e) {
    run.check('反例 C：不存在的 command 失败', true, e.message);
  }
  code = run.finish({ sessionId, engineCalls: (engineCalls.calls ?? []).length });
} catch (e) {
  run.check('t2 主流程完成', false, String(e?.message ?? e));
  code = run.finish({ error: String(e?.message ?? e) });
} finally {
  await client.close();
  engine.kill('SIGTERM');
}
process.exit(code);
