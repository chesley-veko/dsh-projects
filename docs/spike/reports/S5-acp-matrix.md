# S5 本机 ACP 执行者能力矩阵

- 结论：部分完成（`dsh --profile acp` 列 8 项已跑完并附证据；Claude Code 与 Codex 两列缺凭据未测）
- 执行者：C 路（准备）+ dsh-01 live 浏览器任务；首轮 2026-11-08，修复复跑 2026-11-09
- 基线：deepseek-harness tag `dsh-v0.2.2-rc.1`（commit 66491b05，与 0.2.2-rc.1 合入点同版本）；dsh 0.2.2-rc.1（`/opt/npm/bin/dsh`）；Node v22.23.3；npm 10.9.9；Linux 6.18.60-instabox（dsh-01，x86_64）；模型 opencode-go / deepseek-v4.1-flash（`DSH_HOME=<lab> dsh --profile acp --dump-config` 实测）
- 实验代码：`spike/s5-acp-matrix`，本报告的脚本修复与报告同一提交；决定性证据 `spikes/s5/evidence/20261108-1658/`（gitignored，位于 dsh-01 的 `~/workspace/dsh-projects-s5run` 克隆）

## 结论摘要（3 句以内）

`dsh --profile acp` 的 ACP 基础能力可用：initialize、resume/load、cancel、reconcile 语义均支持；MCP 挂载在客户端按 ACP 1.4.0 schema 补上 `env: []` 后真实打通（`tool_call` 的 title 精确为 `mcp__projects__projects_echo`，本机假 Engine 收到调用，薄代理日志出现该 `tools/call`）；权限请求用「越界写 + 升级重试」构造后四轮全部触发，allow/reject/cancel/bogus 的实际行为已逐条记录。Claude Code 与 Codex 两格因缺凭据未测。

## 逐项结果

决定性一轮：2026-11-09 修复复跑 `evidence/20261108-1658/`（t2 一轮、t4 四轮）；t1/t3/t5/t6/t7/t8 沿用 2026-11-08 的 `evidence/20261108-0342-dsh-acp/`。矩阵本身就是结论。

| 检查项 | dsh --profile acp | claude-agent-acp | codex-acp | 证据链接 | 备注 |
|---|---|---|---|---|---|
| 1. `initialize` 能力声明 | 支持 | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t1/`、`initialize-dsh-acp.json` | protocolVersion=1（数字）；agentInfo deepseek-harness-acp 0.0.1 |
| 2. `session/new` + MCP 薄代理（列出/调用） | 支持 | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-1658/t2/` | 补 `env: []` 后真实挂载：tool_call title=`mcp__projects__projects_echo`、rawInput.text=`spike-s5-probe`；假 Engine 收到调用（callId=2）；薄代理日志出现 tools/call；bash 工具调用 0 次。反例 A/B/C 均被拒，反例 D（缺 env）被 SDK 静默丢弃 |
| 3. `set_config_option` 切 model / effort，下一轮生效 | 部分 | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t3/` | 未知 model/effort 均被拒 -32602；configOptions 里 model 与 reasoning_effort 均为 current=null、values=[]（路由单模型），切换 SKIP |
| 4. `session/request_permission` 挂起后回应（允许/拒绝/取消） | 支持 | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-1658/t4-allow|reject|cancel|bogus/` | 四轮全部在 prompt 开始后 8.7–15.2s 收到 `session/request_permission`（选项 allow-once/reject-once），挂起 120 秒期间 prompt 未结束；四种回应行为见下「t4 四轮实测」 |
| 5. `session/cancel` 工具调用进行中取消 | 部分 | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t5/` | 两次 cancel 后 stopReason=cancelled、下一轮正常；但模型未调 projects_sleep/slow_write（MCP 当时未挂载），主流程未验证 |
| 6. `session/resume` / `load`，进程退出后续接 | 支持 | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t6/` | 续接后模型记得暗号 BLUEBIRD；`session/load` 报 -32601（确认无此方法） |
| 7. 按外部 id 查询/去重（ADR-0015 探针） | 支持（按当前语义） | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t7/` | 两次相同 session/new 返回两个不同 id（未去重）；编造外部 id resume 被拒；异常：session/list 返回 13 个会话但不含刚建的 s1/s2，待确认 |
| 8. 订阅登录凭据 | 完成（lab 路由可测） | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t8/` | dsh binary=/opt/npm/bin/dsh；两外部执行者 binary=(missing) |

