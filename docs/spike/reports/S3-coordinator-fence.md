# S3 协调者工具围栏与 INDEX 注入
- 结论：不通过 —— fence 设计在 DSH 0.2.2-rc.1 上无法挂载，coordinator 会话建不起来；guard、INDEX 注入、压缩保留均未得到验证。
- 执行者：B 路（Spike 执行） 日期：2026-11-08（UTC）
- 基线：deepseek-harness@fcc0ad462172522aaf5c93a7b2e01f6b9f0b159，dsh-superagent-prototype@8c32a9d；dsh-01 实测：dsh 0.2.2-rc.1，node v22.23.3，pnpm 12.15.0，模型 opencode-go/deepseek-v4.1-flash，实验室 3082
- 实验代码：spike/s3-tool-fence@a13e8679cf8dcf29e414b6b585743f34d3266（fence 插件已修复 .optional()，tsdown fixedExtension: false，lib/index.js 可加载）
- 驱动：spike/s4-native-worker@70d8c13164fa4fcb894201c53dd172d3f9edacd7（/spike/* driver，挂载于实验室 3082）

## 结论摘要（3 句以内）
coordinator 会话创建在 fence 的 tools.restrict() 一步即抛错，setup 回滚、会话未公告，步骤 1a、1b、3 的围栏内观测全部无法进行，fence 设计在 DSH 0.2.2-rc.1 加 driver 挂载路径上不成立。
standard 对照会话正常：工具清单 33 个，模型可调用 working_directory 并返回 /tmp/s3-exp，证明实验室与驱动本身工作正常，失败确由 fence 引起。
另发现驱动本身缺失 compaction 与 agentDefaultModel 注入，/spike/agents.compact、/spike/agents.inspect、/spike/version、/spike/global-default 均报错，需随 fence 一并修复后重跑。

## 逐项结果（表：检查项 / 结果 / 证据链接 / 备注）
| 检查项 | 结果 | 证据链接 | 备注 |
|---|---|---|---|
| 1a 屏蔽前/后工具清单对比 | fail（不通过） | spikes/s3/evidence/1a-tools-standard.json、1a-create-coord.json | 基线 33 个工具；coordinator 创建抛错，tools.visible 报 unknown live session |
| 1b working_directory 调用被拒 | blocked（受阻） | spikes/s3/evidence/1a-p1b-standard-m.json | 无 coordinator 会话，P2a–P2g 未跑；standard 对照中 working_directory 可调用，返回 /tmp/s3-exp |
| 1b shell 调用被拒 | blocked（受阻） | — | 同上 |
| 1b 文件读写调用被拒 | blocked（受阻） | — | 同上；/tmp/spike-s3-probe.txt 与 /tmp/spike-s3-decoy-ran.txt 均不存在 |
| 1b 全局 MCP 调用被拒 | blocked（受阻） | — | 同上 |
| 1b decoy guard 拒绝且无副作用 | blocked（受阻） | — | guard 未及注册（restrict 先抛错）；decoy 标记文件不存在，但不能作为 guard 生效的证据 |
| 1b 白名单 probe 调用成功 | blocked（受阻） | — | spike_projects_probe 未及注册 |
| 2 deny 未知工具名抛错，会话未公告 | partial（部分完成） | spikes/s3/evidence/2-create-baddeny.json | 创建确抛错、会话未公告、无 session 文件残留；但错误是 scope 错而非预期的 unknown Global tool 错 |
| 2 deny scoped 名抛错（对照） | partial（部分完成） | spikes/s3/evidence/2-create-baddeny-scoped.json | extraDeny 改为 spike_projects_probe 后同样抛 scope 错 |
| 3 compaction 后 INDEX 完整 | blocked（受阻） | — | 无 coordinator 会话，INDEX 未注入 |
| 3 compaction 后缓存字段 | blocked（受阻，部分数据见备注） | spikes/s3/evidence/1a-p1-standard-m.json、1a-p1b-standard-m.json | standard 会话：P1 缓存字段均为 null；P1b cacheReadTokens 17792、cacheWriteTokens null，opencode-go 路由确会返回 cacheReadTokens |
| 3 空闲短会话 compactNow 无操作 | fail（不通过，驱动侧） | spikes/s3/evidence/3-compact-empty-standard-m.json | 期望返回 null，实际报 cannot get property "compaction" without inject |

## 反例与故障场景
- 步骤 2 的 mount 抛错：coordinator（variant A）与 bad-deny（variant B）创建均返回同一错误：spike-s3-fence (@spike/s3-coordinator-fence): tools.restrict() requires a scoped context (agent.ctx): a context-global restriction would mask every agent — deny the tool for the intended agent instead。根因：dsh-tools 0.2.2-rc.1 的 restrict()（lib/index.js:453–455）在 scopeOf(this.ctx) 为 undefined 时即抛错，发生在名称校验（:466）之前；fence 经 agentPresets.mount 在 driver setup 内挂载时拿到的 ctx 无 scope tag。fence 源码注释称 apply 应在 AgentRegistry.create setup 内以 agent-scoped ctx 运行，该假设在 0.2.2-rc.1 加 driver 路径上不成立。
- 带显式 agentOptions.provider/model 的 coordinator 创建（s3-coord-b）同样抛 scope 错，证明失败与模型配置无关。
- decoy 侧写文件检查：/tmp/spike-s3-decoy-ran.txt 与 /tmp/spike-s3-probe.txt 均不存在（ls 报 No such file or directory）；但这是因为 guard 未及注册，而非 guard 拦截所致，不能作为 guard 生效的证据。
- 空闲 compactNow：standard 空历史会话（带模型）调用返回错误而非 null（见上表）。
- pruner 活动：未观测到（无 coordinator 会话可压缩；standard 会话未触发压缩）。

## 对设计的影响（需明确的 ADR 或文档，给出建议措施，不直接改 ADR）
- fence 的 restrict-then-register 顺序在 0.2.2-rc.1 上不可行：restrict 要求 agent-scoped ctx，但 preset 挂载路径给不到。建议：改由 agent setup 直接以 agent ctx 调用 restrict，或改用 guard-only 方案（不调用 restrict，仅用 guard 拒绝非白名单工具），或把 fence 挂载点从 preset 插件改为 agent 创建时的 setup 钩子；三者均需在 ADR 中明确并重新验证。
- driver 需补 inject：compaction 与 agentDefaultModel（或等价模型解析），否则 /spike/agents.compact、/spike/agents.inspect、/spike/version、/spike/global-default 无法使用；agents.create 须显式传 agentOptions.provider/model，否则 agent 无模型、agents.prompt 返回空 reply（errors 提示 agent has no provider/model）。
- 在上述两项修复并重跑通过前，coordinator 围栏设计不得作为已验证结论引用。

## 未完成与排推项（明确标注）
- fence 插件在 dsh-01 上已编译并验证可加载（tsdown 0.22.14，lib/index.js 3278 字节，import 不抛错）；原模板“未编译”状态已解除。
- 以下已由 live 验证，不再是推断：tools.restrict 在 preset 挂载时抛错、setup 抛错后回滚且无会话残留；opencode-go 路由在第二轮返回 cacheReadTokens 17792（cacheWriteTokens 仍为 null）。
- 仍未验证（需修复后重跑）：guard 拒绝行为、spike_projects_probe 白名单调用、INDEX 注入与压缩后保留、30 轮填充与 compactNow 的 token 记账。

## 复现步骤
## 同步分支
1. 同步分支 spike/s3-tool-fence 到 dsh-01（分支未 push，见 spikes/s3/README.md）。
2. 按 spikes/s3/coordinator-preset.patch.yml 与 profile-package.json.fragment 合并 lab 配置；pnpm install；构建 fence 插件；
3. 构建 fence 插件；
4. 记录版本（dsh --version + 全局包 version + node + OS + 模型）。
5. 复核 eval/executor 角色模型仍钉死 deepseek-v4.1-flash。
6. 按 spikes/s3/prompts.md 与 evidence-checklist.md 执行步骤 1-3，经 spike 插件接口发送提示词、取工具清单、取 system-prompt、触发 compaction、插件接口应见 spikes/s4/plugin-interface.md（与 A 路 S1 插件对接后以实际接口为准）。
