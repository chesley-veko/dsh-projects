# 运行时设计

> 状态：现行（v4，2026-11-08，采纳 ADR-0013–0018）。名词定义见 [domain-model.md](domain-model.md)；执行者、模型、位置的细节见 [execution.md](execution.md)。

## 1. Engine：单写者与先存后做

- `Engine` 是所有域对象的唯一写者，独占宿主机 `<dataDir>/projects.sqlite`（用 `proper-lockfile` 加进程锁，防止多实例并发打开）。命令同步执行，一个命令一个事务（`node:sqlite` + WAL + `synchronous=FULL`、嵌套 SAVEPOINT 的 `atomic()`）。`synchronous=FULL` 保持到 operation receipt 对账能力经过故障测试；写法沿用 dsh-superagent `src/app/store.ts`。
- 命令只做三件事：校验不变量、改表、入队 effect。副作用在**事务提交后**由 effect runner 执行；每个对外副作用持久化稳定 `operation_id` 和明确 receipt。
- `effect` 表携带 `lane_key` 与持久状态 `queued | dispatching | awaiting_receipt | succeeded | retryable | unknown | failed`：runner 认领时先在事务内写入 `dispatching`，同一 `lane_key` 下同一时刻最多一个未决副作用。慢操作和同 Attempt 跨类型操作不得并发冲突。

| effect | `lane_key`（串行域） | 全局并发上限 | 失败处理 |
|---|---|---|---|
| `checkout.prepare`（建 worktree / 远端检出 / install） | `repo:<project>/<repo_alias>@<location>`（与 `attempt:<id>` 双锁） | 每位置每仓库 1 | 退避 2s → 60s；3 次失败转 Question |
| `run.launch`（起执行者会话） | `attempt:<id>` | 占 WorkerSlot（按位置分别计数） | 瞬时失败重试 3 次 |
| `checkout.handoff`（WIP 提交、push、目标位置检出） | `attempt:<id>` | 每 Attempt 1 | 失败保留源 Checkout 并转 Question |
| `run.deliver`（投递消息） | `run:<id>`（且在所属 `attempt:<id>` 无 handoff/reclaim 时执行） | 4；同会话保序 | 持久化 operation id；确认成功才结束；未知结果冻结并转人工对账 |
| `validate`（跑验证命令） | `attempt:<id>` | 每项目 2（优先复用刚释放的槽位） | 先冻结 Checkout；结果必须含 commit/tree/policy provenance；输入变化写 stale，不重试旧快照 |
| `github.sync` | `project:<id>:github` | 1 | 带 ETag 和 operation receipt；未知结果不重复创建/修改外部对象 |
| `attempt.reclaim`（回收 worktree） | `attempt:<id>` | 1 | 失败保留并告警；有未知 effect 时禁止强制回收 |

- 存储接缝（借 LoopX `AuthorityStore`）：`load / commit(expectedRevision, operationId, …) / readReceipt / scan`。本地命令重放用 receipt 判断是否已提交；transport 的外部 receipt 单独持久化，二者不可互相替代。
- 重启恢复：
  1. `queued` effect 可启动；`dispatching` / `awaiting_receipt` 必须先调用 transport `reconcile(operation_id)`。
  2. 收到成功 receipt 后提交本地状态；明确未执行才重试；若 transport 无法查询或去重，状态转 `unknown`，冻结同一 Run/Attempt 的冲突 effect 并要求人工对账，不得重发。
  3. DSH 原生 `run.launch` 可用确定性的 `session_ref = "proj-worker-" + run_id` 配合 `ctx.sessions.get` 对账。ACP `session/new` 成功但 session id 未落库时只有 provider 支持按 operation id 找回才可自动恢复，否则进入 `unknown` 并隔离 Checkout。
  4. ACP delivery queue 必须先持久化再发送。进程重启后先恢复 provider session 并核对 receipt / message history；不得把内存 queue 或 ACP v1 请求阻塞特性当作持久回执。
  5. 一个 effect 进入 `unknown` 时，同 lane 的 handoff/reclaim/new launch 被阻断，直到人确认远端结果或安全终止。

