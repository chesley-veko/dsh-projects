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
 *   2. 发 prompt 让执行者调用 projects_echo，断言：
 *      - tool_call 通知的 title 精确等于 mcp__projects__projects_echo
 *        （mcp-client 的公开名规则 mcp__<server>__<raw>，不是原工具名）；
 *      - 假 Engine 日志里收到该调用；薄代理日志里出现 tools/call。
 *      断言不用子串匹配：2026-11-08 的旧版本用 JSON.stringify(t).includes('projects_echo')，
 *      会把模型用 bash 跑 grep 的输出误判为 PASS（S5/S6 已确认的假阳性）。
 *   3. 反例 A：两个同名 MCP 服务器 -> 应报 invalidParams（mcp.ts 去重）。
 *      反例 B：command 用相对路径 -> 应报 invalidParams（mcp.ts 绝对路径要求）。
 *      反例 C：command 指向不存在的文件 -> 应失败（failOnStartupError）。
 *      反例 D：同 C 但不带 env -> session/new 会成功（根因证据：ACP SDK 1.4.0
 *        的 vecSkipError 会把不合 schema 的条目静默丢弃，dsh-acp 收到空列表，
 *        挂载根本没执行，failOnStartupError 也就无从生效）。
 *
 * 关键协议事实（ACP SDK 1.4.0，实测 + 源码）：
 *   - stdio 条目的 env 是必填数组 [{name,value}]；缺 env（或 args）的条目不会
 *     报错，而是被 SDK 的 vecSkipError / requiredDefaultOnError 静默过滤。
 *   - 所以 mcpServers 里每个 stdio 条目都要显式带 env: []，http 条目要带 headers: []。
 *
 * 注意：步骤 2 依赖模型按提示调用工具；断言以协议层证据为准
 * （tool_call 精确名 + 假 Engine 日志 + 薄代理日志），模型 prose 只作辅助证据。
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient, sleep } from './rpc-client.mjs';
import { parseArgs, splitCmd, newRun } from './test-harness.mjs';

const args = parseArgs(process.argv.slice(2));
const executorCmd = args['executor-cmd'] ?? 'dsh --profile acp';
const label = args.label ?? 'executor';
const logDir = resolve(args['log-dir'] ?? `./evidence/t2-${label}`);
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
// mcp-client 的模型侧公开名：mcp__<serverName>__<rawToolName>（src/index.ts 的命名契约）。
const EXPOSED_ECHO_TOOL = 'mcp__projects__projects_echo';

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

/** 从薄代理日志里找一条 tools/call，证明调用来自挂载的 MCP 客户端进程。 */
function proxySawToolCall(toolName, text) {
  if (!existsSync(proxyLog)) return undefined;
  const lines = readFileSync(proxyLog, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    const msg = rec?.msg;
    if (rec.dir === 'in' && msg?.method === 'tools/call' && msg?.params?.name === toolName) {
      if (text === undefined || msg.params?.arguments?.text === text) return rec;
    }
  }
  return undefined;
}

