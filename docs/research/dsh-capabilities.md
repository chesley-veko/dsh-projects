# DSH 现有能力审计：为 "Projects" 插件找可复用件

- 审计对象：`work/deepseek-harness`，commit `fcc0ad46`（release 0.2.2-rc.1，合并 PR #7873）
- 方法：阅读包 README、`docs/subsystems/*`、源码及 `.agents/notes`（implemented / archived / proposed）。下文路径均相对仓库根 `deepseek-harness/`，`file:line` 为本地 clone 中的行号。
- 上游 GitHub：没有查。本地 clone 已经回答了全部问题，唯一"缺"的 Gemini 适配也能用通用 ACP provider 覆盖，见 Q1。

---

## 0. 结论先行

1. **ACP 两端都有，但都只做"自动化"用途。** `packages/acp/acp` 是 ACP **server**：把 DSH 暴露给别的程序驱动。`packages/subagent/subagent-acp` 是 ACP **client**：spawn 任意 ACP agent 当一次性子代理。只要命令能起 stdio ACP agent（如 `claude-code-acp`、`codex-acp`、`gemini --experimental-acp`），填进 `command/args` 就能跑。限制有四条：
   - 每次 run 都是新进程，只跑一个任务，不能续聊；
   - 只收最终 `agent_message_chunk` 文本，子代理的工具调用和 plan 不上浮到 UI；
   - 权限请求按配置自动 allow/reject，人不参与；
   - 不能按调用选模型（不支持 `agentOptions`）。
   另外还有原生 Claude Code（官方 Agent SDK）、Codex（app-server 协议）两个一等 provider，以及实验性 OAR provider（codex/claude/grok/kimi/opencode/pi/antigravity）。**仓库里没有 Gemini 专用集成。**
2. **远程执行只有"整套部署换成 SSH 世界"一种形态，没有"每个 session 选执行目标"。**
   - SSH provider 族在部署层替换 `ctx.fs` / `ctx.subprocess` / `ctx.sandbox`。Harness、模型调用、session 存储都留在本机，且只适用于 headless 或自定义 profile；Web 工作区视图不认远程路径。
   - E2B 云沙箱已移除。sandbox 包只做同机进程约束（bwrap/Landlock/Seatbelt/Windows ACL），不提供容器或 microVM。
   - **server/client 分离已经有了**：Host 是 webserver + `/api` RPC，可以绑非 loopback 地址加 TLS，也可以挂反代 `--public-url`。浏览器可以远程 attach，Liveshare 能把 session 共享给别人驱动。但"本地桌面客户端 attach 远端 DSH"不是现成产品流。
3. **编排原语很丰富：** subagent（spawn/fork/外部）、Team 任务板、Goal + round driver、Workflow 脚本、Jobs、Schedule、Webhook→新建 session、Todo、Plan mode。
   - **模型选择：** 进程内 spawn 子代理和 DSH-SDK 子代理可以按调用选 provider/model/effort（`modelSelection`）。Codex、Claude Code、ACP 子代理的模型只能在 profile 行里固定。
   - **最接近 Projects 协调器的现成件**有三个：`webhook/src/session.ts` 里"用指定 preset + agentOptions + 权限预设，在 Workspace 中创建 root session 并投递 prompt"的完整代码路径；`schedule`（定时投递到新的或已有 session）；Team 任务板（CAS 认领）。
   - Team 明确不做 worktree 隔离（成员共享一个 checkout）。
4. **模型 / provider：**
   - `ctx.llm` 统一服务，有两类 adapter。一是 DeepSeek 官方（API key 或账号登录）。二是 `llm-pi-ai`：40+ catalog provider（anthropic/openai/google/vertex/bedrock/azure/openrouter/groq/xai/mistral/…），也可以手写 OpenAI 兼容或 Anthropic 网关。
   - **会话中途可以切模型**：`sessionController.selectModel`，在下一个 model step 生效，并自动插入 "model changed" 提示。ACP 端用 `session/set_config_option`。
