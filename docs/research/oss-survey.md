# 多智能体编码编排 / Project 工作区工具调研（为 DeepSeek Harness「Projects」插件选型）

调研日期：2026-11-08。源码均为当天 `git clone --depth 1` 的 main 分支，本地路径 `research-repos/<repo>`。下文路径都相对于各仓库根目录。

> 先说几个"现状变化"（会影响参考价值）：
> - **stravu/crystal** 已于 2026-02 宣布废弃，改名为闭源的 Nimbalyst（见 README）。代码可以看，但不会再更新。
> - **All-Hands-AI/OpenHands** 主仓库现在只放 "Agent Canvas" 前端（AGENTS.md 写明了），后端的 Conversation/Event/Workspace 已经迁到 **OpenHands/software-agent-sdk**，所以这次两个仓库都读了。
> - **ComposioHQ/agent-orchestrator** 存在，现在已重定向到 **OrchestratorInc/agent-orchestrator**（产品名 Orchestrator.inc），后端从 TS 重写成了 Go 守护进程 + SQLite。
> - **sst/opencode** 的核心已经拆进 `packages/core`（Effect + drizzle/SQLite）。
> - 2026 年的商业对标：**Cursor Projects**（2026-09-10 发布，https://cursor.com/changelog/projects ）和 **Claude Code Projects 改版**（2026-09-17，二手资料 https://www.five.reviews/how-to/claude-code-projects-multiple-ai-agents/ ）。

---

## 1. BloopAI/vibe-kanban（Rust + React，SQLite）

**是什么**：本地看板，每张卡片（issue）可以开一个或多个 workspace（各自是独立的分支 + worktree），在里面跑 10+ 种 CLI agent，在 UI 里看 diff、写行内评论、开 PR、合并。

**数据模型**（`crates/db/src/models/*.rs`，迁移文件在 `crates/db/migrations/`）：
- `Task{project_id,title,description,status: Todo|InProgress|InReview|Done|Cancelled,parent_workspace_id}`。issue/看板现在搬到了 `crates/remote`（Postgres + Electric 同步，迁移 `20251202000000_migrate_to_electric.sql`、`20260113144821_remove_shared_tasks.sql`）；本地 `workspaces.task_id` 的外键在 `20260217120312_remove_task_fk_from_workspaces.sql` 里被去掉了。
- 关键一次重构 `20251216142123_refactor_task_attempts_to_workspaces_sessions.sql`：把 `task_attempts` 改名为 **workspaces**（只保存分支/worktree 相关字段：`branch, container_ref, setup_completed_at, archived, pinned, worktree_deleted`），executor 移到新建的 **sessions** 表（一个 workspace 可以有多个 session，可以换 agent），`execution_processes` 改为挂在 session 下（`run_reason ∈ setupscript|codingagent|devserver|cleanupscript|archivescript`，`status ∈ running|completed|failed|killed`，`dropped` 用来做"回滚后隐藏"）。另外有 `coding_agent_turns`（记录 agent 原生的 session_id/message_id，用于 resume）和 `execution_process_repo_state`（每次执行前后各仓库的 HEAD commit）。
- PR：`20260311000000_add_tracked_prs.sql` 把 PR 从 `merges` 表拆成独立的 `pull_requests(workspace_id, repo_id, pr_url UNIQUE, pr_number, pr_status, target_branch_name, merged_at, merge_commit_sha, synced_at)`。

**隔离与清理**：`crates/worktree-manager/src/worktree_manager.rs` 用全局路径锁 `WORKTREE_CREATION_LOCKS` 串行化同一路径上的 create 和 cleanup；`ensure_worktree_exists` 先检查 worktree 是否"正常"，不正常就重建（所以 worktree 是可以丢掉再重建的，分支才是真正要保留的状态）。`crates/local-deployment/src/container.rs::cleanup_expired_workspaces` 配合 `Workspace::find_expired_for_cleanup` 定期回收：没有运行中的进程，并且已归档超过 1 小时、未归档超过 72 小时，就删 worktree，只把 `worktree_deleted` 置为 true，分支保留；另外还有 `cleanup_orphan_workspaces`。仓库级别可以配置 setup/cleanup/archive/dev 脚本，以及 copy_files。

