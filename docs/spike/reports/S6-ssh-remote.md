# S6 SSH 远程执行 + MCP 回路- 结论：未通过——远程执行与断线恢复本身可用，但 MCP 回路未打通，S6 核心问题不成立。- 执行者：Muse 浏览器任务（dsh-01 终端） 日期：2026-11-08- 基线：deepseek-harness@fc00ad46 (0.2.2-rc.1 合入点)；live 实测：dsh-01 与 dsh-02 均为 dsh 0.2.2-rc.1，Node 均为 v22.23.3（dsh-02 npm 10.9.9），dsh-01 内核 Linux 6.18.60-instabox；模型 deepseek-v4.1-flash（acp profile 的 opencode-go 路由）。版本记录见 spikes/s6/evidence/20261108-1327-s6/versions-local.json 与 remote-check-preflight.txt。- 实验代码：spike/s6-ssh-remote @ b0884bf（live 运行基线；本报告的提交 SHA 见 git log）。另有两处工作树修正未提交（见「运行偏差与修复」）。- 规范轮次：spikes/s6/evidence/20261108-1327-s6/（2026-11-08 13:27-13:31 UTC）。另有两轮被阻断：20261108-1321-s6（initialize -32602）、20261108-1325-s6（prompt -32603 凭据缺失；阶段 B 无 summary.json）。# S6 SSH 远程执行 + MCP 回路

- 结论：未通过——远程执行与断线恢复本身可用，但 MCP 回路未打通，S6 核心问题不成立。
- 执行者：Muse 浏览器任务（dsh-01 终端） 日期：2026-11-08
- 基线：deepseek-harness@fc00ad46 (0.2.2-rc.1 合入点)；live 实测：dsh-01 与 dsh-02 均为 dsh 0.2.2-rc.1，Node 均为 v22.23.3（dsh-02 npm 10.9.9），dsh-01 内核 Linux 6.18.60-instabox；模型 deepseek-v4.1-flash（acp profile 的 opencode-go 路由）。版本记录见 spikes/s6/evidence/20261108-1327-s6/versions-local.json 与 remote-check-preflight.txt。
- 实验代码：spike/s6-ssh-remote @ b0884bf（live 运行基线；本报告的提交 SHA 见 git log）。另有两处工作树修正未提交（见「运行偏差与修复」）。
- 规范轮次：spikes/s6/evidence/20261108-1327-s6/（2026-11-08 13:27-13:31 UTC）。另有两轮被阻断：20261108-1321-s6（initialize -32602）、20261108-1325-s6（prompt -32603 凭据缺失；阶段 B 无 summary.json）。

## 结论摘要（3 句以内）

远程 SSH + ACP 执行与 30 秒断线恢复已验证可用，但 MCP 回路未打通：远端 agent（deepseek-harness-acp）能力声明仅含 mcpCapabilities {"http": true}，不加载 session/new 中的 stdio MCP server，本机假 Engine 全程收到 0 次调用；且该 SSH 路径拒绝远程端口转发（-R），即使 proxy 启动也无法回连本机 Engine。外部执行者变体未测（S5 未通过且凭据未就绪）。

## 逐项结果

