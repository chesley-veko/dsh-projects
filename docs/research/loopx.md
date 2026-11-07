# LoopX 深度拆解：面向 DeepSeek Harness「Projects」插件的借鉴报告

- 仓库：https://github.com/loopx-project/loopx ，浅克隆 commit `8a4d4f9dab17`（2026-11-08 04:39 +0800），本地路径 `loopx`
- 下文的文件路径都相对仓库根目录，GitHub 地址为 `https://github.com/loopx-project/loopx/blob/main/<path>`
- 路径更正：任务里列的 concepts 文档，实际有三篇不在 `docs/concepts/`，而是在 `docs/` 根下：`docs/state-interaction-model.md`、`docs/quota-allocation.md`、`docs/project-agent-todo-contract.md`。只有 `interaction-pattern-catalog.md` 在 `docs/concepts/`。
- 标注【推断】的是我自己的判断，不是仓库原文。

---

## 0. 一句话定位

LoopX 自称"本地优先的语义控制面（semantic control plane）"。它**不是 agent 运行时**：模型循环、工具和沙箱由宿主（Codex / Claude Code / DSH）负责，LoopX 只保存跨会话的"工作真相"，即 Goal、Todo、认领（claim）、门禁（gate）、证据、配额（quota），并在每轮决定"能不能继续、该做什么"（`README.md`「Why LoopX」「Current Status」；`docs/architecture.md`「Runtime Responsibility Model」）。README 原话："Your harness runs the turn. LoopX carries the work."

---

## 1. 领域模型与不变量