**执行器抽象**：`crates/executors/src/executors/mod.rs` 的 `trait StandardCodingAgentExecutor`（用 `enum_dispatch` 分发）包含 `spawn / spawn_follow_up(session_id, reset_to_message_id) / spawn_review / normalize_logs(MsgStore) / discover_options / get_availability_info / default_mcp_config_path`。实现有 claude、codex、cursor、gemini、opencode、amp、droid、qwen、copilot，以及通用 `acp/`。审批通过 `executors/src/approvals.rs::ExecutorApprovalService`（`create_tool_approval / wait_tool_approval / create_question_approval / wait_question_answer`）注入到 executor 里。

**人审**：任务状态 InReview；UI 里看 diff、写行内评论，评论作为 follow-up 发回同一个 session；`crates/review` 用来生成 review prompt；工具审批走上面的 approval 服务。`services/pr_monitor.rs` 每 60 秒轮询 open PR，PR 合并后，如果该 workspace 的所有 PR 都已关闭或合并，就自动归档。

**流式**：`utils/src/log_msg.rs::LogMsg{Stdout,Stderr,JsonPatch,SessionId,MessageId,Ready,Finished}`；agent 原始输出经过 `normalize_logs` 变成统一的对话条目，以 **RFC6902 JSON Patch** 的形式发出。数据库变更由 `services/events.rs` 在 SQLite 的 **preupdate hook** 里捕获，转成 patch 推给 WebSocket（`server/src/routes/workspaces/streams.rs`）。

**值得借鉴**：① **Workspace（分支/目录）和 Session（agent 会话）分开**，一个 workspace 可以先后挂多个 agent session（比如实现完换 reviewer）。② 用 JSON Patch 流同时表示"日志条目"和"实体快照"，前端只需要一个 reducer。
**坑**：schema 演进非常频繁（80 个迁移，包括 attempt→workspace 的大改、任务模型搬上云）。如果一开始就把 "Task/Attempt" 定死，后面会很痛。`ExecutionProcess.executor_action` 存成 JSON blob，靠虚拟列去查。

---

## 2. smtg-ai/claude-squad（Go TUI，tmux + worktree）

**是什么**：一个最小化的终端多会话管理器，每个 Instance 对应一个 tmux 会话 + 一个 git worktree。
**数据模型**：`session/instance.go::Instance{Title,Path,Branch,Status: Running|Ready|Loading|Paused,Program,AutoYes,Prompt}`；持久化结构 `session/storage.go::InstanceData` + `GitWorktreeData{RepoPath,WorktreePath,SessionName,BranchName,BaseCommitSHA,IsExistingBranch}` + `DiffStatsData`。
**持久化**：只有一个 JSON 文件（`config/state.go`：`~/.claude-squad/state.json` 里的 `instances` 字段），没有数据库，也没有事件日志。
**隔离/清理**：worktree 放在 `<configDir>/worktrees`（`session/git/worktree.go`）。**Pause** 的语义（`instance.go::Pause`）：如果工作区是脏的，先自动 commit `[claudesquad] update from ... (paused)`，然后 detach tmux、删除 worktree、保留分支，并把分支名复制到剪贴板；Resume 时重新 `worktree add`。孤儿 worktree 走 `os.RemoveAll` + `git worktree prune`。`CleanupWorktrees()` 一次性清空全部。
**执行器抽象**：基本没有。`Program` 就是一个命令字符串，在 tmux 里运行。
**人审/状态**：`tmux.go::HasUpdated` 抓取 pane 内容做哈希来判断"有没有新输出"，再用字符串匹配判断是不是在等确认（比如匹配 Claude 的 "No, and tell Claude what to do differently"）。`daemon/` 里的 AutoYes 守护进程会自动帮你按回车。审核靠 diff 面板和人工 push。
**借鉴**：Pause = 提交 + 删除 worktree + 保留分支，这是"省磁盘、可恢复"的简单做法。**坑**：靠 pane 抓屏 + 字符串匹配来判断状态非常脆弱，agent 版本一更新就失效；AutoYes 相当于绕过了审批。

---