## 2. 协调者

协调者是一个普通 DSH 会话（始终是 DSH 原生、始终在本机），使用专用 preset `dsh-projects-coordinator`；模型可在会话头切换。新建项目创建协调者会话时，服务端立即写入一条初始化欢迎事件使 `session.blank = false`，确保顶部视图切换栏与右栏立即挂载。

**工具集（完整清单，没有其他工具）**

| 工具 | 作用 |
|---|---|
| `project_status` | 推导后的看板摘要：每个 Task 一行（id、标题、仓库、显示状态、标记、一行摘要） |
| `task_create` / `task_update` / `task_link` | 拆任务（支持指定 `repo_alias`，未指定时默认主仓库，无仓库项目为空）、改描述、设依赖与父子 |
| `task_start(task, spec?)` | 申请启动，可带推荐的 RunSpec（执行者、模型、位置）；Engine 决定排队还是立即启动 |
| `task_best_of(task, specs[])` | 同一任务并行 2–4 个候选 |
| `task_handoff(task, location? , executor?)` | 移到云端 / 拉回本地 / 换执行者 |
| `executors_list` / `locations_list` | 可用执行者、模型目录、位置健康状态（推荐 RunSpec 用） |
| `run_send` | 给某个 Task 的 worker 发消息（`queue` / `steer`） |
| `run_stop` / `task_retry` | 停止；用同一或另一 profile 重试 |
| `task_accept` / `task_cancel` | 仅在人明确同意时调用；accept 需带后继，且先确认无 live Run、未完成写 effect、open gate，固定 accepted head；cancel 也先停止或 fence live Run |
| `context_read` / `context_search` / `context_propose` / `context_dispute` | 读/搜 INDEX 与决策；起草决策或 spec；标记争议条目 |
| `review_request` | 为某 Attempt 开一个 reviewer Run |

**规则**
- **硬工具围栏（屏蔽宿主平面继承工具）**：DSH 宿主平面默认挂载了全局工具（如 `working_directory`）及用户安装的全局插件工具。`dsh-projects-coordinator` preset 激活时必须调用宿主原生 API `presetCtx.tools.restrict({ deny: inheritedNames })` 屏蔽所有继承层工具，并注册单调守卫 `presetCtx.tools.guard(...)` 拒绝任何非上表白名单的工具执行。Spike 必须实测宿主继承工具、用户全局 MCP 和未知工具的拒绝行为；未通过则阻断发布，不把提示词约束或一次 mock 结果视为围栏。
- **Engine 命令授权**：工具围栏只限制协调者；所有 worker、reviewer 和外部 MCP 命令仍须由 Engine 按 Run capability、Mandate、role、repo/path scope、epoch、项目状态和 host lease 再校验，不能因持有 run_token 而绕过。
- **首句秒回**：收到人的消息先回一句确认与第一步，再调工具。
- **有界上下文与 KV Cache 保护**：
  - 低频变动的 `INDEX.md` 与协调者职责通过 `presetCtx.systemPrompt.section` 注入系统提示词，既防止长会话 `context-compaction` 将其摘要丢失，又保证历史对话 Prefix KV Cache 稳定命中；
  - 高频变动的 `project_status` **不放入** `systemPrompt.section`（避免每 15 秒变动击穿 Prefix KV Cache），由协调者按需调用 `project_status` 工具，或在 `wake_turn` / 任务状态实质跳变时经 `agent/pre-step` 在消息尾部增量注入。
- worker 回报以合成消息注入协调者会话：`<task id="YOU-4" state="verified|failed|question">一句结论</task>`，UI 折叠为「Update from YOU-4」单行，只有协调者对人正式发言才点亮未读。
- 输入区行为对齐宿主 `InputBar`：运行中输入框为空时保留 `Stop` 按钮（供用户随时中止回合），输入文字后显示发送按钮并在协调者会话下默认走 `steer` 插话。

## 3. 本机 Project Host 与远端可用性

