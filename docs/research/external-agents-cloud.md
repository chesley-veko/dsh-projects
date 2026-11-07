# 外部 Agent 执行器 × 本地/云端执行：为 DSH「Projects」做的调研

调研时间：2026-11-08（Asia/Taipei）。来源均为官方文档、GitHub 仓库/源码与 changelog；每条结论后附 URL 和日期。「日期」一栏：页面标了发布日期就写发布日期；文档页没有日期的，写「2026-11-08 查阅」。**[推断]** 表示是我的推理，原文没有直接这么说。
本地源码的版本：vibe-kanban@08064e0 (2026-11-03)、agent-orchestrator@5cde191 (2026-11-08)、OpenHands software-agent-sdk@18f6390 (2026-11-07)、deepseek-harness@fcc0ad46 (2026-11-04)。这几个仓库都在 `work/research-repos/` 和 `work/deepseek-harness/` 下。

---

## 0. 结论先行（TL;DR）

1. **Cursor Projects 的形态**：协调者自己不写代码，只负责规划、派发任务、收回结果；默认跑在云端，需要用户本机时再起一个本地 agent；有一份共享上下文文件，在所有云端和本地机器之间同步；还支持订阅（Slack/定时/PR）。这和我们要做的 DSH Projects 是同一种东西。但 Cursor 的执行器只有它自己的 agent，没有接外部 agent。（https://cursor.com/blog/projects ，2026-09-10）
2. **「本地还是云端」在 Cursor 里不是一个任务属性，而是由协调者或用户按需决定的运行位置**。Agents Window 能在 local / worktree / cloud / remote SSH 之间切换，支持云↔本地双向 handoff，`/in-cloud` 把任务派给云端子 agent，`/best-of-n` 让多个模型在各自的 worktree 里并行跑。（https://cursor.com/docs/agent/agents-window.md ；https://cursor.com/changelog/3-0 ，2026-04-02）
3. **云端环境的事实标准已经收敛成 4 个部分**：①基础镜像（Dockerfile 或快照）；②`install`：可重复执行，结果固化进快照/Build；③`start`/`terminals`：每次启动时拉起服务；④密钥（运行时密钥和构建密钥分开）+ 网络出站白名单。Cursor 的 `.cursor/environment.json`、Codex Cloud 的 setup/maintenance script、Codespaces 的 devcontainer prebuild 都是这个结构。（https://cursor.com/docs/cloud-agent/setup.md ；https://cursor.com/docs/cloud-agent/builds ；https://developers.openai.com/codex/cloud/environments/ ）
4. **结果怎么交回：云端一律是「分支 + PR（可选自动开）」，本地一律是「worktree diff → 合并或开 PR」**。Cursor API 有 `autoCreatePR` 和 webhook（https://cursor.com/docs/cloud-agent/api/endpoints ）；Codex Cloud 用 `codex apply <TASK_ID>` 把 diff 打到本地（https://developers.openai.com/codex/cli/reference ）；Claude Code 用 `--teleport` 把云端会话拉回本地，而且是**单向**的（https://code.claude.com/docs/en/claude-code-on-the-web ）。
5. **外部 agent 的程序化接入有三条路，按优先级排**：
   - (a) **ACP**（Agent Client Protocol）。v1 是稳定版，v2 还是 Draft。Gemini CLI（`gemini --acp`）、Cursor CLI（`agent acp`）、OpenCode（`opencode acp`）**原生支持**；Claude Code 和 Codex 要通过官方组织维护的适配器 `@agentclientprotocol/claude-agent-acp` / `@agentclientprotocol/codex-acp`。（https://harnessnotes.com/acp ，2026-10-23）
   - (b) 各家自己的协议：Claude 的 `claude -p --input-format/--output-format stream-json` / Agent SDK；Codex 的 `codex app-server`（JSON-RPC，IDE 插件用的就是它；`codex mcp-server` 已删除）。
   - (c) 一次性 CLI：`codex exec --json`、`cursor agent -p --output-format stream-json`。
6. **按模型选择分**：ACP 里统一走 `session/set_config_option`（category=`model`/`thought_level`）；`session/set_mode` 和 `set_model` 在 v2 里被删除或并入 config options（https://agentclientprotocol.com/protocol/v2/migration ）。Claude 用 `--model` / SDK 的 `set_model()`；Codex 用 `-m` / `thread/start.model`；Cursor 云端 API 用 `model.id` 加 `model.params`。
7. **成熟编排器都是同一套双接口：Executor 接口（怎么启动/续聊/取日志）× Workspace/Runtime 接口（在哪里跑）**。
   - vibe-kanban：`StandardCodingAgentExecutor{spawn, spawn_follow_up, normalize_logs, discover_options}`，加上 `ExecutorConfig{executor, variant, model_id, agent_id, reasoning_id, permission_policy}`。
   - agent-orchestrator：`Agent{GetLaunchCommand, GetRestoreCommand, SessionInfo…}` × `Runtime{Create, Destroy, GetOutput, IsAlive}` × `Workspace{Create, Destroy, Restore, StashUncommitted, ApplyPreserved}`。
   - OpenHands：`BaseWorkspace`（Local/Docker/Remote/Cloud…），加上 `ACPAgent`，后者可以把任何 ACP agent 当成执行器用。
   **而且 agent-orchestrator 已经有一个 `deepseekharness` 适配器（用 `dsh --profile headless` 和 `--profile acp`）**。
