# 对话空间 交付记录 1

> 对应方案：[`chat-space-proposal.md`](chat-space-proposal.md)
> 对应计划：[`chat-space-execution-plan.md`](chat-space-execution-plan.md)
> 日期：2026-11-06
> 版本：`@local/dsh-chat-space` 0.1.0

## 1. 这次交付了什么

在现有 Profile 里装了一个 Bundle 插件，包含两块：

| 组件 | 位置 | 作用 |
|---|---|---|
| `@local/dsh-chat-space` | [`/Users/veko/work/dsh-plugins/dsh-chat-space`](</Users/veko/work/dsh-plugins/dsh-chat-space>) | Client 侧的空间切换器、对话起点胶囊、DeepSeek 强调色；Host 侧预建对话目录与工作区 |
| `preset-chat` | 同一 bundle 的 patch | 独立的对话 Agent，带人格提示词，只留检索/阅读/技能类工具 |

### 1.1 空间切换器

侧栏品牌行渲染为 `🐋 deepseek [💬][</>]` 两段式控件，位座是 `sidebar.brand.name`。选中项用 DeepSeek 蓝 `#4d6bfe`（暗色 `#8ea2ff`），带细边与轻阴影；过渡 120ms，`prefers-reduced-motion` 下关闭。

切换逻辑：

- 点「对话」：在上一次所在的编程会话记下来，然后解析 `~/.dsh/chat-space`、注册为工作区、在该工作区开一个 `chat` preset 的空会话。
- 点「代码」：把当前对话会话记到本地，回到之前的编程会话；记录失效时退回新的空白会话。
- 失败时保持原空间并回退选中态，控件右侧出现一个可 hover 看原因的红色感叹点。
- 上次停在对话空间时，重载后会直接回到那个会话。

所有点击都阻止冒泡，品牌行本身的「点品牌开新会话」行为不受影响。

### 1.2 对话 Agent

`preset-chat` 的 `id` 是 `chat`，名字「对话」，排在预设列表第 5 位。

挂载：persona（完整替换系统提示词）、time-context、tool-web（含 fetch）、tool-fs（只读 + 读图）、skill-filesystem、tool-skill、tool-ask-user、present、compaction 组。

不挂载：bash、终端、jobs、todo、goal、plan-mode、agent-instructions、subagent。也就是说，对话空间里的 Agent 拿不到写文件、跑命令和读工程 `AGENTS.md` 的能力。

人格提示词写进了 patch，覆盖你定义的四层：底色（温度 + 独立判断）、相处（温暖不谄媚、举一反三）、思考（概念先检索、从底层机制推、抽象落类比）、表达（少破折号、禁套话收尾、禁对立二分句式）。

### 1.3 对话起点胶囊

输入框下方渲染五个胶囊：本源拆解、概念考据、跨域类比、文学与思辨、深夜随聊。位座是 `conversation.composer.dock`，只在对话空间且会话为空时显示。

点击把对应的引导前缀填进草稿，用 `whenDraftExists: 'replace'`，不直接发送。

### 1.4 主题

所有空间把宿主 accent 令牌指到 DeepSeek 蓝：`--dsw-alias-brand-primary`、主按钮填充与 hover、`state-business-primary`。浅色 `#4d6bfe`／`#3d56e9`，暗色 hover `#6a84ff`。对话空间的组件只读 `--dsw-alias-*`，不写死橙色。

## 2. 已经验证到的

| 项 | 证据 |
|---|---|
| Bundle 安装 | `plugin_manager install_bundle` 返回 `application: applied`，`warnings: []` |
| 两条 row 激活 | `list_plugins` 中 `include:dsh-chat-space` 与 `include:preset-chat` 都是 `fiberPhase: active` |
| 宿主侧 preset 生效 | `preset-chat` 挂在 `@deepseek-ai/dsh-agent-preset` 上正常激活，子插件缺包或 schema 不符会激活失败 |
| Client 模块已加载 | 截屏确认品牌行出现 `[💬][</>]`，`</>` 为选中态（DeepSeek 蓝） |
| Client 逻辑 | `node scripts/smoke.mjs` 15 项断言通过：工厂注册、两个位座注册、样式注入、body 属性、代码态不导航、进对话态创建 `~/.dsh/chat-space` 工作区并以 `chat` preset 开会话 |
| 语法 | `node --check client.js` / `index.js` 通过；`package.json`、两份 locale、patch YAML 解析通过 |

冒烟测试是桩环境执行的，验证的是「代码路径不抛错、调用参数正确」，不等于浏览器里点击成功。

## 3. 排查记录：点击为什么没反应

用户两次反馈「点击没有反应」。靠一个独立 Web 实例（`DSH_HOME=/tmp/dsh-insp dsh web --port 0`）配合浏览器自动化才拿到真实原因，之前按截图推测错了三次。依次是四层问题：

| 层 | 现象 | 根因 | 修法 |
|---|---|---|---|
| 1 | 桌面点了没反应，控件上也没有错误标记 | 处理函数一次都没执行 | 先按「点击没投递」排查 |
| 2 | 切到 `sidebar.brand.name` 后控制台无任何注册告警，但控件不渲染 | `ctx.get('slots')` 拿不到服务；模板要求声明 `inject` | 声明 `inject: ['slots', 'uiWorkspace', 'workspaces', 'sessions']`，改用 `ctx.<service>` |
| 3 | 切换报 `cannot get property "remote" without inject` | 直接读了 `ctx.remote.$host` | 去掉该依赖，不再从 remote 取路径 |
| 4 | 报 `directory-picker/unavailable: ... serves "native"` | 桌面 profile 的目录选择器是原生实现，不支持 `listDirectory` 浏览 | 完全不碰目录：从 `workspaces.list` 快照里找标题「对话空间」的工作区，再 `openWorkspace(id, …, { agentPreset: 'chat' })` |
| 5 | 起点胶囊不显示 | 实际挂载的插槽是 `conversation.input.dock`，目录里写的是 `conversation.composer.dock` | 两个名字都注册，只渲染一次 |
| 6 | 胶囊渲染时 React 报 #310 | 在早期 `return null` 之后才调用 `useSession`，两次渲染的 hook 数量不一致 | 所有 hook 移到提前 return 之前 |

另外两处桌面特有的隐患已加固：品牌行是 macOS 窗口拖拽区，控件全节点加 `-webkit-app-region: no-drag`；同时在 `document` 捕获阶段接管 `.dsh-cs-option` 的点击（含按坐标命中兜底），绕过拖拽区和宿主行事件竞争。`Cmd+Shift+O` 可直接切换空间。

隔离实例上的验证结果（真实指针点击，非脚本调用）：

| 步骤 | 结果 |
|---|---|
| 初始 | `data-dsh-chat-space="code"`，无胶囊 |
| 点「💬」 | `surface=chat`，工作区打开，五个胶囊出现，无报错 |
| 点「本源拆解」 | 草稿填入引导语，未自动发送 |
| 点「</>」 | `surface=code`，胶囊消失 |
| 控制台 | 零 error、零 pageerror |

桌面侧还剩最后一步：页面重载后点一次「💬」确认。宿主侧 `~/.dsh/chat-space` 与标题「对话空间」的工作区已在重启时建好。

点完之后可核对：

```bash
ls -la ~/.dsh/chat-space
ls -t ~/.dsh/sessions | head
```

第一条出现目录、第二条出现 `--Users-veko-.dsh-chat-space--` 之类的会话目录，就说明工作区与 `chat` preset 都真的落地了。

## 4. 这次没做的，以及为什么

| 事项 | 状态 | 原因 |
|---|---|---|
| 会话列表双向过滤 | 未做 | `sidebar.workspaces` 只能整块替换，替换就要重写宿主的工作区浏览逻辑；当前只做到「记录分在不同工作区」，Code 侧仍能看到「对话空间」这一组 |
| 首页动态问候 + 蓝色星标 | 未做 | 问候文案由宿主渲染，没有对应位座；替换 `conversation.hero.brand.mark` 会覆盖 Claude skin 自己的品牌标记 |
| 对话流阅读排版 | 未做 | 需要改消息渲染或新增 Chat node，属于 P6 范围 |
| 搜索面板限定对话空间 | 未做 | 宿主搜索接口没有工作区过滤参数，只能二次过滤，会碰到「日志不进浏览器」的红线 |
| Artifacts 右栏 | 未做 | 依赖宿主 deliverable 能力和右侧栏插槽核对 |
| Cowork 内层切换 | 未做 | 需要动态切 preset 或工具限制的稳定 API，没有就不放按钮 |

