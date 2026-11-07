# 设计文档核查：dsh-superagent-prototype × deepseek-harness

核查版本：dsh-superagent-prototype `8c32a9d`（2026-10-31），deepseek-harness `fcc0ad46`（2026-11-04）。两者均与远端 HEAD 一致。下文路径：`SA/` = dsh-superagent-prototype，`DH/` = deepseek-harness。

## 1. 主 Session 里人直接打字 → 无 Trigger → 无法建 Ticket
**结论：基本属实（结论对，引用行号有偏差）**
- `orchestrator_route` 的每一项都必须带 `trigger_id`（`SA/src/app/tools/main.ts:47-56`，工具定义在 `:125-130`）；accept 走 `host.engine.decide(item.trigger_id, …)`（`:97`）。
- `Evals.decide` 第一步就是 `this.repo.triggers.get(triggerId)`，查不到则抛 `UserError('unknownTrigger')`（`SA/src/core/evals.ts:131-133`）。设计文档写“~L132”没错。
- Trigger 只能经 `Engine.receive → Intake.receive` 写入（`SA/src/core/engine.ts:48`，`SA/src/core/intake.ts:19-30`）。调用方只有 Source 插件，通过 `SourceContext.receive`（`SA/src/app/source-context.ts:46`、`SA/src/sources/github.ts:232,241,268`、`SA/src/sources/feishu-loops.ts:27`）。主 Session 的工具里没有任何一个能新建 Trigger：`orchestrator_eval` / `eval_decide` / `trigger_requeue` / `reply` 都以已有的 `trigger_id` 为输入（`main.ts:186-240`）。
- **行号更正：**`SA/src/app/sessions.ts:114` 是一个通用的 `session/event` 监听，只用来做模型预算重试的健康统计，并不是 `'user/message'` 路由。真正区分人类消息的位置有两处。一是 `SA/src/app/delivery.ts:76-81`：superagent 自己投递的消息都打上 `source.kind='dsh-superagent'`。二是 `SA/src/executor/dsh.ts:488-491`：只为 worker 会话里人打的字（`source.kind==='user'`）记个时间戳，不产生 Trigger。主 Session 里人打的字，对编排器来说就是一轮普通的 user turn，没有任何域内入口。
- 补充：文档承认人可以直接在 Executor Session 里接着干活（`SA/docs/003-execution.md:128`），但没给主 Session 提供“手动下单”的入口。
- **可选修法（推断）：**Source 是开放的插件点。`ctx.orchestrator: SourceHost`（`SA/src/app/runtime.ts:50-51`，`SA/src/sources/host.ts:23-27`）可以注册一个“DSH UI/手动”Source kind，由它生成 Trigger。这样就不用绕开 Eval/Mandate，比直接在工具里建 Ticket 更符合域模型。

## 2. 1 Trigger = 1 Ticket
**结论：部分正确**
- 文档规则属实：`SA/docs/001-domain.md:28` 写的是 “Accepting a Trigger twice creates one Ticket”。
- 代码也属实：`evals.ts:136-146` 用 `this.accepted(threadKey)` 按 triggerId 查到之前的 accept Decision 后直接 `return earlier`；工具层在 `main.ts:101-103` 返回 “Already accepted as …”。
- **需要更正的一点：**ticketId 是 `key('ticket', evaluation.id)`（`evals.ts:311`），键是 **Eval**，不是 Trigger。一个 Eval 可以批量持有多个 Trigger（`evals.ts:107-111`），所以更准确的说法是“1 Eval（批）= 至多 1 Ticket；一个 Trigger 至多属于一个被 accept 的 Ticket”。direct Eval 的 id 里含 `trigger.id + kind + at`（`evals.ts:277`）。另外 `attach` 允许把其他 Trigger 挂到已有 Ticket 上（`main.ts:106-108`）。
- **提议的 `(triggerId, taskKey)` 幂等键：**方向可行，但只改一处不够。需要一起改的有：
  - `evals.ts:137` 的去重查找；
  - `evals.ts:311` 的 id 派生；
  - `Decision.ticketId` 是单值（`SA/src/core/model.ts` 中 Decision 结构，约 L203），Trigger 的 disposition 也只有一个 `decisionId`（`model.ts:46`）；
  - `record()` 的 Decision id 是 `key('decision', evaluation.id)`（`evals.ts:329`），同一个 Eval 第二次 accept 会撞 id；
  - `001-domain.md:28` 的规则文本。
  这是域模型层面的改动，不是一行补丁。