8. **DSH 自身已经具备大部分积木**：`@deepseek-ai/dsh-acp`（`dsh --profile acp`，支持 `session/new|resume|list|close`、`set_config_option{model, reasoning_effort}`）；`dsh-subagent-acp/-claude-code/-codex`（单次委派）；`dsh-subprocess-ssh` / `dsh-fs-ssh` / `dsh-sandbox-ssh`（远程执行）；`dsh-sandbox`（read-only / workspace-write / danger-full-access）。所以 Projects 不需要另造协议，应该把「DSH 自家 agent」也当成一个 ACP 执行器来对待。（本地仓库 `packages/acp/acp/README.md` 等）
9. **鉴权是硬约束**：Anthropic 不允许第三方产品提供 claude.ai 订阅登录，第三方 SDK 产品应使用 API Key（https://code.claude.com/docs/en/legal-and-compliance ）。但对「用户在自己机器上跑自己的 claude」，2026-10-07 的帮助文档说 Agent SDK / `claude -p` / 第三方应用**仍然可以**消耗订阅额度（https://support.claude.com/en/articles/15036540 ）。OpenAI 方面：app-server 鉴权「从未允许用于商业或托管服务」，推荐改用 Sign in with ChatGPT（https://developers.openai.com/codex/app-server ）；Codex Cloud 只能用 ChatGPT 登录（https://developers.openai.com/codex/auth ）。**[推断] 结论：DSH Projects 作为开源本地插件，复用用户本机 CLI 已有的登录态是安全的；一旦涉及「云端托管执行」，就只接受用户自己提供的 API Key（BYOK），绝不代为中转订阅凭据。**
10. **云端执行底座**：自建或 BYO 场景首选 **E2B 或 Daytona**（每 vCPU-h 0.0504 美元，每 GiB-h 0.0162 美元，按秒计费，有快照/暂停）。**Modal** 适合需要 GPU 的场景。**SSH 远程主机或 Docker** 是零成本起步。**Codespaces** 适合人机协作，但 API 偏 IDE。Cursor 自己的云端是托管 VM（Ubuntu），也支持「Self-Hosted Machines」：在 Modal/Daytona/E2B 等平台上跑 `agent worker`。（https://cursor.com/docs/cloud-agent/self-hosted.md ）

---

## 1. Cursor Projects 与 Cloud/Background Agents

### 1.1 Projects（2026-09-10 发布，Beta）
- 协调者：「doesn't write code itself but directs other agents… never blocked」，可以并行派发大量子 agent。—— https://cursor.com/blog/projects （2026-09-10）
- **Cloud by default, local when needed**：「A Project runs on its own computer… When something needs testing on your machine, the coordinator spins up a local agent to run it there.」—— 同上。
- **Shared context**：「Each Project maintains a set of files that sync across every cloud and local machine its agents use」，agent 会把研究结果、产物、测试方法写进去。—— 同上。
- **Subscriptions**：可以 watch Slack 频道、按 schedule 运行、follow 所有 PR（修 CI、在 PR open/merge 时行动）。—— 同上；changelog https://cursor.com/changelog/projects （2026-09-10）。
- **[推断]** 「本地还是云端」由协调者按任务需要来决定（例如「需要在你机器上测试」才用本地），并不是用户给每个任务手填的字段。官方没有公开选择规则。

### 1.2 Agents Window / Cursor 3（2026-04-02 GA）
- 统一工作区里可以混用 local、worktree、cloud、remote SSH 四种位置；「Easier handoff between local and cloud: quickly move an agent from cloud to local to iterate quickly, and move it back to the cloud」；`/in-cloud` 把任务交给云端子 agent，`/autopilot` 托管一个 PR。—— https://cursor.com/docs/agent/agents-window.md （2026-11-08 查阅；GA 日期 2026-04-02）
- `/worktree` 在隔离的 git worktree 里跑；`/best-of-n` 「runs the same task in parallel across multiple models, each in its own isolated worktree, then compares outcomes」。—— https://cursor.com/changelog/3-0 （2026-04-02）；https://cursor.com/docs/configuration/worktrees
- 历史：Cursor 2.0 首次引入「最多 8 个 agent 并行，用 git worktree 或远程机器隔离」，以及多模型比较。—— https://cursor.com/changelog/2-0 、https://cursor.com/blog/2-0 （2025-10-29）
- CLI：消息前加 `&` 就会推到 Cloud Agent；`-w/--worktree` 会在 `~/.cursor/worktrees/` 下建工作树。—— https://cursor.com/docs/cli/using （2026-11-08 查阅）

### 1.3 云端环境配置
- 环境 = 「cloned repos, installed dependencies, secrets, startup commands, and network access」，跑在隔离的 Ubuntu VM 里。配置方式有三种：agent 自己引导配置（推荐）、保存的快照、`.cursor/environment.json`（引用 Dockerfile）。—— https://cursor.com/docs/cloud-agent.md 、https://cursor.com/docs/cloud-agent/setup.md （2026-11-08 查阅）
- 环境解析优先级：个人保存的环境 > 团队保存的环境 > 仓库里的 `.cursor/environment.json`（仅单仓库）。支持多仓库环境。—— setup.md
- `environment.json` 示例：`{"build":{"dockerfile":"Dockerfile","context":".."},"install":"pnpm install && ./custom_script.sh"}`，或者 `{"snapshot":"snapshot-…","install":"npm install"}`。Dockerfile 里**不要 COPY 项目**，由 Cursor 负责 checkout。—— setup.md
- **Builds**：`install` 在每次 Build 时运行，必须幂等，结果作为磁盘快照保存；`start` 和 `terminals` 在每次 agent 启动时运行（Docker、数据库、dev server，跑在与 agent 共享的 tmux 里）；「Builds preserve disk state only」；Build 失败不会替换当前活动的 Build。—— https://cursor.com/docs/cloud-agent/builds （2026-11-08 查阅）
- 密钥：Dashboard 里的 Secrets 以环境变量形式注入，有 team/user/environment 三个作用域；**Build Secrets** 只在 Docker 构建时通过 `RUN --mount=type=secret` 提供，不暴露给 agent；还支持 OIDC 短期令牌和 AWS AssumeRole（1 小时过期，自动刷新）。网络可以限制出站域名，也可以接 Tailscale（userspace 模式）或 Cloudflare Tunnel。—— https://cursor.com/docs/cloud-agent/security-network 、setup.md
- 端口：Agents Window 里的「Forwarded Ports」会把云端 agent 监听的端口转发到本机预览。—— setup.md
- **Self-Hosted Machines**：Cursor 跑 agent 循环和推理，你的 worker（`agent worker start`）执行文件和终端工具；只需出站 HTTPS，不开入站端口；分为 My Machines 和 Team Pools（Enterprise），合作方指南覆盖 Modal、Daytona、E2B、Vercel、Cloudflare、K8s 等。—— https://cursor.com/docs/cloud-agent/self-hosted.md （2026-11-08 查阅）

