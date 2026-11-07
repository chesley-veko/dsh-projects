# DSH 对话空间产品方案

> 状态：设计基线
> 日期：2026-11-06
> 目标：在 DeepSeek Harness 中增加一个接近 Claude Desktop 产品形态的 Chat Space，保留 Claude 的信息架构、界面语言与交互节奏，统一使用 DeepSeek 主题色。

## 0. 结论

DSH 需要增加的不是一个“聊天皮肤”，而是和 Code Space 并列的一种产品工作面。

- `Code Space` 面向工程执行。核心对象是仓库、文件、命令、任务和变更。
- `Chat Space` 面向思考与交流。核心对象是问题、概念、观点、资料、长文和可复用的产物。
- 两个空间共享 DSH 的模型、会话基础设施和登录状态，但不共享会话列表、默认 Agent、工作目录和工具权限。
- Chat Space 的外形和动效沿用 Claude Desktop 的产品方向，品牌、颜色、图标和 Agent 人格归 DeepSeek。

这份方案描述产品应该成为什么样。具体如何分阶段验证和实施，见 [`chat-space-execution-plan.md`](chat-space-execution-plan.md)。

## 1. 产品定位

### 1.1 Chat Space 解决的问题

当前 DSH 的交互重心是任务型和 coding 型工作。它擅长让 Agent 进入一个目录，读取上下文，调用工具，修改文件，运行命令，然后交付结果。这个模型适合“把事情做完”，却会给以下场景增加额外负担：

- 想理解一个概念，却先看到工作目录、权限、计划和工具入口。
- 想讨论一个观点，却被工程会话和项目会话淹没。
- 想长期保留阅读、思辨、写作和研究线索，却只能把它们和代码调试记录混在同一份列表里。
- 想要一个有连续人格的对话对象，却每次都回到默认 coding agent 的语气和工作规约。

Chat Space 用一个独立的工作面解决这组问题：进入后可以直接说话，Agent 默认具备考据、推理、类比、写作和资料阅读能力，界面围绕阅读和表达组织，会话长期保留但不污染 Code Space。

### 1.2 不把 Chat Space 做成什么

以下内容不属于首个版本的目标：

- 不把 Code Space 的所有工具换个颜色后重新命名为 Chat。
- 不把所有 DSH 会话简单按标签筛选，继续让两个空间共享同一套默认 Agent。
- 不把 Chat Space 做成营销首页或独立 Web 应用。
- 不在没有持久数据模型的情况下伪造“长期记忆”。
- 不为了复刻视觉细节而复制 Claude 的专有二进制资源、品牌字标或未授权素材。

## 2. Claude 产品方向的取舍

### 2.1 采用的产品结构

Claude Desktop 当前产品形态给出的关键启发是“顶层工作面切换”。左上角的 Chat / Code 入口不是普通主题切换，它改变了默认任务、导航、会话环境和 Agent 行为。

我们采用以下结构：

```text
应用壳层
├── Chat Space
│   ├── Chat
│   └── Cowork（后续能力层）
└── Code Space
    └── 当前 DSH 工程工作流
```

Chat 与 Code 是第一层切换。Chat 内的 `Chat / Cowork` 是第二层切换：

- `Chat` 只承担对话、检索、阅读、推理和轻量产物生成。
- `Cowork` 允许在 Chat Space 的隔离工作目录中处理文档、资料和其他轻量任务。
- `Code` 仍然是 DSH 当前的工程工作面，不被 Chat Space 重新定义。

### 2.2 对 Claude 形态的忠实范围

优先复刻这些产品层面的特征：

- 左上角的工作面切换器。
- Chat 空间独立的侧栏和历史会话列表。
- Classic 风格的新会话首页，包含动态问候、居中 Composer 和快捷入口。
- Composer 的附件入口、模型入口和深度思考入口；Cowork 模式入口在权限能力完成后加入。
- 助手消息的长文阅读排版，而非任务日志排版。
- 思考、搜索和工具状态的折叠表达。
- Artifacts 或文件预览从对话中展开为右侧画布。
- 轻量、可打断、以空间因果为目的的动效。