| 检查项 | 结果 | 证据链接 | 备注 |
|---|---|---|---|
| 远程 initialize（ssh host -- dsh --profile acp） | 通过 | evidence/20261108-1327-s6/phase-a/rpc.jsonl | protocolVersion=1，agent=deepseek-harness-acp；能力声明原样存档于 summary.json |
| 远程 session/new + MCP 回路（ssh -R 转发本机假 Engine） | 未通过 | evidence/20261108-1327-s6/phase-a/、假 Engine 日志 | 本机假 Engine 收到 0 次调用；agent 明确表示无 projects_echo 工具 |
| 断线 30 秒：分区前开始的长 prompt | 部分通过 | evidence/20261108-1327-s6/phase-b/rpc.jsonl、remote-check-during.txt | SIGSTOP 本机 ssh 31.37 秒；回合在恢复后明确结束，但 120 秒 projects_sleep 并未真正执行（工具不可用） |
| 断线 30 秒：分区中途发出的 prompt | 未通过 | evidence/20261108-1327-s6/phase-b/ | 回合结束（end_turn），但 echo 调用未到达假 Engine |
| 恢复后 MCP 回路与会话健康 | 部分通过 | evidence/20261108-1327-s6/phase-b/ | 恢复后 OK prompt 正常完成；MCP 回路仍不通（同上） |
| 本机进程退出后远端进程残留 | 通过（无测试残留） | remote-check-after-local-exit.txt、remote-check-final.txt | 远端仅剩 lab 服务进程（superagent dsh 与 tmux）；测试用的 dsh --profile acp 已退出 |
| 外部执行者变体（S5 最佳者） | 未测 | — | S5 未通过（t4 仍 BLOCKED）且外部凭据未就绪，不满足运行条件 |

## 阶段 A 结论：未通过

- initialize 通过：protocolVersion=1（数字），agent=deepseek-harness-acp；能力声明原样为 mcpCapabilities {"http": true}、promptCapabilities {"image": true, "audio": false}、sessionCapabilities {"close": {}, "list": {}, "resume": {}}。
- session/new 通过：sessionId=755a0941-b23c-4c31-a95f-e2139c189c56；prompt 回合正常结束（stopReason=end_turn）。
- MCP 回路未打通：三轮运行中本机假 Engine 收到的调用数均为 0（fake-engine.jsonl 仅有启动行；/calls 返回空）。agent 回复明言其工具清单中没有 projects_echo，只有 bash、read、write、grep 等内置工具。
- 方法学问题：脚本的「远端执行者发起了 projects_echo 调用」检查用子串匹配，本轮远程因此误判为通过——实际命中的是一次 bash 工具调用（agent 用 grep 在远端文件系统中查找 projects_echo 字符串）。该检查应改为按工具名精确匹配。本地复现探针中同一检查为 FAIL（未见 tool_call），可作对照。
- 反例未通过：session/new 传入不存在的 command（/nonexistent/node）时，服务端接受而不失败。服务端不在建会话时校验 MCP 命令，请求参数不可作为「已加载」的证据。
## 阶段 B 结论：部分通过（断线恢复通过，MCP 载荷不成立）

- SIGSTOP 本机 ssh 进程 31.37 秒（ssh pid 379077），分区期间第二通道 remote-check 正常（2026-11-08T13:28:48Z，dsh-02 侧 lab 正常、3082 监听正常）。
- 睡眠完成情况：分区前开始的长 prompt 在恢复后明确结束（stopReason=end_turn，开始后 44.0 秒）。但 120 秒 projects_sleep 并未真正执行——该工具不在 agent 工具清单中，agent 在 44 秒内以文本结束回合。所谓「睡眠完成」不成立。
- 送达情况：分区中途发出的 echo prompt 回合结束（stopReason=end_turn），但其 projects_echo 调用未到达假 Engine（未见该调用）。与阶段 A 同一根因。
- 恢复情况：恢复后新一轮 OK prompt 正常完成（stopReason=end_turn）；恢复后远端进程状态正常（2026-11-08T13:29:27Z）。
- 残留情况：本机进程退出（code=0）后，远端无测试残留——remote-check 仅剩 lab 服务进程（superagent dsh 与 tmux）；测试用的 dsh --profile acp 已退出。
## 外部执行者变体：未测

不满足运行条件：S5 未通过（t4 仍 BLOCKED，未触发权限请求），且外部执行者凭据未就绪。按 README 准备步骤，只在 S5 通过且凭据就绪时跑；本轮记「未测」，未尝试任何 Claude/Codex 登录，也未使用除 SSH 目标外的任何凭据。

## 强变体（控制台暂停 dsh-02 整机 30 秒）：未尝试