5. **Git worktree 有实验性支持：**
   - `experimental/worktree` + `create_worktree` 工具：从固定的本地 commit 建新分支和 worktree（`.agents/worktrees/<name>`），并把 session 的工作目录切进去；也支持 restore。
   - `client-ui-forge` 在"新建 Session"界面提供 "New worktree" 选项，还带 PR 绑定、状态轮询和 diff 视图。这和 Cursor 的"本地任务 = worktree + PR"高度重合。
   - session 的 cwd 由 `dsh-working-directory` 管：每个 session 记一个可变的有效目录，原始项目目录不变。
6. **Projects 应该复用的底座：**
   - 账号与密钥：`credentials`（凭据引用 / 存储）
   - 外部工具：`mcp-manager`
   - 权限：`sandbox-policy`（每个 session 的 read-only / workspace-write / full）、`permission-presets`、`user-approval`、实验性 `auto-review`
   - 持久化：`storage-domain`（schema 校验的持久记录，适合存 Project/Task）、`workspace`（项目目录分组）
   - 外部集成：`forge`（PR）、`webhook`
   - 远程访问与扩展：Remote API（`@Remote` + `remote-access` RBAC）、Client 插件 slot（侧栏 tab、session 行装饰等，forge 面板就是范例）
   - **真正缺、需要自建的**：
     - Project/Task 数据模型与协调器 UI；
     - 按任务选 LOCAL/CLOUD 执行目标（含远程 worktree 和同步）；
     - 外部代理的流式过程可视化（工具调用、diff）与人工审批透传；
     - 外部代理按任务动态选模型；
     - 外部代理续聊和 resume；
     - 云端沙箱 provider。

---

## Q1. `packages/acp`：server、client 还是两者都有？

### 1.1 DSH 作为 ACP server（`packages/acp/acp`）
- **定位：** 只做自动化，不做 UI。设计记录见 `.agents/notes/implemented/simplification/2026-07-23-acp-automation-only-protocol.md:11-19`：原来 ACP bridge 已经变成第二套交互 UI，后来砍成标准 ACP v1 自动化面。2026-06-18 的富渲染 terminal card 方案已作废（`.agents/notes/archived/feature/2026-06-18-acp-terminal-and-tool-rendering.md:8`）。
- **支持的方法：** `initialize/authenticate/session.new/list/resume/close/setConfigOption/prompt/cancel`，见 `packages/acp/acp/src/index.ts:379-390`。下行更新有 `agent_thought_chunk`、`agent_message_chunk`、`tool_call`、`tool_call_update`（`src/updates.ts:26,36,54,80`）。模型和 reasoning_effort 切换见 `src/session.ts:182-197`。
- **启动：** `pnpm dsh --profile acp`。config 里固定默认 `provider/model`（README "Minimal configuration" 段）。
- **不支持：** `session/load`、删除、fork、additionalDirectories、modes、commands、plans、terminals、client fs、elicitation（README Protocol contract 段末尾和 Known Limitations）。

### 1.2 DSH 作为 ACP client：驱动外部 ACP 代理（`packages/subagent/subagent-acp`）
- **注册：** 以 provider 身份注册到 `ctx.subagents`，见 `src/index.ts:128`（`ctx.subagents.registerProvider(new AcpProvider(...))`）。
- **配置字段：** `command`（必填）、`args`、`permission: allow|reject`（默认 reject）、`env`、`disposeEofGraceMs`、`disposeGraceMs`，见 `src/index.ts:29-61`。
- **注册外部代理的格式**（profile patch / `cordis.patch.yml` 行），示例见 `packages/subagent/subagent-acp/README.md` 的 Configuration 段：
  ```yaml
  - insert:
    - id: subagent-gemini
      name: '@deepseek-ai/dsh-subagent-acp'
      config: { providerName: gemini, command: gemini, args: ['--experimental-acp'], permission: allow, env: { GEMINI_API_KEY: ... } }
    - id: tool-subagent-gemini
      name: '@deepseek-ai/dsh-tool-subagent'
      config: { provider: gemini, toolName: subagent_gemini, maxDepth: provider-managed }
  ```
  上面的 Gemini 写法是按 README 的通用格式**推断**的。仓库里没有 Gemini、`claude-code-acp`、`codex-acp` 的预设或测试；`git grep` 只在一篇已归档笔记里搜到 codex-acp，用作渲染参考。
