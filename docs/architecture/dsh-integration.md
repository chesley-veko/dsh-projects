# DSH 宿主集成

> 状态：现行（v5，2026-11-09；单包收敛，S1+S2 宿主 UI 接缝补丁合并，执行信任受 ADR-0017/0018 约束）。执行层相关的 DSH 能力详见 [research/dsh-capabilities.md](../research/dsh-capabilities.md)。核查版本：`deepseek-harness@fcc0ad46`（DH，发布 tag `dsh-v0.2.2-rc.1@66491b05`）、`dsh-superagent-prototype@8c32a9d`（SA）。逐条证据见 [research/dsh-source-verification.md](../research/dsh-source-verification.md)。

## 1. 交付形态

单一 DSH bundle 插件包 `dsh-projects`（内部按 `src/core`、`src/store`、`src/executors`、`src/locations`、`src/mcp`、`src/git`、`src/intake`、`src/server`、`src/client` 目录分层），含客户端与服务端两部分，统一一套 `tsdown` 配置（`external: [/^@deepseek-ai\//]`），经 `cordis.patch.yml` 注册。不 fork dsh-superagent 的域模型，只复用其基础设施代码（见 [ADR-0001](../adr/0001-own-engine.md)）；对 DSH 宿主提议一份统一最小上游扩展 PR（合并 S1 与 S2 接缝：`sidebar.regions` 区域插槽 + `SessionOrigin` 的 `'project-worker'` 左栏过滤 + `ui-conversation` 的 `conversation.view` 会话过滤 `when(session)` 与 `activeViewId` 暴露，见 §2）。

## 2. 客户端扩展点（已核实）

| 需求 | 扩展点 | 状态与契约 |
|---|---|---|
| Projects 全局入口与首页 | `sidebar.panellist` 图标 → keyed 插槽 `main` 注册首页面板 | 可用。SA 用同样方式注册自己的面板（`SA/src/client/index.tsx:48-58`）；仅用于全局项目列表首页 |
| 项目概览页与外部执行者运行视图 | `conversation.view`（`id: 'project-overview' \| 'project-run'`）+ `conversation.composer`（chain 插槽） | **不注册为 `main` 面板**：宿主 `ui-sidebar-right/src/client/index.ts:171`、`shell/RightbarRoot.tsx:35` 在 `activePanelId !== null` 时会强制收起右栏。挂在协调者会话的 `conversation.view` 下可保持 `activePanelId === null`、右栏常驻。S2 查明 `dsh-v0.2.2-rc.1` 基线的 `viewTabs()` 无按会话过滤且 `ui-conversation` 不暴露 `activeViewId`；因此将 `conversation.view` 的 `when?: (session) => boolean` 过滤与 `activeViewId` 只读属性并入同一份上游宿主补丁（`ui-conversation` 增改 2 个文件约 15 行），使项目 Tab 仅对协调者会话可见，且底部输入框在 `chat` 视图保持原生 `InputBar`、在 `project-overview` 隐藏、在 `project-run` 接管为该 Run 输入框（[ADR-0003](../adr/0003-host-extension-points.md)、[S2 报告](../spike/reports/S2-coordinator-view.md)） |
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
| 把本地 DSH worker 伪装成 `origin: 'subagent'` | 触发宿主 subagent 围栏：① 默认 `maxDepth=1`（`subagent/subagent/src/index.ts:196`）剥夺 worker 内部调用 `subagent` 的能力；② 父会话不是精确的 live agent 时 `startActivation` 抛 `UNAUTHORIZED`（`subagent/subagent/src/index.ts:275-277`），续接不可用时抛 `subagent/delivery-unavailable`（`subagent/subagent/src/control.ts:85-89`）；③ 协调者重建触发 `drainDescendants` 强杀在跑 worker（`subagent/subagent/src/manager.ts:283`）；④ `packages/client/file-upload/src/index.ts:283-290` 的 `assertOrdinaryAgent` 拒绝向 subagent 上传文件（门控调用 `:237` 的 `store()`） |
| 注册 `main.conversation` 承载协调者 | single 插槽，注册即替换整个对话视图（`ui-conversation/apply.ts:337,584`）。协调者用普通会话即可 |
| 客户端调用 `workspaceRegistry.archiveSession` | 服务端服务，客户端拿不到 |

