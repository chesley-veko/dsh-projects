# Spike 计划：M0 前的宿主与执行层探路

> 状态：现行（2026-11-08）。本文是 [roadmap.md](../architecture/roadmap.md) 中 Spike 一行的执行版，取代 [dsh-integration.md §5](../architecture/dsh-integration.md) 的简表。执行由其他 agent 分头完成，最终审核由 Hark 负责（见 §6）。

## 1. 目的与边界

Spike 只回答一个问题：**文档里押注的 DSH 宿主接缝和 ACP 执行者能力，在锁定版本上是否真实成立。** 产出是带证据的结论，以及需要改的设计点。

- **做**：写丢弃式最小实验，在真实 DSH、真实 CLI、真实模型上跑通或证伪。
- **不做**：Engine、SQLite schema、状态推导、UI 成品、Library。这些属于 M0 之后。验证快照与 effect 对账的故障注入属于 M0 验收，不在 Spike 内。
- **门槛**：S1 不通过即阻断 M0（[ADR-0018](../adr/0018-worker-visibility-seam.md)）；S7 不通过的组合在产品里禁用（[ADR-0017](../adr/0017-repository-execution-trust.md)）。其余项不通过时修改设计，不阻断。

## 2. 共同规则

1. **锁定基线**。所有实验基于 S0 锁定的 `deepseek-harness` 提交（当前文档基线 `fcc0ad46`）与 `dsh-superagent-prototype@8c32a9d`。若 S0 改锁到上游新版本，所有报告写新 SHA，行号按新 SHA 引用。
2. **代码不进 main**。实验代码放在分支 `spike/<编号>-<slug>`，目录 `spikes/<编号>/`。只有报告进 main。
3. **只认真实证据**。不接受 mock 或"按源码推断应当可以"。只读源码得出的结论必须标「推断（源码）」，且不能算作通过。
4. **必须有反例**。每项至少一个失败或边界场景（断线、重启、拒绝、未知工具名等），记录实际行为。
5. **外部版本全记录**。DSH、Node、各 CLI 与 ACP 适配器的版本号、操作系统、模型名称都写进报告。
6. **不改宿主代码**。需要上游补丁才能通过的项，报告写「需补丁」，附最小 diff 草案和插件侧降级方案（[ADR-0003](../adr/0003-host-extension-points.md)）。补丁不在本轮提交上游。
7. **卡住就报**。同一问题连续两种做法都失败，停下来提交「部分结论」报告，不要绕。
8. **凭据**。只用测试账户与最小权限 API Key，不把任何 key、token 写进分支、日志或截图。

## 3. 工作包

| 编号 | 主题 | 门槛 | 依赖 | 预估 |
|---|---|---|---|---|
| S0 | 基线锁定与源码复核 | 前置 | — | 0.5 天 |
| S1 | Worker 会话可见性接缝 | **阻断 M0** | S0 | 1 天 |
| S2 | 协调者会话的视图、输入框与右栏 | 改设计 | S0 | 0.5 天 |
| S3 | 协调者工具围栏与 INDEX 注入 | 改设计 | S0 | 0.5 天 |
| S4 | DSH 原生 worker 的创建与能力 | 改设计 | S0 | 0.5 天 |
| S5 | 本机 ACP 执行者能力矩阵 | 改设计 | S0 | 1 天 |
| S6 | SSH 远端执行与 MCP 回路 | 改设计 | S5 | 0.5 天 |
| S7 | 执行信任边界 | **禁用不安全组合** | S0 | 1 天 |

建议分四路并行：A 路 S0 → S1 → S2；B 路 S3 → S4；C 路 S5 → S6；D 路 S7。S0 完成前其他路可以先读源码、搭环境。墙钟约 2 天。

### S0 基线锁定与源码复核

- **要回答**：锁哪个 DSH 提交；文档里引用的行号和接口在该提交上是否仍成立。
- **步骤**：拉取上游 `main` 与 `fcc0ad46`，决定锁定版本并说明理由。逐条复核下列此前未核实的点，结果写入 [research/dsh-source-verification.md](../research/dsh-source-verification.md) 的新小节：
  - `packages/client/file-upload/src/index.ts:283-290` 拒绝向 subagent 上传（`assertOrdinaryAgent`；门控调用在 `:237` 的 `store()`）；
  - `subagent` 无 `parent-unavailable` 错误路径：实际为 `packages/subagent/subagent/src/index.ts:275-277` 的 `UNAUTHORIZED`（要求精确的 live parent agent）与 `packages/subagent/subagent/src/control.ts:85-89` 的 `subagent/delivery-unavailable`；
  - `conversation.input.left`、`conversation.input.model` 插槽名是否存在；
  - InputBar 空输入时是否保留 Stop；
  - `subagent-acp/src/run.ts:344-345` 子进程环境黑名单清洗的具体规则（该处是注释；规则在 `packages/subprocess/subprocess/src/index.ts:47,66-80` 与 `types.ts:13`）；
  - `ctx.agents.create` 签名（`experimental/webhook/src/session.ts:110-118`，流程 `:93-155`）与 `agentOptions` 的模型字段（`core/agent/src/runtime-types.ts:35`；`ModelSelection.model` 见 `types.ts:83`）；
  - [research/dsh-capabilities.md](../research/dsh-capabilities.md) 约 157、243 行的 `ctx.agents.create` 旧写法。
