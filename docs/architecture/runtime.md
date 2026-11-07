# 运行时设计

> 状态：现行（v2，2026-11-08）。名词定义见 [domain-model.md](domain-model.md)。

## 1. Engine：单写者与先存后做

- `Engine` 是所有域对象的唯一写者。命令同步执行，一个命令一个事务（`node:sqlite` + WAL + `synchronous=FULL`，嵌套 SAVEPOINT 的 `atomic()`）。写法沿用 dsh-superagent `src/app/store.ts`。
- 命令只做三件事：校验不变量、改表、入队 effect。副作用在**事务提交后**由 effect runner 执行：

| effect | 并发 | 失败处理 |
|---|---|---|
| `attempt.prepare`（建 worktree） | 每仓库 1（路径锁） | 退避 2s → 60s；3 次失败转 Question |
| `run.launch`（建 worker 会话） | 占 WorkerSlot | 瞬时失败重试 3 次 |
| `run.deliver`（投递消息） | 4；同会话保序 | 退避 2s → 60s；持续失败标 `undelivered` |
| `validate`（跑验证命令） | 每项目 2 | 不重试，结果即证据 |
| `github.sync` | 1 | 带 ETag，退避 |
| `attempt.reclaim`（回收 worktree） | 1 | 失败保留并告警 |

- 存储接缝（借 LoopX `AuthorityStore`）：`load / commit(expectedRevision, operationId, …) / readReceipt / scan`。`operationId` 保证重放幂等；「响应丢了但可能已提交」用回执判断。先只实现 SQLite。
- 重启恢复：未完成的 effect 从表里重跑；live Run 通过 DSH 会话状态重新对账。

## 2. 协调者

协调者是一个普通 DSH 会话，使用专用 preset `dsh-projects-coordinator`。

**工具集（完整清单，没有其他工具）**

| 工具 | 作用 |
|---|---|
| `project_status` | 推导后的看板摘要：每个 Task 一行（id、标题、显示状态、标记、一行摘要） |
| `task_create` / `task_update` / `task_link` | 拆任务、改描述、设依赖与父子 |
| `task_start` | 申请启动（Engine 决定排队还是立即启动） |
| `run_send` | 给某个 Task 的 worker 发消息（`queue` / `steer`） |
| `run_stop` / `task_retry` | 停止；用同一或另一 profile 重试 |
| `task_accept` / `task_cancel` | 仅在人明确同意时调用；accept 需带后继 |
| `context_read` / `context_propose` | 读 INDEX 与决策；起草决策或 spec |
| `review_request` | 为某 Attempt 开一个 reviewer Run |

**规则**
- 没有文件写、shell、长等待工具；边界在工具层，不在提示词。
- 首句秒回：收到人的消息先回一句确认与第一步，再调工具。
- 有界上下文：最近 N 轮对话 + `project_status` + `INDEX.md`。worker 的过程细节不进入协调者上下文。
- worker 回报以合成消息注入协调者会话：`<task id="YOU-4" state="verified|failed|question">一句结论</task>`，UI 折叠为「Update from YOU-4」单行，只有协调者对人正式发言才点亮未读。
- 运行中输入框保持 `Send`（steer），不变为 `Stop`。

## 3. Worker 与 worktree

**启动流程**
1. 认领 `(project, task)` → 预留 WorkerSlot（默认 3，范围 1–16；人类跟进可超额 1 槽；唤醒优先于新启动）。
2. 启动摘要（UI）列出：Task、仓库、基线分支、worktree 路径、环境、模型、refs 新鲜度；refs 过期先提示刷新，环境不可用则阻断。
3. `git` 在路径锁内创建 `<dataDir>/worktrees/<project>/<attempt>`，分支前缀由环境决定：本机 `agent/<task-id 小写>-<slug>`（如 `agent/you-4-staging-verify`），远程 sandbox `sandbox/<task-id 小写>-<slug>`；基于项目主仓库默认分支或用户选择的 ref。
4. `executor-dsh` 用 `sessionController.create({ cwd })` 创建 worker 会话，**不调用** `workspaceRegistry.create`，避免左栏为每个 worktree 新增顶层工作区（待 M0 spike 验证，见 [dsh-integration.md](dsh-integration.md)）。
5. 首条消息包含：Task 原文（不经协调者转述）、worktree 说明（原始仓库、worktree 根、分支、「所有改动只在 worktree 内」）、`INDEX.md`、相关 runbook 路径。
6. 环境变量白名单：显式裁剪父进程凭据，只注入该项目声明的变量名。

**结束与验证**
- worker 调 `task_report(state, summary)` 声明 `done | blocked | failed`。
- `done` → 入队 `validate`：跑项目设置里的 `validate` 命令（如 `pnpm test`），结果写 Evidence；退出码 0 只是必要条件，输出需匹配项目配置的通过判据（默认：退出码 0 且无失败用例计数）。
- 结果以合成消息回报协调者。

