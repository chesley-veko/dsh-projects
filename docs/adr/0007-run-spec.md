# 0007 执行者 × 模型 × 位置正交，记为不可变的 RunSpec
- 状态：Accepted
- 日期：2026-11-08

## 背景
产品要求每个任务可选执行者（DSH、Claude Code、Codex…）、模型和位置（本地 / 云端）。原型把 `model` 放在任务上、`env` 放在输入区，旧 Schema 把 `environment_id` 放在 Attempt 上。vibe-kanban 的 `ExecutorConfig`、Agent Orchestrator 的按角色配置都把这些作为一次执行的元数据。

## 决定
- `RunSpec{executor, model, effort, permission, approval, location, credential}` 在 Run 启动时写入，之后不可变。
- 任务、负责人（AgentProfile）、项目角色默认只存偏好；按「任务 > 负责人 > 项目角色默认 > 执行者默认」解析。
- 模型目录动态发现，不硬编码；执行者不支持的维度在 UI 置灰并说明原因。
- DSH 原生运行中的切模型记为 `run_event`，不改 spec。

## 后果
- 任何时候都能回答「这个结果是谁、用什么模型、在哪里做的」，可按执行者 × 模型统计验证通过率。
- 换执行者 / 模型 / 位置 = 新 Run，不是修改旧 Run。