## 3. stravu/crystal（Electron + SQLite，已废弃）

**数据模型**（`main/src/database/schema.sql` + `migrations/`）：`sessions{id,name,initial_prompt,worktree_name,worktree_path,status,pid,claude_session_id,...}`、`session_outputs`、`conversation_messages`、`prompt_markers`、**`execution_diffs{session_id,prompt_marker_id,execution_sequence,git_diff,files_changed,stats_*,before_commit_hash,after_commit_hash}`**（每条 prompt 对应一份 diff 快照）、`tool_panels{session_id,type,state JSON}`、`projects`。
**隔离**：`services/worktreeManager.ts`，用 `withLock('worktree-create-...')` 加锁；提供 `rebaseMainIntoWorktree / checkForRebaseConflicts / squashAndMergeWorktreeToMain / mergeWorktreeToMain`，是一个"本地合并"的工作流，不依赖 PR。
**执行器**：`services/panels/cli/AbstractCliManager.ts` 是抽象类，子类实现 `getCliToolName / testCliAvailability / buildCommandArgs / parseCliOutput / initializeCliEnvironment / cleanupCliResources`，基类负责 node-pty 启动、kill 整个进程树、可用性缓存。有 Claude 和 Codex 两个实现。
**审批**：`services/mcpPermissionServer.ts` 把 Claude 的权限请求通过一个 MCP 工具（`crystal-permissions`）桥接到 UI；任务排队用 Bull 或 SimpleQueue（`services/taskQueue.ts`）。
**借鉴**：按 prompt 记录 before/after commit 和 diff，可以做"按轮次回看/回滚"。**坑**：项目已死；会话和面板的模型绑死在 Electron IPC 上。

---

## 4. OpenHands（Agent Canvas + software-agent-sdk，Python）

**数据模型/持久化**：Conversation 是唯一的工作单元。`openhands-sdk/openhands/sdk/conversation/persistence_const.py`：每个会话一个目录，里面是 `base_state.json` 加 `events/event-{idx:05d}-{event_id}.json`，**一个事件一个文件、只追加**（`event_store.py::EventLog`）。执行状态 `state.py::ConversationExecutionStatus{idle,running,paused,waiting_for_confirmation,finished,error,stuck,deleting}`，另有 `stuck_detector.py`。
**隔离**：`openhands-agent-server/.../conversation_service.py` 支持 `ConversationWorktreeOptions{base: default_branch|head|ref, ref, branch_prefix}`（定义在 `sdk/conversation/request.py`），worktree 路径是 `<root>/<conversation_id>/<repo>`，并且会**往系统提示里注入 worktree 说明**（`_build_worktree_guidance`：明确告诉 agent 原始目录、worktree 根目录、分支，要求所有改动都在 worktree 里做）。清理在 `local_storage.py::remove_conversation_worktree`：rmtree 之后 `git worktree prune`，**分支保留**。远程模式是 Docker/VM 沙箱（`docker_runtime/`）。`workspace/base.py::BaseWorkspace` 提供 `execute_command / file_upload / git_changes / git_diff / pause / resume`。
**子任务**：Canvas 前端的 `src/api/launch-child-conversation-client-tool.ts` 给 agent 提供 "launch child conversation" 工具，参数 `target=local|cloud`、`isolation=worktree(默认)|shared`。调用后立即返回，结果之后以带固定前缀的 follow-up 消息回到父会话。
**执行器**：`sdk/agent/agent.py`（原生）和 `acp_agent.py::ACPAgent`（任何 ACP 协议的 agent，包括 Claude Code、Codex、Gemini、OpenCode）。
**审批**：`security/confirmation_policy.py`：`AlwaysConfirm / NeverConfirm / ConfirmRisky(threshold)`，配合 LLM/规则风险分析器（`security/analyzer.py`、`llm_analyzer.py`）。命中策略后会话进入 `WAITING_FOR_CONFIRMATION`。
**流式**：WebSocket `/session/{conversation_id}`（`session_socket.py`），支持 `resend_mode=all|since&after_timestamp` 做断线后的历史补发。
**借鉴**：① 事件溯源 + 按序号补发；② 风险分级审批；③ 子会话"即发即忘 + 异步回报"。**坑**：一个事件一个 JSON 文件，事件多了以后列目录、做查询都会变慢；仓库拆分太频繁，API 不稳定。