- **运行流程**（`src/run.ts`）：
  - 用 `ctx.subprocess.spawn` 起子进程（`src/index.ts:112`，`run.ts:347-354`）；
  - 发 `initialize`，`clientCapabilities: {}`，不提供 fs 和 terminal（`run.ts:485-490`）；
  - `session.new({cwd, mcpServers: []})`（`run.ts:492`）；
  - 只把 `agent_message_chunk` 折叠进最终答案，其他更新丢弃（`run.ts:420-428`）；
  - `requestPermission` 按策略自动回答（`run.ts:430-452`）。
- **session 怎么表示：**
  - 外部子代理**不创建本地 child Session**。父 session 只记录外部任务身份和终态结果。
  - 父模型先拿到 `started subagent <name>`，完成时收到 completion notice。
  - 中间消息和工具流不进父 session，也不渲染，见 `packages/subagent/subagent-acp/README.md:161`。
  - 进程内 spawn/fork 子代理则有真正的 child Session，Web 可以打开子会话（`.agents/notes/archived/feature/2026-07-27-web-subagent-conversations.md`）。
- **限制**（`packages/subagent/subagent-acp/README.md:159-162` 及 Dev Note）：
  - 每次 run 一个新进程，没有进程池；
  - 只支持本地工作目录（"remote workspace mapping is not designed"）；
  - 不支持 `agentPreset`、`agentOptions`、`outputSchema`、depth；
  - 只收文本；
  - 权限自动应答；
  - Dev Note 把"可续聊的 ACP 子代理"列为未来工作。
  - `tool-subagent` 明确写了 ACP/Codex/Claude Code 挂 `modelSelection` 会失败（`packages/subagent/tool-subagent/README.md:77`），也不接受 follow-up（同文件 `:62`）。

### 1.3 其他外部编码代理 provider
| 包 | 驱动方式 | 模型 | 权限 | 限制 |
|---|---|---|---|---|
| `subagent/subagent-claude-code` | 官方 Agent SDK 0.3.263，内置平台 payload，不回退到宿主 `claude` | profile 固定 `model`，省略则用原生设置 | `permissionMode`: dontAsk/acceptEdits/auto/plan/bypassPermissions | 一次一问、无 resume、"Static instance selection"（README:169-170） |
| `subagent/subagent-codex` | 官方 app-server JSON-RPC（`@openai/codex@0.153.4`），ephemeral thread | 同上 | never / approve-for-me（auto_review + workspace-write）/ danger | 同上（README:167-168） |
| `experimental/subagent-oar` | 内嵌 `@botiverse/oar@0.67.0`，运行时注册表含 antigravity/claude/codex/grok/kimi/opencode/pi | `model`/`effort` 每实例固定 | `launchArgs` 透传原生参数 | 只验证过 codex/claude；不走 DSH subprocess seam；每实例一个 runtime，由 `subagent_oar` 工具按调用选 runtime |
| `subagent/subagent-dsh-sdk` | 起完整 DSH 子进程（JSON-RPC SDK） | **支持 `agentOptions`**，可按调用选路由 | 由子 profile 决定 | 只支持本地子进程（README:171-174） |

另外，设计记录 `.agents/notes/archived/feature/2026-08-04-claude-code-and-codex-subagent-backends.md:18-25` 说明这些 provider 可以经 `ctx.jobs` 放到后台运行。

---

## Q2. 远程、沙箱执行与 client/server 拆分