### initialize 能力声明（原文，已脱敏）

```json
{"protocolVersion":1,"agentInfo":{"name":"deepseek-harness-acp","version":"0.0.1"},"agentCapabilities":{"mcpCapabilities":{"http":true},"promptCapabilities":{"image":true,"audio":false,"embeddedContext":false},"sessionCapabilities":{"close":{},"list":{},"resume":{}}},"authMethods":[]}
```

`mcpCapabilities.http: true` 是「支持 HTTP 传输」的附加能力，不表示「只支持 HTTP、不支持 stdio」。

### 凭据缺口

- `claude-agent-acp`：未测（缺凭据）——缺 Claude 订阅登录或 `ANTHROPIC_API_KEY`；被挡住的步骤：进程启动/认证。
- `codex-acp`：未测（缺凭据）——缺 ChatGPT 订阅登录或 `OPENAI_API_KEY`；被挡住的步骤：进程启动/认证。
- `dsh --profile acp`：完整可测（lab opencode-go 路由 + dsh-01 上真 key 文件）。

## 根因与源码核实（2026-11-09，dsh 0.2.2-rc.1）

### A. t4 首轮为何 180 秒一次权限请求都没发

- 默认权限预设就是 `workspace-write`：base bundle 把 sandbox 设为 `workspace-write`、approval 设为 `ask`，并注册同名 preset（`packages/bundle/base/cordis.patch.yml:243-277`）；preset 表本身在 `packages/interaction/permission-presets/src/index.ts:177-192`，默认值解析在 `:219-227`。
- `workspace-write` 的可写根是 workspace + `/tmp` + `os.tmpdir()`（`packages/sandbox/sandbox/src/roots.ts:97-99`）。t4 旧 prompt 让模型在 `/tmp/spike-s5-work`（workspace）内写 `t4-permission-test.txt`、`rm t4-scratch.txt`——都在可写根内，**免审批直接执行**，因此永远不会产生 `approval/request`，也就没有 `session/request_permission`。
- 真正的触发链（四步，全部源码核实 + 2026-11-09 实测）：
  1. 越界写（`/var/tmp/...`）被 fs 沙箱拒绝：`checkedTarget` 抛 `FS_SANDBOX_DENIED`（`packages/fs/fs-sandbox/src/index.ts:156-176`），工具层映射成 `[sandbox: file access denied under workspace-write mode]` + 升级提示（`packages/fs/tool-fs/src/sandbox.ts:127-140`；标记文本在 `packages/sandbox/sandbox/src/escalation.ts:72`、`:85`）。
  2. 模型带 `sandbox_permissions: 'danger-full-access'` + `justification` 重试；`resolvePolicy` 调 `approveEscalation`（`packages/fs/tool-fs/src/sandbox.ts:88-120`；`packages/sandbox/sandbox/src/escalation.ts:172-205`）。
  3. `ctx.approval.request`（`packages/interaction/user-approval/src/index.ts:242`）走 waterfall `approval/request`。
  4. ACP bridge 的 `approval/request` 监听器发出 `session/request_permission`（`packages/acp/acp/src/index.ts:158-175`），选项固定为 allow-once / reject-once（`:167-168`），回应映射为 allowed-once 或 rejected（`:174`）。
- 结论：t4 在 2026-11-08 的失败是**测试构造错误**，不是执行者不支持权限回调。旧报告「180 秒内未触发」的结论已被本轮推翻。

### B. 「MCP 未挂载」的真实原因：ACP SDK 静默丢弃 schema 不合法的条目

dsh-acp 一侧的挂载链路是完整且与已安装产物一致的：

- `session/new` 把 `params.mcpServers` 传进 `AcpSession.create`（`packages/acp/acp/src/index.ts:212`）。
- `composeAgent` 在 Agent 发布前调 `mountAcpMcpServers`（`packages/acp/acp/src/session.ts:82-84`）。
- `mountAcpMcpServers` 对每个 server 执行 `agentCtx.plugin(McpClient, config)`，stdio 配置带 `failOnStartupError: true`（`packages/acp/acp/src/mcp.ts:26-32`、`:48-57`）。
- `mcp-client` 的 `apply` 是 async，`await connection.ready` 后按 `failOnStartupError` 抛错（`packages/mcp/mcp-client/src/index.ts:154-202`）。
- 已安装产物逐行一致：`/opt/npm/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-acp/lib/index.js:216-218`（mount）、`:232-238`（stdio + failOnStartupError）、`:619`（composeAgent）、`:1127`（mcpCapabilities http:true）；`@deepseek-ai/dsh-mcp-client/lib/index.js:810-833`（apply + throw）。