### 1.4 结果回传、模型、计费
- 云端 agent 「clone your repo… work on a separate branch, then push changes to your repo for handoff」，产出 merge-ready PR，外加截图、视频、日志等产物；支持远程桌面接管。—— cloud-agent.md
- API `POST /v1/agents`：`prompt`、`model{id, params[]}`（不传时回退到用户默认、团队默认、系统默认）、`autoCreatePR`、起始 ref、`envVars`、`mcpServers`；webhook 在 `ERROR`/`FINISHED` 时 POST，用 HMAC-SHA256 签名。—— https://cursor.com/docs/cloud-agent/api/endpoints 、https://cursor.com/docs/cloud-agent/api/webhooks （2026-11-08 查阅）
- 模型：「Cloud Agents use a curated selection of models」，可以选上下文窗口大小。计费按所选模型的费率走计划用量；**Free 和 Plus 计划不包含 Cloud Agents**。—— cloud-agent.md
- Cursor CLI 无头模式：`agent -p --output-format stream-json [--stream-partial-output] --model <id> --force --resume <chatId>`，鉴权用 `CURSOR_API_KEY`。—— https://cursor.com/docs/cli/reference/parameters 、https://cursor.com/docs/cli/headless

---

## 2. Claude Code 的程序化控制

- **无头模式**：`claude -p`，配合 `--output-format text|json|stream-json`（流式需要加 `--verbose`；`--include-partial-messages` 输出 token 增量）和 `--input-format stream-json`。第一条事件是 `system/init`，包含 model、tools、MCP 状态和 `capabilities`，可以据此做特性探测；最后一条是 `result`，含 `total_cost_usd`、`session_id`。—— https://code.claude.com/docs/en/headless （2026-11-08 查阅）
- 推荐用 `--bare` 模式（脚本和 SDK 调用，**将来会成为 `-p` 的默认模式**）：不自动加载 hooks、skills、CLAUDE.md、`.mcp.json`；**bare 模式不读 OAuth 或钥匙串，必须用 `ANTHROPIC_API_KEY`**。—— 同上
- 权限：v2.1.302 起，`-p` 和 SDK 在未指定模式时默认为 Manual（`default`）模式，**需要审批的调用会直接被拒**，除非有 allow 规则、hook、`canUseTool` 回调或 `--permission-prompt-tool`。可选模式有 `default/acceptEdits/plan/auto/dontAsk/bypassPermissions`；`--permission-prompts none` 用于无人值守。—— 同上；https://code.claude.com/docs/en/permission-modes
- 子 agent 流：`parent_tool_use_id` 可以重建嵌套树；`--forward-subagent-text` 会转发子 agent 的文本。—— headless
- 会话：`--resume <id>` / `--continue` / fork；SDK 里有 `continue_conversation`、`resume`、`fork`；「Sessions persist the conversation, not the filesystem」（文件回滚要用 checkpointing）。—— https://code.claude.com/docs/en/agent-sdk/sessions
- Agent SDK（TS `@anthropic-ai/claude-agent-sdk` / Python）：底层是 spawn 一个 `claude` CLI 子进程；streaming input 模式下可以运行时调用 `set_model()` 和 `set_permission_mode()`；有 hooks（PreToolUse 等）和 MCP。—— https://code.claude.com/docs/en/agent-sdk/python 、/agent-sdk/hosting 、/agent-sdk/permissions
- 云端：Claude Code on the web 有云端 VM；`claude --cloud "<task>"` 新建云端会话；`claude --teleport <id>` 把云端会话拉回本地（会检出它的分支，加载对话，之后本地是一份独立副本）；**CLI 不能把已有的本地会话推到云端**。—— https://code.claude.com/docs/en/claude-code-on-the-web （2026-11-08 查阅）
- ACP 适配器：包名经历了 `@zed-industries/claude-code-acp`（0.16.2 后弃用）→ `@zed-industries/claude-agent-acp`（0.17.0）→ **`@agentclientprotocol/claude-agent-acp`**（v0.24.0 起，2026-03-26，迁到 ACP 组织）。支持 list/load/resume/fork/close/delete；model 和 effort 用 `session/set_config_option`（**没有独立的 `set_model`**）；`--hide-claude-auth` 可以隐藏订阅登录。—— https://github.com/agentclientprotocol/claude-agent-acp/releases/tag/v0.24.0 ；https://harnessnotes.com/acp （2026-10-23）
- **鉴权条款**：「Developers building products… including those using the Agent SDK, should use API key authentication… Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, or Max plan credentials on behalf of their users」；「Each end user must authenticate with their own Anthropic API key, Claude subscription plan credentials, or 3P inference provider credential」。—— https://code.claude.com/docs/en/legal-and-compliance （2026-11-08 查阅）。另一方面，2026-10-07 的帮助文档写道：「You can still use the Claude Agent SDK, claude -p, and third-party apps with your subscription limits」，Max/Team 计划另含每月 API credits。—— https://support.claude.com/en/articles/15036540 （2026-10-07 更新）。**[推断] 两者合起来读：最终用户在本机用自己的订阅跑 `claude` 进程，是被容忍的；第三方产品自己提供「用 Claude 登录」，或者由服务端代为使用订阅，是被禁止的。** 二手报道称 2026-11-12 生效的使用政策会禁止「route requests through consumer subscriptions」的服务（https://dbggr.dev/articles/claude-chatgpt-subscription-coding-tools/ ，2026-10-14，二手来源，未核对原文）。

