# 0003 只使用宿主已有扩展点
- 状态：Accepted（S1 实测修订见「S1 实测与补丁范围」）
- 日期：2026-11-08

## 背景
旧方案通过锚定 `.kB3qhq_regionArea`（CSS Module 哈希类名）在左栏注入项目区，并计划注册 `main.conversation`。核查发现左栏没有区域插槽（`sidebar.workspaces` 为 single 插槽且被占用），`main.conversation` 注册即替换整个对话视图。

## 决定
- 全局入口：`sidebar.panellist` 图标 + `main` 面板（仅用于全局 Projects 首页）。
- 协调者是普通会话，用 `ctx.uiWorkspace.openSession` 打开（建项目时写入初始引导事件脱离 `blank` 态）；会话行用 `sidebar.session.row.*` 显示项目图标与徽标。
- 项目概览页（`id: 'project-overview'`）与外部执行者运行视图（`id: 'project-run'`）注册进 `conversation.view` 插槽（避开宿主 `ui-trajectory` 已占用的 `'trajectory'` ID），配合 `conversation.composer` chain 插槽接管底部输入区；**不使用 `main` 面板承载它们**，因为宿主 `ui-sidebar-right` 在 `activePanelId !== null` 时会强制收起右栏。
- 右栏、托盘、胶囊、派发默认 Chip 使用 `sidebarRightTabs`（配合客户端 root 级 `ProjectUiStore` 跨同项目会话共享状态）、`conversation.input.overlay`、`conversation.composer.dock`、`conversation.input.left`。
- 向 DSH 上游提议统一的最小扩展补丁 PR（合并 S1 与 S2 接缝）：
  1. list 型 `sidebar.regions` 插槽；
  2. `SessionOrigin` 增加 `'project-worker'` 并在 `ui-workspace/src/client/tree.ts:235` 过滤（18 个文件、26 行）；
  3. `ui-conversation`（`contract/slots.ts` 与 `apply.ts:211-222`）为 `conversation.view` 增加可选 `when?: (session) => boolean` 会话过滤，并向 `conversation.composer` / 会话控制器暴露只读 `activeViewId`（2 个文件、约 15 行），使项目 Tab 仅对协调者会话可见，且底部输入框按当前激活视图（`chat` / `project-overview` / `project-run`）精确切换。
  按 [ADR-0018](0018-worker-visibility-seam.md)，Projects 左栏与中栏视图 UI 验收受该上游补丁合入与 DSH Web 401 修复门控；会话 id 前缀和会话行 slot 只能装饰，不能作为隐藏能力或 UI 验收通过条件。

## S1 实测与补丁范围（2026-11-08）

