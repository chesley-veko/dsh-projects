#!/usr/bin/env node
/**
 * projects-mcp-stdio.mjs — 薄代理（MCP stdio 服务器），S5/S6 的实验装置。
 *
 * ACP 执行者通过 session/new 的 mcpServers 接入它；它把工具调用转发到
 * 本机回环 HTTP 的假 Engine（fake-engine.mjs），只回显并记录请求。
 * 它不是被测对象（被测对象是 ACP 执行者），不冒充任何真实 Engine。
 *
 * 用法（由 ACP 执行者的 mcpServers 配置启动，command 必须是绝对路径）：
 *   node projects-mcp-stdio.mjs --log ./projects-mcp.jsonl \
 *     --engine-url http://127.0.0.1:8931 --scratch ./spike-scratch
 *
 * MCP 方法：initialize / ping / tools/list / tools/call。
 * 未知方法返回 JSON-RPC -32601。stdin EOF 时退出。
 *
 * 工具：
 *   projects_echo       {text}                         -> 假 Engine 回显
 *   projects_sleep      {ms}                           -> 等待后返回（供取消测试计时）
 *   projects_slow_write {path, chunks, chunkDelayMs}   -> 分块写文件（供取消测试观察半写）
 *     path 只能落在 --scratch 目录内，拒绝 .. 越界。
 *
 * 日志：每一条进出 JSON-RPC 行都追加到 --log 文件（{ts, dir, msg}）。
 * 日志里不写任何凭据；复现步骤的 prompt 里不得出现真实 secret。
 */
import { createReadStream } from 'node:fs';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import readline from 'node:readline';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

const logPath = arg('--log', './projects-mcp.jsonl');
const engineUrl = arg('--engine-url', 'http://127.0.0.1:8931');
const scratchDir = resolve(arg('--scratch', './spike-scratch'));
mkdirSync(scratchDir, { recursive: true });
mkdirSync(dirname(resolve(logPath)), { recursive: true });
writeFileSync(logPath, JSON.stringify({ type: 'proxy-start', ts: new Date().toISOString(), engineUrl, scratchDir }) + '\n');

function log(dir, msg) {
  appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), dir, msg }) + '\n');
}

function send(obj) {
  const line = JSON.stringify(obj);
  log('out', obj);
  process.stdout.write(line + '\n');
}

function rpcError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

async function callEngine(tool, args, callId) {
  const res = await fetch(`${engineUrl}/engine/call`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tool, args, callId }),
  });
  if (!res.ok) throw new Error(`fake Engine HTTP ${res.status}`);
  return res.json();
}

function textResult(text) {
  return { content: [{ type: 'text', text }], isError: false };
}

const TOOLS = [
  {
    name: 'projects_echo',
    description: 'Echo text through the fake Engine and return the echo.',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  },
  {
    name: 'projects_sleep',
    description: 'Wait ms milliseconds then return. Test apparatus only.',
    inputSchema: { type: 'object', properties: { ms: { type: 'number' } }, required: ['ms'] },
  },
  {
    name: 'projects_slow_write',
    description: 'Write a file in chunks with delays. Test apparatus only; path must stay under the scratch dir.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        chunks: { type: 'number' },
        chunkDelayMs: { type: 'number' },
        chunkText: { type: 'string' },
      },
      required: ['path', 'chunks'],
    },
  },
];

let slowWriteCancelled = false;

async function handleCall(name, args, callId) {
  if (name === 'projects_echo') {
    if (typeof args?.text !== 'string') throw new Error('projects_echo requires {text: string}');
    const echoed = await callEngine('projects_echo', { text: args.text }, callId);
    return textResult(JSON.stringify(echoed.echo));
  }
  if (name === 'projects_sleep') {
    const ms = Math.min(Math.max(Number(args?.ms ?? 0), 0), 120000);
    await new Promise((r) => setTimeout(r, ms));
    return textResult(JSON.stringify({ sleptMs: ms }));
  }
  if (name === 'projects_slow_write') {
    const rel = String(args?.path ?? '');
    const target = resolve(scratchDir, rel);
    if (relative(scratchDir, target).startsWith('..') || target === scratchDir) {
      throw new Error(`path escapes scratch dir: ${rel}`);
    }
    const chunks = Math.min(Math.max(Number(args?.chunks ?? 1), 1), 50);
    const delay = Math.min(Math.max(Number(args?.chunkDelayMs ?? 200), 0), 5000);
    const chunkText = String(args?.chunkText ?? 'chunk\n');
    mkdirSync(dirname(target), { recursive: true });
    slowWriteCancelled = false;
    let written = 0;
    for (let i = 0; i < chunks; i++) {
      const line = `[${i + 1}/${chunks}] ${chunkText}`;
      appendFileSync(target, line);
      written += Buffer.byteLength(line);
      appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), type: 'slow-write-chunk', path: rel, chunk: i + 1, chunks, bytesWritten: written }) + '\n');
      if (i < chunks - 1) await new Promise((r) => setTimeout(r, delay));
    }
    return textResult(JSON.stringify({ path: rel, chunks, bytesWritten: written }));
  }
  throw new Error(`unknown tool: ${name}`);
}

async function handle(msg) {
  if (msg === null || typeof msg !== 'object') return;
  if (msg.method !== undefined && msg.id === undefined) return; // notification: no reply
  const { id, method, params } = msg;
  try {
    if (method === 'initialize') {
      const version = params?.protocolVersion ?? '2025-06-18';
      send({ jsonrpc: '2.0', id, result: { protocolVersion: version, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'projects-mcp-stdio', version: '0.1.0' } } });
    } else if (method === 'ping') {
      send({ jsonrpc: '2.0', id, result: {} });
    } else if (method === 'tools/list') {
      send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    } else if (method === 'tools/call') {
      const result = await handleCall(params?.name, params?.arguments ?? {}, String(id));
      send({ jsonrpc: '2.0', id, result });
    } else if (method !== undefined) {
      rpcError(id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    rpcError(id, -32000, String(e?.message ?? e));
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return; // ignore non-JSON lines on stdin
  }
  log('in', msg);
  void handle(msg);
});
rl.on('close', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