| 对象 | 定义 / 存储形态 | 关键不变量 | 出处 |
|---|---|---|---|
| **Goal（lifetime goal）** | 稳定的 `goal_id` 边界。一个 Goal 对应一条 registry 记录、一个 active-state 文件、一条 quota 通道、一条 run-history 流、一个 status 投影 | Goal 不是聊天线程，线程只是执行 Goal 的载体；Goal 要能挺过线程重载和多个 agent 接手。目标可以活很多年，但每一轮都必须重新经过 authority、边界、quota、验证和写回，才算进展 | `docs/architecture.md`「Lifetime Goal Invariant」「Local Server / Daemon Roadmap」；`docs/state-interaction-model.md`「Actors → Goal」 |
| **Todo** | Goal 内的结构化条目，用 `todo_id` 寻址，分 `user` 和 `agent` 两种角色。schema 为 `todo_item_v0`，字段有 `task_class`、`action_kind`、`priority`(P0–P4)、`claimed_by`、`required_capabilities`、`target_capabilities`、`excluded_agents`、`unblocks_todo_id`、`resume_when`、`no_followup` 等 | **"Todo 接续"代替"生命周期膨胀"**：不新增 `slice_done/rolled_out` 之类状态。完成一个非平凡 todo 时，要么原子地创建后继（`--next-agent-todo/--next-user-todo`），要么写明 `--no-follow-up` 并给出理由。agent 不得直接改 Markdown 复选框，必须走 lifecycle 命令。priority 只是调度意图，不授予任何权限 | `docs/project-agent-todo-contract.md`「Field Roles」「Priority intent」「Lifecycle Contract」「Parsed Schema」 |
| **User Todo 三分法** | `user_gate`（阻塞）、`user_action`（非阻塞请求）、`user_action + human_attention_kind=wish`（可选的人类杠杆） | 只有 `user_gate` 能带阻塞范围或消耗决策权限。wish 不能带 `blocks_agent`、`global_gate`、`decision_scope`，否则校验失败。多 agent 场景下，user todo 必须用 `bound_agent` 或 `goal_bound=true` 声明绑定 | `docs/architecture/rfcs/human-attention-wishlist-v0.md` §2、§3；`docs/state-interaction-model.md`「Dashboard」末段 |
| **Claim / Lease** | 软认领 `claimed_by`：在 active-state 文件锁下写入，id 必须属于 `coordination.registered_agents`。硬租约 `task_lease_v0`：有 owner、TTL、写范围、幂等键、CAS 版本和 `lease_epoch`。handoff 模式可配置为 `soft_claim` 或 `hard_lease` | **争用单位是 `(goal_id, todo_id)`**，不是整个 Goal。同一 Goal 下的不同 todo 可以并行；对同一 todo 的竞争认领 fail-closed。租约释放后留墓碑，再次获取时 epoch 递增 | `docs/architecture.md`「Local Server / Daemon Roadmap」第 2 点；`loopx/control_plane/coordination/handoff_mode_vocabulary.ts` |
| **Gate（decision_scope）** | user gate 不是全局布尔值，而是带范围的决策：`decision_scope={kind: private_read\|write_scope\|resource\|production\|public_claim\|direction, granularity: action\|lane\|goal\|project\|global, scope_key, expires_at?}`。agent todo 对应声明 `required_decision_scopes`、`safety_class` | 控制器只判断三种关系：gate 覆盖该动作、不覆盖、有歧义。gate 覆盖但存在独立的 fallback 时：通知用户，同时执行 fallback。**范围有歧义时不准从文本推断权限**。多 agent 下没有范围的 `user_gate` 视为投影 bug。热路径上禁止调用 LLM 判断是否被 gate 阻塞 | `docs/concepts/interaction-pattern-catalog.md`「Decision Scope Model」；`docs/state-interaction-model.md`「Three-Actor Interaction Protocol」 |
| **Handoff gate** | 带 `blocks_agent` 的 todo 被当作 agent 之间的门禁，投影为 `todo_handoff_gate_v0`，状态有 `blocking / cleared_with_successor / cleared_without_successor / cleared_no_followup / superseded / deferred` | 已完成但没有后继的 handoff 必须触发 `successor_replan_required`，不能静默消失 | `docs/concepts/interaction-pattern-catalog.md` IP-029；`loopx/control_plane/todos/handoff_gate.py` |
| **Evidence / Run history** | 紧凑运行索引（公开安全），加上私有运行载荷 | 运行记录说"测试通过"，必须有对应的 commit、Todo 和验收才算数。观察（observation）不等于状态迁移；provider 回执在 capability 校验、kernel 提交之前不算进展 | `docs/book/en/chapters/state-substrate.md`「Three records」；`docs/architecture.md`「Runtime Responsibility Model」 |
| **Quota** | 每个 Goal 一个 compute 数值（0–1），解释为 24 小时内的分钟槽位占比。`quota_slot_spent` 事件只能追加 | quota 只管算力，不是第二套权限系统。它在健康门、人工门、证据等待、焦点等待之后才生效。必须在新鲜的 `should_run=true` 且写回已验证之后，才恰好扣费一次。`compute=0` 是 Goal 级硬暂停 | `docs/quota-allocation.md`「Product Scope」「State Order」「Slot Spend Event Contract」 |
| **Agent lane / Turn lane** | 一个 agent 在一个 goal 上工作 = 一条 lane | **每条 lane 同时只允许一个执行中的 Turn**。由内核锁（进程持有）保证，进程崩溃后自动释放。第二个 Turn 直接返回 `turn_lane_in_flight`。只读预览不加锁 | `docs/reference/protocols/loopx-turn-v0.md`「One Executor Per Turn Lane」 |
| **Peer / 临时协调者** | 所有注册的 agent 地位平等，没有常驻 leader。开启有界编排时，对任务包做哈希，确定性地选出一个**临时**协调者（`task_orchestration_contract_v1`） | 协调者只负责汇总已验收的 bundle 证据，没有审阅、合并或重规划的隐含权限 | `docs/architecture.md`「Peer Task Coordination」；`docs/reference/protocols/peer-agent-runtime-v1.md`「Task-Scoped Coordination」 |

