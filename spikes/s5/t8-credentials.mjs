#!/usr/bin/env node
/**
 * t8-credentials.mjs — S5-8：本地订阅登录与 API Key 两种凭据下的可测性审计。
 *
 * 用法：
 *   node t8-credentials.mjs --log-dir ./evidence/<run>/t8
 *
 * 本脚本不 spawn 任何执行者、不做任何模型调用，只审计“每个执行者行
 * 能不能测、缺什么凭据、被哪一步挡住”，输出凭据缺口表
 * （credentials-gap.json）。不把任何凭据值写入日志或报告——只记
 * “有 / 无”（布尔值），不打印值。
 *
 * 审计项：
 *   dsh --profile acp：lab 服务是否可达（GET /orchestrator/api/models，
 *     只记 HTTP 状态与默认模型，不记 key）；lab opencode.env 文件
 *     是否存在（只记存在性）。
 *   claude-agent-acp：二进制是否存在、版本；ANTHROPIC_API_KEY 是否设置
 *     （只记布尔）；订阅登录态需人工确认（脚本不猜测登录文件位置，
 *     输出待确认项）。
 *   codex-acp：二进制是否存在、版本；OPENAI_API_KEY 是否设置（只记布尔）；
 *     订阅登录态需人工确认。
 *
 * 退出码恒为 0（缺口是结论，不是脚本失败）。
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, newRun } from './test-harness.mjs';

const args = parseArgs(process.argv.slice(2));
const logDir = args['log-dir'] ?? './evidence/t8';
const run = newRun({ test: 't8-credentials', executorCmd: '(audit only)', logDir });

function which(bin) {
  try {
    return execSync(`command -v ${bin}`, { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}
function versionOf(bin) {
  try {
    return execSync(`${bin} --version`, { encoding: 'utf8', timeout: 15000 }).trim().slice(0, 200);
  } catch {
    return '(unknown)';
  }
}

const rows = [];

// dsh --profile acp：凭据走 lab（opencode-go 路由 + dsh-01 上的真 key 文件）。
const dshBin = which('dsh');
const labEnv = join(process.env.HOME ?? '', '.config', 'dsh-lab', 'opencode.env');
let labModels = '(not checked)';
try {
  const r = await fetch('http://127.0.0.1:3082/orchestrator/api/models', { headers: { 'x-orchestrator-request': '1' } });
  if (r.ok) {
    const j = await r.json();
    labModels = `HTTP 200 default=${j?.default?.provider ?? '?'}:${j?.default?.model ?? j?.default ?? '?'}`;
  } else {
    labModels = `HTTP ${r.status}`;
  }
} catch (e) {
  labModels = `unreachable (${String(e?.message ?? e).slice(0, 120)})`;
}
rows.push({
  executor: 'dsh --profile acp',
  binary: dshBin ?? '(missing)',
  version: dshBin ? versionOf('dsh') : '(missing)',
  credential: 'lab 已配 opencode-go 路由；真 key 在 dsh-01 的 opencode.env',
  credentialPresent: existsSync(labEnv),
  labModels,
  testable: Boolean(dshBin) && existsSync(labEnv),
  blockedBy: !dshBin ? 'dsh 未安装' : !existsSync(labEnv) ? 'dsh-01 上缺少 opencode.env（真 key 未放）' : null,
});

// claude-agent-acp：需 Claude 订阅登录或 ANTHROPIC_API_KEY。
const claudeBin = which('claude-agent-acp');
rows.push({
  executor: '@agentclientprotocol/claude-agent-acp',
  binary: claudeBin ?? '(missing)',
  version: claudeBin ? versionOf('claude-agent-acp') : '(missing)',
  credential: 'Claude 订阅登录 或 ANTHROPIC_API_KEY',
  apiKeyPresent: Boolean(process.env.ANTHROPIC_API_KEY),
  subscriptionLogin: '需人工确认（本脚本不猜测登录文件位置）',
  testable: Boolean(claudeBin) && (Boolean(process.env.ANTHROPIC_API_KEY) || false),
  blockedBy: !claudeBin
    ? '未安装（npm i -g @agentclientprotocol/claude-agent-acp）'
    : !process.env.ANTHROPIC_API_KEY
      ? '缺凭据：无 ANTHROPIC_API_KEY，且订阅登录态未确认；进程会在启动/认证步被挡住'
      : null,
});

// codex-acp：需 ChatGPT 订阅登录或 OPENAI_API_KEY。
const codexBin = which('codex-acp');
rows.push({
  executor: '@agentclientprotocol/codex-acp',
  binary: codexBin ?? '(missing)',
  version: codexBin ? versionOf('codex-acp') : '(missing)',
  credential: 'ChatGPT 订阅登录 或 OPENAI_API_KEY',
  apiKeyPresent: Boolean(process.env.OPENAI_API_KEY),
  subscriptionLogin: '需人工确认（本脚本不猜测登录文件位置）',
  testable: Boolean(codexBin) && (Boolean(process.env.OPENAI_API_KEY) || false),
  blockedBy: !codexBin
    ? '未安装（npm i -g @agentclientprotocol/codex-acp）'
    : !process.env.OPENAI_API_KEY
      ? '缺凭据：无 OPENAI_API_KEY，且订阅登录态未确认；进程会在启动/认证步被挡住'
      : null,
});

for (const r of rows) {
  run.info(`${r.executor}`, `binary=${r.binary} testable=${r.testable} blockedBy=${r.blockedBy ?? '无'}`);
}
run.finish({ rows });
process.exit(0);
