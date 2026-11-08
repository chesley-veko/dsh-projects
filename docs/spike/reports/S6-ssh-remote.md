# S6 SSH 远程执行与 MCP 回路

- 结论：未通过（远程执行与断线恢复可用；MCP 回路在远端仍未打通。2026-11-09 已把「未挂载」的根因从「agent 不支持 stdio」纠正为「客户端请求缺 `env`，条目被 ACP SDK 静默丢弃」，并用本机同一构造复验通过；远端因 `ssh -R` 被网关拒绝，仍未实测重跑）
- 执行者：Muse 浏览器任务（dsh-01 终端） 日期：2026-11-08（原轮次）/ 2026-11-09（根因修正）
- 基线：deepseek-harness tag `dsh-v0.2.2-rc.1`（commit 66491b05）；live 实测：dsh-01 与 dsh-02 均为 dsh 0.2.2-rc.1，Node 均为 v22.23.3（dsh-02 npm 10.9.9），dsh-01 内核 Linux 6.18.60-instabox；模型 deepseek-v4.1-flash（acp profile 的 opencode-go 路由）。版本记录见 `spikes/s6/evidence/20261108-1327-s6/versions-local.json` 与 `remote-check-preflight.txt`（gitignored）
- 实验代码：`spike/s6-ssh-remote`，本报告的脚本修正（`protocolVersion` 数字、stdio 条目补 `env: []`、工具调用精确匹配）与报告同一提交；原 live 运行基线 b0884bf
- 规范轮次：`spikes/s6/evidence/20261108-1327-s6/`（2026-11-08 13:27–13:31 UTC）。另有两轮被阻断：`20261108-1321-s6`（initialize -32602）、`20261108-1325-s6`（prompt -32603 凭据缺失；阶段 B 无 summary.json）

## 结论摘要（3 句以内）

远程 SSH + ACP 执行与 30 秒断线恢复已验证可用；MCP 回路未打通的原因有两层：客户端 `session/new` 的 stdio 条目缺 ACP SDK 必填的 `env: []`，条目被静默丢弃（这是「agent 看不到工具、不存在的 command 也被接受」的直接原因，本机同一构造补 `env` 后已复验通过），以及本 SSH 网关拒绝 `ssh -R` 端口转发（即使挂载成功，远端 proxy 也回连不到本机假 Engine）。远端重跑需改走 exec stdio 桥接（`projects-mcp-bridge.mjs`），本 spike 未实现、未验证。

## 逐项结果

| 检查项 | 结果 | 证据链接 | 备注 |
|---|---|---|---|
| 远程 initialize（ssh host -- dsh --profile acp） | 通过 | `evidence/20261108-1327-s6/phase-a/rpc.jsonl` | protocolVersion=1，agent=deepseek-harness-acp；能力声明原样存档于 summary.json |
| 远程 session/new + MCP 回路（ssh -R 转发本机假 Engine） | 未通过 | `evidence/20261108-1327-s6/phase-a/`、假 Engine 日志 | 本机假 Engine 收到 0 次调用。旧结论「agent 不支持 stdio」已被 2026-11-09 根因修正推翻：条目缺 `env` 被 SDK 丢弃 |
| 断线 30 秒：分区前开始的长 prompt | 部分通过 | `evidence/20261108-1327-s6/phase-b/rpc.jsonl`、`remote-check-during.txt` | SIGSTOP 本机 ssh 31.37 秒；回合在恢复后明确结束，但 120 秒 `projects_sleep` 并未真正执行（MCP 未挂载） |
| 断线 30 秒：分区中途发出的 prompt | 未通过 | `evidence/20261108-1327-s6/phase-b/` | 回合结束（end_turn），但 echo 调用未到达假 Engine（MCP 未挂载） |
| 恢复后 MCP 回路与会话健康 | 部分通过 | `evidence/20261108-1327-s6/phase-b/` | 恢复后 OK prompt 正常完成；MCP 回路仍不通（同上） |
| 本机进程退出后远端进程残留 | 通过（无测试残留） | `remote-check-after-local-exit.txt`、`remote-check-final.txt` | 远端仅剩 lab 服务进程（superagent dsh 与 tmux）；测试用的 dsh --profile acp 已退出 |
| 外部执行者变体（S5 最佳者） | 未测 | — | S5 当时 t4 未通过且外部凭据未就绪，不满足运行条件 |

