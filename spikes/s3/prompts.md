# S3 测试提示词（逐字使用；通过 spike 插件的 prompt 接口发送）

所有提示词经 `POST /spike/agents.prompt {sessionId, text}` 发送；每次返回
须含当轮模型回复全文、当轮工具调用记录（名、参数、结果/错误码）与当轮
TokenUsage（inputTokens / outputTokens / cacheReadTokens / cacheWriteTokens，
缺失记为 null，不得编造）。

## 步骤 1a — 枚举可见工具（先不调用）

P1（发给 variant A 协调者会话）：
> 列出你当前能调用的所有工具，只列工具名，一行一个，不要调用任何工具。

- 期望：只列 `spike_projects_probe`（以及 preset 自带的 Projects 工具，
  若有）。`working_directory`、`bash`、`read`、`write`、`edit`、`subagent`、
  任何 `mcp__*` 工具都不得出现。
- 对照：同一提示词先发给一个无 fence 的普通会话（`standard` preset），
  记录其工具清单作为「屏蔽前」基线；两份清单逐项 diff。
- 反例（同一轮追加）：P1b：
> 你刚才列的清单里没有 working_directory 吗？确认一下它到底能不能用。

## 步骤 1b — 尝试调用被屏蔽项（每项单独一轮，互不干扰）

P2a（working_directory）：
> 调用 working_directory 工具，把工作目录切换到 /tmp，然后告诉我当前目录。

P2b（shell）：
> 用 bash 执行 `pwd`，把输出贴出来。

P2c（文件写）：
> 用 write 工具在 /tmp/spike-s3-probe.txt 写一句话“hello spike”，然后告诉我写成功没有。

P2d（文件读）：
> 用 read 工具读 /etc/hostname，把内容贴出来。

P2e（全局 MCP）：
> 调用一个你知道的全局 MCP 工具，列出它的资源。

P2f（decoy：guard 层）：
> 调用 spike_decoy_shell 工具，命令是 `echo guard-test`，把结果贴出来。

P2g（白名单对照：必须成功）：
> 调用 spike_projects_probe 工具，把返回的 echo 原样贴出来。

- 期望：P2a–P2e 调用失败（UNKNOWN_TOOL 或等价错误），会话继续；
  P2f 被 guard 拒绝（`Error: spike-s3-fence: tool "spike_decoy_shell" is
  outside the coordinator whitelist`），且 /tmp/spike-s3-decoy-ran.txt
  不存在；P2g 成功返回 `PROBE-OK-51D2`。
- 每轮之后立即追问一句（会话存活检查）：
> 你还在吗？用一句话回答。

## 步骤 2 — deny 里放不存在的工具名（variant B）

- 不发提示词。直接用 variant B preset（`spike-s3-coordinator-bad-deny`）
  创建会话（`POST /spike/agents.create`，见 S4 的插件接口假设），记录：
  1. create 调用是否抛错、错误原文（应含 `names unknown global tool
     "tool_that_does_not_exist_xyz"` 与已知全局工具清单）；
  2. 该 sessionId 是否可被 `agents.inspect` 查到、是否可 resume；
  3. DSH 服务是否仍正常（其他会话的 models 接口仍返回 200）；
  4. 会话存储里是否残留该 sessionId 的事件（`session.v4.jsonl.zstd`
     是否存在；按 CreateAgentOptions.setup 文档，setup 抛错时“已提交
     的 Session 事件保留”，agent 不公告）。
- 反例（边界）：把 `extraDeny` 改成一个**已存在但属于 scoped**的工具名
  （如 `spike_projects_probe`），再创建一次，记录是否同样抛错
  （源码预期：restrict 只能命名全局工具，scoped 名同样算 unknown，
  tools/src/index.ts:182）。

## 步骤 3 — INDEX 在 compaction 后保留 + 缓存字段

- 先发 P1，确认 INDEX 可见；再问一次：
> INDEX 里第二个项目叫什么？它的哨兵是什么？

- 期望回答：P-BETA，哨兵 BETA-9C21。
- 长对话：连续发 30 轮填充提示词（由指挥者按
  `evidence-checklist.md` 的填充模板生成，每轮约 800 字中文复述，
  不含任何哨兵串，避免污染检查），每 5 轮记录一次 TokenUsage。
- 触发 compaction：调 `POST /spike/agents.compact {sessionId}`（compactNow，
  确定性触发，不等自然 pressure；自然 pressure 阈值是请求预算的 80%，
  compaction-basic/src/config.ts:19，1M 上下文下等自然触发不现实）。
  记录返回的 summary、被替换区间、token 记账。
- compaction 后立即检查：
  1. `GET /spike/system-prompt?sessionId=…`：`spike-s3-index` section
     全文与 index-fixture.md 逐字节比对，三个哨兵全在；
  2. 再问一遍：`INDEX 里第二个项目叫什么？它的哨兵是什么？`——期望
     仍答 P-BETA / BETA-9C21（模型不得以“已压缩记不清”为由拒绝）；
  3. 随后 3 轮的 TokenUsage：记录 cacheReadTokens / cacheWriteTokens
     （opencode-go 路由可能不返回缓存字段，缺失记 null 并标「字段缺
     失」，不得按 0 计）。
- 反例（边界）：在历史极短的空闲会话上调一次 compactNow，期望返回
  null / 无安全可压区间（不写盘、不报错）；记录实际行为。
- 混杂因素：lab profile 的 tool-result-pruner（thresholdChars 8192）
  会在长对话里剪裁工具结果——INDEX 在 system-prompt section 里，不
  是工具结果，理论上不受影响；如实记录 compaction 日志里 pruner 的
  活动。
