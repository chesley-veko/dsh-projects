# DSH 对话空间执行计划

> 对应方案：[`chat-space-proposal.md`](chat-space-proposal.md)
> 状态：待实施
> 日期：2026-11-06
> 原则：先验证运行时契约，再写插件；每个阶段都能独立回滚。

## 0. 执行目标

在现有 DeepSeek Harness Profile 中，以 Bundle Plugin 的方式加入 Chat Space，并达到以下可验收结果：

1. 侧栏顶栏出现 Claude 方向的 `Chat / Code` 工作面切换器。
2. Chat 与 Code 使用独立 Workspace、独立会话列表和独立默认 Agent。
3. Chat 新会话进入专属 `chat` preset，Code 继续使用当前默认 preset。
4. Chat 首页接近 Claude Classic，使用 DeepSeek 主题色和个人化入口。
5. Chat 模式默认不暴露终端、写文件和工程计划工具。
6. 切换、重启、插件禁用和失败回退不会破坏已有 Code 会话或 Chat 会话。

本计划不把“看起来像 Claude”当作完成条件。数据隔离、Agent 选择、权限边界、错误恢复和可回滚性优先于装饰细节。

## 1. 不可变约束

### 1.1 不修改宿主核心

不改 `app.asar`，不把功能写入 DSH Web Shell 源码。所有实现使用：

- workspace bundle patch；
- Host Plugin；
- Client Plugin；
- 已验证的 Service、Slot、Session Projection 和主题 token。

若现有 Claude style 缺少必要的适配点，只在其可维护源码副本或兼容性包中增加 adapter，不直接修改 Profile 下的已安装文件。

### 1.2 不把 DOM 当业务状态

不得用长期 CSS 选择器、定时扫描 DOM 或伪造 `window.__DSH_BOOT__` 条目来驱动核心逻辑。DOM 适合做最后一层视觉适配，不能决定：

- 当前空间；
- 会话归属；
- Agent preset；
- 工具权限；
- Workspace 是否被 Code 列表过滤。

### 1.3 不新增不可识别的 Session Event

Chat Space 的偏好、Workspace 绑定和导航缓存使用 DSH 可持久化配置或 Storage 服务。会话内容、消息和工具记录继续由原生 Session log 保存。若必须写插件记录，先验证 DSH 的兼容 envelope 和恢复行为，默认不走这条路径。

### 1.4 不以视觉完成替代行为完成

一个 UI 入口只有在对应行为已经接通后才算完成。静态的 Chat / Code 胶囊、假的搜索按钮、没有权限边界的 Cowork 入口都不进入验收版本。

## 2. 目标包和职责

首版创建一个新的 workspace 包：

```text
<workspace>/dsh-chat-space/
├── package.json
├── cordis.patch.yml
├── index.js                 # Host half
├── client.js                # Client loader
├── locale/
│   ├── zh.json
│   └── en.json
├── icon.svg
└── client/
    ├── surface.js
    ├── sidebar.js
    ├── hero.js
    ├── composer.js
    ├── search.js
    ├── artifacts.js
    ├── state.js
    └── styles.css
```

实际文件名可以调整，但职责不能混在一个巨型 Client 模块中。

### 2.1 `@local/dsh-chat-space` 负责

- Chat Workspace 的初始化和绑定。
- `chat` Agent preset 的补丁声明或与 preset bundle 的联动。
- 当前 surface、预留的 Chat / Cowork mode 状态和最近 Session 的导航状态。
- Chat 列表过滤和新会话入口。
- Hero、Starter Pills、Composer 扩展和状态折叠。
- DeepSeek token 驱动的 Chat Space 样式和动效。
- 设置页中的最小开关、版本和恢复入口。

### 2.2 `dsh-claude-style` 负责

- 通用 Claude 方向的表面、字体、密度、popover、消息阅读和动效基础。
- DeepSeek color card 的主题输出。
- 已有搜索、模型、Composer 和首页视觉适配。
- 必要时提供一个正式的 surface adapter，让外部插件可以提供 Chat / Code 状态和点击回调。