### 2.1 SSH（`packages/ssh/*`）
- **能力：** 在**一台** POSIX SSH 主机上提供 fs、subprocess、terminal 和 sandbox；Harness 本身仍在本地（`packages/ssh/README.md:12`）。由 `ssh`（连接和 helper 校验）、`fs-ssh`、`subprocess-ssh`、`sandbox-ssh`、`ssh-helper-runtime`（单文件 helper，含 Node 和 PTC worker）组成。
- **配置**（`docs/subsystems/ssh.md` Connection API）：`host`（OpenSSH 别名）、`launch`、`helper`、`helperHash`、`workspace`、`leaseMs` 等，属于**部署级插件配置**。注释写的是 "no model argument selects these values"。
- **作用范围：** "Use it in headless or custom profiles"（README:12）。"Web workspace views that assume host filesystem access need separate integration"（`docs/subsystems/ssh.md:27`）。
- **断线语义：** 不重连、不重放（`.agents/notes/implemented/architecture/2026-09-11-posix-ssh-runtime.md:29,63-65`）。
- **执行目标怎么选：** `ctx.fs` 和 `ctx.subprocess` 合起来定义"一个执行世界"（`.agents/notes/implemented/architecture/2026-07-28-portable-execution-world-consumers.md:17`），在 composition（profile）级挂载。**整个进程只有一个执行世界，不能按 session 或 workspace 选。** 同一笔记 `:35` 明确了分工：远端拥有文件和进程；宿主拥有 agent loop、session、模型传输和子代理编排。
- **曾被否决的方案：** "Move the complete Harness to the remote host" 被视为另一种部署模型，没有做（`posix-ssh-runtime.md:47`，`portable-execution-world-consumers.md:55`）。
- **SSH 世界里的子代理：** ACP 和 Claude Code provider 走 `ctx.subprocess.spawn`（`subagent-acp/src/index.ts:112`，`subagent-claude-code/src/index.ts:106`）。理论上挂 subprocess-ssh 时 ACP 子进程会在远端启动，但 README 明说只支持本地工作区，**也没有这方面的测试或证据**。

### 2.2 沙箱（`packages/sandbox/*`）
- 只做同机约束，模式有 `read-only`、`workspace-write`、`danger-full-access`。"containers, microVMs, and remote executors replace whole capabilities instead of registering here"（`packages/sandbox/README.md:12`）。
- `sandbox-policy` 可以按 session 切模式，而且重启后保留（`packages/sandbox/sandbox-policy/README.md:12,28`）。
- **云沙箱：** E2B provider 已移除（`.agents/notes/implemented/simplification/2026-09-11-remove-e2b-providers.md:17`）。重新引入的条件见同文件 `:41-45`。**仓库里没有 docker、microVM 或云 provider。**

### 2.3 terminal / subprocess / host
- `subprocess` 是进程 seam，有 `local` 和 `ssh` 两个实现；`terminal-bash` 在 `spawnTerminal()` 之上提供持久 PTY。
- **client/server 拆分：**
  - `host/webserver` 可以绑具体网卡地址加 TLS（`packages/host/webserver/README.md` "Minimal configuration / Serving HTTPS"）；
  - `--public-url` 加 `--trusted-host` 支持反代发布（`.agents/notes/archived/feature/2026-09-07-public-web-deployments.md:14-16`）；
  - 浏览器 token 认证见 `.agents/notes/implemented/architecture/2026-08-24-browser-token-authentication.md`；
  - Peer/principal 和方法级 RBAC（`@deepseek-ai/dsh-api-remote-access`）见 `.agents/notes/implemented/architecture/2026-10-12-peer-principal-and-remote-access.md:24-44`；
  - Liveshare 经 Relay 把 session 共享给他人只读或可写驱动（`.agents/notes/implemented/feature/2026-09-13-liveshare-protocol-and-owner-surfaces.md`）。
  - 也就是说，**把 DSH Host 跑在云主机、浏览器远程 attach 是可行的**。Desktop 是 Electron 包了一层 Web、加本地运行时（`2026-09-10-desktop-web-wrapper.md`）。没找到"Desktop 连接远端 Host"的现成产品流程，结论为 not found。

