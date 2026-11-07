# 原型与架构对齐

> 状态：现行（v3，2026-11-08）。逐项对照 `prototype/index.html` 与 [架构](../architecture/overview.md)，记录冲突与处理方式。

## 1. 已在原型中修正

| # | 冲突 | 原型原行为 | 处理 |
|---|---|---|---|
| 1 | 显示状态应由事实推导（[ADR-0002](../adr/0002-derived-status.md)） | 状态菜单、看板拖拽、组间拖拽可以把任务直接设为 For Review / Waiting on you | 新增 `DERIVED_ONLY` 与 `manualStatusBlock()`，三条路径统一校验：这两个状态在菜单中标「自动」并置灰，拖入时提示原因并撤回 |
| 2 | 执行过的任务不能物理删除（[domain-model.md §2](../architecture/domain-model.md)） | 右键「删除任务」直接从列表移除，连同执行记录 | 有 worker 或 PR 的任务改为弹出「改为取消」；从未执行的任务仍可删除 |

验证：用 jsdom 加载原型，确认脚本无报错；状态菜单中 waiting / review 为 derived；选择 For Review 时提示且状态不变；对 YOU-6 选择删除时弹出「改为取消」并移入 Canceled。

## 2. 保留原型，由架构吸收

| 原型特性 | 架构中的对应 |
|---|---|
| 成员（`a8f2`、`e4b1`、`deploy-check`）与负责人重分配 | `AgentProfile`：长期的 worker 配置；改负责人 = 用新 profile 开新 Run |
| 环境菜单、健康检查历史、自动重试、记住默认环境 | `Location` + `LocationProvider.health()`；`retryPolicy`；健康检查移到全局设置 Environments（见 §5） |
| 环境决定 worktree 前缀（`agent/…` / `sandbox/…`） | 分支命名规则写入 runtime 与 ADR-0004 |
| 启动摘要（仓库、基线、worktree、环境、模型、refs） | `task_start` 前的预检，阻断条件一致 |
| refs 同步、过期提示、分支管理 | `project_repo.refs_json / refs_synced_at`；`git` 包负责同步 |
| Library 的 ratified / proposed / disputed 标签 | `context_item.status`；转正规则以 verified Evidence 为准 |
| 依赖、成环禁用、前置完成自动解锁 | `task_dep` + 不变量「依赖图无环、被依赖未 accepted 不得启动」 |
| 设置变更写入项目活动 | `project_event` |
| Pause / Archive / Delete | [runtime.md §8](../architecture/runtime.md) |
| 15 秒行摘要、Update from YOU-x 折叠 | Driver 写 `run.summary`；合成消息回报 |

## 3. 原型展示的是目标形态，首版实现不同

| 原型 | 首版实现 | 原因 |
|---|---|---|
| 左栏「项目」分组，位于工作区上方 | `sidebar.panellist` 图标 → Projects 首页面板；协调者会话行显示项目图标与徽标 | DSH 没有左栏区域插槽（[dsh-integration.md §2](../architecture/dsh-integration.md)）。已计划向上游提议插槽 |
| 默认模型示例「Gemini 4 Argon」 | DSH 可用的模型列表 | 示例数据，不代表支持范围 |

## 4. 原型待补（排入对应里程碑）

| 项 | 说明 | 里程碑 |
|---|---|---|
| 接受任务时填写后继 | 选 Done 时弹窗：后继任务或「无后续」+ 理由；无 verified 证据时提示「未经验证接受」 | M1 |
| 项目设置「验证命令」 | 设置页新增一项；任务详情显示验证结果 | M0 / M1 |
| 证据区 | 任务详情显示验证命令输出、CI 结论、工件，区分 claimed / verified | M1 |
| 提问类型 | 托盘区分阻塞提问与非阻塞请求；可选建议只进摘要 | M2 |
| Failed 标记 | 运行失败的任务在 Waiting on you 组内显示失败标记与「重试 / 换负责人」 | M1 |
| CI 失败 / 需要修改 标记 | For Review 组内的 PR 子状态 | M2 |

## 5. 第三轮（执行者 × 模型 × 位置）带来的原型改动清单

只记录，不在本轮修改原型。

| 原型现状 | 目标 | 规格 |
|---|---|---|
| 输入区左 chip「本机 Worktree / 远程 Sandbox」 | 「派发默认」：执行者 + 位置两列菜单，带可用状态点 | interaction-spec §3 |
| 输入区右 chip 为模型（含义不明） | 明确为「协调者模型」 | interaction-spec §3 |
| `MODELS` 为全局静态 3 项 | 按执行者动态目录；不支持时置灰并说明 | execution.md §2、§3 |
| 任务上的 `model` 字段 | 由 RunSpec 解析；详情按 Run 列执行历史 | domain-model.md、interaction-spec §6a |
| 启动摘要只列环境与模型 | 执行者 · 模型 · 思考 · 位置 · 权限 · 计费来源 + best-of-N | interaction-spec §6 |
| 任务行只有负责人头像 | 加执行者 logo；云端加 ☁ 位置徽标 | interaction-spec §6a |
| 无运行视图 | 外部执行者的运行视图（事件流、内联权限卡、交接动作） | interaction-spec §6b |
| 无交接 | 「移到云端 / 拉回本地 / 交给…」与进度 | interaction-spec §6c |
| 无对比 | best-of-N 对比页签 | interaction-spec §6d |
| 项目设置「默认模型」 | 角色默认（worker / reviewer）+ 协调者模型；成员 = 运行偏好 | interaction-spec §7 |
| 环境检测与历史在输入区弹层 | 移到全局设置 Environments，输入区只保留状态点 | interaction-spec §7a |
| 无 Agents 设置 | 新增 Agents 设置页 | interaction-spec §7a |
| 原型已有 DeepSeek 鲸鱼与 Claude 图标 | 补 OpenAI、Gemini、OpenCode、Cursor 徽标 | — |