**左栏原生「项目」分组、worker 隐藏与会话视图门控（统一上游宿主补丁）**：全局入口用 panellist + 首页面板 + 会话行徽标承载；向 DSH 上游提交一份合并的最小补丁 PR：
1. 增加 list 型 `sidebar.regions` 插槽；
2. 在 `SessionOrigin`（`DH/packages/core/session/src/types.ts:122,161`，字面量类型，另有 controller `list.ts:374` 与 client `service.ts:36`、`lineage.ts:34` 同步修改）增加 `'project-worker'`，并在 `DH/packages/client/ui-workspace/src/client/tree.ts:235` 一并过滤（实测 18 个文件、26 行）；
3. 在 `DH/packages/client/ui-conversation`（`contract/slots.ts` 与 `apply.ts:211-222`）为 `conversation.view` 增加可选 `when?: (session) => boolean` 会话过滤，并向 `conversation.composer` / 会话控制器暴露只读 `activeViewId`（2 个文件、约 15 行），消除普通会话出现项目 Tab 与协调者输入框无视图区分的问题。

基线按 S1/S2 报告口径为官方 tag `dsh-v0.2.2-rc.1`（`66491b05`）；S0 锁定的 `fcc0ad46` 是 release 合回 `origin/master` 的合并提交（PR #7873），比该 tag 晚 811 个提交。S0 复核的行号按 `fcc0ad46` 引用；实验运行的是 0.2.2-rc.1 发布构建（tag）。本次引用的文件中，`subagent/subagent/src/index.ts` 与 `control.ts` 在两个提交间有差异，其余一致，完整清单与不可改的普通路由检查点见 [ADR-0003](../adr/0003-host-extension-points.md)。按 [ADR-0018](../adr/0018-worker-visibility-seam.md)，Projects 左栏与中栏视图 UI 验收受该上游补丁合入与 DSH Web 控制台 401 修复门控；Engine、SQLite 状态推导与无 UI 本地闭环先行放行。不得把 row decoration 当作 hide/list-filter API，也不得用 subagent origin 或 archive 活动会话绕过。

## 3. 服务端扩展点（已核实）

| 能力 | 用法 | 证据 |
|---|---|---|
| 工具注册与协调者围栏 | `agent.ctx.tools.register` 注册工具；协调者围栏计划用 `presetCtx.tools.restrict({ deny })` + `presetCtx.tools.guard()` 屏蔽宿主平面全局工具（如 `working_directory`） | `DH/packages/core/tools/src/index.ts:162-190,384-396`；`restrict` 要求 agent-scoped ctx（S3 实测：preset 挂载路径可用，前提是插件与宿主共用同一份 `dsh-scope`）；`deny` 中未知全局工具名抛 `unknown global tool` 并回滚（S3 步骤 2）；`DH/packages/bundle/base/cordis.patch.yml:164` |
| HTTP | `webServer.register('/projects', …)`，仅本机同源（同时提供 `/projects/mcp` 供本机 `projects-mcp` 薄代理转发回单写者 `Engine`） | `SA/src/app/http.ts:231-237` |
| 本地 worker 会话创建与初始模型 | 用事务内预生成的 `sessionId` 调 `ctx.agents.create({ sessionId, signal, meta: { cwd, agentPreset }, agentOptions: { provider, model }, setup })`（`agentOptions.model` 见 `DH/packages/core/agent/src/runtime-types.ts:35`，`ModelSelection.model` 见 `types.ts:83`；S4 实测：不传 `provider/model` 时新会话无默认模型，驱动须显式解析并传入） | `DH/packages/experimental/webhook/src/session.ts:110-118`（流程 `:93-155`；注意该路径在 `:107` 先调 `workspaceRegistry.create`，照抄会重现左栏工作区爆炸，本插件**不调用**） |
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
- 本地子进程**会**继承 `HOME` 与 `SSH_AUTH_SOCK`，不要依赖环境清洗阻断读取：`scrubbedParentEnv()` 丢弃匹配凭据模式的变量名与 `DSH_*` 前缀，但保留 `HOME`，且全仓不处理 `SSH_AUTH_SOCK`（S7 实测：Landlock 下共享宿主真实 `/tmp`，可 glob `/tmp/ssh-*/agent.*` 找到存活套接字）。本机 CLI 登录态仅在用户显式选择 `credential=cli-login` 且 DSH sandbox 能力通过实测后按次开放。黑名单清洗可作为基础，但不能代替隔离 HOME、空 SSH agent、网络策略和仓库信任确认（详见 ADR-0017）。

### 3.1 S2–S4 实测修订（2026-11-08 初跑，2026-11-09 修复复跑，tag `dsh-v0.2.2-rc.1`）