Chat Space 不应复制一份完整 Claude style。能通过 token、已有样式和 adapter 复用的部分都复用。

## 3. 依赖关系

```text
P0 运行时契约审计
  ↓
P1 Bundle 骨架与 feature flag
  ├── P2 chat preset ──────────────┐
  ├── P3 Chat Workspace 与路由 ────┼──→ P5 侧栏、Hero 与 Composer
  └── P4 surface switch adapter ────┘             ↓
                                           P6 阅读、搜索与滚动
                                                    ↓
                                           P7 DeepSeek 视觉与动效

P2 + P3 ──→ P8 Cowork / Artifacts

P1 至 P8 按能力范围汇总 ──→ P9 验收、回滚演练和交付
```

P2、P3、P4 的部分调查可以并行，但任何写代码的实现都必须先通过 P0 的相应退出条件。

## 4. P0：运行时契约审计

### 目标

确认当前 DSH Profile、Claude style 和 Web Client 的实际能力，给所有高风险决策找出可验证答案。

### 必查内容

#### A. Preset 能力

使用 Host `Config.listConfigs` 查询 `@deepseek-ai/dsh-agent-preset` 的 `include:preset-standard` 或等价 entry，确认：

- preset 声明 schema；
- `plugins` 的结构；
- `name`、`description`、`order` 的行为；
- `@deepseek-ai/dsh-persona` 当前可用字段；
- `tool-web`、`tool-fs`、`tool-skill` 的配置和默认工具集合。

不要凭旧版 `standard.patch.yml` 推断新版本行为。每个要用的 package 都要用当前安装版本的 Config 或包文档确认。

#### B. Workspace 和 Session

使用 Client `Service` 查询：

- `uiWorkspace`；
- `workspaces`；
- `sessions`；
- 当前会话列表、Workspace 列表和 Session summary 的字段。

需要确认：

- 能否按路径创建或查找一个稳定 Workspace；
- `startSession`、`connectWorkspace` 传入 `agentPreset` 后的实际结果；
- 客户端能否拿到 Session 的 workspaceId 或稳定路径；
- 过滤列表时应使用 Workspace ID、路径还是已有 selector；
- 切换时打开旧 Session 的最小调用方式。

#### C. Slot 结构

使用 Client `Slots.listSubTree` 确认当前页面的：

- `sidebar`、`sidebar.workspaces`、会话行插槽；
- `conversation.hero.agentPreset`；
- `conversation.hero.options`；
- `conversation.composer.bar` 及输入区子插槽；
- `conversation.chat.flow`、`conversation.chat.node`、`conversation.chat.turnTail`；
- 右侧栏和 deliverable / file preview 相关插槽。

记录每个插槽的 `kind`、`scope`、owner props、replaceRisk 和可用 selector。`sidebar` 根插槽目前标记为会替换整个左栏，默认禁止使用。

#### D. Claude style 适配面

检查当前 `dsh-claude-style` 的：

- surface switch 是否仍依赖 `ds-bot` boot entry；
- switch 的点击是否调用 `botReturn` 和 `botAccount` 等内部节点；
- DeepSeek color card 是否由用户偏好控制；
- 是否有可复用的 surface、home、composer、search、artifact 适配接口；
- 现有插件的 package source、许可证和构建方式是否可维护。

#### E. 主题 token

使用 Client `Theme.listTokens` 取得当前 token 名称，确认以下内容均有宿主 token：

- 画布和侧栏；
- 主文字、次级文字、边框和 hover；
- 品牌 accent 和主按钮；
- 输入框、popover、分割线；
- 深色模式和 reduced-motion 相关 token。

### P0 输出物

```text
artifacts/chat-space-runtime-audit.md
artifacts/chat-space-slot-map.json
artifacts/chat-space-preset-contract.json
```

这些是实施过程中的证据文件，若用户不需要长期保留，可在交付后转为内部记录。

### P0 退出条件

- 能明确写出 Chat 新会话的真实调用链。
- 能明确写出 Chat 会话从 Code 列表过滤的真实字段和 selector。
- 能明确 surface switch 应该修改 Claude style、使用现有 slot，还是两者结合。
- 能明确 Chat preset 可以挂载哪些工具，以及哪些工具必须在 preset 层剥离。
- 若上述任一项只能靠 DOM 猜测，停止进入视觉开发，先解决扩展点问题。

