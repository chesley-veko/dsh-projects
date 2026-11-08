#!/usr/bin/env bash
# remote-check.sh — 在 dsh-02 上收集远端状态证据（S6 检查点用）。
# 用法：
#   ssh <dsh-02> 'bash -s' < remote-check.sh
#   或直接在 dsh-02 上：bash remote-check.sh
# 只输出事实，不输出任何凭据内容（opencode.env 只测存在性，不读内容）。
set -u
echo "=== remote-check $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "hostname: $(hostname)"
echo "whoami: $(whoami)"
echo "HOME: $HOME"
echo "DSH_HOME: ${DSH_HOME:-}"
echo "node: $(node --version 2>/dev/null || echo MISSING)"
echo "npm: $(npm --version 2>/dev/null || echo MISSING)"
echo "dsh: $(dsh --help 2>&1 | head -1 || echo MISSING)"
echo "dsh-install: $(npm ls -g @deepseek-ai/dsh --depth=0 2>/dev/null | tail -1 | xargs || echo unknown)"
echo "uptime: $(uptime)"
echo "--- lab ---"
echo "lab-dir: $(ls -d ~/workspace/dsh-superagent-lab 2>/dev/null || echo MISSING)"
echo "acp-profile: $(ls -d ~/workspace/dsh-superagent-lab/profiles/acp 2>/dev/null || echo MISSING)"
echo "opencode.env exists: $(test -f ~/.config/dsh-lab/opencode.env && echo yes || echo no)"
echo "--- ports ---"
(ss -tlnp 2>/dev/null | grep -E '8931|3082' || echo "no listener on 8931/3082") | head -5
echo "--- processes ---"
ps aux | grep -E 'dsh|projects-mcp|fake-engine' | grep -v grep || echo "no dsh/mcp/engine processes"
echo "--- tmux ---"
tmux ls 2>&1 | head -5 || echo "no tmux server"
echo "=== end remote-check ==="