---

## Q3. 多代理与编排原语

| 原语 | 包 | 作用 | Projects 可复用点 |
|---|---|---|---|
| Subagent seam | `subagent/subagent`（`ctx.subagents`，`SubagentManager` 在 `src/manager.ts:139`，provider 接口在 `src/types.ts:321`） | provider 注册表、activation、可续聊子代理、目录 catalog | 把"任务执行器"抽象成 provider 的现成接口（本地 DSH / 外部代理） |
| `tool-subagent` | 模型侧 `subagent` 工具 | 后台启动并自动回传结果，每个实例可以设 `agentPreset`、`allowedAgentPresets`、`modelSelection`、`modelDiscovery`、`maxDepth`（默认 Host 设置 `1`，README:54） | 协调器 agent 派发任务 |
| `tool-subagent-control` | `send_message`、`interrupt_agent`、`list_agents`、`wait_agent` | 全树通信（`2026-10-16-tree-wide-agent-communication.md`） | 任务追问和中断（只限本地子代理） |
| Team | `team/agent-team` + `tool-agent-team` | 每个 root 树一个持久任务板，CAS 认领；"Members share one checkout"，"no worktree, remote member, merge, or filesystem lock"（`packages/team/agent-team/README.md:12,196`） | 任务板数据模型可参考，但 Team 绑定在单棵子代理树上，不是跨 session 的 Project |
| Goal | `goal/*` | 每个 session 一个持久目标，`goal-round-driver` 空闲时自动续跑多轮 | 让单个任务 session 自驱到完成 |
| Workflow | `workflow/*` | JS 脚本里用 `agent()`、`parallel()`、`pipeline()` 扇出；**前台阻塞、不落盘、不能 resume**（`packages/workflow/workflow/README.md:32,126-129`） | 批量扇出，但不适合长期 Project |
| Jobs | `jobs/*` | session 内后台作业，完成时通知 | 外部代理一次性任务放后台 |
| Schedule | `schedule/*` | RFC5545 定时，投递到已有 session、复用的新 session 或每次新建 session | 定时任务 |
| Webhook | `experimental/webhook` | 外部事件触发后在 Web Workspace 新建 root Session | **见下面的代码路径** |
| Todo / Plan | `todo/tool-todo`，`plan/plan-mode` | session 内清单、计划审批 | 任务内规划 |
| Forge | `experimental/forge*`、`client-ui-forge` | PR 绑定、状态轮询、diff，新建 Session 时可选 worktree | 本地任务交付到 PR |

**模型选择：**
- 进程内 spawn 子代理可以选不同 preset（`agentPreset`，只限 in-process spawn，见 `tool-subagent/README.md` "Selecting a child preset"）。
- 进程内子代理可以选不同 provider/model/effort，条件是 `modelSelection: true` 且 provider 支持 `agentOptions`；spawn、fork 和 DSH-SDK 支持（`packages/subagent/subagent/src/types.ts:170-177,338`，`tool-subagent/README.md:77`）。
- 可选路由受 session 记录的白名单约束。

**外部 ACP 代理当子代理：** 可以，见 Q1.2，有上面列的限制。

**创建 root session 的现成代码**（Projects 协调器最该抄的）：`packages/experimental/webhook/src/session.ts:93-155`（创建调用 `:110-118`）。流程是：
1. `agentPresets.resolve/acquireScope`
2. `workspaceRegistry.create(path)`
3. `ctx.agents.create({ sessionId, signal, meta: { cwd, agentPreset }, agentOptions, setup })`（`agentOptions.model` 见 `core/agent/src/runtime-types.ts:35`，`ModelSelection.model` 见 `core/agent/src/types.ts:83`）
4. `workspace.attachSession`
5. `permissionPresets.set`
6. `sessionTitle.rename`
7. `agent.followup(createUserMessage(...))`

