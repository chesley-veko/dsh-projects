# Cursor Projects 参考拆解

本页记录从本机 `Cursor.app` 和用户提供的五张 Projects 截图里拿到的产品细节，作为原型对齐依据。

## 来源

- `/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.glass.main.js`
- 用户截图：Projects 列表 / 看板 / Library / Worked 日志 / Files Changed 卡片

## 项目外观

源码里项目外观是一个 `projectAppearance = { icon, colorId }`：

- 新建项目默认 `{ icon: 'smiley-plus', colorId: 'default' }`
- 项目 icon badge 尺寸 `22px`，背景用项目色调 `--project-tint`
- 颜色集合：`gray, red, orange, yellow, green, cyan, blue, purple, magenta`（另有 `brand` / `default`）
- 因此「项目图标」不是 emoji 拼贴，而是「统一图标集 + 项目色」的组合

原型映射：14 个自绘线性 mark（smiley / smiley-plus / spark / orbit / prism / cube / wave / leaf / terminal / book / layers / compass / grid / bolt）+ 9 色项目色板。Cursor 的项目图标是裸线图标直接着项目色，没有底片；原型也去掉了 tinted 方块，项目行 22px、标题旁 20px、创建弹窗 40px 预览，默认 `smiley-plus`。原型再补了字母标（项目名首字母 + 项目色圆形）和自定义图片上传两种扩展；自定义图片可切「完整 / 填满」并缩放 100–250%，用于没有合适内置 mark 的项目。

## 任务状态

`project-document.ts` 里的状态定义：

| id | label | icon |
|---|---|---|
| `for-review` | For Review | `circle` |
| `in-progress` | In Progress | `spinner` |
| `queued` | Queued | `circle-dashed` |
| `done` | Done | `check-circle` |
| `canceled` | Canceled | `x-circle` |

源码里还有 `task-status-icon-picker.react.js`：点击状态图标会弹出状态选择器。原型已复刻为任务行状态图标 → Status 菜单，支持直接改状态，任务会移动分组。

## Worked 日志

对话里的工作记录是折叠的 `Worked 34s` / `Worked 36m 6s`，展开后是任务、思考、文件编辑与完成步骤。原型把它做成 `Worked` 可折叠块，步骤包括 Completed / Thought / Edited `+12 -3` / Finished。

## 行内新建任务与看板拖拽

- `NewTaskSlot.tsx`：`aria-label="New task in {group}"`，placeholder `Task title`，autoFocus；`Enter` 创建并关闭，`Escape` 关闭，失焦时若草稿未被拒绝也会关闭。原型按这个行为实现行内新建。
- 看板卡片的拖拽 payload 里有 `fromGroupValue` / `boardId` / `cardId`，说明 Cursor 的 Board 支持把卡片拖到另一个状态组。原型实现了同样的 HTML5 拖拽改状态。
- Cursor 的 project document 派生状态里还有 `dependencyGraph` / `dependencyState`；原型按 `blockedBy` 实现任务依赖、列表/看板锁标记、Board 顶部依赖条与卡片连线、概览被阻塞计数，并加了循环依赖检测；Board 连线在卡片 hover/focus 时高亮。

## Files Changed

源码里的变更范围：

- `uncommitted` → `1 File Changed` / `N Files Changed`
- `lastTurn` → `Last Agent Turn`
- `staged` / `unstaged` / `branch` → `Staged` / `Unstaged` / `Branch Changes`

工作区截图里对应的是 `2 Files Changed` 卡 + `Review` + `+705` / `+25`，以及 `Changes +37 -4` / `Desktop` / ↓ 胶囊。原型已按这个结构做进对话流。

## 其它可见细节

- Composer 占位是 `Send follow-up`，右侧是模型 + 锁，底部是运行环境（`Cloud + This Mac`）
- Project 面板顶部有 pin / expand / close 控制
- 项目列表右键与任务行右键都有上下文菜单
- 命令入口可以搜索项目、任务、文件与动作；原型用 `⌘K` 命令面板复刻
- 普通会话右键有 `Add to Project`，项目本身有 `Create Project`

## 尚未映射

- 真正的 diff 面板、逐文件 review、PR 合并
- `notes.md` 的 frontmatter 持久化与任务编号分配
- 云端 agent / 远程环境切换