全局不变量（`docs/state-interaction-model.md`「Invariants」）：active state 是持久上下文，聊天只是执行上下文；人类奖励不等于写授权；改变运营策略的用户纠正，必须先固化为 operating lesson、后继 todo 或事件，后续 agent 才能依赖；定时器节奏不是 quota 的真相来源；status 新增字段只能追加，改变已有字段语义要走合同变更。

---

## 2. 存储布局与真相来源

**路径**（`loopx/paths.py` 第 9–30 行；`docs/guides/getting-started.md` 约第 755–770 行）：

```
<project>/.loopx/registry.json                          # 项目级 registry
<project>/.loopx/goals/<goal-id>/ACTIVE_GOAL_STATE.md   # 人/agent 工作台
~/.loopx/registry.global.json                           # 全局 registry（由各项目同步）
~/.loopx/goals/<goal-id>/runs/                          # 运行载荷与索引
~/.loopx/backups                                        # 备份
```
`.loopx/` 应加入 gitignore，不提交（`docs/guides/getting-started.md` 第 39、47 行）。

**文件还是数据库：按 Goal 选择 authority provider。**
- 新 Goal 的存储只能是 `file` 或 `sqlite`（`loopx/control_plane/coordination/local_authority_defaults.ts`）。`nokv` 和 `postgresql` 是尚未提升的候选（`authority_store.ts` 中的 `AuthorityStoreProviderKind`）。
- Todo 的读取来源按路径区分（`docs/book/en/chapters/state-substrate.md`「Todo storage follows the selected source」）：老路径下，Markdown 小节本身就是真相，元数据写成复选框下方的 HTML 注释，如 `<!-- loopx:todo todo_id=... status=open ... -->`（见 `docs/project-agent-todo-contract.md`「Parsed Schema」）；新的 canonical provider 路径下，Markdown 只是兼容工作台或投影。
- **曾经做过、后来退役的实验**：Todo 的 `events.jsonl` 事件溯源 API 已在 2026-09-25 退役（`docs/state-interaction-model.md` 顶部 Update 注记）。但 run history、quota 事件、`rollout_event_log` 仍按各自合同追加写入。
- **存储接缝**：`AuthorityStore` 接口（`loopx/control_plane/coordination/authority_store.ts` 第 176 行起）只有六个方法：`storeIdentity / loadAuthority / commitAuthority / readReceipt / readReceipts? / scanCommitted`。一次 commit 携带 `expected_provider_revision`（CAS）、`operation_id`（幂等）、`events`、`next_projection`、`receipts`；结果分为 `applied / conflict(provider_revision_mismatch|operation_id_exists) / ambiguous / failed`。注释原文："Storage-only seam. Legal transitions and receipt meaning stay in LoopX."
- 状态面分五层：Registry → Todo/Goal state → Active-state 工作台 → Run history → Status/投影（`state-substrate.md`「Five state surfaces」）。另有三类记录：Turn journal（这一轮做到哪一步，用于恢复）、Goal state（当前事实）、Run history（发生过什么、用于解释）（同文「Three records」）。
- 投影一律声明 `projection_is_writable:false`，写入只能通过 `loopx todo / refresh-state / operator-gate / reward / quota spend-slot` 这几个入口（同文「What the projection truth contract expresses」）。
- 写入正确性流程：`prepare -> preview -> apply -> record -> project`（同文「Storage medium and the write contract」）。文中特别说明："换成数据库并不会自动解决身份、并发或效果恢复问题。"

---

## 3. 控制循环 / 心跳 / 调度 / Effect Interpreter

**3.1 心智模型**（`docs/architecture/rfcs/agent-loop-effect-interpreter-v0.md`「Summary」「Core Mental Model」，状态 Accepted）：
```
model -> effect request -> harness interprets effect -> observation -> model
GoalState => F[QuotaDecision]
```
LoopX 负责中间两步。每个控制包都用四个语义槽来解释：`effect_request / interpretation / observation / next_effect`。RFC 明确这是命名纪律，不是第二套 schema（「Canonical Packet Semantics」）。