## 5. P1：包骨架、配置和 feature flag

### 目标

建立可以安装、启用、禁用和卸载的最小 Bundle，不改变现有 UI 行为。

### 实施内容

1. 创建 `@local/dsh-chat-space`，写入最小 `package.json`、patch、locale 和原创图标。
2. Bundle 只插入一个 disabled-by-default 或显式启用的 feature row，具体策略根据当前 Profile 的安装方式决定。
3. 加入 Config：
   - `enabled`；
   - `chatWorkspacePath` 或路径策略；
   - `defaultPreset`；
   - `showSurfaceSwitch`；
   - `enableCowork`；
   - `motion`；
   - `starterPrompts` 是否启用。
4. Host 和 Client 均做 feature flag 检查，禁用时不注册业务插槽。
5. 所有注册都由当前插件 context 持有，卸载时能够释放。

### 输出

- 可安装的 bundle 目录。
- locale、icon 和 package metadata。
- `npm`/Node 语法检查结果。
- 安装后 `plugin_manager` 返回的 `application` 和 `warnings` 记录。

### 退出条件

- 插件安装后页面不白屏。
- 禁用插件后原有 Claude style 和 Code Space 与安装前一致。
- 插件重新启用无需手工清理 Profile 文件。
- `cordis_inspect_query` 能看到新的 Host/Client 注册或配置。

## 6. P2：Chat Agent preset

### 目标

先把 Agent 行为独立出来，再做 UI。这样可以单独验证 Chat 的人格、搜索规则和工具边界。

### Preset 组成

以 `preset-chat` 为声明 ID，实际插件列表必须经过 P0 schema 确认。原则如下：

1. Persona：写入用户确认的人格定义、思考纪律和表达禁区。
2. Runtime context：默认不注入 Code Workspace 路径和工程规约。
3. Web：保留搜索和抓取，配置合理超时和失败返回。
4. Filesystem：首版只读、读图和附件读取，关闭写入和编辑。
5. Skills：保留技能发现和调用，但只启用与 Chat 相关的技能。
6. Questions：保留向用户澄清问题的能力。
7. Present：保留用户要求的可交付文件呈现能力，前提是当前 Profile 已提供。
8. 删除或禁用终端、持久 Job、todo、goal 和工程 Plan 能力。

### Prompt 版本管理

人格 prompt 作为独立文本常量或 locale 资源管理，不散落在 Client UI。每次修改增加 `chatPromptVersion`，便于测试不同人格版本。

Prompt 必须写清三个边界：

- 什么情况下必须搜索，什么情况下自然闲聊不需要搜索。
- 搜索失败时如何说明，不得装作已查证。
- Chat 模式不能因为用户提到代码就自动获得 Code 工具；当前版本需要用户切到 Code，Cowork 仅在对应权限能力上线后可用。

### P2 测试

用一个新 Chat Session 验证：

- 普通闲聊不会自动出现工程计划条。
- 概念解释会尝试调用 web 工具。
- web 无结果、超时和来源不可读时会诚实降级。
- 不能调用 bash、终端、write、edit、todo、goal。
- 可以读用户明确上传的图片和文件。
- 相同的 Code preset 不受影响。

### 退出条件

Chat preset 可在一个新 Session 中独立运行，且工具 schema、工具执行和失败结果与预期一致。若只能靠 prompt “要求 Agent 不要调用某工具”，却仍然把该工具暴露给 Agent，则本阶段不通过。

## 7. P3：Chat Workspace 与状态路由

### 目标

建立真正独立的会话容器和可恢复的工作面状态。

### 状态模型

插件持久化以下配置，字段名可调整但要有版本：

```json
{
  "version": 1,
  "chatWorkspaceId": null,
  "chatRoot": null,
  "surface": "code",
  "chatMode": "chat",
  "lastSessionBySurface": {
    "chat": null,
    "code": null
  }
}
```