- 首版不托管控制面。Coordinator、Engine、SQLite、effect runner 和远端 projects-mcp 的终点都在用户自己的本机 Project Host；需要完整管理远端 Run 时，该 Host 必须在线。
- UI 在远端启动摘要、运行视图和 Environments 设置中标注此要求；SSH/Docker/sandbox 的「云端」表示执行位置，不表示控制面独立运行。
- Host heartbeat/lease 失效后，远端 Run 状态变为 `stale`。撤销或暂停写类 capability，挂起的问题和未确认 effect 置为 `unknown`；不签发 verified，不自动重放、不自动在其他 location 重启。
- Host 恢复后，先按 ExecutorDriver/LocationProvider 查询远端 Run、消息 receipt、permission 和作业状态，再逐项恢复或转人工处理。provider 无法查询时保持阻塞，不能猜测成功或失败。
- 若后续要支持桌面关机后仍由 Project 自动协调，必须另立 ADR 决定用户自托管常驻 Host、升级/备份和接入安全；当前不承诺该行为。

## 4. Worker 与 worktree

**启动流程**
1. 认领 `(project, task)` → 解析 RunSpec（任务覆盖 > 负责人 > 项目角色默认 > 执行者默认）→ 预留 WorkerSlot（默认 3，范围 1–16；人类跟进可超额 1 槽；唤醒、`validate` 与只读 `reviewer Run` 优先于新启动）。
2. 启动摘要（UI）列出：Task、仓库（无仓库项目显示「无代码仓库」）、基线分支、**执行者 · 模型 · 位置**、计费来源、检出路径、refs 新鲜度；refs 过期先提示刷新；位置不可用、执行者未安装或未登录则阻断并给出修复入口。
3. 以下 3'–6' 步描述本地位置 + DSH 执行者；其他组合见 [execution.md](execution.md) §3–§4。
3'. 有仓库项目由 `git` 在路径锁内创建 `<dataDir>/worktrees/<project>/<attempt>`，分支前缀由环境决定：本机 `agent/<task-id 小写>-<slug>`（如 `agent/you-4-staging-verify`），远程 sandbox `sandbox/<task-id 小写>-<slug>`，并记录初始 `head_sha`；无仓库项目直接创建受管空目录 `<dataDir>/workspaces/<project>/<attempt>`。
4'. `Engine` 在创建 `Run` 记录时预先生成确定性的 `session_ref = "proj-worker-" + run_id`。`executor-host`（DSH 原生驱动）调用 `ctx.agents.create({ sessionId, signal, meta: { cwd, agentPreset }, agentOptions: { provider, model }, setup })` 创建会话（`agentOptions.model` 见 `core/agent/src/runtime-types.ts:35`，`ModelSelection.model` 见 `types.ts:83`），`setup` 中挂载 `dsh-projects-worker` preset，初始模型由 `agentOptions` 提供（不调用 `workspaceRegistry.create` 以免新增顶层工作区；不调用 `sessionController.selectModel` 以免覆盖用户的全局默认模型；左栏过滤必须用已通过 Spike 的真实 list/filter 接缝；`proj-worker-` 前缀和会话行 slot 只作识别/装饰，不能当隐藏接口，未验证时阻断 M0，同时保持 `delegationDepth = 0` 使 worker 可正常使用 `subagent` 工具与文件上传）。
5'. 首条消息包含：Task 原文（不经协调者转述）、检出说明（原始仓库、检出根目录、分支、「所有改动只在检出目录内」）、`INDEX.md`、以及相关 runbook 的相对路径（提示 worker 使用 `context_read(rel_path)` 按需读取，不传宿主机绝对路径）。
6'. 环境按信任级别构造：默认使用隔离 `HOME`、不传 `SSH_AUTH_SOCK`、剥离父进程 `DSH_*` 与敏感变量；仅用户显式选择 `credential=cli-login` 且 sandbox 能力已验证时，才按次申请本机 CLI 登录态。项目声明变量按 Run capability 注入；install/start/validator 默认不拿 runtime secrets。

