# 0006 协调者的边界写在工具层
- 状态：Accepted（S2–S4 实测后实现路径待重定，见「S2–S4 实测与推断」）
- 日期：2026-11-08

## 背景
Cursor、Claude Code、dsh-superagent、Agent Orchestrator 都要求协调者不写代码；SA 与 AO 用提示词约束，文档自己承认模型可以不听。协调者一旦开始干活就会被长任务占住，失去响应性。

## 决定
协调者 preset 只注册 `docs/architecture/runtime.md` §2 列出的工具，不提供文件写、shell、长等待与子代理工具。DSH 宿主平面默认挂载全局工具（如 `working_directory`）和用户全局 MCP 工具，边界必须落在工具层：屏蔽继承层工具并挂载单调守卫，任何非白名单工具执行都被拒绝。具体挂载点（preset 插件、agent `setup` 钩子或仅 guard）在 M0 前由实测确定；围栏实测通过前，不把该设计作为已验证结论引用。状态变更由引擎执行，协调者只提交请求。

## S2–S4 实测（2026-11-08 初跑，2026-11-09 修复复跑，tag `dsh-v0.2.2-rc.1`）

- **S2（部分完成；已并入统一上游补丁）**：S2 源码核查确认 `dsh-v0.2.2-rc.1` 的 `conversation.view` 无按会话过滤，且 `ui-conversation` 不暴露 `activeViewId`。v5 架构已将 `conversation.view` 的 `when(session)` 过滤与 `activeViewId` 暴露并入 S1 的同一份上游宿主补丁（[ADR-0003](0003-host-extension-points.md)），不再保留普通会话显示项目 Tab 的占位妥协。构建与 API 层验证已通过，UI 视觉观察待 DSH Web 401 修复与上游补丁合入后补做（[S2 报告](../spike/reports/S2-coordinator-view.md)）。
- **S3（通过（有条件））**：围栏在 preset 挂载路径成立。协调者 preset 可见工具从 standard 的 33 个降到 2 个（`spike_projects_probe`、`spike_decoy_shell`）；`working_directory`、`bash`、`read`/`write`、全局 MCP 工具均不在 schemas 中，模型无法发起调用；decoy 被 guard 拦截（`outside the coordinator whitelist`）且未产生副作用；白名单 probe 返回 `PROBE-OK-51D2`。步骤 2 的未知全局工具名与 scoped 名都抛 `unknown global tool`，会话未公告、无存储残留。步骤 3 的 `compactNow` 真实压缩 62 个节点（约 12,036 tokens），`spike-s3-index` section 与配置的 `indexText` 逐字节一致（299 B，三个哨兵各一次），`cacheReadTokens` 由 9600 升到 20096、未因注入归零（[S3 报告](../spike/reports/S3-coordinator-fence.md)）。
- **S3 单包与外部化约束（v5 已落地到架构）**：围栏依赖 `@deepseek-ai/dsh-scope` 的模块内 Symbol 标记。多包 workspace 或 profile 目录若重复安装 `@deepseek-ai/*` 包，会导致 `tools` 服务侧 `scopeOf()` 与宿主 `createScope()` 拿到两份不同的 `Symbol('dsh.scope')`，触发 `tools.restrict()` 抛 `requires a scoped context` 及 `setup` 工具全局泄漏。为此 v5 取消 9 个子包拆分，收敛为单一插件包 `dsh-projects`（内部按 `src/*` 目录分层），统一 `tsdown` 的 `external: [/^@deepseek-ai\//]`，并禁止部署 profile 重复安装同名 `@deepseek-ai/*` 包。
- **S3 preset 组合要求**：preset 之间不继承标准工具集；需要 INDEX 与压缩同存的协调者 preset 必须自带 compaction 组（`compaction-basic` + `tool-result-pruner`），否则 `compactNow` 返回 503。INDEX 用 `systemPrompt.section` 注入（每轮重算），不用 message/context。
- **S4（有条件通过）**：`ctx.agents.create` 只校验 `cwd` 是绝对路径，不建目录、不校验存在性（指向不存在目录仍创建成功），Engine 必须在 `checkout.prepare` 阶段自行校验并创建目录。`AgentRegistry.create` 本身不套全局默认模型：不传 `agentOptions` 时首轮 `model: null`、`modelSource: none`，入口须把 `ctx.agentDefaultModel.currentSelection()` 合进 `agentOptions`（参考 `experimental/webhook/src/session.ts:57-58`）。compaction 引擎在 preset 组内被 isolate，调用方用 `agentPresets.serviceFor(agent, 'compaction')` 取（[S4 报告](../spike/reports/S4-native-worker.md)）。

## 后果
- 协调者回答「这段代码在哪」这类问题时，需要派一个只读 worker（或由 worker 的总结回答）。
- 越界率可度量且应为 0。
- 围栏已在 preset 挂载路径实测通过，但前提是 profile 模块单例与 preset 自包含 compaction；M0 验收必须带着这两条部署约束。