---

## 5. MrLesk/Backlog.md（TS/Bun，Markdown + git）

**数据模型**：`src/types/index.ts::Task{id,title,status,assignee[],labels[],milestone,dependencies[],references,parentTaskId,subtasks,priority,branch,ordinal,description,implementationPlan,implementationNotes,finalSummary,acceptanceCriteriaItems,definitionOfDoneItems,...}`。
**持久化**：仓库内的 `backlog/` 目录，一个任务一个 `.md` 文件（YAML frontmatter + 固定小节，示例见 `backlog/completed/back-99 - ....md`），配置在 `backlog/config.yml`（statuses、`definition_of_done`、`auto_commit`、`check_active_branches`、`active_branch_days`）。目录即状态：`tasks/`、`drafts/`、`completed/`、`archive/`、`decisions/`、`docs/`。
**跨分支**：`src/core/cross-branch-tasks.ts` 扫描所有活跃分支里的同一任务文件，取最新状态，这样每个 worktree/分支里的 agent 改了任务，看板都能看到。
**执行器/审批**：没有执行器。用 MCP（`src/mcp/tools/{tasks,workflow,milestones,documents,definition-of-done}`）和 CLI 让任意 agent 自己读写任务；`onStatusChange` 钩子（ADVANCED-CONFIG.md）可以在状态变化时触发 shell 命令，例如启动 claude。审核靠 git PR 和 DoD 勾选清单。
**借鉴**：**任务即文件**，可以 diff、可以在 PR 里审，人和 agent 用同一个格式；"实施计划 / 实施笔记 / 最终总结"三段式天然就是项目记忆。**坑**：并发写同一个文件会冲突；跨分支扫描在分支多的时候很慢；没有运行时状态，只记录意图。

---

## 6. eyaltoledano/claude-task-master（TS）

**数据模型**：`packages/tm-core/src/common/types/index.ts::Task{id,title,description,status,priority,dependencies[],details,testStrategy,subtasks: Subtask[]（只允许一层）,complexity,metadata,...}`，以及扩展字段 `TaskImplementationMetadata{scopeBoundaries,implementationApproach,technicalConstraints,acceptanceCriteria,skills,category}`。
**持久化**：`.taskmaster/tasks/tasks.json` 单文件，按 tag 分区，用 steno 原子写入（`modules/storage/adapters/file-storage/*`）；也可以选 API 存储（`api-storage.ts`）。工作流状态存在 `~/.taskmaster/{project-id}/sessions/`（`modules/workflow/managers/workflow-state-manager.ts`）。
**调度**：`modules/tasks/services/task-service.ts::getNextTask`：从依赖已全部完成、状态为 pending 或 in-progress 的任务里，按 优先级 → 依赖数 → ID 排序，**优先选进行中父任务下的子任务**。
**执行器**：`modules/execution/executors/base-executor.ts`：`ITaskExecutor{execute(task), getType(), isAvailable()}`，目前只有 ClaudeExecutor，`formatTaskPrompt` 把任务渲染成 prompt。
**工作流**：`modules/workflow/types.ts`：`WorkflowPhase = PREFLIGHT|BRANCH_SETUP|SUBTASK_LOOP|FINALIZE|COMPLETE`，子任务内部是 TDD 循环 `RED|GREEN|COMMIT`，配合 `test-result-validator.ts` 用测试结果做门禁。`modules/loop` 支持在 Docker 沙箱里循环执行。
**借鉴**：PRD → 任务拆分 → 复杂度评估 → `next` 选择器 → TDD 门禁，这套"规划层"很完整。**坑**：没有并行和 worktree 概念，是单 agent 串行；单个 JSON 文件在多 agent 并发写时不安全。

---

## 7. OrchestratorInc（原 ComposioHQ）/agent-orchestrator（Go 守护进程 + Electron，SQLite）——最接近目标形态

