# 0001 自建项目引擎，不改造 dsh-superagent 的 Eval / Ticket 语义
- 状态：Accepted
- 日期：2026-11-08

## 背景
旧方案计划 fork dsh-superagent，并「动三刀」：把人在协调者会话里的消息包装成 Trigger、把幂等键改成 `(triggerId, taskKey)` 以支持一拆多、归档 worker 会话。源码核查发现：`ticketId = key('ticket', evaluation.id)` 键在 Eval 而非 Trigger，一拆多至少要改 5 处域模型（`evals.ts:137,311,329`、`model.ts` 的 `Decision.ticketId` 与 disposition、`docs/001-domain.md:28`），会让 SA 的大量测试失效；并且 SA 的 Eval 是为「外部事件准入」设计的，人在对话里说话本身就是显式授权。

## 决定
Projects 拥有自己的单写者引擎与表（Project / Task / Attempt / Run / Question / Evidence …）。从 SA 复用的是基础设施代码：`atomic()`、effect 执行器、`AgentDelivery`、`WorkerSlots`。SA 的 Source → Eval → Mandate 只用于外部事件，封装在 `intake` 包。Mandate 一般化为 `origin: chat | source`。

## 后果
- 交互路径不依赖 SA 的 Eval，M0 可以独立交付。
- 需要自己维护一套迁移与测试。
- 外部事件到 M4 才接入。

## 备选方案
- 按旧方案修改 SA 域模型：改动面大、语义错配，放弃。
- 直接用 LoopX 作为控制面：它没有常驻协调者派 worktree worker 的能力，体量过大（约 51.8 万行 Python + 11 万行 TS），放弃；只借鉴其模式。