## 5. 装卸与回滚

```bash
# 停用（保留数据）
# 设置 → 插件，关闭「对话空间」

# 卸载
# 设置 → 插件 → 卸载 @local/dsh-chat-space
```

卸载或停用不会删除 `~/.dsh/chat-space`，也不会动已有会话；重新启用后按本地记录的会话继续。

源码改动后需要重载页面才生效；Host 半的改动（预建目录）要重启应用。

## 6. 下一步

按计划顺序，接下来是 P6：对话流阅读排版、搜索状态折叠、流式滚动防抢夺；以及把列表隔离从「分在工作区」升级成真正的双向过滤。这两项都需要先确认宿主 `ui-workspace` 是否暴露可过滤的会话源。

---

# 交付记录 2：整面接管（v0.2.0）

## 这次补上的形态

上一版只有“切换开关 + 五个胶囊”，界面骨架没变，这是判断失误。这一版改成 **surface takeover**：进入对话空间时接管 Claude skin 已经画好的外壳，而不是往里面贴小部件。

| 区域 | 对话空间 | 编程空间 |
|---|---|---|
| 侧栏导航 | 只留「新建」「搜索」；隐藏插件、自动化任务、更多 | 全部恢复 |
| 侧栏列表 | 隐藏全部工作区文件夹，扁平显示对话会话 | 恢复文件夹树，隐藏「对话空间」目录与其中的会话 |
| 区块标题 | 「对话」 | 「工作区」 |
| 首页 | 居中衬线问候 + DeepSeek 蓝色星芒 + 高卡片输入框（占位文案「今天我能为您做些什么？」） | Studio 面板与工程控件照旧 |
| 输入卡 | 单张 20px 圆角卡片，内含输入区 + `[对话｜Cowork]` + `+` + 模型/算力；隐藏权限、Plan、活动统计 | 原样 |
| 顶栏 | 隐藏「对话 / 轨迹」切换与「标准模式」标签 | 原样 |
| 吉祥物 / 涟漪画布 | 隐藏，避免遮挡问候 | 保留 |

切换器改成 **浮层定位**：`dsh-claude-style-compat` 在设置了自定义文字标志后会把品牌行的所有子元素 `display:none`，槽位里的控件会被一起隐藏。现在控件挂在 `shell.overlay`，按品牌行的实际位置测量摆放，并避开折叠态。

## 验证方式

用 `DSH_HOME=/tmp/dsh-insp2 dsh web` 起了一个**和你本机同配置**的副本实例（同样装了 dsh-claude-style、claude-style-compat、icon-system，并同步了 desktop profile 的 patch：DeepSeek 色卡、studio 首页、自定义文字标志），再用浏览器自动化逐项操作验证：

| 步骤 | 结果 |
|---|---|
| 代码态初始 | 标题「工作区」、三个面板行可见、2 个文件夹、无问候语 |
| 点「💬」 | 问候语出现（`早安，今天聊点什么？`）、文件夹隐藏、只剩「搜索」、只剩对话会话 |
| 发送消息 | 问候语自动消失，进入阅读流；权限与视图切换保持隐藏 |
| 点「</>」 | 标题回到「工作区」、面板行与文件夹全部恢复、问候语移除、剩余隐藏标记仅对话会话 |

真实桌面窗口也确认了：切换器已出现、对话会话与代码仓库分离、侧栏文案已替换。最后一次加载仍是修复前的旧代码（区块标题卡在「对话」），重载页面即可拿到当前版本。

## 仍然没做的

- **专题 / Artifacts / 自定义三个入口**：没有后端实体，放上去就是死链，暂时不画。Artifacts 目前依赖宿主右侧栏的文件预览。
- **Artifacts 独立画布**：还没做固定右栏与拖拽分栏。
- **Cowork 的产物呈现**：preset 已注册（`cowork`，可写文件），但产物还没接到右侧预览。
- **工具卡片的进一步定制**：思考过程、`网页搜索 / 网页获取` 行、`调用 N 次工具` 滚动数字这些已由 dsh-claude-style 呈现，形态接近 Claude；没有另做一套。

## 交付记录 3：团队泄漏与预设落位

### 团队为什么进了对话

`@deepseek-ai/dsh-experimental-tool-agent-team` 是 profile 级挂载的，它在每个 Agent 的 scope 里做三件事：

1. 注册 `team:policy` 提示词段；
2. 注册 `team:identity` 上下文，内容是 `You are the Team Lead named "lead"`；
3. 注册 `spawn_teammate / send_message / list_agents / wait_agent / team_task_*` 全套工具。

所以任何会话（包括对话空间）的 Agent 都会认为自己是 Lead、手上有队友和任务看板 —— 这就是截图里“你可以叫我 lead”的来源。

试过的做法：把 `tool-agent-team` 从全局关掉、挂进 `preset-standard`。结果 preset 内解析不到 `agentTeams` 服务，会话创建直接失败（`agent-preset/invalid: tool-agent-team: waiting for agentTeams`），已回退。

采用的做法：

- **人格层明确否认**：对话 persona 增加一段“这里只有你和用户两个人，没有团队、没有队友、没有任务看板，不要自称 Lead 或任何头衔”。实测回复里已不再出现 Lead / 团队 / 派活。
- **客户端隐藏团队 UI**：对话空间下隐藏 `conversation.session.header.actions`（团队与「标准模式」标签都在这个座位里），同时隐藏每轮 token 用量行。

### 修正的两个真实 bug

1. **进入对话空间会落在旧会话上**：`openWorkspace` 被宿主的启动恢复抢占（superseded），导航没有生效，输入框还在编程会话里。现在导航后读取 `[data-conversation-session]` 确认落点，未落在对话工作区就重试，最多四次。
2. **会话 preset 仍是 standard**：工作区里已有的空白会话会保留它创建时的 preset，`openWorkspace` 复用它就把 preset 一起继承了。现在改为 `uiWorkspace.startSession(workspaceId, { agentPreset })` 明确指定 preset，并轮询确认打开的是对话工作区里的会话。

### 验证边界

副本实例用的是 shipped `web` profile，它里面注册了 `chat` / `cowork` 两个 preset（preset 选择器里能看到「对话」「有温度的智囊」），但创建出来的会话 header 仍记录 `standard`，说明该 profile 下 preset 激活失败并静默回退。真机 desktop profile 的对话会话 header 里是 `chat`（另有 `cowork`），说明真机路径是通的。这两条差异没法在副本里消除，最终以真机点击结果为准。

## 交付记录 4：鲸鱼标志、切换闪屏与细节打磨（v0.2.2）

- **首页标志换成鲸鱼**：不再手绘星芒，直接克隆侧栏 `sidebar.brand.mark` 里那枚 `<svg>`（viewBox `0 0 23.16 17.04`），所以和侧栏鲸鱼完全同源、同 `currentColor`、同主题色。侧栏换图后首页自动跟随。
- **对话 / Cowork 切换不再闪**：原来直接调 `openWorkspace` 会复用空白会话，且切换瞬间整块视图重建。现在切换走 `enterChat` 的同一条导航（`startSession` 带 preset），并加一层 320ms 的淡出过渡（`data-dsh-cs-switching`），到点自动清除，不会因为导航慢而把界面一直压暗。
- **切换失败要说出来**：如果导航结束后主视图会话没变，模式恢复到原值并显示「切换失败」，不让按钮状态和实际会话脱节。
- **列表与输入卡细节**：对话列表隐藏相对时间（Claude 的对话列表不显示时间）；发送按钮改成 30px 圆形，有内容时填 DeepSeek 蓝；输入区背景压平，卡片只剩一层外框。

### 仍未做（功能面）

- 专题、Artifacts、自定义三个入口：没有后端实体，没有画。
- Artifacts 独立右栏（固定画布 + 拖拽分栏）。
- Cowork 产物落到右栏预览。
- 消息级操作（重新生成、编辑后重发）与「跳到最新」：依赖宿主现有能力，尚未在对话面单独收敛样式。

## 交付记录 5：专题 / Artifacts / 自定义（v0.3.0）

三个入口都做成了实际可用的功能，不是占位。

### 专题