## 阶段 A 结论：未通过（根因已修正）

- initialize 通过：protocolVersion=1（数字），agent=deepseek-harness-acp；能力声明原文为 `mcpCapabilities {"http": true}`、`promptCapabilities {"image": true, "audio": false}`、`sessionCapabilities {"close": {}, "list": {}, "resume": {}}`。`mcpCapabilities.http: true` 表示**另外支持 HTTP 传输**，不代表只支持 HTTP、不支持 stdio；stdio 是 ACP 的默认传输。
- session/new 通过：sessionId=755a0941-b23c-4c31-a95f-e2139c189c56；prompt 回合正常结束（stopReason=end_turn）。
- MCP 回路未打通：三轮运行中本机假 Engine 收到的调用数均为 0（fake-engine.jsonl 仅有启动行；/calls 返回空）。agent 回复明言其工具清单中没有 projects_echo，只有 bash、read、write、grep 等内置工具。
- 旧方法学问题（已修）：「远端执行者发起了 projects_echo 调用」检查用 `JSON.stringify(t).includes('projects_echo')` 子串匹配，命中的是一次 bash 工具调用（agent 用 grep 在远端文件系统里查字符串），属假阳性；本提交改为按 `tool_call.title === 'mcp__projects__projects_echo'` 精确匹配，并增加 `rawInput.text` 校验与 bash 调用数对照。
- 反例修正：旧轮次「session/new 传入不存在的 command 也被接受」不是「服务端不校验」，而是条目缺 `env` 被 ACP SDK 静默丢弃；条目合法时 `failOnStartupError` 会让 session/new 直接失败（本机复验为 -32603）。详见「根因分析」。

## 阶段 B 结论：部分通过（断线恢复通过，MCP 载荷不成立）

- SIGSTOP 本机 ssh 进程 31.37 秒（ssh pid 379077），分区期间第二通道 remote-check 正常（2026-11-08T13:28:48Z，dsh-02 侧 lab 正常、3082 监听正常）。
- 睡眠完成情况：分区前开始的长 prompt 在恢复后明确结束（stopReason=end_turn，开始后 44.0 秒）。但 120 秒 projects_sleep 并未真正执行——该工具不在 agent 工具清单中，agent 在 44 秒内以文本结束回合。所谓「睡眠完成」不成立。
- 送达情况：分区中途发出的 echo prompt 回合结束（stopReason=end_turn），但其 projects_echo 调用未到达假 Engine（未见该调用）。与阶段 A 同一根因。
- 恢复情况：恢复后新一轮 OK prompt 正常完成（stopReason=end_turn）；恢复后远端进程状态正常（2026-11-08T13:29:27Z）。
- 残留情况：本机进程退出（code=0）后，远端无测试残留——remote-check 仅剩 lab 服务进程（superagent dsh 与 tmux）；测试用的 dsh --profile acp 已退出。
- 本提交已给阶段 B 补上精确工具名断言（`mcp__projects__projects_sleep`、`mcp__projects__projects_echo`）：MCP 未挂载时这些检查会如实失败，不会再被 bash 子串蒙混。

## 外部执行者变体：未测

不满足运行条件：S5 当时未通过（t4 仍 BLOCKED），且外部执行者凭据未就绪。按 README 准备步骤，只在 S5 通过且凭据就绪时跑；本轮记「未测」，未尝试任何 Claude/Codex 登录，也未使用除 SSH 目标外的任何凭据。

## 强变体（控制台暂停 dsh-02 整机 30 秒）：未尝试