---

## 3. OpenAI Codex

- `codex exec`：默认 **read-only** 沙箱，可选 `--sandbox workspace-write|danger-full-access`；`--full-auto` 已弃用，改用 `--approve-for-me`。`--json` 输出 JSONL 事件（`thread.started` / `turn.started|completed|failed` / `item.*` / `error`）；`-m` 指定模型；`codex exec resume <thread_id>`；`codex exec fork`。—— https://developers.openai.com/codex/non-interactive-mode 、https://developers.openai.com/codex/cli/reference （2026-11-08 查阅）
- **`codex app-server`**：双向 JSON-RPC 2.0（线上省略了 `"jsonrpc"` 字段），传输方式默认 stdio，WebSocket 是实验性的。方法有 `initialize` → `thread/start|resume|fork` → `turn/start|interrupt`，通知有 `item/started|completed`、`item/agentMessage/delta` 等。由服务端发起的审批请求需要客户端应答。IDE 插件、桌面应用、Python SDK 都建在它上面。—— https://developers.openai.com/codex/app-server ；https://openai.com/index/unlocking-the-codex-harness
- `codex mcp-server` **已删除**，官方要求迁移到 app-server。—— https://developers.openai.com/codex/guides/agents-sdk
- `ThreadStartParams` 包含 `model`、`cwd`、`approval_policy`、`sandbox`（vibe-kanban 源码里的用法：`crates/executors/src/executors/codex.rs:517`）。
- **app-server 鉴权条款**：「App-server authentication has never been permitted for commercial or hosted services… we recommend migrating to Sign in with ChatGPT」。—— https://developers.openai.com/codex/app-server （2026-11-08 查阅）
- 鉴权方式：ChatGPT 登录（订阅额度）或 API Key（`CODEX_API_KEY` 适用于 exec、review、TS SDK、remote exec-server）；**Codex cloud 必须用 ChatGPT 登录**。—— https://developers.openai.com/codex/auth 、/noninteractive
- **Codex Cloud**：在容器里检出分支/SHA → 跑 setup script（缓存容器恢复时跑 maintenance script）→ setup 阶段有网，**agent 阶段默认断网** → 输出 diff。容器最多缓存 12 小时。文档页标题现在是「Codex Cloud (Legacy)」，新版环境改成 Install script + Start skill，以及「Publish 冻结文件系统」。—— https://developers.openai.com/codex/cloud/environments/ ；https://learn.chatgpt.com/docs/environments/cloud-environments （2026-11-08 查阅）
- `codex cloud`（实验性）：`exec --env <ENV> [--branch] [--attempts 1-4]`（best-of-N）、`status`、`list --json`、`diff --attempt N`、`apply`；`codex apply <TASK_ID>`（稳定）用 git apply 打到本地工作树，冲突时返回非零。—— https://developers.openai.com/codex/cli/reference
- ACP：`@agentclientprotocol/codex-acp`（由 JetBrains 和 Zed 维护，**通过 `codex app-server` 驱动**；旧的 Rust 版 `zed-industries/codex-acp` 已归档）。config options 包括 `model`、`reasoning_effort`、`collaboration_mode`；modes 有 read-only / workspace-write / agent / agent-full-access。—— https://harnessnotes.com/acp ；https://github.com/zed-industries/codex-acp/issues/333 （2026-06-23）

---

## 4. Agent Client Protocol（ACP）

- **状态**：v1 是 Latest（稳定版）；**v2 是 Draft**，官方建议「negotiate the version per connection… add v2 behind feature flags」。—— https://agentclientprotocol.com/protocol/v2/migration （2026-11-08 查阅）
- **v1 核心方法**：`initialize` → `authenticate` → `session/new{cwd, mcpServers}` → `session/prompt`（请求一直挂起，直到 turn 结束才返回 `stopReason`），期间 Agent 推送 `session/update` 通知（message/thought chunk、tool_call、plan 等），并发出 `session/request_permission`（allow_once/allow_always/reject_once…）；`session/cancel`。可选能力：`session/load`（需要 `loadSession`，会回放历史）、`session/resume|list|fork|close`、`session/set_mode`、`session/set_config_option`、Client 提供的 `fs/*` 和 `terminal/*`。—— https://agentclientprotocol.com/protocol/v1/overview 、/session-setup 、/schema
- **模型选择**：Session Config Options（category 为 `mode` / `model` / `model_config` / `thought_level`）取代 Session Modes；`set_model` 在 v1 里是 unstable。—— https://agentclientprotocol.com/protocol/v1/session-config-options ；第三方探测结果：33 个 agent 中有 17 个支持 `session/set_model`，10 个支持 resume（https://acpserver.org/registry ，registry 快照日期 2026-09-12，二手来源）。
- **v2 主要变化**：`session/prompt` 的响应只确认消息已插入（返回 `messageId`），turn 的完成改由 `state_update{running|idle|requires_action}` 加 stopReason 表示；**删除 `session/load`**，统一用 `session/resume{replayFrom}`；**删除 Client 的 fs/terminal 方法和 `set_mode`**，Client 侧工具一律通过 MCP 提供；advertise 了 session 能力就必须实现 list/resume/close；diff 改为 `changes` + `git_patch`。—— 同上
- **支持情况**（https://agentclientprotocol.com/get-started/agents ；https://harnessnotes.com/acp ，2026-10-23）：
  - 原生：Gemini CLI（`gemini --acp`，`--experimental-acp` 已弃用，https://geminicli.com/docs/cli/acp-mode ）、Cursor CLI（`agent acp`）、OpenCode（`opencode acp`）、Goose、Kiro CLI、Qwen Code、Kimi CLI、GitHub Copilot（预览）、Junie、Cline、OpenHands 等。
  - 适配器：Claude（claude-agent-acp）、Codex（codex-acp）、pi（pi-acp）。
  - 注意：Gemini CLI 对免费层和 Google One 用户已在 2026-06-18 由 Antigravity CLI 取代（https://geminicli.com/docs/cli/cli-reference ）。
