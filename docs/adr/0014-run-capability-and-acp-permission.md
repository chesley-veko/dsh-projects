# 0014 Run capability 与 ACP 权限回调
- 状态：Accepted
- 日期：2026-11-08

## 背景

Mandate 已经记录项目、Task、仓库和 write 范围，但远端 `run_token` 不能只凭 Task id 授权。不同 Run 的角色不同：worker 可写，reviewer 只读；handoff、cancel、项目暂停或 token 过期后，旧进程仍可能持有凭据。ACP `session/request_permission` 也是挂起的协议请求，不能用普通 steer 代替答复。

## 决定

- 每个 Run 生成不可猜的 `run_capability`，绑定 `project_id`、`task_id`、`attempt_id`、`run_id`、允许的 `repo_alias`、路径范围、Run role、Mandate policy version、权限能力、签发时间、过期时间和撤销 epoch。token 只作为传输凭据，Engine 每次 MCP 命令仍按当前 Run 和 Mandate 再校验。
- `reviewer` 默认只读；`permission=read-only`、`Mandate.write=false`、已取消/暂停/handoff/退出的 Run，均不得调用 `task_report`、`context_propose`、`context_dispute`、`artifact_put` 或任何写类命令。跨 repo、跨 Attempt 和超出路径白名单的请求 fail-closed。
- `task_accept`、`task_cancel`、授权范围扩大、策略确认和远端凭据使用都需要人类授权记录。协调者模型的工具调用不能单独满足这些条件。
- Agent Host 为每个挂起的 ACP permission request 保存 `resolver`、原始 request id、可选项和 Run epoch。Question Tray 只是投影；人的回答直接回应原 ACP permission RPC，回答成功后才更新 Question 和审计。`run.deliver(steer)` 只用于插话，不用于权限回调。
- ACP 不支持挂起权限响应或能力探测失败时，不静默降级到自动允许；Run 进入 `permission_unsupported` 或 `waiting_on_you`，由人决定停止或切换到隔离且明确授权的模式。

## 后果

- projects-mcp、DSH 原生工具和 ACP 薄代理必须共享同一套 Engine 授权函数。
- 需要测试 reviewer、跨仓库、过期 token、撤销 epoch、权限允许/拒绝/取消和 handoff 竞态。
- 权限 UI 的批准结果与底层协议动作一一对应，审计可以回答「批准了哪一个动作」。

## 备选方案

- 只按 Task 绑定 bearer token：实现简单，但无法表达 reviewer 只读、Attempt 隔离和撤销，放弃。
- 把权限回答继续当作 steer：无法回应 ACP 挂起 RPC，可能重复 prompt 或留下半写文件，放弃。
