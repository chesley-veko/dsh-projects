# DSH 宿主集成

> 状态：现行（v4，2026-11-08；worker list/filter 与执行信任受 ADR-0017/0018 约束）。执行层相关的 DSH 能力详见 [research/dsh-capabilities.md](../research/dsh-capabilities.md)。核查版本：`deepseek-harness@fcc0ad46`（DH）、`dsh-superagent-prototype@8c32a9d`（SA）。逐条证据见 [research/dsh-source-verification.md](../research/dsh-source-verification.md)。

## 1. 交付形态

一个 DSH bundle 插件，含客户端与服务端两部分，经 `cordis.patch.yml` 注册。不 fork dsh-superagent 的域模型，只复用其基础设施代码（见 [ADR-0001](../adr/0001-own-engine.md)）；对 DSH 宿主仅提议一处最小上游扩展 PR（`sidebar.regions` 区域插槽 + `SessionOrigin` 的 `'project-worker'` 左栏过滤，见 §2）。

## 2. 客户端扩展点（已核实）

| 需求 | 扩展点 | 状态与契约 |
|---|---|---|
| Projects 全局入口与首页 | `sidebar.panellist` 图标 → keyed 插槽 `main` 注册首页面板 | 可用。SA 用同样方式注册自己的面板（`SA/src/client/index.tsx:48-58`）；仅用于全局项目列表首页 |
| 项目概览页与外部执行者运行视图 | `conversation.view`（`id: 'project-overview' \| 'project-run'`）+ `conversation.composer`（chain 插槽） | **不注册为 `main` 面板**：宿主 `ui-sidebar-right/src/client/index.ts:171`、`shell/RightbarRoot.tsx:35` 在 `activePanelId !== null` 时会强制收起右栏。挂在协调者会话的 `conversation.view` 下可保持 `activePanelId === null`、右栏常驻；同时用 `conversation.composer` 在概览页隐藏输入框、在外部运行视图接管为该 Run 的输入框（避免与宿主常驻 `composerSeat` 叠出双输入框） |
| 协调者会话行的项目图标、未读与待回答数 | `sidebar.session.row.leading` / `trailing`、`sidebar.workspaces.session.row.action` | 可用 |
| 「加入项目」右键菜单 | `sidebar.workspaces.session.menu.item` | 可用，但标注 **Legacy**（`DH/packages/client/ui-workspace/src/client/contract/slots.ts:166-201`），需跟进迁移 |
| 右栏 Project 面板 | `ctx.sidebarRightTabs.register` + 客户端 root 级 `ProjectUiStore` | 可用（`DH/packages/client/ui-sidebar-right/src/client/tab-registry.ts:253`）。宿主 `rightbar.session` 按 `sessionId` 隔离（`ui-sidebar-right/src/client/index.ts:160-181`），客户端通过 root 级 `ProjectUiStore` 按当前 `sessionId`（协调者或同项目本地 DSH worker）反查 `projectId`，跨会话共享同一项目的看板与详情状态 |
| 托盘、胶囊、派发默认 Chip | `conversation.input.overlay`、`conversation.composer.dock`、`conversation.input.left` | 可用（`DH/packages/client/ui-conversation/src/client/apply.ts:420-475`） |
| 打开协调者 / worker 会话 | `ctx.uiWorkspace.openSession` | 可用（`ui-workspace/navigation.ts:45`） |
| 侧栏开合徽标 | `sidebar.toggle.badge` | 可用 |

**不可用 / 不要用**

| 旧方案 | 问题 |
|---|---|
| 在左栏插入独立「项目」区（锚定 `.kB3qhq_regionArea`） | 没有区域插槽；`sidebar.workspaces` 是 single 插槽且被 ui-workspace 占用（`DH/packages/client/ui-sidebar/src/client/contract/slots.ts:58`）。CSS Module 哈希类名随版本变化 |
| 把项目概览页或外部执行者运行视图注册进 `main` 插槽 | 激活任何 `main` 面板都会令 `activePanelId !== null`，触发 `ui-sidebar-right/src/client/index.ts:171`、`shell/RightbarRoot.tsx:35` 立即关闭右栏 |
| 占用 `conversation.view` 的 `'trajectory'` ID | 已被宿主 `ui-trajectory` 占用（`DH/packages/client/ui-trajectory/src/client/index.ts:80-82`），必须用 `'project-overview'` 与 `'project-run'` |
| 把本地 DSH worker 伪装成 `origin: 'subagent'` | 触发宿主 subagent 围栏：① 默认 `maxDepth=1`（`subagent/subagent/src/index.ts:196`）剥夺 worker 内部调用 `subagent` 的能力；② 父会话未加载时 `subagents.prompt` 抛 `subagent/parent-unavailable`（`subagent/src/index.ts:459`）；③ 协调者重建触发 `drainDescendants` 强杀在跑 worker（`subagent/subagent/src/manager.ts:283`）；④ `file-upload/src/index.ts:223` 拒绝向 subagent 上传文件 |
| 注册 `main.conversation` 承载协调者 | single 插槽，注册即替换整个对话视图（`ui-conversation/apply.ts:337,584`）。协调者用普通会话即可 |
| 客户端调用 `workspaceRegistry.archiveSession` | 服务端服务，客户端拿不到 |