- **无头编排的局限**：
  1. 被测的 5 个主流 agent **全部不使用 Client 的 `fs/*` 和 `terminal/*`**，都是直接读写磁盘、用自己的 shell（harnessnotes）。所以「把执行环境放在远端」不能靠 ACP 的 fs/terminal 回调来做，**必须把 agent 进程本身放到目标环境里**。**[推断]**
  2. 标准远程传输（streamable HTTP/WebSocket）还在 RFD 阶段，不在核心协议里；stdio 是主传输方式。—— v2 migration「Transports」。
  3. 各 agent 的能力差异很大：Cursor 没有 resume/fork，ACP 会话与 CLI 会话分开存储；pi 没有审批；OpenCode 拒绝 SSE MCP。所以必须**基于 capability 探测做降级**。
  4. 用量和成本字段（`usage_update`）不是每家都有（Cursor 没有）。
  5. 鉴权多数是「terminal auth」（让用户在终端里登录），不适合全自动的云端场景。**[推断]**

---

## 5. 多执行器编排器怎么抽象

### 5.1 vibe-kanban（BloopAI，Rust）——本地源码 @08064e0
- **执行器枚举**：`CodingAgent{ClaudeCode, Amp, Gemini, Codex, Opencode, CursorAgent, QwenCode, Copilot, Droid}`（`crates/executors/src/executors/mod.rs:109`）。
- **trait** `StandardCodingAgentExecutor`：`spawn(cwd, prompt, env)`、`spawn_follow_up(cwd, prompt, session_id, reset_to_message_id, env)`、`spawn_review`、`normalize_logs`、`discover_options`（以流的形式返回可选模型/agent）、`get_availability_info`、`get_preset_options`（`mod.rs:222-302`）。
- **接入方式**：Claude 用 `--input-format=stream-json --output-format=stream-json`，`--resume`，`--resume-session-at`（回退到某条消息），`--model`，`--permission-mode`（`claude.rs:170-375`）；Codex 用 **app-server JSON-RPC**（`codex/client.rs`、`jsonrpc.rs`）；Gemini、Qwen、Copilot 用 **ACP**（`executors/acp/`）。
- **profile/variant**：`ExecutorConfig{executor, variant("PLAN"/"ROUTER"…), model_id, agent_id, reasoning_id, permission_policy(Auto|Supervised|Plan)}`，「the single object that flows through API requests, action types… whenever an executor is used」（`profile.rs:120-146`）；`ModelSelectorConfig{providers, models[{id, reasoning_options}], default_model, agents, permissions}`（`model_selector.rs`）。
- **日志规范化**：`NormalizedEntry{timestamp, entry_type: UserMessage|AssistantMessage|ToolUse{tool_name, action_type: FileRead|FileEdit|CommandRun…, status}|SystemMessage|ErrorMessage…, content}`（`logs/mod.rs:73-184`）。
- **「云端」**：vibe-kanban Cloud 只负责 issue/看板同步和 **Remote Access**（通过 relay 配对，在手机上访问主机）；**执行仍然发生在宿主机上**，远程服务器部署要靠 SSH 和隧道。—— `docs/remote-access.mdx`、`README.md:148-161`。

### 5.2 Orchestrator.inc / agent-orchestrator（Go 守护进程）——本地源码 @5cde191
- 端口三件套：`Agent{GetConfigSpec, GetLaunchCommand, GetPromptDeliveryStrategy, GetAgentHooks, GetRestoreCommand, SessionInfo}`，外加可选能力 `AuthStatus`/`ValidateLaunchAuth`/`ResolveBinary`（`backend/internal/ports/agent.go:193+`）；`Runtime{Create, Destroy, GetOutput, IsAlive}`，实现有 tmux/ptyexec/conpty（`ports/outbound.go:82`）；`Workspace{Create, Destroy, Restore, ForceDestroy, StashUncommitted→refs/ao/preserved/<id>, ApplyPreserved, AddExclude}`（`outbound.go:367`）。
- 约 50 个 agent 适配器，**包括 `deepseekharness`**：终端模式用 `dsh --profile headless <task>`，恢复用 `--session-id`；Chat 模式绑定 `dsh --profile acp`，「which is where per-session model and reasoning-effort selection live」，headless 不支持选模型（`adapters/agent/deepseekharness/deepseekharness.go:1-40`）。
- Cloud Agents：「Clone to the cloud… code, worktrees, and agents all live in the cloud」；另有「Self-hosted remote hosts」：在 VM 上装守护进程，用 Cloudflare 隧道配对，「Sessions stay on the machine that started them」（`README.md:142-150`、`docs/self-hosted-remote.md`）。
- 按角色配置 agent 和模型：`{"worker":{"agent":"codex","agentConfig":{"model","effort","permissions"}},"orchestrator":{…},"reviewers":[…]}`（`docs/cloud-project-settings.md`）。

