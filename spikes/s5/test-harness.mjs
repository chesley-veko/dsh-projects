/**
 * test-harness.mjs — 8 项测试的公共脚手架：参数解析、断言记录、摘要落盘。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

export function splitCmd(cmd) {
  return cmd.trim().split(/\s+/);
}

export function newRun({ test, executorCmd, logDir }) {
  mkdirSync(logDir, { recursive: true });
  const checks = [];
  function check(name, ok, detail = '') {
    const result = ok ? 'PASS' : 'FAIL';
    checks.push({ name, result, detail: String(detail ?? '').slice(0, 2000) });
    console.log(`[${result}] ${name}${detail ? ` — ${String(detail).slice(0, 500)}` : ''}`);
    return ok;
  }
  function info(name, detail = '') {
    checks.push({ name, result: 'INFO', detail: String(detail ?? '').slice(0, 2000) });
    console.log(`[INFO] ${name}${detail ? ` — ${String(detail).slice(0, 500)}` : ''}`);
  }
  function skip(name, reason = '') {
    checks.push({ name, result: 'SKIP', detail: String(reason ?? '').slice(0, 2000) });
    console.log(`[SKIP] ${name}${reason ? ` — ${String(reason).slice(0, 500)}` : ''}`);
  }
  function finish(extra = {}) {
    const failed = checks.filter((c) => c.result === 'FAIL').length;
    const summary = { test, executorCmd, logDir, ts: new Date().toISOString(), failed, checks, ...extra };
    writeFileSync(join(logDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
    console.log(`--- ${test}: ${failed === 0 ? 'ALL PASS' : `${failed} FAIL`} (summary: ${join(logDir, 'summary.json')})`);
    return failed === 0 ? 0 : 1;
  }
  return { check, info, skip, finish, logDir: join(logDir) };
}
