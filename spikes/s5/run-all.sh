#!/usr/bin/env bash
# run-all.sh — S5 全套测试：先审计凭据（t8），再按 t1..t7 跑一个执行者。
# t4 跑四次：allow / reject / cancel / bogus（反例）。
#
# 用法（在 dsh-01 上，spikes/s5/ 目录内）：
#   ./run-all.sh --executor-cmd "dsh --profile acp" --label dsh-acp
#   ./run-all.sh --executor-cmd "claude-agent-acp" --label claude-acp   # 需凭据，见 t8
#   ./run-all.sh --executor-cmd "codex-acp" --label codex-acp           # 需凭据，见 t8
#
# 产物：evidence/<YYYYMMDD-HHMM>-<label>/ 下每项一个子目录，含 rpc.jsonl、
# initialize 存档与 summary.json；顶层有 versions.json。
# 全程约 30–45 分钟（t4 四次挂起各 120 秒 + 模型调用）。失败项不中断套件。
set -uo pipefail

EXECUTOR_CMD="dsh --profile acp"
LABEL="dsh-acp"
LOG_ROOT=""
CWD="/tmp/spike-s5-work"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --executor-cmd) EXECUTOR_CMD="$2"; shift 2 ;;
    --label) LABEL="$2"; shift 2 ;;
    --log-root) LOG_ROOT="$2"; shift 2 ;;
    --cwd) CWD="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done
if [[ -z "$LOG_ROOT" ]]; then
  LOG_ROOT="./evidence/$(date +%Y%m%d-%H%M)-${LABEL}"
fi
mkdir -p "$LOG_ROOT" "$CWD"
cd "$(dirname "$0")"

{
  echo "{"
  echo "  \"ts\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"executorCmd\": $(printf '%s' "$EXECUTOR_CMD" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),"
  echo "  \"node\": \"$(node --version 2>/dev/null)\","
  echo "  \"npm\": \"$(npm --version 2>/dev/null)\","
  echo "  \"dsh\": \"$(npm ls -g @deepseek-ai/dsh --depth=0 2>/dev/null | tail -1 | xargs)\","
  echo "  \"claudeAgentAcp\": \"$(npm ls -g @agentclientprotocol/claude-agent-acp --depth=0 2>/dev/null | tail -1 | xargs)\","
  echo "  \"codexAcp\": \"$(npm ls -g @agentclientprotocol/codex-acp --depth=0 2>/dev/null | tail -1 | xargs)\","
  echo "  \"uname\": \"$(uname -a)\","
  echo "  \"dshHome\": \"${DSH_HOME:-}\","
  echo "  \"labModels\": \"$(curl -s -H 'x-orchestrator-request: 1' http://127.0.0.1:3082/orchestrator/api/models 2>/dev/null | head -c 400 | python3 -c 'import json,sys; d=json.load(sys.stdin); print(f\"{d.get(\"default\",{}).get(\"provider\",\"?\")}:{d.get(\"default\",{}).get(\"model\",\"?\")}\")' 2>/dev/null || echo '(lab service unreachable)')\""
  echo "}"
} > "$LOG_ROOT/versions.json"
echo "versions -> $LOG_ROOT/versions.json"

declare -A RESULTS
run_one() {
  local name="$1"; shift
  echo "=== $name ==="
  if node "$@" --executor-cmd "$EXECUTOR_CMD" --label "$LABEL" --log-dir "$LOG_ROOT/$name" --cwd "$CWD"; then
    RESULTS["$name"]="PASS"
  else
    local rc=$?
    if [[ "$rc" == "2" ]]; then RESULTS["$name"]="BLOCKED"; else RESULTS["$name"]="FAIL($rc)"; fi
  fi
}

node ./t8-credentials.mjs --log-dir "$LOG_ROOT/t8"; RESULTS["t8"]="DONE"
run_one t1-initialize ./t1-initialize.mjs
run_one t2-session-new-mcp ./t2-session-new-mcp.mjs
run_one t3-set-config-option ./t3-set-config-option.mjs
for outcome in allow reject cancel bogus; do
  echo "=== t4-request-permission-$outcome ==="
  if node ./t4-request-permission.mjs --executor-cmd "$EXECUTOR_CMD" --label "$LABEL" --log-dir "$LOG_ROOT/t4-$outcome" --cwd "$CWD" --permission-outcome "$outcome" --hold-seconds 120; then
    RESULTS["t4-$outcome"]="PASS"
  else
    rc=$?
    if [[ "$rc" == "2" ]]; then RESULTS["t4-$outcome"]="BLOCKED"; else RESULTS["t4-$outcome"]="FAIL($rc)"; fi
  fi
done
run_one t5-cancel ./t5-cancel.mjs
run_one t6-resume-load ./t6-resume-load.mjs
run_one t7-reconcile ./t7-reconcile.mjs

echo
echo "=== S5 $LABEL 汇总 ==="
for k in t8 t1-initialize t2-session-new-mcp t3-set-config-option t4-allow t4-reject t4-cancel t4-bogus t5-cancel t6-resume-load t7-reconcile; do
  printf '%-28s %s\n' "$k" "${RESULTS[$k]:-(not run)}"
done
echo "证据目录：$LOG_ROOT"