**3.2 Handler 是数据，不是回调**（同 RFC「Handler Is Data, Not a Callable」）：LoopX 无法跨会话边界拿到宿主的回调函数，因此把"下一步"编码成 `next_effect` 数据（CLI 动作、scheduler ACK、failure hint），由宿主或下一轮执行。环绕层的顺序是合同：`capability_gate → interaction_contract → work_lane_contract → scheduler_hint`，每层都能短路（skip/wait/ask_owner）或改写，失败、取消、权限拒绝、预算拒绝都用类型化字段表达，不会被吞掉。

**3.3 结算代数**（同 RFC「Bounded Kleisli Runtime Decision」及 M7）：Turn 收尾是一串带回执的步骤，测试覆盖 identity、associativity、有序短路、replay（已有持久回执就跳过已提交的效果）、**不可交换**（writeback、spend、host handoff 不能换序）。M7.3 的结论是：三个适配器共享代数，但不共享执行器，因为权限边界不同。RFC 在 Non-Goals 里明确反对过早做通用 `Effect` monad 或中间件注册表。

**3.4 一个 Governed Turn 的八个阶段**（`docs/reference/protocols/loopx-turn-v0.md`「Turn Lifecycle」）：Wake → Decide（`quota should-run --turn-envelope`）→ Route（需要用户、被限流或监控无变化时，不调用宿主）→ Prepare（认领/租约 + 工作区守卫）→ Execute（一段有界工作）→ Validate（**进程退出码 0 不算验证**）→ Write back（完成当前 todo 或创建后继）→ Spend & schedule（验证后扣一次 quota，再应用并 ACK 调度提示）。整体可以概括为 "LoopX decides → agent executes → validator proves → LoopX commits"（同文「Mental Model」）。

**3.5 interaction_contract 的模式**（`docs/state-interaction-model.md`「Interaction Modes」）：`bounded_delivery`、`user_gate`、`scoped_user_gate_fallback`、`user_todo_blocker_push`、`successor_replan_required`、`external_evidence_observation`（必须先确认有可观察的句柄，例如 job id，否则写 blocker）、`monitor_quiet_skip`（不扣费）、`autonomous_replan`（连续 2 轮停滞就强制做一次重规划）、`outcome_floor_recovery` 等。同文还有对应的 mermaid 状态机。

**3.6 心跳与调度**（`docs/development/control-plane-course/07-host-scheduler-and-heartbeat.md`）：宿主只是触发器，不是第二个控制面。心跳 prompt 保持很薄，只包含生命周期不变量，项目相关的 watch 要建成 `continuous_monitor` todo，不能写进 prompt。`scheduler_hint` 是派生投影，按状态类别给出节奏（文中示例：活跃工作约 3→10 分钟，等用户约 30→120 分钟，终态则停止）。stateful backoff 的身份键是 `goal + agent + lifecycle reason + target`，状态变化时重置。**Scheduler ACK**：宿主必须真正更新 RRULE，再执行 CLI 给出的 ACK 命令，ACK 绑定 proposal token 和 turn receipt；"模型说已改成 30 分钟"不算证据，ACK 本身也不扣费。

**3.7 选择下一步的规则**（`docs/state-interaction-model.md`「Priority Stack」「Steering Audit」）：`quota should-run` 是算力守卫，不是策略选择器。写新的 Next Action 前要做 steering audit：跨 lane 列出至少 3 个候选；同一主题连续占用多轮后要重新排序；区分 compute quota 和 focus quota；记录落选的高价值候选。

---

## 4. 人类注意力队列 / 门禁 / 审阅包

