# 0012 给所有执行者同一套工具：projects-mcp
- 状态：Accepted
- 日期：2026-11-08

## 背景
提问、回报、读写 Library 等工具原本只为 DSH worker 设计；外部执行者只能通过 MCP 获得宿主工具（ACP v2 也把 client 侧工具统一到 MCP）。

## 决定
- 工具：`ask_human`、`task_report`、`context_read / search / propose / dispute`、`artifact_put`。
- DSH 原生会话以 `agent.ctx.tools.register` 注册同一实现；ACP 执行者在 `session/new.mcpServers` 中拿到 projects-mcp（本地 stdio，远端经隧道的 streamable HTTP，带每次运行一次性 token，只能访问所属 Task）。
- 工具只提交命令，由 Engine 校验并写入。

## 后果
- 所有执行者的行为在 Projects 里语义一致；执行者不支持 MCP 时降级为「只读任务 + 结束时解析最终消息」并在 UI 标注。
