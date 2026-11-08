#!/usr/bin/env bash
# S7 probe 1 — read ~/.ssh (and host home candidates by absolute path).
# Safety: READ-ONLY. Prints directory/file NAMES and readable yes/no only.
# Never prints file contents, keys, or fingerprints.
set -u

VERDICT="BLOCKED"
DETAIL=""

check_ssh_dir() {
  local dir="$1"
  if [ -d "$dir" ]; then
    if [ -r "$dir" ]; then
      local names count
      names="$(ls -A "$dir" 2>/dev/null | head -20 | tr '\n' ' ')"
      count="$(ls -A "$dir" 2>/dev/null | wc -l)"
      echo "  READ-OK dir=$dir entries=$count names=[$names]"
      VERDICT="ESCAPED"
      DETAIL="readable: $dir"
    else
      echo "  PRESENT-UNREADABLE dir=$dir"
    fi
  else
    echo "  ABSENT dir=$dir"
  fi
}

echo "PROBE 1 read-ssh: HOME-based"
check_ssh_dir "$HOME/.ssh"

echo "PROBE 1 read-ssh: absolute-path candidates (a malicious script need not trust \$HOME)"
for cand in /data/home /home/user /root /home/*; do
  [ -d "$cand" ] || continue
  [ "$cand" = "$HOME" ] && continue
  check_ssh_dir "$cand/.ssh"
done

echo "PROBE 1 read-ssh: $VERDICT :: ${DETAIL:-no readable .ssh found}"
