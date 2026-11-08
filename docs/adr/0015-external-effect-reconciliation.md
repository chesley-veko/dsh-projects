# 0015 外部 effect 使用回执对账，不盲目重放
- 状态：Accepted
- 日期：2026-11-08

## 背景

SQLite outbox 只能证明本机已提交 effect，不能证明 SSH/ACP/GitHub 一侧是否已执行。把崩溃前所有 `running` effect 直接重置为 `queued`，在外部已接受操作但本机未收到响应时会产生重复 Run、重复投递或重复计费。ACP 的 queue 当前只驻留 `executor-host` 内存。

## 决定

- 每个外部副作用在入队时生成稳定唯一的 `operation_id`；effect 记录保留 `queued`、`dispatching`、`awaiting_receipt`、`succeeded`、`retryable`、`unknown`、`failed` 等状态，以及尝试次数、下次重试时间、外部 session/message ref、回执和错误摘要。
- 只有明确未发送或外部确认可重试的错误可以自动退避重试。进程在发送后、记录回执前崩溃时，恢复器先按 transport capability 查询远端状态；有回执则完成本地提交，确认未执行才重发。
- 若 transport 不支持按 `operation_id` 查询/去重，恢复为 `unknown` 并冻结同一 Run/Attempt 上可能冲突的启动、投递、handoff 与回收；不得自动重发或报告成功，需由人对账后选择采用、终止或重试。
- ACP `session/new` 不支持按外部 id 查询或去重：S5 t7 两次相同 `session/new` 返回两个不同 session id，编造外部 id 的 resume 被拒（`session is not resumable`）。因此 ACP 上的恢复只能走 `unknown`，不得凭本地 `operation_id` 假定远端已建或未建会话。
- 断线期间的 prompt 可能以 `end_turn` 结束而工具调用从未执行、也未到达 Engine。恢复对账必须以 Engine 实际收到的 effect receipt（含 MCP 命令记录与工具调用日志）为准，不得以 prompt 的 `end_turn` 或 ACP 会话状态为准。
- ACP queue 必须先持久化，再按 `run:<id>` lane 串行发送。每条投递使用独立 operation id；队列条目在确认或转入 `unknown` 后保留审计回执。
- `run.launch` 丢失响应（等待 `session/new` 期间崩溃、超时、断线或无回执）时一律转 `unknown`。只有 driver 能按 provider 能力找回 session 时才自动接管；否则隔离该 Checkout，阻止第二个 Run 争用。
- 此合同是 at-least-once transport 上的本地对账，不宣称跨网络 exactly-once。

## S5/S6 实测（2026-11-08）

- **不去重**：S5 t7 两次相同 `session/new` 产生两个不同 id；编造外部 id 的 resume 被拒（-32602 `session is not resumable: ext-123`）。ACP 没有按外部 id 去重或查询的接口，`reconcile` 只能返回 `unknown`（[S5 报告](../spike/reports/S5-acp-matrix.md)）。
- **`end_turn` 不代表 effect 已执行**：S6 断线 30 秒测试中，分区前开始的长 prompt 在恢复后以 `end_turn` 结束（44 秒），但 120 秒 `projects_sleep` 从未真正执行；分区中途发出的 echo prompt 同样 `end_turn`，其工具调用未到达假 Engine（[S6 报告](../spike/reports/S6-ssh-remote.md)）。prompt 回合状态不能作为 effect 成功的证据。
- **恢复口径**：Host 恢复后先按 Engine 实际收到的 effect receipt 与工具调用记录对账；缺失的回执进入 `unknown`，不因 prompt `end_turn` 而标记完成。

## 后果

- effect 表需要持久状态和 receipt 字段，迁移规则保留旧记录并标记其恢复依据未知。
- Effect runner / ExecutorDriver 必须暴露 `reconcile(operation_id)` 能力；不支持查询的 provider 明确降级。
- M0/M2 要有 kill-point 故障注入，覆盖外部操作前、接受后、本地 ack 前和消息排队后。
- 对账证据只认 Engine 实际收到的 effect receipt 与工具调用记录；prompt `end_turn`、ACP 会话状态只作为辅助线索。

## 备选方案

- 重启后统一重放：至少一次投递会重复副作用，放弃。
- 把 effect 标为已完成后只依赖内存发送：进程崩溃会丢消息，放弃。
