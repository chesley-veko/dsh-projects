# 0003 只使用宿主已有扩展点
- 状态：Accepted
- 日期：2026-11-08

## 背景
旧方案通过锚定 `.kB3qhq_regionArea`（CSS Module 哈希类名）在左栏注入项目区，并计划注册 `main.conversation`。核查发现左栏没有区域插槽（`sidebar.workspaces` 为 single 插槽且被占用），`main.conversation` 注册即替换整个对话视图。

## 决定
- 全局入口：`sidebar.panellist` 图标 + `main` 面板（仅用于全局 Projects 首页）。
- 协调者是普通会话，用 `ctx.uiWorkspace.openSession` 打开（建项目时写入初始引导事件脱离 `blank` 态）；会话行用 `sidebar.session.row.*` 显示项目图标与徽标。
- 项目概览页（`id: 'project-overview'`）与外部执行者运行视图（`id: 'project-run'`）注册进 `conversation.view` 插槽（避开宿主 `ui-trajectory` 已占用的 `'trajectory'` ID），配合 `conversation.composer` chain 插槽接管底部输入区；**不使用 `main` 面板承载它们**，因为宿主 `ui-sidebar-right` 在 `activePanelId !== null` 时会强制收起右栏。
- 右栏、托盘、胶囊、派发默认 Chip 使用 `sidebarRightTabs`（配合客户端 root 级 `ProjectUiStore` 跨同项目会话共享状态）、`conversation.input.overlay`、`conversation.composer.dock`、`conversation.input.left`。
- 向 DSH 上游提议最小扩展补丁：① list 型 `sidebar.regions` 插槽；② `SessionOrigin` 增加 `'project-worker'` 并在 `ui-workspace/src/client/tree.ts:244` 过滤（避免本地 worker 堆入左栏「未分组」，同时不触发 `subagent` 围栏）。

## 后果
- 首版左栏观感与原型不同（项目入口在 panellist）。
- 宿主升级不会打碎插件。

## 备选方案
- DOM 注入：每次发版都可能失效，放弃。
- 整块替换 `sidebar.workspaces`：需要重写宿主的工作区树，维护成本过高，放弃。
