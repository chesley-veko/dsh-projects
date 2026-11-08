#!/usr/bin/env node
/**
 * t4-request-permission.mjs — S5-4：session/request_permission 挂起后回应原 RPC。
 *
 * 用法：
 *   node t4-request-permission.mjs --executor-cmd "dsh --profile acp" \
 *     --log-dir ./evidence/<run>/t4-allow --cwd /tmp/spike-s5-work \
 *     --permission-outcome allow --hold-seconds 120
 *   --permission-outcome: allow | reject | cancel | bogus（反例：未知 optionId）
 *
 * 触发条件（2026-11-09 源码核实，旧版测试失败的原因）：
 *   acp profile 的 base bundle 把 sandbox-policy 默认设为 workspace-write、
 *   approval 设为 ask（packages/bundle/base/cordis.patch.yml:243-277），
 *   workspace-write 的可写根 = workspace + /tmp + os.tmpdir()
 *   （packages/sandbox/sandbox/src/roots.ts:97-99）。
 *   在 workspace 内（旧版 prompt 写的 t4-permission-test.txt、rm t4-scratch.txt）
 *   写/删都免审批，永远不会触发权限请求。要触发审批必须两步：
 *     1) 越界写（/var/tmp/...）-> fs-sandbox 抛 FS_SANDBOX_DENIED
 *        （packages/fs/fs-sandbox/src/index.ts:156-176），模型看到
 *        [sandbox: file access denied under workspace-write mode] + 升级提示
 *        （packages/fs/tool-fs/src/sandbox.ts:136-140）；
 *     2) 模型用 sandbox_permissions 'danger-full-access' + justification 重试
 *        -> approveEscalation -> ctx.approval.request
 *        （packages/sandbox/sandbox/src/escalation.ts:172-205）
 *        -> ACP bridge 的 approval/request 监听器发出
 *           session/request_permission（packages/acp/acp/src/index.ts:158-175）。
 *   因此本脚本的 prompt 明确要求越界写 + 被拒后带 sandbox_permissions 重试一次。
 *
 * 步骤：
 *   1. 注册 session/request_permission 处理器：请求到达后记录到达时间
 *      与选项，挂起 --hold-seconds 秒，再按 outcome 回应原 RPC。
 *      依据 fcc0ad46 index.ts：选项为 allow-once（kind allow_once）与
 *      reject-once（kind reject_once）；回应形状为
 *      {outcome:{outcome:'selected', optionId}} 或
 *      {outcome:{outcome:'cancelled'}}。
 *   2. 发 prompt 让执行者写 workspace 外的 /var/tmp 文件，等权限请求
 *      到达（超时 180 秒）。若 180 秒内无请求，记「未触发权限请求」
 *      并退出码 2。
 *   3. 断言：prompt 在挂起期间未结束（原 RPC 仍 pending）；回应后按
 *      outcome 记录执行者与文件的实际行为：
 *        allow  -> 升级后的重试执行，文件写出；
 *        reject -> 工具被拒，文件不存在；
 *        cancel -> 审批取消，文件不存在；
 *        bogus  -> 未知 optionId，dsh-acp 按 rejected 处理（fail closed），
 *                  文件不存在，记录执行者实际反应。
 *
 * 注意：本脚本不断言“一定会触发”，只记录实际行为；未触发时退出码 2。
 */
import { mkdirSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient, sleep } from './rpc-client.mjs';
import { parseArgs, splitCmd, newRun } from './test-harness.mjs';

const args = parseArgs(process.argv.slice(2));
const executorCmd = args['executor-cmd'] ?? 'dsh --profile acp';
const label = args.label ?? 'executor';
const outcome = args['permission-outcome'] ?? 'allow';
const holdSeconds = Number(args['hold-seconds'] ?? '120');
const logDir = args['log-dir'] ?? `./evidence/t4-${outcome}-${label}`;
const cwd = resolve(args.cwd ?? '/tmp/spike-s5-work');
mkdirSync(cwd, { recursive: true });
const run = newRun({ test: `t4-request-permission-${outcome}`, executorCmd, logDir });
const [command, ...cmdArgs] = splitCmd(executorCmd);

