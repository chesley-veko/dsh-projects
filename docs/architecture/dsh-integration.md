# DSH 宿主集成

> 状态：现行（2026-11-08）。核查版本：`deepseek-harness@fcc0ad46`（DH）、`dsh-superagent-prototype@8c32a9d`（SA）。逐条证据见 [research/dsh-source-verification.md](../research/dsh-source-verification.md)。

## 1. 交付形态

一个 DSH bundle 插件，含客户端与服务端两部分，经 `cordis.patch.yml` 注册。**不修改 DSH 宿主代码**；不 fork dsh-superagent 的域模型，只复用其基础设施代码（见 [ADR-0001](../adr/0001-own-engine.md)）。

## 2. 客户端扩展点（已核实）

| 需求 | 扩展点 | 状态 |
|---|---|---|
| Projects 入口与首页 | `sidebar.panellist` 图标 → keyed 插槽 `main` 注册面板 | 可用。SA 用同样方式注册自己的面板（`SA/src/client/index.tsx:48-58`） |
| 协调者会话行的项目图标、未读与待回答数 | `sidebar.session.row.leading` / `trailing`、`sidebar.workspaces.session.row.action` | 可用 |
| 「加入项目」右键菜单 | `sidebar.workspaces.session.menu.item` | 可用，但标注 **Legacy**（`DH/packages/client/ui-workspace/src/client/contract/slots.ts:166-201`），需跟进迁移 |
| 右栏 Project 面板 | `ctx.sidebarRightTabs.register` | 可用（`DH/packages/client/ui-sidebar-right/src/client/tab-registry.ts:253`） |
| 托盘、胶囊 | `conversation.input.overlay`、`conversation.composer.dock` | 可用（`DH/packages/client/ui-conversation/src/client/apply.ts:468,475`） |
| 打开协调者 / worker 会话 | `ctx.uiWorkspace.openSession` | 可用（`ui-workspace/navigation.ts:45`） |
| 侧栏开合徽标 | `sidebar.toggle.badge` | 可用 |

**不可用 / 不要用**

| 旧方案 | 问题 |
|---|---|
| 在左栏插入独立「项目」区（锚定 `.kB3qhq_regionArea`） | 没有区域插槽；`sidebar.workspaces` 是 single 插槽且被 ui-workspace 占用（`DH/packages/client/ui-sidebar/src/client/contract/slots.ts:58`）。CSS Module 哈希类名随版本变化 |
| 注册 `main.conversation` 承载协调者 | single 插槽，注册即替换整个对话视图（`ui-conversation/apply.ts:337,584`）。协调者用普通会话即可 |
| 客户端调用 `workspaceRegistry.archiveSession` | 服务端服务，客户端拿不到 |

**左栏原生「项目」分组的路线**：短期用 panellist + 首页面板 + 会话行徽标承载；同时向 DSH 上游提议一个 list 型 `sidebar.regions` 插槽。上游接受后再切换为原型中的左栏分组，交互不变。

## 3. 服务端扩展点（已核实）

| 能力 | 用法 | 证据 |
|---|---|---|
| 工具注册 | `agent.ctx.tools.register`，按 preset 分配 | `SA/src/app/sessions.ts:206-215` |
| HTTP | `webServer.register('/projects', …)`，仅本机同源 | `SA/src/app/http.ts:231-237` |
| 会话创建 | `sessionController.create({ cwd })` 可只给 cwd | `DH/packages/api/session-controller/src/commands.ts:120-140` |
| 投递与插话 | `agent.inbox`、`steer()` / `inject()`；SA 的 `AgentDelivery` 实现按 requestId 幂等的 queue / steer / inject | `DH/packages/core/agent/src/runtime-types.ts`；`SA/src/app/delivery.ts:66-85` |
| 事件 | `agent/status`、`agent/inbox/*`、`agent/pre-step`、`session/event` | LoopX Driver 已在用 |
| 仓库说明注入 | `dsh-agent-instructions` 读 `AGENTS.md / CLAUDE.md / *.local.md` | `DH/packages/context/agent-instructions/src/config.ts:12-13` |
| 子代理 | `subagent`、`send_message` 等工具（worker 可用，协调者 preset 不给） | `DH/packages/subagent/*` |

**已知陷阱**

- 不要归档运行中的 worker 会话：`ArchivedSessionGate` 会在每个 `agent/pre-step` 拒绝已归档会话（`DH/packages/api/session-controller/src/archived-session-gate.ts:24-33`），活动中归档还会抛 `WorkspaceActiveSessionError`。
- `workspaceRegistry.create(cwd)` 对每个新路径新建并置顶工作区（`DH/packages/workspace/workspace/src/index.ts:222-244`），是 SA 左栏爆炸的根因。
- DSH 没有内建长期记忆包；`INDEX.md` 注入由本插件负责。
- worker 以操作者 OS 用户运行、无沙箱（SA `docs/003-execution.md`）；环境变量必须白名单。

## 4. 从 dsh-superagent 复用什么

| 复用（代码级） | 不复用 |
|---|---|
| `store.ts` 的 `atomic()` / SAVEPOINT / afterCommit | `Evals` / `Decision` / Ticket 的 1:1 语义 |
| effect 表与退避执行器 | router preset 的「不读代码」提示词规则（改为工具边界） |
| `AgentDelivery` 幂等投递 | 单仓库线程键（改为 `github:<owner>/<repo>#<n>`） |
| `WorkerSlots`（同步预留、人类 +1） | SA 自己的运维面板 |
| Source / Eval / Mandate（仅在 `intake` 包，用于外部事件） | — |

## 5. M0 前必须做的 spike

1. `sessionController.create({ cwd })` 创建的 worker 会话在左栏的呈现；`openSession` 能否打开（SA `navigation.ts:14-22` 要求会话在会话目录中）。
2. 若 (1) 不理想，备选：`workspaceRegistry.create` 后立即 `workspaceRegistry.delete(id)`（只删登记，`index.ts:302-312`）。
3. `INDEX.md` 注入点：首条消息 vs `agent/pre-step`；测量后者的每步开销。
4. 协调者 preset 能否完全移除内置文件 / shell 工具。