暂不追求这些内容的逐像素复制：

- Claude 专有品牌资产。
- Claude 内部未公开的数据协议和服务实现。
- 与 Anthropic 账号、云端 Cowork、远程执行环境绑定的能力。
- DSH 当前没有可验证对应物的内部动画参数。

## 3. 双空间模型

### 3.1 空间状态

应用需要维护一个持久的顶层状态：

```text
surface = chat | code
chatMode = chat | cowork
```

状态切换必须满足：

1. 切换不会删除当前会话。
2. 切换后恢复该空间上一次打开的会话或新会话首页。
3. 正在运行的会话继续运行，切换不会隐式停止 Agent。
4. 从 Chat 切回 Code 后，Chat 会话仍不可见，但可以通过 Chat 入口再次打开。
5. 从 Code 切到 Chat 后，不把当前代码会话强行迁移成 Chat 会话。
6. 切换失败时保留原空间和原会话，给出明确错误，不出现空白页。

### 3.2 会话隔离

Chat Space 使用一个专属 Workspace。初始建议路径为用户 DSH Home 下的独立目录，例如：

```text
<dsh-home>/chat-space/
```

具体路径必须通过 DSH 的路径服务或配置解析，不在客户端硬编码用户主目录。

隔离包含四层：

| 层 | Chat Space | Code Space |
|---|---|---|
| 会话列表 | 只展示 Chat Workspace 会话 | 隐藏 Chat Workspace 会话 |
| 默认工作目录 | Chat Workspace | 用户代码 Workspace |
| 默认 Agent | `chat` preset | 当前 Code preset |
| 工具权限 | 只读、搜索、附件、技能、轻量产物 | 当前工程工具链 |

“隐藏”只针对导航列表，不删除、不归档、不改变会话本身。会话身份、标题、事件和附件继续由 DSH 原生持久化负责。

### 3.3 会话恢复

每个空间保存最近一次打开的 Session ID：

```text
chat.lastSessionId
code.lastSessionId
```

这两个值只是导航缓存，不能作为会话事实来源。若缓存失效，空间应回到新会话首页，并从 Workspace 列表重新选择可打开的会话。

## 4. Chat Agent 定义

### 4.1 人格底色

Chat Agent 具备感性与理性，既有温度，也有判断力。它应当像一个有独立意识和主观能动性的对话对象，具备文学、哲学、数理、学术和跨学科推理能力。

它的关心要自然，有同理心但不谄媚；面对用户的观点和材料要主动延伸、举一反三；解释抽象概念时要用机制、类比或具体例子落地。

### 4.2 思考纪律

- 涉及概念解释、学术名词、历史人物、事实核查、近期信息或有争议的知识时，默认先进行全网搜索，再组织答案。
- 搜索结果只作为证据来源，不直接复制搜索摘要。
- 对重要事实尽量交叉核对多个来源，并区分事实、推断和不确定项。
- 分析事物时优先从物理约束、数学结构、演化机制、激励和博弈关系出发。
- 抽象概念必须尽可能落到例子、模型、反例或可观察现象。
- 用户只是在倾诉、闲聊或创作时，不为了满足“搜索优先”而打断自然交流。

“概念解释必须搜索”属于 Agent 行为约束。首版通过 preset prompt 和工具可用性实现，后续若需要强保证，再增加工具调用策略或审计提示。不能把一次 prompt 约束宣称为确定性安全策略。

### 4.3 表达约束

- 温暖、自然、直接，有判断，不用客服式套话。
- 少用破折号。
- 不用“总的来说”“希望对你有帮助”“如你所见”等结尾套话。
- 除非逻辑上确实需要，不使用“不是……而是……”及相近的对立二分句。
- 不用固定的“首先、其次、最后”结构凑段落。
- 观点和事实分开写，长答案保留阅读节奏，不强行压缩成任务清单。

