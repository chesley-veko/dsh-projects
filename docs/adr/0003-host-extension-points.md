# 0003 只使用宿主已有扩展点
- 状态：Accepted
- 日期：2026-11-08

## 背景
旧方案通过锚定 `.kB3qhq_regionArea`（CSS Module 哈希类名）在左栏注入项目区，并计划注册 `main.conversation`。核查发现左栏没有区域插槽（`sidebar.workspaces` 为 single 插槽且被占用），`main.conversation` 注册即替换整个对话视图。

## 决定
- 入口：`sidebar.panellist` 图标 + `main` 面板（Projects 首页）。
- 协调者是普通会话，用 `ctx.uiWorkspace.openSession` 打开；会话行用 `sidebar.session.row.*` 显示项目图标与徽标。
- 右栏、托盘、胶囊使用 `sidebarRightTabs`、`conversation.input.overlay`、`conversation.composer.dock`。
- 向 DSH 上游提议 list 型 `sidebar.regions` 插槽；接受后切换为原型中的左栏分组。

## 后果
- 首版左栏观感与原型不同（项目入口在 panellist）。
- 宿主升级不会打碎插件。

## 备选方案
- DOM 注入：每次发版都可能失效，放弃。
- 整块替换 `sidebar.workspaces`：需要重写宿主的工作区树，维护成本过高，放弃。
