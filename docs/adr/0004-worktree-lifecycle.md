# 0004 worktree 可丢，分支必保
- 状态：Accepted
- 日期：2026-11-08

## 背景
并行 worker 需要目录隔离；worktree 占磁盘，长期不回收会堆积；SA 为每个 worktree 登记顶层工作区导致左栏爆炸（`SA/src/app/sessions.ts:141-145`）。

## 决定
- 路径 `<dataDir>/worktrees/<project>/<attempt>`，分支 `agent/<task-id>-<slug>`（远程 sandbox 为 `sandbox/…`）；已 push 不改名。
- 创建与清理共用路径锁（Vibe Kanban）。
- 删除前把未提交改动存为 `refs/dsh-projects/preserved/<attempt>`（Agent Orchestrator）；脏目录不允许直接删除。
- accepted / canceled 后 1 小时、空闲 72 小时回收，保留分支；启动时 `git worktree prune`。
- worker 会话以 `sessionController.create({cwd})` 创建，不登记工作区（待 spike 验证）。

## 后果
- 任意 Attempt 都能从分支重建。
- 需要一个后台回收任务与对应的可观测性。