**是什么**：每个项目有一个**编排者（orchestrator）会话**，负责规划并启动 worker，每个 worker 有自己的 worktree/分支；看板的泳道由 agent、PR、CI、review 的事实**推导**出来；CI 失败和 review 意见会自动回流给拥有该分支的 worker。
**数据模型**（`docs/architecture.md` §Persistence，sqlc 生成）：`projects`、`sessions{project_id(可空),harness,session_mode(tui|chat),runtime_handle_id,provider_conversation_id,controller_generation,activity_state,is_terminated}`、`conversations/turns/messages/activities`、`pull_requests`、`pr_checks`、`pr_review_threads`、`pr_comments`、`notifications`、`change_log`。
**核心原则**：「**只持久化事实，显示状态在读取时推导**」。持久化的只有 `activity_state ∈ active|idle|waiting_input|blocked|exited`、`is_terminated` 和 PR 事实；`working / needs_input / ci_failed / changes_requested / merge_conflict / mergeable / merged` 这些都是在 service 层按优先级树计算出来的（同一文档 §Status derivation）。`lifecycle.Manager` 是唯一的写入路径。
**流式/CDC**：SQLite 触发器写入 `change_log(seq,...)` → CDC 轮询器按水位推进 → Broadcaster → SSE / 终端扇出 / 缓存失效。
**观察循环**：SCM 观察器每 30 秒拉一次 PR、checks、review（用 ETag），Runtime Reaper 每 5 秒探测一次进程存活。
**隔离**：worktree 放在 `worktrees/<project-id>/<session-id>`，先用临时分支 `ao/<session-id>/root`，启动后在后台用 LLM 生成 slug，重命名为 `ao/<slug>/root`；**已经 push 过的分支不再改名**。`backend/internal/ports/outbound.go::Workspace{Create,Destroy,Restore,ForceDestroy,StashUncommitted,ApplyPreserved,AddExclude}`：销毁前先用 `StashUncommitted` 把未提交的改动存成 `refs/ao/preserved/<session-id>` 的 commit 对象（不动工作区，也不碰全局 stash），`Destroy` 遇到脏工作区会拒绝执行。
**执行器抽象**：`ports/agent.go::Agent{GetConfigSpec, GetLaunchCommand, GetPromptDeliveryStrategy, GetAgentHooks(装 agent 原生 hook 回报 activity), GetRestoreCommand, SessionInfo}`，`Runtime{Create,Destroy,GetOutput,IsAlive}`（原生 PTY/ConPTY/tmux），Chat 模式走 ACP/原生协议驱动，号称支持 23+ 种 harness。
**编排者**：`session_manager/prompt.go::orchestratorSystemPrompt` 规定编排者**只协调、不写代码**，只能通过 CLI 操作：`ao status`、`ao spawn --project --name --prompt|--issue`、`ao send`、`ao session claim-pr`、`ao review trigger`（原生对抗式 reviewer）、`ao session kill`；明确禁止使用 runtime 自带的 subagent 工具。worker 的提示词另外规定 PR 和 issue 的行为边界。
**审批/人审**：`waiting_input/blocked` 表示有待审批的请求，自动化**不允许**往 blocked 的会话里注入输入；AO 内部的 review 通过不等于 GitHub approval，合并必须由人明确发起。
**借鉴**：① 事实/推导分离 + change_log CDC；② 编排者只能通过一组受限工具（spawn/send/status/claim-pr/review）行事；③ 销毁前把未提交改动存成私有 ref。**坑**：系统极其复杂（3800+ 个 commit，大量 TUI↔Chat 交接、休眠、fencing 逻辑）；靠提示词约束编排者"不写代码"，需要工具层面做硬隔离兜底。

---

## 8. sst/opencode 会话与子代理（TS/Effect，SQLite）