- 对话空间侧栏新增「专题」行，点开是专题列表：「全部对话」+ 各专题（带条数）。
- 新建专题用面板内的行内输入框（不是系统弹窗），回车提交、Esc 取消。
- 「把当前对话加入这个专题 / 从专题移除当前对话」直接操作当前打开的那条会话。
- 选中专题后，对话列表只显示该专题里的会话；选「全部对话」恢复。
- 数据存在浏览器 localStorage（`dsh-chat-space.v1.topics`），跟会话本身无关，卸载插件不丢，换机器不跟随。

### Artifacts

- 读取每个对话会话日志里的 `deliverables/presented` 事件（`files: [{path, description}]`），汇总成产物列表。
- 侧栏「Artifacts」行右侧显示数量；点开是右侧抽屉，列出文件名 + 交付描述，按时间倒序、同一会话同一路径去重。
- 点条目会打开交付它的那条会话。
- 扫描范围是对话空间工作区最近 20 个会话的已加载窗口；没有产物时显示空状态说明。
- 验证：在对话里让它建一个 `note.md` 并 `present`，抽屉里出现一条「note.md / 内容为 hello 的 note.md 文件」。

### 自定义

- 点击后走宿主已有的设置入口（依次尝试 settings.launcher / settings.trigger / 页脚账户菜单），打开应用设置面板。找不到入口时显示失败提示，不静默。

### 顺手修的两个真 bug

1. **导航面板把整个接管打挂**：`Array.find` 找不到时返回 `undefined`，守卫只判了 `!== null`，于是读 `undefined.sessionIds` 抛错，整轮 sync 中断，导致侧栏与首页都不出现。已改为同时判 `undefined`。
2. **面板重绘导致点击被吞**：专题面板每次同步都重写 `innerHTML`，光标下的按钮被反复卸载重建，表现为闪烁且点不中。现在按内容签名比对，内容没变就不重绘。

## 交付记录 6：入口位置与轨道态（v0.3.1）

截图里的问题成立：三个入口被插到了会话列表**下方**，因为我把它们挂进了 `region-area`（那是一个先渲染列表再排后续块的容器），于是落到列表尾部；展开的专题面板也跟着掉到底部，和账户行挤在一起。

修法：

- 入口行改为插在宿主自己的 `panel-list`（新建 / 搜索 所在的那一列）**之后、会话区之前**，顺序变成：新建 → 搜索 → 专题 → Artifacts → 设置 → 对话（会话列表）。
- 专题面板紧跟入口行展开，缩进 30px 作为二级层次；不再出现在底部。
- 「自定义」改名「设置」，因为点击后打开的就是应用设置面板，叫自定义名不副实。
- 侧栏收成图标轨道时，整块入口隐藏（原来会被挤成竖排文字）。

同时修了第三个同类空值 bug：`Array.prototype.find` 找不到返回 `undefined`，而守卫只写了 `!== null`，读 `undefined.textContent` 抛错，整轮同步中断，入口直接不出现。这一轮把所有 `find()` 的守卫统一成同时判 `null` 和 `undefined`。

验证（副本实例）：宽窗口下入口位于 搜索 与 对话 之间（y=146，区块头 y=305）；展开面板紧贴在入口下方（y=248）；轨道态下入口数量为 0；回到宽屏恢复为 1。

## 交付记录 7：设置并入系统设置、点击失效（v0.3.3）

### 设置搬进系统设置

侧栏不再有「设置」行。改为在系统设置面板（左下角账户 → 设置 → 通用设置）里加一行：

```
对话空间
专题管理与显示偏好            [管理]
```

点「管理」打开我们自己的弹窗，里面是专题管理（列表 / 加入或移出当前对话 / 删除 / 新建）、显示开关（对话列表是否显示相对时间）、数据说明。

尝试过的做法与结论：先把页面注册进 `settings.section`，安装回调确实执行了，但这一版设置面板不会为外部插件渲染自定义页（导航里只出现内置的通用/模型/内置插件/Agent 预设）。所以改用 `settings.general.item` 一行 + 自建弹窗。

弹窗用 ReactDOM portal 挂到 `body`：设置面板自带层叠上下文，直接挂在 overlay 里会被压在设置面板下面（实测 `elementFromPoint` 命中的是设置面板标题）。

### 点击没反应

两个原因叠加：

1. 上一轮那个 `Array.find` 返回 `undefined` 只判 `null` 的问题，会让整轮同步抛错——入口行可能画出来但点击后没有任何后续。
2. 专题面板每次同步都重写 `innerHTML`，光标下的按钮被反复卸载，点击在 mousedown/up 之间丢失。

修法：所有 `find()` 守卫同时判 `undefined`；面板按内容签名比对，内容没变不重绘；入口点击改为在容器上做事件委托，即使按钮节点被替换，事件仍按选择器命中。

### 验证（副本实例）

- 侧栏顺序：新建 → 搜索 → 专题 → Artifacts →（展开的专题面板）→ 对话列表。
- 点「专题」：面板出现（`.dsh-cs-topics` 计数 1）；点「Artifacts」：右侧抽屉打开，计数徽标显示 1 条真实交付物。
- 系统设置里出现「对话空间」行；点「管理」后弹窗在设置面板之上（最上层命中 `.dsh-cs-modal-mask`），内容含专题输入、显示开关、数据说明。

## 交付记录 8：点击激活改到 pointerdown（v0.3.4）

侧栏是 React 管理的容器，我们注入的入口行在宿主重渲染时可能被移除再挂回；按 `click` 激活会丢在按下与抬起之间。改为：

- 在 `document` 捕获阶段监听 `pointerdown`，命中 `[data-cs-nav]` 即执行；`click` 只保留给键盘触发（同一动作 700ms 内不重复）。
- 每个入口动作都给一条 1.3 秒的短提示（底部居中胶囊）：专题面板已打开 / 已收起、Artifacts 已打开。这条提示同时是诊断信号——看到提示说明事件到达，看不到说明事件没到。

验证（副本实例，真实鼠标事件 `page.mouse.click`）：点专题 → `topicsOpen=true` 且面板节点出现；点 Artifacts → 抽屉打开、提示出现、列表读到 1 条交付物。

## 交付记录 9：专题交互重做（v0.4.0）

原来的专题面板是"表单式"的：展开后是一串长句按钮（「＋ 新建专题并加入当前对话」「把当前对话加入这个专题」），而且新建必须先打开一个对话，路径绕。现在改成列表式：

- **专题行右侧**：悬停出现 `＋`，点它直接在下方展开一个单行输入（输入名称 → 回车/确定）。
- **展开后的列表**：`全部对话` + 各专题（`名称 · 条数`），点一行即筛选；当前筛选项加粗。
- **加入/移出**：每条专题行悬停出现 `＋`（加入当前对话）或 `✓`（已在其中，点一下移出）。没有打开的对话时这个按钮不出现。
- **新建不再强制绑定对话**：没有打开的对话也能建专题，只是空的。

顺手去掉了点击后的「已打开 / 已收起」提示条：状态由界面本身表达，弹一句"面板已打开"属于噪音。

验证（副本实例）：点专题行 `＋` → 出现输入框；输入并回车 → 专题出现在列表并带条数；点专题 → 列表从 6 条筛到 1 条；点「全部对话」恢复 6 条。

## 交付记录 10：撤掉专题（v0.5.0）

专题这个功能是我加坏的：它把"当前筛选项"写进 localStorage 并据此过滤会话列表，一旦筛选生效，其他对话就从侧栏消失——看起来就是"对话历史都看不到了"。

按你的要求整套撤掉：

- 侧栏只剩「Artifacts」一个自建入口；专题行、专题面板、新建输入、加入/移出按钮、相关样式全部删除。
- 会话列表恢复为"对话空间工作区的全部会话"，不再有任何自建筛选。
- 旧版本留在 localStorage 里的 `topics / activeTopic / topicsOpen` 在加载时显式删除，所以已经中招的机器重载后自动恢复，不需要手动清缓存。
- 系统设置里的「对话空间 → 管理」页简化为：显示开关（对话列表是否显示相对时间）+ 数据说明。

验证（副本实例，特意写入了带筛选的旧状态后再重载）：导航行只有 Artifacts；专题节点 0 个；存储里 `topics/activeTopic` 已不存在；会话列表 6 条全部可见；Artifacts 抽屉仍可打开、仍读到 1 条交付物。

## 交付记录 11：去重误删切换器（v0.5.2）

0.5.1 的"去重清扫"把 `.dsh-cs-switch` 也列进了要清理的选择器，但这枚切换器是 React 渲染在 overlay 座位里的、不属于本模块 DOM 自建的节点集合——于是每轮同步都把它当成"外来节点"删掉，切换入口整体消失。