- **Status / attention queue**（`docs/architecture.md`「Status / Attention Queue」）：由 registry、run history 和合同健康度派生的首屏队列。合同失败会阻塞适配器工作；等待用户 opt-in 的 Goal 单独展示；可以交给 agent 的工作和外部证据等待分开；已连接、只读且有有效运行的 Goal，不会反复要求审阅。
- **首屏规则**（`docs/state-interaction-model.md`「Dashboard」）：每个 Goal 先展示第一条未完成的 `user_todos` 和优先级最高的 `agent_todos`，详细内容放到下钻页面。Dashboard 默认只读，浏览器写入需要显式能力、预览握手、精确的 run 目标和 loopback 边界。
- **门禁的交互语义**：阻塞型 user gate 会投影出 `interaction_response_plan_v0`，内容为 `kind=surface_user_gate, action_sequence=[notify, wait], silent_wait_allowed=false`（`state-interaction-model.md`「Three-Actor Interaction Protocol」）。open user todo 时最多问 3 项，跳过交付、不扣费（`project-agent-todo-contract.md`「Execution Order」）。
- **Wish 的投递方式**是 piggyback 或 digest，不打断用户（`human-attention-wishlist-v0.md` §2）。
- **审阅材料**（`docs/guides/review-materials.md`）：Home 上的"待验收成果"从完整的 canonical User Todo 计数。打开某个版本，可以选择"验收这份材料"（走操作预览，只处理这一版的 User Todo，**不等于整个 Goal 验收**）或"提出反馈"（在负责 agent 的会话里生成草稿，**不会自动发送**）。修订版单独提醒，旧版本的处理结果保留。CLI 为 `loopx periodic-report request-review`，按 Goal + 生产者 + 生成包去重。
- **人类奖励**：`human_reward` 覆盖层挂在具体 run 上，不只记在聊天里（`state-interaction-model.md`「User」）。
- 审阅包 CLI 为 `loopx review-packet`（`README.md`「Control-Plane Surface」），实现目录在 `loopx/control_plane/handoff/`（`review_packet_context.py`、`review_batch.py`）。我没有逐行读这部分实现。

---

## 5. 运行时适配模型与 DSH 集成

**5.1 两种执行模式**（`docs/architecture/rfcs/agent-session-execution-modes-v0.md` §1、§2 Invariants、§4，状态 Accepted，交付程度为部分）：
- `managed_runtime`：由 LoopX 拥有的宿主创建、启动、监督、中断、替换会话。新建 Chat 会话默认是这种。
- `attached_host`：把已经在运行的外部宿主会话绑定进来，进程、对话、中断、恢复仍归外部宿主。
- 不变量：LoopX 拥有工作真相；宿主拥有执行机制；工作会话的路由按 `agent_id` 解析，不按 Goal 默认值；一个 binding 最多一个活跃执行者，输入通过一个有序队列串行化；模式显式持久化、可读回，不会被隐式切换；"对话不是写回执"；不可用的投递能力 fail-closed，绝不悄悄改用别的执行者。
- 实现位置：`loopx/chat_store.py`（模式词表）、`loopx/attached_session.py`（bind/claim/complete broker，claim 最长等待 1800 秒，回执防重复）、`loopx/chat_runtime.py`（对 attached 会话绝不启动 managed 适配器）。

**5.2 DSH 的两条路径**（`docs/integrations/deepseek-harness-control-plane-adapter.md`「Route Decision」）：

| 路径 | 用途 | 会话与唤醒的所有者 |
|---|---|---|
| `packages/dsh-loopx-plugin`（native，host surface 为 `deepseek-harness-native`） | 人在场时在 DSH 会话里工作 | DSH 会话；精确调用 `loopx` skill 之后，才可选地启用同会话 Driver |
| LoopX Turn on DSH（`loopx/dsh_goal_mode/`） | 无人值守、有界、受 quota 管控 | LoopX Turn 加外部调度器 |

