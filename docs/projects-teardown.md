# Cursor Projects 类系统：实现拆解与落地设计

调研时间 2026-11。一手材料以官方文档/源码为准，推断部分单独标注。

读法：0–3 是 Cursor 与 dsh-superagent 的拆解（含推断标注），4–5 是横向对照与论文，6–7 是给 openhanako 的设计与坑。

## 0. 结论

**Projects 不是"更强的记忆"，是把 agent 的工作单元从"会话"换成"项目"这个持久对象。** 一个 Project 同时是四样东西：状态容器（跨月存活）、上下文容器（跨机器同步的文件集）、触发器集合（订阅外部事件）、执行环境集合（每 agent 一台机器 + 一条分支）。Cursor 把四样都做齐了，所以能承接"一次 chat 装不下的工作"。

[dsh-superagent](https://github.com/deepseek-ai/dsh-superagent-prototype) 是同一个问题的另一种切法：它把重心放在**授权与注意力**——谁可以让 agent 干活、能干什么范围、什么时候该开口。它的上下文载体是 Thread/Trigger 的事件流加每个 Ticket 独立的会话和目录，没有项目级的知识沉淀。

所以两者不是同一实现的两种写法，是两个互补的半边：

| | Cursor Projects | dsh-superagent |
|---|---|---|
| 优化目标 | 上下文与并发的规模 | 注意力与授权的边界 |
| 工作单元 | Project（长期、可对话） | Ticket（一次授权、有始有终） |
| 谁在做决定 | 协调者 agent 自己判断 | 确定性 gate + 模型 assessment 两层 |
| 上下文载体 | 项目级文件集，跨机同步 | Thread 事件流 + 分层 prompt |
| 执行隔离 | 每 agent 一 VM / 一 worktree | 每 Ticket 一会话 + 一目录（git worktree） |
| 什么时候动 | 人说话或订阅命中 | 人说话或订阅命中，且必须过 gate |

两边收敛到同一条工程原则：**把 agent 的状态从对话历史里搬出来，变成外部可寻址、可同步、可审计的显式对象。** 差别只在于 Cursor 把它搬进了文件系统，DeepSeek 把它搬进了数据库。

论文侧没有直接研究"Project 这个对象"的工作，只有它的零件：记忆的写入与巩固、仓库级上下文检索、多 agent 的失败模式、长程任务的评测。真正的空白在"**项目级持久上下文该怎么表示、怎么评估**"——这部分目前全是产品实践，没有基准。

---

## 1. Cursor 官方口径

### 1.1 定位

Project 承接"一次 chat 装不下的工作"：多 PR 的功能、迁移、完整应用。你通过和它的**协调者**对话来指挥；协调者不写代码，只规划、派人、把成品拿回来。入口在 Agents Window 左侧导航，跑在 Cloud Agents 上。

官方给的内部使用证据：新用户合并 PR 数 +30%，重度使用 Projects 的用户合并量是 6 倍；Cursor 内部用它做跨数百个 PR 的框架迁移、设计系统维护，以及 Projects 本身。设计系统那个例子值得注意——协调者扫描每个新 PR，把重复出现的错误在第二次发生时变成一条 lint 规则，目标规模是每天 20–100 个 PR，工程师只在需要的环节介入。

这解释了为什么它的产物形态是"工件"而不是 diff：规模上去以后，瓶颈从写代码变成**评审带宽**，而评审需要的是日志、录屏、可点的预览，不是逐行 diff。

### 1.2 数据模型（文档可查部分）

| 对象 | 文档事实 | 来源 |
|---|---|---|
| Project | 有名字、图标；绑定一个 workspace（仓库，Cloud Agents 支持多仓库环境）和一个协调者模型 | [projects 文档](https://cursor.com/docs/agent/projects.md) |
| 协调者会话 | Project 打开就是一个和协调者的 chat；它创建和管理 agent | 同上 |
| 成员 chat | 可以把顶层 Cloud Agent chat 拖进 Project（Add to Project）；本地 chat 会先被转成 Remote Control 再加入 | 同上 |
| 子 agent | 在 Project 内工作，可点开看、可直接对话 | 同上 |
| 共享上下文 | 每个 Project 维护**一组文件**，在所有云与本地机器之间同步 | 同上 |
| 订阅 | 属于**单个 agent 会话**；事件以 follow-up 消息唤醒；突发合并；最长 180 天；agent 可自行退订 | [capabilities](https://cursor.com/docs/cloud-agent/capabilities.md) |
| 执行环境 | 每 agent 独立 VM；环境可用 agent 引导、快照或 `.cursor/environment.json` 定义；后台预构建 | [cloud-agent](https://cursor.com/docs/cloud-agent.md) |
| 产物 | 截图、视频、日志引用，可嵌进 PR 描述 | [capabilities](https://cursor.com/docs/cloud-agent/capabilities.md) |

本地/云的分工是一条硬规则：**默认在云上跑，需要在本机验证时才派一个本地 agent。** 合上笔记本不中断，并行数不受本机算力限制。

### 1.3 三根支柱的官方描述

1. **协调者不写代码。** 因为它只委派不执行，所以永远不被自己阻塞，随时能响应新指令。
2. **共享上下文。** 你不需要每次开始任务都重新交代背景；agent 持续往里补研究结论、产物、对代码库的理解、你的偏好。某个 agent 摸清怎么测某个服务，之后每个 agent 都能直接用。
3. **订阅。** 监听 Slack 频道、按计划跑、跟 PR；检测到信号就行动，不用等你打提示词。

### 1.4 文档没写的部分

这些是不公开的，任何声称"Cursor 是这么做的"的说法都应视为推断：共享上下文文件存在哪、用什么同步协议、冲突怎么解、协调者的工具集和调度器实现、订阅的事件总线结构。

---

## 2. 机制拆解（可验证行为 → 最可能实现）

判断依据只用官方措辞和可观察行为；置信度是我给的，不是 Cursor 说的。

| 关注点 | 可观察行为 | 最可能的实现 | 置信度 |
|---|---|---|---|
| 共享上下文载体 | "maintains a set of files that sync across every cloud and local machine"；agent 会"补充研究结论和产物" | 文件系统即记忆：一个 per-project 的目录，用普通文件工具读写，后台同步到各执行环境。不是向量库，也不是结构化记忆条目 | 高 |
| 注入方式 | 协调者和子 agent 都"知道"这些上下文 | 目录清单常驻 + 内容按需读，而不是全量塞进 prompt。旁证：Claude Code 明确用 `MEMORY.md` 做索引、其余文件按需打开，同一思路 | 中高 |
| 协调者工具集 | 它不写代码，只创建/管理 agent、读上下文、回人 | 工具集里没有编辑类工具，只有 spawn / message / wait / read-context 一类；和 dsh 的 orchestrator 只读是同一设计 | 中高 |
| 唤醒机制 | 子 agent 完成、订阅命中都会让协调者继续 | 事件写入协调者会话的 inbox，按 step 边界投递；协调者不需要轮询 | 高 |
| 订阅去抖 | "Bursts coalesce… the agent re-reads the source before acting" | 事件层合并窗口 + 唤醒时要求重读源，避免拿过期事件当事实 | 高 |
| 隔离层级 | 云 VM / 本地 worktree / per-agent 分支 | 三级：机器级、目录级、分支级；本地并行用 worktree，云上直接一 VM 一 clone | 高 |
| 上下文膨胀控制 | 子 agent 各自独立上下文，只回摘要；内置 Explore/Browser 子 agent 专治噪声 | 上下文隔离是主手段，压缩是辅手段 | 高 |

两条值得单独拎出来的判断：

**"文件"是刻意的选择，不是偷懒。** 文件对 agent 有三个别的东西给不了的好处：agent 天生会用 `read`/`grep`/`write`；人可以随时打开看、改、diff；同步和版本控制可以复用现成基础设施（git、对象存储、rsync 任选）。代价是没有 schema，写进去的垃圾会一直烂在里面。

**协调者必须"空转得动"。** 它的价值不在智力，在于它从不被长任务占住。这条约束会反向决定工具设计：凡是会阻塞几十秒的操作都不能给它，所以 dsh 才会在 prompt 层直接禁掉 `sleep`、禁掉超过 30 秒的 shell、禁掉超过 5 秒的 job wait。Cursor 的做法是结构性的——协调者手上根本没有能跑很久的工具。

---

## 3. dsh-superagent 的另一种解法

代码和文档都在 [仓库](https://github.com/deepseek-ai/dsh-superagent-prototype) 里，`docs/000`–`008` 是按依赖顺序写的设计文档，建议按序读。这里的判断来自源码和文档，不是二手转述。

### 3.1 域模型

七个概念，每个都有明确的不变量：

| 概念 | 是什么 | 关键约束 |
|---|---|---|
| Source | 事件流（GitHub、飞书） | 自己记读位；重启不重放；过滤自己的消息 |
| Trigger | 一条不可变事件 | 接受两次只产生一个 Ticket（幂等） |
| Thread | 按时间排的 Trigger 序列 | 同一 Thread 同时只跑一个 Eval；到达的 Trigger 合并进下一批 |
| Eval | 对一批 Trigger 的判定，两层：确定性 gate + 模型 assessment | 不持有状态；Policy 变了就丢弃重跑 |
| Mandate | accept 授予的权限：Policy 版本、范围、强度、匹配到的规则、发起人身份 | 不可变；扩大范围必须新开 Ticket；只有人能撤回 |
| Ticket | 一个已授权的工作单元 | 只有 Eval 能创建；自己的状态机，不跟随执行器 |
| Assignment | Ticket 与某个执行器实例的绑定 | 一个 Ticket 先后可以有多个；状态独立于 Ticket |
| Subscription | Ticket 与 Thread 的多对多 | 扇出投递上下文，但不授予任何权限 |

`Subscription` 这条规则是整个设计里最精细的地方：**上下文可以免费流向 Ticket，权限不能。** 一条 PR 上的机器人评论会到达 Ticket，但不会让它获得任何新授权；人能靠订阅继续对话、唤醒已结束的 Ticket，但那条路径不经过 Eval，靠的是已有 Mandate 仍然有效。

### 3.2 三条工程不变量

1. **单一写者 + 一命令一事务。** `Engine` 是所有域对象的唯一写入者，所有方法同步执行，每个命令在一个事务里改完聚合。异步工作由 port 在事务内入队、提交后执行。这消掉了分布式 agent 系统里最难查的一类 bug：状态和副作用不同步。
2. **先存后做。** 中继、投递、发消息都先落库再执行，失败按 2 秒起、指数退避到 1 分钟重试；消息用 outbox 收据表保证同一 id 不会入队两次。进程重启后从库里恢复，而不是从内存里。
3. **会话即执行器。** 每个 Ticket 一个 `worker-<ticket id>` 会话加一个目录，目录由 `prepare` 命令创建（文档推荐 `git worktree`）。工作目录、分支、PR 三者按 Ticket 短名对齐。

### 3.3 授权与注意力的分工

授权分三层，越往下越硬：

- **gate**（确定性）：谁能发起、在哪个 Source、什么强度（explicit / inferred / not admitted）。代码判定，模型无权改。
- **assessment**（模型）：这批 Trigger 该不该开新工作、开多大、是不是重复。
- **Mandate**（不可变记录）：这次授权凭什么、到哪为止。后续所有执行都以它为准，Policy 变了也不追认撤销，只把变更通知给活着的 Ticket。

注意力同样有硬约束：主会话（orchestrator）**不许读代码、不许看日志、不许自己解 blocker**——这是 prompt 规则，不是工具限制；消息默认一句话，硬上限 100 词；后台任务 5 秒移交、单轮上限 30 分钟；并发槽之外永远给人留一个额外槽，保证"人不能被机器挤出去"。

### 3.4 它没有的那一层

dsh 的上下文是**事件流 + 分层 prompt**：`runtime/shared` → 团队三段 → 订阅与回复规则 → 派工/工作指令 → handoff → 环境变量 → Policy（每次请求重新生成）。Thread 的订阅扇出负责"后续讨论自动到达执行器"。

它没有的是**跨 Ticket 的知识沉淀**。每个 worker 进来都要重新摸一遍代码库、重新搞清怎么跑测试；一个 Ticket 里学到的结论，Ticket 一结束就散了。这正是 Cursor 那段"共享上下文"要解决的问题，也是这个原型和 Projects 最实质的差距。

顺带说清一件事：那篇引发讨论的《Exploring Super-agent Design》是 DeepSeek Harness 团队发在公众号的技术提案，不是论文。里面的实验数据是 p95 完成时间 15.7 分钟 vs 单会话 29.5 分钟，每次约 300 条消息、约 20 个请求、跑 5 次；负载是合成的，编码任务用"消耗时间的工具"模拟，测的是调度与协调，不是写代码能力。引用时不要把它当 benchmark 结果。

### 3.5 值得抄 / 不该抄

值得抄：

- **Mandate 这个对象。** 把"凭什么允许"变成一条不可变记录，而不是 prompt 里的一句话。事件驱动的 agent 迟早要面对"这条 Slack 消息是谁发的、他有权让我改生产吗"，没有这个对象就只能靠提示词自觉。
- **确定性 gate 在前，模型判断在后。** 省 token，可审计，且 Policy 变化时行为可预测。
- **先存后做 + 幂等 id。** 长任务一定会崩，崩溃恢复的语义要在设计时就写死。
- **给人留一个额外并发槽。** 一条就能防住"机器把自己的主人饿死"。
- **先存后做的 outbox 按会话保序。** 确认消息必须先于结果消息到达。

不该抄：

- **单仓库、单进程、本地目录的假设。** 它明确是"一个 GitHub 仓库、跑在操作员机器上"的原型，worker 甚至没有沙箱（文档自己承认 wrapper 只是默认值，不是安全边界）。要做多项目就得换执行层。
- **没有知识沉淀的上下文模型。** 这是它的设计取舍（注意力优先），不是通用最优。
- **把"不读代码"写成 prompt 规则而不是工具约束。** 它在文档里也承认这是提示词规则，模型可以不听。

---

## 4. 横向：三个把机制写清楚的实现

同一件事在 2026 年被三家独立做了一遍，公开程度不同。Claude Code 的文档最细，Cursor 的最粗但产品最完整，dsh 有源码。

### 4.1 Claude Code Projects：把"项目上下文"拆成三层

结构：一个协调会话 + 若干 thread。thread 默认是云会话，需要本机能力时经 Remote Control 落到本地。每个云 thread 有自己的分支，干完开 PR。

三层上下文，各管各的：

| 层 | 内容 | 生命周期 | 谁写 |
|---|---|---|---|
| Project memory | 需求、决策、坑，存成文件；入口索引 `MEMORY.md`，每个云 thread 启动时读索引，需要时再打开其它文件 | 跟着项目 | Claude 自己写，人可在 Project settings > Memory 里读写删 |
| Project instructions | 一段给每个新 thread 和协调者的说明，上限 16,000 字符 | 跟着项目 | 人写 |
| 仓库里的 `CLAUDE.md` | 某个仓库怎么构建、怎么测 | 跟着仓库 | 人写 |

关键区分：**项目记忆与机器级 auto memory 是两套东西，都叫 `MEMORY.md` 但互不相通；项目记忆也不等于仓库的 `CLAUDE.md`。** 规则落在哪一层有明确判断标准——只跟这个仓库有关的规则写进仓库，跟整个项目有关的写进项目记忆。

另外两条设计值得记：

- **协调者的上下文是有界设计，不是靠压缩。** 文档原话是：thread 自动压缩，而协调会话"从最近的消息、最近的 thread 和项目记忆工作，而不是完整历史"。也就是说协调者看不到全过程，只看到结论和状态。这既是成本控制，也是它保持响应的原因。
- **状态用 Overview 面板收敛。** 面板只回答一个问题：哪些 thread 需要你。等人回答、PR 待评审、正在跑，三态。

Claude Code 另外还有四条并行的路，和 Projects 是并列而非包含关系：subagents（会话内委派，回摘要）、agent view（人工派发多个后台会话）、agent teams（lead + 队友 + 共享任务表 + 互相发消息，实验性，且**不做 worktree 隔离**，要求人工划分文件归属）、dynamic workflows（用脚本编排大量 subagent 并交叉验证）。这个排列本身就是个结论：**协调方式要按"谁在协调"和"worker 要不要互相说话"来分，而不是一套架构包打天下。**

### 4.2 Cursor Projects：把上下文压成一个文件集

见第 1、2 节。它的独特点是**共享上下文是跨机器同步的文件集**，云上和本地执行环境共享同一份，因此"某个 agent 摸清了怎么测某个服务"这个知识对之后所有 agent 立即可用。Claude Code 的项目记忆是"每个 thread 启动时读"，Cursor 的措辞是"sync across every machine"，更强调实时一致。

代价也在这里：多机并发写同一个文件集必然要合并。

### 4.3 dsh-superagent：把授权做成对象

见第 3 节。它没有项目级知识沉淀，但把"这次工作凭什么被允许"做成了不可变记录。Cursor 和 Claude Code 在这块都是靠账号权限加提示词，dsh 是唯一把它写进域模型的。

### 4.4 横向对比

| | 工作单元 | 上下文载体 | 协调者 | 隔离 | 触发 |
|---|---|---|---|---|---|
| Cursor Projects | Project（长期） | 跨机同步的文件集 | 有，不写代码 | VM / worktree / branch 三级 | 人 + 订阅（Slack、PR、CI、定时） |
| Claude Code Projects | Project + thread | 三层：项目记忆文件 + 项目说明 + 仓库 CLAUDE.md | 有，不写代码 | 云 VM / 本地 Remote Control / worktree | 人 + 云定时任务 |
| dsh-superagent | Ticket（一次授权） | Thread 事件流 + 分层 prompt | 有，且被禁止读代码 | 会话 + 目录（worktree） | 人 + 订阅（GitHub、飞书） |

三家的共识很硬：

1. **协调者不干活**，否则它就不协调了。
2. **上下文必须外置成 agent 能自己读的东西**，不是塞进 prompt，也不是塞进向量库。三家里两家选了文件，一家选了事件流加分层 prompt。
3. **隔离粒度决定并行上限**：进程内 < worktree < VM。

三家都没解决的是：**项目上下文的质量控制**。谁都能往里写，没人负责淘汰。Cursor 用"越用越有效"描述它，Claude Code 给了人一个编辑界面，但都没有自动的冲突消解与过期机制。这是留给后来者的空位。

---

## 5. 论文侧：只有零件，没有整机

直接研究"Project 这个对象"的论文没有。有的是四个零件方向，每个方向都能直接指导实现。

### 5.1 记忆的写入与巩固

这一支的共识比想象中一致：**写入门控比检索算法重要。**

- **MemGPT**（[2310.08560](https://arxiv.org/abs/2310.08560)，2023-10）把上下文窗口当内存、外部存储当磁盘，用"缺页中断"式的换入换出管理。它的真正贡献不是分层，是承认了**上下文是有限资源，必须显式调度**。
- **A-MEM**（[2502.12110](https://arxiv.org/abs/2502.12110)，2025-02）用 Zettelkasten 的方式让笔记互相建链，新笔记进来时触发旧笔记的更新——记忆是网络，不是列表。
- **Mem0**（[2504.19413](https://arxiv.org/abs/2504.19413)，2025-04）把记忆做成生产管线：抽取、比对、增删改，用图与向量混合。
- **Zep**（[2501.13956](https://arxiv.org/abs/2501.13956)，2025-01）的核心是**时序**：知识图谱的边带有效期，事实会过期，而不是被覆盖。
- **HippoRAG**（[2405.14831](https://arxiv.org/abs/2405.14831)，2024-05）借海马体索引做 Personalized PageRank 检索，说明图结构对多跳召回有用。
- 更早的 **Generative Agents**（[2304.03442](https://arxiv.org/abs/2304.03442)，2023-04）已经给了打分公式：相关性、时近性、重要性三项加权。这个朴素做法到今天仍然是很多系统的默认。

对项目级 agent 的直接含义：**"什么该忘"比"什么该记"更关键。** 项目记忆里最毒的是过期结论——比如"这个接口返回 200 表示成功"，半年后接口改了，而那条记忆还带着当时的确信。

### 5.2 仓库级上下文

- **RepoBench**（[2306.03091](https://arxiv.org/abs/2306.03091)，2023-06）证明跨文件检索是仓库级任务的瓶颈，不是生成本身。
- **CodeRAG-Bench**（[2406.14497](https://arxiv.org/abs/2406.14497)，2024-06）系统性验证了检索能带来收益，但也指出检索器在词汇重叠低时仍然抓不到有用上下文。
- **LocAgent**（[2503.09089](https://arxiv.org/abs/2503.09089)，2025-03）用图引导做代码定位。
- **SWE-agent**（[2405.15793](https://arxiv.org/abs/2405.15793)，2024-05）的论点是 ACI——agent 与计算机之间的接口设计本身决定性能。工具面是一等公民，不是附属品。
- **Agentless**（[2407.01489](https://arxiv.org/abs/2407.01489)，2024-07）是最值得警惕的一篇：固定的"定位—修复—验证"三段流水线，在 SWE-bench Lite 上以 32% 和 0.70 美元的成本超过当时所有开源 agent。**它的意思是：如果任务能结构化，不要让模型决定下一步。**

这条对项目级系统的含义：项目上下文最有价值的部分不是叙述，是**结构化的可执行知识**——构建命令、测试命令、目录约定、已知的坑。这些东西用固定位置、固定格式放，比让模型去检索更可靠。

### 5.3 多 agent 与长程

- **MAST**（[2503.13657](https://arxiv.org/abs/2503.13657)，2025-03）用 150 条轨迹人工归纳出 14 种失败模式，再用 1600+ 条、跨 7 个框架的轨迹验证，归为三类：系统设计、agent 间失配、任务验证。作者据此认为改进空间在系统设计，而不是单纯换更强的模型。
- **Voyager**（[2305.16291](https://arxiv.org/abs/2305.16291)，2023-05）把技能存成可执行代码，可组合、可复用——记忆的单元是可运行的东西，不是描述。
- **ExpeL**（[2308.10144](https://arxiv.org/abs/2308.10144)，2023-08）从成功与失败轨迹里抽经验规则，跨任务迁移。
- **SWE-RL**（[2502.18449](https://arxiv.org/abs/2502.18449)，2025-02）用开源软件的演化历史做强化学习，让模型获得"代码是怎么变的"这类先验。
- 上下文压缩一线：**LongLLMLingua**（[2310.06839](https://arxiv.org/abs/2310.06839)）、**LLMLingua-2**（[2403.12968](https://arxiv.org/abs/2403.12968)）——压缩是成本手段，不是记忆手段，别把两者混为一谈。

### 5.4 缺口

三个明确没人做的方向，也就是可发论文或可形成差异化的地方：

1. **项目级记忆的表示与基准。** 现有基准测的是"记住对话"（LoCoMo 一类）或"修好这个 issue"（SWE-bench 一类），没有测"一个项目跨三个月、几十个会话之后，agent 该知道什么"。构造这样一个基准本身就是贡献。
2. **记忆的冲突消解。** 所有系统都在追加，没有系统在裁决"两条相反的经验哪条对"。时序图谱（Zep）给了个起点，但没解决同一时刻两条相反结论的情况。
3. **项目上下文的收益归因。** 现在只有产品方给的"6 倍 PR"这类数字，没有控制变量的研究：同样的任务，有项目记忆 vs 没有，差在哪一步。

---

## 6. 给 openhanako 的落地设计

先对齐现状，因为这套代码里已经有一半零件了。

### 6.1 现状盘点

| 已经有的 | 在哪 | 对 Projects 意味着什么 |
|---|---|---|
| 会话 / 子会话 / 权限衰减 | `core/session-coordinator.ts`、`lib/tools/subagent-tool-policy.ts` | 已经是"多 agent + 子权限不超过父权限"的结构 |
| 循环与自动唤醒 | `lib/tools/loop-control-tool.ts`、`lib/tools/automation-tool.ts` | 有"常驻"的雏形，缺"订阅外部事件" |
| 四级记忆传送带 | `lib/memory/compile.ts`：session 摘要 → today.md → daily → week → longterm → memory.md（≤2000 token），另有 facts.md 增量编译 | **这就是 files-as-memory，且已经工程化**。缺的只是作用域 |
| 事实库 + 检索 | `lib/memory/fact-store.ts`（SQLite + 标签 + FTS5，明确不用向量）、`memory-search.ts` | 检索层现成，加一个 project 维度即可 |
| 项目目录 | `shared/session-projects.ts`、`core/session-project-catalog-store.ts`（`session-projects.json`） | 目前只是 UI 分组：`id/name/folderId/order`，没有上下文、没有协调者、没有订阅 |
| 工作区指令注入 | `core/workspace-instruction-files.ts`（AGENTS.md / CLAUDE.md）、`core/agent.ts:buildSystemPrompt` | 注入点现成，项目上下文可以走同一条路 |

一句话：**执行原语齐了，缺的是把这些原语绑到"项目"这个作用域上的那层。**

### 6.2 三阶段路线

按投入产出排序，每一阶段都能单独上线、单独验证。

**P0：项目记忆层（先做这个）**

- 给 `session-projects.json` 里的项目加 `root`（工作目录）和 `memoryDir`；项目记忆落在 `~/.hanako/projects/<projectId>/memory/`，而不是用户级 `memory/`。
- 复用现有传送带，只换根目录：`today.md / daily/ / longterm.md / memory.md / facts.md` 结构不变，`assemble()` 的上限按项目另配（项目上下文比个人记忆更偏事实，可以给到 3000 token）。
- `buildSystemPrompt` 里注入 `project.md`，位置放在个人 `memory.md` **之前**——项目事实优先于个人偏好，因为它们更具体、更容易被验证。

  三层的优先级要写死，照"越具体越优先"排：**工具与权限 > 仓库 `AGENTS.md` > 项目记忆 > 个人记忆**。Claude Code 把这三层明确分开且名字都叫 `MEMORY.md` 却不互通，就是为了避免这种串味。
- `fact-store` 加 `project_id` 列（默认 NULL = 全局），检索时按当前会话的 project 过滤，跨项目命中需要显式开关（参考现有的 `cross_channel` 处理）。
- AGENTS.md 已经按 git root 找到了，项目记忆应该和它同一个根，避免两套路径规则。

这一阶段的验收标准很具体：同一个项目里第二次开会话，agent 不该再问"测试怎么跑"。

**P1：项目协调者（一个项目一个常驻会话）**

- 项目记录上挂 `coordinatorSessionId`；新建项目时创建，之后所有项目内启动的会话都是它的子会话（继承 project_id，权限取交集）。
- 协调者的工具集要克制：读项目上下文、派生子会话、给子会话发消息、收报告、写项目上下文。**不给它编辑代码的工具**——理由和 Cursor、dsh 一样：它一旦能干活就会被活占住。
- 子会话结束时的产物（PR、结论、失败原因）走一条固定回报路径，落到项目上下文和项目事件表，而不是只留在子会话历史里。
- **协调者的上下文按"有界"设计，不要指望压缩。** 它只需要三样东西：最近若干条对话、每个子会话的一行状态、项目记忆。子会话的过程细节不进它的上下文——它看不到，也不需要看到。这一条比任何压缩策略都有效。
- 这里可以直接借 dsh 的 stage 表：项目里的工作只有几种"在等什么"的状态，等人回答 / 等人评审 / 在跑 / 空闲。

**P2：订阅与常驻**

- 项目级事件源：定时（已有 loop）、GitHub PR/CI（需要新的 source）、IM 频道（已有 channel 基础设施）。
- 事件写 `project_event` 表，用 `dedupe_key` 去重，窗口内合并成一次唤醒；唤醒消息里带"请重读源"的提示，别让模型拿事件快照当现状。
- 订阅有上限和过期（Cursor 给的是 180 天，可以更短），并且允许协调者主动退订——否则项目会自己长出一堆僵尸监听。

### 6.3 数据模型草案

最小可用的四张表，都能塞进现有 SQLite：

```sql
project(id, name, root, folder_id, coordinator_session_id, created_at, settings_json)

-- 项目上下文是文件，这里只做索引，不存正文
project_context(project_id, rel_path, kind, tokens, revision, updated_at, updated_by_session)

-- 事件与订阅
project_event(id, project_id, source, kind, payload_json, dedupe_key, at, state)
project_subscription(id, project_id, source, filter_json, expires_at, created_by)

-- 事实库扩一列，而不是新表
ALTER TABLE fact ADD COLUMN project_id TEXT;   -- NULL = 全局
```

关键决定：**上下文留文件，只索引元数据。** 正文进数据库会立刻失去 grep、diff、人工编辑这三样能力，而这三样正是 files-as-memory 的全部价值。

### 6.4 上下文装配：三层注入

不要把所有项目上下文塞进 system prompt，会撑爆也会稀释。分三层：

| 层 | 内容 | 预算 | 时机 |
|---|---|---|---|
| 常驻 | `project.md`：项目是什么、目录结构、怎么跑测试、硬约束 | ≤1200 token | 每次 buildSystemPrompt |
| 检索 | `search_project_context` 工具：FTS5 + 标签 + 时间 | 按需 | 模型自己调 |
| 事件 | 本次唤醒的事件摘要（去重合并后） | ≤300 token | 唤醒时作为 user 消息，不进 system |

这和 Cursor 的"目录清单 + 按需读"是同一个思路，也和现有 `memory.md` + `search_memory` 的分工一致——所以实现上不需要新机制，只需要新的作用域和一条工具。

### 6.5 写入协议（这一节决定成败）

项目记忆最大的风险不是存不下，是**存进去垃圾然后被后续所有 agent 当事实**。四条规则：

1. **只走工具，不裸写文件。** 提供 `write_project_context(path, content, source)`，落盘前校验大小、路径白名单、来源必填。裸写文件绕不过审计。
2. **写结论，不写过程。** 一条上下文要么是"怎么验证 X"这类可复用的操作知识，要么是"我们决定用 Y 因为 Z"这类决策，要么是指向工件（PR/日志/录屏）的指针。过程叙述留在会话里。
3. **每条带来源和时间。** 格式上就是 markdown 列表项 + `<!-- src: session/xxx @ 2026-11-04 -->`。没有来源的条目在下一次巩固时优先淘汰——这是抵抗幻觉沉淀的唯一手段。
4. **append-only + 周期合并。** 平时只追加；传送带跑巩固时做三件事：去重、把矛盾条目挑出来交给人或协调者裁决、把长期没人引用又没来源的条目降权。**不要自动删除**，删除语义留给巩固这一步。

### 6.6 怎么算做成了

四个可测的指标，都能从现有日志里算：

- **冷启动轮次**：同类任务在新会话里到达第一次有效工具调用的轮数（应该下降）。
- **重复解释率**：人重复说明同一件事的次数（应该下降）。
- **上下文命中率**：`search_project_context` 的返回被后续引用/采纳的比例（太低说明写得烂，太高可能是过度依赖）。
- **人工纠正率**：项目上下文里的条目被人改掉的比例（应该下降，但不该归零——归零通常意味着没人看）。

反向指标也要盯：项目上下文 token 增长曲线。只涨不跌就是垃圾场。

---

## 7. 取舍与坑

**协调者会退化成复述者。** 一旦允许它"顺手"改点东西，它就会开始和子会话抢活，然后被长任务占住，失去唯一的价值。dsh 的应对是 prompt 里明写"路由不得改写请求：不要加需求、加实现计划、加验收标准"，并且只给它一个 30 词的路由备注额度。这条约束看着苛刻，但它防的是最常见的退化路径。

**多 agent 的失败大多不在模型能力。** 学界对多 agent 系统的实证复盘反复指向同一组原因：任务规范没说清、agent 之间信息不同步、验证缺位。工程上的对应做法是——任务描述由人写的原始材料直接给出（不要经手转述）、跨 agent 的共享状态只有一个写者、每个产物都要有可执行的验证（测试、CI、能点的预览）。

**并行不等于加速。** 并行度上去以后，瓶颈会从"agent 干活"移到"人评审"。Cursor 的做法是把产物从 diff 换成可验证的工件（日志、录屏、预览）；如果不做这个转换，并行 10 个 agent 只会让人更慢。

**成本是线性的，收益不是。** 五个子 agent 大致是五倍 token。共享上下文省下的是重复探索，不是推理本身。判断一个项目值不值得开：它是否会重复出现同类任务——一次性任务用不上项目记忆。

**文件同步一定会冲突。** Cursor 敢用文件做共享上下文，是因为它的写者主要是 agent 且大部分是追加。一旦允许多人多机同时写，就必须有合并策略（git 化、或按文件分片给不同 agent）。在单机版里这个问题不存在，别提前设计。

**记忆污染比记忆缺失更难修。** 缺失的症状是"agent 又问了一遍"，很明显；污染的症状是"agent 自信地做错"，很难归因。所以写入协议里的来源字段和巩固环节不是锦上添花，是必需品。

---

## 8. 参考

产品与文档：

- [介绍 Projects（Cursor 官方博客）](https://cursor.com/cn/blog/projects)
- [Projects 文档](https://cursor.com/docs/agent/projects.md)
- [Cloud Agents 文档](https://cursor.com/docs/cloud-agent.md)、[capabilities（订阅机制）](https://cursor.com/docs/cloud-agent/capabilities.md)
- [Subagents 文档](https://cursor.com/docs/subagents.md)、[Agents Window](https://cursor.com/docs/agent/agents-window.md)
- [AI 软件开发的第三个时代](https://cursor.com/cn/blog/third-era)
- [Claude Code Projects 文档](https://code.claude.com/docs/en/claude-projects.md)（第 4.1 节的机制来源）、[并行方式对比](https://code.claude.com/docs/en/agents.md)

开源与源码：

- [deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)
  - [000 哲学](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/000-philosophy.md)、[001 域模型](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/001-domain.md)
  - [002 授权](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/002-authorization.md)、[003 执行](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md)
  - [004 Prompt 装配](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/004-prompts.md)、[007 架构](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/007-architecture.md)

报道（二手，仅用于实验数据的转述）：

- [DeepSeek Proposes Super-Agent Architecture…](https://analyticsindiamag.com/ai-news/deepseek-proposes-super-agent-architecture-to-automate-ai-coding-workflows)
