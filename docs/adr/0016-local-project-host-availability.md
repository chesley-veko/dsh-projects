# 0016 本机 Project Host 是远端执行的控制面
- 状态：Accepted
- 日期：2026-11-08

## 背景

产品选择不托管云服务，Coordinator 和 Project SQLite 留在 DSH 桌面；远端 worker 的 MCP、Question、Library 和 effect 回执通过隧道回到本机。用户把云端用于长时间和无人值守任务，但当前架构没有承诺桌面离线后的持续管理能力。

## 决定

- 首版保持本机 Project Host，不引入托管控制面。要完整管理远端 Run，Project Host 必须在线；UI、启动摘要和环境设置明确显示该要求。
- Host 断连期间不得将远端 Run 标成 verified、完成或已投递。最后一次确认状态记为 stale/host_unreachable；未确认的权限和 effect 进入 `unknown`，不自动重放。
- 所有远端 Run 使用可撤销的 Run capability 和 host heartbeat/lease。lease 失效后远端 adapter 停止接受新 MCP 命令并按 provider 能力安全停止进程；无法确认进程已停止时保留资源占用并阻止 Attempt 重启。
- Host 恢复后先查询/恢复 Run 和 effect 状态，再重新开放写命令。UI 在此之前显示「等待本机 Project Host 对账」，不静默切换到另一执行位置。
- MCP 回路按执行者 `initialize` 的 `mcpCapabilities` 分流：本机执行者 `http: true` 时直连本机 HTTP `/projects/mcp`，仅 stdio 时挂 `projects-mcp-stdio.mjs`（必填 `args` 与 `env: []`）。所有远端执行者（SSH、Docker、云沙箱）统一淘汰 `ssh -R`，一律走 `LocationProvider` 第二条 `exec` stdio 通道，以 `projects-mcp-bridge.mjs` 桥接回本机 `src/executors`。
- MCP 挂载是 lease 与回收的前提，但不能用 `session/new` 成功来证明：ACP SDK 会丢弃 schema 不合法的 `mcpServers` 条目（stdio 缺 `env` 即被丢弃），随后服务端按空列表继续。必须以工具表可见或首轮挂载探针通过为准；未通过时 Run 不得进入 `verified`。
- 若后续产品要求电脑休眠/退出后仍可完整协调，必须另立 ADR 决定常驻服务或用户自托管 Host；不把当前 stdio 隧道描述为独立云端控制面。

## S5/S6 实测（2026-11-08 初跑，2026-11-09 修复复跑）

- **MCP 回路**：stdio 回路在补齐 ACP SDK 必填的 `env: []` 后实测打通（本机 S5 t2：精确工具名 `mcp__projects__projects_echo`、假 Engine 收到调用、薄代理日志有 `tools/call`）；HTTP 直连分支未实测，按能力声明保留。远端 `ssh -R` 被网关拒绝（`remote port forwarding failed`，手动复测两个端口均失败），远端默认回路改走第二条 `ssh exec` stdio 桥接（`projects-mcp-bridge.mjs`），未实现、未验证（[S6 报告](../spike/reports/S6-ssh-remote.md)）。
- **断线行为**：SIGSTOP 本机 ssh 31.37 秒后，分区前开始的长 prompt 以 `end_turn` 结束，但 120 秒 `projects_sleep` 未执行；分区中途的 echo prompt 以 `end_turn` 结束，调用未送达；恢复后 OK prompt 正常完成；本机进程退出后远端无测试残留（仅 lab 服务进程）。这支持「Host 断连期间不得标 verified/完成/已投递」，同时说明 `end_turn` 不能当作 effect 已执行的证据。
- **未测**：控制台暂停 dsh-02 整机的强变体；Claude/Codex 外部执行者变体（缺凭据）。远端桥接回路落地前，远端 Run 仍只能进入 `unknown` / `stale`。

## 后果

- 云端是用户自带的执行算力，不等于无人依赖的云服务；M4 验收包含 Host 断线和恢复。
- 用户必须在长时间远端任务期间让本机 DSH Host 可用，或者把 DSH Host 部署在用户自己的常驻机器上。
- lease、token revoke、reconnect reconciliation 和远端进程回收需要由 LocationProvider / ExecutorDriver 协同实现。
- 本机 stdio MCP 回路已实测可用；远端 MCP 回路（exec stdio 桥接）与断线对账仍缺实测闭环，在此之前远端 Run 只能进入 `unknown` / `stale`，不能算 `verified`。

## 备选方案

- 默认承诺桌面关闭后任务照常受管理：需要独立常驻控制面和数据同步，超出当前不托管范围，暂不采用。
- 断线后让远端进程无限运行：会失去审批、状态、预算与回收控制，放弃。