GUI 侧对应 `sessionController.create({workspaceId|cwd, agentPreset})`（`packages/api/session-controller/src/types.ts:268-277`）。

**提案中的相关设计：**
- 事件触发的自动化任务（`.agents/notes/proposed/feature/2026-10-29-event-triggered-automation-tasks.md:9-18`），和"后台任务 + 通知卡片"重合；
- Task Surface（`proposed/feature/2026-08-04-task-surface.md`）；
- 侧会话 merge-back（`proposed/feature/2026-07-08-interactive-side-sessions.md`）。

---

## Q4. 模型与 provider 配置

- **服务层：** `ctx.llm`（`packages/llm/llm`）。adapter 有三个：
  - `llm-deepseek-api-key`、`llm-deepseek-account`：DeepSeek 官方；
  - `llm-pi-ai`：多 provider，依赖 `@earendil-works/pi-ai ^1.3.0`；
  - 配套有 `llm-retry` 和 `token-meter`。
- **pi-ai 内置 provider**（`packages/llm/llm-pi-ai/src/provider-data.generated.ts` 的顶层 key）：amazon-bedrock、ant-ling、anthropic、azure、baseten、cerebras、cloudflare-ai-gateway、cloudflare-workers-ai、deepseek、fireworks、github-copilot、google、google-vertex、groq、huggingface、kimi-coding、meta、minimax(-cn)、mistral、moonshotai(-cn)、nvidia、openai、openai-codex、opencode(-go)、openrouter、qwen-token-plan(-cn/-individual)、radius、together、typesafe、vercel-ai-gateway、xai、xiaomi(+token-plan 变体)、zai、zai-coding-cn。
- **自定义网关：** 只允许三种 wire 协议：`openai-completions`、`openai-responses`、`anthropic-messages`（`src/provider.ts:47-51`）。
- **配置方式：** 在 `providers` 字典里定义路由；`apiKeyEnv` 是凭据引用，每次请求时解析；支持 OAuth 和交互式 key 登录，存在 `llm-pi-ai/<id>`；运行时改配置立即生效（llm-pi-ai README:28-38,97-99,113-115）。
- **每个 session 选模型：** `sessionController.selectModel` 调用 `agent.model.select(selected)`（`packages/api/session-controller/src/commands.ts:166-185`）。
- **会话中途切模型：** 可以。下一个 model step 生效，`installModelSelection` 会插入 `[model changed: …]` 提示（`packages/core/agent/src/model-selection.ts:149-170`；`.agents/notes/archived/feature/2026-09-07-model-switch-notice.md:14`）。ACP 端用 `set_config_option`，从下一步开始生效，已经准备好的那一步保持原路由。
- **子代理选模型：** 见 Q3。外部产品代理只能用 profile 里固定的 `model`。
- **Preset：** 用 Cordis YAML 声明，`agent-preset-registry` 管理版本，session 记录 preset id，子代理沿用父代理的版本（`.agents/notes/implemented/architecture/2026-09-18-declarative-agent-presets.md:13-19`）。

---

## Q5. workspace、session、worktree

- **`packages/workspace/workspace`：** 有序、持久的"项目目录 + 其中的 sessions"分组，供侧栏使用；模型看不到（README Summary）。这就是 GUI 里的 "Workspace"，概念上可以挂 Project。
- **session 的 cwd：**
  - `dsh-working-directory` 给每个 session 维护一个记日志的有效目录，原始项目目录存在不可变的 header 里，目录丢失时恢复到原始项目；
  - 已有的进程和终端保持各自的目录；
  - 子代理继承父代理当前目录，或用显式 `cwd` 覆盖（`.agents/notes/implemented/architecture/2026-09-13-session-working-directory.md:13-19`；`subagent/src/manager.ts:489` `resolveDirectory`）。
  - 模型侧工具是 `working_directory({cd?})`。
