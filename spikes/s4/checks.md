# S4 逐项检查步骤

前置：按 `test-fixtures.md` 备好 worktree 目录、空目录、路由扩展
（deepseek-v4-pro 已进路由 models 列表）、全局默认快照。所有调用
走 `plugin-interface.md` 的假设接口；接口与实际不一致时先改调用
方式，不改结论口径。

## 检查项 1 — 预生成 sessionId 后创建

- 生成 id：`spike-s4-<uuid>`（uuid 用 `uuidgen` 或 `python3 -c
  "import uuid; print(uuid.uuid4())"`）。
- 调 `POST /spike/agents.create`：`{sessionId, cwd:
  /data/home/workspace/spike-s4-test/wt-1, agentPreset:
  dsh-superagent-worker, setup: "none"}`（不指定 agentOptions，用
  全局默认模型）。
- 期望：200 `{"status": "created"}`；`GET /spike/agents.inspect`
  返回同一 sessionId，status live，cwd 与传入一致。
- 证据：create 返回原文；inspect 返回原文。
- 反例：同一 sessionId 创建两次。期望第二次明确失败（id 已占用），
  记录错误原文；不得静默复用已存在会话。

## 检查项 2 — agentOptions 指定非默认模型，首轮即用，全局默认未改

- 前置快照：`GET /spike/global-default`（期望
  opencode-go/deepseek-v4.1-flash）；dsh-01 上
  `DSH_HOME=~/workspace/dsh-superagent-lab dsh --profile superagent
  --dump-config | grep -A4 'id: agent-default-model'` 的输出存档。
- 创建 worker B：`{sessionId: spike-s4-<uuid2>, cwd: wt-1,
  agentOptions: {provider: opencode-go, model: deepseek-v4-pro},
  setup: "none"}`。
- 发提示词（见 prompts.md P-S4-1）并记录返回的 `model` 字段：期望
  首轮即为 `opencode-go/deepseek-v4-pro`。
- 再创建一个普通会话（不指定 agentOptions），发同一提示词，记录其
  `model` 字段：期望仍为 deepseek-v4.1-flash。
- 完成后复查：`GET /spike/global-default` 与 dump-config 的
  agent-default-model 均未变。
- 证据：三次 prompt 返回的 `model` 字段；前后两次全局默认快照的 diff
  （期望无 diff）。
- 反例：agentOptions 指定一个路由里没有的模型（如
  `deepseek-v4.1-flash` 以外的未列名，例 `glm-5.3` 若未进路由）再创
  建一次，记录创建或首轮调用的失败原文；确认失败发生在模型解析层，
  不是 agents.create 层。

## 检查项 3 — cwd 指向 git worktree 与无仓库空目录各一次

- 3a（worktree）：cwd 用 `wt-1`（`test-fixtures.md` 建好的 git
  worktree）。创建 worker C，发提示词 P-S4-2（让模型报当前目录与
  git 状态），记录模型是否正确读到 worktree 的分支与 git 信息。
- 3b（空目录）：cwd 用 `empty-1`（无 .git 的空目录）。创建 worker D，
  发同一提示词，记录：会话是否正常创建、模型是否正确报出该空目录、
  是否有任何与“无仓库”相关的错误或降级。
- 证据：两次 inspect 的 cwd 字段；两次模型回复全文。
- 反例：cwd 指向一个**不存在**的目录再创建一次，记录错误原文与
  create 是否拒绝（meta.cwd 是“已验证的绝对路径”，预期应拒绝）。

## 检查项 4 — setup 注册 Projects 工具并被调用

- 创建 worker E：`{sessionId: spike-s4-<uuid5>, cwd: wt-1, setup:
  "projects-probe"}`。
- 发提示词 P-S4-3（让模型调用 `spike_projects_probe`），记录：
  `calls` 里有该工具调用且结果为 `PROBE-OK-51D2`；模型回复引用了
  该返回值。
- 再发一轮不提该工具的普通问题，确认会话正常继续。
- 证据：prompt 返回的 calls 记录与回复全文。
- 反例：`setup: "none"` 的会话里让模型调用 `spike_projects_probe`，
  期望调用失败（UNKNOWN_TOOL），记录错误原文——证明 probe 工具确实
  来自 setup 注册，不是全局挂载。

## 检查项 5 — 不调用 workspaceRegistry.create，工作区数量不变

- 前置：`GET /spike/workspaces` 记基线 count（注意：基线含 superagent
  自己的 machine workspace，不得假设为 0）。
- 检查项 1–4 的每次创建前后各取一次 count，期望全程不变。
- 另取左栏截图（DSH UI）：检查项 1–4 创建的 worker 不得在左栏新增
  顶层 workspace 分组（应落在“未分组”）。
- 证据：每次创建前后的 count 对照表；左栏截图（创建前、每次创建后）。
- 反例：对照一次 `workspaceRegistry.create` 的行为——在同一 dsh-01
  上用 superagent 自己的 worker 创建路径（走 Ticket，见 S0 §3）建
  一个 worker，确认左栏**确实**多一个分组（证明计数方法本身能检出
  变化，不是量表坏了）。

## 检查项 6 — signal 中止后会话状态

- 6a（创建期 abort）：创建 worker F，`abortAfterMs: 200`（setup 进行
  中 abort；若插件不支持该参数，改由指挥者在 create 调用发出后
  200ms 内调 `POST /spike/agents.abort`）。期望：create 明确失败
  （记录错误原文）；`inspect` 查不到 live agent；但会话存储目录下
  该 sessionId 的事件文件存在（setup 文档：已提交的 Session 事件保留）。
  随后调 `POST /spike/agents.resume`，记录能否找回、找回后状态。
- 6b（创建完成后 abort）：对检查项 1 已创建的 live worker 调
  `POST /spike/agents.abort`。期望：返回 `noop / signal-detached`，
  会话继续 live；发一轮提示词确认仍能回复。
- 证据：两次 abort 的返回原文；6a 的 inspect/resume 结果与存储目录
  `ls`；6b 的后续 prompt 回复。

## 检查项 7 — DSH 重启后按 sessionId 找回

- 选检查项 1 的 worker（已有若干轮对话历史），记下 inspect 状态与
  最近一轮回复摘要。
- 重启服务：dsh-01 上 `tmux kill-session -t dsh-superagent`，再
  `~/workspace/dsh-superagent-lab/start.sh`，等 20 秒后 models 接口
  返回 200。
- 调 `POST /spike/agents.resume {sessionId}`，期望 200 resumed；
  `inspect` 状态 live；发一轮提示词问“上一轮我们聊了什么”，记录
  模型是否能引用重启前的历史（证明持久化恢复的是同一会话，不只是
  同一 id 的空壳）。
- 证据：重启前后 inspect 对照；resume 返回；历史引用回复全文。
- 反例：resume 一个不存在的 sessionId，记录错误原文。
- 注意：机器 30 分钟空闲自动暂停——重启测试须在暂停前连续跑完；
  若机器中途暂停，先 resume 机器再重跑本项。
