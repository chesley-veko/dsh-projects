# 架构总览

> 状态：现行（v3，2026-11-08）。产品意图见 [../product/intent.md](../product/intent.md)。取代 `archive/docs/handoff-2026-11-04.md` 与 `archive/docs/dsh-project-layer-2026-11-04.html` 中的落地方案。
> 依据：`deepseek-harness@fcc0ad46`、`dsh-superagent-prototype@8c32a9d`、`loopx@8a4d4f9` 源码核查（见 [research/dsh-source-verification.md](../research/dsh-source-verification.md)），以及 [research/](../research/) 下的开源调研。

## 1. 要解决的问题

把 agent 的工作单元从「一次会话」提升为「一个持久项目」：

- **冷启动失忆**：每个新会话重新摸一遍怎么构建、怎么测。
- **人肉路由**：并行 5 个会话时，人在窗口间切换，盯谁卡住、谁 CI 红了。
- **会话坟场**：左栏堆满自动命名的会话，半成品分支无人接手。

产品形态（见 [design/interaction-spec.md](../design/interaction-spec.md)）：左栏是项目列表，中栏是常驻的**协调者**会话，右栏是 `List | Board | Library` 项目面板；协调者拆任务、派 worker、收结果，不自己写代码。每个任务可以选**谁做**（DSH 自身、Claude Code、Codex 等）、**用什么模型**、**在哪做**（本地 worktree 或云端），交付分支、PR 与可验证的证据。

## 2. 设计原则

1. **单一真相，其余皆投影。** 所有项目状态由一个单写者引擎写入 SQLite；看板、协调者摘要、左栏徽标、托盘都是只读投影。（LoopX、dsh-superagent）
2. **只存事实，显示状态读时推导。** 存意图（人的决定）与事实（会话活动、PR/CI、提问、证据），不存「In Progress」这类显示状态。（Agent Orchestrator）
3. **验证先于完成。** worker 自报完成只是候选；独立验证（测试命令、CI、PR merged）写入证据后，任务才算完成、记忆才能转正。（LoopX：Decide → Execute → Validate → Commit）
4. **边界写进工具，不写进提示词。** 协调者在工具层面没有写文件、执行命令、长时间等待的能力。（Agent Orchestrator、agtx、dsh-superagent 的教训）
5. **先存后做。** 副作用（启动会话、投递消息、git、GitHub）在事务内入队，提交后执行，失败退避重试，进程重启可恢复。（dsh-superagent）
6. **人永远优先。** 人的输入优先于自动续跑；并发槽之外给人的跟进留一个额外槽；自动化不得替等待中的会话作答。
7. **只用宿主真实存在的扩展点。** 不做 DOM 注入，不依赖 CSS Module 哈希类名。缺插槽就向上游提，或换交互承载方式。
8. **执行者 × 模型 × 位置正交。** 每次运行记录不可变的 RunSpec；外部执行者统一走 ACP；agent 进程跟着代码走；git 分支是交接介质；云端只用用户自己的 API Key（[execution.md](execution.md)）。

## 3. 分层

```mermaid
flowchart TB
  subgraph Client["client（DSH 客户端插件）"]
    Home["Projects 首页面板\n(sidebar.panellist → main)"]
    Tab["右栏 Project Tab\nList | Board | Library"]
    Tray["输入框托盘与胶囊\n(conversation.input.overlay / composer.dock)"]
    Badge["会话行徽标\n(sidebar.session.row.*)"]
  end
  subgraph Server["server（Cordis 服务端插件）"]
    API["HTTP + SSE\n/projects"]
    Tools["协调者 / worker 工具"]
    Drv["Driver：监听 agent/status、inbox、pre-step"]
  end
  subgraph Core["core（纯 TS，无宿主依赖）"]
    Eng["Engine（唯一写者）"]
    Derive["状态推导"]
  end
  Store[("store-sqlite\nprojects.sqlite + change_log")]
  Exec["executor-host\nDSH 原生会话 / ACP client\n统一事件流"]
  Loc["locations\nlocal / ssh / docker / sandbox\n检出 · 起进程 · 交接"]
  MCP["projects-mcp\nask_human / task_report / context_*"]
  Git["git\n分支 / preserved ref / refs 同步"]
  Intake["intake\nSource → Eval → Mandate\n(复用 dsh-superagent)"]
  Client <--> API
  Tools --> Eng
  Drv --> Eng
  API --> Eng
  API --> Derive
  Eng --> Store
  Eng -- effects --> Exec
  Eng -- effects --> Loc
  Eng -- effects --> Git
  Exec --> Loc
  Exec -.-> MCP
  MCP --> Eng
  Intake --> Eng
```