**结束与验证**
- worker 调 `task_report(state, summary)` 声明 `done | blocked | failed`（所有执行者经 projects-mcp 拿到同一工具）；声明只产生候选事实，Engine 按 Run capability 校验。
- `done` 后 Engine 先停止当前 Run 并等待退出，撤销该 Run capability 的写能力，冻结 Checkout，确认没有未完成的写 effect，再创建 WIP commit/固定 tree snapshot；任一步失败都不启动 validator。
- validator 在独立只读快照上按受信 `validation_policy_revision/hash` 执行，不读取 worker 分支中未经确认的验证策略，不默认注入 secrets。结果记录 commit/tree/policy provenance、位置、命令摘要、退出状态和工件引用；任何输入变化写 `stale`，不得产生当前有效 `verified`。
- `attempt.head_sha` 刷新时机：worker `task_report`、Run 退出、`checkout.handoff` / `sync`、PR head 变更（`github.sync`）、`validate` 起止时都读取并更新；只有 validate 开始时固定的 commit/tree 与结束时一致，且 policy hash 未变，Evidence 才有效。
- 结果以合成消息回报协调者。Host 失联或外部 receipt 未确认时只回报 `unknown/stale`，不得回报 verified。

**回收**
- 删除 worktree 前把未提交改动存为 `refs/dsh-projects/preserved/<attempt>`（不碰全局 stash）；脏工作区不允许直接删除。
- 策略：Task `accepted` 或 `canceled` 后 1 小时、空闲 72 小时回收 worktree，**保留分支**；启动时 `git worktree prune` 兜底。
- 重新打开已回收的 Attempt：从分支（加 preserved ref）重建 worktree。

**PR 与 CI**
- 观察者每 60 秒（带 ETag）同步 PR、checks、review；外部同步 effect 持有 operation id 和 receipt，未知结果不重复创建或覆盖本地事实。
- CI 失败或 changes requested → 自动 `run_send` 给拥有该分支且 capability/host lease 仍有效的 Run（受预算与重试上限约束）；否则进入 waiting/unknown。
- 合并永远由人发起；系统不自动合并，也不把 PR merge 自动写为 Task accepted。PR merge 只记录事实；人调用 `task_accept`、确认无 live Run/写 effect/open gate 并补 successor 或 `no_followup` 后，Task 才 Done、依赖才解锁。

## 5. 人的注意力：Question Tray

- worker 工具 `ask_human(kind, scope, body, options?)` 产生 Question；Run 进入 `waiting_input`。
- ACP `session/request_permission` 产生带 `protocol_request_id`、Run epoch 和 resolver 引用的 gate Question；resolver 只在同一 Run、同一 epoch 且 Host lease 有效时可用。
- 托盘只在该项目的协调者会话中渲染（`conversation.input.overlay`），显示「Question from YOU-4」、选项与自定义回答。
- 普通问题回答：客户端 → HTTP → `question.answer` 命令 → 持久化 `run.deliver` effect；DSH native 可映射为 steer，ACP 普通插话才可合成 cancel + prompt。ACP 权限回答必须调用 `resolvePermission` 直接回应原 RPC，再写审计。
- `gate` 阻塞并计入「Waiting on you」；`request` 在托盘但不阻塞；`wish` 不打断，只进协调者摘要。Host 失联或 resolver 丢失时 Question 进入 `unknown`，不伪造已批准。
- 自动化不得替 `waiting_input` 的 Run 作答（无 AutoYes）。

## 6. Driver：在 DSH 会话里推进

借鉴 LoopX `packages/dsh-loopx-plugin/src/driver.ts`：

- 订阅 `agent/status`、`agent/inbox/inserted|claimed|discarded`、`session/event`（`step/end`、`turn/end`），把 worker 活动写成 `run.activity` 事实。
- 用 `agent/pre-step` 中间件在消息进入模型前最终复核：Run 是否仍 live、capability/host lease 是否有效、是否有 open gate、项目是否 paused、是否有 `unknown` effect。
- 人类输入永远优先：发现人类消息在排队时，撤回自动续跑消息。
- Host heartbeat/lease 失效时撤销 Run capability 的写能力，远端 Run 进入 `stale`；不自动换位置、不自动回答 gate、不自动重放未知 effect。Host 恢复后先做 Run/effect 对账，再恢复投递。
- 15 秒行摘要直接取最新工具动作（0 次模型调用）；Turn 结束时取 worker 的结论句。