## 3. 每个 Ticket 的 worktree 都会在左侧栏多出一个顶层 workspace
**现象：属实。提议的修法：不成立**
- `SA/src/app/sessions.ts:141-145` 在会话不存在时调用 `ctx.workspaceRegistry.create(cwd)`，再 `sessionController.create({workspaceId})`。worker 的 cwd 是每个 Ticket 自己的目录（`SA/src/executor/dsh.ts:96-110,441`）。
- `DH/packages/workspace/workspace/src/index.ts:222-244,510-560`：同一个规范路径会复用，不同路径就新建 workspace，并且 **prepend** 到注册表顺序最前。于是每个 Ticket 都会多出一个顶层分组。编排器自己也用 `machine.stateDir` 建了一个（`SA/src/app/runtime.ts:210`）。
- **`archiveSession(workerSessionId)` 修不了，原因有三：**
  1. 归档只把会话放进全局 archive 集合，“never touches workspace accounting”（`index.ts:339-345`）。而侧栏分组除了 archived-only 过滤之外 **every group shows**（`DH/packages/client/ui-workspace/src/client/tree.ts:335-350,415-416`），所以空的 workspace 分组仍然会显示。
  2. `ArchivedSessionGate` 在 `agent/pre-step` 拒绝已归档会话的每一步（`DH/packages/api/session-controller/src/archived-session-gate.ts:24-33`），worker 会被直接卡死。
  3. 没有 `stopActivity` 时，会话只要还在活动就抛 `WorkspaceActiveSessionError`（`index.ts:365-375`）。
- **可行的替代（推断，未实测）：**
  - (a) 不调用 `workspaceRegistry.create`，改用 `sessionController.create({cwd})`。它支持只给 cwd（`DH/packages/api/session-controller/src/commands.ts:120-140`），这样会话会落进单一的“未分组”组（`tree.ts:351-357`）。
  - (b) 让 worker 挂在一个固定的 superagent workspace 下，但这个 workspace 的 path 必须就是会话 cwd，所以与 per-ticket 目录冲突。
  - (c) 建完之后 `workspaceRegistry.delete(id)`：只删登记，保留目录和日志（`index.ts:302-312`），效果等同于 (a)。
  - 注意：面板跳转依赖会话目录里列有该会话（`SA/src/navigation.ts:14-22`）。

## 4. 客户端 / 服务端插件 API 是否存在
**结论：大部分存在，一处是 legacy，一处不存在**

| 标识 | 结论 | 证据 |
|---|---|---|
| `ctx.slots.register` / `ctx.slots.inject` | 存在 | `SA/src/client/index.tsx:53-57` |
| `sidebar.workspaces.session.menu.item` | 存在，但标注为 **Legacy**（渲染在内置 Archive 之前，list/root） | `DH/packages/client/ui-workspace/src/client/contract/slots.ts:166-201` |
| `conversation.input.overlay` | 存在（list/session） | `DH/packages/client/ui-conversation/src/client/apply.ts:468`；ui-commands 用法见 `DH/packages/client/ui-commands/src/client/index.ts:64` |
| `conversation.composer.dock` | 存在（list/session） | `ui-conversation/apply.ts:475`；`DH/packages/client/ui-chat/src/client/apply.ts:339-344` |
| `main.conversation` | 存在，但是 **single**/session-maybe，ui-conversation 自己占着；注册它等于替换整个对话视图 | `ui-conversation/apply.ts:337,584` |
| `ctx.sidebarRightTabs.register` | 存在 | `DH/packages/client/ui-sidebar-right/src/client/tab-registry.ts:253`；用例 `DH/packages/client/ui-deliverables/src/client/index.ts:89` |
| `ctx.uiWorkspace.openSession` | 存在 | `DH/packages/client/ui-workspace/src/client/navigation.ts:45,293`；superagent 在 `SA/src/client/index.tsx:38` 使用 |
| `ctx.workspaceRegistry.archiveSession` | 存在，但属于**服务端** Cordis 服务，客户端拿不到 `ctx.workspaceRegistry` | `DH/packages/workspace/workspace/src/index.ts:365` |
| 新增左侧栏“区域” | **没有通用的区域插槽** | 见下 |

