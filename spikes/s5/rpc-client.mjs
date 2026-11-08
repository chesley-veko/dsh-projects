/**
 * rpc-client.mjs — 自建 ACP 客户端（JSON-RPC over stdio，NDJSON）。
 *
 * 被测执行者（dsh --profile acp / claude-agent-acp / codex-acp）都走 ACP
 * stdio，本库是 8 项测试的公共底座：spawn、发请求、接通知、处理
 * agent -> client 的 session/request_permission、脱敏往返日志。
 *
 * 不依赖 @agentclientprotocol/sdk：线上的方法名与参数形状以
 * deepseek-harness fcc0ad46（packages/acp/acp/src/index.ts）为准；
 * 对外部执行者，收到的实际行为以日志为准，不预设。
 *
 * 日志脱敏：键名匹配 /api[_-]?key|token|secret|password|authorization|bearer/i
 * 的值一律记为 [REDACTED]。环境变量从不记入日志。
 */
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import readline from 'node:readline';

const SENSITIVE = /api[_-]?key|token|secret|password|authorization|bearer/i;

export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE.test(k) ? '[REDACTED]' : redact(v);
    return out;
  }
  return value;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createClient({ command, args = [], env = {}, logPath, label = 'acp' }) {
  mkdirSync(dirname(logPath), { recursive: true });
  writeFileSync(logPath, JSON.stringify({ type: 'client-start', ts: new Date().toISOString(), label, command, args }) + '\n');
  const stderrPath = logPath.replace(/\.jsonl$/, '.stderr.log');
  writeFileSync(stderrPath, '');

  const child = spawn(command, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  });
  child.stderr.on('data', (d) => appendFileSync(stderrPath, d));

  let nextId = 1;
  const pending = new Map();
  const requestHandlers = new Map();
  const notificationHandlers = new Map();
  const updates = []; // session/update notifications, verbatim (redacted)
  const requests = []; // agent -> client requests, verbatim (redacted)
  const events = []; // {ts, kind, ...} timeline for the summary
  let exited = null;
  let closed = false;

  function log(dir, msg) {
    appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), dir, msg: redact(msg) }) + '\n');
  }

  const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  rl.on('line', (line) => {
    if (!line.trim()) return;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      events.push({ ts: Date.now(), kind: 'non-json-stdout', line: line.slice(0, 500) });
      return;
    }
    log('in', msg);
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const p = pending.get(msg.id);
      if (p !== undefined) {
        pending.delete(msg.id);
        clearTimeout(p.timer);
        if (msg.error !== undefined) p.reject(new Error(`JSON-RPC ${msg.error.code}: ${msg.error.message}`));
        else p.resolve(msg.result);
      }
      return;
    }
    if (msg.method !== undefined && msg.id !== undefined) {
      // Agent -> client request (e.g. session/request_permission).
      requests.push({ ts: Date.now(), method: msg.method, params: redact(msg.params ?? {}) });
      events.push({ ts: Date.now(), kind: 'request', method: msg.method });
      const handler = requestHandlers.get(msg.method);
      if (handler) {
        Promise.resolve()
          .then(() => handler(msg.params ?? {}, msg.id))
          .then((result) => {
            const out = { jsonrpc: '2.0', id: msg.id, result };
            log('out', out);
            child.stdin.write(JSON.stringify(out) + '\n');
          })
          .catch((e) => {
            const out = { jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: String(e?.message ?? e) } };
            log('out', out);
            child.stdin.write(JSON.stringify(out) + '\n');
          });
      } else {
        const out = { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Method not found: ${msg.method}` } };
        log('out', out);
        child.stdin.write(JSON.stringify(out) + '\n');
      }
      return;
    }
    if (msg.method !== undefined) {
      events.push({ ts: Date.now(), kind: 'notification', method: msg.method });
      if (msg.method === 'session/update') updates.push({ ts: Date.now(), ...redact(msg.params ?? {}) });
      const handler = notificationHandlers.get(msg.method);
      if (handler) void handler(msg.params ?? {});
    }
  });

  child.on('exit', (code, signal) => {
    exited = { code, signal, ts: Date.now() };
    events.push({ ts: Date.now(), kind: 'exit', code, signal });
    for (const [, p] of pending) {
      clearTimeout(p.timer);
      p.reject(new Error(`executor exited before response (code=${code} signal=${signal})`));
    }
    pending.clear();
  });

  function request(method, params = {}, { timeoutMs = 120000 } = {}) {
    if (closed) throw new Error('client is closed');
    const id = nextId++;
    const out = { jsonrpc: '2.0', id, method, params };
    log('out', out);
    child.stdin.write(JSON.stringify(out) + '\n');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`timeout after ${timeoutMs}ms waiting for ${method} (id=${id})`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer, method });
    });
  }

  function notify(method, params = {}) {
    if (closed) throw new Error('client is closed');
    const out = { jsonrpc: '2.0', method, params };
    log('out', out);
    child.stdin.write(JSON.stringify(out) + '\n');
  }

  async function waitFor(predicate, { timeoutMs = 120000, pollMs = 200 } = {}) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const hit = events.find((e) => predicate(e));
      if (hit) return hit;
      if (Date.now() > deadline) throw new Error(`waitFor timed out after ${timeoutMs}ms`);
      if (exited) throw new Error(`executor exited while waiting (code=${exited.code})`);
      await sleep(pollMs);
    }
  }

  async function close({ timeoutMs = 10000 } = {}) {
    if (closed) return exited;
    closed = true;
    try {
      child.stdin.end();
    } catch { /* already closed */ }
    const deadline = Date.now() + timeoutMs;
    while (exited === null && Date.now() < deadline) await sleep(100);
    if (exited === null) {
      child.kill('SIGTERM');
      await sleep(1000);
      if (exited === null) child.kill('SIGKILL');
    }
    return exited;
  }

  return {
    child,
    request,
    notify,
    onRequest: (method, fn) => requestHandlers.set(method, fn),
    onNotification: (method, fn) => notificationHandlers.set(method, fn),
    waitFor,
    close,
    get updates() { return updates; },
    get requests() { return requests; },
    get events() { return events; },
    get exited() { return exited; },
    get stderrPath() { return stderrPath; },
    /** Text fragments seen in session/update notifications, in order. */
    updateTexts() {
      const out = [];
      for (const u of updates) {
        const update = u.update;
        if (update?.sessionUpdate === 'agent_message_chunk' && update.content?.text) out.push(update.content.text);
        if (update?.sessionUpdate === 'agent_message_chunk' && update.content?.type === 'text' && update.content.text) out.push(update.content.text);
      }
      return out.join('');
    },
    /** Tool calls seen in session/update notifications. */
    toolCalls() {
      const out = [];
      for (const u of updates) {
        const update = u.update;
        if (update?.sessionUpdate === 'tool_call') out.push(update);
        if (update?.sessionUpdate === 'tool_call_update') out.push(update);
      }
      return out;
    },
  };
}