## 7. Library 与项目记忆

| 层 | 位置 | 谁读 | 怎么注入 | 谁写 / 转正 |
|---|---|---|---|---|
| 仓库规范 | 各仓 `AGENTS.md` / `CLAUDE.md` | 进入该仓 worktree 的 worker | DSH 原生 `dsh-agent-instructions` | 人维护 |
| 项目索引 | `context/INDEX.md`（≤1200 tokens） | 协调者 + 所有 worker | 协调者经 `systemPrompt.section` 常驻（防压缩丢失且保 KV Cache）；worker 在首条消息注入，变更后经 inbox 推送 | 人 + 协调者；worker 只读 |
| 决策 / Spec | `context/decisions/NNN-*.md`、`context/specs/*.md` | 协调者 + 相关 worker | `context_read` / `context_search` 按需 | 协调者起草 → 人在对话里确认即 `ratified`；被替代标 `superseded` |
| Runbook | `context/runbooks/*.md` | 仅 worker | 首条消息列出相关 `rel_path`，worker 用 `context_read(rel_path)` 按需读取（本地与云端统一） | worker `context_propose` → `proposed`；关联 Attempt 在当前 `head_sha` 有 verified Evidence 才 `ratified`；执行出错可 `context_dispute` → `disputed` 并在右栏顶部出待办 |
| 工件 / 资料 | `context/artifacts/<task>/`、`context/uploads/` | 人在 Library 预览；agent 按路径引用 | — | validator / worker 经 `artifact_put` 产出（远端自动 `pullFile` 回本机并带 Evidence）；人拖拽上传 |

**写入协议**
1. 只走工具，不裸写文件；工具校验路径白名单、大小、来源。
2. 写结论，不写过程：可复用的操作知识、带理由的决策、指向工件的指针。
3. 每条带来源（Task / Run id、时间）；无来源条目在巩固时优先降权。
4. `context/` 是本地 git 仓库，每次写入一个带 Task / Run id 的 commit，Library 可看 diff、可回滚。
5. **SQLite 的 `context_item` 是状态真相，Markdown 是正文**；状态不写在 Markdown 里。

## 8. 执行者、模型与位置

见 [execution.md](execution.md)：RunSpec、两种传输（dsh-native / acp）、执行者能力降级、位置提供者、环境规格、本地 ⇄ 云端交接、best-of-N、projects-mcp、凭据。

位置的健康检查（原型中的环境检测、历史、自动重试）是 `LocationProvider.health()`；不可用时阻断启动，不静默换位置。默认位置：任务覆盖 > 负责人默认 > 项目默认 > `local`。

## 9. 生命周期：Pause / Archive / Delete

| 操作 | 效果 |
|---|---|
| Pause | 撤销排队中的续跑消息，冻结新启动与 GitHub 轮询；正在执行的 step 跑完为止（不硬杀）；云端 Checkout 进入暂停（沙箱 pause / 容器 stop）以免计费；顶部显示 Paused 横幅 |
| Archive | 停止所有后台活动，从左栏移入归档视图；可恢复 |
| Delete | 二次确认后删除 SQLite 记录、`context/`、所有位置上的受管检出（含云端沙箱）；保留远端分支与 PR；写一条最终审计到全局日志 |

## 10. 预算与并发

- 项目设置：并发上限（默认 3）、每日 token 预算（默认不限）。超预算只排队不拒绝，并在协调者摘要中提示。
- 每个 Run 的模型请求输出上限沿用 DSH preset 配置。
- 用量按 Run 记录（执行者提供时）；本机订阅登录的运行只记 token 不估成本；云端位置另记算力时长。