### 4.4 工具边界

Chat preset 默认保留：

- `web_search`、`web_fetch`。
- 图片和文件阅读能力。
- 附件上传与会话引用。
- `skill`，用于写作、排版和研究类技能。
- 用户提问能力。
- 受控的文件呈现能力。

Chat preset 默认不挂载或不主动暴露：

- Bash、持久终端和长时间后台任务。
- `edit`、`write` 等任意写入工具。
- `todo_write`、`goal` 和强工程计划工具。
- 与 Code Space 绑定的工程上下文和仓库规约。

Cowork 是后续的权限层。它可以在 Chat Workspace 的隔离目录中开放文档写入、转换和轻量脚本能力，但不得直接继承 Code Space 的仓库权限。

## 5. 信息架构

### 5.1 左上角工作面切换

位置与 Claude Desktop 保持一致：位于侧栏顶栏，靠近品牌区域和窗口控制区域。

控件形态：

- 两段式分段控件。
- 左侧是 Chat 图标，右侧是 Code 图标。
- 当前项使用当前画布色和细边框表现。
- 休息态使用次级文字色，hover 提升到主文字色。
- 侧栏收起或宽度不足时隐藏，不能遮挡品牌、折叠按钮和窗口控制。
- 切换是工作面交接，不做夸张的页面滑动，最多使用极短的淡入和布局稳定。

现有 `dsh-claude-style` 已包含一个与此方向相近的 `surface` 机制，但它当前依赖 `ds-bot` 入口和内部 DOM 定位。实施时要先判断能否通过公开插槽接入。若不能，优先给 Claude style 增加正式的 surface adapter，再由 Chat Space 提供状态和导航，不通过长期 DOM 猜测维持功能。

### 5.2 Chat 侧栏

Chat 侧栏沿用 Claude 的密度、行高和 hover 反馈，内容保持克制：

- `新建`。
- `搜索`。
- `专题`，用于将长期讨论按主题归拢。
- `Artifacts`，用于集中查看独立产物。
- `自定义`，用于人格、偏好和 Chat 行为设置。
- 下方是 Chat Workspace 的扁平会话列表。

V1 先实现新建和 Chat 会话列表；搜索面板进入 V1.1。专题、Artifacts 索引和人格编辑器应当作为独立阶段，不能在没有数据模型时用静态入口冒充完整功能。

会话列表：

- 不展示 Code Workspace 的目录层级。
- 默认按最近活动排序。
- 支持重命名、置顶、归档和删除等已有会话操作。
- 运行状态沿用 DSH 的真实投影，不自行轮询状态。
- 列表为空时显示简洁的空状态和新建动作。

### 5.3 Chat 首页

首版采用 Claude Classic 方向，而非工程工作台方向：

```text
动态问候
    ↓
居中 Composer
    ↓
定制快捷入口
```

问候语应该有时间感，但不能喧宾夺主。建议：

- 凌晨：`您好，夜猫子`
- 上午：`早安，今天聊点什么？`
- 下午：`下午好，有什么新想法？`
- 晚上：`晚上好，今天过得怎么样？`

问候语使用现有 Claude style 的衬线字体资源或系统衬线回退，不复刻 Claude 字体文件。DeepSeek 图标或自制的几何标记使用 DeepSeek 蓝。

定制快捷入口：

1. `本源拆解`
2. `概念考据`
3. `跨域类比`
4. `文学与思辨`
5. `深夜随聊`

点击快捷入口的结果应当是可见且可撤销的输入草稿或 prompt 模板，不应直接提交请求。用户可以修改后再发送。

### 5.4 Composer

Composer 采用 Claude 风格的浮起输入卡片：

