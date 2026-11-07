# 交互规格

> 状态：现行（2026-11-08）。`prototype/index.html` 是本规格的可点击版本；两者冲突时以本文为准，并在 [prototype-alignment.md](prototype-alignment.md) 记录差异。
> 视觉来源：项目面板借 Cursor Projects 的交互（[research/cursor-findings.md](../research/cursor-findings.md)）；侧栏、对话头、过程、输入区保持 DSH 原生形态（[dsh-native-ui.md](dsh-native-ui.md)）。

## 1. 布局

| 区域 | 内容 | 宿主承载（见 [ADR-0003](../adr/0003-host-extension-points.md)） |
|---|---|---|
| 左栏 | DSH 原生侧栏 + 项目入口；项目行显示图标、名称、相对时间、未读点 | 首版：`sidebar.panellist` 图标 → Projects 首页面板；协调者会话行显示项目图标与徽标。上游提供区域插槽后改为原型中的左栏「项目」分组 |
| 中栏 | 项目的协调者会话（DSH 原生对话）；头部「对话 / 轨迹」分段 | 普通会话，`openSession` 打开；轨迹页为 `main` 面板 |
| 右栏 | Project 面板：`List | Board | Library` | `sidebarRightTabs` |
| 输入区上方 | `Questions · N`、`Agents · N`、`Listening · N` 胶囊与 Question Tray | `conversation.input.overlay` / `composer.dock` |

## 2. 两个入口

- **新建项目**：图标、名称（必填）、一句话目标（选填）、仓库（选填，允许无仓库的调研项目）。图标三种形式：内置线性 mark（14 个 × 9 色，默认 `smiley-plus`）、字母标、自定义上传（PNG / JPG / SVG ≤200KB，可选完整 / 填满与 100–250% 缩放）。
- **加入项目**：普通会话右键「加入项目」，协调者读取该会话历史，生成「建议任务 + 建议写入 INDEX 的上下文」，人逐条确认。
- 焦点在项目时点全局「新会话」，新建的是普通会话，不继承项目上下文。

## 3. 协调者对话

- 运行中发送按钮保持 `Send`（插话），不变为 `Stop`。
- 收到消息先回一句确认与第一步，再调工具。
- worker 回报折叠为单行「Update from YOU-4」，可展开；只有协调者对人正式发言才点亮未读。
- 一轮结束后显示「用时 X」过程控件，展开为过程组（读取 · 命令）与思考 / 工具行（DSH 原生）。
- `@` 引用任务（按状态分组，方向键选择）；`#` 引用 PR。后端解析为精确 Task / PR id。

## 4. Question Tray

- worker 提问时在协调者输入框上方浮出托盘：「Question from YOU-4」、问题、预设选项、自定义回答、「打开 YOU-4 会话」。
- 可收起为胶囊；多条问题按创建时间排队，显示「1 of N」。
- 回答直达该 worker，不经协调者转述。
- 只有阻塞型提问（gate）计入「Waiting on you」；非阻塞请求在托盘但不阻塞；可选建议（wish）只进摘要。

## 5. 右栏 Project 面板

**头部**：Project 操作（pin / expand / close，拖拽边缘调宽，双击复位）、项目身份、面板内搜索与筛选。

**List**
- 分组顺序：Waiting on you → For Review → In Progress → Queued → Done → Canceled（Done / Canceled 默认折叠）。分组由事实推导，见 [domain-model.md §3](../architecture/domain-model.md)。
- 任务行：状态图标、编号、标题、一行摘要、PR 胶囊（多于 1 个折叠为 `N PRs`）、负责人头像、依赖锁。
- 点状态图标打开状态菜单：Waiting on you 与 For Review 标「自动」并置灰；其余选项映射为命令（启动 / 排队 / 接受 / 取消）。
- 组内拖拽排序；拖到其他组等同于在状态菜单中选择该组，规则相同。
- 单击 Peek，双击详情；`↑/↓` 切换，`Enter` 详情，`Space` Peek，`S` 状态菜单，`Esc` 逐层关闭。

**Board**
- 双列泳道卡，拖卡片到其他泳道改状态（同上规则）。
- 顶部显示活跃的依赖对；泳道显示被阻塞数；卡片间依赖连线，hover / focus 高亮相关路径，点线进入路径聚焦。

**Library**
- Recents 缩略图 + All Files 文件树。
- 每个上下文文件显示层级与状态标签：已确认（ratified）、待确认（proposed）、有争议（disputed）、已替代（superseded）。
- 可预览、手改、看 diff、回滚（`context/` 是 git 仓库）。

**任务详情**
- 标题 / 描述可编辑；负责人；依赖（可添加 / 管理，成环候选禁用）；基线分支（从项目真实 refs 选择或新建）。
- 执行信息：仓库、分支、worktree、环境、模型；日志与过程；`Files Changed`（uncommitted / last turn / staged / unstaged / branch）。
- 证据：验证命令结果、CI 状态、工件。
- PR 胶囊进入 PR 详情。
- 删除：从未执行过的任务可删除；执行过的任务只能取消（保留记录、分支与 PR）。

## 6. 启动

- 启动前显示启动摘要：任务、仓库、基线分支、worktree 路径、环境、模型、refs 新鲜度。
- refs 过期先提示，可刷新后再启动；环境不可用阻断启动，可在摘要里重新检测。
- 被依赖阻塞的任务不能启动，前置完成后自动解锁。
- 环境决定分支前缀：本机 `agent/…`，远程 sandbox `sandbox/…`。

## 7. 项目设置

- 图标、颜色、名称、目标、默认模型、成员、仓库、主仓库、默认分支。
- refs：显示数量、同步时间与过期提示；手动同步；分支管理（添加 / 重命名 / 删除；默认分支与仍被任务使用的分支不可删；远端分支可选「仅从项目移除」或「删除远端分支」，后者需二次确认）。
- 验证命令（新增，原型待补）：Task 完成后运行的命令，如 `pnpm test`。
- 所有设置变更写入项目活动（轨迹页可见）。

## 8. 轨迹页

项目目标、完成度、任务统计、成员、仓库、被阻塞任务数、快捷动作、最近活动；最近活动可按状态与成员筛选。

## 9. 生命周期

| 操作 | 交互 |
|---|---|
| Pause | 顶部 Paused 横幅，Resume 恢复 |
| Archive | 项目移入归档视图，可恢复 |
| Delete | 二次确认；说明会删除本地状态、上下文与 worktree，保留远端分支与 PR |

## 10. 主题

两套色卡：默认 DeepSeek（底 `#13161d`，强调 `#4d6bfe`）；`?brand=claude`（底 `#191919`，强调 `#d97757`）。账户菜单可切换。