阶段 B 的 ssh 级分区已验证分区恢复能力（长 prompt 回合明确结束、恢复后 OK prompt 正常、第二通道全程可用）；本轮 verdict 由 MCP 回路未打通与 -R 转发被拒决定，整机暂停不能改变 verdict；暂停 dsh-02 会中断其 lab 服务（tmux dsh-superagent，3082），无 verdict 收益，故不尝试。

## 根因分析

1. **MCP 条目被 ACP SDK 静默丢弃（主因，2026-11-09 修正）**。dsh-acp 的挂载链路本身完整且与已安装产物一致：`session/new` 把 `params.mcpServers` 传进 `AcpSession.create`（`packages/acp/acp/src/index.ts:212`）→ `composeAgent` 在 Agent 发布前调 `mountAcpMcpServers`（`packages/acp/acp/src/session.ts:82-84`）→ 每个 server `agentCtx.plugin(McpClient, config)`，stdio 配置带 `failOnStartupError: true`（`packages/acp/acp/src/mcp.ts:26-32`、`:48-57`）→ mcp-client `apply` 是 async，`await connection.ready` 后按 `failOnStartupError` 抛错（`packages/mcp/mcp-client/src/index.ts:154-202`）。已安装产物逐行一致：`@deepseek-ai/dsh-acp/lib/index.js:216-218`、`:232-238`、`:619`、`:1127`；`@deepseek-ai/dsh-mcp-client/lib/index.js:810-833`。真正的断点在 ACP SDK 1.4.0 的入参校验：`session/new` 用 `zNewSessionRequest`（`@agentclientprotocol/sdk/dist/acp.js:595`），`mcpServers` 为 `requiredDefaultOnError(vecSkipError(zMcpServer), () => [])`（`dist/schema/zod.gen.js:2425`）；`vecSkipError` 把每个不合 schema 的条目 `.catch` 后过滤掉（`dist/schema-deserialize.js:93-97`），整个列表失败还会回落 `[]`（`:4-13`）。stdio 条目要求 `args: string[]` 与 `env: EnvVariable[]` 必填（`dist/schema/zod.gen.js:2390-2396`），2026-11-08 的 S6 脚本只传 `name/command/args`，没传 `env` → 条目在进入 dsh-acp 之前已被丢弃。于是 `mountAcpMcpServers` 循环 0 次、`failOnStartupError` 从未执行——session/new 成功、无子进程、模型看不到工具、不存在的 command 也被接受。这与本轮全部观测（本机与远端双侧、proxy 无启动痕迹、无 spike-scratch、无 projects-mcp-remote.jsonl）一致。
2. **该 SSH 路径拒绝远程端口转发（-R）**。三轮运行的 `phase-a/rpc.stderr.log` 均有 `Warning: remote port forwarding failed for listen port 8931`；手动复测 `-R 8931` 与 `-R 18931` 均失败，端口当时空闲；dsh-02 的 `/etc/ssh/sshd_config` 相关项均为注释（默认允许转发），故拒绝来自网关侧。即使 MCP 挂载成功，远端 proxy 的 `--engine-url http://127.0.0.1:8931` 在 dsh-02 上也没有服务可连，回路仍断。
3. 脚本缺陷（已修）：initialize 的 protocolVersion 误用字符串 `1.0`，ACP 要求数字；服务端以 -32602 拒绝。S5 首轮同样中招；本提交改为数字 1 且断言类型为 number。
4. 环境缺口（dsh-02，未再动）：非交互 SSH 的 PATH 不含 `/opt/npm/bin`，且 ssh 会话无 `OPENCODE_API_KEY`；两项已在 dsh-02 `~/.bashrc` 顶部补齐（PATH 与从 key 文件读取的引用，不写明文）。
5. 阶段 B 第二轮（20261108-1325-s6）无 summary.json：其 sleep prompt 因 -32603 被拒后，未处理的 rejection 使 node 进程崩溃，未及写 summary。凭据修复后第三轮不再出现。

## MCP 回路的路由分流（2026-11-09 补齐）

按执行者的 `initialize.mcpCapabilities` 与位置分流，默认三种：