修正：去重分成两类。

- 本模块自己创建的节点（`.dsh-cs-nav`、`.dsh-cs-drawer`、`.dsh-cs-hero`、`.dsh-cs-toast`）：只保留当前实例持有的那一个，其余移除。
- React 渲染的节点（`.dsh-cs-switch` 切换器、`.dsh-cs-modal-mask` 设置弹窗）：只移除多余的副本，永远保留第一个。

验证（副本实例）：代码态下切换器存在 1 个、位置 `x=176,y=23,w=58`；等待多轮同步后仍为 1；手动克隆一份后 2.6 秒内回到 1 个。

## 交付记录 12：Drawnix 白板与右侧停靠栏（v0.6.0）

### 这次解决的问题

上一轮的白板与 Artifacts 都是 `position:fixed` 浮层，展开后盖住对话输入框。实测给外壳的 `layout-frame` 加右侧内边距后，中间列会真实收缩（1216 → 755），因此这一版把两者都改成**预留空间的停靠栏**，不再覆盖任何内容。

| 面板 | 默认宽度 | 行为 |
|---|---|---|
| 白板 | 460px（可拖到 320–720） | 展开时 frame 加 `padding-right`，主列左移，输入框完整可见 |
| Artifacts | 360px（可拖到 280–720） | 同上；与白板互斥，开一个自动收另一个 |
| 窄窗口 | < 760px | 不预留空间，退化为浮层，避免主列被挤没 |

面板拖拽时实时写 `--dsh-cs-panel-w`，关闭后释放属性与变量；`dispose()` 也会清理。窗口宽度、宽度偏好分别存在 `dsh-chat-space-board-width`、`dsh-chat-space-artifacts-width`。

### 白板怎么接的

Drawnix（`@drawnix/drawnix@0.4.0-2` + plait `0.92.3`）打成单文件 IIFE，放在插件 `assets/drawnix-board.js`（4.6MB，含样式与 mermaid/markdown 转换器）。Host 半新增三条只读路由：

- `GET /dsh-chat-space/board.html`：iframe 壳
- `GET /dsh-chat-space/drawnix-board.js`：画布 bundle
- `GET /dsh-chat-space/file?path=`：受限读取 `~/.dsh/chat-space` 内文件（留给后续 `.drawnix` 产物）

同源 iframe + `postMessage` 桥接，协议四类：`load-board` / `clear-board` / `insert-diagram` / `fit-viewport`，反向 `board-ready` / `board-change` / `diagram-inserted` / `ask-selection`。

### AI 边讲边画

1. `preset-chat` 与 `preset-cowork` 的 persona 增加绘图协议：讲解机制时输出 ```drawnix-mermaid（流程图）或 ```drawnix-mindmap（Markdown 标题列表转思维导图）。
2. 客户端不解析渲染后的 DOM，而是读会话日志里的 `assistant/message` 文本（宿主的代码渲染器会把 fence 拆成多个 token，按 DOM 文本匹配一定失败），按 `会话:seq:序号` 去重。
3. 新图形出现时自动展开白板、插入并 `fitViewport`；同一张画布按会话存在 IndexedDB（`dsh-chat-space-boards`），切回该会话时恢复，`diagramKeys` 一起存，避免重载后重画。
4. 消息里的绘图代码块折叠成一枚「已绘入右侧白板」胶囊：默认不占阅读版面，点一下展开源码并把白板视图聚焦到图形。

### 踩到的三个硬坑

| 现象 | 根因 | 修法 |
|---|---|---|
| 插入图形报 `can not resolve element map`，画布空白 | 装了 `@plait/core@0.94.1`，而 `react-board` 依赖 `^0.92.1`，形成两份模块，各自的 WeakMap 互不可见 | 用 overrides 把 `@plait/*` 全部锁到 `0.92.3`、slate 全家锁到 `0.116`，只留一份 |
| `insertFragment` 抛 `Cannot set properties of undefined (setting 'context')` | 在 React 树外直接改 board 的内部结构，element map/host 上下文不完整 | 改成声明式：解析出 `PlaitElement[]` 后拼进 `value` prop，让 `Wrapper` 自己 diff + `fitViewport` |
| 收起再展开白板后画的东西全没了 | `panel.remove()` 会销毁 iframe 的浏览上下文，Drawnix 重新启动 | 收起只设 `hidden`，节点保留；只有切换空间/卸载才真正移除 |

另一个坑：后台标签页的 `setTimeout` 会被节流到约每分钟一次，去抖扫描因此几乎不触发。现在扫描用 `MutationObserver` + `Date.now()` 时钟限流（1.2s），不依赖定时器。

### 验证（`/tmp/dsh-insp2` 副本实例，真实鼠标事件）

| 步骤 | 结果 |
|---|---|
| 点「白板」 | `data-dsh-cs-panel="board"`，frame padding 461px，中间列 755px，输入框右缘 1017 < 白板左缘 1035，重叠 0 |
| 点「Artifacts」 | 白板自动关闭，抽屉宽 361px、左缘 1135，`padding-right` 361px，重叠 0 |
| 再点「白板」 | 互斥生效，`panel="board"`，padding 461px |
| 关闭白板 | `panel` 属性移除，padding 归 0，中间列回到 1216 |
| 注入 mermaid 流程图 | iframe 内 `.element-host` 5 个节点、5 个 `foreignObject`，文字含 客户端/服务端/SYN/SYN+ACK/ACK，无 pageerror |
| 注入 Markdown 思维导图 | 节点数 6、`foreignObject` 13，文字含 TCP/握手/拥塞控制/慢启动/拥塞避免 |
| 真实 AI 回复里的 ```drawnix-mermaid | 自动展开白板并绘出三条握手的图；消息里的代码块折叠成「已绘入右侧白板」胶囊（banner 与代码体 `display:none`，胶囊 113×26） |
| 深色模式 | iframe `body[data-theme="dark"]`，画布底色 `rgb(19,22,29)`，点阵与连线跟随 |
| 重载后 | 板面从 IndexedDB 恢复，`diagramKeys` 命中，不重复绘制 |

`node scripts/smoke.mjs` 同步更新到当前契约（4 个槽位注册、`startSession` 带 `agentPreset: 'chat'`），14 项断言通过。

### 已装到桌面 profile

`remove_bundle` → `install_bundle` 返回 `version: 0.6.0`、`warnings: []`。Host 半新增了路由，**必须重启应用**（不是 Cmd+R）才会挂上；重启后再 Cmd+R 进入对话空间即可看到「白板」行。

### 边界

- 白板只有 chat / cowork 两种 preset 会按人格协议主动输出绘图块；标准 preset 需要用户明确要求写 ```drawnix-mermaid。
- 画布数据按会话存浏览器 IndexedDB，换机器或清缓存会丢；`.drawnix` 文件导入导出还没接到 Artifacts。
- 「就选中部分追问」已实现白板内胶囊与回填输入框，这一轮未做真机点击验证。

## 交付记录 13：会话列表自愈、光标与白色画布（v0.6.1）

### 三个反馈与修法

| 问题 | 根因 | 修法 |
|---|---|---|
| 进入对话空间后左侧没有对话列表 | 会话行的显隐完全依赖「对话会话 id 集合」。该集合只从 `workspace.sessionIds` 取，某些时刻快照里这一项还是空的，于是判定「没有一条属于对话」→ 整个列表被隐藏。这是隐藏历史列表的高危失败模式 | ① 集合改为 `workspace.sessionIds` ∪ `session.cwd === 工作区路径` 的会话（会话快照里带 `cwd`），快照滞后也能补齐；② 集合为空时**一律不隐藏**，宁可多显示，也不能让列表消失 |
| 输入框没有光标 | 皮肤的合成光标层把 `caret-color` 设成透明，真实编辑区的光标跟着不可见（副本实例实测 `caret-color: rgba(0,0,0,0)`） | 对话空间内对 `[contenteditable]`、`[data-composer-input]`、`textarea` 显式给 `caret-color`：浅色 `#161616`，深色 `#f4f9ff` |
| 白板底色想是白色 | 上一版让画布跟随宿主深色主题，白板变深，浅色图形与文字对比全乱 | 画布固定纸白：强制 iframe 走 `light`、画布底 `#ffffff`、点阵 `rgba(77,107,254,.12)`；面板外框仍跟宿主主题，不突兀 |

### 验证（副本实例，真实鼠标点击）

