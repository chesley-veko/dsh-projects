#!/usr/bin/env bash
# run-s6.sh — S6 驱动脚本（dsh-01 上执行）。
#
# 用法：
#   ./run-s6.sh --ssh-target "<dsh-02 的 SSH 用户名>@ssh.instabox.sh" \
#     --remote-node "$(ssh ... command -v node)" \
#     --remote-lab /data/home/workspace/dsh-superagent-lab \
#     --remote-workdir /data/home/workspace/spike-s6-work
#
# 流程：
#   预检（两机版本、端口、lab 服务）→ 阶段 A 远端往返 + MCP 回路
#   → 阶段 B 断线 30 秒 → 阶段 C 本机退出后远端残留检查。
#   全程证据进 evidence/<YYYYMMDD-HHMM>-s6/。
#
# 前置（见 README §3）：dsh-02 上已装 dsh、已放 lab acp 覆盖层与真 key、
# 已传 spikes/s5 + spikes/s6 两份材料；本机已传 spikes/s5 + spikes/s6。
set -uo pipefail

SSH_TARGET=""
SSH_PORT="2222"
REMOTE_NODE=""
REMOTE_LAB="/data/home/workspace/dsh-superagent-lab"
REMOTE_WORKDIR="/data/home/workspace/spike-s6-work"
REMOTE_CWD="$REMOTE_WORKDIR"
LABEL="s6"
LOG_ROOT=""
PROXY_PATH="/data/home/workspace/spike-materials/s5/projects-mcp-stdio.mjs"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ssh-target) SSH_TARGET="$2"; shift 2 ;;
    --ssh-port) SSH_PORT="$2"; shift 2 ;;
    --remote-node) REMOTE_NODE="$2"; shift 2 ;;
    --remote-lab) REMOTE_LAB="$2"; shift 2 ;;
    --remote-workdir) REMOTE_WORKDIR="$2"; shift 2 ;;
    --label) LABEL="$2"; shift 2 ;;
    --log-root) LOG_ROOT="$2"; shift 2 ;;
    --proxy-path) PROXY_PATH="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done
if [[ -z "$SSH_TARGET" || -z "$REMOTE_NODE" ]]; then
  echo "need --ssh-target and --remote-node (see README §3)" >&2
  exit 2
fi
if [[ -z "$LOG_ROOT" ]]; then LOG_ROOT="./evidence/$(date +%Y%m%d-%H%M)-${LABEL}"; fi
mkdir -p "$LOG_ROOT"
cd "$(dirname "$0")"
SSH_OPTS="-o BatchMode=yes -o StrictHostKeyChecking=accept-new -p $SSH_PORT"
SSH_BASE="ssh $SSH_OPTS $SSH_TARGET"
REMOTE_CHECK_SSH="$SSH_BASE"
ENGINE_PORT=8931

echo "=== S6 预检 ==="
{
  echo "{"
  echo "  \"ts\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"localNode\": \"$(node --version)\","
  echo "  \"localDsh\": \"$(npm ls -g @deepseek-ai/dsh --depth=0 2>/dev/null | tail -1 | xargs)\","
  echo "  \"uname\": \"$(uname -a)\""
  echo "}"
} > "$LOG_ROOT/versions-local.json"
$SSH_BASE 'bash -s' < ./remote-check.sh > "$LOG_ROOT/remote-check-preflight.txt" 2>&1
echo "远端预检 -> $LOG_ROOT/remote-check-preflight.txt"
grep -E 'node:|dsh:|opencode.env|HOME:' "$LOG_ROOT/remote-check-preflight.txt" || true

echo "=== 起本机假 Engine ==="
node ../s5/fake-engine.mjs --port $ENGINE_PORT --log "$LOG_ROOT/fake-engine.jsonl" &
ENGINE_PID=$!
trap 'kill $ENGINE_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do curl -s http://127.0.0.1:$ENGINE_PORT/health >/dev/null && break; sleep 1; done
curl -s http://127.0.0.1:$ENGINE_PORT/health || { echo "fake Engine 未就绪" >&2; exit 1; }

ACP_CMD="$SSH_BASE -- env DSH_HOME=$REMOTE_LAB dsh --profile acp"
ACP_CMD_R="ssh -R $ENGINE_PORT:127.0.0.1:$ENGINE_PORT $SSH_OPTS $SSH_TARGET -- env DSH_HOME=$REMOTE_LAB dsh --profile acp"

echo "=== 阶段 A：远端往返 + MCP 回路 ==="
node ./s6-remote-roundtrip.mjs --executor-cmd "$ACP_CMD_R" --proxy-path "$PROXY_PATH" \
  --remote-node "$REMOTE_NODE" --engine-url "http://127.0.0.1:$ENGINE_PORT" \
  --log-dir "$LOG_ROOT/phase-a" --cwd "$REMOTE_WORKDIR" --label "$LABEL" || echo "阶段 A 返回非 0（见 $LOG_ROOT/phase-a/summary.json）"

echo "=== 阶段 B：断线 30 秒 ==="
node ./s6-disconnect.mjs --executor-cmd "$ACP_CMD_R" --proxy-path "$PROXY_PATH" \
  --remote-node "$REMOTE_NODE" --engine-url "http://127.0.0.1:$ENGINE_PORT" \
  --remote-check-ssh "$REMOTE_CHECK_SSH" --remote-check-script ./remote-check.sh \
  --log-dir "$LOG_ROOT/phase-b" --cwd "$REMOTE_WORKDIR" --label "$LABEL" --stop-seconds 30 \
  || echo "阶段 B 返回非 0（见 $LOG_ROOT/phase-b/summary.json）"

echo "=== 阶段 C：本机退出后远端残留（独立复查） ==="
sleep 2
$SSH_BASE 'bash -s' < ./remote-check.sh > "$LOG_ROOT/remote-check-final.txt" 2>&1
grep -E 'dsh|projects-mcp|no dsh' "$LOG_ROOT/remote-check-final.txt" | head -10 || true

echo
echo "=== S6 汇总 ==="
for d in phase-a phase-b; do
  echo "--- $d ---"
  python3 -c "import json; s=json.load(open('$LOG_ROOT/$d/summary.json')); print('failed:', s.get('failed')); [print(' ', c['result'], c['name']) for c in s['checks']]" 2>/dev/null || echo "(无 summary.json)"
done
echo "证据目录：$LOG_ROOT"