`chatWorkspaceId` 是主绑定。`chatRoot` 只用于发现和迁移检查，不能作为唯一身份。`lastSessionBySurface` 只用于导航恢复。

### 初始化流程

1. 用户第一次点击 Chat。
2. Host 检查绑定是否存在。
3. 不存在时创建或连接专属目录和 Workspace。
4. 写入 Workspace ID 和路径。
5. 通过 `connectWorkspace(workspaceId, { agentPreset: 'chat' })` 获取可用空 Session。
6. 保存 Chat surface 和 Session 状态。
7. Client 打开 Chat 首页或恢复已有会话。

任何一步失败，保持 Code surface 不变，显示一次可关闭的错误通知，并允许重试。

### 会话过滤

过滤必须发生在数据进入列表渲染前，不能只用 CSS `display:none`。优先顺序：

1. 使用宿主 `useWorkspaces` / `useSessions` selector 得到最小数据。
2. 在 Chat surface 只保留 `chatWorkspaceId` 对应的会话。
3. 在 Code surface 排除 `chatWorkspaceId` 对应的会话。
4. 保留宿主原生的排序、运行状态、归档和重命名能力。
5. 若现有 `sidebar.workspaces` 只能整块替换，先实现一个受控的 Sidebar adapter；不复制宿主所有工作区逻辑，避免长期分叉。

### 切换行为

- 点击 Chat：若 Chat Workspace 已就绪，打开最近 Chat Session；否则初始化。
- 点击 Code：恢复之前的 Code Session 或当前宿主默认行为。
- 切换中按钮进入 pending，防止连续点击创建多个 Session。
- 当前 Session 正在运行时不停止，只切换可见工作面。
- 切换失败回到原 surface，清除本次未完成的导航锁。

### 退出条件

- 新建 Chat 会话与新建 Code 会话的 Workspace 和 preset 可通过日志、Projection 或 Client snapshot 区分。
- 重启 DSH 后两个空间都能恢复。
- 在任一空间看不到另一空间的会话。
- 切换期间重复点击不会创建重复空会话。
- Chat Workspace 创建失败不会污染 Code Space。

## 8. P4：surface switch 与 Claude style 适配

### 决策顺序

P0 审计完成后按以下顺序选择实现：

#### 方案 A：Claude style 提供 surface adapter，优先

在可维护的 Claude style 源码副本中增加一个小接口：

```text
registerSurfaceController({
  getSurface,
  onSelectSurface,
  isAvailable,
})
```

Claude style 负责位置、尺寸、主题、动画和无障碍属性。Chat Space 负责 `getSurface` 和 `onSelectSurface`。

#### 方案 B：找到正式的 Sidebar 顶栏 slot

如果当前版本有明确的顶栏扩展座位，Chat Space 直接注册 slot，不修改 Claude style。

#### 方案 C：受控 Sidebar adapter

只有 A、B 都不可行时，才替换一个受控 Sidebar 容器。它必须：

- 复用宿主的 workspace/session selector 和 action；
- 保留 Settings、折叠、快捷键、上下文菜单和无障碍行为；
- 只接管顶部 switch 和 Chat/Code 过滤；
- 提供与宿主版本绑定的契约测试。

禁止直接用 `querySelector` 找 hashed class，也禁止靠 `ds-bot` 假入口触发切换。

### 视觉验收

- switch 在展开侧栏中靠近顶栏右侧。
- 侧栏收起或空间不足时自动隐藏。
- Light / Dark 使用 DeepSeek token。
- `role=radiogroup`、`role=radio`、`aria-checked` 和键盘操作完整。
- switch 不推动侧栏列表产生跳动。
- 切换页面不出现长时间遮罩或无意义横向滑动。

## 9. P5：Chat 侧栏和首页

### 9.1 侧栏

V1 先做必要入口：

- 新建；
- Chat 会话列表。

搜索入口和搜索面板在 P6 一起接通。专题、Artifacts 索引和人格编辑器等没有后端模型的入口，先不显示，不做空壳页面。

使用 `sidebar.workspaces` 和会话行插槽时，复用宿主 selector 和 actions。若必须自绘列表，保留：

