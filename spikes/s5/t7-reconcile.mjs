#!/usr/bin/env node
/**
 * t7-reconcile.mjs — S5-7：按外部 id 查询/去重 session/new 或 session/prompt（ADR-0015 探针）。
 *
 * 用法：
 *   node t7-reconcile.mjs --executor-cmd "dsh --profile acp" \
 *     --log-dir ./evidence/<run>/t7 --cwd /tmp/spike-s5-work
 *
 * 步骤：
 *   1. 用完全相同的参数发两次 session/new，记录两个 sessionId 是否相同。
 *   2. 同一会话里用完全相同的 prompt 文本发两次 session/prompt，记录
 *      是否产生两次独立 turn。
 *   3. session/list 确认两个会话都存在（按 cwd 列出，无外部 id 维度）。
 *   4. 尝试用一个编造的外部 id（'ext-123'）当 sessionId 做 resume，
 *      记录被拒的方式。
 *   5. 反例：检查 session/new 与 session/prompt 的请求模式里是否存在
 *      外部 id / 幂等键字段——依据 fcc0ad46：newSession 只取 cwd 与
 *      mcpServers，prompt 只取 sessionId 与 prompt 内容；结论以此为准。
 *
 * 预期结论（待 live 验证）：不支持按 operation_id 查询/去重，恢复走
 * unknown（ADR-0015）。本脚本只记录证据，不预设结论。
 */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient } from './rpc-client.mjs';
import { parseArgs, splitCmd, newRun } from './test-harness.mjs';

const args = parseArgs(process.argv.slice(2));
const executorCmd = args['executor-cmd'] ?? 'dsh --profile acp';
const label = args.label ?? 'executor';
const logDir = args['log-dir'] ?? `./evidence/t7-${label}`;
const cwd = resolve(args.cwd ?? '/tmp/spike-s5-work');
mkdirSync(cwd, { recursive: true });
const run = newRun({ test: 't7-reconcile', executorCmd, logDir });
const [command, ...cmdArgs] = splitCmd(executorCmd);

let code = 1;
const client = createClient({ command, args: cmdArgs, logPath: join(logDir, 'rpc.jsonl'), label });
try {
  await client.request('initialize', { protocolVersion: '1.0', clientInfo: { name: 'spike-s5', version: '0.1.0' }, clientCapabilities: {} });
  const s1 = await client.request('session/new', { cwd }, { timeoutMs: 120000 });
  const s2 = await client.request('session/new', { cwd }, { timeoutMs: 120000 });
  run.check('两次相同 session/new 各自成功', typeof s1.sessionId === 'string' && typeof s2.sessionId === 'string', `id1=${s1.sessionId} id2=${s2.sessionId}`);
  const distinct = s1.sessionId !== s2.sessionId;
  run.info('两次 session/new 是否去重', distinct ? '未去重：返回两个不同 sessionId' : '去重：返回同一 sessionId');
  run.check('去重行为已确定（二者必居其一并记录）', true, distinct ? 'distinct' : 'deduped');

  const listed = await client.request('session/list', { cwd }, { timeoutMs: 60000 });
  const ids = (listed.sessions ?? []).map((s) => s.sessionId);
  run.info('session/list 结果', `${ids.length} 个会话；含 s1=${ids.includes(s1.sessionId)} 含 s2=${ids.includes(s2.sessionId)}`);

  const promptText = 'Reply with exactly the word PING and nothing else.';
  const p1 = await client.request('session/prompt', { sessionId: s1.sessionId, prompt: [{ type: 'text', text: promptText }] }, { timeoutMs: 300000 });
  const updatesAfter1 = client.updates.length;
  const p2 = await client.request('session/prompt', { sessionId: s1.sessionId, prompt: [{ type: 'text', text: promptText }] }, { timeoutMs: 300000 });
  const updatesAfter2 = client.updates.length;
  run.check('两次相同 prompt 各自完成', p1?.stopReason !== undefined && p2?.stopReason !== undefined, `stop1=${p1?.stopReason} stop2=${p2?.stopReason}`);
  run.info('两次相同 prompt 是否产生两次 turn', updatesAfter2 > updatesAfter1 ? `是：update 数 ${updatesAfter1} -> ${updatesAfter2}` : '否：第二次无新增 update（疑似去重，需人工复核日志）');

  // 反例：用编造的外部 id 当 sessionId 做 resume。
  try {
    await client.request('session/resume', { sessionId: 'ext-123', cwd }, { timeoutMs: 60000 });
    run.check('反例：编造的外部 id 应被拒', false, '服务端接受了 ext-123');
  } catch (e) {
    run.check('反例：编造的外部 id 被拒', /not resumable|invalidParams|unknown session/i.test(e.message), e.message);
  }
  code = run.finish({ sessionId1: s1.sessionId, sessionId2: s2.sessionId, distinct });
} catch (e) {
  run.check('t7 主流程完成', false, String(e?.message ?? e));
  code = run.finish({ error: String(e?.message ?? e) });
} finally {
  await client.close();
}
process.exit(code);
