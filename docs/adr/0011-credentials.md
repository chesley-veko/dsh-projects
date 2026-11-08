# 0011 凭据：本地复用 CLI 登录，云端只用按次注入的 API Key
- 状态：Accepted
- 日期：2026-11-08

## 背景
Anthropic 不允许第三方产品提供 claude.ai 订阅登录，但用户在自己机器上通过 Agent SDK / `claude -p` 使用自己的订阅仍被允许（2026-10-07 帮助文档）。OpenAI 表示 app-server 鉴权从未允许用于商业或托管服务。Agent Orchestrator 的自托管远程也不复制本机凭据。

## 决定
- 本地：只探测已登录状态，不读不复制 token；也可用 DSH `credentials` 中的 API Key。
- 远端：只允许 `credential:<id>`（API Key），启动该进程时按次注入；Claude 远端用 `--bare`；不同步 `~/.claude`、`~/.codex/auth.json`。
- 子进程沿用宿主 `dsh-subprocess-local` 的黑名单凭据清洗（剥离 `DSH_*` 与敏感凭据环境变量，保留 `HOME / PATH / USER / SSH_AUTH_SOCK / XDG_*` 与代理变量，确保本机 CLI 登录态与系统 Keychain 正常可用），再按次叠加注入项目声明变量；DSH 子实例独立 `DSH_HOME`。
- UI 在启动摘要与运行头显示计费来源。

## 后果
- 用户要在云端跑 Claude Code / Codex，必须先在设置里配 API Key。
- 条款变化时只需更新本 ADR 与探测逻辑。