- **S2（部分完成，已并入统一上游补丁）**：S2 查明宿主 `viewTabs()`（`ui-conversation/apply.ts:211-222`）无按会话过滤，且 `ui-conversation` 不暴露 `activeViewId`。v5 架构将 `conversation.view` 的 `when(session)` 过滤与 `activeViewId` 暴露并入 S1 的同一份上游宿主补丁（见 §2 与 [ADR-0003](../adr/0003-host-extension-points.md)），不再保留普通会话显示项目 Tab 的占位妥协。构建与 API 层已通过（消息 POST 返回 `{ok:true}`，协调者以默认模型回复）；UI 观察待 DSH Web 401 修复与上游补丁合入后补做（[S2 报告](../spike/reports/S2-coordinator-view.md)）。
- **S3（通过（有条件））**：围栏在 preset 挂载路径可用。协调者可见工具 33 → 2（`spike_projects_probe`、`spike_decoy_shell`）；被屏蔽工具不在 schemas（不可见即不可调）；decoy 被 guard 拦截且无副作用；未知全局工具名与 scoped 名都抛 `unknown global tool` 并回滚；`compactNow` 压缩 62 节点后 INDEX section 逐字节保留（299 B），`cacheReadTokens` 9600→20096（[S3 报告](../spike/reports/S3-coordinator-fence.md)）。
- **S3 单包与外部化约束**：`@deepseek-ai/dsh-scope` 必须与宿主共用同一模块实例。为此 v5 取消 9 子包拆分，收敛为单一插件包 `dsh-projects`，统一 `tsdown` 配置 `external: [/^@deepseek-ai\//]`；部署 profile 不得重复安装与宿主同名的 `@deepseek-ai/*` 包（开发调试环境若出现 hoisted 副本，软链回宿主副本）。
- **S3 preset 组合**：preset 不继承标准工具集；需要 INDEX 与压缩的协调者 preset 必须自带 compaction 组，否则 `compactNow` 返回 503。INDEX 用 `systemPrompt.section`，不用 message/context。
- **S4（有条件通过）**：`ctx.agents.create` 只校验 `cwd` 为绝对路径，不建目录、不校验存在性，Engine 必须在 `checkout.prepare` 阶段自行校验并创建目录。`AgentRegistry.create` 不套全局默认模型，入口须把 `ctx.agentDefaultModel.currentSelection()` 合入 `agentOptions`；compaction 用 `agentPresets.serviceFor(agent, 'compaction')`（引擎在 preset 组内 isolate）。检查 5 的 Ticket 对照、6a/6b 与 7 未复验（[S4 报告](../spike/reports/S4-native-worker.md)）。

## 4. 从 dsh-superagent 复用什么

| 复用（代码级） | 不复用 |
|---|---|
| `store.ts` 的 `atomic()` / SAVEPOINT / afterCommit | `Evals` / `Decision` / Ticket 的 1:1 语义 |
| effect 表与退避执行器（升级支持 `lane_key` 与 `state`） | router preset 的「不读代码」提示词规则（改为 `tools.restrict` + `tools.guard`） |
| `AgentDelivery` 幂等投递 | 单仓库线程键（改为 `github:<owner>/<repo>#<n>`） |
| `WorkerSlots`（同步预留、人类 +1、唤醒/验证优先） | SA 自己的运维面板 |
| Source / Eval / Mandate（仅在 `src/intake` 目录，用于外部事件） | — |

## 5. M0 前必须做的 spike

已移至 [spike/README.md](../spike/README.md)，共 S0–S7 八个工作包。其中 S1（worker 列表过滤接缝）为 M0 阻断项：`sidebar.session.row.*` 只算装饰，不能作为隐藏方案（[ADR-0018](../adr/0018-worker-visibility-seam.md)）。

## 6. 执行层可复用的 DSH 件（第三轮核查）

| 能力 | DSH 件 | 用法 / 限制 |
|---|---|---|
| 本地起 DSH worker 并指定 preset、模型、权限 | `ctx.agents.create({ sessionId, signal, meta: { cwd, agentPreset }, agentOptions: { provider, model }, setup })` | 预生成 `sessionId` 防孤儿会话；`model/selection` 事件设初始模型且不污染全局默认。S4 实测：`cwd` 只透传、不建目录、不校验存在性（指向不存在目录仍创建成功），Engine 须在 `checkout.prepare` 阶段自行校验并创建目录；未传 `provider/model` 时新会话无默认模型 |
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