| 包 | 职责 | 不负责 |
|---|---|---|
| `core` | 域模型、命令、不变量、状态推导 | 任何 I/O |
| `store-sqlite` | `node:sqlite`、迁移、事务、`change_log` | 业务规则 |
| `server` | 注册 Cordis 服务、工具、HTTP/SSE、Driver | 直接写表（必须经 Engine） |
| `executor-host` | 执行者驱动（dsh-native、acp）、探测、模型目录、统一事件流、权限请求转 Question | 决定何时启动 |
| `locations` | 位置提供者（local / ssh / docker / sandbox）：检出、install、起进程、交接、回收、健康检查 | 选择位置 |
| `projects-mcp` | 给所有执行者的统一工具面 | 业务规则（转发给 Engine 命令） |
| `git` | 分支、refs 同步、preserved ref、WIP 提交 | 合并 PR |
| `intake` | 外部事件准入（GitHub / 飞书），产出 Mandate | 交互式对话路径 |
| `client` | 全部 UI | 业务状态（只读投影 + 发命令） |

依赖单向：`client → server（HTTP）`；`server → core / store-sqlite / executor-host / locations / projects-mcp / git / intake`；`executor-host → locations`；`core` 不依赖任何包。

## 4. 两条授权路径

| 路径 | 来源 | 准入 | 产物 |
|---|---|---|---|
| 交互 | 人在协调者会话里说话，协调者调用工具 | 人的消息本身就是显式授权，工具调用时直接签发 | `mandate{origin: chat, granted_by: <user>, scope}` |
| 外部 | GitHub 评论、PR、飞书消息 | 复用 dsh-superagent 的确定性 gate + 模型 assessment | `mandate{origin: source, …}` |

两条路径产出同一种 Mandate 记录，审计统一。这取代了旧方案「把人的消息伪装成 Trigger、修改 superagent 的 Eval 幂等键」的做法（见 [ADR-0001](../adr/0001-own-engine.md)）。

## 5. 一次任务的完整生命周期

1. 人对协调者说需求 → 协调者首句确认 → 调 `task_create` 拆出 Task（`intent=ready`），并为每个 Task 推荐 RunSpec（执行者 · 模型 · 位置）。
2. 人在启动摘要确认或修改 → Engine 排队：依赖满足、槽位可用 → 入队 `checkout.prepare`。
3. 位置提供者检出分支、跑 install → `executor-host` 起执行者（本地 DSH 走原生会话，其余走 ACP）并投递任务原文、检出说明、`INDEX.md`、相关 runbook，挂上 projects-mcp。
4. worker 运行；统一事件流写入 `activity` 与 `run_event`；右栏实时推导状态。
5. worker 需要人（`ask_human` 或执行者的权限请求）→ Question → 协调者会话托盘浮出 → 人一键回答，直达该运行。
6. worker 声明完成 → validator 跑项目的验证命令 → 写 Evidence（verified / failed）→ 以合成消息回报协调者。
7. PR 观察者同步 PR / CI / review；CI 失败、review 意见自动回流给拥有该分支的 worker。
8. 人接受（或 PR 合并且已验证）→ Task 完成；必须附后继 Task 或 `no_followup` 理由。
9. 回收：未提交改动存为 preserved ref，按策略删除 worktree，保留分支。

## 6. 文档地图

- 域模型、不变量、状态推导、Schema：[domain-model.md](domain-model.md)
- 执行者 × 模型 × 位置、交接、best-of-N、凭据：[execution.md](execution.md)
- 引擎、协调者、worker、提问、记忆、生命周期：[runtime.md](runtime.md)
- DSH 宿主集成与插槽清单（已核实）：[dsh-integration.md](dsh-integration.md)
- 里程碑与验收：[roadmap.md](roadmap.md)
- 决策记录：[../adr/](../adr/)
- 交互规格与原型对齐：[../design/](../design/)
