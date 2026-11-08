# S3 证据采集清单（每项缺一即为报告中的「未完成」）

## 通用记录（每次 live 运行开头先记）
- [x] DSH 实际构建版本：`dsh --version` 输出 + 全局包
  `$(npm root -g)/@deepseek-ai/dsh/package.json` 的 version 字段（两者
  都记，不一致时并列）；node 版本；操作系统；模型
  `opencode-go/deepseek-v4.1-flash`；harness 基线 fcc0ad46。
- [x] lab profile 的 `cordis.patch.yml` 与 fence 插件的实际内容快照
  （`git -C <dsh-projects同步目录> rev-parse HEAD` + `git status`）。
- [x] 角色模型复查：升级到 0.2.2-rc.1 后 eval/executor 是否仍钉死
  deepseek-v4.1-flash（`GET /orchestrator/api/settings`）——S0 备忘：
  升级后未重验，live 前必须复查。

## 步骤 1a/1b
- [x] 基线会话（standard preset）的工具清单全文（`GET /spike/tools.visible`）。
- [x] variant A 协调者会话的工具清单全文；两份清单的 diff。
- [x] P2a–P2g 每轮的模型回复全文 + 工具调用记录（名、参数、结果、
  错误码）+ 当轮 TokenUsage。
- [x] 会话存活检查每轮的回答。
- [x] `/tmp/spike-s3-decoy-ran.txt` 存在性检查（`ls` 输出，期望不存在）；
  `/tmp/spike-s3-probe.txt` 存在性检查（期望不存在——P2c 应被拒绝，
  文件不得被写出）。
- [ ] DSH 服务端日志中 UNKNOWN_TOOL / guard 拒绝的行（tmux capture
  或日志文件片段，截取含错误码的 20 行）。retry #3 实测：guard 拒绝
  以 `tool/result` 的 `Error: ...` 返回给模型，服务端 stdout 没有对应
  日志行；可读证据是 `r3-1b-p2f.json` 的 calls[].result。`UNKNOWN_TOOL`
  本轮未出现（被屏蔽工具在 schemas 里就不可见，模型无法发起调用）。

## 步骤 2
- [x] variant B create 调用的完整错误原文。
- [x] 该 sessionId 的 inspect / resume 结果。
- [x] models 接口在事后仍返回 200 的 curl 输出。
- [x] 会话存储目录下该 sessionId 是否有残留文件（`ls`）。
- [x] extraDeny 为 scoped 名（`spike_projects_probe`）时的对照结果。

## 步骤 3
- [x] compaction 前的 `spike-s3-index` section 全文。
- [x] 30 轮填充提示词的发送记录（轮次、字数、每 5 轮的 TokenUsage）。
- [x] compactNow 返回的 summary、被替换区间、token 记账（原文）。
- [x] compaction 后的 `spike-s3-index` section 全文；与
  index-fixture.md 的逐字节比对结果（diff 输出）。
- [x] compaction 后 INDEX 问答的模型回复全文。
- [x] compaction 后 3 轮的 TokenUsage（cacheReadTokens/cacheWriteTokens，
  缺失记 null）。
- [x] 空闲短会话 compactNow 的返回（期望 null/无操作）。
- [x] pruner 活动记录（如有）。

## 填充提示词模板（步骤 3 长对话用）
每轮取一段不同的中文段落（约 800 字，可用公开领域文本，如 DSH 文档
的中文翻译段落或项目 README 段落），提示词固定为：
> 请用你自己的话复述下面这段话的核心意思，不超过 200 字，不要调用任何工具。
> <段落>
30 轮的段落不得重复，不得含有任何哨兵串（ALPHA-7F3A / BETA-9C21 /
GAMMA-44D8 / PROBE-OK-51D2）。