// 越界目标：/var/tmp 不在 workspace-write 的可写根里（workspace / /tmp / os.tmpdir()）。
const TARGET = args['target-path'] ?? '/var/tmp/s5-permission-probe.txt';
const EXPECTED_TEXT = 's5 permission probe';
// 每轮开始前清理目标；先记录基线再删，保证本轮的文件存在性断言不受上轮影响。
const targetExistedBeforeCleanup = existsSync(TARGET);
try { if (targetExistedBeforeCleanup) unlinkSync(TARGET); } catch { /* ignore */ }
const targetClean = existsSync(TARGET) === false;

const PROMPT = 'Write the exact text "s5 permission probe" to /var/tmp/s5-permission-probe.txt. '
  + 'If the file sandbox denies the write, retry that exact write once with sandbox_permissions "danger-full-access" '
  + 'and a one-sentence justification. Report the final result verbatim.';

let code = 1;
const client = createClient({ command, args: cmdArgs, logPath: join(logDir, 'rpc.jsonl'), label });
let permissionAt = null;
let promptSettledAt = null;
let permissionOptions = null;

client.onRequest('session/request_permission', async (params) => {
  permissionAt = Date.now();
  permissionOptions = params?.options ?? [];
  console.log(`[INFO] 权限请求到达，选项=${JSON.stringify(permissionOptions)}，挂起 ${holdSeconds}s 后回应 (${outcome})`);
  await sleep(holdSeconds * 1000);
  if (outcome === 'cancel') return { outcome: { outcome: 'cancelled' } };
  if (outcome === 'bogus') return { outcome: { outcome: 'selected', optionId: 'no-such-option' } };
  const wantKind = outcome === 'allow' ? 'allow_once' : 'reject_once';
  const picked = permissionOptions.find((o) => o.kind === wantKind)
    ?? permissionOptions.find((o) => o.optionId === (outcome === 'allow' ? 'allow-once' : 'reject-once'))
    ?? permissionOptions[outcome === 'allow' ? 0 : 1]
    ?? permissionOptions[0];
  if (!picked) return { outcome: { outcome: 'cancelled' } };
  return { outcome: { outcome: 'selected', optionId: picked.optionId } };
});

/** 记录本轮执行者实际发起的工具调用（含 rawInput），作为权限回应的行为证据。 */
function toolCallSummary() {
  return client.toolCalls()
    .filter((t) => t.sessionUpdate === 'tool_call')
    .map((t) => ({ title: t.title, sandbox_permissions: t.rawInput?.sandbox_permissions ?? null, target: t.rawInput?.file_path ?? t.rawInput?.path ?? t.rawInput?.command ?? null }));
}

