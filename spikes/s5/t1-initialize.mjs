#!/usr/bin/env node
/**
 * t1-initialize.mjs — S5-1：initialize 返回的能力声明（原样存档）。
 *
 * 用法：
 *   node t1-initialize.mjs --executor-cmd "dsh --profile acp" --log-dir ./evidence/<run>/t1
 *
 * 步骤：
 *   1. 发 initialize（protocolVersion 由客户端提议数字 1；服务端按自身
 *      唯一版本回应，见 fcc0ad46 packages/acp/acp/src/index.ts initialize）。
 *   2. 把响应原样写入 initialize-<label>.json（能力声明存档）。
 *   3. 反例 A：同一连接上再发一次 initialize（protocolVersion 为空串），记录实际行为。
 *   4. 反例 B：发一个未知方法 session/nope，记录 JSON-RPC 错误码。
 *
 * 不断言 protocolVersion 的具体取值：SDK 1.4.0 的常量值以运行时为准，
 * 只断言它是数字并记录。
 * （2026-11-08 live 发现：原脚本发字符串 '1.0'，服务端以 -32602 拒绝
 *  "Invalid input: expected number, received string"；改为数字 1 后通过。）
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from './rpc-client.mjs';
import { parseArgs, splitCmd, newRun } from './test-harness.mjs';

const args = parseArgs(process.argv.slice(2));
const executorCmd = args['executor-cmd'] ?? 'dsh --profile acp';
const label = args.label ?? 'executor';
const logDir = args['log-dir'] ?? `./evidence/t1-${label}`;
const run = newRun({ test: 't1-initialize', executorCmd, logDir });
const [command, ...cmdArgs] = splitCmd(executorCmd);

const client = createClient({ command, args: cmdArgs, logPath: join(logDir, 'rpc.jsonl'), label });
let code = 1;
try {
  const res = await client.request('initialize', {
    protocolVersion: 1,
    clientInfo: { name: 'spike-s5', version: '0.1.0' },
    clientCapabilities: {},
  }, { timeoutMs: 60000 });
  const archivePath = join(logDir, `initialize-${label}.json`);
  writeFileSync(archivePath, JSON.stringify(res, null, 2) + '\n');
  run.check('initialize 返回 protocolVersion（数字）', typeof res.protocolVersion === 'number', `protocolVersion=${res.protocolVersion}`);
  run.check('initialize 返回 agentInfo.name', typeof res.agentInfo?.name === 'string' && res.agentInfo.name.length > 0, `name=${res.agentInfo?.name} version=${res.agentInfo?.version ?? ''}`);
  run.check('initialize 返回 agentCapabilities', typeof res.agentCapabilities === 'object' && res.agentCapabilities !== null, JSON.stringify(res.agentCapabilities));
  run.info('agentCapabilities 原样', JSON.stringify(res.agentCapabilities));
  run.info('authMethods 原样', JSON.stringify(res.authMethods ?? null));
  run.info('能力声明已存档', archivePath);

  // 反例 A：同一连接上再次 initialize，protocolVersion 为空串。
  try {
    const res2 = await client.request('initialize', {
      protocolVersion: '',
      clientInfo: { name: 'spike-s5', version: '0.1.0' },
      clientCapabilities: {},
    }, { timeoutMs: 30000 });
    run.info('反例 A：重复 initialize 未报错', `protocolVersion=${res2?.protocolVersion ?? '(无)'}`);
  } catch (e) {
    run.info('反例 A：重复 initialize 被拒', String(e.message));
  }

  // 反例 B：未知方法。
  try {
    await client.request('session/nope', {}, { timeoutMs: 30000 });
    run.check('反例 B：未知方法应返回错误', false, '服务端竟然接受了 session/nope');
  } catch (e) {
    run.check('反例 B：未知方法返回 JSON-RPC 错误', /-32601|Method not found/i.test(e.message), e.message);
  }
  code = run.finish({ protocolVersion: res.protocolVersion });
} catch (e) {
  run.check('initialize 成功', false, String(e?.message ?? e));
  code = run.finish({ error: String(e?.message ?? e) });
} finally {
  await client.close();
}
process.exit(code);
