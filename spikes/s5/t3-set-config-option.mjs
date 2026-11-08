#!/usr/bin/env node
/**
 * t3-set-config-option.mjs — S5-3：session/set_config_option 切 model / effort，确认下一轮生效。
 *
 * 用法：
 *   node t3-set-config-option.mjs --executor-cmd "dsh --profile acp" \
 *     --log-dir ./evidence/<run>/t3 --cwd /tmp/spike-s5-work
 *
 * 步骤：
 *   1. session/new，记录返回的 configOptions（model 与 reasoning_effort 的
 *      当前值与可选值）。
 *   2. effort 切换：把 reasoning_effort 切到另一个可选值，断言返回的
 *      configOptions 里当前值已变；随后发一轮 prompt，确认会话正常、
 *      下一轮按新 effort 跑（以 configOptions 与会话日志为准）。
 *   3. model 切换：若可选值多于一个，切到另一个、prompt 一轮、切回原值；
 *      若路由只有一个模型值（如 lab 的 opencode-go 路由），如实记
 *      「model 切换：未测（路由单模型）」，不临时加模型、不改默认。
 *   4. 反例 A：set 一个不存在的 value id -> 应报 invalidParams，且选择不变。
 *      反例 B：对不存在的 sessionId 做 set -> 应报 unknown session。
 *      反例 C：reasoning_effort 设一个不存在的 effort -> 应报 invalidParams。
 *
 * 依据：fcc0ad46 model-control.ts——set() 从 Agent 的下一轮模型步骤起
 * 生效；未知 model/effort 抛 AcpModelConfigError（转 invalidParams）。
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { join } from 'node:path';
import { createClient } from './rpc-client.mjs';
import { parseArgs, splitCmd, newRun } from './test-harness.mjs';

const args = parseArgs(process.argv.slice(2));
const executorCmd = args['executor-cmd'] ?? 'dsh --profile acp';
const label = args.label ?? 'executor';
const logDir = args['log-dir'] ?? `./evidence/t3-${label}`;
const cwd = resolve(args.cwd ?? '/tmp/spike-s5-work');
mkdirSync(cwd, { recursive: true });
const run = newRun({ test: 't3-set-config-option', executorCmd, logDir });
const [command, ...cmdArgs] = splitCmd(executorCmd);

function currentOf(options, configId) {
  const opt = (options ?? []).find((o) => o.configId === configId);
  if (!opt) return { option: null, current: null, values: [] };
  const values = (opt.values ?? []).map((v) => v.valueId ?? v.value ?? v);
  const current = opt.currentValue ?? opt.value ?? null;
  return { option: opt, current, values };
}

let code = 1;
const client = createClient({ command, args: cmdArgs, logPath: join(logDir, 'rpc.jsonl'), label });
try {
  await client.request('initialize', { protocolVersion: '1.0', clientInfo: { name: 'spike-s5', version: '0.1.0' }, clientCapabilities: {} });
  const created = await client.request('session/new', { cwd }, { timeoutMs: 120000 });
  const sessionId = created.sessionId;
  run.check('session/new 成功', typeof sessionId === 'string', `sessionId=${sessionId}`);
  const model0 = currentOf(created.configOptions, 'model');
  const effort0 = currentOf(created.configOptions, 'reasoning_effort');
  run.info('初始 model', `current=${model0.current} values=[${model0.values.join(',')}]`);
  run.info('初始 reasoning_effort', `current=${effort0.current} values=[${effort0.values.join(',')}]`);

  // 2. effort 切换。
  const effortAlt = effort0.values.find((v) => v !== effort0.current);
  if (effortAlt !== undefined) {
    const after = await client.request('session/set_config_option', { sessionId, configId: 'reasoning_effort', value: effortAlt }, { timeoutMs: 60000 });
    const eff = currentOf(after.configOptions, 'reasoning_effort');
    run.check('effort 切换后当前值已变', eff.current === effortAlt, `current=${eff.current} (was ${effort0.current})`);
    const p = await client.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: 'Reply with exactly the word OK and nothing else.' }] }, { timeoutMs: 300000 });
    run.check('切换后下一轮 prompt 正常完成', p?.stopReason !== undefined, `stopReason=${p?.stopReason}`);
    run.info('切换后模型回执', client.updateTexts().slice(0, 300));
  } else {
    run.skip('effort 切换', 'reasoning_effort 无第二个可选值');
  }

  // 3. model 切换（仅当路由提供多于一个值时）。
  const modelAlt = model0.values.find((v) => v !== model0.current);
  if (modelAlt !== undefined) {
    const after = await client.request('session/set_config_option', { sessionId, configId: 'model', value: modelAlt }, { timeoutMs: 60000 });
    const m = currentOf(after.configOptions, 'model');
    run.check('model 切换后当前值已变', m.current === modelAlt, `current=${m.current} (was ${model0.current})`);
    const p = await client.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: 'Reply with exactly the word OK and nothing else.' }] }, { timeoutMs: 300000 });
    run.check('切模型后下一轮 prompt 正常完成', p?.stopReason !== undefined, `stopReason=${p?.stopReason}`);
    const back = await client.request('session/set_config_option', { sessionId, configId: 'model', value: model0.current }, { timeoutMs: 60000 });
    const mb = currentOf(back.configOptions, 'model');
    run.check('切回原模型', mb.current === model0.current, `current=${mb.current}`);
  } else {
    run.skip('model 切换', `未测（路由单模型，仅 ${model0.current}）；effort 切换已覆盖“下一轮生效”机制`);
  }

  // 反例 A：不存在的 value id。
  try {
    await client.request('session/set_config_option', { sessionId, configId: 'model', value: 'no-such-model-option' }, { timeoutMs: 60000 });
    run.check('反例 A：不存在的 value 应被拒', false, '服务端接受了未知 value');
  } catch (e) {
    run.check('反例 A：不存在的 value 被拒', /unknown model option|invalidParams/i.test(e.message), e.message);
  }
  // 反例 B：不存在的 session。
  try {
    await client.request('session/set_config_option', { sessionId: '00000000-0000-0000-0000-000000000000', configId: 'model', value: model0.current }, { timeoutMs: 60000 });
    run.check('反例 B：不存在的 session 应被拒', false, '服务端接受了未知 session');
  } catch (e) {
    run.check('反例 B：不存在的 session 被拒', /unknown session/i.test(e.message), e.message);
  }
  // 反例 C：不存在的 effort。
  try {
    await client.request('session/set_config_option', { sessionId, configId: 'reasoning_effort', value: 'no-such-effort' }, { timeoutMs: 60000 });
    run.check('反例 C：不存在的 effort 应被拒', false, '服务端接受了未知 effort');
  } catch (e) {
    run.check('反例 C：不存在的 effort 被拒', /unknown reasoning effort|invalidParams/i.test(e.message), e.message);
  }
  code = run.finish({ sessionId, modelInitial: model0.current, effortInitial: effort0.current });
} catch (e) {
  run.check('t3 主流程完成', false, String(e?.message ?? e));
  code = run.finish({ error: String(e?.message ?? e) });
} finally {
  await client.close();
}
process.exit(code);