**5.3 Headless Turn 适配器**（`docs/integrations/deepseek-harness-connector.md`）：链路为 `quota should-run → loopx turn run-once → python -m loopx.dsh_goal_mode → deepseek-harness-sdk(0.1.5rc1)/dsh-jsonrpc-agent → loopx_turn_result_v0 → 独立 validator → 写回 + 扣费`。要点：
- session id 由 `[goal_id, agent_id, todo_id]` 的版本化摘要派生。`--iteration-context fresh` 表示每轮新上下文，默认 `resume` 按 Goal/Agent/Todo 延续。
- 向工具注入 `LOOPX_TURN_GOAL_ID/AGENT_ID/TODO_ID/WORKSPACE`。文档特别警告：这只是覆盖映射，不是环境隔离，SDK 会继承父进程的凭据。
- `--host dsh` 在进程内运行，provider 失败会以类型化的 `loopx_turn_host_failure_v0` 进入 journal，可以有界重试。
- `managed_executor_binding_v0` 读回内容包括 `output_token_budget`：默认 `max_tokens=16384`，作用域是每次模型请求，不是整轮；SDK 没有硬性的工具预算和最终回复预留，因此显式标为 unsupported。达到 max-tokens 归类为 `output_budget_exhausted`，不当作成功。
- 宿主选择是显式的：配置了 `DEEPSEEK_API_KEY` 时默认用 `dsh`，否则用 `codex-cli`。
- `DeepSeekHarness.run()` 的返回只是候选结果，不是完成证明。

**5.4 Native 插件**（`packages/dsh-loopx-plugin/`，v0.1.1-beta.6，src 约 6k 行 TS）：
- `cordis.patch.yml` 注入四行：`loopx-goalbar`、`loopx-init-command`、`loopx-driver`，以及默认关闭的 `loopx-shadow-observer`。
- **Driver**（`src/driver.ts`）订阅的 DSH 事件：`agent/created`、`agent/status`、`agent/inbox/inserted|claimed|discarded`、`agent/error`、`session/event`（`step/end`、`turn/end`），并用 `agent/pre-step` 中间件在消息进入模型步骤前做最终复核（第 1222–1263 行）。
- 激活条件很严：只认会话里由类型化事件构成的 `loopx` skill 调用（`user/message` 或配对成功的 `tool/call` + `tool/result`），普通文本不算（第 216–283 行）。
- 在空闲边界上的流程：先让位给人类输入 → `resolve-agent-thread` → `quota should-run`（使用稳定的 `turn_instance_id`）→ 只在准入时读薄 heartbeat prompt → 最多排入一条带类型的 `loopx-continuation` 消息 → 在 pre-step 再次校验 agent、会话、预约、binding 和 quota。预约状态为 `queued/claimed/admitted/retired`，人类输入优先。
- 插件本身**没有面向模型的 LoopX 工具，也没有持久的 Goal/Todo 存储**，所有读写都通过固定 argv 调用 `loopx` CLI，并按精确 schema 解码（`src/cli.ts`）。
- **GoalBar**（`src/goalbar/*`）：仅限 loopback 的 `/loopx` Connection channel，协议为 `loopx_goalbar_request_v2`，支持 read/watch/start/pause。浏览器只拿到 id、计数、游标和不透明的 source revision，**不传 Todo 正文、目标原文或 CLI 输出**。Pause 只撤销以后排队的继续消息，不中止正在运行的 turn。
- **Shadow observer**（`src/observer.ts`）：单向读取 `dsh-session-events`，追加写入 `reliability_observer_envelope_v0` 到诊断台账。它不 import driver，不发消息，hook 失败只计数、不向外传播。
- 另有 `src/native-operation.ts`：通过 Unix socket 暴露 `loopx_operation` 工具（显式由 SDK 拥有的传输，不默认注册）。
- **定位**：`docs/architecture/rfcs/harness-selection-dsh-pi-v0.md`「Decision」把 DSH 定为"第一个 L1 事件源"，但**不**认为它已是首选的生产级 managed runtime；Pi 仍是候选。

---

## 6. 值得借鉴到 DSH「Projects」插件的设计

目标形态：协调者会话 + 任务追踪器 + worktree worker + 共享项目上下文。

