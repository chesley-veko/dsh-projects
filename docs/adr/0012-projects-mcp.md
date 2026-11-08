# 0012 给所有执行者同一套工具：projects-mcp
- 状态：Accepted（Run capability 授权与 permission 回调由 [0014](0014-run-capability-and-acp-permission.md) 修订）
- 日期：2026-11-08

## 背景
提问、回报、读写 Library 等工具原本只为 DSH worker 设计；外部执行者只能通过 MCP 获得宿主工具（ACP v2 也把 client 侧工具统一到 MCP）。

## 决定
- 工具：`ask_human`、`task_report`、`context_read / search / propose / dispute`、`artifact_put`（远端位置内部调 `LocationProvider.pullFile` 拉回本机 `<context_dir>/artifacts/<task>/`）。
- `projects.sqlite` 由 DSH 主进程内的 `Engine` 独占写锁，任何外部 MCP 子进程不得直接打开 SQLite。
- DSH 原生会话以 `agent.ctx.tools.register` 注册同一实现，进程内直调 `Engine`；本地 ACP 执行者在 `session/new.mcpServers` 中拿到无状态薄代理 `projects-mcp-stdio.mjs`（经本机 Loopback HTTP `/projects/mcp` 转发给主进程 `Engine`）；远端 ACP 执行者经 `ssh -R` 回路转发或沙箱内 `projects-mcp-bridge.mjs`（经 `LocationProvider` 第二条 `exec` stdio 通道桥接回本机 `executor-host`），携带每次运行的不可猜 capability token；Engine 对每条命令再校验 role、repo/path scope、write、epoch、过期与 Host lease，token 本身不授予权限。
- 工具只提交命令，由 Engine 校验并写入。

## 后果
- 所有执行者的行为在 Projects 里语义一致；执行者不支持 MCP 时降级为「只读任务 + 结束时解析最终消息」并在 UI 标注。
