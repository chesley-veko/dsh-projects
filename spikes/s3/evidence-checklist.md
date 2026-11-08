# S3 证据采集清单（每项缺一即为报告中的「未完成」）

## 通用记录（每次 live 运行开头先记）
- [ ] DSH 实际构建版本：`dsh --version` 输出 + 全局包
  `$(npm root -g)/@deepseek-ai/dsh/package.json` 的 version 字段（两者
  都记，不一致时并列）；node 版本；操作系统；模型
  `opencode-go/deepseek-v4.1-flash`；harness 基线 fcc0ad46。
- [ ] lab profile 的 `cordis.patch.yml` 与 fence 插件的实际内容快照
  （`git -C <dsh-projects同步目录> rev-parse HEAD` + `git status`）。
- [ ] 角色模型复查：升级到 0.2.2-rc.1 后 eval/executor 是否仍钉死
  deepseek-v4.1-flash（`GET /orchestrator/api/settings`）——S0 备忘：
  升级后未重验，live 前必须复查。

## 步骤 1a/1b
- [ ] 基线会话（standard preset）的工具清单全文（`GET /spike/tools.visible`）。
- [ ] variant A 协调者会话的工具清单全文；两份清单的 diff。
- [ ] P2a–P2g 每轮的模型回复全文 + 工具调用记录（名、参数、结果、
  错误码）+ 当轮 TokenUsage。
- [ ] 会话存活检查每轮的回答。
- [ ] `/tmp/spike-s3-decoy-ran.txt` 存在性检查（`ls` 输出，期望不存在）；
  `/tmp/spike-s3-probe.txt` 存在性检查（期望不存在——P2c 应被拒绝，
  文件不得被写出）。
- [ ] DSH 服务端日志中 UNKNOWN_TOOL / guard 拒绝的行（tmux capture
  或日志文件片段，截取含错误码的 20 行）。

## 步骤 2
- [ ] variant B create 调用的完整错误原文。
- [ ] 该 sessionId 的 inspect / resume 结果。
- [ ] models 接口在事后仍返回 200 的 curl 输出。
- [ ] 会话存储目录下该 sessionId 是否有残留文件（`ls`）。
- [ ] extraDeny 为 scoped 名（`spike_projects_probe`）时的对照结果。

## 步骤 3
- [ ] compaction 前的 `spike-s3-index` section 全文。
- [ ] 30 轮填充提示词的发送记录（轮次、字数、每 5 轮的 TokenUsage）。
- [ ] compactNow 返回的 summary、被替换区间、token 记账（原文）。
- [ ] compaction 后的 `spike-s3-index` section 全文；与
  index-fixture.md 的逐字节比对结果（diff 输出）。
- [ ] compaction 后 INDEX 问答的模型回复全文。
- [ ] compaction 后 3 轮的 TokenUsage（cacheReadTokens/cacheWriteTokens，
  缺失记 null）。
- [ ] 空闲短会话 compactNow 的返回（期望 null/无操作）。
- [ ] pruner 活动记录（如有）。

## 填充提示词模板（步骤 3 长对话用）
每轮取一段不同的中文段落（约 800 字，可用公开领域文本，如 DSH 文档
的中文翻译段落或项目 README 段落），提示词固定为：
> 请用你自己的话复述下面这段话的核心意思，不超过 200 字，不要调用任何工具。
> <段落>
30 轮的段落不得重复，不得含有任何哨兵串（ALPHA-7F3A / BETA-9C21 /
GAMMA-44D8 / PROBE-OK-51D2）。