- **git worktree（实验性）：**
  - `experimental/worktree`：`WorktreeService.create` 执行 `git worktree add --no-checkout -b <branch> -- <path> <baseCommit>`，然后 `workingDirectory.set` 切过去（`src/index.ts:101-125,176-198`）；
  - `restore` 用于重建被删掉的 worktree（`src/index.ts:210-255`）；
  - 默认池目录是 `.agents/worktrees`（`src/index.ts:65`）；
  - 不 fetch、不复制未提交改动、不装依赖、不自动清理（`packages/experimental/worktree/README.md:87-90`）。
  - 模型工具：`create_worktree({name?, from?})`（`packages/experimental/tool-worktree/src/index.ts:18-22`）。
  - 设计记录：`.agents/notes/implemented/feature/2026-09-13-explicit-worktree-creation.md:13-33`。这篇明确拒绝了"子代理自动隔离"，也不维护 worktree 与任务的关联库。
- **`client-ui-forge`（forge bundle）：**
  - "New Session" 界面有 New worktree 选项和基础分支选择器；
  - 有创建进度卡片、worktree 被删后的恢复入口、session 行上的分支和 PR 状态图标、Changes diff 视图（`packages/experimental/client-ui-forge/README.md:12,28-40`）。
  - **这几乎就是"本地任务"的 UX 原型。**

---

## Q6. 其他值得复用的件

- **credentials：** 配置里只写 key 名；本机私有存储，存储值优先于环境变量；轮换后下一次请求生效；`authorization` 处理 OAuth 等需要人参与的流程（`packages/credentials/README.md` Summary；`credentials/credentials/README.md:12`）。外部代理的 API key 必须经 provider `env` 显式注入，因为父进程环境里像凭据的变量会被清掉（各 subagent README）。
- **MCP：** `mcp-client`、`mcp-manager`（按设置运行一组 MCP server，运行时可编辑）、`mcp-resources`。
- **权限：**
  - `interaction/permission-presets`（sandbox 和 approval 一起选）、`user-approval`、`tool-ask-user`、`user-questions`；
  - 实验性 `auto-review` 由模型审查每个工具调用，headless 下也可用（`.agents/notes/implemented/feature/2026-10-18-headless-auto-review.md`）；
  - `guard/*` 包含 `repeat-tool-reminder` 和 `timeout-policy`。
- **存储：** `storage-domain` 提供 schema 校验的类型化记录和变更通知；后端可选 `storage-json` 或 `storage-sqlite`；还有 session-persistence（JSONL）。
- **Remote API 和 UI 扩展：**
  - `@Remote` 方法加 typert 协议，示例见 `packages/api/session-controller/src/index.ts:281-630`；
  - 文档 `docs/cookbook/adding-a-remote-api.md`、`docs/cookbook/extension-cookbook.md`；
  - Client 插件 slot：侧栏 tab、全局主面板、session 行菜单、`conversation.hero.options` 等（forge 面板是完整范例）；
  - 插件市场和 bundle 机制：`boot/plugin-manager`、`.agents/notes/implemented/feature/2026-10-02-plugin-market-discover.md`。
- **SDK：** `packages/sdk` 和 Python SDK，通过 JSON-RPC 驱动完整 DSH runtime。适合"云端任务 runner"那一端用。
- **会话分享：** Liveshare 支持只读或可写的 viewer 层级，可以用于"把云端任务给人看或接管"。

---

## 能力映射表：Projects 需要的能力 → DSH 现成 / 部分 / 缺失