| 执行者 | 判据 | 路由 | 状态 |
|---|---|---|---|
| 本机、支持 HTTP MCP 的执行者 | `agentCapabilities.mcpCapabilities.http === true` | 直连本机 HTTP `/projects/mcp`（生产设计中薄代理的 HTTP 端点） | 未实测：本 spike 的假 Engine 只有 `/engine/call`，没有实现 `/projects/mcp` 的 HTTP MCP 端点 |
| 本机、仅 stdio 的执行者 | 无 http 能力，或按最小依赖 | 挂 `projects-mcp-stdio.mjs`（stdio，`command` 为绝对路径，必须带 `env: []`） | 已实测：S5 t2（2026-11-09）tool_call title=`mcp__projects__projects_echo`、假 Engine 收到调用、薄代理日志出现 `tools/call` |
| 远端 SSH 执行者 | 经 `ssh host -- dsh --profile acp` | 默认走 exec stdio 桥接 `projects-mcp-bridge.mjs`（ADR-0009:17、ADR-0012:11：经 `LocationProvider` 的第二条 `exec` stdio 通道回传本机 `executor-host`，携带每次运行的 capability token） | 未实现、未验证；本 spike 证明 `ssh -R` 在本网关被拒，远端不能直接回连本机 loopback |

`session/new` 的校验语义（本轮实测）：

- 条目 schema 合法时，真的会去挂载；命令不存在或连接失败会按 `failOnStartupError` 让 session/new 失败（本机复验 `-32603 Internal error`）。
- 条目 schema 不合法（如缺 `env`）时，SDK 静默丢弃，session/new 成功但什么都没挂载——**「session/new 成功」不能作为「已挂载」的证据**。
- 判据必须以「工具表可见 / 首轮挂载探针 / 精确工具名（`mcp__<server>__<tool>`）的 tool_call」为准，不能以 session/new 请求参数或返回成功为准。

## 本地复现对照（2026-11-09，非 SSH）

为分离 SSH/-R 因素，在 dsh-01 本地用 S5 t2 的同一构造（同一个薄代理、同样的 `mcpServers`，仅补 `env: []` 并把工具名断言改为精确匹配）直连本地 `dsh --profile acp`：initialize 与 session/new 通过，tool_call title `mcp__projects__projects_echo`，假 Engine 收到 `projects_echo(spike-s5-probe)`（callId=2），薄代理日志出现同一 `tools/call`；反例：同名 server -32602、相对路径 command -32602、不存在的 command -32603、缺 env 的同一 command 成功但不挂载。证据：`spikes/s5/evidence/20261108-1658/t2/`（在 `spike/s5-acp-matrix` 分支工作区，gitignored）。结论：MCP 回路失败与 SSH/-R 无关的那一半（「挂载」）已被本机对照打通；远端仍受 `-R` 限制。

## 反例与故障场景

- 远端不存在的 command（session/new 应失败）：旧轮次「未通过（接受）」的判读已纠正——缺 `env` 时条目被丢弃，改为合法条目后本机复验为 -32603；远端未重跑。
- 分区中途发出的 prompt（恢复后是否送达）：回合结束但调用未送达（MCP 未挂载）。见阶段 B。
- 本机退出后远端残留检查：通过——无测试残留，仅 lab 服务进程。见阶段 B。
- 强变体：控制台暂停 dsh-02 整机 30 秒：未尝试（见上）。
- 额外故障：三轮 -R 转发失败（见根因 2）；第二轮阶段 B 脚本崩溃无 summary（见根因 5）；第一轮 initialize -32602（见根因 3）；第二轮 prompt -32603（见根因 4）。

## 对设计的影响（需改的 ADR 或文档，给出建议措辞，不直接改 ADR）

- **ADR-0016（lease 与回收）**：
  - 「远端 MCP 是否已加载不得以 `session/new` 请求参数或返回成功为准；必须以工具表可见或首轮挂载探针为准（ACP SDK 会静默丢弃 schema 不合法的条目，session/new 仍返回成功）。」
  - 「远程 Run 的 MCP 回路不得默认依赖 `ssh -R`：本 spike 实测该网关拒绝远程端口转发；应采用 `projects-mcp-bridge.mjs` 的 exec stdio 桥接（第二条 exec 通道）或出站 HTTPS，并为桥接通道建立独立的 lease 与回收。」