阶段 B 的 ssh 级分区已验证分区恢复能力（长 prompt 回合明确结束、恢复后 OK prompt 正常、第二通道全程可用）；本轮 verdict 由 MCP 回路未打通与 -R 转发被拒决定，整机暂停不能改变 verdict；暂停 dsh-02 会中断其 lab 服务（tmux dsh-superagent，3082），无 verdict 收益，故不尝试。

## 根因分析

1. dsh 0.2.2-rc.1 的 acp agent（deepseek-harness-acp）不加载 stdio MCP server（主因）。其 initialize 能力声明仅含 mcpCapabilities {"http": true}，即只支持 HTTP 方式的 MCP；而 S6 的 thin proxy 是 stdio 方式（command + args）。行为证据：远端与本地双侧均无 proxy 启动痕迹（无 proxy 进程、无 spike-scratch 目录、无 projects-mcp-remote.jsonl 日志）；agent 明确表示工具清单中无 projects.*；本地复现探针（无 SSH、无 -R，见「本地复现」）结果一致。
2. 该 SSH 路径拒绝远程端口转发（-R）。三轮运行的 phase-a/rpc.stderr.log 均有 Warning: remote port forwarding failed for listen port 8931；手动复测 -R 8931 与 -R 18931 均失败，端口当时空闲；dsh-02 的 /etc/ssh/sshd_config 中相关项均为注释（默认允许转发），故拒绝来自网关侧。即使 proxy 启动，也无法经 -R 回连本机 8931 假 Engine。
3. 脚本缺陷：initialize 的 protocolVersion 误用字符串 1.0，ACP 要求数字。服务端以 JSON-RPC -32602（Invalid params；data 注明 expected number, received string）拒绝；S5 本地 dsh-acp 的 t1/t2 在 2026-11-08 03:24 同样因此失败。已在工作树修正为数字 1（未提交，见「运行偏差与修复」）。
4. 环境缺口：非交互 SSH 的 PATH 不含 /opt/npm/bin（dsh 无法解析），且 ssh 会话无 OPENCODE_API_KEY（acp profile 的 opencode-go 以 apiKeyEnv 引用该变量；缺失时 prompt 报 JSON-RPC -32603）。两项均已在 dsh-02 ~/.bashrc 顶部补齐（见「运行偏差与修复」）。
5. 阶段 B 第二轮（20261108-1325-s6）无 summary.json：其 sleep prompt 因 -32603 被拒后，未处理的 rejection 使 node 进程崩溃，未及写 summary。凭据修复后第三轮不再出现。

## 本地复现（对照探针，非提交证据）

为分离 SSH/-R 因素，在 dsh-01 本地以同一脚本直连本地 dsh（executor 为 env DSH_HOME=<lab> dsh --profile acp，无 SSH、无 -R，假 Engine 在本机 8931）：initialize 与 session/new 均通过，agent 同样表示无 projects_echo 工具，假 Engine 调用数为 0，proxy 日志与 spike-scratch 均未生成。MCP 回路失败与 SSH/-R 无关。探针日志在 /tmp/s6-local-probe（已清理假引擎进程）。

## 反例与故障场景

- 远端不存在的 command（session/new 应失败）：未通过——服务端接受 /nonexistent/node，不校验。见阶段 A。
- 分区中途发出的 prompt（恢复后是否送达）：回合结束但调用未送达（MCP 未打通）。见阶段 B。
- 本机退出后远端残留检查：通过——无测试残留，仅 lab 服务进程。见阶段 B。
- 强变体：控制台暂停 dsh-02 整机 30 秒：未尝试（见上）。
- 额外故障：三轮 -R 转发失败（见根因 2）；第二轮阶段 B 脚本崩溃无 summary（见根因 5）；第一轮 initialize -32602（见根因 3）；第二轮 prompt -32603（见根因 4）。
## 对设计的影响（需实的 ADR 或文档，给出建议措辞，不直接改 ADR）