问题在 ACP SDK 1.4.0 的入参校验：

- `session/new` 用 `zNewSessionRequest` 校验（`@agentclientprotocol/sdk/dist/acp.js:595`，解析在 `:558-570`）。
- `mcpServers` 的 schema 是 `requiredDefaultOnError(vecSkipError(zMcpServer), () => [])`（`dist/schema/zod.gen.js:2425`）。
- `vecSkipError` 对每个条目做 `.catch(skippedItem)` 再过滤（`dist/schema-deserialize.js:93-97`）：**任何不符合 schema 的条目都不会报错，而是被静默丢弃**；整个列表解析失败时 `requiredDefaultOnError` 还会回落成 `[]`（`dist/schema-deserialize.js:4-13`）。
- stdio 条目的 schema 要求 `args: string[]` 与 `env: EnvVariable[]` 都是必填（`dist/schema/zod.gen.js:2390-2396`）。2026-11-08 的 t2/S6 只传 `name/command/args`，没传 `env` → 条目在到达 dsh-acp 之前就被丢掉。
- 于是 dsh-acp 收到 `mcpServers: []`，`mountAcpMcpServers` 循环 0 次，`failOnStartupError` 从未执行：session/new 成功、没有子进程、模型看不到工具、不存在的 command 也被接受。这与旧报告观察到的现象完全吻合。

2026-11-09 实测（本地 dsh-01，同一 ACP 客户端）：

- 探针 1：`{command:'/nonexistent/node', args:[], env:[]}` → session/new `-32603 Internal error`（failOnStartupError 生效）。
- 探针 2：`{command:'/nonexistent/node', args:[]}`（无 env）→ session/new 成功，返回 sessionId（条目被丢弃）。
- t2 正式轮：带上 `env: []` 后，薄代理被真实拉起，`tool_call` title=`mcp__projects__projects_echo`、`rawInput.text='spike-s5-probe'`，假 Engine `/calls` 收到该调用，薄代理日志出现 `tools/call`；同名/相对路径/不存在 command 三个反例分别报 `-32602 duplicate`、`-32602 absolute path`、`-32603`。

结论：不是 agent 不支持 stdio MCP，也不是 `@deepseek-ai/dsh-mcp-client` 未加载；是客户端请求形状错误叠加 SDK 的静默降级。修复方式：所有 stdio 条目显式带 `env: []`（http 条目带 `headers: []`），`rawInput`/`title` 断言改为精确工具名。

## 反例与故障场景

- t1：重复 initialize 被拒 -32602 Invalid params；未知方法 `session/nope` 报 -32601 "Method not found"。
- t2：同名 MCP 服务器 → -32602 `duplicate normalized name`；相对路径 `command` → -32602 `must be an absolute path`；不存在的 command（条目合法）→ -32603（failOnStartupError）；同一 command 缺 `env` → session/new 成功但不挂载（SDK 静默丢弃，见根因 B）。
- t3：未知 model 被拒 -32602 `unknown model option: no-such-model-option`；未知 effort 被拒 -32602；反例 B（未知 session）实际被拒 -32602，但错误文本不含 "unknown session"，harness 正则判定过严。
- t4：
  - allow：权限请求 15.2s 到达；回应后 19.9s prompt end_turn；越界写以 `danger-full-access` 重试成功，`/var/tmp/s5-permission-probe.txt` 内容 `s5 permission probe`。
  - reject：8.7s 到达；回应后 6.8s 结束；工具返回 `the user rejected escalating this operation to "danger-full-access"`；文件未写出。
  - cancel：11.3s 到达；回应 `{outcome:{outcome:'cancelled'}}` 后 10.0s 结束，`stopReason=end_turn`（审批取消表现为工具错误，不是 `session/cancel` 的 cancelled）；文件未写出。
  - bogus：9.8s 到达；未知 optionId `no-such-option` 被 dsh-acp 按 **rejected** 处理（`index.ts:174` 只认 `allow-once`，其余一律 rejected），文件未写出——fail closed 行为已验证。