**左栏原生「项目」分组与 worker 隐藏路线**：全局入口用 panellist + 首页面板 + 会话行徽标承载；向 DSH 上游提交最小补丁 PR：① 增加 list 型 `sidebar.regions` 插槽；② 在 `SessionOrigin`（`DH/packages/core/session/src/types.ts:122,161`，字面量类型，另有 controller `list.ts:374` 与 client `service.ts:36`、`lineage.ts:34` 同步修改）增加 `'project-worker'`，并在 `DH/packages/client/ui-workspace/src/client/tree.ts:235` 一并过滤。按 [ADR-0018](../adr/0018-worker-visibility-seam.md)，M0 前必须在锁定 DSH 版本上验证真实列表过滤接缝；若插件前缀或 row slot 不能过滤，M0 阻断。不得把 row decoration 当作 hide/list-filter API，也不得用 subagent origin 或 archive 活动会话绕过。

## 3. 服务端扩展点（已核实）

| 能力 | 用法 | 证据 |
|---|---|---|
| 工具注册与协调者围栏 | `agent.ctx.tools.register` 注册工具；协调者 preset 调用 `presetCtx.tools.restrict({ deny })` + `presetCtx.tools.guard()` 屏蔽宿主平面全局工具（如 `working_directory`） | `DH/packages/core/tools/src/index.ts:162-190,384-396`；`restrict` 只能在 agent 作用域 ctx 上调用，`deny` 中出现未知全局工具名会直接抛错`；`DH/packages/bundle/base/cordis.patch.yml:164` |
| HTTP | `webServer.register('/projects', …)`，仅本机同源（同时提供 `/projects/mcp` 供本机 `projects-mcp` 薄代理转发回单写者 `Engine`） | `SA/src/app/http.ts:231-237` |
| 本地 worker 会话创建与初始模型 | 用事务内预生成的 `sessionId` 调 `ctx.agents.create({ sessionId, meta: { cwd, agentPreset }, agentOptions: { model }, setup })`（初始模型由 `agentOptions` 提供，见 `DH/packages/core/agent/src/types.ts:92`） | `DH/packages/experimental/webhook/src/session.ts:109-118`（注意该路径在 `:107` 先调 `workspaceRegistry.create`，照抄会重现左栏工作区爆炸，本插件**不调用**） |
| 投递与插话 | `agent.inbox`、`steer()` / `inject()`；SA 的 `AgentDelivery` 实现按 requestId 幂等的 queue / steer / inject | `DH/packages/core/agent/src/runtime-types.ts`；`SA/src/app/delivery.ts:66-85` |
| 事件与系统提示词 | `agent/status`、`agent/inbox/*`、`agent/pre-step`、`session/event`；`presetCtx.systemPrompt.section` 常驻注入 `INDEX.md` | `DH/packages/core/system-prompt/src/index.ts:484` |
| 仓库说明注入 | `dsh-agent-instructions` 读 `AGENTS.md / CLAUDE.md / *.local.md` | `DH/packages/context/agent-instructions/src/config.ts:12-13` |
| 子代理 | `subagent`、`send_message` 等工具（worker 保持 `delegationDepth=0` 可正常使用；协调者 preset 屏蔽） | `DH/packages/subagent/*` |

**已知陷阱**

- **不要对 worker 调用 `sessionController.selectModel`**：`DH/packages/api/session-controller/src/commands.ts:180` 在切模型时会顺带执行 `this.ctx.agentDefaultModel.saveSelection(selected)`，直接篡改用户的全局默认模型。必须改用 `agent.session.append('model/selection', selection)`。
- **新建项目的协调者会话不能停留在 `blank` 态**：`DH/packages/client/ui-conversation/src/client/skeleton/DefaultConversationViews.tsx:33` 在 `session.blank` 时直接返回 `null` 并隐藏顶部视图切换栏（`ConversationSession.tsx:70,141`）。建项目时必须写入初始引导事件使 `session.blank = false`。
- **不要把高频变化的 `project_status` 放进 `systemPrompt.section`**：每次修改系统提示词都会击穿整个长会话的 LLM Prefix KV Cache；`systemPrompt.section` 只放低频变动的 `INDEX.md`，`project_status` 保持工具调用或 `agent/pre-step` 尾部增量注入。
- 不要归档运行中的 worker 会话：`ArchivedSessionGate` 会在每个 `agent/pre-step` 拒绝已归档会话（`DH/packages/api/session-controller/src/archived-session-gate.ts:24-33`），活动中归档还会抛 `WorkspaceActiveSessionError`。
- `workspaceRegistry.create(cwd)` 对每个新路径新建并置顶工作区（`DH/packages/workspace/workspace/src/index.ts:222-244`），是 SA 左栏爆炸的根因；而只调 `sessionController.create({ cwd })` 会把所有不属于已登记工作区的会话塞进左栏「未分组」（`tree.ts:358-364`），需由 spike ① 的插件侧方案压住。
- 本地子进程默认不能继承 `HOME`、`SSH_AUTH_SOCK` 或其他仓库路径；本机 CLI 登录态仅在用户显式选择 `credential=cli-login` 且 DSH sandbox 能力通过实测后按次开放。黑名单清洗可作为基础，但不能代替隔离 HOME、空 SSH agent、网络策略和仓库信任确认（详见 ADR-0017）。

## 4. 从 dsh-superagent 复用什么

| 复用（代码级） | 不复用 |
|---|---|
| `store.ts` 的 `atomic()` / SAVEPOINT / afterCommit | `Evals` / `Decision` / Ticket 的 1:1 语义 |
| effect 表与退避执行器（升级支持 `lane_key` 与 `state`） | router preset 的「不读代码」提示词规则（改为 `tools.restrict` + `tools.guard`） |
| `AgentDelivery` 幂等投递 | 单仓库线程键（改为 `github:<owner>/<repo>#<n>`） |
| `WorkerSlots`（同步预留、人类 +1、唤醒/验证优先） | SA 自己的运维面板 |
| Source / Eval / Mandate（仅在 `intake` 包，用于外部事件） | — |

## 5. M0 前必须做的 spike

1. 验证**不改宿主**时压住本地 worker 会话：插件侧固定会话 id 前缀 `proj-worker-`，用 `sidebar.session.row.*` / 会话列表过滤 slot 隐藏或折叠到协调者行下；评估 `openSession`、子代理与文件上传是否受影响。上游 `origin` 扩展仅作增强（`origin` 目前是字面量类型 `'subagent'`，见 `core/session/src/types.ts:122,161`、`api/session-controller/src/list.ts:374`、`client/sessions/service.ts:36`、`lineage.ts:34`，需改动 core 会话头与 controller / client 多处，不是一行补丁）。
2. 验证协调者会话挂载 `conversation.view`（`project-overview` / `project-run`）+ `conversation.composer` 接管时，右栏 `sidebarRightTabs` 保持常驻且底部无双输入框冲突。
3. 验证 `presetCtx.tools.restrict({ deny })` + `presetCtx.tools.guard()` 完全屏蔽宿主平面 `working_directory` 与全局 MCP 工具。
4. 验证 `presetCtx.systemPrompt.section` 注入 `INDEX.md` 在触发 `context-compaction` 后仍完整保留且 Prefix KV Cache 稳定命中。

## 6. 执行层可复用的 DSH 件（第三轮核查）

| 能力 | DSH 件 | 用法 / 限制 |
|---|---|---|
| 本地起 DSH worker 并指定 preset、模型、权限 | `ctx.agents.create({ sessionId, meta: { cwd, agentPreset }, agentOptions: { model }, setup })` | 预生成 `sessionId` 防孤儿会话；`model/selection` 事件设初始模型且不污染全局默认 |
| 运行中切模型 | `session-controller/src/commands.ts:166`、`core/agent/src/model-selection.ts:157` | 记为 `run_event` |
| 远端 DSH 执行者 | `packages/acp/acp`（`dsh --profile acp`：new / list / resume / close / `set_config_option{model, reasoning_effort}`） | 不支持 `session/load`、modes、plans、client fs / terminal |
| 外部 agent 配置格式 | `packages/subagent/subagent-acp`（`command / args / env / permission`） | 只借配置格式与 `subprocess-local` 凭据清洗；运行用自建 ACP client |
| 模型目录 | `llm-pi-ai`（40+ provider、自定义 OpenAI / Anthropic 网关） | DSH 执行者的目录来源 |
| worktree | `experimental/worktree`（create / restore，`.agents/worktrees`） | 无清理、无 fetch、不带未提交改动；自建回收与关联 |
| PR | `forge`、`forge-github`、`client-ui-forge` | PR 绑定、状态轮询、diff 视图；只支持 GitHub CLI |
| 凭据 | `credentials` | API Key 存取；按次注入 |
| 权限 | `sandbox-policy`、`permission-presets`、`user-approval`、`auto-review` | DSH 原生运行直接用；外部执行者映射到 RunSpec.permission |
| 远程观察 | Host 远程访问、Liveshare | 看 / 接管 DSH 运行 |

**不用于项目任务**：`subagent-acp`、`subagent-claude-code`、`subagent-codex`、`subagent-oar`（一次性、丢过程、自动应答权限、模型固定）；SSH provider 族（部署级替换，不能按任务选）。
