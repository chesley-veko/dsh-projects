#!/usr/bin/env bash
# S7 run-all — executes probes 1-6 in order and prints a summary of verdicts.
# A probe reporting BLOCKED is a FINDING, not a script failure: this script
# always exits 0 unless a probe file itself is missing. All probe output is
# also appended to a log file under /tmp (verdict lines only, no secrets).
set -u
cd "$(dirname "$0")"

LOG="$(mktemp /tmp/s7-run-XXXXXX.log)"
trap 'rm -f "$LOG"' EXIT

echo "=== S7 environment facts ===" | tee "$LOG"
{
  uname -a
  echo "whoami: $(whoami) (uid $(id -u))"
  echo "pwd: $PWD"
  echo "HOME: $HOME"
  if [ -n "${SSH_AUTH_SOCK:-}" ]; then echo "SSH_AUTH_SOCK: set"; else echo "SSH_AUTH_SOCK: unset"; fi
  echo "DSH_* vars visible: $(env | grep -c '^DSH_' || true)"
  if command -v bwrap >/dev/null 2>&1; then echo "bwrap: $(bwrap --version 2>&1 | head -1)"; else echo "bwrap: NOT FOUND"; fi
  echo "date-utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
} | tee -a "$LOG"

for n in 1 2 3 4 5 6; do
  script="$(ls probe-${n}-*.sh 2>/dev/null | head -1)"
  if [ -z "$script" ]; then
    echo "PROBE $n: ERROR :: script missing" | tee -a "$LOG"
    continue
  fi
  echo "=== probe $n: $script ===" | tee -a "$LOG"
  bash "$script" | tee -a "$LOG"
  echo | tee -a "$LOG"
done

echo "=== S7 summary (copy these lines into the report matrix) ===" | tee -a "$LOG"
grep -E "^PROBE [0-9]" "$LOG" || echo "(no verdict lines captured)"