- t5：空闲时 cancel 不破坏会话；连续两次 cancel 正常结束；本轮 MCP 未挂载，sleep 取消的主流程未验证。
- t6：`session/load` 报 -32601；resume 未知 id 报 -32602 "session is not resumable"；错 cwd 报 -32602 "session cwd does not match: /tmp"；已激活会话再 resume 报 -32602 "session is already active"。
- t7：编造外部 id `ext-123` 做 resume 被拒 -32602 "session is not resumable: ext-123"。

## 对设计的影响（需改的 ADR 或文档，给出建议措辞，不直接改 ADR）

- **ADR-0012（Projects MCP）**：
  - 「ACP 客户端向 `session/new` 传 stdio MCP 条目时必须带 `env: []`（http 条目带 `headers: []`）；该字段在 ACP SDK 1.4.0 是必填数组。缺字段不会报错，条目会被 SDK 静默丢弃。」
  - 「MCP 是否挂载不得以 `session/new` 成功为准；必须以工具表可见、首轮挂载探针、或精确工具名（`mcp__<server>__<tool>`）的 `tool_call` 作为判据。」
  - 「dsh-acp 的 `mcpCapabilities.http: true` 只是附加能力声明，不代表仅支持 HTTP；stdio 是默认路径。」
- **ADR-0014（Run capability & ACP permission）**：
  - 「`session/request_permission` 只在审批策略触发时出现：workspace-write 下 workspace 内写/删免审批；只有越界写被沙箱拒绝、模型带 `sandbox_permissions` 升级重试时才会请求。协调者不得把普通写操作等同于一次用户确认。」
  - 「四种回应语义已定：allow-once → 升级只对本次调用生效；reject-once / 未知 optionId → 一律 rejected（fail closed）；`{outcome:'cancelled'}` → 工具错误，回合仍可能 end_turn。设计 lease/审计时按此记录，不要假设 cancel 会让 prompt 进入 cancelled。」
  - 「若 M0 需要『每次写都确认』，现成 preset 表里没有这个组合（workspace-write 的 approval=ask 只对升级生效）；需要新增 preset 或改 approval 语义，不能靠 dsh-acp 现有回调直接实现。」
- **ADR-0015（外部 effect 对账）**：MCP 回路是否真的打通，以「假 Engine/真实 Engine 收到该调用」+「精确工具名的 tool_call」双证据为准，模型 prose 与 `session/new` 成功都不算。

## 未完成与推断项（明确标注）

- Claude Code 与 Codex 两列未测（缺凭据）；macOS 未覆盖（只跑了 Linux）。
- t3 的 model/effort 切换、t5 的工具取消主流程、t7 的 `session/list` 异常仍未补测（本轮范围是 t2/t4 与 MCP 根因）。
- t4 的 2026-11-08 两轮（含备用 prompt 复测）均为「workspace 内写/删」，不能作为「执行者不支持权限请求」的证据；已由本轮四轮推翻并取代。
- 旧证据目录（`evidence/20261108-0324-dsh-acp/`、`0334`、`0331-probe-t2` 等）在 dsh-01 的 `~/workspace/dsh-projects` 工作区（gitignored），本轮证据在 `~/workspace/dsh-projects-s5run` 克隆（gitignored）。
- 推断（未实测）：多模型路由下 configOptions 的切换行为；S5 只跑了 Linux。

## 复现步骤

```sh
# dsh-01 上
export PATH=/opt/npm/bin:$PATH
export DSH_HOME=/data/home/workspace/dsh-superagent-lab
export OPENCODE_API_KEY="$(cat "$HOME/.config/dsh-lab/opencode.env")"   # 仅环境变量，不打印、不落地
cd ~/workspace/dsh-projects-s5run && git checkout spike/s5-acp-matrix
# 先装 lab acp 覆盖层并验证（见 spikes/s5/README.md §3）
mkdir -p /tmp/spike-s5-work
TS=$(date +%Y%m%d-%H%M)
node spikes/s5/t2-session-new-mcp.mjs --executor-cmd "dsh --profile acp" --log-dir ./spikes/s5/evidence/$TS/t2 --cwd /tmp/spike-s5-work --label dsh-acp
for o in allow reject cancel bogus; do
  node spikes/s5/t4-request-permission.mjs --executor-cmd "dsh --profile acp" \
    --log-dir ./spikes/s5/evidence/$TS/t4-$o --cwd /tmp/spike-s5-work --permission-outcome $o --hold-seconds 120 --label dsh-acp
done
# 外部执行者（有凭据后）：
#   ./spikes/s5/run-all.sh --executor-cmd "claude-agent-acp" --label claude-acp
#   ./spikes/s5/run-all.sh --executor-cmd "codex-acp" --label codex-acp
```

