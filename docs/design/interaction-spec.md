# 交互规格

> 状态：现行（v3，2026-11-08，加入执行者 / 模型 / 位置的交互；意图见 [../product/intent.md](../product/intent.md)）。`prototype/index.html` 是本规格的可点击版本；两者冲突时以本文为准，并在 [prototype-alignment.md](prototype-alignment.md) 记录差异。
> 视觉来源：项目面板借 Cursor Projects 的交互（[research/cursor-findings.md](../research/cursor-findings.md)）；侧栏、对话头、过程、输入区保持 DSH 原生形态（[dsh-native-ui.md](dsh-native-ui.md)）。

## 1. 布局

| 区域 | 内容 | 宿主承载（见 [ADR-0003](../adr/0003-host-extension-points.md)） |
|---|---|---|
| 左栏 | DSH 原生侧栏 + 项目入口；项目行显示图标、名称、相对时间、未读点 | 首版：`sidebar.panellist` 图标 → Projects 首页面板；协调者会话行显示项目图标与徽标。上游合入 `sidebar.regions` + `origin: 'project-worker'` 过滤后，切换为左栏「项目」分组且隐藏本地 worker 会话 |
| 中栏 | 项目的协调者会话（DSH 原生对话）；头部切换「对话 / 概览」（及按需激活的外部「运行视图」） | 普通会话，`openSession` 打开（建项目时写入初始引导事件脱离 `blank` 态）；概览页（`project-overview`）与外部运行视图（`project-run`）注册在 `conversation.view` 插槽（经统一上游补丁的 `when(session)` 仅对协调者会话可见，并配合 `activeViewId` 与 `conversation.composer` 按当前视图切换底部输入区），**不走 `main` 面板**以免触发宿主收起右栏 |
| 右栏 | Project 面板：`List | Board | Library` | `sidebarRightTabs` + 客户端 root 级 `ProjectUiStore`（在协调者与同项目本地 DSH worker 会话间切换时共享同一项目上下文） |
| 输入区上方 | `Questions · N`、`Agents · N`、`Listening · N` 胶囊与 Question Tray | `conversation.input.overlay` / `composer.dock` |

## 2. 两个入口

- **新建项目**：图标、名称（必填）、一句话目标（选填）、仓库（选填，允许无仓库的调研项目）。图标三种形式：内置线性 mark（14 个 × 9 色，默认 `smiley-plus`）、字母标、自定义上传（PNG / JPG / SVG ≤200KB，可选完整 / 填满与 100–250% 缩放）。
- **加入项目**：普通会话右键「加入项目」，协调者读取该会话历史，生成「建议任务 + 建议写入 INDEX 的上下文」，人逐条确认。
- 焦点在项目时点全局「新会话」，新建的是普通会话，不继承项目上下文。

## 3. 协调者对话

- 运行中输入框为空时保留宿主 `Stop` 按钮（可随时中止当前回合）；一旦输入文字，按钮变为 `Send` 并在协调者会话下默认走 `steer`（插话）。
- 输入区底部工具栏（复用宿主槽位，协调者 preset 不启用 `plan` 工具故自动隐藏 Plan 开关）：
  - 左 chip「**派发默认**」（挂载于 `conversation.input.left`）：新任务默认的执行者与位置，如 `Claude Code · 本地`、`DSH · 云端 my-vps`。点开为两列菜单（执行者 | 位置），每项带可用状态点（可用 / 未登录 / 未安装 / 位置不可达）。这是原型中「本机 Worktree / 远程 Sandbox」环境 chip 的演进。
  - 右 chip「**协调者模型**」（复用宿主原生 `conversation.input.model`）：只影响协调者本身（DSH 原生会话），切换后从下一步生效。
- 协调者拆任务时，每个任务附带推荐的「执行者 · 模型 · 位置」与一句理由（如「需要本机 Docker → 本地」），人可在启动摘要中修改。
- 收到消息先回一句确认与第一步，再调工具。
- worker 回报折叠为单行「Update from YOU-4」，可展开；只有协调者对人正式发言才点亮未读。
- 一轮结束后显示「用时 X」过程控件，展开为过程组（读取 · 命令）与思考 / 工具行（DSH 原生）。
- `@` 引用任务（按状态分组，方向键选择）；`#` 引用 PR。后端解析为精确 Task / PR id。

## 4. Question Tray

- worker 提问时在协调者输入框上方浮出托盘：「Question from YOU-4」、问题、预设选项、自定义回答、「打开 YOU-4 会话」。
- 可收起为胶囊；多条问题按创建时间排队，显示「1 of N」。
- 回答直达该 worker，不经协调者转述。
- 外部执行者的权限请求同样进托盘，显示为「YOU-4 · Claude Code 请求执行 `rm -rf dist`」，选项沿用执行者给出的（允许一次 / 总是允许 / 拒绝）；批准后回应原始 permission RPC，未收到协议回执前不能显示已批准。
- 只有阻塞型提问（gate）计入「Waiting on you」；非阻塞请求在托盘但不阻塞；可选建议（wish）只进摘要。

