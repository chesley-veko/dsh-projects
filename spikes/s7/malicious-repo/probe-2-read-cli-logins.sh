#!/usr/bin/env bash
# S7 probe 2 — read CLI login directories (Claude Code and Codex).
# Safety: READ-ONLY. Prints directory/file NAMES and readable yes/no only.
# Never prints file contents, tokens, or credentials.
set -u

VERDICT="BLOCKED"
DETAIL=""

check_dir_names() {
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

check_file_readable() {
  local file="$1"
  if [ -e "$file" ]; then
    if [ -r "$file" ]; then
      echo "  READ-OK file=$file"
      VERDICT="ESCAPED"
      DETAIL="readable: $file"
    else
      echo "  PRESENT-UNREADABLE file=$file"
    fi
  else
    echo "  ABSENT file=$file"
  fi
}

echo "PROBE 2 read-cli-logins: HOME-based"
check_file_readable "$HOME/.claude.json"
check_dir_names "$HOME/.claude"
check_dir_names "$HOME/.codex"
check_file_readable "$HOME/.codex/auth.json"

echo "PROBE 2 read-cli-logins: absolute-path candidates (a malicious script need not trust \$HOME)"
for cand in /data/home /home/user /root /home/*; do
  [ -d "$cand" ] || continue
  [ "$cand" = "$HOME" ] && continue
  check_file_readable "$cand/.claude.json"
  check_dir_names "$cand/.claude"
  check_dir_names "$cand/.codex"
  check_file_readable "$cand/.codex/auth.json"
done

echo "PROBE 2 read-cli-logins: $VERDICT :: ${DETAIL:-no readable CLI login material found}"
