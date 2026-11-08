# 0012 给所有执行者同一套工具：projects-mcp
- 状态：Accepted（Run capability 授权与 permission 回调由 [0014](0014-run-capability-and-acp-permission.md) 修订）
- 日期：2026-11-08

## 背景
提问、回报、读写 Library 等工具原本只为 DSH worker 设计；外部执行者只能通过 MCP 获得宿主工具（ACP v2 也把 client 侧工具统一到 MCP）。

## 决定
- 工具：`ask_human`、`task_report`、`context_read / search / propose / dispute`、`artifact_put`（远端位置内部调 `LocationProvider.pullFile` 拉回本机 `<context_dir>/artifacts/<task>/`）。
- `projects.sqlite` 由 DSH 主进程内的 `Engine` 独占写锁，任何外部 MCP 子进程不得直接打开 SQLite。
- DSH 原生会话以 `agent.ctx.tools.register` 注册同一实现，进程内直调 `Engine`。外部执行者按 `initialize` 的 `mcpCapabilities` 分流：声明 `http: true` 的本机执行者直连本机 HTTP `/projects/mcp`；仅支持 stdio 的本机执行者挂无状态薄代理 `projects-mcp-stdio.mjs`（经本机 Loopback HTTP `/projects/mcp` 转发给主进程 `Engine`）。所有远端执行者（SSH、Docker、云沙箱）统一淘汰 `ssh -R` 远程端口转发（S6 实测受管网关如 Instabox 会拒绝 `-R`），一律经 `LocationProvider` 第二条 `exec` stdio 通道在远端运行 `projects-mcp-bridge.mjs` 桥接回本机 `src/executors`。任一回路都携带每次运行的不可猜 capability token；Engine 对每条命令再校验 role、repo/path scope、write、epoch、过期与 Host lease，token 本身不授予权限。
- 工具只提交命令，由 Engine 校验并写入。

## S5/S6 实测（2026-11-08 初跑，2026-11-09 修复复跑）

- **stdio 是可用回路；初跑的「未挂载」是客户端请求形状错误**。ACP SDK 1.4.0 的 `session/new` 用 `zNewSessionRequest` 校验，`mcpServers` 经 `requiredDefaultOnError(vecSkipError(zMcpServer), () => [])` 处理：任何不符合 schema 的条目被静默丢弃，整个列表失败还会回落成空数组（`@agentclientprotocol/sdk/dist/schema/zod.gen.js:2425`、`dist/schema-deserialize.js:93-97`）。stdio 条目要求 `args` 与 `env` 都是必填数组（`zod.gen.js:2390-2396`）；初跑脚本只传 `name/command/args`、缺 `env`，条目在进入 dsh-acp 前就被丢掉，`mountAcpMcpServers` 循环 0 次、`failOnStartupError` 从未执行。这解释了三轮观测到的「session/new 成功、无子进程、模型看不到工具、不存在的 command 也被接受」——不是 `dsh --profile acp` 不支持 stdio。
- **补齐 `env: []` 后 stdio 回路实测打通**（S5 t2，2026-11-09）：`tool_call.title` 精确为 `mcp__projects__projects_echo`、`rawInput.text='spike-s5-probe'`，本机假 Engine `/calls` 收到该调用，薄代理日志出现对应 `tools/call`；同名 server、相对路径 `command`、不存在的 `command` 三个反例分别报 `-32602 duplicate normalized name`、`-32602 must be an absolute path`、`-32603`（`failOnStartupError` 生效）。本机仅 stdio 的执行者因此可以挂 `projects-mcp-stdio.mjs`。
- **HTTP 直连分支未实测**：本机「`http: true` 直连 `/projects/mcp`」没有在 spike 中跑过（假 Engine 未实现 HTTP MCP 端点），按能力声明保留为首选，落地前须补测。
- **远端统一走第二条 exec 通道（移除 `ssh -R`）**：受管 SSH 网关拒绝 `ssh -R`（`phase-a/rpc.stderr.log` 报 `remote port forwarding failed`；手动复测 `-R 8931`、`-R 18931` 均失败而端口空闲；dsh-02 的 sshd 默认允许转发，推断拒绝在网关侧）。v5 架构因此彻底移除 `ssh -R` 分支，让 SSH、Docker、云沙箱共享唯一的 `projects-mcp-bridge.mjs`（经 `LocationProvider` 第二条 `exec` stdio 通道回连本机）。桥接回路在 M4 实现并完成闭环验证。

## 后果
- 所有执行者的行为在 Projects 里语义一致；执行者不支持 MCP 时降级为「只读任务 + 结束时解析最终消息」并在 UI 标注。
- 执行者的 `mcpCapabilities` 必须先于 Run 启动读取并落盘；不能按「DSH 原生 / ACP」二选一固定回路。
- ACP 客户端构造 `mcpServers` 必须按 ACP schema 显式带 `env`（stdio）或 `headers`（http）；缺字段不会报错，条目会被 SDK 静默丢弃，`session/new` 仍然成功。