## 5. 右栏 Project 面板

**头部**：Project 操作（pin / expand / close，拖拽边缘调宽，双击复位）、项目身份、面板内搜索与筛选。

**List**
- 分组顺序：Waiting on you → For Review → In Progress → Queued → Done → Canceled（Done / Canceled 默认折叠）。Host 失联、权限回调未知或外部 effect 未对账的任务归入 Waiting on you 并显示原因。分组由事实推导，见 [domain-model.md §3](../architecture/domain-model.md)。
- 任务行：状态图标、编号、标题、一行摘要、PR 胶囊（多于 1 个折叠为 `N PRs`）、负责人头像、依赖锁。
- 点状态图标打开状态菜单：Waiting on you 与 For Review 标「自动」并置灰；其余选项映射为命令（启动 / 排队 / 接受 / 取消）。Done 是人执行 `task.accept` 后的结果，不是拖拽目标；PR merged 仅显示标记，不自动 Done。accept 前展示已验证/未经验证、当前 head 和后继项；有 live Run、写 effect 或 gate 时不能接受。
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
- 证据：验证命令结果、CI 状态、工件；显示被测 commit/tree、验证策略版本、运行位置与 `verified / stale / unknown`，不能只显示“通过”。
- PR 胶囊进入 PR 详情。
- 删除：从未执行过的任务可删除；执行过的任务只能取消（保留记录、分支与 PR）。

## 6. 启动

**启动摘要**（单个任务启动、批量启动、best-of-N 都先经过它）：

```
YOU-4 Staging 灰度验证
 执行者   [Claude Code ▾]   ● 本机已登录
 模型     [claude-sonnet-4.5 ▾]  思考 [中 ▾]
 位置     [本地 | 云端 ▾ my-vps]   ● 健康 0.6s
 权限     [可写工作区 ▾]  审批 [需要时问我 ▾]
  信任     [隔离执行 ▾]  环境配置 hash 已确认
  验证     [策略 v3 · pnpm test]  输入将固定为 commit/tree
 计费     本机 Claude 登录
 仓库     youshi-api @ main → agent/you-4-staging-verify
 检出     ~/.dsh/projects/worktrees/youshi/att-91   refs 10 分钟前
  控制面   本机 Project Host 在线 · 失联时远端写入暂停并等待对账
 [ ] 同时让其他执行者也做一份（best-of-N）
                                   [取消]  [启动]
```

- 三个选择器联动：换执行者后模型列表刷新为该执行者的目录；执行者不支持选模型时模型选择器置灰并显示「由 Codex 配置决定」之类原因。
- 云端 + 执行者需要 API Key 而未配置时，「启动」置灰，显示「在设置 → Agents 配置 Anthropic API Key」入口。
- 阻断项（依赖未完成、位置不可达、执行者未安装 / 未登录、refs 过期、环境配置 hash 未确认、Host 不在线、无法证明隔离）逐条列出，每条带修复动作；不以切换到另一位置或自动允许权限绕过阻断。
- 勾选 best-of-N 后展开 1–3 行附加候选，每行一组「执行者 · 模型」，共用位置类型。
- 被依赖阻塞的任务不能启动，前置完成后自动解锁。
- 分支前缀：`agent/…`；best-of-N 候选追加 `-<n>`。

## 6a. 任务上的执行信息

- **任务行 / 看板卡**：负责人头像旁显示执行者徽标（DSH 鲸鱼、Claude、OpenAI 等 logo）；位置徽标仅在云端时显示（☁ 与环境名缩写），本地不显示以减少噪音。hover 显示完整「执行者 · 模型 · 位置 · 计费来源」。
- **任务详情 → 执行区**：执行历史按 Run 列出（时间、执行者、模型、位置、时长、用量、结果），当前 Run 置顶；每条可打开运行视图。
- **best-of-N 任务**：行内显示「3 个候选」胶囊；全部结束后显示「待选 1/3」。

## 6b. 运行视图

- **DSH 执行者**：直接调用 `openSession` 打开该本地 DSH worker 会话（原生过程、审批、Files Changed）；客户端 `ProjectUiStore` 自动识别其所属 `projectId`，右栏保持挂载当前项目的 `List | Board | Library` 面板，顶部提供一键「返回协调者」入口。
- **外部执行者**：在协调者会话的 `conversation.view`（`id: 'project-run'`）中打开运行视图（不切顶层 `main` 面板，保证右栏常驻），渲染统一事件流：
  - 头部：执行者 logo、模型、位置、计费来源、状态、用量；动作 `插话`、`停止`、`移到云端 / 拉回本地`、`交给其他执行者`。
  - 主体：消息、思考（默认折叠）、工具调用行（按 kind 显示读 / 改 / 执行 / 抓取图标，改动行可展开 diff）、计划清单。
  - 权限请求以内联卡片出现，同时进入托盘；任一处回答都会回应原始 permission RPC，收到协议回执后才生效；普通插话仍走独立的 queue/steer 路径。
  - 底部输入框：通过 `conversation.composer` chain 插槽原位接管底部输入区，发给该运行（排队或插话，避免与协调者输入框叠放）。
