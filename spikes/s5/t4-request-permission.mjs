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
 * 步骤：
 *   1. 注册 session/request_permission 处理器：请求到达后记录到达时间
 *      与选项，挂起 --hold-seconds 秒，再按 outcome 回应原 RPC。
 *      依据 fcc0ad46 index.ts：选项为 allow-once（kind allow_once）与
 *      reject-once（kind reject_once）；回应形状为
 *      {outcome:{outcome:'selected', optionId}} 或 {outcome:{outcome:'cancelled'}}。
 *   2. 发 prompt 让执行者做一个需审批的动作（shell 命令），等权限请求
 *      到达（超时 180 秒）。若 180 秒内无请求，记「未触发权限请求」
 *      并退出码 2（本 prompt 下不可测；换 runbook 里的备用 prompt 重试）。
 *   3. 断言：prompt 在挂起期间未结束（原 RPC 仍 pending）；回应后，
 *      allow -> 工具继续执行；reject -> 工具被拒、执行者汇报；
 *      cancel -> prompt 以取消结束；bogus -> 记录执行者实际反应。
 *
 * 注意：是否触发审批取决于执行者/配置的审批策略；本脚本不断言
 * “一定会触发”，只记录实际行为。
 */
import { mkdirSync } from 'node:fs';
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

try {
  await client.request('initialize', { protocolVersion: 1, clientInfo: { name: 'spike-s5', version: '0.1.0' }, clientCapabilities: {} });
  // live 发现：session/new 的 mcpServers 为必填，缺了报 -32602（2026-11-08）。
  const created = await client.request('session/new', { cwd, mcpServers: [] }, { timeoutMs: 120000 });
  const sessionId = created.sessionId;
  run.check('session/new 成功', typeof sessionId === 'string', `sessionId=${sessionId}`);

  const promptStartedAt = Date.now();
  const promptP = client.request('session/prompt', {
    sessionId,
    prompt: [{ type: 'text', text: 'Run the shell command `ls -la` in the workspace and report the output. Do not do anything else.' }],
  }, { timeoutMs: 600000 });
  // 等权限请求到达（180 秒）。
  try {
    await client.waitFor((e) => e.kind === 'request' && e.method === 'session/request_permission', { timeoutMs: 180000 });
  } catch {
    run.info('180 秒内未触发权限请求', '本 prompt 下不可测；见 runbook 备用 prompt。prompt 可能仍在跑，等待其结束。');
    const res = await promptP;
    run.info('prompt 自行结束', `stopReason=${res?.stopReason}`);
    code = run.finish({ sessionId, permissionRequested: false });
    await client.close();
    process.exit(2);
  }
  run.check('权限请求到达', permissionAt !== null, `到达于 prompt 开始后 ${((permissionAt - promptStartedAt) / 1000).toFixed(1)}s`);
  run.check('权限请求含选项', Array.isArray(permissionOptions) && permissionOptions.length > 0, JSON.stringify(permissionOptions));
  const res = await promptP;
  promptSettledAt = Date.now();
  run.info('prompt 结束', `stopReason=${res?.stopReason}，权限回应后 ${(promptSettledAt - (permissionAt + holdSeconds * 1000)) / 1000}s`);
  run.check('prompt 在挂起期间未提前结束', promptSettledAt >= permissionAt + holdSeconds * 1000, 'prompt 结果在回应之后才到达');
  const texts = client.updateTexts();
  if (outcome === 'allow') {
    run.check('allow：工具继续执行（回执含命令输出）', /total \d+|drwx|spike-scratch/i.test(texts), texts.slice(0, 300));
  } else if (outcome === 'reject') {
    run.check('reject：执行者汇报拒绝或无工具结果', /reject|denied|not allowed|refus|cannot|unable/i.test(texts) || client.toolCalls().length === 0, texts.slice(0, 300));
  } else if (outcome === 'cancel') {
    run.check('cancel：prompt 以取消结束或汇报取消', /cancel/i.test(res?.stopReason ?? '') || /cancel/i.test(texts), `stopReason=${res?.stopReason}`);
  } else if (outcome === 'bogus') {
    run.info('bogus：执行者对未知 optionId 的反应', `stopReason=${res?.stopReason} 回执=${texts.slice(0, 300)}`);
  }
  code = run.finish({ sessionId, permissionRequested: true, outcome, holdSeconds });
} catch (e) {
  run.check('t4 主流程完成', false, String(e?.message ?? e));
  code = run.finish({ error: String(e?.message ?? e) });
} finally {
  await client.close();
}
process.exit(code);