| Projects 需要的能力 | 状态 | DSH 对应件 / 证据 | 备注 |
|---|---|---|---|
| 协调器 session 派发多个任务 | **部分** | `tool-subagent` + `ctx.subagents`；`webhook/src/session.ts:93-155` 的建 root session 流程；`sessionController.create` | 子代理受父 session 生命周期和深度约束；跨 session 的 Project 实体要自建 |
| Project / Task 数据模型与持久化 | **缺失（有底座）** | `storage-domain`、`workspace`、Team 任务板（参考） | 自建 schema |
| 任务板、认领、依赖 | **部分** | `team/agent-team`（CAS 认领，限单棵树、共享 checkout） | 可借鉴，难以直接复用 |
| 本地 worktree 隔离 | **现成（实验性）** | `experimental/worktree`、`create_worktree`、forge 的 New worktree 选项 | 不会在派发子代理时自动创建；没有清理和合并策略 |
| 任务交付到 PR 与状态跟踪 | **现成（实验性）** | `forge`、`forge-github`、`forge-session`、`client-ui-forge` | 只支持 GitHub CLI |
| 由 DSH 自身 agent 执行任务 | **现成** | spawn 子代理或独立 root session、preset、goal round driver | — |
| 由 Claude Code / Codex 执行 | **现成（一次性）** | `subagent-claude-code`、`subagent-codex`、`subagent-oar` | 不能续聊或 resume；只回传最终文本；无人工审批 |
| 由任意 ACP 代理（Gemini CLI 等）执行 | **部分** | `subagent-acp`（填 command/args） | 没有 Gemini 预设或测试；同上限制；不接 ACP terminal/fs |
| 外部代理过程可视化（工具调用、diff、plan） | **缺失** | `subagent-acp/src/run.ts:420-428` 丢弃了非文本更新 | 需要把 ACP `session/update` 投影成 DSH child session 或自定义视图 |
| 外部代理权限请求转人工审批 | **缺失** | 全部是自动应答（`run.ts:430-452`；Claude/Codex README） | 可以接 `user-approval` |
| 按任务选模型（DSH agent） | **现成** | `modelSelection`/`agentOptions`、`selectModel`、`ctx.agents.create({ sessionId, signal, meta: { cwd, agentPreset }, agentOptions, setup })`（完整签名与行号见 Q3 创建流程） | — |
| 按任务选模型（外部代理） | **部分** | profile 行固定 `model`；OAR 每个实例固定 | 需要动态起 provider 实例或改 provider |
| 会话中途切模型 | **现成** | `session-controller/src/commands.ts:166`，`model-selection.ts:157` | — |
| 多 provider 模型目录 | **现成** | `llm-pi-ai`（40+ provider + 自定义网关） | — |
| 每个任务的 cwd | **现成** | `dsh-working-directory`，`SubagentStartRequest.cwd` | — |
| 每个任务的沙箱 / 权限模式 | **现成** | `sandbox-policy`（每个 session 的模式）、`permission-presets`、`auto-review` | — |
| CLOUD：任务跑在远端机器 | **部分** | SSH provider 族（部署级、headless、Web 视图不认远程路径） | 不能按任务或 session 选目标；没有重连；需要自建"每个任务一个远端 DSH" |
| CLOUD：容器、microVM、云沙箱 | **缺失** | E2B 已移除；sandbox 只做同机约束 | 需要新 provider（满足 fs/subprocess 世界契约）或远端整机 DSH |
| 远端 DSH 跑任务、本地观察 | **部分** | Host webserver（非 loopback + TLS）、SDK、`subagent-dsh-sdk`（只支持本地进程）、Liveshare | 可以组合出"云端跑完整 DSH，Projects 用 SDK 或 Remote 连接"；没有现成编排 |
| 后台运行与完成通知 | **现成** | `jobs`、子代理 completion notice、Schedule | — |
| 定时或事件触发任务 | **部分** | `schedule`（时间）、`webhook`（GitHub）、事件触发自动化（仅提案） | — |
| 凭据（各家 API key） | **现成** | `credentials`、provider `env` 注入 | — |
| MCP 工具共享 | **现成** | `mcp-manager` | 外部代理用的是各自原生的 MCP 配置 |
| Projects 的 UI 面板和 API | **部分（有扩展点）** | Client slot、`@Remote`、`remote-access` RBAC、forge 面板范例 | 面板本身要自建 |
| 批量扇出脚本 | **现成** | `workflow`（前台、不持久化） | 不适合长期运行 |