- **黑盒执行位置**（厂商云，延后）：只显示状态、diff、PR，头部标注「过程不可见」。

## 6c. 交接

- 任务详情与运行视图提供 `移到云端`（本地运行时）/ `拉回本地`（云端运行时）/ `交给…`（换执行者）。
- 确认弹窗写清楚会带什么：分支（含未提交改动，作为 WIP 提交）、会话（「可续接」或「仅交接简报」）、目标位置与执行者。
- 交接中任务行显示「交接中」细进度（停止 → 推送 → 检出 → 安装 → 启动），失败时留在原位置并给出原因。
- 交接记录进时间线：「从本地移到云端 my-vps · 带会话」。

## 6d. Best-of-N 对比

- 所有候选结束后，任务详情出现「对比」页签：每列一个候选，行是 diffstat、验证结果、耗时、用量、reviewer 结论；可切到并排 diff。
- 每列底部「采用」；采用后其余候选标为已替代，检出回收，分支保留。

## 7. 项目设置

- 图标、颜色、名称、目标、成员、仓库、主仓库、默认分支。
- **角色默认**：worker 与 reviewer 各一组「执行者 · 模型 · 思考 · 权限 · 位置」；协调者模型单独一项。取代原型中的单一「默认模型」。
- **成员**：每个成员（AgentProfile）是一组可复用的运行偏好，可以是「Claude 前端」「Codex 后端」「DSH 便宜批量」；改负责人即换用另一组偏好。
- refs：显示数量、同步时间与过期提示；手动同步；分支管理（添加 / 重命名 / 删除；默认分支与仍被任务使用的分支不可删；远端分支可选「仅从项目移除」或「删除远端分支」，后者需二次确认）。
- 验证命令（新增，原型待补）：Task 完成后运行的命令，如 `pnpm test`。
- 所有设置变更写入项目活动（轨迹页可见）。

## 7a. 全局设置：Agents 与 Environments

**Agents**（执行者）
- 列表：DSH、Claude Code、Codex、Gemini CLI、OpenCode、Cursor CLI、自定义。每行显示：本机是否安装与版本、登录状态（本机登录 / API Key / 未配置）、能力（选模型、续接、权限请求、用量）、模型目录刷新时间。
- 动作：重新检测、安装指引、绑定 API Key（DSH credentials，仅显示名称与末四位）、设为默认、添加自定义（`command / args / env`）。
- 合规提示固定显示：「本地使用你本机已登录的账户或你提供的 API Key；云端只使用 API Key；Projects 不中转订阅。」

**Environments**（位置）
- 本地：数据目录、worktree 根、并发上限。
- 云端环境列表：每个环境是 SSH 主机 / Docker / 沙箱提供商之一，显示健康点、最近检测耗时与历史（原型中的环境检测、历史、自动重试面板归到这里）、并发上限、已预装的执行者。
- 新增云环境向导：选类型 → 连接信息（SSH 主机与密钥引用 / Docker 上下文 / 提供商 API Key）→ 测试连接 → 选择默认仓库的环境规格。
- 仓库环境规格：展示并编辑 `.dsh/environment.json`（image、install、start、validate、ports、network、secrets 名），显示最近一次准备（install）的日志与快照。

## 8. 概览页（`project-overview`）

通过协调者会话 `conversation.view`（`id: 'project-overview'`，避开宿主开发者调试用的 `'trajectory'` 视图 ID）渲染，底部通过 `conversation.composer` 隐藏聊天输入框：展示项目目标、完成度、任务统计、成员、仓库、被阻塞任务数、快捷动作、最近活动；最近活动可按状态与成员筛选。新增：按执行者 / 位置的运行分布与用量，云端算力时长。

## 9. 生命周期

| 操作 | 交互 |
|---|---|
| Pause | 顶部 Paused 横幅，Resume 恢复；横幅注明云端检出已暂停计费 |
| Archive | 项目移入归档视图，可恢复 |
| Delete | 二次确认；说明会删除本地状态、上下文与 worktree，保留远端分支与 PR |

## 10. 主题

两套色卡：默认 DeepSeek（底 `#13161d`，强调 `#4d6bfe`）；`?brand=claude`（底 `#191919`，强调 `#d97757`）。账户菜单可切换。