### 5.3 OpenHands（software-agent-sdk）——本地源码 @18f6390
- `BaseWorkspace`（抽象方法：`execute_command`、`file_upload/download`、`git_changes`、`git_diff`、`pause/resume`），工厂方法 `Workspace(working_dir, host=?)` 返回 Local 或 Remote；实现有 `DockerWorkspace`、`DockerDevWorkspace`、`APIRemoteWorkspace`、`OpenHandsCloudWorkspace`、`ApptainerWorkspace`、`AgentSandboxWorkspace`（`openhands-sdk/.../workspace/`、`openhands-workspace/`）。远程模式是在沙箱里跑 `openhands-agent-server`，SDK 通过 HTTP/WS 连接它。**[推断：依据目录结构和 RemoteWorkspace 命名]**
- `ACPAgent`：「delegates to an ACP-compatible subprocess server… (Claude Code, Gemini CLI, etc.)」，一次 `step()` 对应一个远端完整 turn；可配 `acp_command`、`acp_session_mode`（`sdk/agent/acp_agent.py`）。
- Canvas 前端的「launch child conversation」工具支持 `target=local|cloud`、`isolation=worktree|shared`（详见旧报告 `projects-layer-research.md` §4）。

### 5.4 其他
- **Conductor**（Mac）：每个 workspace 是一个 git worktree 加一个分支；每个 chat 标签页固定「一个 harness + 一个模型」；内置 Claude Code、Codex、OpenCode，Cursor 通过 Cursor API 接入；`scripts.setup/run/archive` 写在 TOML 配置里；**不转售模型用量，直接复用本机 CLI 的登录态**。—— https://www.conductor.build/docs/reference/harnesses 、/docs/reference/settings/reference 、/docs/faq （2026-11-08 查阅）
- **Sculptor**（Imbue）：每个 agent 跑在**一个 Docker 容器**里（基于 devcontainer，带镜像缓存）；「Pairing Mode」把容器里的改动双向同步到本地仓库；已开源，支持 Claude Code 和 Pi harness，也能跑任意终端 agent。—— https://imbue.com/blog/sculptor-announce （更新于 2026-04-30）；https://imbue.com/blog/containers ；https://github.com/imbue-ai/sculptor
- **Terragon**：云端后台 agent 编排器（Claude Code/Codex/Gemini/Amp 各跑在自己的沙箱里，产出 PR，`terry` CLI 可以把任务拉回本地）。**2026-02-09 停服**，开源快照在 `terragon-labs/terragon-oss`。—— https://www.terragonlabs.com/ ；https://github.com/terragon-labs/terragon-oss
- **Omnara**：从「本地 agent 的远程控制」转向托管 agent 平台。用 Cloudflare Sandbox SDK 做云端续跑：把仓库 bundle 和 `.claude/`、`.codex/` 会话文件注入沙箱，**实现本地→云端的会话迁移**；支持 12 家 BYO 沙箱提供商（Daytona、E2B、Modal 等）的「machine pools」。—— https://www.omnara.com/blog/sandbox-sync ；https://docs.omnara.com/machines/pools （2026-11-08 查阅）
- **claude-squad / Crystal**：tmux + worktree；执行器就是一个命令字符串（claude-squad），或者 `AbstractCliManager` 子类（Crystal，已废弃）。—— 见旧报告 `projects-layer-research.md` §2–3。
- **怎么显示「哪个 agent、哪个模型跑的」**：Conductor 按 tab 显示 harness 和模型；vibe-kanban 把 `ExecutorConfig` 持久化到每次执行（attempt）上；AO 在 session 上记录 agent，model 由 Chat 路径回填；Cursor Dashboard 显示 agent 用了哪个环境和 Build。**[推断] 共同做法：把 (executor, variant, model, effort, permission, location) 作为一次运行（run）的不可变元数据存下来，而不是存在任务上。**

---

## 6. 云端执行底座（BYO / 自托管）