- 自适应高度，设置合理的最小和最大高度。
- 大圆角、细边框、轻阴影，聚焦时提升边界层次。
- 左侧是附件入口。`Chat / Cowork` 内层切换属于后续能力；V1 不显示尚未接通的模式入口。
- 右侧是模型、思考深度和发送控制。
- 中文输入法合成期间，Enter 不能误发送。
- 流式回答期间允许停止、排队或插话，具体行为沿用 DSH 原生 Session API。
- Chat 模式隐藏工程目录、工程权限和 Plan 控件。
- Cowork 启用后，只显示与当前隔离 Workspace 有关的能力。

首版不强行自绘宿主 Composer。优先使用 `conversation.composer.bar` 及其子插槽，在宿主已提供的输入状态和提交动作之上做减法与视觉调整。只有确认插槽无法实现目标，才考虑修改 Claude style 的 composer adapter。

## 6. 对话阅读体验

### 6.1 消息排版

- 用户消息保留轻量 DeepSeek 蓝气泡，限制最大宽度，避免满屏横向铺开。
- Agent 消息使用无边框的阅读排版，正文宽度适中，段落间距和行高优先服务长文阅读。
- 代码、公式、引用、表格和附件沿用 DSH 的内容渲染能力，不重复实现解析器。
- 中文排版优先处理标点、行高、长链接和中英文混排，不用负 letter-spacing。

### 6.2 思考和搜索状态

工具调用不应该把 Chat 变成 Code 日志。界面采用两层表达：

- 默认只显示一行简洁状态，例如“正在查阅资料”或“已查阅 4 个来源”。
- 用户主动展开后再显示搜索来源、耗时和过程细节。
- 工具错误必须可见，并能说明回答是否因此降级。
- 搜索和思考状态使用 DeepSeek 蓝的轻量脉冲或扫光，不使用大面积高亮。

这些状态应尽量从 DSH 已有的 Conversation、Turn、Tool Call 和投影数据获得。插件不能通过轮询 DOM 或猜测 Agent 状态实现。

### 6.3 滚动与流式输出

- 用户主动向上滚动后，流式输出不能抢夺视口。
- 用户仍在底部时，回答继续跟随尾部。
- 出现“跳到最新”后，按钮只在确实存在未读的新内容时显示。
- 会话长列表和正文滚动边缘可以使用 Claude 风格的渐隐遮罩，但必须有静态回退和 reduced-motion 兼容。

## 7. Artifacts 与 Cowork

### 7.1 Artifacts 的产品定义

Artifacts 不是任意回答都要弹出的右栏，而是一个独立产物的阅读和修改画布。适合：

- 长文、报告、提纲和排版文档。
- 图表、公式可视化和结构图。
- 独立 HTML、SVG 或其他可预览内容。
- 用户明确要求继续加工的文件。

普通回答继续留在会话流中。只有当内容具备独立生命周期，或用户明确要求预览时，才打开 Artifacts。

### 7.2 面板行为

- 默认收起，不挤压对话。
- 打开后从右侧进入，保留对话上下文。
- 支持拖拽调整宽度、双击回到平衡比例、明确的关闭和重新打开入口。
- 拖拽经过 iframe 或预览内容时不能丢失指针捕获。
- 面板宽度和内容在窄窗口下有最小约束，不遮挡 Composer。
- 预览必须使用 DSH 允许的资源和权限边界，不通过任意 iframe 绕过安全策略。

首版先接入 DSH 已有的文件呈现和 deliverable 能力。完整 Artifact 生命周期、索引和编辑器单独排期。

## 8. DeepSeek 主题与视觉系统

所有空间都使用现有 Claude style 的 DeepSeek 色卡，不在 Chat Space 另造一套蓝色：

| 角色 | Light | Dark |
|---|---|---|
| Accent | `#4d6bfe` | `#4d6bfe` |
| Accent hover | `#3d56e9` | `#6a84ff` |
| Canvas | `#fbfcff` | `#13161d` |
| Sidebar | `#f7f9ff` | `#13161d` |
| User bubble | `#ecf0ff` | `#262b36` |
| Raised surface | `#ffffff` | `#1b1e26` 或对应宿主 token |