1. **单一真相，其余都是投影。** 把 Project/Task/Gate/Evidence 放进插件自己的持久存储，GoalBar 式 UI、协调者会话的摘要、看板都声明为不可写投影。写入只走少量带类型的入口，例如 `task.add/claim/complete/supersede`、`gate.open/resolve`、`evidence.append`。（来源：`state-substrate.md` 投影真相合同；`architecture.md`「Agent-Native Kanban Is A Projection」）
2. **照搬一个小号 `AuthorityStore` 接缝**（load / commit(CAS + operation_id) / readReceipt / scanCommitted），先用 SQLite 实现。好处是幂等重试和"响应丢了但提交可能已发生"（IP-036）都能用回执解决。（`authority_store.ts`）
3. **争用单位按 `(project, task)`，软认领为默认，硬租约可选。** worktree worker 先认领后执行。写类任务强制使用独立 git worktree：照搬 `agent_workspace_guard_v1` 的规则，即声明了写范围或写类 action_kind 就必须用 worktree，只读任务不触发（`peer-agent-runtime-v1.md`「Workspace Isolation」）。
4. **一个 lane 只有一个执行者**：每个 worker 会话（agent × project）持一把进程锁，崩溃后自动释放，第二个执行请求返回类型化的 `lane_in_flight`（`loopx-turn-v0.md`）。
5. **完成即接续**：`complete` 时要求原子地创建后继 task，或写 `no_followup` 加理由。协调者因此不需要猜"还剩什么"，状态机也不必膨胀（`project-agent-todo-contract.md`「Lifecycle Contract」）。
6. **Gate 带范围（`decision_scope`），并支持 fallback**：gate 只阻塞它覆盖的动作，worker 可以继续做不依赖它的 fallback。范围有歧义时 fail-closed，不让 LLM 在热路径上判断是否阻塞（`interaction-pattern-catalog.md`「Decision Scope Model」）。再加上 gate / request / wish 三分的人类注意力模型，避免要么全部阻塞、要么全部刷屏。
7. **"Decide → Execute → Validate → Commit"，并且验证独立于执行。** worker 的自报结果只是候选，由 validator（测试命令、diff 检查、CI 状态）证明后才写回，进程退出码 0 不算数（`loopx-turn-v0.md`「Mental Model」）。
8. **复用 DSH 原生钩子做同会话驱动**：`agent/status` 判断空闲边界，`agent/inbox/*` 判断是否与人类输入竞争，`agent/pre-step` 中间件在入模前最终复核，`session/event` 发布投影。继续消息使用自定义 `MessageSourceMap` 类型（`loopx-continuation`），人类输入永远优先（`packages/dsh-loopx-plugin/src/driver.ts`）。这对协调者会话自动推进 worker 很直接可用。
9. **Handler 用数据表示**：协调者的决策输出 `next_effect` 数据（例如"在 worktree X 用 todo Y 启动 worker"），由插件 host 执行并回写回执，不让模型直接拿到副作用回调（effect-interpreter RFC）。
10. **调度提示是派生的，并带 ACK**：按状态类别做 backoff，状态变化时重置；空转的轮次不计入预算（课程 07）。
11. **共享项目上下文用 Goal 工作台 + authority sources 实现，不靠模型记忆**：Next Action 只写一句路由，用户纠正固化为 todo 或事件。需要钉住的规范文件可选地加 `sha256` pin（`architecture.md`「Source content…」）。
12. **隐私分层**：给 UI 和协调者的投影只放 id、计数和摘要，原始 transcript、工具输出和凭据留在会话本地（`deepseek-harness-control-plane-adapter.md`「Failure And Privacy Boundaries」）。
13. **managed_runtime 与 attached_host 的显式区分**：Projects 插件里，协调者会话就是用户眼前的 attached 会话，worker 是插件 spawn 的 managed 会话。模式持久化，不隐式切换（execution-modes RFC §1）。【推断】这个映射是我的建议，LoopX 并没有现成的"协调者 spawn worktree worker"实现。它的 `task_orchestration_contract_v1` 只是"临时协调者"语义，不是常驻协调会话。