| 选项 | 能提供什么 | 快照/持久化 | git | 端口 | 成本模型 | 来源 |
|---|---|---|---|---|---|---|
| **E2B** | Firecracker microVM；模板可以由 Dockerfile 构建，start command 在构建时就被快照下来 | pause/resume 保留**内存和文件系统**，可无限期保存；snapshot 一对多 fork；也有仅文件系统模式 | 旧的 git 模块已弃用，改为通过 `commands.run` 执行 git | HTTPS 暴露端口；出站可按 CIDR/主机名控制；密钥库在出站代理处注入 | 0.0504 美元/vCPU-h + 0.0162 美元/GiB-h（按秒）；Hobby 有 100 美元额度、会话 1 小时；Pro 150 美元/月、会话 24 小时；Apache-2.0，可自托管 | https://e2b.dev/docs/sandbox/persistence 、/snapshots ；https://e2b.dev/pricing （2026-11-08 查阅） |
| **Daytona** | 沙箱 SDK 覆盖 fs/git/process/LSP/computer-use；有 GPU、Windows、macOS | `snapshotFilesystem()` 生成镜像；auto-stop 默认 15 分钟，auto-archive 7 天 | **原生 Git API**（clone/commit/push，使用 PAT） | 1–65535 端口的 preview URL（带 token 或签名） | 与 E2B 同价；200 美元免费额度；核心代码已转为闭源开发 | https://www.daytona.io/docs/en/sandboxes 、https://www.daytona.com/docs/git-operations 、/docs/preview ；https://agentgid.com/compare/e2b-vs-daytona （2026-11-03） |
| **Modal Sandboxes** | gVisor 或 VM 运行时；有 GPU | `snapshot_filesystem()`、`snapshot_directory()`（默认保留 30 天）、内存快照（alpha，7 天）、Exit Snapshots | 自己执行 git | `encrypted_ports`、`h2_ports` 隧道 | 约 0.071 美元/vCPU-h + 0.024 美元/GiB-h（大约是 Function 价格的 3 倍）；单次最长 24 小时 | https://modal.com/docs/guide/sandbox-snapshots.md 、/guide/sandbox-networking.md ；https://www.beam.cloud/blog/e2b-pricing-explained （2026-06-16） |
| **Docker / devcontainer（本机或自建主机）** | 隔离依赖；Sculptor 和 Cursor Dockerfile 都走这条路 | 镜像层缓存，可 commit | 自己管 | 端口映射 | 只有自有硬件成本 | https://imbue.com/blog/containers |
| **GitHub Codespaces** | 每个 codespace 一台 VM，加上 devcontainer 容器 | prebuild（GitHub Actions 生成，存储另计） | 原生 | 端口转发（私有/公开） | 2 核 0.18 美元/h 起，存储 0.07 美元/GB-月；闲置默认 30 分钟后停止，最长运行 12 小时 | https://docs.github.com/en/billing/concepts/product-billing/github-codespaces ；https://roost.guide/providers/github-codespaces |
| **SSH 远程主机** | 用户自己的机器或 VM；DSH 已有 `dsh-subprocess-ssh`、`fs-ssh`、`sandbox-ssh` | 主机本身就是持久的 | 原生 | SSH 隧道 | 用户自己的成本 | `work/deepseek-harness/packages/ssh/*/README.md` |

**谁用什么（概念层面）**：
- Cursor：自管的隔离 Ubuntu VM，加 Build 磁盘快照；也可以 self-host worker，跑在 Modal、Daytona、E2B 等平台上（self-hosted.md）。
- Codex Cloud：OpenAI 托管的容器，缓存 12 小时，「Publish 冻结文件系统」。
- OpenHands：Docker 或远程 agent-server 沙箱（Runtime/Workspace 抽象）。
- Omnara：Cloudflare Sandbox，以及 BYO 的 12 家提供商。
- Terragon：每个 agent 一个沙箱容器（细节以 oss 仓库为准）。

---

## 7. 对 Projects 的设计建议

> 前提：沿用架构评审 v2 的结论（自研单写者领域引擎、状态由事实派生、完成前先验证、M0 先打通一条最薄的端到端链路）。下面只讲执行器和环境层。

### 7.1 执行器抽象（Executor）
1. **对内统一说 ACP v1**，不另起协议。DSH 自家 agent 走 `dsh --profile acp`（已支持 new/resume/list/close + `set_config_option{model, reasoning_effort}`）；Gemini、Cursor、OpenCode 走原生 ACP；Claude、Codex 走 `@agentclientprotocol/claude-agent-acp`、`codex-acp`。这样一个 `AcpExecutor` 就能覆盖 90% 的情况。
2. 只在 ACP 不够用的地方保留**原生驱动**作为可选的增强：
   - Claude `stream-json`：拿 `total_cost_usd`、子 agent 树、`--resume-session-at` 回退；
   - Codex `app-server`：拿 `thread/fork`、`turn/interrupt`、rate limits。
   参考 vibe-kanban 的分层：trait 统一，各家实现各自不同。
3. 接口建议（借鉴 vibe-kanban 和 AO）：
   ```ts
   interface Executor {
     id: 'dsh'|'claude'|'codex'|'gemini'|'opencode'|'cursor'|string
     probe(env): Availability & Capabilities   // 二进制存在？已登录？支持 resume/fork/model？
     discoverOptions(env): ModelCatalog          // 来自 ACP configOptions 或原生 list-models
     start(run: RunSpec, ws: WorkspaceHandle): RunHandle   // 返回统一事件流
     followUp(run, prompt) / resume(run) / cancel(run)
     nativeSessionRef(run): {kind, id}           // 用于 teleport/恢复
   }
   ```
4. **统一事件模型**：直接用 ACP 的 session/update 语义（message、thought、tool_call(kind, diff)、plan、usage、permission），外加 `run.state`（参考 v2 的 running/idle/requires_action）。即便底层说的是 v1，也应在适配层**按 v2 的生命周期来建模**，为以后升级到 v2 留出余地。**[推断]**
5. 能力降级矩阵必须显式存在：没有 resume 的执行器（Cursor-ACP、pi）在 follow-up 时只能「新会话 + 摘要注入」；没有审批的执行器（pi）只能放进 `workspace-write` 沙箱里跑。

### 7.2 环境抽象（Environment / Location）
1. **把「执行器」和「位置」做成正交的两个维度**（AO 的 Agent × Runtime × Workspace 三端口就是这样）。`Location = local-worktree | local-docker | ssh:<host> | sandbox:<e2b|daytona|modal> | vendor-cloud:<cursor|codex|claude>`。
2. 由于主流 agent 都不走 ACP 的 fs/terminal 回调，远程执行的正确姿势是 **「把 agent 进程（以及它的 ACP stdio）搬到目标机器上」**：
   - SSH：`ssh host -- dsh --profile acp`，或者 `npx …-acp`，stdio 直接透传；
   - 沙箱：用提供商的 exec 或 PTY 起进程，再桥接 stdio；
   - 也可以复用 DSH 已有的 `dsh-subprocess-ssh` 和 `fs-ssh`。