- **通过标准**：每条给出「成立 / 不成立 / 已移动到 X」与新行号。基线口径：S0 锁定 `fcc0ad46`（release 合回 `origin/master` 的合并提交，PR #7873）；S1/S2 实验跑的是官方 tag `dsh-v0.2.2-rc.1`（`66491b05`），比它早 811 个提交，`subagent/subagent/src/index.ts` 与 `control.ts` 在两个提交间有差异，引用行号时按对应提交注明。
- **产出**：锁定 SHA，复核表，需同步修改的文档清单。

### S1 Worker 会话可见性接缝（ADR-0018）

- **要回答**：不改宿主时，能否让项目 worker 会话不进入左栏「未分组」，同时不损坏其他能力。
- **步骤**：
  1. 用 `ctx.agents.create` 创建 id 前缀为 `proj-worker-` 的会话，确认它在左栏的实际位置。
  2. 逐一尝试插件侧方案：会话列表过滤类 slot（若存在）、`sidebar.session.row.*`、客户端 session service 层过滤、按 cwd 归入某个已登记工作区。记录每种方案是**从列表移除**还是**仅装饰**。
  3. 对能移除的方案，验证：`openSession` 仍能打开该 worker；worker 内可调用 `subagent`；可向 worker 上传文件；协调者会话重建不影响运行中 worker；DSH 重启后 worker 仍不出现在「未分组」。
  4. 若插件侧全部失败，写出上游 `SessionOrigin = 'project-worker'` + `tree.ts:235` 过滤的最小 diff 草案，列出涉及文件（`core/session/src/types.ts:122,161`、`api/session-controller/src/list.ts:374`、`client/sessions/service.ts:36`、`lineage.ts:34`），本地打补丁跑同样的 3 项验证。实测落地范围已扩到 18 个文件、26 行（含下游头类型与持久化格式校验门控），完整清单见 [ADR-0003](../adr/0003-host-extension-points.md)。
- **通过标准**：存在一种不改宿主的方案，worker 不出现在左栏列表，且第 3 步全部通过。只做到 row 装饰算**不通过**。
- **证据**：左栏截图（创建前、创建后、重启后），每项能力的操作录屏或日志。

### S2 协调者会话的视图、输入框与右栏

- **要回答**：`conversation.view`（`project-overview` / `project-run`）加 `conversation.composer` 接管，能否保持右栏常驻且只有一个输入框。
- **步骤**：在协调者会话注册两个视图；切换视图、切换会话、打开 `main` 面板再返回，观察 `activePanelId` 与右栏状态；在 `project-run` 视图接管输入框并发送一条消息；注册 `conversation.input.left` 的 chip 与复用 `conversation.input.model`。
- **通过标准**：所有切换路径下右栏 `sidebarRightTabs` 不被收起；任何时刻底部只有一个输入框；chip 与模型选择器可见可用。
- **证据**：各状态截图，`activePanelId` 日志。

### S3 协调者工具围栏与 INDEX 注入

- **要回答**：协调者能否只拿到 Projects 工具；INDEX 注入是否稳定。
- **步骤**：
  1. 在协调者 preset 上调用 `tools.restrict({ deny })` + `tools.guard()`，列出模型实际可见工具；尝试让模型调用 `working_directory`、shell、文件读写和全局 MCP 工具。
  2. 在 `deny` 中放一个不存在的工具名，记录是否抛错，以及抛错是否会拖垮会话。
  3. 用 `systemPrompt.section` 注入一份 INDEX，长对话触发 `context-compaction` 后检查 INDEX 是否完整保留；连续多轮记录 provider 返回的缓存命中字段（若有）。
- **通过标准**：被屏蔽的工具在模型侧不可见且调用被拒；compaction 后 INDEX 完整；缓存命中率不因注入而归零。
- **证据**：工具清单前后对比，调用失败日志，compaction 前后的提示词片段，缓存字段记录。

### S4 DSH 原生 worker 的创建与能力

- **要回答**：`ctx.agents.create({ sessionId, signal, meta: { cwd, agentPreset }, agentOptions, setup })` 是否满足 worker 需要。
- **步骤**：预生成 `sessionId` 后创建 worker；用 `agentOptions` 指定一个非默认模型，确认首轮即使用该模型，且用户全局默认模型未被改；cwd 指向一个 git worktree 与一个无仓库空目录各一次；在 `setup` 注册一个 Projects 工具并被调用；不调用 `workspaceRegistry.create`，确认工作区数量不变；`signal` 中止后会话状态；DSH 重启后能否按 `sessionId` 找回。
- **通过标准**：上述全部成立，或给出可行替代。
- **证据**：模型字段日志，全局设置前后对比，工作区列表截图。

### S5 本机 ACP 执行者能力矩阵