| 项 | 结果 |
|---|---|
| 列表 | 6 条会话行全部可见，标题为「新会话 / TCP三次握手流程图与讲解 / 创建并交付笔记文件 note.md …」 |
| 光标 | 点击输入框后真实键入「光标测试」成功写入，`caret-color: rgb(244,249,255)`（深色），`activeElement` 为 `DIV[data-composer-input]` |
| 白板 | iframe `body[data-theme="light"]`，画布 `rgb(255,255,255)`，工具岛 `rgba(255,255,255,.88)`；面板仍停靠，`padding-right: 461px` |
| 回归 | `node scripts/smoke.mjs` 14 项通过；`node --check` 通过 |

### 已重装

`remove_bundle` → `install_bundle`，`version: 0.6.1`、`warnings: []`。这次只改了 Client 与画布 bundle，重载页面（Cmd+R）即可，无需再重启应用。

## 交付记录 14：列表不再被过滤清空、输入框跟编程空间对齐（v0.6.2）

### 截图里的现象

对话空间进去了，侧栏「对话」标题下面一条都没有，`展开其余 N 个会话` 也没有。说明不是列表没渲染，而是被过滤逻辑藏光了：那一刻主视图并没有真正落在对话空间工作区，屏幕上渲染的是另一个工作区的会话行，而过滤器把这些「非对话会话」全隐藏，于是空白。

### 修法

1. **过滤器只在真的落地时生效**：先读主视图当前会话 `[data-conversation-session]`，只有它属于对话空间工作区才做「只显示对话会话」的过滤；否则一律显示，宁可临时混显，不能清空。
2. **兜底检查**：即便过滤条件成立，只要过滤后一条都不可见，就撤销本轮隐藏，把行全部显示。
3. 会话归属继续用 `workspace.sessionIds ∪ session.cwd === 工作区路径` 补齐，快照滞后不再导致空集合。

### 输入框

- 文字度量交还皮肤：去掉了 `font-size/line-height/min-height` 覆盖，实测与编程空间一致（14px / 24px 行高），光标与占位文字同一基线对齐。
- 输入框聚焦时不再改写占位符文本。之前每个同步周期都可能重写一次，皮肤的光标层跟着重放，表现就是光标一直在闪。
- 输入卡片只保留盒模型（圆角、边框、阴影、透明底），不再动文字排版。

### 验证（副本实例，真实鼠标）

| 项 | 结果 |
|---|---|
| 正常进入 | 6 条会话行全部可见，`hidden: 0` |
| 强制错位（`surface=chat` 但主视图停在代码会话） | 9 条会话行全部可见，`hidden: 0`，列表不再清空 |
| 输入框 | 点击后键入「对齐测试」成功；`font-size:14px`、`line-height:24px`、`min-height:24px`，与编程空间一致；`caret-color` 可见 |
| 页面错误 | 无 pageerror |

### 已重装

`remove_bundle` → `install_bundle`，`version: 0.6.2`、`warnings: []`。Client 侧改动，重载页面即可；若仍看到旧行为，说明渲染进程缓存了旧模块，完全退出应用再打开。

## 交付记录 15：对话空间不再混入编程会话、上下文仪表恢复（v0.6.3）

### 事故现象

截图里对话空间的侧栏列出的全是编程会话：`对话空间接入 Drawnix 白板方案`、`设计独立对话空间与交互`、`继续优化 UI 与交互质感`、`DeepSeek 框架实现 Projects 功能`……连正在跑的这个会话都出现在对话空间里，主视图也是编程会话。这是上一条「列表兜底」改坏的：0.6.2 为了避免空列表，在主视图没落在对话工作区时放开了过滤，结果把两个空间的历史混在一起。空列表和串库，串库更糟。

### 根因

不是列表逻辑本身，是**导航没有落地**：`surface=chat` 但主视图仍是编程工作区的会话。0.6.2 的兜底把这种错位状态「显示全部」掩盖了。

两处漏洞：

1. `restoreChat` 恢复上次会话时直接 `openSession(chatSession)` 就返回，从不校验落地；若那个 id 其实是编程会话，或宿主把导航抢回，界面就停在「对话外壳 + 编程会话」。
2. `enterChat` 重试 4 次仍失败时只是静默收尾，`surface` 仍是 chat。

### 修法

1. **导航契约**：新增 `landedInChat()`，以 `[data-conversation-session]` 是否属于对话工作区为准。`enterChat` 只在真正落地后返回，四次重试（0.5/0.9/1.6/2.6s）仍失败就抛错；调用方（切换按钮、启动恢复）捕获后把 `surface` 回滚为 `code`，界面退回编程空间，绝不留下错位外壳。
2. **恢复也要验**：`restoreChat` 只在 `chatSession` 属于对话工作区时才尝试打开，并轮询 2.5s 确认落地，否则走 `enterChat` 重建。
3. **过滤恢复严格**：对话空间只显示对话会话；`chatIds` 为空（工作区快照未就绪）时不隐藏，但**绝不因为没落地就放开过滤**。0.6.2 的「显示全部兜底」已删除。

### 上下文仪表

对话空间此前把上下文仪表当成工程装饰。实际它在 `conversation.input.model` 座位里、由皮肤渲染，点击弹出「上下文已用 / 系统提示词 / 工具定义 / 对话消息 / 会话统计 / Token 用量」。现在对话空间显式 `show()` 它（并移出隐藏清单），与编程空间同一套显示。

验证（副本实例，真实鼠标）：

| 项 | 结果 |
|---|---|
| 仪表可见 | `button[aria-label="上下文已用 2%"]`，环内 `2%` |
| 弹层 | 点击后打开，含 上下文已用 / 系统提示词 / 工具定义 / 对话消息 / 会话统计 / Token 用量 六项，面板 264×436 |
| 脏会话恢复 | 把 `chatSession` 写成编程会话 id 后重载：自动改开对话工作区的空白会话（`session-d400bab3…`），侧栏 6 条全是对话会话，0 条隐藏 |
| 正常进入 | 侧栏 6 条可见、隐藏 0，`surface=chat` |
| 冒烟 | `node scripts/smoke.mjs` 通过（桩里补了「主视图当前会话」注入） |

### 已重装

`version: 0.6.3`、`warnings: []`。Client 侧改动，重载页面即可；若列表仍和截图一样混着编程会话，说明渲染进程还在跑旧模块，完全退出应用再打开。

## 交付记录 16：空列表的真正原因——工作区文件夹折叠（v0.6.5）

### 真正的原因

之前几轮都在猜过滤逻辑，其实根因是渲染机制：**Claude 皮肤只在工作区文件夹展开时才渲染它下面的会话行**。侧栏结构是「工作区行 + 组内会话行」，`aria-expanded="false"` 时子行根本不在 DOM 里。对话空间接管后把工作区行都隐藏了，如果对话空间这个文件夹恰好是折叠状态（重启后默认折叠），会话行既不渲染也无从展开，列表就是空的——和过滤无关。

用**真实的桌面 DSH_HOME 数据**（19 条对话会话、8 个工作区）复现才看清：对话空间工作区 `8f800969…` 的 `aria-expanded` 是 `false`，DOM 里只有我们刚新建的那 1 条会话行；展开后 19 条会话的历史立刻出现。

### 修法

1. **自动展开对话文件夹**：进入对话空间时，若对话工作区的 `aria-expanded === "false"`，向它的 chevron（`row-chevron` / `row-arrow`）派发一次真实 click。1.2s 内不重复，最多 6 次。只点 chevron，不点整行——点整行会打开工作区，和导航守护打架。
2. **工作区选择加优先级**：同一 home 里可能出现多个同名「对话空间」（旧路径、重建各一个）。现在优先 localStorage 里记录的 `chatDir`，其次 `chatWorkspaceId`，最后取 `sessionIds` 最多的那个。
3. **导航守护 + 回滚**（上一轮已加）：`surface=chat` 但主视图不在对话工作区时，2.5s 后自动重入，最多 3 次；12s 仍失败就把 surface 回滚到 `code`，不会再留下「对话外壳 + 空白列表」。
4. 进入过程中列表区显示「正在进入对话空间…」，不再是无法解释的空白。

### 验证（真实桌面数据副本，web profile + 本地插件）

| 项 | 结果 |
|---|---|
| 对话工作区折叠时进入 | 自动展开（`aria-expanded: true`），侧栏出现 6 条会话行 + 「展开其余 5 个会话」 |
| 可见标题 | 新会话 / 你好问候 / 给我讲解一下tcp的三次握手 / 你好 / 简单问候 / 问候 —— 全是对话会话，无编程会话 |
| 隐藏数 | 0 |
| 页面错误 | 无 |
| 冒烟 | 通过 |