## Live 运行记录（2026-11-08 retry #2，UTC）
- 环境：dsh 0.2.2-rc.1，node v22.23.3，pnpm 12.15.0；模型 opencode-go/deepseek-v4.1-flash；实验室 3082；分支 spike/s3-tool-fence@a13e867，驱动 spike/s4-native-worker@70d8c13。
- 步骤 1a：fail。基线 standard 会话工具清单 33 个（1a-tools-standard.json）；coordinator 创建抛错（1a-create-coord.json），无围栏侧清单、无 diff。
- 步骤 1a 对照：P1 模型列出 31 个工具（漏 web_search、exit_plan_mode），usage 9044/143/null/null；P1b 确认 working_directory 可调用，返回 /tmp/s3-exp，usage 1093/668/17792/null。
- 步骤 1b：blocked。无 coordinator 会话，P2a–P2g 与存活检查均未跑。
- 步骤 2：partial。bad-deny 创建抛 scope 错（2-create-baddeny.json），非预期的 unknown Global tool 错；scoped 对照同样抛 scope 错（2-create-baddeny-scoped.json）；无 session 文件残留；models 事后 200；inspect 报 agentDefaultModel inject 错。
- 步骤 3：blocked。无 coordinator 会话，INDEX 未注入；空闲 compactNow 报 compaction without inject（3-compact-empty-standard-m.json），非 null；pruner 未观测到活动。
- 驱动问题：inject 缺 compaction 与 agentDefaultModel，/spike/version、/spike/global-default、/spike/agents.inspect、/spike/agents.compact 均报错；agents.create 须显式传 agentOptions.provider/model，否则 prompt 返回空 reply。
- 结论：见 docs/spike/reports/S3-coordinator-fence.md（不通过）。证据目录：spikes/s3/evidence/（13 个文件，gitignored）。

## Live 运行记录（2026-11-08 retry #3，UTC，通过）

- 环境：dsh 0.2.2-rc.1（全局包同版本），node v22.23.3，Linux instabox-dsh-01 6.18.60-instabox；模型 opencode-go/deepseek-v4.1-flash；实验室 3082；分支 spike/s3-tool-fence@55d3b8c（修复前 HEAD 6cc0560），驱动 spike/s4-native-worker@ff1f2f3；harness 基线 66491b05（tag dsh-v0.2.2-rc.1）。逐项环境存 `r3-env.txt`、`r3-dump-config-excerpt.txt`。
- 修复：lab profile 重复 `@deepseek-ai/*` 包软链到宿主副本（`relink-host-packages.sh`）；fence tsdown 补 `external`；coordinator preset 补 compaction 组；driver 补 inject/默认模型/serviceFor compact。修复前后对照 `r3-before-fix-create.json` / `r3-after-fix-create.json`。
- 步骤 1a：pass。standard 33 个工具（`r3-1a-tools-standard.json`），coordinator 2 个（`r3-1a-tools-coord.json`），diff `r3-1a-tools-diff.json`；P1 coordinator 只列两个工具（`r3-1a-p1-coord.json`），P1b 确认没有 working_directory（`r3-1a-p1b-coord.json`）。
- 步骤 1b：pass。P2a–P2e 工具不在 schemas、模型未发起调用（`r3-1b-p2a…p2e.json`）；P2f decoy 被 guard 拒绝 `Error: spike-s3-fence: tool "spike_decoy_shell" is outside the coordinator whitelist`（`r3-1b-p2f.json`）；P2g probe 返回 `PROBE-OK-51D2`（`r3-1b-p2g.json`）；7 轮存活检查全过；`/tmp/spike-s3-decoy-ran.txt`、`/tmp/spike-s3-probe.txt` pre/post 均不存在（`r3-1b-files-pre.json` / `r3-1b-files-post.json`）。
- 步骤 2：pass。bad-deny 抛 `tools.restrict() names unknown global tool "tool_that_does_not_exist_xyz"; known global tools: working_directory`；scoped 名 `spike_projects_probe` 同样抛 unknown global tool；inspect 记 `creation failed, agent never announced`；resume 报 session not found；无存储残留（`r3-2-step2.json`、`r3-2-session-residue.json`）；事后 health 200。
- 步骤 3：pass。30 轮填充（`r3-3-step3.json` 的 `filler_turns`，每 5 轮 usage：5/10/15/20/25/30 = 3787/639/1354/702/635/769 input，cacheRead null/9600/11904/14464/18176/20096）；compactNow 200：replacedRange [8,254]、62 个 shadowed seq、12036 tokens、summarySeq 259、summary usage 635/1793/23036/20608；INDEX 配置文本 === 压缩前 === 压缩后（299 bytes，`r3-3-index-configured-compare.json`，diff 见 `r3-3-index-diff.txt`），三个哨兵各 1 次；压缩后 INDEX 问答仍答 P-BETA/BETA-9C21；压缩后 3 轮 usage `r3-3-step3.json`（`post_compaction_turns`）；空短会话 compactNow 返回字面量 `null`。
- 未观测：pruner 无日志活动；`cacheWriteTokens` 全程 null（字段缺失，未按 0 计）；部分轮次 `request/header` 无 model，driver 记 null。
- 结论：见 docs/spike/reports/S3-coordinator-fence.md（通过，有条件）。证据目录：spikes/s3/evidence/（gitignored，retry #3 前缀 `r3-`）。
