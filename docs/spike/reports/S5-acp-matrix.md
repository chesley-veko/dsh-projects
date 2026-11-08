# S5 本机 ACP 执行者能力矩阵

- 结论：部分完成
- 执行者：C 路（准备）+ dsh-01 live 浏览器任务　日期：2026-11-08
- 基线：deepseek-harness@fcc0ad46（0.2.2-rc.1 合入点），其他版本：dsh 0.2.2-rc.1（`dsh --version` 实测）、Node v22.23.3、npm 10.9.9、模型 opencode-go / deepseek-v4.1-flash（lab 路由）；`versions.json` 里 dsh 记空、labModels 记 "(lab service unreachable)" 与实测不符，属 run-all 采集口径问题，以实测为准
- 实验代码：spike/s5-acp-matrix@0110daf（live 决定性一轮跑的是 10ca593 的脚本 + `/tmp/s5-fixed` 副本里的两处修复；本提交把修复并回分支，见下）

## 结论摘要（3 句以内）

dsh --profile acp 的 ACP 基础能力可用：initialize、resume/load 续接、reconcile 语义均支持，cancel 机制本身支持。MCP 挂载不稳定（同一脚本三轮里一轮成功回显、一轮称未挂载、一轮超时），权限请求 180 秒内一次都没触发，模型/劲头切换因路由单模型无法测。Claude Code 与 Codex 两格因缺凭据未测。

## 逐项结果

决定性一轮：dsh-01 上 `evidence/20261108-0342-dsh-acp/`（label dsh-acp，约 16 分钟）。矩阵本身就是结论。