### 已重装

`version: 0.6.5`、`warnings: []`。Client 侧改动，重载页面即可。这次如果列表还是空的，界面会显示「正在进入对话空间…」而不是纯空白；若 12s 后仍失败会退回编程空间（这时说明是导航被宿主持续抢占，把当时截图发我即可定位）。

## 交付记录 17：展开行的对齐与常驻（v0.6.6）

### 两个反馈

1. 「展开其余 N 个会话 / 收起」这一行的文字比会话标题多缩进了一级，看着不齐。
2. 它长在列表尾部，会话多了要滚到底部才能点到。

### 修法

- **对齐**：运行时量一次会话标题文本的起点（`Range` 取首个文本节点的 x），把按钮的 `padding-left` 设成同一偏移，默认值 22px。宿主改样式也不会再错位，因为每轮同步都会重新量。
- **常驻**：给这一行加 `position: sticky; bottom: 0`，配同底色和一层向上的淡阴影，渲染在列表视口底部。会话再长也不必滚到底才能展开或收起。
- 收起状态同样处理（文字「收起」），两种状态的缩进与位置一致。

### 验证（真实桌面数据副本）

| 项 | 结果 |
|---|---|
| 标题文本 x | 22 |
| 按钮文本 x | 22（对齐，之前是 40） |
| 定位 | `position: sticky`、`bottom: 0` |
| 展开 | 点击后 6 → 11 条，按钮就地变「收起」 |
| 视觉 | 截图确认：`收起` 左缘与「新会话 / 你好问候 / …」标题左缘齐平 |

### 备注

副本 profile 首次启动会弹「预览版说明」模态，它的透明遮罩会拦住真实鼠标点击——这是宿主首次运行的行为，不是插件问题，不影响桌面端已勾选过该说明的环境。

### 已重装

`version: 0.6.6`、`warnings: []`。Client 侧改动，重载页面即可。

## 交付记录 18：上下文环在停靠面板之上、用量区不再隐藏（v0.6.7）

### 先纠正一个验证方法问题

之前所有副本验证都跑在 `dsh` CLI（本地开发版 0.2.1-alpha.2）上，而桌面应用是 **0.2.2-rc.1**，前端不是同一个构建。这是前几轮「副本正常、桌面不对」的根源。这次把桌面 `app.asar` 抽出来（含 `app.asar.unpacked` 的原生模块），用应用自带的 node 24 跑起 0.2.2-rc.1 的 web 服务，并在该 profile 下用 0.2.2 的 CLI 重装插件，才得到可与桌面对齐的环境。

### 上下文环的实测结论（0.2.2-rc.1）

| 场景 | 结果 |
|---|---|
| 有对话历史的会话 | 环存在（`aria-label="上下文已用 1%"`），真实点击后弹出 264×436 面板，含 上下文已用 / 系统提示词 / 工具定义 / 对话消息 / 会话统计 / Token 用量，且在最上层 |
| 空白新会话（hero） | 宿根本不渲染这个环——输入框右侧那个圆圈是发送按钮，空输入时本来就是禁用态 |

### 这次改的两点

1. **不再隐藏用量相关区域**：`usage` / `turn-usage` / `composer-activity` 从对话空间的隐藏清单里移除。这些区域是上下文面板的宿主，藏它们有把弹层一起藏掉的风险。实测在没有历史的新会话里它们本来也不展示。
2. **停靠面板降层**：白板 `z-index` 由 2147481200 降到 900、Artifacts 降到 890。宿主弹层（面板 z 1100 级别）现在一定盖在停靠栏之上，白板展开时点上下文环不会再被面板挡住。实测白板展开时弹层出现在 x=745（主列内），命中测试确认在最上层。

### 验证

| 项 | 结果 |
|---|---|
| 有历史会话点环 | 弹层打开，六项齐全，`onTop: true` |
| 白板展开时点环 | 弹层开在主列，不被面板遮挡 |
| 白板停靠 | `padding-right` 461px、白板 x=1035、输入框右缘 1033，重叠 0 |
| 展开行 | 标题文本 x=21 与「收起」文本 x=21 对齐，`position: sticky` |
| 冒烟 | 通过 |

### 已重装

`version: 0.6.7`、`warnings: []`。重载页面即可。

## 交付记录 19：对话列表默认全展开、上下文环常显（v0.6.8）

这次验证首次跑在**桌面同版本前端**（0.2.2-rc.1，从 app.asar 抽出 + 应用自带 node），结论可对位真机。

### 1. 列表只显示几条就折叠

宿主把会话列表折到 6 条，后面给一行「展开其余 N 个会话」。对话空间里历史本身就是主角，所以在进入某条对话后自动点一次展开，把历史全部铺开；用户手动点「收起」后不再强行展开，直到切换会话（以 `[data-conversation-session]` 为键，每条会话只自动展开一次）。

实测：进入后 12 条会话全部可见，底部行变成「收起」。

### 2. 上下文环没有显示

两个叠加原因：

1. 皮肤在紧凑输入框里会隐藏环内的百分比文字（`[data-dsh-claude-meter-tight] button>span{display:none}`），只剩一个空心环，看起来像「没显示」。
2. 皮肤在 agent 运行期间会整体压暗/隐藏部分用量控件。

对话空间里这个环是唯一的上下文读数，因此显式保活：

```css
[data-dsh-claude-context-meter]{display:block!important;visibility:visible!important;opacity:1!important}
[data-dsh-claude-context-meter] button{display:inline-flex!important;opacity:1!important}
[data-dsh-claude-context-meter] button>span{display:inline!important;font-size:11.5px!important;opacity:.82}
```

实测（0.2.2-rc.1）：环内显示 `1%`，点击弹出 264×436 面板，六项齐全（上下文已用 / 系统提示词 / 工具定义 / 对话消息 / 会话统计 / Token 用量，含费用与缓存命中）。截图里输入框右侧同时可见 `DeepSeek-V4.1-Flash 1017 High 1%`。

### 边界

空白新会话（hero）宿主不渲染上下文环，此时输入框右侧的圆圈是发送按钮。想验证环要打开有历史的对话。

### 已重装

`version: 0.6.8`、`warnings: []`。重载页面即可。

## 交付记录 20：上下文环空转、会话列表只显示几条（v0.6.9）

### 两个反馈与根因

1. **空白新会话里输入框右侧的环是空的、点不开。** 那个圆环是皮肤画的上下文环（`[data-dsh-claude-meter-ring]`），数值来自宿主的 `[data-dsh-claude-context-meter]`；宿主在没有 `contextPressure` 的会话里根本不渲染 meter，皮肤环就成了一个空环，点击也没有面板。上一条记录把扫描截图里的圆环误判成发送按钮——发送按钮是另一个节点（`[data-dsh-claude-control="send"]`），空输入时隐藏/禁用。所以「环显示不了上下文」这个反馈成立，不是错觉。
2. **会话列表只展开几条就折着。** 宿主的「展开其余 N 个会话」是**按工作区分组**的，每组的行带 `data-row-key="overflow:<workspaceId>"`。0.6.8 的自动展开按按钮文字取全文档第一个匹配项，命中了另一个（在对话空间里被隐藏、但仍挂在 DOM 里的）工作区的展开行，点完还把「已展开」标记写死，对话分组自己的行再没被点过。副本里别的分组没有展开行，所以副本正常、桌面不对——和之前几次「副本正常、桌面不对」同类。

### 修法

- **展开行精确取组**：按 `data-row-key="overflow:<对话 workspaceId>"` 找，找不到再退回当前可见的展开行；测距（sticky 对齐用）也只用可见会话行。
- **自动展开改成持续校正**：每个同步周期检查对话分组是否还有「展开其余」，有就点；点空了（React 在两次同步之间重建分组）1.2s 后重试，每个会话最多 20 次。用户真点「收起」（pointerdown 命中 `overflow:` 行）后，到换会话前不再抢。
- **空白会话的环给 0%**：皮肤环内填 `0%`、设 `aria-label`，点击/回车弹出 `.dsh-cs-ctx-panel`（上下文已用 0% / 尚无上下文占用）；Esc、点外部、换会话、换空间都关闭。宿主 meter 一出现就用宿主百分比还原并撤掉占位，**有历史但没有 usage 的会话不编 0%**。