- 标题重命名；
- 归档和删除；
- 运行状态；
- 当前选中态；
- 键盘导航；
- 空、加载、错误状态。

### 9.2 Hero

使用宿主的 `conversation.hero.brand.mark`、`conversation.hero.options`、`conversation.composer.dock` 等位置，尽量不替换 `conversation.session`。

Hero 组件包含：

1. 时段问候。
2. DeepSeek 蓝品牌标记。
3. Composer。
4. 五个 Starter Pills：
   - 本源拆解；
   - 概念考据；
   - 跨域类比；
   - 文学与思辨；
   - 深夜随聊。

Pill 点击只填入可编辑草稿。模板必须有版本，便于以后调整而不影响旧会话。

### 9.3 Composer

优先使用 `conversation.composer.bar` 及子插槽：

- `conversation.input.left`：附件；Cowork 开发完成后再加入 Chat/Cowork 切换；
- `conversation.input.model`：模型和思考深度；
- `conversation.input.right`：发送、停止或队列动作；
- `conversation.composer.dock`：检索状态和轻量提示。

不直接接管宿主的 prompt 提交链。提交、队列、停止和插话调用宿主已有 Session/Input action。

### 退出条件

- 新 Chat Session 首屏不显示工程目录选择和 Code 权限控件。
- 输入框高度稳定，长文本不遮挡控制行。
- 中文 IME 的 Enter 行为正确。
- Starter Pills 可通过键盘访问并填入草稿。
- Chat 和 Code 的 Composer 状态切换不会残留对方的权限控件。

## 10. P6：对话阅读、搜索状态和滚动

### 10.1 消息和工具状态

不替换宿主 Markdown/代码渲染。只在已有 Chat node 或 turn tail 上扩展：

- 搜索状态的简洁摘要；
- 可展开的来源列表；
- 失败提示；
- Chat-specific 的消息动作。

如果无法可靠区分工具类型，第一版显示通用“正在处理资料”状态，不假装准确显示“已查阅 N 个来源”。只有数据来源和计数确认后才展示具体数字。

### 10.2 流式滚动

优先使用 Claude style 当前已有的 scroll pinning 逻辑或 DSH Conversation 自带跟随机制。若需要新增：

- 以用户主动滚动事件为锁定信号；
- 以距底部阈值判断是否继续跟随；
- 生成期间不通过定时器强行 scroll；
- 用响应式 selector 获取 running 和 stream 状态；
- 视口恢复到底部后再恢复跟随。

### 10.3 搜索

第一版复用 DSH 已有 Session search 或 Claude style 的搜索入口。搜索结果只包含 Chat Workspace 的会话。若宿主搜索 API 不支持 Workspace 过滤，在 Client 侧按 sessionId 映射做二次过滤，但不把所有日志下载到浏览器后自行全文扫描。

### 退出条件

- 搜索不会显示 Code 会话。
- 搜索工具和回答工具状态可折叠，不暴露大段 JSON。
- 用户向上滚动时流式输出不会把页面拉回底部。
- 长消息、代码块和附件仍由宿主正确渲染。

## 11. P7：DeepSeek 主题与动效移植

### 顺序

先完成结构和状态，再做视觉。动效不能掩盖状态错误。

### 主题

1. 设置并验证 Claude style 的 DeepSeek color card。
2. Chat Space 所有 CSS 只消费 `--dsw-alias-*` 和 Claude style 已公开的私有 token。
3. 扫描新增 CSS，确认 Chat 模式没有橙色主操作色。
4. 验证浅色、深色、系统跟随、窗口失焦和 reduced-motion。

### 动效

按优先级移植：

1. switch、Pill、popover 的短反馈。
2. Hero 进入和 Composer 聚焦。
3. 搜索/等待状态的蓝色微光。
4. 消息进入和工具状态展开。
5. 滚动边缘遮罩。
6. Artifacts 面板拖拽和回弹。

每项动效必须写明：

- 它解释的状态或空间因果；
- 进场、退场和打断行为；
- reduced-motion 下的静态结果；
- 是否影响布局和性能。

