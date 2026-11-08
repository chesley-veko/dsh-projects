#!/usr/bin/env node
/**
 * s6-remote-roundtrip.mjs — S6 阶段 A：经 SSH stdio 的远端 ACP 往返 + MCP 回路。
 *
 * 用法（dsh-01 上；假 Engine 须已在本机跑起，见 run-s6.sh）：
 *   node s6-remote-roundtrip.mjs \
 *     --executor-cmd "ssh -R 8931:127.0.0.1:8931 -o BatchMode=yes -o StrictHostKeyChecking=accept-new -p 2222 <user>@ssh.instabox.sh -- env DSH_HOME=/data/home/workspace/dsh-superagent-lab dsh --profile acp" \
 *     --proxy-path /data/home/workspace/spike-materials/s5/projects-mcp-stdio.mjs \
 *     --log-dir ./evidence/<run>/phase-a --cwd /tmp/spike-s6-work
 *
 * 步骤：
 *   1. initialize（能力声明原样存档，与 S5 t1 相同的断言）。
 *   2. session/new 带 mcpServers（thin proxy 在 dsh-02 上，command 为
 *      dsh-02 上的绝对路径；其 --engine-url 为 http://127.0.0.1:8931，
 *      在 dsh-02 上经 ssh -R 转回 dsh-01 的假 Engine）。
 *   3. prompt 让远端执行者调用 projects_echo，断言：tool_call 通知出现、
 *      dsh-01 的假 Engine 日志收到该调用（MCP 回路打通的直接证据）。
 *   4. 反例：session/new 带一个 dsh-02 上不存在的 command -> 应失败。
 *
 * 注意：本脚本复用 ../s5/rpc-client.mjs（需 spikes/s5 与 spikes/s6
 * 同时存在于 dsh-01 上）。凭据不经过本脚本；SSH 接入由指挥者提供。
 */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient, sleep } from '../s5/rpc-client.mjs';
import { parseArgs, splitCmd, newRun } from '../s5/test-harness.mjs';

const args = parseArgs(process.argv.slice(2));
const executorCmd = args['executor-cmd'] ?? '';
const label = args.label ?? 'remote';
const logDir = args['log-dir'] ?? `./evidence/s6-phase-a-${label}`;
const cwd = args.cwd ?? '/data/home/workspace/spike-s6-work';
// 注意：cwd 是远端（dsh-02 上）的工作目录，不要在本机创建；
// session/new 的 cwd 与 thin proxy 的 --scratch 都以远端为准。
const proxyPath = args['proxy-path'] ?? '/data/home/workspace/spike-materials/s5/projects-mcp-stdio.mjs';
const engineUrl = args['engine-url'] ?? 'http://127.0.0.1:8931';
const remoteNode = args['remote-node'] ?? '';
if (!executorCmd) {
  console.error('missing --executor-cmd (ssh form, see README)');
  process.exit(2);
}
if (!remoteNode) {
  console.error('missing --remote-node (absolute path of node on dsh-02; measure with: ssh <dsh-02> command -v node)');
  process.exit(2);
}
const run = newRun({ test: 's6-remote-roundtrip', executorCmd, logDir });
const [command, ...cmdArgs] = splitCmd(executorCmd);
const proxyLog = join(logDir, 'projects-mcp-remote.jsonl');
const scratch = `${cwd}/spike-scratch`;

let code = 1;
const client = createClient({ command, args: cmdArgs, logPath: join(logDir, 'rpc.jsonl'), label });
try {
  const health = await fetch(`${engineUrl}/health`).then((r) => r.ok).catch(() => false);
  run.check('本机假 Engine 就绪', health, engineUrl);
  const init = await client.request('initialize', { protocolVersion: '1.0', clientInfo: { name: 'spike-s6', version: '0.1.0' }, clientCapabilities: {} }, { timeoutMs: 120000 });
  run.check('远端 initialize 成功', typeof init?.protocolVersion === 'string', `protocolVersion=${init?.protocolVersion} agent=${init?.agentInfo?.name ?? ''}`);
  run.info('远端能力声明原样', JSON.stringify(init?.agentCapabilities ?? null));

  const created = await client.request('session/new', {
    cwd,
    mcpServers: [{
      name: 'projects',
      // command 是 dsh-02 上的 node 绝对路径（--remote-node，由 run-s6.sh
      // 预检实测后传入，禁止假设）。
      command: remoteNode,
      args: [proxyPath, '--log', proxyLog, '--engine-url', engineUrl, '--scratch', scratch],
    }],
  }, { timeoutMs: 180000 });
  run.check('远端 session/new 成功', typeof created.sessionId === 'string', `sessionId=${created.sessionId}`);
  const sessionId = created.sessionId;

  const p = await client.request('session/prompt', {
    sessionId,
    prompt: [{ type: 'text', text: 'Call projects_echo with text "spike-s6-remote-probe" and report exactly what it returned. Do not do anything else.' }],
  }, { timeoutMs: 300000 });
  run.info('远端 prompt 结束', `stopReason=${p?.stopReason}`);
  const echoCall = client.toolCalls().find((t) => JSON.stringify(t).includes('projects_echo'));
  run.check('远端执行者发起了 projects_echo 调用', echoCall !== undefined, echoCall ? JSON.stringify(echoCall).slice(0, 300) : '未见 tool_call');
  await sleep(1000);
  const engineCalls = await (await fetch(`${engineUrl}/calls`)).json().catch(() => ({ calls: [] }));
  const seen = (engineCalls.calls ?? []).find((c) => c.tool === 'projects_echo' && c.args?.text === 'spike-s6-remote-probe');
  run.check('MCP 回路打通：本机假 Engine 收到远端调用', seen !== undefined, seen ? JSON.stringify(seen).slice(0, 300) : 'Engine 日志无此调用（隧道可能未通）');
  run.info('远端模型回执文本', client.updateTexts().slice(0, 500));

  // 反例：dsh-02 上不存在的 command。
  try {
    await client.request('session/new', { cwd, mcpServers: [{ name: 'ghost', command: '/nonexistent/node', args: [] }] }, { timeoutMs: 60000 });
    run.check('反例：远端不存在的 command 应失败', false, '服务端接受了不存在的命令');
  } catch (e) {
    run.check('反例：远端不存在的 command 失败', true, e.message);
  }
  code = run.finish({ sessionId, engineCalls: (engineCalls.calls ?? []).length });
} catch (e) {
  run.check('s6 阶段 A 完成', false, String(e?.message ?? e));
  code = run.finish({ error: String(e?.message ?? e) });
} finally {
  await client.close();
}
process.exit(code);