### 验证（`/tmp/dsh-desk2` 的 `deskweb` 副本，0.2.2-rc.1 同版本前端，真实鼠标）

| 项 | 结果 |
|---|---|
| 冷启动空白会话 | 环内 `0%`、`aria-label="上下文已用 0%"`；点环弹出 264×90 面板（上下文已用 / 0% / 尚无上下文占用），Esc 与点外部都关闭 |
| 键盘 | 聚焦环按 Enter 同样弹出，Esc 关闭 |
| 会话列表 | 12 条全部可见、底部是「收起」；展开行属性确认为 `data-row-key="overflow:8f800969…"` |
| 误点回归 | 在对话分组之前插入一条伪造的「展开其余 99 个会话」按钮（旧逻辑会点它），换会话后对话列表仍然全展开，伪造按钮没有被加 sticky/缩进 |
| 手动收起 | 真点「收起」后 4.5s 内保持 6 条不反弹；换会话后重新展开 |
| 有历史会话 | 环内 `1%`，点开宿主六项面板（264×436），我方占位面板保持隐藏 |
| 空间切换 | 切到编程空间时环内文本与 aria 被清掉，切回对话恢复 `0%` |
| 冒烟/语法 | `node scripts/smoke.mjs` 通过；`new Function(client.js)` 通过 |

### 已重装

`remove_bundle` → `install_bundle`，`version: 0.6.9`、`warnings: []`。只动了 Client 半，Cmd+R 即可；若桌面还是旧行为，完全退出应用再打开（client bundle 走 HMR + rev，正常重载会拿到新代码）。

### 边界

- 有历史但没有任何 usage 的会话，宿主不渲染 meter，环仍然是空的——这里不补 0%（会撒谎），只能等宿主有数据。
- 空白会话发送第一条消息后、第一次 usage 回来之前，环仍显示 `0%`，读数近似正确；宿主 meter 出现后即替换。

## 交付记录 21：去掉重复的第二个上下文环（v0.6.10）

### 现象

回复完成后输入区出现两个上下文环：一个在 `Max` 右侧（皮肤环，绿 `1%`），另一个在下方居中（宿主饼环，也 `1%`）。

### 根因

上一轮 0.6.8 为了修「环里没内容」，用 `display:block!important` 把宿主 `[data-dsh-claude-context-meter]` 强行显示。实际机制是：**皮肤自己画环**，画好之后给宿主 meter 加上 `data-dsh-claude-meter-hidden`，用自己的 `display:none` 规则把它藏起来——这正是它的单环设计。我们的 `!important` 覆盖了皮肤的隐藏规则，于是宿主 meter 以饼环形态又出现一次。空白会话里宿主根本没有 meter，所以重复只在「有回复、有 usage」的会话里出现，前几轮验证都没在这个状态下截过图。

### 修法

- 删掉 `body[data-dsh-chat-space="chat"] [data-dsh-claude-context-meter]` 那一整段强制显示（display/visibility/opacity、button、span）。
- `paintConversation` 不再把 meter 从隐藏态拉回来：只清掉本模块自己的 hide 属性，不碰皮肤设置的 `data-dsh-claude-meter-hidden`。
- 皮肤环继续是唯一显示；它仍然从隐藏的宿主 meter 取百分比，点击也照旧转发到宿主按钮。宿主面板是 portal 渲染，宿主 meter `display:none` 不影响面板打开。

### 验证（`/tmp/dsh-desk2` + `deskweb` 副本，真实鼠标）

| 项 | 结果 |
|---|---|
| 有历史会话 | 可见上下文环只有 1 个（皮肤环，`1%`）；宿主 meter `data-dsh-claude-meter-hidden` 且 `display:none` |
| 点皮肤环 | 宿主六项面板照常打开（264×436，上下文已用 / 系统提示词 / 工具定义 / 对话消息 / 会话统计 / Token 用量），宿主 meter 仍是 `display:none` |
| 空白会话 | 皮肤环内仍是 `0%` 占位，点开本插件面板 |
| 冒烟 | `node scripts/smoke.mjs` 通过 |

### 已重装

`version: 0.6.10`、`warnings: []`。Client 侧改动，Cmd+R 即可。

### 边界

皮肤换版本后单环契约可能变：以后验证上下文环时先数「可见的环」，必须只有 1 个（`.dsh-claude-meter-ring` 那个）；宿主 meter 只应作为隐藏的数据源存在。

## 交付记录 22：能力层原地切换 + 统一画布台（v0.7.0）

### 为什么改

两处结构性问题是这次的重点，不是视觉：

1. 切「对话 / Cowork」会 `enterChat(..., { requireChange: true })` 新开会话，白屏闪一下、上下文断掉。用户想要的不是「换个新会话」，是「同一次思考换一种能力」。
2. 白板和 Artifacts 是两个互斥抽屉，每张图还都追加到同一张无限画布上，越聊越挤。

### 模式层：先原地，再显式交接

宿主的 preset 只能绑在会话上，但空白会话允许首轮前重选。于是分两条路径：

| 场景 | 行为 |
|---|---|
| 空白会话切模式 | `agentPresets.select(sessionId, preset)` 原地改。会话 id、草稿、草稿区都不动，不新建会话，不闪屏 |
| 已有内容的会话切模式 | 宿主回 `agent-preset/locked`，这是硬约束。改为显式交接：新开目标 preset 的空白会话，把原会话末 8 条消息（上限 3600 字，切在行边界）作为**可见草稿**带过去，用户检查后再发。原会话原样留在历史里 |

`state.mode` 降级成导航缓存，真相读会话的 `agentPreset` 投影，同步周期校正按钮状态；刚切换完用 `pinnedModeSessionId` 压一个周期，避免旧投影把按钮弹回去。

踩到的坑：`binding.ctx.remote` 是 Agent 作用域，读 `remote.agentPresets` 抛 `cannot get property "remote.agentPresets" without inject`。必须在本模块 `inject` 里声明 `'remote', 'remote.agentPresets'`，用插件自己的 ctx 调用。

顺带修了路由记忆：以前切回空间是「猜最新的那条会话」，现在是「记真实打开的那条」，`enterChat` 回到上次的对话会话而不是每次开新的空白。

### 画布台：一个面板，两个视图，多个项目

```text
aside.dsh-cs-drawer  ← 唯一的停靠面板
├── 白板视图   boardPane > iframe[data-cs-board-frame]
└── Artifacts  列表 / 预览
```

