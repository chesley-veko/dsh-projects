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
- 远端 Run 启动前必须以工具表可见或首轮挂载探针确认 MCP 已挂载。`session/new` 返回成功不得作为「已挂载」或 lease 生效的依据：ACP SDK 1.4.0 会把 schema 不合法的 `mcpServers` 条目静默丢弃（stdio 条目缺 `env` 即属此类），服务端随后按空列表继续；只有条目合法时，`failOnStartupError` 才会让不存在的 `command` 使 `session/new` 失败。

## S5/S6 实测（2026-11-08 初跑，2026-11-09 修复复跑）

- **权限回调已验证可用（2026-11-09 四轮）**：`session/request_permission` 在 prompt 开始后 8.7–15.2 秒到达，选项固定为 `allow-once` / `reject-once`。实际行为：allow → 越界写以 `danger-full-access` 升级重试并写出目标文件；reject → 工具返回 `the user rejected escalating this operation`，文件不写；cancel（`{outcome:'cancelled'}`）→ 升级重试以工具错误结束，`stopReason` 仍是 `end_turn`，文件不写；未知 optionId → 按 rejected 处理（`packages/acp/acp/src/index.ts:174` 只认 `allow-once`，fail closed）。
- **触发条件很窄**：默认 preset 是 `workspace-write` + `approval: ask`，workspace 内写/删免审批；只有越界写被 fs 沙箱拒绝、模型带 `sandbox_permissions` 升级重试时才走 `approveEscalation` → `user-approval` → ACP `session/request_permission`。因此不能把普通写操作当成一次用户确认；若产品要求「每次写都确认」，现成 preset 表没有该组合，须新增 preset 或改 approval 语义。
- **挂载校验**：`session/new` 只在条目通过 ACP SDK schema 后才会尝试挂载；条目合法但命令不存在时 `failOnStartupError` 使调用失败（本机复验 `-32603`）。旧观测「不存在的 command 也被接受」是缺 `env` 的条目被 SDK 丢弃，不是服务端跳过校验。挂载证据只能取工具表可见或精确工具名（`mcp__<server>__<tool>`）的 `tool_call`。
- **能力声明语义**：`mcpCapabilities.http: true` 表示额外支持 HTTP 传输，不代表只支持 HTTP；stdio 是默认传输，本机复跑已打通（[S5 报告](../spike/reports/S5-acp-matrix.md)）。

## 后果

- projects-mcp、DSH 原生工具和 ACP 薄代理必须共享同一套 Engine 授权函数。
- 需要测试 reviewer、跨仓库、过期 token、撤销 epoch、权限允许/拒绝/取消和 handoff 竞态。
- 权限 UI 的批准结果与底层协议动作一一对应，审计可以回答「批准了哪一个动作」。
- `session/request_permission` 与 MCP 挂载探针已在 dsh-acp 上实测通过；Claude Code / Codex 两列仍缺凭据未测，权限与挂载验收须按执行者逐项复验，不能跨执行者外推。

## 备选方案

- 只按 Task 绑定 bearer token：实现简单，但无法表达 reviewer 只读、Attempt 隔离和撤销，放弃。
- 把权限回答继续当作 steer：无法回应 ACP 挂起 RPC，可能重复 prompt 或留下半写文件，放弃。