- ADR-0016（lease 与回收）：建议措辞——远端 MCP server 的「已加载」不得以 session/new 请求参数为准（服务端接受不存在的 command 且不校验）；应以 agent 实际加载的工具清单或能力声明（mcpCapabilities）作为 lease 与回收的前提；stdio thin proxy 在仅支持 HTTP MCP 的 agent 上不可作为默认回路，需另寻传输（HTTP MCP 或本地回路）。
- ADR-0015（断线后 effect 状态）：建议措辞——需区分「prompt 回合结束」与「effect 实际执行」；分区中途的 prompt 回合可以 end_turn，但其工具调用从未产生；恢复后的对账应以 effect 的实际到达为准，而非回合状态。
- ADR-0014（远端 Run capability 撤销）：建议措辞——能力声明应作为远端 Run 的前置校验；agent 不支持 stdio MCP 时，session/new 应明确拒绝或告警，而不是静默接受并在后续以「无此工具」失败。
## 未完成与推断点（明确标注）

- live 运行已执行（规范轮次 20261108-1327-s6）；强变体未尝试；外部执行者变体未测（原因见上）。
- 「agent 仅支持 HTTP MCP 故不加载 stdio server」为行为证据支持的推断：本地与远端双侧复现、能力声明原文、agent 自述、proxy 全无启动痕迹；未读 dsh 源码确认实现细节。
- 「-R 拒绝来自网关侧」为推断：dsh-02 sshd 默认允许转发、两端口均失败、端口空闲；未获网关配置原文。
- 报告模板中「dsh-02 尚未接入」已过时：本轮 SSH 接入正常（BatchMode 密钥登录，dsh-02 已恢复 Running，lab 3082 正常）。

## 运行偏差与修复（均未提交，仅工作树与环境；报告只提交本文件）

- 脚本修正：spikes/s6/s6-remote-roundtrip.mjs:56-57 与 s6-disconnect.mjs:82-83，protocolVersion 由字符串 1.0 改为数字 1，断言由 string 改为 number（git diff 4 行插入、4 行删除）。
- dsh-02 ~/.bashrc 顶部（已备份 ~/.bashrc.bak-s6）：PATH 加入 /opt/npm/bin；OPENCODE_API_KEY 从 ~/.config/dsh-lab/opencode.env 文件读取（不写明文）。
- 材料恢复：spikes/s5/fake-engine.mjs、rpc-client.mjs、test-harness.mjs 从 origin/spike/s5-acp-matrix 恢复（未提交）；~/workspace/spike-materials/s5 与 s6 按 README 准备步骤重建；proxy（projects-mcp-stdio.mjs）与 spike-s6-work 已传到 dsh-02。
- 证据卫生：summary.json 的 executorCmd 与 remote-check-*.txt 的 ps 输出含有 SSH 目标与进程命令行原文（含凭据），均已 gitignore、未提交；分享前须脱敏；建议后续 remote-check.sh 不再输出含凭据的命令行。
## 复现步骤

前置：dsh-02 ~/.bashrc 顶部须含 /opt/npm/bin 的 PATH 与 OPENCODE_API_KEY 引用（见上）；材料按 spikes/s6/README.md §3 备齐。

```sh
# dsh-01 上（前置见 spikes/s6/README.md §3）
cd <spikes/s6 所在目录>
./run-s6.sh --ssh-target "<user>@ssh.instabox.sh" --remote-node "$(ssh -o BatchMode=yes -p 2222 <user>@ssh.instabox.sh command -v node)" --remote-lab /data/home/workspace/dsh-superagent-lab --remote-workdir /data/home/workspace/spike-s6-work
```

注：复现前须先应用「运行偏差与修复」中的 protocolVersion 修正，否则 initialize 直接报 -32602；且 -R 转发在本 SSH 路径上仍被拒、MCP 回路仍不通，复现结果与本报告一致。

## 审核

（待审核后填。）