关于左侧栏：`sidebar.workspaces` 是 single 插槽，由 ui-workspace 占用（`DH/packages/client/ui-sidebar/src/client/contract/slots.ts:58`，`DH/packages/client/ui-sidebar/src/client/index.ts:101`）。插件能扩展的位置只有这些：
- `sidebar.panellist`：全局面板图标，点开对应一个 `main` 面板，`:47`
- `sidebar.panellist.actions`
- `sidebar.footer.action`：`:75`
- `sidebar.toggle.badge`：`:31`
- `sidebar.brand.*`
- 会话行的 `sidebar.session.row.leading` / `trailing` / `hover`，以及 `sidebar.workspaces.session.row.action`：`ui-workspace/contract/slots.ts:149,158,163,212`

如果要做一个“新区域”，只能替换整个 `sidebar.workspaces`，或者用 panellist 图标打开一个 main 面板。

**superagent 自己怎么注册：**
- 客户端：`main` 是 keyed 插槽（`DH/packages/client/ui-layout/src/client/index.ts:75`），superagent 用 key `dsh-superagent` 注册；另外在 `sidebar.panellist` 注册锤子图标（order 10），在 `plugins.row.config` 注册配置页（`SA/src/client/index.tsx:48-58`）。
- 服务端：`inject = ['agents','sessionController','sessionPersistence','workspaceRegistry','permissionPresets','tools','systemPrompt','skills','webServer','llm','subprocess']`（`SA/src/index.ts:8`）。
  - 工具：按 agent 用 `agent.ctx.tools.register` 注册（`SA/src/app/sessions.ts:206-215`）。
  - HTTP：`ctx.webServer.register({kind:'prefix', path:'/orchestrator'})`，只允许 loopback 加同源访问（`SA/src/app/http.ts:231-237`）。
  - 监听的事件：`agent/created|disposed|status|error`、`session/event`、`agent/inbox/claimed`、`agent-preset/selected`（`sessions.ts:110-135`，`dsh.ts:488`）。
  - 对外服务：`orchestrator`（SourceHost）。
  - 预设：通过 `cordis.patch.yml` 定义 worker/router 两个 agent preset。

## 5. 状态存储与并发模型
**结论：均已核实**
- **存储：**使用 Node 内置 `node:sqlite` 的 `DatabaseSync`，没有第三方 ORM（`SA/src/app/store.ts:2,60`）。WAL 模式加 `synchronous=FULL`（`:64`）。文件是 `<stateDir>/orchestrator.sqlite`，用 proper-lockfile 加目录锁（`SA/src/app/runtime.ts:93-98`）。
  - 表（`store.ts:64-83`）：`kv`、`trigger`、`disposition`、`thread`、`ticket`、`decision`、`outbox`、`trigger_thread`、`effect`（kind, key, seq, generation, attempts, error, due, since）。大部分是 JSON value 列。schema 版本 11 及迁移见 `SA/src/app/migration.ts`。