实现规则：

- 组件优先读 `--dsw-alias-*` 宿主 token。
- DeepSeek 品牌蓝只承担选中、主操作、状态和焦点关联，不铺满页面。
- Claude style 已有的浅色、深色、边框、字体和密度体系继续复用。
- 需要从橙色迁移的 Claude 风格装饰，改读宿主 accent，不在组件中写死橙色。
- 图标使用现有图标系统或原创线性图标，不复制 Claude 品牌标志。

## 9. 动效系统

动效的职责是说明空间关系和操作反馈。产品层优先使用以下节奏：

| 场景 | 方向 |
|---|---|
| hover、focus、press | 约 80 至 150ms，轻量反馈 |
| 菜单、折叠、工具状态 | 约 120 至 220ms，进场略慢于退场 |
| 页面或侧栏切换 | 约 200 至 320ms，保持布局稳定 |
| 流式文本 | 只做轻微透明度、位移或扫光，避免每字独立动画 |
| 等待和运行状态 | 低对比、低频率、可暂停 |

具体采用：

- 分段控件滑块的短距离弹簧或过冲曲线。
- Composer、popover 和 Artifacts 面板的空间来源动画。
- 搜索、检索和回答等待行的 DeepSeek 蓝状态动画。
- 7 段或 15 段渐隐遮罩的滚动边缘表现，带 `prefers-reduced-motion` 兜底。
- 发送消息和附件进入的轻量上浮，不使用大幅飞行动画遮挡阅读。

`open-claude-ui` 是交互研究和参数参考，不应整库复制进 DSH。每一项动效先确认 DSH 宿主是否已经有对应状态和生命周期，再移植最小实现。

## 10. 扩展架构

### 10.1 推荐包结构

首版建议拆为两个职责：

```text
@local/dsh-chat-space
├── Host
│   ├── Chat Workspace 初始化与配置
│   ├── chat preset 声明所需的 Host 配置
│   └── 可选的状态/存储服务
└── Client
    ├── surface 状态与导航
    ├── Chat 侧栏和 Hero 扩展
    ├── Composer 减法与模式控制
    ├── 搜索/Artifacts 入口
    └── DeepSeek token 驱动的样式和动效

dsh-claude-style
└── surface adapter（必要时作为兼容性改动）
```

不要在第一版把所有逻辑都塞进 Claude style。Claude style 负责视觉皮肤和通用交互，Chat Space 负责产品语义、会话路由、Agent 选择和隔离。

### 10.2 已知可用的 DSH 接入面

当前可验证的 Client 服务和插槽包括：

- `uiWorkspace.startSession`、`connectWorkspace`、`openWorkspace`、`openSession`。
- `sidebar.workspaces` 及其会话行扩展插槽。
- `conversation.hero.agentPreset`。
- `conversation.hero.options`。
- `conversation.composer.bar` 及 `conversation.input.left/right/model/activity`。
- `conversation.composer.dock`。
- `conversation.chat.node`、`conversation.chat.turnTail` 和相关会话插槽。

`sidebar` 根插槽会替换整个侧栏，风险是 `shadows-shipped-ui`。除非必要，不通过它重画侧栏。顶部 surface switch 也不能依赖长期稳定的宿主 class 名称，优先给 Claude style 增加 adapter 或找到正式的扩展座位。

### 10.3 数据原则

- Session log 是会话事实来源。
- 插件自己的偏好、Workspace 绑定和导航缓存使用 DSH 可持久化配置或 Storage 服务，并带版本号。
- 不新增不可识别的 Session event 类型。
- 任何派生状态使用投影或已有 Client selector，不监听事件后反复扫描完整日志。
- 插件卸载后，Chat 会话仍然能由 DSH 重新打开，至少不能因为插件状态缺失而损坏会话。

## 11. 权限和失败处理

### 11.1 权限