## 审核

（Hark 审核后填。）

## t4 复测（2026-11-08，dsh-01）

- 目的：补测 README 备用提示词（写文件、rm 类高敏感命令）；原决定性一轮（20261108-0342-dsh-acp）四轮均 BLOCKED。
- 环境：dsh 0.2.2-rc.1、node v22.23.3；DSH_HOME=/data/home/workspace/dsh-superagent-lab；模型 opencode-go / deepseek-v4.1-flash（lab 路由，dump-config 与 3082 /orchestrator/api/models 均已验证）；lab 服务 3082 正常，未重启。
- 方法：分支脚本未动；仅在 /tmp/s5-fixed 副本上做两个变体（diff 仅 prompt 一行，node --check 通过）：t4-request-permission-write.mjs（写文件）、t4-request-permission-rm.mjs（rm）。分配：allow-once 与 cancel 用写文件，reject-once 与 bogus 用 rm；每轮 --hold-seconds 120，权限请求等待上限 180 秒；工作目录 /tmp/spike-s5-work；rm 目标为每轮前新建的一次性 t4-scratch.txt，写文件目标为 t4-permission-test.txt。
- 写文件 prompt：Write a file named t4-permission-test.txt in the workspace containing the text t4 permission test. Report the result. Do not do anything else.
- rm prompt：Run the shell command rm t4-scratch.txt in the workspace and report the output. Do not do anything else.
- 结果（四轮全部 BLOCKED，exit 2，permissionRequested=false，rpc.jsonl 中 session/request_permission 出现 0 次）：
  - allow-once（写文件）：sessionId e62fd7a3-3a30-4491-9c07-abd92c53c8f；prompt 12:40:48.996Z 发出，12:41:02.754Z 以 end_turn 结束（约 14 秒）；脚本等满 180 秒后判定 BLOCKED（summary 12:43:49.181Z）。模型思考「We need write file. Use write tool. No skill matches. Just create file.」，直接调用 write 工具写出 t4-permission-test.txt（18 字节，内容 t4 permission test），未请求权限；客户端无回应可作。
  - reject-once（rm）：sessionId cff5ef6d-1264-4b33-a215-490460b9fc7f；prompt 12:46:30.045Z 发出，12:46:42.996Z 以 end_turn 结束（约 13 秒）；脚本等满 180 秒后判定 BLOCKED（summary 12:49:30.227Z）。模型直接调用 bash 执行 rm t4-scratch.txt（12:46:40.641Z），文件被删，未请求权限；客户端无回应可作。
  - cancel（写文件）：sessionId 38d66d50-6f6d-4f77-bb5a-d4e496aa1b43；prompt 12:51:55.426Z 发出，12:52:06.078Z 以 end_turn 结束（约 11 秒）；脚本等满 180 秒后判定 BLOCKED（summary 12:54:55.569Z）。模型直接调用 write 工具再次写出 t4-permission-test.txt，未请求权限；客户端无回应可作。
  - bogus（rm）：sessionId 349ebe17-64ed-47ab-99fd-ca70bbe71377；prompt 12:57:33.249Z 发出，12:57:42.108Z 以 end_turn 结束（约 9 秒）；脚本等满 180 秒后判定 BLOCKED（summary 13:00:33.408Z）。模型直接调用 bash 执行 rm t4-scratch.txt，文件被删，未请求权限；客户端无回应可作，bogus optionId 未被行使。
- 当时的结论：t4 仍未完成（BLOCKED）；S5 总体结论「部分完成」，并写下「M0 之前须用高敏感操作提示词补测」。
- **2026-11-09 更新：该结论已被推翻。**四轮失败的原因是 prompt 全部落在 workspace 内（免审批），不是执行者不支持权限请求；改用越界写 + 升级重试后四轮全部触发并通过，见下节。
- 环境教训（复测前两轮失败，均已归档在证据目录）：新开终端默认无 DSH_HOME，dsh 走 shipped profile，模型回落到 deepseek-official 并报缺 DEEPSEEK_API_KEY（-32603）；导出 DSH_HOME 后模型回到 opencode-go，但 shell 无 OPENCODE_API_KEY，llm-pi-ai 报缺凭据（-32603）。两项均需在启动测试的 shell 里就绪：DSH_HOME=/data/home/workspace/dsh-superagent-lab，OPENCODE_API_KEY 由 lab start.sh 载入本 shell 环境变量（仅环境变量，不打印、不落地、不进证据与报告）。lab 服务 3082 全程正常，未重启；lab profile 未改动。
- 证据：spikes/s5/evidence/20261108-t4-retest/（gitignored），t4-allow-write、t4-reject-rm、t4-cancel-write、t4-bogus-rm（各含 rpc.jsonl、summary.json、stdout.log、rpc.stderr.log），另有 t4-allow-write-failed-env、t4-allow-write-failed-no-opencode 两个失败轮次。