- **ADR-0015（断线后 effect 状态）**：建议措辞——需区分「prompt 回合结束」与「effect 实际执行」；分区中途的 prompt 回合可以 end_turn，但其工具调用从未产生；恢复后的对账应以 effect 的实际到达（Engine 收到）为准，而非回合状态。
- **ADR-0014（远端 Run capability）**：建议措辞——能力声明应作为远端 Run 的前置校验；`mcpCapabilities.http: true` 是「额外支持 HTTP」而非「仅支持 HTTP」；stdio 条目必须带 `env: []`；客户端必须以精确工具名的 tool_call 或挂载探针验收，不能把 `session/new` 成功当作 capability 成立。
- **ADR-0012（Projects MCP）**：建议措辞——MCP 路由按执行者能力分流：本机 http 执行者直连 `/projects/mcp`；本机仅 stdio 执行者挂 `projects-mcp-stdio.mjs`；远端 SSH 执行者走 exec stdio 桥接 `projects-mcp-bridge.mjs`（不使用 `ssh -R`）。

## 未完成与推断点（明确标注）

- 远端未重跑（dsh-02 已暂停，按本轮要求不启动/不连接）；本报告的根因修正基于本机对照 + 已安装产物/源码对照，远端行为按同构推断。
- HTTP MCP 直连 `/projects/mcp` 未实测（假 Engine 未实现该端点）；exec stdio 桥接 `projects-mcp-bridge.mjs` 未实现、未验证。
- 强变体未尝试；外部执行者变体未测（S5 未完成外部列 + 凭据未就绪）。
- 「-R 拒绝来自网关侧」为推断：dsh-02 sshd 默认允许转发、两端口均失败、端口空闲；未获网关配置原文。
- 远端 dsh-02 的 `~/.bashrc` 曾补 PATH 与 OPENCODE_API_KEY 引用（已备份 `~/.bashrc.bak-s6`）；dsh-02 已暂停，未再触碰。

## 运行偏差与修复（本提交）

- 脚本修正（已提交）：`spikes/s6/s6-remote-roundtrip.mjs`、`spikes/s6/s6-disconnect.mjs` — protocolVersion 由字符串 `1.0` 改为数字 1 且断言为 number；stdio MCP 条目补 `env: []`；工具调用断言改为精确工具名（`mcp__projects__projects_echo`、`mcp__projects__projects_sleep`）并校验 `rawInput`，禁用 JSON 子串；新增「缺 env 被静默丢弃」反例；`node --check` 全过。
- `spikes/s6/README.md`：补充 MCP 条目形状与传输分流说明。
- 证据卫生：summary.json 的 executorCmd 与 remote-check-*.txt 的 ps 输出含有 SSH 目标与进程命令行原文（含凭据），均已 gitignore、未提交；分享前须脱敏；建议后续 remote-check.sh 不再输出含凭据的命令行。

## 复现步骤

前置：dsh-02 侧 PATH/OPENCODE_API_KEY 就绪（见「运行偏差与修复」）；材料按 `spikes/s6/README.md` §3 备齐（spikes/s5 的 rpc-client/test-harness/proxy 与 spikes/s6 同时存在）。

```sh
# dsh-01 上
cd <spikes/s6 所在目录>
./run-s6.sh --ssh-target "<user>@ssh.instabox.sh" \
  --remote-node "$(ssh -o BatchMode=yes -p 2222 <user>@ssh.instabox.sh command -v node)" \
  --remote-lab /data/home/workspace/dsh-superagent-lab \
  --remote-workdir /data/home/workspace/spike-s6-work
```

注：本轮已修正协议/条目形状，但本 SSH 网关仍拒绝 `-R`，远端 MCP 回路复现结果预计仍为「挂载成功、回连失败」；结论与本报告一致。若要打通，先实现 exec stdio 桥接再重跑。

## 审核

（待审核后填。）
