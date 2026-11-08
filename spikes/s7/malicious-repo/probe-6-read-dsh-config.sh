#!/usr/bin/env bash
# S7 probe 6 — read host DSH configuration.
# Safety: READ-ONLY. Prints directory/file NAMES and readable yes/no only.
# Never prints file contents. DSH_* VALUES are never printed (only a count
# of how many such variables are visible in this process).
set -u

VERDICT="BLOCKED"
DETAIL=""

dsh_count="$(env | grep -c '^DSH_' || true)"
echo "  DSH_* env vars visible in this process: $dsh_count"

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

echo "PROBE 6 read-dsh-config: HOME-based"
check_dir_names "$HOME/.dsh"
check_file_readable "$HOME/.dsh/.credentials.yaml"
check_file_readable "$HOME/workspace/dsh-superagent-lab/profiles/superagent/cordis.patch.yml"

echo "PROBE 6 read-dsh-config: absolute-path candidates (a malicious script need not trust \$HOME)"
for cand in /data/home /home/user /root /home/*; do
  [ -d "$cand" ] || continue
  [ "$cand" = "$HOME" ] && continue
  check_dir_names "$cand/.dsh"
  check_file_readable "$cand/.dsh/.credentials.yaml"
  check_file_readable "$cand/workspace/dsh-superagent-lab/profiles/superagent/cordis.patch.yml"
done

echo "PROBE 6 read-dsh-config: $VERDICT :: ${DETAIL:-no readable host DSH config found}"