不要把 `open-claude-ui` 的 demo 组件直接打包进插件。只移植需要的 CSS、状态机和经过许可的原创代码，并保留来源记录。

### 退出条件

- 常规过渡不超过约 300ms，长时间循环只用于真实等待状态。
- 动画运行时可以再次点击或切换，不锁死 UI。
- reduced-motion 下所有关键动作仍可完成。
- 100 tokens/s 级别的流式文本不会因为逐字动画造成明显掉帧。

## 12. P8：Cowork 和 Artifacts

### 12.1 Cowork

先做能力边界，不先做漂亮按钮：

1. 明确 Cowork 的允许目录。
2. 明确写入工具、转换工具和呈现工具。
3. 通过独立 preset 或受控工具限制切换权限。
4. UI 显示当前目录和权限范围。
5. Chat/Cowork 切换不会把 Code 工具带入 Chat Workspace。

若当前 DSH 没有动态切换 Agent preset 或工具限制的稳定 API，Cowork 延后，不通过前端隐藏按钮冒充完成。

### 12.2 Artifacts

先接入已存在的文件引用、deliverable 和右侧栏能力：

- 对话中出现可呈现文件时显示 Preview action。
- 右侧打开宿主已有 preview panel。
- 对话和面板之间保留当前 Session 上下文。
- 失败时回到消息内的文件链接或错误状态。

只有在宿主能力不足且 P0 明确可扩展后，才实施独立分栏器。分栏器必须支持最小宽度、拖拽捕获、Escape 回滚、双击复位和窄窗口收起。

### 退出条件

- Cowork 的写入范围可验证。
- Artifacts 预览不绕过 DSH 权限。
- 右栏展开和关闭不破坏对话滚动。
- 预览失败时用户仍能获得文件或错误信息。

## 13. P9：验证、安装和回滚

### 13.1 静态检查

每次安装前执行：

- `package.json` 和 `cordis.patch.yml` 结构检查；
- JavaScript 语法检查；
- locale key 对照；
- icon 与 display metadata 检查；
- CSS token 扫描；
- 未引用资源和错误导入检查。

不在 Profile 目录里手工写 `package.json`、`cordis.patch.yml` 或运行 pnpm。所有包在 workspace 目录构建，交由 `plugin_manager install_bundle` 安装。

### 13.2 安装验证

安装后按顺序：

1. 读取 `plugin_manager` 的 `application` 和 `warnings`。
2. 只有 `application: applied` 才继续视觉验证。
3. 用 `cordis_inspect_query` 验证新配置、Service、Slot 或 preset row。
4. 打开当前 Harness 页面，检查初始 Code 状态没有回归。
5. 切到 Chat，完成新会话、发送、搜索、切回 Code。
6. 新建第二个 Chat 会话，确认列表和恢复逻辑。
7. 测试运行中切换、搜索失败、Workspace 初始化失败和附件失败。

不要只看 boot payload、进程列表或“插件已安装”来判断功能完成。

### 13.3 浏览器验证矩阵

| 场景 | 结果 |
|---|---|
| 现有 Code 会话打开 | 不变 |
| 第一次进入 Chat | 创建并绑定 Chat Workspace |
| Chat 新建会话 | 使用 `chat` preset |
| Code 新建会话 | 使用原 Code preset |
| Chat 列表 | 只见 Chat 会话 |
| Code 列表 | 不见 Chat 会话 |
| Chat 会话运行中切 Code | Agent 不被隐式停止 |
| 切回 Chat | 恢复原 Chat 会话 |
| Chat Workspace 创建失败 | 保持 Code，显示可重试错误 |
| web 搜索超时 | 显示降级状态，不伪造来源 |
| 禁用插件 | Code 可用，Chat 数据不损坏 |
| 重启应用 | 两个空间可恢复 |
| Light / Dark | DeepSeek 蓝一致 |
| 窄窗口 | switch 隐藏或避让，Composer 不溢出 |
| 键盘和 IME | 无误发送，浮层可 Escape 关闭 |
| reduced-motion | 无关键功能丢失 |

### 13.4 回滚

回滚分三层：