**回收**
- 删除 worktree 前把未提交改动存为 `refs/dsh-projects/preserved/<attempt>`（不碰全局 stash）；脏工作区不允许直接删除。
- 策略：Task `accepted` 或 `canceled` 后 1 小时、空闲 72 小时回收 worktree，**保留分支**；启动时 `git worktree prune` 兜底。
- 重新打开已回收的 Attempt：从分支（加 preserved ref）重建 worktree。

**PR 与 CI**
- 观察者每 60 秒（带 ETag）同步 PR、checks、review。
- CI 失败或 changes requested → 自动 `run_send` 给拥有该分支的 Run（受预算与重试上限约束）。
- 合并永远由人发起；系统不自动合并。

## 4. 人的注意力：Question Tray

- worker 工具 `ask_human(kind, scope, body, options?)` 产生 Question；Run 进入 `waiting_input`。
- 托盘只在该项目的协调者会话中渲染（`conversation.input.overlay`），显示「Question from YOU-4」、选项与自定义回答。
- 回答：客户端 → HTTP → `question.answer` 命令 → effect `run.deliver(mode=steer)` 直达该 Run，写审计。
- `gate` 阻塞并计入「Waiting on you」；`request` 在托盘但不阻塞；`wish` 不打断，只进协调者摘要。
- 自动化不得替 `waiting_input` 的 Run 作答（无 AutoYes）。

## 5. Driver：在 DSH 会话里推进

借鉴 LoopX `packages/dsh-loopx-plugin/src/driver.ts`：

- 订阅 `agent/status`、`agent/inbox/inserted|claimed|discarded`、`session/event`（`step/end`、`turn/end`），把 worker 活动写成 `run.activity` 事实。
- 用 `agent/pre-step` 中间件在消息进入模型前最终复核：Run 是否仍 live、是否有 open gate、项目是否 paused。
- 人类输入永远优先：发现人类消息在排队时，撤回自动续跑消息。
- 15 秒行摘要直接取最新工具动作（0 次模型调用）；Turn 结束时取 worker 的结论句。

## 6. Library 与项目记忆

| 层 | 位置 | 谁读 | 怎么注入 | 谁写 / 转正 |
|---|---|---|---|---|
| 仓库规范 | 各仓 `AGENTS.md` / `CLAUDE.md` | 进入该仓 worktree 的 worker | DSH 原生 `dsh-agent-instructions` | 人维护 |
| 项目索引 | `context/INDEX.md`（≤1200 tokens） | 协调者 + 所有 worker | 会话首条消息注入；变更后经 inbox 推送 | 人 + 协调者；worker 只读 |
| 决策 / Spec | `context/decisions/NNN-*.md`、`context/specs/*.md` | 协调者 + 相关 worker | `context_read` 按需 | 协调者起草 → 人在对话里确认即 `ratified`；被替代标 `superseded` |
| Runbook | `context/runbooks/*.md` | 仅 worker | 首条消息列出相关路径，按需读 | worker `context_propose` → `proposed`；关联 Attempt 有 verified Evidence 才 `ratified`；执行出错可 `context_dispute` → `disputed` 并在右栏顶部出待办 |
| 工件 / 资料 | `context/artifacts/<task>/`、`context/uploads/` | 人在 Library 预览；agent 按路径引用 | — | validator / worker 产出（带 Evidence）；人拖拽上传 |

**写入协议**
1. 只走工具，不裸写文件；工具校验路径白名单、大小、来源。
2. 写结论，不写过程：可复用的操作知识、带理由的决策、指向工件的指针。
3. 每条带来源（Task / Run id、时间）；无来源条目在巩固时优先降权。
4. `context/` 是本地 git 仓库，每次写入一个带 Task / Run id 的 commit，Library 可看 diff、可回滚。
5. **SQLite 的 `context_item` 是状态真相，Markdown 是正文**；状态不写在 Markdown 里。

## 7. 执行环境

- `Environment` 是 executor 的目标：`local_worktree`（默认）与 `remote_sandbox`（预留）。
- 健康检查是 executor 适配器的 `availability()`；结果与耗时写入 `environment.last_check_json`，UI 显示历史时间线。
- 自动重试：环境配置 `retryPolicy{attempts, baseDelayMs}`；不可用时阻断启动，不静默换环境。
- 默认环境：项目设置 > 用户记住的上次选择 > `local_worktree`。

## 8. 生命周期：Pause / Archive / Delete

| 操作 | 效果 |
|---|---|
| Pause | 撤销排队中的续跑消息，冻结新启动与 GitHub 轮询；正在执行的 step 跑完为止（不硬杀）；顶部显示 Paused 横幅 |
| Archive | 停止所有后台活动，从左栏移入归档视图；可恢复 |
| Delete | 二次确认后删除 SQLite 记录、`context/`、受管 worktree；保留远端分支与 PR；写一条最终审计到全局日志 |

## 9. 预算与并发

- 项目设置：并发上限（默认 3）、每日 token 预算（默认不限）。超预算只排队不拒绝，并在协调者摘要中提示。
- 每个 Run 的模型请求输出上限沿用 DSH preset 配置。
