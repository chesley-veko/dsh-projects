#!/usr/bin/env bash
# S3 live 环境修复：让 lab profile 里的重复 @deepseek-ai 包指向 dsh 安装目录的同一份副本。
#
# 根因（2026-11-08 live 实证）：profile 的 pnpm workspace 把 fence 插件的
# devDependencies（@deepseek-ai/cordis、dsh-scope、dsh-tools、schemastery 等）
# 提升安装到 $PROFILE/node_modules/@deepseek-ai/，形成与 dsh 宿主安装目录
# （$(npm root -g)/@deepseek-ai/dsh/node_modules/@deepseek-ai）不同的第二份模块实例。
# `tools` 服务若来自 profile 那份 dsh-tools，其内部 `scopeOf()` 用的是 profile 那份
# dsh-scope 的 Symbol，而 agent scope 标签由宿主那份 dsh-scope 打上，Symbol 不同
# → scopeOf(this.ctx) === undefined → tools.restrict() 抛
# "requires a scoped context"、agent setup 里的 tools.register() 被静默注册成全局工具
# （S4 probe 泄漏的同一根因）。
#
# 修复：把 profile 下重复的 @deepseek-ai 包换成指向宿主安装副本的软链。Node ESM 以
# realpath 作为模块身份，软链后插件、服务、宿主共享同一模块实例。
#
# 注意：在 profile 目录再次执行 `pnpm install` 会重建这些重复副本；每次重装后需重跑本脚本。
set -euo pipefail

PROFILE="${1:-$HOME/workspace/dsh-superagent-lab/profiles/superagent}"
HOST="$(npm root -g)/@deepseek-ai/dsh/node_modules/@deepseek-ai"
BACKUP="$PROFILE/.nm-backup-host-relink"

[ -d "$PROFILE/node_modules/@deepseek-ai" ] || { echo "no @deepseek-ai dir under $PROFILE/node_modules" >&2; exit 1; }
[ -d "$HOST" ] || { echo "host install not found: $HOST" >&2; exit 1; }

mkdir -p "$BACKUP"
cd "$PROFILE/node_modules/@deepseek-ai"
for pkg in */; do
  pkg="${pkg%/}"
  [ -d "$HOST/$pkg" ] || { echo "skip $pkg (not in host install)"; continue; }
  if [ -L "$pkg" ] && [ "$(readlink -f "$pkg")" = "$(readlink -f "$HOST/$pkg")" ]; then
    echo "ok      $pkg -> host"
    continue
  fi
  if [ -e "$BACKUP/$pkg" ]; then rm -rf "$pkg"; else mv "$pkg" "$BACKUP/$pkg"; fi
  ln -s "$HOST/$pkg" "$pkg"
  echo "relinked $pkg -> $HOST/$pkg"
done
echo "done. backup of replaced copies: $BACKUP"