- **事务：**`atomic()` 用嵌套 SAVEPOINT 实现，`afterCommit` 只在最外层提交后才执行（`store.ts:134-160`）。
- **Engine：**它是 Trigger / Thread / Decision / Ticket / Assignment 的唯一写者；所有方法都是同步的，每个命令一个事务（`SA/docs/007-architecture.md:46-50`，`SA/src/core/engine.ts:19-24,48,100`）。`evaluateDue` 按每个 Eval 或 Ticket 各开一个事务（`engine.ts:77-80`）。Passes 一次只跑一个，每 2 秒跑一次（`007:40`）。
- **Effects / Outbox：**事务内 `enqueue`，提交后才执行，每个 (kind, key) 一行，失败按指数退避，`Later` 表示推迟且不计入失败次数（`007:164-181`）。
  - 各 kind 的并发与退避：
    - `reply`：并发 1，5s 起翻倍到 300s；
    - `launch`：占用空闲 worker 槽，瞬时失败重试 3 次；
    - `delivery`：并发 4，2s 起到 60s；
    - `relay` / `notice`：并发 1，保持顺序。
  - Outbox 是 receipts 的唯一写者，同一会话中较早的消息失败未满 3 次时，后面的消息排队等待（`007:41,159`；`SA/src/app/outbox.ts`）。
- **WorkerSlots：**`SA/src/executor/dsh.ts:166-199`。
  - `maxWorkers` 默认 3，范围 1–16（`SA/src/policy.ts:93`，`SA/src/limits.ts:6`）。
  - 槽位同步预留，防止两个启动同时抢到最后一个槽。
  - 人的跟进消息（`by==='person'`）可以超出上限多用 1 个槽。
  - 唤醒优先于启动：`launches()` 会扣掉 wake 预留。
  - 满了就抛 `Later`。

## 6. DSH 内建能力
- **Project：**没找到一等的 “project” 实体（grep `interface Project` / `ctx.projects` 无结果）。最接近的概念是 **Workspace**，即一个目录登记（`DH/packages/workspace/workspace/src/index.ts`）。**标注：不能完全排除**有别名实现。
- **Subagent：**有。`DH/packages/subagent/*`（spawn / fork / acp / codex / claude-code 等），工具 `subagent`、`send_message`、`list_agents`、`interrupt_agent`（`DH/packages/subagent/tool-subagent-control/src/index.ts:44,120`，`list-agents.ts:46`）。还有 Team 模式：共享任务板 `ctx.agentTeams`（`DH/packages/team/README.md`）。
  - superagent 的 worker 有这些工具（`SA/src/app/sessions.ts:61-62`，`SA/cordis.patch.yml:102-108`），router 预设则明确不带 subagent（`cordis.patch.yml:122`）。
- **记忆文件：**AGENTS.md 有内建注入。`@deepseek-ai/dsh-agent-instructions` 读取 `AGENTS.md` / `CLAUDE.md` 以及对应的 `*.local.md`（`DH/packages/context/agent-instructions/src/config.ts:12-13`）。基线内容在首次请求前进入上下文；fs 工具碰到嵌套目录或文件变更时，通过 inbox 推送（`DH/packages/context/agent-instructions/src/index.ts:1-10`）。superagent 的 worker 预设已启用它（`cordis.patch.yml:32-33`）。
  - 长期“记忆”**没有内建包**，只有 MCP 示例（`DH/apps/cli/config/examples/mcp-memory/*.cordis.yml`）。
- **Inbox / steer：**有。
  - `Agent.inbox.nextTurn` / `nextStep`，以及 `steer()` / `inject()`（`DH/packages/core/agent/src/runtime-types.ts:77-79,199,260,270`）。`followup()` 是 superagent 实际调用的方法（`SA/src/app/delivery.ts:79-81`），**未在 runtime-types 中定位到行号**。
  - 事件 `agent/inbox/claimed`。
  - superagent 的 `AgentDelivery` 在这些接口之上实现了按 requestId 幂等的投递，分 queue / steer / inject 三种模式（`delivery.ts:66-85`）。协调器可以直接复用。
