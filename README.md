# dsh-projects

在 DeepSeek Harness 上做 Projects 的工程仓库。目标是把 agent 的工作单元从「单次会话」提升为「持久项目」：左栏项目列表、中栏常驻协调者、右栏任务与上下文。

## 预览

默认 DeepSeek 卡：

![DeepSeek 卡](docs/screenshot-deepseek.png)

`?brand=claude` 卡：

![Claude 卡](docs/screenshot-claude.png)

DSH 原生的过程面板与轨迹：

![过程面板](docs/screenshot-process.png)

![轨迹](docs/screenshot-trail.png)

Projects 图标与颜色选择、自定义图标、命令面板：

![新建项目](docs/screenshot-new-project.png)

![命令面板](docs/screenshot-palette.png)

点击标题快速切换项目：

![项目切换](docs/screenshot-switcher.png)

项目设置里的成员与仓库管理：

![项目设置](docs/screenshot-settings.png)

项目图标的三种形式：内置 mark、字母标、自定义上传：

![项目图标形式](docs/screenshot-icon.png)

自定义图标支持完整/填满和缩放：

![自定义图标裁切](docs/screenshot-crop.png)

看板与 Library：

![看板](docs/screenshot-board.png)

![Library](docs/screenshot-library.png)

任务负责人、依赖、详情与 PR：

![任务负责人](docs/screenshot-assignee.png)

![任务依赖](docs/screenshot-deps.png)

依赖链面板按等待任务递归展开 blocker 链，可逐组收起/展开全部、直接聚焦到 Board：

![依赖链](docs/screenshot-dep-panel.png)

依赖在 Board 上的提示与连线；点线进入路径聚焦：

![Board 依赖](docs/screenshot-board.png)

![依赖路径聚焦](docs/screenshot-path-focus.png)

轨迹活动筛选（按状态 + 成员）：

![活动筛选](docs/screenshot-trail-filter.png)

![任务详情](docs/screenshot-detail.png)

![PR 详情](docs/screenshot-pr.png)

## 结构

```
prototype/index.html        交互原型，浏览器直接打开
prototype/fonts/            主题字体（Inter / Noto Serif / JetBrains Mono，OFL）
docs/screenshot-*.png       原型截图
docs/handoff.md             交接摘要：结论、源码级死锁、插槽映射、路线
docs/dsh-project-layer.html 设计规范：三方对比、四层域模型、交互契约、Schema
docs/projects-teardown.md   调研底稿：Cursor / Claude Code / dsh-superagent 拆解
docs/cursor-findings.md     Cursor Projects 源码级拆解：图标、颜色、状态、Files Changed
docs/dsh-process.md         DSH 原生侧栏、对话头、过程面板与输入区规则
archive/prototype-v1.html   第一版原型，仅留档
archive/prototype-v2-20261104.html  第二轮 UI 前的版本
archive/prototype-v3-20261104.html  Cursor 对齐前的版本
archive/prototype-v4-20261105.html  DSH 回摆前的版本
```

环境检测历史按时间线展开，保留每次结果与耗时：

![环境检测历史](docs/screenshot-env-history.png)

## 原型

```bash
open prototype/index.html
```

纯前端，无依赖无后端，状态都在内存里，刷新基本还原；环境偏好会写入 localStorage 记住。**只借 Cursor Projects 的交互**：左栏项目列表、右栏 `List | Board | Library` Project 面板、任务状态与 Peek；侧栏、对话头、消息、过程面板、输入区回到 DSH 原生形态。中栏一轮结束后显示「用时 X」过程控件，展开是 `读取 1 · 命令 1` 过程组、思考与工具行；头部保留「对话 / 轨迹」分段。项目图标有内置线性 mark（14 个 × 9 色，裸图标直接上项目色）、字母标和自定义上传（PNG / JPG / SVG，≤200KB，可调完整/填满与缩放）三种，默认 `smiley-plus`；创建 / 设置里可改。

**两套色卡**：

- 默认 DeepSeek：蓝黑底 `#13161d`，强调色 `#4d6bfe`
- `?brand=claude`：暖灰底 `#191919`，强调色 `#d97757`
- 也可以点左下角账户 →「切换风格」在界面里切