**数据模型**（`packages/core/src/session/sql.ts`）：`session_v2{project_id,workspace_id,parent_id,fork_session_id,fork_boundary,directory,title,summary_additions/deletions/files,cost,tokens_*,revert,permission(规则集),agent,model,time_busy/idle/archived,idle_outcome,resume_attempts}`、`session_message{session_id,seq,type,data}`（`(session_id,seq)` 唯一）、`session_part`。`worktree/sql.ts::worktree{project_id,directory,strategy}`，`workspace/sql.ts::workspace{provider,binding}`。
**隔离**：`worktree/strategies.ts::Strategy{id, create({sourceDirectory,directory,branch}), remove({directory,force}), list}`，策略可插拔；`workspace/driver.ts` 提供 `create / connect / suspendForIdle / destroy`（可以接远程沙箱）。
**子代理**：`tool/plugin/subagent.ts`，入参 `{description(3-5 个词), prompt, agent, session_id(可选，用于续聊), background}`，子会话就是 `parent_id` 指向父会话的普通 session。后台模式下立刻返回，完成后由 `session/subagent-completion.ts::deliver` 往父会话注入一条合成消息 `<subagent sessionID=… state=completed|error|cancelled>…</subagent>`，并在 `session/subagent-job.ts` 里通过 Job 服务做恢复。
**审批**：`permission.ts`：规则 `{action, resource, effect: allow|ask|deny}`，按会话或 agent 覆盖，缺失时默认 deny。
**流式**：`bus.ts`，区分 durable 和 ephemeral 两类事件，durable 事件写入 `event` / `event_sequence` 表，带序号，可以重放。
**借鉴**：子任务 = 带 parent_id 的普通会话，后台完成后用合成消息回报父会话，模型非常统一。**坑**：子代理默认和父会话共用目录，并行写会冲突，worktree 需要单独接入；内部 API 快速演进。

---

## 9. 2026 年新出现的同类项目（简述）

- **Cursor Projects**（2026-09-10，官方 changelog）：编排者不写代码，只负责规划、委派、收回结果交给人检查；跑在云端专属机器上，需要时再拉起本地 agent；"**共享上下文文件**"在所有机器间同步，agent 会往里写研究、产物和经验（比如"这个服务怎么测"）；**Subscriptions**：监听 Slack、定时、跟踪所有 PR，主动触发工作。
- **Claude Code Projects 改版**（2026-09-17，二手资料）：层级是 Project → Coordinator → Thread（完整的云端会话，各自有分支和 PR）→ Subagent（不能再嵌套）；有共享记忆和 Project Library；每天最多新建 200 个 thread；冲突按普通 PR 冲突处理。
- **agtx**（fynnfluegge/agtx，2026）：TUI 看板（Backlog/Planning/Running/Review/Done）+ 每任务一个 worktree 和 tmux 窗口；编排者是通过 MCP（`list_tasks/get_task(allowed_actions)/move_task/check_conflicts`）操作看板的 Claude，**状态迁移由宿主执行，agent 只是提交请求**；按阶段配置不同 agent；用插件 TOML 定义阶段产物文件作为完成信号。
- 其他：junhoyeo/contrabass（claim/release、BlockedBy 门控、孤儿认领回收）、JDonaghy/code-coordinator（入队前比较各 issue 声明要改的文件和在途分支的真实 diff，有重叠就排序执行）、OpenCastle（agent 结束时把"项目经验"转成 lesson，随 PR 一起审核）、kanbots（pre-push hook 禁止 agent 自己 push）、parallel-code（把 node_modules 等被 gitignore 的目录链接进 worktree）。这些只读了 README 或搜索摘要，没有看源码。

---

## 10. 对 DeepSeek Harness Projects 插件的综合建议

