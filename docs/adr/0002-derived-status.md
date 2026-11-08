# 0002 只存意图与事实，显示状态读时推导
- 状态：Accepted
- 日期：2026-11-08

## 背景
旧 Schema 在 `project_task.status` 存 6 态，由协调者或 Ticket「推进」。这会与 worker 实际活动、PR / CI 状态漂移，且需要多个写者。

## 决定
Task 只存 `intent ∈ {backlog, ready, canceled, accepted}`；事实（Run 活动、Question、Evidence、PR）由各自观察者写入；右栏分组、看板泳道、徽标、协调者摘要全部调用同一个纯函数 `deriveTaskView`。

`deriveTaskView` 的命中优先级固定为：`Canceled → Done → Waiting on you（限定异常退出晚于最近一次 queued_at）→ In Progress → For Review（要求当前 attempt.head_sha 上有有效 verified Evidence 或 open PR 且无活跃 worker Run）→ Queued → Backlog`。UI 上的「改状态」映射为命令（见 `docs/architecture/domain-model.md` §3）。

## 后果
- 不会出现「卡片显示 In Progress 但 worker 早已退出」。
- 终态（Canceled / Done）与活跃运行态（Waiting on you / In Progress）优先于待审态（For Review），避免带未决提问的任务无法取消、PR 返工中仍卡在 For Review、或失败任务重排后因槽满仍卡在 Waiting on you。
- 「For Review」「Waiting on you」不能被人手动设置，原型的状态菜单需要相应置灰。

## 备选方案
- 存储状态 + 定期对账：仍有窗口期不一致，放弃。
- 参照：Agent Orchestrator `docs/architecture.md` §Status derivation。