---

## 7. 弱点 / 不要照搬的地方

1. **复杂度失控。** 实测 `loopx/` 下约 51.8 万行 Python、11 万行 TS，`docs/` 约 146 万词，52 篇英文 RFC（另有中文镜像），`tests/` 432 项、`examples/` 356 项（本地 `wc` 统计）。核心文档里有大量迁移、兼容、退役的注记（例如 `quota-allocation.md`、`project-agent-todo-contract.md` 的"Default change and compatibility"段落）。Projects 插件应该只取约 5 个对象和约 10 个写入口。
2. **Python 与 TS 双栈并行迁移**（`README.md`「2.0 background」：TS 拥有事务和权限，Python 保留宿主 IO）。插件直接在 TS / Cordis 内实现，不要引入跨语言 CLI 往返。【推断】DSH 插件每次决策都要 spawn `loopx` CLI 子进程并做 schema 解码（`src/cli.ts`），延迟和失败面都偏大。
3. **Markdown + HTML 注释元数据作为真相**，属于历史包袱，后来又经历了 events.jsonl 实验和退役，再改成 File/SQLite provider（`state-interaction-model.md` 顶部注记；`state-substrate.md`）。一开始就用结构化存储，Markdown 只作为导出投影。
4. **术语和模式过多**：interaction_contract 有 10 多种 mode，高优先级包有 `execution_obligation / heartbeat_recommendation / work_lane_contract / protocol_action_packet(已退役)` 等兼容字段（`state-interaction-model.md`「Three-Actor Interaction Protocol」）。Projects 只需要 run / ask / wait / idle / repair 这几种。
5. **"一个数字的 quota"语义别扭**：它按分钟槽位计费，不是按 token 或成本（`quota-allocation.md`「Minimal Contract」明说"It does not need to count exact tokens yet"）。DSH 场景更适合直接按 token 或成本做预算，或者干脆先不做跨项目配额。
6. **心跳依赖外部定时器加 ACK**，主要为 Codex App automation 设计（课程 07）。DSH 插件可以直接用会话内事件驱动（Driver 的做法），不需要搬 RRULE / ACK 那一套。
7. **对象命名漂移，文档自称还在收敛中**：例如 `semantic-vocabulary-convergence-v0` RFC、`docs/architecture/rfcs/STATUS.md`。很多能力标注为 experimental、default-off 或 under qualification（README「Current Status」；execution-modes RFC 写明 cross-host admission 只是部分落地）。借鉴时要区分已交付的和只是提案的。
8. **审阅、合并等权限刻意不下放**，多 agent 的价值因此主要体现在"认领 + 证据"上。【推断】如果 Projects 需要协调者主动拆任务、派 worker、汇总 diff，LoopX 的"无 leader 对等节点 + 临时协调者"模型偏保守，需要自己设计一个持久协调者，同时守住"协调者不是第二个真相源"这条线（capable-manager RFC 的 Invariant 1）。
9. **环境隔离不足**：DSH headless 适配器明确承认 SDK 会继承父进程的凭据（connector 文档「Task identity and context lifetime」）。插件 spawn worktree worker 时应该显式裁剪环境变量。

---

### 没有核实的部分
- `loopx review-packet` 和 `status` 的具体 JSON 字段：我没有逐行读 `docs/status-data-contract.md` 和 `loopx/control_plane/handoff/*` 的实现，只引用了它们在 README 和 architecture 中的定位。
- 文档站 https://loopx-project.github.io/loopx/docs/ 没有单独抓取。仓库 `mkdocs.yaml` 表明站点由 `docs/` 生成，因此以仓库源文件为准。
- 没有运行任何 smoke 或测试，结论都基于源码和文档。
