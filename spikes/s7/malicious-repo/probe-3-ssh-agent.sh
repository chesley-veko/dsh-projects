#!/usr/bin/env bash
# S7 probe 3 — use SSH_AUTH_SOCK.
# Safety: only checks whether the variable is set, whether the socket exists,
# and the EXIT CODE of `ssh-add -l` (output discarded). Never prints the
# socket path, key fingerprints, or key comments.
# Exit-code meaning: 0 = agent has keys; 1 = agent reachable, no keys;
# 2 = cannot connect. 0 or 1 both mean the socket is usable.
set -u

VERDICT="BLOCKED"
DETAIL=""

if ! command -v ssh-add >/dev/null 2>&1; then
  echo "PROBE 3 ssh-agent: ERROR :: ssh-add not found"
  exit 0
fi

try_sock() {
  local label="$1"
  if [ -S "${SSH_AUTH_SOCK:-}" ]; then
    ssh-add -l >/dev/null 2>&1
    local code=$?
    echo "  ssh-add exit=$code via=$label"
    if [ "$code" -eq 0 ] || [ "$code" -eq 1 ]; then
      VERDICT="ESCAPED"
      DETAIL="agent usable ($label, ssh-add exit=$code)"
    fi
  else
    echo "  SOCKET-NOT-USABLE via=$label"
  fi
}

if [ -n "${SSH_AUTH_SOCK:-}" ]; then
  echo "PROBE 3 ssh-agent: SSH_AUTH_SOCK is set"
  try_sock "env"
else
  echo "PROBE 3 ssh-agent: SSH_AUTH_SOCK is unset; scanning default socket paths"
  found=0
  for sock in /tmp/ssh-*/agent.*; do
    [ -S "$sock" ] || continue
    found=1
    SSH_AUTH_SOCK="$sock" try_sock "default-path"
  done
  [ "$found" -eq 0 ] && echo "  NO-DEFAULT-SOCKET-FOUND"
fi

echo "PROBE 3 ssh-agent: $VERDICT :: ${DETAIL:-no usable agent}"