- 侧栏一行「画布台」，再点一次收起；白板 / Artifacts 用面板内 Tab 切换，不再互斥抢位置。
- 每个 ```drawnix-* fence 是独立项目（`blockId = 会话:seq:序号`），项目条列出当前会话的图，点击切换到那张图。
- Drawnix bundle 的 `insert-diagram` 改成**整块替换**当前画布，`load-board` 带 `itemId`，`board-change`/`diagram-inserted` 回传 `itemId`。同一张图的后续修改落在自己的项目键上。
- 旧版整会话白板映射成 `历史白板` 项目，原 IndexedDB 键继续复用，升级不丢手绘。
- 消息里的胶囊带上 `data-cs-drawn-id`，点它切到对应项目并 `fit-viewport`。

顺带修掉的三个竞态：

1. 防抖保存以前在 700ms 后才取当前会话键，快速切会话会把 A 的画写进 B 的键。现在 `board-change` 到达时就把会话键、`itemId`、elements 一起快照，回调只写这份快照并校验 epoch。
2. `wbLoad` 的 IDB 回调以前不校验发起时的选择，晚到的结果会画进新会话。现在带 epoch + 会话键 + `itemId` 三重校验。
3. 面板宽度以前每次同步都重写，拖拽过程中会被拽回去。现在只在视图切换时写回，拖完 3.2 秒仍稳定在 580px。

`persist()` 也只写导航字段了：面板开合、当前视图、当前项目都是内存状态，不再落到 localStorage。

### Artifacts

条目点击改成**面板内预览**，不再直接跳会话：读 `/dsh-chat-space/file`（限定在对话目录内），HTML/SVG 走带 CSP 的 sandbox iframe，其他文本走等宽 pre；「打开来源对话」才导航。列表来源改为 `sessionIds ∪ cwd` 的对话会话集合、按活动时间取最近 20 个，不再假设 `workspace.sessionIds` 的顺序。

边界：`deliverables/presented` 只带 path/description/time，没有历史快照，所以只能预览当前文件，不假装能切历史版本。

### 验证（`/tmp/dsh-desk2` 的 `deskweb` 副本，0.2.2-rc.1 同版本前端，真实鼠标）

| 项 | 结果 |
|---|---|
| 空白会话点 Cowork | 会话 id 不变、会话行数 12→12、pill 切到 Cowork、`preset` 投影为 cowork、无失败提示 |
| 有历史会话点 Cowork | 新开 cowork 空白会话，草稿里出现「正在从「对话」继续到「Cowork」」+ 3771 字上下文摘录，原会话仍在列表 |
| 画布台入口 | 侧栏只有一行「画布台」；点击后 `data-dsh-cs-panel="stage"`、宽度 460、`layout-frame` padding-right 460、输入框右缘 976 < 画布台左缘 1036 |
| 图形项目 | 项目条显示 `历史白板`、`流程图 1`；`插入甲图 → 插入乙图` 后 `.element-host` 恒为 1，文字从「甲图-起点…」变成「乙图-起点…」——是替换不是追加 |
| 关闭再开 | `contentWindow.__persistProbe` 仍在、`src` 不变、`.dsh-cs-drawer` 与 iframe 各 1 个 |
| Tab 切换 | 白板 → Artifacts：board host `hidden`、面板保持打开、`aria-selected` 正确；无交付记录时显示空状态 |
| 拖拽宽度 | 460 → 580，`--dsh-cs-panel-w` 与 padding 同步；3.2 秒后仍是 580，存储为 580 |
| 空间切换 | 切 code：nav 行 0、`data-dsh-cs-panel` 清空、padding 0、回到原 code 会话；切回 chat：恢复到那条对话会话。全程 0 pageerror / 0 console error |
| 冒烟/语法 | `node scripts/smoke.mjs` 14 项 + 新增 2 项 inject 断言通过；`new Function(client.js)`、`node --check index.js`、`esbuild transform` 均通过 |

### 已重装

`version: 0.7.0`、`warnings: []`。

### 边界

- 交接是「草稿」不是自动续聊：用户必须自己按发送，插件不替用户提交。
- 原会话与目标会话是两条独立会话，各自的历史与 preset 都不会串。
- 图形项目索引是内存派生状态，重载后从会话日志重建；用户对某张图的手绘修改存在该项目的 IndexedDB 键上，换机器或清缓存会丢。
- Artifacts 预览只读当前文件；`SESSION_FILE` 与 `.drawnix` 导入导出仍未接线，已从常量表删除，避免看起来像已实现。

## 交付记录 23：切换器常驻与跳到最新（v0.7.1）

### 切换器不再因收起侧栏消失

以前 `FloatingSwitch` 在 `[data-sidebar-collapsed]` 或品牌行宽度 <120 时直接 `return null`，收起侧栏就没有空间入口了。现在按三个锚点依次降级：

| 状态 | 位置 | `data-dsh-cs-switch-place` |
|---|---|---|
| 侧栏展开 | 品牌行内，折叠按钮左侧 6px | `brand-row` |
| 侧栏收起 / 窄窗 / 量不到品牌行 | 主视图顶栏，宿主「打开侧边栏」+「新建会话」之后 8px | `topbar` |
| 两个锚点都没有（外壳还没画完） | 固定 96 / 28 | `safe-area` |

收起态锚的是宿主自己那个「打开侧边栏」按钮——它已经避开了 macOS 红绿灯，所以不用插件自己算安全区，窗口化和全屏走同一套测量。

### 跳到最新

宿主管滚动，插件不拦截，只提供回到底部的入口：读 `[data-dsh-claude-part~="scroll-body"]` 的 `scrollHeight - scrollTop - clientHeight`，超过 160px 就在消息列底部居中显示「跳到最新」，点击平滑滚到底并隐藏。`prefers-reduced-motion` 下用 `auto`。

### 验证（`/tmp/dsh-desk2` 的 `deskweb` 副本，真实鼠标）

| 项 | 结果 |
|---|---|
| 展开态 | 切换器 `data-dsh-cs-switch-place="brand-row"`，位置 (180, 23) |
| 收起侧栏（真点 toggle） | 切换器仍在，`place="topbar"`，位置 (160, 12)，命中测试首个节点就是它 |
| 收起态切换 | 点 `</>` → `surface=code`，位置仍为 `topbar` |
| 滚离底部 | `scrollTop 0 / gap 677` 时按钮出现（850, 776, 74×28），命中测试在消息之上 |
| 点「跳到最新」 | `scrollTop 677 / gap 1`，按钮隐藏 |
| 加载错误 | 本轮重载 0 pageerror（之前那两条 SyntaxError 是 HMR 还在跑坏版本时的残留，重载后消失） |
| 冒烟/语法 | `node scripts/smoke.mjs` 通过；`new Function(client.js)` 通过 |

### 边界

- 窄窗和全屏没有单独截图验证，但它们与收起态走同一条 `topbar` 测量路径；`safe-area` 分支只在锚点完全量不到时触发。
- 会话列表收起时侧栏只剩图标，「画布台」行按既有规则隐藏（见不变量 2 与旧交付记录），要打开画布台得先展开侧栏。
- 消息复制沿用宿主已有的 hover 操作（复制 / 反馈），本轮没有再叠一套。编辑后重发、局部引用追问仍未做。

### 已重装

`version: 0.7.1`、`warnings: []`。

## 交付记录 24：对话滚不动、看不到前面消息（v0.7.2）

### 起因

用户反馈「对话里面滑动不行了，看不到前面的对话信息」。不是猜，先在 `/tmp/dsh-desk2` 副本里量了滚动容器。

### 两个真 bug

1. **居中的滚动容器把顶部顶出可视区。** `scroll-body` 是 `display:flex;flex-direction:column` 的滚动容器，插件从早期版本起给它加了无条件 `justify-content:center`（本意是让空白首页居中）。内容一超长，居中就把上溢部分推到负坐标：实测长对话在 `scrollTop = 0` 时，第一条消息 `top = -660px`，滚到顶也看不见，等于前面的对话永远够不到。
   修法：居中只挂在 `body[data-dsh-cs-blank]` 下（同步周期按 `[data-phase="hero"]` 维护这个标记），普通对话用默认的 `flex-start`。

2. **打开旧会话不会落在最新，而是停在最前面。** 修完第 1 条才暴露：宿主自己不把重开的会话滚到底，之前「居中」碰巧让初始位置接近末尾，掩盖了这一点。现在按 `[data-conversation-session]` 变化落底一次（3 秒窗口内跟到 `gap<=2`），`wheel` / `touchstart` / `keydown` / `pointerdown` 任一发生就交还控制权，切回同一会话不重复抢。

3. 顺带修第 3 个：**「跳到最新」按钮压在输入卡上。** 定位用的 `composer.bar` 这个 part 在 0.2.2 里不存在，回落成滚动容器底部，实测按钮 y=776 落在输入卡 744–818 之间。改锚 `[data-composer-card]` 顶部再上移 10px，现在按钮 706–734、输入卡 744 起，不重叠。

### 验证（`/tmp/dsh-desk2` 的 `deskweb` 副本，真实鼠标/滚轮）

| 项 | 结果 |
|---|---|
| 长对话 `scrollTop=0` | 第一条消息 `top=16`（此前 -660），`justify=normal` |
| 真实滚轮上滚 | `scrollTop 400 → 0`，第一条消息可见 |
| 打开长会话 | `scrollTop 1353 / gap 0`，落在最新 |
| 手滚上移 | `gap 900`，等 3.2 秒仍是 900，没有回弹 |
| 切走再切回 | 回到 tcp 会话 `gap 0`，重新落在最新 |
| 空白新会话 | `justify=center`、`data-dsh-cs-blank` 存在、hero 居中偏移 0 |
| 发送第一条消息后 | hero 消失、标记摘除、`justify=normal`、`gap 1`，滚轮可上滚到 `st 0` |
| 跳到最新 | 按钮 706–734，输入卡 744 起；点击后 `gap 0` 并自动隐藏 |
| 画布台展开时 | 会话列宽 634、滚动正常、与面板重叠 -2px |
| 报错 | 0 pageerror |

### 已重装

`version: 0.7.2`、`warnings: []`。

### 边界

- 落底只在会话切换时执行一次，不跟随流式输出；流式期间保持宿主自己的行为。
- 用户拖动滚动条或点击会话区都会立即取消落底，不会和阅读抢位置。
- 空白页居中用 `data-dsh-cs-blank` 标记，宿主若改掉 `[data-phase="hero"]` 需要同步调整这条判定。