1. **实体分层**：`Project → Task(看板卡片) → Attempt/Workspace(分支+worktree，1:N) → Session(agent 会话，1:N，可以换 executor) → ExecutionProcess/Turn`，再加上 `PullRequest/Check/ReviewThread`。这基本就是 vibe-kanban 重构后的结构加上 AO 的 PR 事实表。
2. **事实与显示状态分离**（AO）：只存 activity_state、is_terminated、PR 事实，看板的 Board/List 列在读取时推导。用 SQLite 触发器写 `change_log(seq)`，再经 CDC 推给 UI（SSE 或 WS + 序号补发，借鉴 OpenHands 的 resend_mode）。
3. **编排者工具化、硬隔离**：coordinator 只拿到 `task.create/update`、`worker.spawn/send/kill`、`pr.claim`、`review.trigger`、`memory.write` 这些工具，**没有文件写权限**。状态迁移由宿主执行（agtx 的 move_task 模式）；worker 完成后用合成消息异步回报（opencode/OpenHands）。
4. **Worktree 生命周期**：路径固定为 `<data>/worktrees/<project>/<attempt>`；先用临时分支，push 前允许改名；创建和清理共用同一把路径锁；销毁前先存 `refs/<ns>/preserved/<id>`；回收 worktree 时保留分支，空闲 72 小时、归档后 1 小时自动回收；`git worktree prune` 兜底；在系统提示里注入 worktree 说明。
5. **执行器适配器接口**：取 vibe-kanban 和 AO 的并集：`spawn / followUp(resumeId, resetTo?) / review / normalizeLogs→统一事件 / availability / hooks(上报 activity) / restoreCommand`。优先接 ACP，把 DeepSeek 原生 agent 当成其中一个 adapter。
6. **共享项目记忆**：用仓库内 Markdown（Backlog.md 的 plan/notes/summary 三段 + Cursor 式共享上下文文件），通过 PR 审核写入，避免"记忆污染"。
7. **审批**：opencode 的 allow/ask/deny 规则集 + OpenHands 的风险阈值；blocked 状态下禁止自动注入输入；合并永远由人明确发起。

---

## 对比表

| 项目 | 工作单元 | 持久化 | 隔离 | 执行器抽象 | 审核模型 |
|---|---|---|---|---|---|
| vibe-kanban | Issue/Task → Workspace(分支) → Session → ExecutionProcess | SQLite(sqlx, 80 个迁移)；issue 在云端 Postgres + Electric | git worktree，路径锁，72h/1h 过期回收，保留分支 | `StandardCodingAgentExecutor` trait(spawn/follow_up/review/normalize_logs)，10+ CLI + ACP | InReview 列 + diff 行内评论回传 + 工具审批服务 + PR 监控合并后自动归档 |
| claude-squad | Instance(tmux+worktree) | 单个 JSON(state.json) | worktree；Pause=自动 commit + 删 worktree + 保留分支 | 无(命令字符串 + tmux) | 抓屏检测提示 + 人工 diff/push；AutoYes 守护进程 |
| crystal(已废弃) | Session(+panels、按 prompt 的 diff) | SQLite | worktree + rebase/squash 本地合并 | `AbstractCliManager`(node-pty) | MCP 权限桥接到 UI；按 prompt 的 diff 回看 |
| OpenHands(SDK) | Conversation(+子会话) | 每会话目录：base_state.json + 一事件一 JSON | 可选 per-conversation worktree / Docker / VM 沙箱 | AgentBase：原生 Agent / ACPAgent | ConfirmationPolicy(Always/Never/Risky) + 风险分析器，WAITING_FOR_CONFIRMATION |
| Backlog.md | Task(.md 文件，含子任务/依赖/DoD) | 仓库内 Markdown + git，跨分支合并状态 | 无(依赖外部分支) | 无；MCP/CLI + onStatusChange 钩子 | git PR + 验收标准/DoD 勾选 |
| claude-task-master | Task/Subtask(依赖图) + Workflow 会话 | tasks.json(按 tag) + ~/.taskmaster 会话状态 | 无并行；分支设置阶段 / Docker loop | `ITaskExecutor`(仅 Claude) | TDD 门禁(RED/GREEN/COMMIT) + 测试结果校验 |
| agent-orchestrator(AO) | Project + 编排者会话 + Worker Session + PR 事实 | SQLite(sqlc) + change_log CDC | worktree `worktrees/<proj>/<sess>`，临时分支改名，preserved ref | `ports.Agent` + `Runtime` + Chat/ACP 驱动(23+) | 推导状态泳道；CI/review 回流 worker；原生 reviewer；人工合并 |
| opencode | Session(parent_id 子代理，可 fork) | SQLite(drizzle) + durable 事件序列 | 可插拔 Worktree Strategy + Workspace driver | Agent 配置 + subagent 工具(后台 + 合成消息回报) | allow/ask/deny 权限规则集 |
| Cursor/Claude Code Projects(闭源) | Project → Coordinator → Thread/Subagent | 云端；共享上下文文件/记忆/库 | 每线程独立云机/分支 | 自家 agent | 人审 PR；订阅事件触发 |