let code = 1;
const client = createClient({ command, args: cmdArgs, logPath: join(logDir, 'rpc.jsonl'), label });
try {
  run.check('假 Engine 就绪', await engineReady(), 'http://127.0.0.1:8931/health');
  await client.request('initialize', { protocolVersion: 1, clientInfo: { name: 'spike-s5', version: '0.1.0' }, clientCapabilities: {} });

  const mcpServers = [{
    name: 'projects',
    command: nodeBin,
    args: [proxyPath, '--log', proxyLog, '--engine-url', 'http://127.0.0.1:8931', '--scratch', scratch],
    // 必填：ACP SDK 1.4.0 的 zMcpServerStdio 要求 env: EnvVariable[]；缺了会被静默丢弃。
    env: [],
  }];
  const created = await client.request('session/new', { cwd, mcpServers }, { timeoutMs: 120000 });
  run.check('session/new 返回 sessionId', typeof created.sessionId === 'string' && created.sessionId.length > 0, `sessionId=${created.sessionId}`);
  run.check('session/new 返回 configOptions', Array.isArray(created.configOptions), `options=${(created.configOptions ?? []).map((o) => o.id ?? o.configId).join(',')}`);
  const sessionId = created.sessionId;

  const promptP = client.request('session/prompt', {
    sessionId,
    prompt: [{ type: 'text', text: 'Call the MCP tool mcp__projects__projects_echo with text "spike-s5-probe" and report exactly what it returned. Do not use bash and do not do anything else.' }],
  }, { timeoutMs: 300000 });
  const promptRes = await promptP;
  run.info('prompt 结束', `stopReason=${promptRes?.stopReason ?? '(无)'}`);
  const callEvents = client.toolCalls().filter((t) => t.sessionUpdate === 'tool_call');
  run.info('全部 tool_call 标题', JSON.stringify(callEvents.map((t) => t.title)));
  const echoCall = callEvents.find((t) => t.title === EXPOSED_ECHO_TOOL);
  run.check('tools 里出现 projects_echo 的 MCP 工具调用（按工具名精确匹配）', echoCall !== undefined, echoCall ? JSON.stringify(echoCall).slice(0, 300) : `未见 title===${EXPOSED_ECHO_TOOL} 的 tool_call（bash 子串不算）`);
  run.check('该调用的 rawInput.text 为 spike-s5-probe', echoCall?.rawInput?.text === 'spike-s5-probe', JSON.stringify(echoCall?.rawInput ?? null));
  const bashCalls = callEvents.filter((t) => t.title === 'bash');
  run.info('bash 工具调用数（防假阳性对照）', `${bashCalls.length} 次${bashCalls.length > 0 ? '：' + JSON.stringify(bashCalls.map((t) => t.rawInput).slice(0, 3)) : ''}`);
  await sleep(1000);
  const engineCalls = await (await fetch('http://127.0.0.1:8931/calls')).json().catch(() => ({ calls: [] }));
  const seen = (engineCalls.calls ?? []).find((c) => c.tool === 'projects_echo' && c.args?.text === 'spike-s5-probe');
  run.check('假 Engine 收到了 projects_echo(spike-s5-probe)', seen !== undefined, seen ? JSON.stringify(seen).slice(0, 300) : 'Engine 日志无此调用');
  const proxyCall = proxySawToolCall('projects_echo', 'spike-s5-probe');
  run.check('薄代理日志出现该 tools/call（调用来自挂载进程）', proxyCall !== undefined, proxyCall ? JSON.stringify(proxyCall).slice(0, 300) : 'projects-mcp.jsonl 无对应 tools/call');
  run.info('模型回执文本（辅助证据）', client.updateTexts().slice(0, 1000));

  // 反例 A：同名 MCP 服务器（两条都带 env，才能进到 dsh-acp 的去重检查）。
  try {
    await client.request('session/new', { cwd, mcpServers: [mcpServers[0], { ...mcpServers[0] }] }, { timeoutMs: 60000 });
    run.check('反例 A：同名 MCP 服务器应被拒', false, '服务端接受了重复名字');
  } catch (e) {
    run.check('反例 A：同名 MCP 服务器被拒', /duplicate/i.test(e.message), e.message);
  }
  // 反例 B：相对路径 command。
  try {
    await client.request('session/new', { cwd, mcpServers: [{ name: 'bad', command: 'node', args: [proxyPath], env: [] }] }, { timeoutMs: 60000 });
    run.check('反例 B：相对路径 command 应被拒', false, '服务端接受了相对路径');
  } catch (e) {
    run.check('反例 B：相对路径 command 被拒', /absolute path/i.test(e.message), e.message);
  }
  // 反例 C：不存在的 command（条目 schema 合法 -> 真的去挂载 -> failOnStartupError）。
  try {
    await client.request('session/new', { cwd, mcpServers: [{ name: 'ghost', command: '/nonexistent/node', args: [], env: [] }] }, { timeoutMs: 60000 });
    run.check('反例 C：不存在的 command 应失败', false, '服务端接受了不存在的命令');
  } catch (e) {
    run.check('反例 C：不存在的 command 失败（failOnStartupError 生效）', true, e.message);
  }
  // 反例 D：与 C 相同但不带 env —— ACP SDK 静默丢弃该条目，session/new 成功但不挂载。
  try {
    const dropped = await client.request('session/new', { cwd, mcpServers: [{ name: 'ghost-no-env', command: '/nonexistent/node', args: [] }] }, { timeoutMs: 60000 });
    run.check('反例 D：缺 env 的条目被 SDK 静默丢弃（session/new 成功，未挂载）', typeof dropped.sessionId === 'string',
      `sessionId=${dropped.sessionId}；若该条目真的进入挂载，failOnStartupError 会让 session/new 失败——成功即证明条目被丢弃`);
  } catch (e) {
    run.check('反例 D：缺 env 的条目本应被静默丢弃（实测失败）', false, e.message);
  }

  code = run.finish({ sessionId, engineCalls: (engineCalls.calls ?? []).length, toolTitles: callEvents.map((t) => t.title) });
} catch (e) {
  run.check('t2 主流程完成', false, String(e?.message ?? e));
  code = run.finish({ error: String(e?.message ?? e) });
} finally {
  await client.close();
  engine.kill('SIGTERM');
}
process.exit(code);