- **要回答**：自建 ACP client 依赖的能力，三个首批执行者各支持到什么程度。
- **对象**：`@agentclientprotocol/claude-agent-acp`、`@agentclientprotocol/codex-acp`、本地 `dsh --profile acp`。Gemini（`gemini --acp`）与 OpenCode（`opencode acp`）有余力再做。
- **逐项测**：
  1. `initialize` 返回的能力声明（原样存档）；
  2. `session/new` 带 `mcpServers`，接一个最小薄代理 `projects-mcp-stdio.mjs`（转发到本机回环 HTTP 的假 Engine，只回显并记录），确认执行者能列出并调用工具；
  3. `session/set_config_option` 切 `model`（及 effort），确认下一轮生效；
  4. `session/request_permission`：挂起数分钟后再回应原 RPC，测允许、拒绝、取消三种；
  5. `session/cancel`：在工具调用进行中取消，记录对半写文件和后续 prompt 的影响；
  6. `session/resume` / `load`：进程退出后续接；
  7. 能否按某个外部 id 查询或去重一次 `session/new` 或 `session/prompt`（ADR-0015 的 `reconcile`），不能则明确写「不支持，恢复走 unknown」；
  8. 本地订阅登录与 API Key 两种凭据下各跑一次（不得把凭据写入日志）。
- **通过标准**：输出一张 执行者 × 能力 的矩阵，每格为「支持 / 部分 / 不支持」并附证据。矩阵本身就是结论，不要求全绿。
- **证据**：每格对应的 JSON-RPC 往返日志（脱敏）。

### S6 SSH 远端执行与 MCP 回路

- **要回答**：`ssh host -- dsh --profile acp`（以及 S5 中表现最好的一个外部执行者）能否作为远端 Run。
- **步骤**：在一台测试主机上通过 ssh stdio 跑 ACP 往返；用 `ssh -R` 把远端端口转回本机回环 HTTP，让远端执行者调用薄代理 MCP；拔网 30 秒再恢复，记录 ACP 会话、远端进程和 MCP 调用的实际状态；本机进程退出后，远端进程是否残留。
- **通过标准**：正常往返与 MCP 回路可用；断线行为被准确记录，能据此设计 [ADR-0016](../adr/0016-local-project-host-availability.md) 的 lease 与回收。
- **证据**：往返日志，断线前后远端 `ps` 输出。

### S7 执行信任边界（ADR-0017）

- **要回答**：DSH OS sandbox 在本机能把 worker 和仓库脚本关到什么程度。
- **步骤**：准备一个「恶意」测试仓库，脚本尝试：读 `~/.ssh`、读 CLI 登录目录、使用 `SSH_AUTH_SOCK`、写 Checkout 之外的文件、访问未声明的外网、读宿主 DSH 配置。分别在以下条件下运行：DSH sandbox `workspace-write`；隔离 HOME + 空 SSH agent 的 install 进程；`credential=cli-login` 下的 Claude Code 与 Codex 进程；validator 只读快照。记录在 macOS 与 Linux 上的差异（至少覆盖一种）。
- **通过标准**：输出 条件 × 越权尝试 的矩阵。凡是越权成功的组合，在报告中标为「须禁用或须 full-access 风险确认」。
- **证据**：每次尝试的命令与输出。

## 4. 报告格式

每个工作包在 `docs/spike/reports/S<n>-<slug>.md` 提交一份报告，通过 PR 合入 main，PR 只含报告与截图。模板：

```markdown
# S<n> <主题>
- 结论：通过 / 有条件通过 / 不通过 / 部分完成
- 执行者：<agent 或人>    日期：
- 基线：deepseek-harness@<sha>，其他版本：
- 实验代码：spike/<n>-<slug>@<sha>

## 结论摘要（3 句以内）
## 逐项结果（表：检查项 / 结果 / 证据链接 / 备注）
## 反例与故障场景
## 对设计的影响（需改的 ADR 或文档，给出建议措辞，不直接改 ADR）
## 未完成与推断项（明确标注）
## 复现步骤
```

## 5. 完成定义

- 8 份报告齐全，S1 与 S7 有明确结论。
- 每份报告可从所列分支 SHA 复现。
- 所有「推断」与「需补丁」都已标注。
- 汇总后的设计改动以 ADR 修订 PR 提出，由 veko 批准后合入。

## 6. 最终审核（Hark）

审核逐份进行，审核意见写在报告末尾的「审核」小节。审核项：

1. 基线 SHA 与版本是否一致，行号是否对应该 SHA。
2. 每条「通过」是否有真实运行证据，而不是源码推断或 mock。
3. 反例是否真实执行过，失败行为是否被记录。
4. S1 是否混淆了「移除」与「装饰」；S7 是否有越权成功却被标为通过的组合。
5. 对设计的影响是否落到具体 ADR，是否与现有 ADR-0013–0018 冲突。
6. 抽查复现：每路至少复跑一项关键检查（视审核环境能力而定，无法复跑时注明）。

审核完成后产出一份汇总：M0 是否放行、需修订的 ADR 列表、原型需同步的改动。
