# 0008 执行者两种传输：本地 DSH 走原生会话，其余一律 ACP
- 状态：Accepted
- 日期：2026-11-08

## 背景
DSH 已有 `subagent-acp`、`subagent-claude-code`、`subagent-codex`，但它们一次性运行、只保留最终文本、自动应答权限、不能按次选模型（`packages/subagent/subagent-acp/src/run.ts:420-452`）。ACP v1 已稳定，Gemini CLI、OpenCode、Cursor CLI 原生支持，Claude Code 与 Codex 有官方组织维护的适配器（`@agentclientprotocol/claude-agent-acp`、`codex-acp`）。DSH 自身是 ACP server（`dsh --profile acp`，支持 new / resume / list / close 与 `set_config_option`）。

## 决定
- 自建 `executor-host`：一个完整的 ACP client（保留全部 `session/update`、把 `request_permission` 转为 Question、按次选模型、续接、能力探测与显式降级）。
- 高频流式 chunk（`message / thought`）只走内存缓冲 + SSE 实时广播并追加写入 `<dataDir>/runs/<run_id>.jsonl`；SQLite `run_event` 表仅写入低频关键生命周期与工具起止事件，避免同步磁盘 I/O 阻塞主线程。
- ACP v1 无原生运行中 `steer`，由 `executor-host` 通过 `session/cancel` 中断当前回合、等待在途 `session/prompt` 返回后立即发送新 `session/prompt` 合成实现。
- DSH 执行者在本地用原生会话（以事务内预生成的 `sessionId` 调用 `ctx.agents.create({ sessionId, cwd, preset, origin: 'project-worker' })`，再用 `agent.session.append('model/selection', selection)` 写入会话级初始模型，不调用 `sessionController.selectModel` 以免污染全局默认模型），获得 DSH 原生的过程、审批、Files Changed UI 与运行中切模型；在远端用 `dsh --profile acp`。
- 内部事件模型按 ACP v2 的生命周期（running / idle / requires_action）建模，便于升级。
- Claude stream-json、Codex app-server 只作为后续可选增强驱动。

## 后果
- 新增一个执行者通常只需登记 `command/args/env`。
- 外部执行者的过程由 Projects 自己的运行视图渲染（DSH 不会为它们建会话）。

## 备选方案
- 直接用 DSH 的 subagent provider：不可见、不可审批，放弃。
- 每家写原生集成（vibe-kanban 路线）：维护成本高，作为增强保留。
