# 0013 验证证据绑定受信策略与固定代码版本
- 状态：Accepted
- 日期：2026-11-08

## 背景

`HEAD` SHA 只能说明提交版本，不能代表 dirty worktree 内容，也不能证明验证命令来自可信配置。worker 可以修改仓库中的 `.dsh/environment.json`，且 `task_report(done)` 后 Run 是否已退出、工作区是否冻结没有完整约束。与此同时，总览把「PR 合并且已验证」写成完成路径，但域模型要求 `intent=accepted`、successor 和显式接受。

## 决定

- `task_report(done)` 只记录完成候选。Engine 请求 worker 在当前回合结束后退出；确认 Run 已退出并撤销写 capability 后，将工作区改动固化成 WIP commit，固定验证前的 `commit_sha` 与 Git `tree_sha`。若 Run 无法停止、Checkout 仍可写或 head 仍变化，不启动验证。
- 验证策略以项目/仓库设置中的受信 `validation_policy` 为准，记录不可变 `policy_revision` 与 hash。仓库 `.dsh/environment.json` 可提供策略建议；首次使用或内容变化必须由人确认并固定版本。worker 不能在当前 Attempt 内改写正在使用的策略。
- validator 不另拷独立只读源码快照（2026-11-08 S7 实测证明只读快照在 Landlock 下完全不防绝对路径越权读取、外网与 `/tmp` 套接字，且复制源码树会丢掉原 Checkout 已装好的 `node_modules` 与构建缓存），而是直接在已停止 Run 且撤销写 capability 的原 Checkout 上原位运行，环境变量采用最小显式 allowlist。验证结束后复核 `tree_sha` 与 `git status --porcelain` 未发生变化，Evidence 才记录 `commit_sha`、`tree_sha`、`policy_revision`、命令摘要、运行位置、退出状态和结果引用并签发 `verified`；验证期间若改写受跟踪源码则判定 `failed`/`stale` 并还原。只有被验证的 tree 与 Attempt 当前 head 一致时，Evidence 才有效。不受信仓库的防逃逸统一由 [ADR-0017](0017-repository-execution-trust.md) 的 `bwrap`/容器隔离门控负责。
- validator 的 `verified` 表示已批准策略对这份固定输入执行并通过，不代表任务语义必然正确。需要更强保证时，使用受保护分支上的 CI / 人工审查证据；变更测试或验证策略本身不自动提升信任。
- `task.accept` 是唯一将 Task `intent` 变为 `accepted` 的命令。接受前必须不存在 live worker Run、未完成的写入 effect 或开放 gate；接受时固化 `accepted_head_sha`。未经验证接受必须显式标记并审计，仍然绑定固定 head。
- PR merge 只是一条外部事实，不自动接受 Task。只有人调用 `task.accept` 并给出 successor 或 `no_followup` 后，Task 才进入 Done、依赖才解锁。

## 后果

- 需要受信策略版本、原位验证前后 `tree_sha` 校核与 Evidence provenance 字段（省去多余的只读快照目录拷贝与重复依赖安装）。
- M0 必须覆盖 dirty tree、运行中写入、策略变更和停止失败场景；不能把 worker 自报完成或退出码 0 当作完成证明。
- UI 和总览以 `task.accept` 为完成入口；已合并且已验证的 PR 仍需显式接受。

## 备选方案

- 直接执行 worker Checkout 中的 `validate` 并只记录 HEAD：实现简单，但不能辨别未提交内容和被任务同时修改的验收规则，放弃。
- PR 合并自动接受：无法在无用户输入时可靠生成 successor，放弃。
