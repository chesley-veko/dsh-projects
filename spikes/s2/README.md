# Spike S2 — 协调者会话的视图、输入框与右栏

要回答：`conversation.view`（`project-overview` / `project-run`）加
`conversation.composer` 接管，能否保持右栏常驻且只有一个输入框。
任务书：`docs/spike/README.md` §3 S2。
报告草稿：`docs/spike/reports/S2-coordinator-view.md`（结论空着，live 实验后填）。

## 布局

- `dsh-spike-s2/` — 最小 spike 插件（cordis bundle，仿 dsh-superagent 构建）：
  - `src/index.ts` — 服务端：`POST /spike-s2/api/coordinators` 经
    `ctx.agents.create` 创建 id 前缀 `proj-coordinator-` 的会话（preset
    `standard`，模型 opencode-go/deepseek-v4.1-flash）；
    `POST /spike-s2/api/coordinators/:id/message` 经
    `agent.followup(createUserMessage(...))` 向协调者发消息；
    `GET /spike-s2/api/coordinators` 列表；`GET /spike-s2/api/health` 健康检查。
  - `src/client/index.tsx` — 客户端注册：
    - `main` 面板（新建协调者 + 列表 + Open + 右栏状态探针，读 DOM
      `data-sidebar-right-open`）；
    - `conversation.view` 两个视图：`project-overview`（order 1）、
      `project-run`（order 2），`inject(sessionId)` 只认
      `proj-coordinator-` 前缀，非协调者显示占位提示；
    - `conversation.composer` 接管：`select` 只认协调者前缀，priority 10
      （排在 subagent 只读 composer -10 之后）；接管组件内用
      `renderSlot` 重新渲染 `conversation.input.left` 与
      `conversation.input.model`（在注册里声明为 `children`）；
    - `conversation.input.left` 的 chip（"＋ 任务"，点击只做本地标记，
      无后端动作）。
  - `src/client/views.tsx` / `composer.tsx` / `panel.tsx` — 视图、接管输入框、主面板。
- `profile/` — 测试 profile（端口 **3092**，不加载 dsh-superagent）。

## 源码核实结论（fcc0ad46，见报告 §逐项结果）

- 视图 tab 来自全部已注册 `conversation.view` 条目，无按会话过滤
  （apply.ts:211-222，只有 trajectory 视图按 developerTools 门控）：
  project-overview / project-run 的 tab 会出现在**所有**会话的 tab 栏，
  只有内容按会话门控。live 时在普通会话里点开 tab 应看到占位提示。
- composer 选举：selector 按 priority 升序，首个非 null 选中成为
  `matched`；select 必须纯函数（只看 owner props）；`overlay: true` 时
  fallback 保持挂载但 display:none。
- **无可读的 active view 状态**（ui-conversation 源码 grep
  activeView/currentView 零命中）：接管只能按会话（协调者）定范围，
  不能按视图定范围——project-overview 里输入框同样被接管。这是 S2 的
  设计发现，见报告。
- 右栏展开状态可观测：DOM 属性 `data-sidebar-right-open`
  （SidebarRight.tsx:346）；`activePanelId`（ui-layout stores.ts:19,95）
  无 DOM 标记，live 时从 UI（哪个主面板图标高亮）+ 截图观察。
- `conversation.input.model` 是 single 插槽，由 ui-model-selection 注册；
  本 spike 复用它，不替换。

## dsh-01 安装与启动（指挥者调度，见报告 §复现步骤）

1. 在 dsh-01 上 checkout 本分支，`cd spikes/s2/dsh-spike-s2 && pnpm install && pnpm build`。
2. 把 `spikes/s2/profile/` 复制到 lab 的 profiles 下（例如
   `/data/home/workspace/dsh-superagent-lab/profiles/spike-s2/`），并确认
   `profile/package.json` 里的 `link:` 路径指向 dsh-01 上插件的实际位置。
3. 在该 profile 目录 `pnpm install`，用与 lab 相同的方式启动（tmux 新会话，
   `DSH_HOME` 指向 lab 目录，`OPENCODE_API_KEY` 经 `~/.config/dsh-lab/opencode.env`
   注入，端口 3092）。**先记版本**：`dsh --version`、已装 `@deepseek-ai/dsh`
   版本、`node --version`；角色模型升级后未重验，live 前复查默认模型是否
   仍为 opencode-go/deepseek-v4.1-flash。
4. 打开 http://127.0.0.1:3092，按报告里的切换路径逐项观察并截图。

## 已知风险（live 前注意）

- 构建时 devDeps 钉的是 0.2.1-alpha.2（与 dsh-superagent 相同、在 dsh-01
  上已验证可装），运行时是 profile 装的 0.2.2-rc.1；若 `pnpm build` 报
  类型错，先看是不是 `AgentOptions` / `PropsRuntime` / `MainPanelId`
  导出或 `children` 声明形状差异，再按报告 §未完成与推断项 的备选改。
- **接管组件内重渲染 input.left/model 是待验证的假设**：它依赖
  `children` 声明 + `renderSlot` 的组合（见 composer.tsx 顶部注释）。
  若构建时类型系统拒绝（`__renders` 要求组件 ⊆ children 声明），或
  运行时报重复声明/重复渲染，删掉 composer.tsx 里那两行
  `renderSlot(...)` 调用（保留输入框与发送功能），改按"解释 (b)"验
  收：chip 与模型选择器在 project-overview 视图（常驻输入框未被接管）
  与普通会话里可见可用；在 project-run 里被隐藏记为观察结果，不算
  构建失败。
- `main` 面板的显示标题取自 locale 字典 `title` 键；若标题显示为原始 key，
  属外观问题，不影响实验，记入报告备注即可。
