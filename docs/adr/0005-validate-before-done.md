# 0005 验证先于完成
- 状态：Accepted
- 日期：2026-11-08

## 背景
多 agent 系统的主要失败模式之一是验证缺位（MAST, arXiv 2503.13657）。LoopX 的 Turn 协议明确「进程退出码 0 不算验证」。

## 决定
- worker 的完成声明只产生 `claimed` Evidence。
- validator 运行验证命令（优先取仓库 `.dsh/environment.json` 的 `validate`，缺省回退至 `project_repo.validate_json` 或项目默认设置），CI 观察者同步 checks；只有它们能写 `verified / failed`。
- 有仓库项目的 Evidence 必须记录生成时的 `commit_sha`，且仅当 `evidence.commit_sha === attempt.head_sha` 时视为当前有效（worker 新提交代码推进 `head_sha` 后，旧 `verified` Evidence 自动失效）；无仓库项目的 `commit_sha` 允许为空。
- Task 接受、runbook 转正都以当前有效的 `verified` Evidence 为前提；人可以「未经验证接受」，但需二次确认并记入审计。
- 接受时必须写后继 Task 或 `no_followup:<理由>`（LoopX「完成即接续」）。

## 后果
- 每个项目需要配置一条验证命令；没有时 UI 提示并只能人工接受。