1. **功能回滚**：关闭 Chat Space feature flag，保留 Workspace 和 Session 数据。
2. **插件回滚**：安装上一版 bundle，禁止删除 Chat Workspace 目录。
3. **视觉回滚**：撤销 Claude style adapter 版本，恢复原主题配置；不改写 Chat 会话。

回滚后再次启用必须能够读取旧版状态。状态 schema 变更用迁移函数，不能直接清空未知字段。

## 14. 测试分层

### 14.1 纯逻辑测试

- surface 状态机和重复点击去重；
- Workspace 归属过滤；
- preset 选择；
- Chat / Cowork 权限映射；
- lastSession 恢复和失效回退；
- Starter prompt 填充；
- reduced-motion 状态选择。

### 14.2 Host 集成测试

- 首次创建 Workspace；
- 已存在 Workspace 的幂等连接；
- preset 传递；
- 存储读写和版本迁移；
- 插件卸载时的 disposer；
- 失败情况下不改变当前 surface。

### 14.3 Client 交互测试

- switch 的 aria 状态和键盘导航；
- Chat 侧栏列表过滤；
- Composer IME、附件、发送、停止和队列；
- 搜索过滤；
- Hero 空态、加载态、错误态；
- 右栏打开、关闭、拖拽和 Escape。

### 14.4 视觉回归

至少验证：

- 1440px 及以上桌面宽度；
- 1024px 窄桌面；
- 375px 宽度的响应退化；
- 浅色和深色；
- reduced-motion；
- 侧栏展开、收起和 drawer 状态；
- Chat 首页、长对话、搜索、popover 和 Artifacts。

当前 Harness 页面应通过 Tabbit 或已连接的浏览器能力验证，不另起替代服务器来假装更新 Web GUI。

## 15. 文件和变更边界

### 首轮允许新增或修改

- 新的 `dsh-chat-space` bundle 目录；
- 必要的 Claude style 可维护源码副本或 adapter 包；
- 方案、执行记录和测试说明。

### 首轮禁止修改

- DSH `app.asar`；
- Profile 内手工生成的 package metadata；
- 现有 Code preset 的人格和工具列表；
- 用户已有 Session log；
- 与 Chat Space 无关的 Projects 原型和文档。

### 每次提交前检查

- `git diff` 只包含当前阶段范围；
- 不覆盖用户已有改动；
- 不提交 Profile 目录下的缓存、生成包和敏感配置；
- 新增文件中不写 API key、路径隐私或运行时 token。

## 16. 最终 Definition of Done

只有下面所有条件同时满足，才宣布首版完成：

- Chat / Code switch 可用且可恢复。
- 两个空间的 Workspace 和会话列表真正隔离。
- Chat preset 与 Code preset 的工具和人格边界可验证。
- Chat 首页和 Composer 完成，五个入口可用。
- DeepSeek 主题在浅色和深色都一致。
- 搜索、附件、流式滚动和错误状态可用。
- 关键交互有键盘、IME、窄窗口和 reduced-motion 支持。
- 插件安装、禁用、重启和回滚均经过实测。
- 所有未完成能力，如 Cowork 写入、Artifacts 全生命周期、专题和长期记忆，均明确标记为后续版本，没有用空 UI 掩盖。

## 17. 实施顺序摘要

```text
1. P0 审计当前 DSH / Claude style 契约
2. P1 建立可安装、可禁用的 bundle 骨架
3. P2 独立验证 chat preset 和工具边界
4. P3 建立 Chat Workspace、状态持久化和列表过滤
5. P4 用 adapter 或稳定 slot 接入顶部 switch
6. P5 完成 Chat 侧栏、Hero、Starter Pills 和 Composer
7. P6 完成消息阅读、搜索状态和滚动行为
8. P7 做 DeepSeek 主题统一与动效打磨
9. P8 在权限稳定后加入 Cowork / Artifacts
10. P9 安装验证、回滚演练和交付记录
```

每阶段完成后先验证退出条件，再进入下一阶段。任何阶段发现只能依赖 DOM 猜测、只能依赖 prompt 约束权限，或只能通过覆盖整个宿主页面才能继续，都暂停并重新评估扩展点，不把风险带到后续阶段。
