#!/usr/bin/env node
/**
 * t6-resume-load.mjs — S5-6：session/resume / load，进程退出后续接。
 *
 * 用法：
 *   node t6-resume-load.mjs --executor-cmd "dsh --profile acp" \
 *     --log-dir ./evidence/<run>/t6 --cwd /tmp/spike-s5-work
 *
 * 步骤：
 *   1. session/new，prompt 一轮（让模型记住暗号 BLUEBIRD），记 sessionId。
 *   2. 关闭客户端（stdin EOF），等执行者进程退出，记退出码。
 *   3. 起一个新执行者进程；session/list 确认该会话可被发现；
 *      session/resume {sessionId, cwd} 续接；再 prompt 一轮问暗号，
 *      记录模型是否记得（回执原样记入摘要）。
 *   4. 反例 A：resume 不存在的 sessionId -> 应报 invalidParams。
 *      反例 B：resume 时 cwd 不符 -> 应报 cwd does not match。
 *      反例 C：对已激活的会话再 resume -> 应报 already active。
 *      反例 D：发 session/load 方法 -> 记录实际行为。依据 fcc0ad46
 *      方法表：服务端没有 load 处理器，预期 -32601；若返回成功，
 *      如实记「load 受支持」并附响应。
 */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient } from './rpc-client.mjs';
import { parseArgs, splitCmd, newRun } from './test-harness.mjs';

const args = parseArgs(process.argv.slice(2));
const executorCmd = args['executor-cmd'] ?? 'dsh --profile acp';
const label = args.label ?? 'executor';
const logDir = args['log-dir'] ?? `./evidence/t6-${label}`;
const cwd = resolve(args.cwd ?? '/tmp/spike-s5-work');
mkdirSync(cwd, { recursive: true });
const run = newRun({ test: 't6-resume-load', executorCmd, logDir });
const [command, ...cmdArgs] = splitCmd(executorCmd);

let code = 1;
const client = createClient({ command, args: cmdArgs, logPath: join(logDir, 'rpc-1.jsonl'), label });
let sessionId;
try {
  await client.request('initialize', { protocolVersion: '1.0', clientInfo: { name: 'spike-s5', version: '0.1.0' }, clientCapabilities: {} });
  const created = await client.request('session/new', { cwd }, { timeoutMs: 120000 });
  sessionId = created.sessionId;
  run.check('session/new 成功', typeof sessionId === 'string', `sessionId=${sessionId}`);
  const p1 = await client.request('session/prompt', {
    sessionId,
    prompt: [{ type: 'text', text: 'Remember the code word BLUEBIRD. Reply with exactly the word OK and nothing else.' }],
  }, { timeoutMs: 300000 });
  run.check('首轮 prompt 完成', p1?.stopReason !== undefined, `stopReason=${p1?.stopReason}`);

  // 反例 D：session/load（在进程退出前探一次）。
  try {
    const loadRes = await client.request('session/load', { sessionId }, { timeoutMs: 30000 });
    run.info('反例 D：session/load 返回成功（该执行者支持 load）', JSON.stringify(loadRes).slice(0, 300));
  } catch (e) {
    run.info('反例 D：session/load 被拒（行为已确定）', e.message);
  }

  const exited = await client.close();
  run.check('关闭 stdin 后执行者进程退出', exited !== null, `code=${exited?.code} signal=${exited?.signal}`);

  // 新进程续接。
  const client2 = createClient({ command, args: cmdArgs, logPath: join(logDir, 'rpc-2.jsonl'), label });
  try {
    await client2.request('initialize', { protocolVersion: '1.0', clientInfo: { name: 'spike-s5', version: '0.1.0' }, clientCapabilities: {} });
    const listed = await client2.request('session/list', { cwd }, { timeoutMs: 60000 });
    const found = (listed.sessions ?? []).some((s) => s.sessionId === sessionId);
    run.check('session/list 能发现该会话', found, `listed=${(listed.sessions ?? []).length} 个`);
    const resumed = await client2.request('session/resume', { sessionId, cwd }, { timeoutMs: 120000 });
    run.check('session/resume 成功', resumed !== undefined && resumed !== null, '返回 configOptions');
    const p2 = await client2.request('session/prompt', {
      sessionId,
      prompt: [{ type: 'text', text: 'What was the code word? Reply with exactly that word and nothing else.' }],
    }, { timeoutMs: 300000 });
    const reply = client2.updateTexts();
    run.check('续接后 prompt 完成', p2?.stopReason !== undefined, `stopReason=${p2?.stopReason}`);
    run.check('续接后模型记得暗号 BLUEBIRD', reply.includes('BLUEBIRD'), reply.slice(0, 300));

    // 反例 C：对已激活的会话再 resume。
    try {
      await client2.request('session/resume', { sessionId, cwd }, { timeoutMs: 60000 });
      run.check('反例 C：已激活会话再 resume 应被拒', false, '服务端接受了重复 resume');
    } catch (e) {
      run.check('反例 C：已激活会话再 resume 被拒', /already active/i.test(e.message), e.message);
    }
    await client2.close();
  } catch (e) {
    run.check('续接流程完成', false, String(e?.message ?? e));
    await client2.close();
    throw e;
  }

  // 反例 A/B：用第三个进程探（会话已关闭后 resume 应失败或成功取决于持久化；
  // 这里只记录实际行为：未知 id 与错 cwd 必须被拒）。
  const client3 = createClient({ command, args: cmdArgs, logPath: join(logDir, 'rpc-3.jsonl'), label });
  try {
    await client3.request('initialize', { protocolVersion: '1.0', clientInfo: { name: 'spike-s5', version: '0.1.0' }, clientCapabilities: {} });
    try {
      await client3.request('session/resume', { sessionId: '00000000-0000-0000-0000-000000000000', cwd }, { timeoutMs: 60000 });
      run.check('反例 A：resume 未知 session 应被拒', false, '服务端接受了未知 id');
    } catch (e) {
      run.check('反例 A：resume 未知 session 被拒', /not resumable|invalidParams/i.test(e.message), e.message);
    }
    try {
      await client3.request('session/resume', { sessionId, cwd: '/tmp' }, { timeoutMs: 60000 });
      run.check('反例 B：resume 错 cwd 应被拒', false, '服务端接受了不符的 cwd');
    } catch (e) {
      run.check('反例 B：resume 错 cwd 被拒', /cwd does not match/i.test(e.message), e.message);
    }
    await client3.close();
  } catch (e) {
    await client3.close();
    throw e;
  }
  code = run.finish({ sessionId });
} catch (e) {
  run.check('t6 主流程完成', false, String(e?.message ?? e));
  code = run.finish({ error: String(e?.message ?? e), sessionId });
} finally {
  await client.close();
}
process.exit(code);
