#!/usr/bin/env node
/**
 * fake-engine.mjs — 假 Engine（回环 HTTP），S5/S6 的实验装置。
 *
 * 只做两件事：回显收到的工具调用，并把每一次调用原样记进 JSONL。
 * 它不是被测对象（被测对象是 ACP 执行者），不冒充任何真实 Engine。
 *
 * 用法：
 *   node fake-engine.mjs --port 8931 --log ./fake-engine.jsonl
 *
 * 接口：
 *   POST /engine/call  {tool, args, callId} -> {ok, echo:{tool,args}, callId, receivedAt}
 *   GET  /health       -> {ok:true, calls:<n>}
 *   GET  /calls        -> {calls:[...]}（全部已记录调用，供测试脚本核对）
 *
 * 只监听 127.0.0.1。日志里不写任何凭据；调用参数由测试脚本控制，
 * 复现步骤里不得出现真实 secret。
 */
import http from 'node:http';
import { appendFileSync, writeFileSync } from 'node:fs';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

const port = Number(arg('--port', '8931'));
const logPath = arg('--log', './fake-engine.jsonl');
const calls = [];

writeFileSync(logPath, JSON.stringify({ type: 'engine-start', ts: new Date().toISOString(), port }) + '\n');

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const send = (code, obj) => {
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  try {
    if (req.method === 'POST' && req.url === '/engine/call') {
      const body = await readBody(req);
      const record = {
        type: 'call',
        ts: new Date().toISOString(),
        tool: body.tool,
        args: body.args ?? {},
        callId: body.callId ?? null,
      };
      calls.push(record);
      appendFileSync(logPath, JSON.stringify(record) + '\n');
      send(200, { ok: true, echo: { tool: record.tool, args: record.args }, callId: record.callId, receivedAt: record.ts });
    } else if (req.method === 'GET' && req.url === '/health') {
      send(200, { ok: true, calls: calls.length });
    } else if (req.method === 'GET' && req.url === '/calls') {
      send(200, { calls });
    } else {
      send(404, { ok: false, error: 'not found' });
    }
  } catch (e) {
    send(400, { ok: false, error: String(e?.message ?? e) });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.error(`[fake-engine] listening on 127.0.0.1:${port}, log=${logPath}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
