#!/usr/bin/env node
/**
 * s6-disconnect.mjs — S6 阶段 B：断线 30 秒再恢复，记录 ACP 会话、远端进程与 MCP 调用。
 *
 * 用法（dsh-01 上；假 Engine 须已在本机跑起）：
 *   node s6-disconnect.mjs \
 *     --executor-cmd "ssh -R 8931:127.0.0.1:8931 -o BatchMode=yes -o StrictHostKeyChecking=accept-new -p 2222 <user>@ssh.instabox.sh -- env DSH_HOME=/data/home/workspace/dsh-superagent-lab dsh --profile acp" \
 *     --proxy-path /data/home/workspace/spike-materials/s5/projects-mcp-stdio.mjs \
 *     --remote-node /path/to/node-on-dsh-02 \
 *     --remote-check-ssh "ssh -o BatchMode=yes -p 2222 <user>@ssh.instabox.sh" \
 *     --remote-check-script ./remote-check.sh \
 *     --log-dir ./evidence/<run>/phase-b --cwd /data/home/workspace/spike-s6-work \
 *     --stop-seconds 30
 *
 * 断线方法：对本机 ssh 进程发 SIGSTOP（冻结 stdio 通道，等价于网络分区，
 * 不改任何机器网络配置），30 秒后 SIGCONT。期间用第二条 ssh 通道跑
 * remote-check.sh 观测远端进程状态。
 *
 * 观测点：
 *   1. 分区前开始的长 prompt（projects_sleep 120 秒）在恢复后是否完成，
 *      stopReason 是什么；
 *   2. 分区中途发出的 prompt 请求在恢复后是否送达并完成；
 *   3. 恢复后 projects_echo 是否仍能打通 MCP 回路（假 Engine 日志）；
 *   4. 分区期间远端 dsh 进程是否存活（第二通道 ps）；
 *   5. 本机进程退出后远端进程是否残留（关闭后再次 remote-check）。
 *
 * 关键协议形状（2026-11-09 修正）：stdio MCP 条目必须显式带 env: []（否则被
 * ACP SDK 静默丢弃，不挂载）；模型侧工具名是 mcp__projects__projects_sleep /
 * mcp__projects__projects_echo，所有工具调用断言按精确名匹配，禁用 JSON 子串。
 *
 * 强变体（可选，runbook）：在控制台暂停 dsh-02 整机 30 秒再恢复，
 * 同样记录 1–5。机器暂停时第二通道也会断，remote-check 改为恢复后补查。
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, sleep } from '../s5/rpc-client.mjs';
import { parseArgs, splitCmd, newRun } from '../s5/test-harness.mjs';

const args = parseArgs(process.argv.slice(2));
const executorCmd = args['executor-cmd'] ?? '';
const label = args.label ?? 'remote';
const logDir = args['log-dir'] ?? `./evidence/s6-phase-b-${label}`;
const cwd = args.cwd ?? '/data/home/workspace/spike-s6-work'; // 远端工作目录
const proxyPath = args['proxy-path'] ?? '/data/home/workspace/spike-materials/s5/projects-mcp-stdio.mjs';
const remoteNode = args['remote-node'] ?? '';
const engineUrl = args['engine-url'] ?? 'http://127.0.0.1:8931';
const stopSeconds = Number(args['stop-seconds'] ?? '30');
const remoteCheckSsh = args['remote-check-ssh'] ?? '';
const remoteCheckScript = args['remote-check-script'] ?? './remote-check.sh';
if (!executorCmd || !remoteNode) {
  console.error('missing --executor-cmd or --remote-node (see README)');
  process.exit(2);
}
const run = newRun({ test: 's6-disconnect', executorCmd, logDir });
const [command, ...cmdArgs] = splitCmd(executorCmd);
const proxyLog = join(logDir, 'projects-mcp-remote.jsonl');
const scratch = `${cwd}/spike-scratch`;

// 经第二条 ssh 通道在 dsh-02 上跑 remote-check.sh，输出记入文件。
async function remoteCheck(tag) {
  if (!remoteCheckSsh) return '(no --remote-check-ssh, skipped)';
  const script = readFileSync(remoteCheckScript, 'utf8');
  const sshArgs = [...remoteCheckSsh.trim().split(/\s+/), 'bash -s'];
  const out = await new Promise((resolve) => {
    const p = spawn(sshArgs[0], sshArgs.slice(1), { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => { stdout += d; });
    p.stderr.on('data', (d) => { stderr += d; });
    p.on('error', (e) => resolve(`(ssh error: ${e.message})`));
    p.on('close', (code) => resolve(code === 0 ? stdout : `(ssh exit ${code}) ${stdout}\n${stderr}`));
    p.stdin.end(script);
  });
  const { writeFileSync } = await import('node:fs');
  writeFileSync(join(logDir, `remote-check-${tag}.txt`), out);
  return out.slice(0, 2000);
}

let code = 1;
const client = createClient({ command, args: cmdArgs, logPath: join(logDir, 'rpc.jsonl'), label });
const sshPid = client.child.pid;
try {
  const health = await fetch(`${engineUrl}/health`).then((r) => r.ok).catch(() => false);
  run.check('本机假 Engine 就绪', health, engineUrl);
  const init = await client.request('initialize', { protocolVersion: 1, clientInfo: { name: 'spike-s6', version: '0.1.0' }, clientCapabilities: {} }, { timeoutMs: 120000 });
  run.check('远端 initialize 成功', typeof init?.protocolVersion === 'number', `agent=${init?.agentInfo?.name ?? ''}`);
  const created = await client.request('session/new', {
    cwd,
    mcpServers: [{ name: 'projects', command: remoteNode, args: [proxyPath, '--log', proxyLog, '--engine-url', engineUrl, '--scratch', scratch], env: [] }],
  }, { timeoutMs: 180000 });
  const sessionId = created.sessionId;
  run.check('远端 session/new 成功', typeof sessionId === 'string', `sessionId=${sessionId}`);
  run.info('分区前远端进程状态', await remoteCheck('before'));

  // 1. 分区前开始长 prompt。
  const sleepStartedAt = Date.now();
  const sleepP = client.request('session/prompt', {
    sessionId,
    prompt: [{ type: 'text', text: 'Call the MCP tool mcp__projects__projects_sleep with ms 120000, then report DONE. Do not use bash and do not do anything else.' }],
  }, { timeoutMs: 300000 });
  await client.waitFor((e) => e.kind === 'notification' && e.method === 'session/update', { timeoutMs: 120000 }).catch(() => null);
  await sleep(3000);

  // 2. 冻结通道 30 秒。
  const tStop = Date.now();
  process.kill(sshPid, 'SIGSTOP');
  console.log(`[INFO] SIGSTOP ssh pid=${sshPid} at ${new Date(tStop).toISOString()} for ${stopSeconds}s`);
  await sleep(10000);
  run.info('分区期间远端进程状态（第二通道）', await remoteCheck('during'));
  // 边界：在分区中途发出一个 prompt 请求（写进本地管道，等恢复后看是否送达）。
  const midToolStart = client.toolCalls().length;
  const midPromptP = client.request('session/prompt', {
    sessionId,
    prompt: [{ type: 'text', text: 'Call the MCP tool mcp__projects__projects_echo with text "spike-s6-mid-partition-probe" and report exactly what it returned. Do not use bash and do not do anything else.' }],
  }, { timeoutMs: 300000 }).catch((e) => ({ __error: String(e.message) }));
  await sleep((stopSeconds - 10) * 1000);
  const tCont = Date.now();
  process.kill(sshPid, 'SIGCONT');
  console.log(`[INFO] SIGCONT ssh pid=${sshPid} at ${new Date(tCont).toISOString()} (partition ${((tCont - tStop) / 1000).toFixed(1)}s)`);

  // 3. 分区前开始的 prompt 是否完成。
  const sleepRes = await sleepP;
  run.info('分区前开始的长 prompt 结束', `stopReason=${sleepRes?.stopReason ?? sleepRes?.__error}，开始后 ${((Date.now() - sleepStartedAt) / 1000).toFixed(1)}s`);
  run.check('分区前开始的 prompt 在恢复后有明确结束', sleepRes?.stopReason !== undefined || sleepRes?.__error !== undefined, `stopReason=${sleepRes?.stopReason ?? sleepRes?.__error}`);
  const sleepTitles = client.toolCalls().filter((t) => t.sessionUpdate === 'tool_call').map((t) => t.title);
  run.info('分区前 prompt 的 tool_call 标题', JSON.stringify(sleepTitles));
  run.check('分区前 prompt 发起了 projects_sleep 的 MCP 工具调用（精确名）', sleepTitles.includes('mcp__projects__projects_sleep'), `titles=${JSON.stringify(sleepTitles)}`);
  // 4. 分区中途发出的 prompt 是否送达。
  const midRes = await midPromptP;
  run.info('分区中途发出的 prompt 结果', JSON.stringify(midRes).slice(0, 300));
  const midTitles = client.toolCalls().slice(midToolStart).filter((t) => t.sessionUpdate === 'tool_call').map((t) => t.title);
  run.info('分区中途 prompt 的 tool_call 标题', JSON.stringify(midTitles));
  run.check('分区中途 prompt 发起了 projects_echo 的 MCP 工具调用（精确名）', midTitles.includes('mcp__projects__projects_echo'), `titles=${JSON.stringify(midTitles)}`);
  await sleep(1000);
  const engineCalls = await (await fetch(`${engineUrl}/calls`)).json().catch(() => ({ calls: [] }));
  const midSeen = (engineCalls.calls ?? []).find((c) => c.tool === 'projects_echo' && c.args?.text === 'spike-s6-mid-partition-probe');
  run.check('分区中途的 echo 调用在恢复后到达假 Engine', midSeen !== undefined, midSeen ? JSON.stringify(midSeen).slice(0, 200) : '未见该调用');
  // 5. 恢复后会话健康检查。
  const okP = await client.request('session/prompt', {
    sessionId,
    prompt: [{ type: 'text', text: 'Reply with exactly the word OK and nothing else.' }],
  }, { timeoutMs: 300000 });
  run.check('恢复后下一轮 prompt 正常完成', okP?.stopReason !== undefined, `stopReason=${okP?.stopReason}`);
  run.info('恢复后远端进程状态', await remoteCheck('after-resume'));

  const exited = await client.close();
  run.info('本机进程退出', `code=${exited?.code} signal=${exited?.signal}`);
  await sleep(2000);
  const residual = await remoteCheck('after-local-exit');
  run.info('本机退出后远端进程状态', residual);
  run.check('远端残留已记录（ps 输出见 remote-check-after-local-exit.txt）', true, residual.includes('dsh') ? '远端仍有 dsh 进程' : '远端无 dsh 进程');
  code = run.finish({ sessionId, partitionSeconds: (tCont - tStop) / 1000, sshPid });
} catch (e) {
  run.check('s6 阶段 B 完成', false, String(e?.message ?? e));
  code = run.finish({ error: String(e?.message ?? e) });
  try { process.kill(sshPid, 'SIGCONT'); } catch { /* already resumed/gone */ }
} finally {
  await client.close();
}
process.exit(code);
