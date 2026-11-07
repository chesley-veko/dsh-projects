> 归档：本节原属 `projects-teardown.md` §6，是给另一个项目 openhanako 的落地设计，与 dsh-projects 无直接关系。其中「写入协议」「怎么算做成了」两节的思路已吸收进 `docs/architecture/runtime.md` 与 `docs/architecture/roadmap.md`。

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

