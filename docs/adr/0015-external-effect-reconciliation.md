# 0015 外部 effect 使用回执对账，不盲目重放
- 状态：Accepted
- 日期：2026-11-08

## 背景

SQLite outbox 只能证明本机已提交 effect，不能证明 SSH/ACP/GitHub 一侧是否已执行。把崩溃前所有 `running` effect 直接重置为 `queued`，在外部已接受操作但本机未收到响应时会产生重复 Run、重复投递或重复计费。ACP 的 queue 当前只驻留 `executor-host` 内存。

## 决定

- 每个外部副作用在入队时生成稳定唯一的 `operation_id`；effect 记录保留 `queued`、`dispatching`、`awaiting_receipt`、`succeeded`、`retryable`、`unknown`、`failed` 等状态，以及尝试次数、下次重试时间、外部 session/message ref、回执和错误摘要。
- 只有明确未发送或外部确认可重试的错误可以自动退避重试。进程在发送后、记录回执前崩溃时，恢复器先按 transport capability 查询远端状态；有回执则完成本地提交，确认未执行才重发。
- 若 transport 不支持按 `operation_id` 查询/去重，恢复为 `unknown` 并冻结同一 Run/Attempt 上可能冲突的启动、投递、handoff 与回收；不得自动重发或报告成功，需由人对账后选择采用、终止或重试。
- ACP queue 必须先持久化，再按 `run:<id>` lane 串行发送。每条投递使用独立 operation id；队列条目在确认或转入 `unknown` 后保留审计回执。
- `run.launch` 在 ACP `session/new` 返回 session id 前崩溃时也视为 `unknown`。只有 driver 能按 provider 能力找回 session 时才自动接管；否则隔离该 Checkout，阻止第二个 Run 争用。
- 此合同是 at-least-once transport 上的本地对账，不宣称跨网络 exactly-once。

## 后果

- effect 表需要持久状态和 receipt 字段，迁移规则保留旧记录并标记其恢复依据未知。
- Effect runner / ExecutorDriver 必须暴露 `reconcile(operation_id)` 能力；不支持查询的 provider 明确降级。
- M0/M2 要有 kill-point 故障注入，覆盖外部操作前、接受后、本地 ack 前和消息排队后。

## 备选方案

- 重启后统一重放：至少一次投递会重复副作用，放弃。
- 把 effect 标为已完成后只依赖内存发送：进程崩溃会丢消息，放弃。