| 检查项 | dsh --profile acp | claude-agent-acp | codex-acp | 证据链接 | 备注 |
|---|---|---|---|---|---|
| 1. `initialize` 能力声明 | 支持 | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t1/`、`initialize-dsh-acp.json` | protocolVersion=1（数字）；agentInfo deepseek-harness-acp 0.0.1；见下原文 |
| 2. `session/new` + MCP 薄代理（列出/调用） | 部分 | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t2/`、`evidence/20261108-0331-probe-t2/` | 本轮模型称 "projects MCP server was never mounted"，假 Engine 调用 0 次；单独探测轮成功回显一次；0334 轮 300s 超时，37 次 tool_call、0 次 Engine 调用 |
| 3. `set_config_option` 切 model / effort，下一轮生效 | 部分 | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t3/` | 未知 model/effort 均被拒 -32602；但 configOptions 里 model 与 reasoning_effort 均为 current=null、values=[]，切换 SKIP（路由单模型） |
| 4. `session/request_permission` 挂起后回应（允许/拒绝/取消） | 未测（BLOCKED） | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t4-allow\|reject\|cancel\|bogus/` | 四轮均 exit 2：180 秒内未触发权限请求，prompt 自行 end_turn；2026-11-08 补测（见下「t4 复测」）：写文件与 rm 两类备用提示词各两轮，四轮仍 exit 2、仍未触发，t4 仍为 BLOCKED |
| 5. `session/cancel` 工具调用进行中取消 | 部分 | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t5/` | 两次 cancel 后 stopReason=cancelled、下一轮正常；但模型未调 projects_sleep/slow_write，主流程未验证；任何一轮均未生成 projects-mcp.jsonl（harness 日志缺口） |
| 6. `session/resume` / `load`，进程退出后续接 | 支持 | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t6/`（rpc-1/2/3 三组） | 续接后模型记得暗号 BLUEBIRD；`session/load` 报 -32601（确认无此方法） |
| 7. 按外部 id 查询/去重（ADR-0015 探针） | 支持（按当前语义） | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t7/` | 两次相同 session/new 返回两个不同 id（未去重）；编造外部 id resume 被拒；异常：session/list 返回 13 个会话但不含刚建的 s1/s2，待确认 |
| 8. 订阅登录凭据 | 完成（lab 路由可测） | 未测（缺凭据） | 未测（缺凭据） | `evidence/20261108-0342-dsh-acp/t8/` | dsh binary=/opt/npm/bin/dsh；两外部执行者 binary=(missing) |

### initialize 能力声明（原文，已脱敏）

```json
{"protocolVersion":1,"agentInfo":{"name":"deepseek-harness-acp","version":"0.0.1"},"agentCapabilities":{"mcpCapabilities":{"http":true},"promptCapabilities":{"image":true,"audio":false,"embeddedContext":false},"sessionCapabilities":{"close":{},"list":{},"resume":{}}},"authMethods":[]}
```

### 凭据缺口

- `claude-agent-acp`：未测（缺凭据）——未安装（dsh-02 上装了 0.101.0 但未跑），缺 Claude 订阅登录或 `ANTHROPIC_API_KEY`；被挡住的步骤：进程启动/认证。
- `codex-acp`：未测（缺凭据）——未安装（dsh-02 上装了 2.5.0 但未跑），缺 ChatGPT 订阅登录或 `OPENAI_API_KEY`；被挡住的步骤：进程启动/认证。
- `dsh --profile acp`：完整可测（lab opencode-go 路由 + dsh-01 上真 key 文件）。

## 反例与故障场景

- t1：重复 initialize 被拒 -32602 Invalid params；未知方法 `session/nope` 报 -32601 "Method not found"。
- t2：同名 MCP 服务器、相对路径 `command`、不存在的 `command`，三项 session/new 均接受（应拒未拒）。注：t2 有一项 "其中包含 projects_echo 调用" 的 PASS 不可作数——其 detail 是一次 bash grep 调用（含 projects_echo 字样），并非 MCP 工具调用。
- t3：未知 model 被拒 -32602 "unknown model option: no-such-model-option"；未知 effort 被拒 -32602 "unknown reasoning_effort …: no-such-effort"；反例 B（未知 session）实际被拒 -32602 Invalid params，但错误文本不含 "unknown session"，harness 正则判定记 FAIL——执行者行为是拒绝，属检查措辞过严。
- t4：bogus optionId 未被行使（四轮均未触发权限请求）；180 秒内无权限请求。
- t5：空闲时 cancel 不破坏会话；连续两次 cancel 正常结束；sleep 取消时 prompt 已 end_turn（取消后 0.0s 结束），半写文件 chunks=0/0。
- t6：`session/load` 报 -32601；resume 未知 id 报 -32602 "session is not resumable"；错 cwd 报 -32602 "session cwd does not match: /tmp"；已激活会话再 resume 报 -32602 "session is already active"。
- t7：编造外部 id `ext-123` 做 resume 被拒 -32602 "session is not resumable: ext-123"。

## 对设计的影响（需改的 ADR 或文档，给出建议措辞，不直接改 ADR）

- **MCP 挂载不可靠，需当作已知风险**：同一脚本三轮里挂载成功仅一轮（其余一轮模型称未挂载、一轮超时 0 次调用）。若 M0 用 dsh --profile acp 当执行者，Projects 工具调用必须有"挂载失败可检测 + 重试/报错"的设计，不能假设每次 session/new 都挂上。建议措辞（ADR-0015 或执行者选型处）："dsh-acp 的 MCP 挂载在 live 中表现为不稳定（3 轮中 1 轮成功）；调用 Projects 工具前须有挂载探针，挂载失败时明确报错而非静默继续。"
- **权限流程未验证通过，协调者不能依赖它**：t4 四轮均未触发 `session/request_permission`，allow/reject/cancel 三种处置均未被实际行使。建议措辞："dsh-acp 的 request_permission 在本轮未被触发（prompt 未请求敏感操作即结束）；M0 之前须用高敏感操作提示词补测，补测通过前不得把权限确认设计在 dsh-acp 的这条回调上。"
- **reconcile 按当前语义不支持去重**：两次相同 session/new / prompt 各产生新 id / 新 turn，ADR-0015 的 reconcile 须按"恢复走 unknown"设计（编造外部 id resume 被拒已验证）。
- **configOptions 为空**：路由单模型时 model/effort 无可发现的切换值；多模型路由下的切换行为仍待测。
- **session/list 的可见性存疑**：刚创建的会话未出现在 list 结果里（13 个会话，不含 s1/s2），而 t6 已关闭的会话可被发现；list 语义（是否只含激活会话）待确认后再依赖。

## 未完成与推断项（明确标注）

- t4 未完成（BLOCKED）：2026-11-08 补测已试 README 备用提示词（写文件、rm 高敏感命令），四轮仍未触发权限请求，见下「t4 复测」一节；结论仍为 BLOCKED。
- Claude Code 与 Codex 两列未测（缺凭据）；macOS 未覆盖（只跑了 Linux）。
- t2 的 MCP 挂载不稳定、t7 的 list 异常：现象已记录，根因未查（推断：与模型侧是否实际挂载/会话激活状态有关，未证实）。
- 两处测试脚本缺陷已在 live 中发现并修复（只修在 dsh-01 的 `/tmp/s5-fixed` 副本，分支未动时跑出决定性一轮；本提交 0110daf 已把修复并回分支，`node --check` 全过）：
  1. initialize 发字符串 `'1.0'`，服务端以 -32602 拒绝（"Invalid input: expected number, received string"）；改为数字 1。
  2. t3/t4/t6/t7 的 session/new 缺必填 `mcpServers` 字段，报 -32602 "Required value is missing"；补 `mcpServers: []`。
- 以下结论来自只读源码，标「推断（源码）」，不算通过：
  - `dsh --profile acp` 的方法表（无 `session/load`）、stdio 行为、
    MCP 绝对路径与去重规则、权限回调形状、配置切换下一轮生效
    （依据：fcc0ad46 `packages/acp/acp/src/index.ts`、`mcp.ts`、
    `model-control.ts`；`packages/bundle/acp-app/cordis.patch.yml`；
    `packages/util/official-bundles/src/bundles.ts`；
    `apps/cli/src/plugin.ts`、`profile-boot.ts`）。
  - `protocolVersion` 具体取值以运行时返回为准，未预设（live 实测为数字 1）。
- 角色模型复查方法：0.2.2-rc.1 上 `/orchestrator/api/settings/eval` 与 `/executor` 均 404，改走 `dsh --profile superagent --dump-config`，agent-default-model 一项为 opencode-go / deepseek-v4.1-flash，dump-config 中仅此一个 model 条目。
- 薄代理与假 Engine 是实验装置（只回显并记录），不是被测对象冒充。
- 决定性一轮之外的对照轮：`evidence/20261108-0324-dsh-acp/`（原脚本，t1–t7 全部因字符串 protocolVersion 报 -32602）、`evidence/20261108-0334-dsh-acp/`（仅修 protocolVersion；t2 超时、t3/t4/t6/t7 缺 mcpServers）、`evidence/20261108-0331-probe-t2/`（单独 t2 探测，MCP 回显成功一次）。全部证据在 dsh-01 上（gitignored），分支工作区干净。

## 复现步骤

```sh
# dsh-01 上
cd ~/workspace/dsh-projects && git checkout spike/s5-acp-matrix
# 先装 lab acp 覆盖层并验证（见 spikes/s5/README.md §3）
./spikes/s5/run-all.sh --executor-cmd "dsh --profile acp" --label dsh-acp
# 外部执行者（有凭据后）：
./spikes/s5/run-all.sh --executor-cmd "claude-agent-acp" --label claude-acp
./spikes/s5/run-all.sh --executor-cmd "codex-acp" --label codex-acp
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
- 结论：t4 仍未完成（BLOCKED）；S5 总体结论仍为「部分完成」，不变。理由：README 备用提示词现已全部试过，写文件与 rm 两类高敏感操作均被模型直接执行、一次权限请求都未触发；allow/reject/cancel/bogus 四种回应均未被实际行使，session/request_permission 仍未被验证通过。原报告「M0 之前须用高敏感操作提示词补测，补测通过前不得把权限确认设计在 dsh-acp 的这条回路」仍然成立，补测结果是未通过。
- 环境教训（复测前两轮失败，均已归档在证据目录）：新开终端默认无 DSH_HOME，dsh 走 shipped profile，模型回落到 deepseek-official 并报缺 DEEPSEEK_API_KEY（-32603）；导出 DSH_HOME 后模型回到 opencode-go，但 shell 无 OPENCODE_API_KEY，llm-pi-ai 报缺凭据（-32603）。两项均需在启动测试的 shell 里就绪：DSH_HOME=/data/home/workspace/dsh-superagent-lab，OPENCODE_API_KEY 由 lab start.sh 载入本 shell 环境变量（仅环境变量，不打印、不落地、不进证据与报告）。lab 服务 3082 全程正常，未重启；lab profile 未改动。
- 证据：spikes/s5/evidence/20261108-t4-retest/（gitignored），t4-allow-write、t4-reject-rm、t4-cancel-write、t4-bogus-rm（各含 rpc.jsonl、summary.json、stdout.log、rpc.stderr.log），另有 t4-allow-write-failed-env、t4-allow-write-failed-no-opencode 两个失败轮次。