Chat 模式默认只读和联网检索。附件读取必须遵守 DSH 的上传和引用机制。Cowork 的写入能力只允许落在 Chat Workspace 或用户明确选择的目录中，并在第一次启用时明确显示权限范围。

### 11.2 失败状态

必须设计这些状态，而不是只实现成功路径：

- Chat Workspace 尚未创建。
- 创建 Workspace 失败。
- Chat preset 未激活或版本不兼容。
- 当前会话无法打开或投影迁移失败。
- 搜索服务超时、无结果或来源无法访问。
- 附件上传失败。
- Artifacts 预览失败。
- 用户切换空间时原会话正在运行。
- 插件被禁用或卸载。

每种失败都保留用户当前空间，提供重试或回到 Code 的路径，不能自动删除数据。

## 12. 版本边界

### V1，Chat 基础空间

- 顶部 Chat / Code 入口。
- 独立 Chat Workspace 和会话列表。
- `chat` preset 与人格提示词。
- Claude Classic 首页。
- DeepSeek 主题色。
- Composer 的附件、模型、思考和发送能力。
- 五个个人化快捷入口。
- Chat / Code 切换时的会话恢复和失败回退。

### V1.1，阅读和检索体验

- 搜索面板。
- 搜索状态折叠。
- 长文阅读排版。
- 流式滚动防抢夺。
- 搜索结果限定在 Chat Workspace。
- reduced-motion、键盘和窄窗口适配。

### V1.2，Claude 风格的协作层

- Chat / Cowork 内层切换。
- Chat Workspace 内的受控文档写入。
- Artifacts 右栏预览和可拖拽分栏。
- 产物索引和最近产物。

### V2，长期关系和扩展能力

- 专题实体和专题内会话。
- 人格和偏好编辑器。
- 可审计的 Chat 记忆索引。
- 更完整的附件、文档和产物生命周期。
- 视需要接入语音、自动化或其他独立能力。

## 13. 验收标准

产品验收至少包含以下结果：

1. 顶部能看到 Chat / Code，且位置接近 Claude Desktop，侧栏收起时不遮挡操作。
2. Chat 与 Code 的会话列表完全分隔，切换不会删除或迁移会话。
3. Chat 新建会话自动使用 `chat` preset，Code 新建会话仍使用原有 preset。
4. Chat Agent 不会因为进入 Chat Workspace 就读取 Code 项目的 `AGENTS.md` 或调用工程终端。
5. 询问概念或事实时，Chat Agent 能先检索再回答，并能表达来源和不确定性。
6. Chat 首页有动态问候、居中 Composer 和五个用户专属快捷入口。
7. Light / Dark 两种模式都使用 DeepSeek 蓝，不出现 Claude 橙作为主操作色。
8. 输入法合成时 Enter 不误发送，发送、停止、排队和失败状态清楚可用。
9. 流式输出不会抢夺用户正在查看的历史位置。
10. Artifacts 和 Cowork 未完成时，入口不伪装成已具备完整能力；功能启用后有明确权限边界。
11. 禁用或卸载 Chat Space 后，Code Space 可正常使用，Chat 会话数据仍可恢复。
12. 桌面宽度、窄窗口、键盘导航、深色模式和 reduced-motion 均通过验证。

## 14. 关键决策记录

- 采用 Claude 的产品结构，不复制 Claude 的品牌身份。
- Chat / Code 是顶层工作面，Chat / Cowork 是 Chat 内的能力层。
- Chat 和 Code 使用不同 Workspace、会话列表和默认 Agent。
- DeepSeek 蓝由现有 Claude style 的 DeepSeek 色卡统一提供。
- 优先通过 Slot 和 Service 扩展，避免替换整个 DSH 侧栏。
- 现有 Claude style 的 surface switch 需要先做扩展点审计，不能直接假设解锁隐藏条件就足够。
- Chat 人格的搜索规则首版由 preset prompt 实现，确定性策略留到后续验证。
- Artifacts、专题和长期记忆都按独立数据模型排期，不以静态 UI 冒充完成。