**深链**：

| 地址 | 视图 |
|---|---|
| `#board` | 右栏看板 |
| `#library` | 右栏文件 |
| `#detail=YOU-4` | 任务详情 |
| `#tray` | 问题托盘展开 |
| `#new` | 新建项目弹窗 |
| `#project=bzti` | 切到指定项目 |

**可交互项**：

- 左栏：DSH 品牌行、新会话、插件、工作区与会话；`项目` 分组支持切换、设置、暂停、归档、删除、置顶；工作区会话可「加入项目」；工作区搜索和添加；右键项目可直接新建任务、打开项目文件、复制路径
- 中栏：DSH 式对话；`用时 X` 过程控件展开为过程组、`思考` 与读取/命令工具行；点击标题可在项目间快速切换；`对话 / 轨迹` 切换，轨迹页给出项目目标、完成度、任务统计、成员、仓库、被阻塞任务数、快捷动作与最近活动；最近活动支持按状态和成员筛选；消息底部点赞、点踩、复制、时间；`@` 引用任务（方向键选择）；待回答托盘支持点选或自定义答复；Agents / Listening 弹出层；模型与环境切换；附件；滚动后出现「跳到最新」；`⌘K` 打开全局命令面板（项目 / 任务 / 文件 / 命令）
- 项目设置：图标（内置 / 字母标 / 自定义上传，支持裁切与缩放）、颜色、目标、默认模型、成员、仓库、主仓库、默认分支与 refs 同步；设置变更写入项目活动；新任务默认落在主仓库，启动时从默认分支创建 worktree；项目设置显示分支 refs 数量、同步时间与过期提示，可手动同步，也可进入分支管理做添加/重命名/删除（默认分支和仍被任务使用的分支不可删除；远端分支可选择仅从项目移除或删除远端）；任务详情从项目的真实 refs 列表切换基线分支，也可以创建新分支；成员会在轨迹页概览里显示头像
- 右栏：Project 面板双层头部（Project 操作 / 项目身份 / 面板内搜索 + 筛选），`List | Board | Library`；状态图标 + 描述 + 右侧 PR 胶囊 + 负责人头像 + 依赖锁，点负责人可重分配、点依赖锁跳到前置任务；详情可添加/管理依赖，前置任务完成后依赖自动标记；Board 顶部显示 active 依赖对，泳道显示被阻塞数，卡片之间有依赖连线，hover/focus 时高亮相关路径，点击连线进入只保留该路径的聚焦态；会形成环的候选直接禁用；被阻塞任务无法启动，前置完成后解锁；启动前会先显示任务、仓库、基线分支、worktree、环境、模型和 refs 摘要，环境决定 worktree 前缀；Sandbox 不可用时会阻断启动，环境菜单和启动摘要都能重新检测；refs 过期时摘要里先提醒，可刷新 refs 再启动；点击状态图标直接改状态；分组按状态收起，任务可在组内拖拽排序、拖到其他组直接改状态；单击任务 Peek、双击详情；右键任务 / 项目 / 文件有上下文菜单；详情可改标题/描述、看日志与 `Files Changed`、点 PR 胶囊看 PR 详情；右键任务可删除；顶部 pin / expand / close，拖拽边缘调宽（双击复位）；Board 为双列泳道卡，卡片可拖到其他泳道改状态；Library 有 Recents 缩略图与 All Files 文件树
- 通用：任务行获焦后 `↑/↓` 切换任务、`Enter` 详情、`Space` Peek、`S` 改状态；Peek 内 `↑/↓` 连续看任务；`Esc` 逐层关闭浮层；模态框焦点陷阱；空项目有首屏引导与项目图标；主题、快捷键、插件、自动化任务都有实际入口（部分在命令面板里）

背景拆解：Projects 看 [docs/cursor-findings.md](docs/cursor-findings.md)，DSH 原生对话与过程看 [docs/dsh-process.md](docs/dsh-process.md)。


## 下一步

原型只验证交互与外观。真实实现要在 `dsh-superagent` 上动三处源码级死锁，细节见 `docs/handoff.md` 第 1 节；下一步是把这套三栏 UI 移植进插件并接上后端状态。