3. 环境规格借鉴 Cursor 和 Codex，做一个 `.dsh/environment.json`（或复用 devcontainer.json）：`image|dockerfile|snapshot`、`install`（幂等，固化进快照）、`start`、`terminals`、`ports`、`network.allow`、`secrets`（运行时与构建时分开）。
4. 「vendor-cloud」位置（Cursor Cloud API、`codex cloud exec`、`claude --cloud`）作为**黑盒执行器**接入：只能拿到状态、diff、分支或 PR，拿不到逐步事件，在 UI 上要明确标注。Codex 用 `codex cloud diff/apply`，Cursor 用 webhook 加 `autoCreatePR`。
5. 起步顺序：M0 本地 worktree → M1 本机 Docker 或 SSH 主机（零外部依赖，复用 DSH 的 ssh 包）→ M2 一家 BYO 沙箱（E2B 或 Daytona，二选一；需要原生 git API 就选 Daytona，需要内存级暂停就选 E2B）。

### 7.3 模型选择
1. 选择粒度放在**每次运行（run）**上：`RunSpec{executor, model?, effort?, mode/permission, location}`，并把它作为不可变元数据落库，UI 在每个任务卡片上显示「执行器徽标 · 模型 · 位置徽标（本地/SSH/云）」。参考 vibe-kanban 的 `ExecutorConfig` 和 AO 的按角色默认值：项目里按 worker、reviewer、coordinator 分别设默认，任务可以覆盖。
2. 模型目录**动态发现**：ACP 的 `configOptions`（category=model/thought_level）、`cursor agent --list-models`、Cursor `GET /v1/models`、DSH 的 LLM catalog。不要硬编码。不支持选模型的执行器（例如 dsh headless）就把字段灰掉，并注明原因（AO 也是这么处理的）。
3. 提供 best-of-N：同一任务 × 不同的 (executor, model)，每个跑在独立的 worktree 里，再由协调者或评审 agent 比较（Cursor `/best-of-n`、Codex `--attempts`）。

### 7.4 本地↔云端 handoff
1. 用 **git 分支作为交接介质**（所有产品都是这么做的）。
   - 本地→云：自动提交 WIP 到 `projects/<task>` 分支并 push（参考 claude-squad 的 Pause 语义、AO 的 `StashUncommitted→refs/…/preserved`）。在目标位置用同一个执行器 resume 时，如果会话文件能迁移（Omnara 的做法是注入 `.claude/` 和 `.codex/`），就带上原会话；否则就是「新会话 + 交接简报（共享上下文文件 + 任务摘要）」。
   - 云→本地：fetch 分支，在本地新建 worktree 并检出，再用 `--teleport` / `codex apply` / ACP `session/resume` 续接。
2. **[推断]** 会话级的无缝迁移（对话历史跟着走）只对「会话文件落在本地磁盘、格式可读」的执行器可行：Claude、Codex、OpenCode、DSH 可以，Cursor-ACP 的会话是隔离的。所以 MVP 只承诺「代码状态 + 交接简报」的迁移，会话迁移作为按执行器提供的增强能力。
3. 共享上下文（类似 Cursor 的 Shared context）放在项目工作区的 `.dsh/project/`，并随分支同步，或由协调者推送到各个位置，这样任何位置上的 agent 都能读到。

### 7.5 鉴权与凭据
1. **本地位置**：只做探测（`claude auth status`、`codex login status`、`cursor agent status`、DSH credentials store），不读取也不复制 token；未登录时引导用户在终端里登录（ACP terminal auth）。这和 Conductor、AO 的做法一致。
2. **远程位置（SSH、沙箱、云端）**：只接受用户显式提供的 **API Key / BYOK**，通过环境变量在启动 agent 时**内联注入**（Codex 文档明确建议只给那一次调用设置 `CODEX_API_KEY`，不要设成整个 job 的环境变量）；使用密钥库或提供商的 secret 机制；运行时密钥和构建密钥分开。**不要**把 `~/.claude` 或 `~/.codex/auth.json` 的 OAuth 凭据同步到云端。AO 的 self-hosted 文档也写明「does not copy agent or GitHub credentials from your laptop」。
3. Claude 的远程运行用 `--bare` 加 `ANTHROPIC_API_KEY`（bare 模式本来就不读 OAuth）；对 claude-agent-acp 可以加 `--hide-claude-auth`，杜绝走订阅。Codex 的远程运行用 `CODEX_API_KEY`（Codex Cloud 本身需要 ChatGPT 登录，只能作为黑盒执行器、由用户自己授权）。
4. DSH 子进程隔离：沿用 `dsh-subagent-acp` 的做法，「credential-scrubbed parent environment」加独立的 `DSH_HOME`，避免把父进程的凭据泄露给外部 agent。
5. 合规提示要写进 UI：「此执行器使用你本机已登录的账户 / 你提供的 API Key；Projects 不中转订阅。」**[推断]** 这是在 Anthropic 和 OpenAI 现行条款下风险最低的姿态。

---

## 附：本次没能确认的点
- Cursor 协调者具体怎样决定本地还是云端（没有公开规则）；Projects 的定价和并发上限没有找到官方数字。
- 2026-11-12 生效的 Anthropic 使用政策原文（只看到二手引用）。
- E2B、Daytona、Modal 的价格取自第三方比价页（2026-06 至 11 月），E2B 定价页本身只核对了套餐结构。
- OpenHands RemoteWorkspace 与 agent-server 的具体通信细节，只按目录和类名做了推断。