## 2026-11-09 修复与复跑记录（dsh-01）

- 环境：dsh 0.2.2-rc.1、Node v22.23.3、Linux 6.18.60-instabox；`DSH_HOME=/data/home/workspace/dsh-superagent-lab`；模型 opencode-go / deepseek-v4.1-flash；凭据仅在测试 shell 的环境变量里（不打印、不写入文件/报告）。
- 脚本修正（本提交）：
  - `spikes/s5/t2-session-new-mcp.mjs`：stdio 条目补 `env: []`；工具调用改为 `title === 'mcp__projects__projects_echo'` 精确匹配并校验 `rawInput.text`；新增「薄代理日志出现该 tools/call」证据检查；反例 A/B/C 补 `env: []`（让它们真正进入挂载校验），新增反例 D（缺 env → SDK 静默丢弃）；`configOptions` 展示字段从 `configId` 修正为 `id`。
  - `spikes/s5/t4-request-permission.mjs`：prompt 改为越界写 `/var/tmp/s5-permission-probe.txt`，被拒后要求带 `sandbox_permissions: "danger-full-access"` + justification 重试一次；每轮前清理目标文件；按 outcome 断言文件是否写出、升级重试是否出现；记录权限请求到达延迟与真实 stopReason。
- t2（2026-11-09，`evidence/20261108-1658/t2/`）：ALL PASS。sessionId `34d065ff-3161-49f2-94a0-d2163886dffd`；prompt end_turn；tool_call 标题仅 `mcp__projects__projects_echo`；假 Engine 收到 `{"tool":"projects_echo","args":{"text":"spike-s5-probe"},"callId":"2"}`；薄代理日志 `tools/call` 同一参数；反例 A `-32602 duplicate normalized name`、B `-32602 must be an absolute path`、C `-32603`、D 成功但未挂载。
- t4 四轮（2026-11-09，`evidence/20261108-1658/t4-{allow,reject,cancel,bogus}/`，hold 120s，等待上限 180s）：

| outcome | 权限请求到达（prompt 后） | 挂起期间 prompt | 回应后结束 | 实际行为 | 目标文件 |
|---|---|---|---|---|---|
| allow | 15.2s | 未提前结束 | 19.9s，end_turn | 首轮 write 被沙箱拒绝（出现拒绝标记），带 `sandbox_permissions: danger-full-access` 重试后写出；随后 read/wc 校验 | 存在，内容 `s5 permission probe` |
| reject | 8.7s | 未提前结束 | 6.8s，end_turn | 工具返回 `the user rejected escalating this operation to "danger-full-access"...`，执行者原样汇报 | 不存在 |
| cancel | 11.3s | 未提前结束 | 10.0s，end_turn | `{outcome:{outcome:'cancelled'}}` 让升级重试以工具错误结束（bash 重试被取消，未执行）；**stopReason 仍是 end_turn** | 不存在 |
| bogus | 9.8s | 未提前结束 | 9.0s，end_turn | 未知 optionId `no-such-option` 被按 rejected 处理（fail closed），升级重试被拒 | 不存在 |

- 运行偏差：bogus 轮期间本机到 dsh-01 的 SSH 连接被远端断开（exit 255），但远端 loop 脚本继续跑完并写出 summary；四轮证据完整。
- 证据：`spikes/s5/evidence/20261108-1658/`（gitignored），t2 含 `rpc.jsonl`/`fake-engine.jsonl`/`projects-mcp.jsonl`/`summary.json`，t4 四轮各含 `rpc.jsonl`/`rpc.stderr.log`/`summary.json`。旧证据在 dsh-01 的 `~/workspace/dsh-projects/spikes/s5/evidence/`（gitignored）。