try {
  await client.request('initialize', { protocolVersion: 1, clientInfo: { name: 'spike-s5', version: '0.1.0' }, clientCapabilities: {} });
  // live 发现：session/new 的 mcpServers 为必填，缺了报 -32602（2026-11-08）。
  const created = await client.request('session/new', { cwd, mcpServers: [] }, { timeoutMs: 120000 });
  const sessionId = created.sessionId;
  run.check('session/new 成功', typeof sessionId === 'string', `sessionId=${sessionId}`);

  const promptStartedAt = Date.now();
  const promptP = client.request('session/prompt', {
    sessionId,
    prompt: [{ type: 'text', text: PROMPT }],
  }, { timeoutMs: 600000 });
  // 等权限请求到达（180 秒）。
  try {
    await client.waitFor((e) => e.kind === 'request' && e.method === 'session/request_permission', { timeoutMs: 180000 });
  } catch {
    run.info('180 秒内未触发权限请求', '越界写 + 升级重试的 prompt 仍不可测；见源码触发条件说明。等待 prompt 自行结束。');
    const res = await promptP;
    run.info('prompt 自行结束', `stopReason=${res?.stopReason}`);
    run.info('本轮 tool_call', JSON.stringify(toolCallSummary()));
    run.info('本轮回执', client.updateTexts().slice(0, 1000));
    code = run.finish({ sessionId, permissionRequested: false, target: TARGET, holdSeconds });
    await client.close();
    process.exit(2);
  }
  run.check('权限请求到达', permissionAt !== null, `到达于 prompt 开始后 ${((permissionAt - promptStartedAt) / 1000).toFixed(1)}s`);
  run.check('权限请求含选项', Array.isArray(permissionOptions) && permissionOptions.length > 0, JSON.stringify(permissionOptions));
  const res = await promptP;
  promptSettledAt = Date.now();
  const heldMs = promptSettledAt - (permissionAt + holdSeconds * 1000);
  run.info('prompt 结束', `stopReason=${res?.stopReason}，权限回应后 ${(heldMs / 1000).toFixed(1)}s`);
  run.check('prompt 在挂起期间未提前结束', promptSettledAt >= permissionAt + holdSeconds * 1000, 'prompt 结果在回应之后才到达');
  const texts = client.updateTexts();
  const calls = toolCallSummary();
  run.info('本轮 tool_call', JSON.stringify(calls));
  run.info('是否出现沙箱拒绝标记（审批触发前提）', texts.includes('[sandbox: file access denied under workspace-write mode]') ? '出现' : `未出现（可能模型直接带 sandbox_permissions 首次尝试）；回执=${texts.slice(0, 300)}`);
  const fileExists = existsSync(TARGET);
  const fileText = fileExists ? readFileSync(TARGET, 'utf8') : '';
  run.info('目标文件状态', `${TARGET} exists=${fileExists}${fileExists ? ` content=${JSON.stringify(fileText.slice(0, 120))}` : ''}`);
  run.info('本轮前目标文件状态', targetExistedBeforeCleanup ? '已存在，已在开跑前删除' : '不存在');
  run.check('目标文件每轮前已清理', targetClean, `targetClean=${targetClean}`);

  const escalated = calls.find((c) => c.sandbox_permissions !== null);
  if (outcome === 'allow') {
    run.check('allow：执行者带 sandbox_permissions 重试', escalated !== undefined, escalated ? JSON.stringify(escalated) : '未见升级重试的 tool_call');
    run.check('allow：越界写执行成功（文件存在且内容一致）', fileExists && fileText.includes(EXPECTED_TEXT), `exists=${fileExists} content=${JSON.stringify(fileText.slice(0, 120))}`);
  } else if (outcome === 'reject') {
    run.check('reject：文件未被写出', fileExists === false, `exists=${fileExists}`);
    run.check('reject：回执/工具结果体现被拒或停止', /reject|denied|not allowed|refus|cannot|unable|cancel/i.test(texts) || escalated !== undefined, texts.slice(0, 400));
  } else if (outcome === 'cancel') {
    run.check('cancel：文件未被写出', fileExists === false, `exists=${fileExists}`);
    run.info('cancel：prompt 结束方式', `stopReason=${res?.stopReason}（dsh-acp 的审批取消是工具错误，不是 session/cancel 的 cancelled）`);
  } else if (outcome === 'bogus') {
    run.check('bogus：未知 optionId 未被行使（按 rejected 处理，文件未写出）', fileExists === false, `exists=${fileExists}`);
    run.info('bogus：执行者对未知 optionId 的反应', `stopReason=${res?.stopReason} 回执=${texts.slice(0, 400)}`);
  }
  code = run.finish({
    sessionId,
    permissionRequested: true,
    outcome,
    holdSeconds,
    permissionOptions,
    permissionDelayMs: permissionAt - promptStartedAt,
    targetExists: fileExists,
    toolCalls: calls,
  });
} catch (e) {
  run.check('t4 主流程完成', false, String(e?.message ?? e));
  code = run.finish({ error: String(e?.message ?? e) });
} finally {
  await client.close();
}
process.exit(code);