- **插件侧不存在会话列表过滤接缝**：全仓无会话列表过滤 slot（只有 archived filter），也没有 filter API。`sidebar.session.row.*` 只有装饰（`packages/client/ui-workspace/src/client/contract/slots.ts:158` 注明 non-interactive、不得绑定或保留 Session），客户端 `ISessions` 无 `filter` 方法（`api/session-controller/src/client/contract/sessions.ts:49`），按 cwd 归组调用直接报错。S1 判定「不通过」，插件侧无降级方案（[S1 报告](../spike/reports/S1-worker-visibility.md)）。
- **上游补丁实测范围**：在锁定发布版的 harness 副本上，`SessionOrigin = 'project-worker'` 补丁实际为 **18 个文件、26 行**（`git diff --stat`：`18 files changed, 26 insertions(+), 26 deletions(-)`）。基线按 S1/S2 报告口径为官方 tag `dsh-v0.2.2-rc.1`（`66491b05`）；S0 锁定的 `fcc0ad46` 是 release 合回 `origin/master` 的合并提交（PR #7873），比该 tag 晚 811 个提交。S0 复核的行号按 `fcc0ad46` 引用；实验运行的是 0.2.2-rc.1 发布构建（tag）。本次引用的文件中，`subagent/subagent/src/index.ts` 与 `control.ts` 在两个提交间有差异，其余一致。构建 3/4 成功，origin 探针 thrown 为 false，会话头已持久化 origin 为 `project-worker`，`tree.ts` 过滤已进入编译产物；草案的 11 个文件不足，缺下游头类型与各持久化格式的版本校验门控。
- **补丁状态：建议，待批准**。未合入上游，也未在本仓库落地；以下清单只是提案范围，不表示补丁已可用。左栏「worker 消失」的 UI 直接观察因 dsh 0.2.2-rc.1 web 鉴权缺陷（token 始终 401）未完成，S1 的 3a–3e 记 N/A，补丁不能算「已通过」。
- **完整文件清单（按路径字典序；改动点含 origin 类型收窄、运行时门控、树过滤与持久化格式校验）**：
  - `packages/api/session-controller/src/client/sessions/lineage.ts`
  - `packages/api/session-controller/src/client/sessions/service.ts`
  - `packages/api/session-controller/src/list.ts`
  - `packages/api/session-controller/src/types.ts`
  - `packages/bundle/headless/src/index.ts`
  - `packages/client/ui-workspace/src/client/tree.ts`
  - `packages/core/agent/src/index.ts`
  - `packages/core/session/src/index.ts`
  - `packages/core/session/src/types.ts`
  - `packages/session/session-format-v0-to-v1/src/codec.ts`
  - `packages/session/session-format-v0-to-v1/src/validation.ts`
  - `packages/session/session-format-v1-to-v2/src/codec.ts`
  - `packages/session/session-format-v1-to-v2/src/validation.ts`
  - `packages/session/session-format-v3-to-v4/src/validation.ts`
  - `packages/session/session-format/src/types.ts`
  - `packages/session/session-log-deepseek/src/types.ts`
  - `packages/session/session-persistence-jsonl/src/format.ts`
  - `packages/session/session-persistence-jsonl/src/index.ts`
- **关键门控**：`packages/core/session/src/index.ts:126-127` 从「origin 非 undefined 且非 `subagent` 即拒绝」放宽为允许 `'project-worker'`；`packages/client/ui-workspace/src/client/tree.ts:235` 改为 origin 为 `'subagent'` 或 `'project-worker'` 时不可见。
- **不可修改的普通路由检查点**（`=== 'subagent'` 判定保持原样，`project-worker` 必须走普通路由，否则 `openSession`、子代理与文件上传会被宿主围栏拦住）：`api/session-controller/src/agent.ts:99`（`hasApiSessionSubagentOwner`）、`history.ts:73,80`（`validateAddress`）、`archived-session-gate.ts:53`、`manager.ts:175,686`、`service.ts:676,705`、`commands.ts:572`、`web/controller.ts:63`、`headless/index.ts:233`、`acp/index.ts:251,310`，以及 `packages/client/file-upload/src/index.ts:283-290` 的 `assertOrdinaryAgent`（只拦 `origin === 'subagent'`，`project-worker` 可上传）。

## 后果
- **原则变化（veko 已于 2026-11-08 认可）**：从「完全不修改 DSH 宿主」放宽为「不修改宿主代码，但可向上游提最小扩展补丁；任何补丁都必须有插件侧降级方案，不阻塞里程碑」。
- 首版左栏观感与原型不同（项目入口在 panellist）。
- 宿主升级不会打碎插件。
- S1 实测后 M0 阻断成立：插件侧没有可用的列表过滤接缝，解除条件只有已验证的 `SessionOrigin = 'project-worker'` 补丁或等价真实接缝（[ADR-0018](0018-worker-visibility-seam.md)）；补丁是否向上游提交待批准。

## 备选方案
- DOM 注入：每次发版都可能失效，放弃。
- 整块替换 `sidebar.workspaces`：需要重写宿主的工作区树，维护成本过高，放弃。
