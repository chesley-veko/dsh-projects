# 文档目录

## 现行设计

| 文档 | 内容 |
|---|---|
| [product/intent.md](product/intent.md) | 产品意图：对标 Cursor Projects、差异化、核心体验、原则、范围外、待拍板决策 |
| [architecture/overview.md](architecture/overview.md) | 问题、设计原则、分层、两条授权路径、任务生命周期 |
| [architecture/domain-model.md](architecture/domain-model.md) | 对象与不变量、显示状态推导、UI 操作到命令的映射、Mandate/Run capability、Evidence provenance、SQLite Schema |
| [architecture/execution.md](architecture/execution.md) | 执行者 × 模型 × 位置：RunSpec、DSH 原生 / ACP 两种传输、能力降级、位置提供者、环境规格、本地 ⇄ 云端交接、best-of-N、projects-mcp、凭据 |
| [architecture/runtime.md](architecture/runtime.md) | Engine 与 effect、协调者工具集、worker 与 worktree、Question Tray、Driver、Library 与记忆、环境、生命周期、预算 |
| [architecture/dsh-integration.md](architecture/dsh-integration.md) | 已核实的 DSH 客户端 / 服务端扩展点、陷阱、从 dsh-superagent 复用什么、M0 前 spike |
| [architecture/roadmap.md](architecture/roadmap.md) | Spike、M0–M4 与验收、度量；含验证策略信任、capability、receipt/reconcile、Host 失联故障门槛 |
| [spike/README.md](spike/README.md) | M0 前 Spike 计划：S0–S7 工作包、通过标准、报告模板、审核清单 |
| [design/interaction-spec.md](design/interaction-spec.md) | 交互规格（原型的文字版） |
| [design/prototype-alignment.md](design/prototype-alignment.md) | 原型与架构的冲突、已修正项、待补项 |
| [design/dsh-native-ui.md](design/dsh-native-ui.md) | DSH 原生侧栏、对话头、过程控件、输入区规则 |
| [design/screenshots.md](design/screenshots.md) | 原型截图集 |
| [adr/](adr/) | 架构决策记录（含实施前验证、授权、外部 effect 对账、Host 可用性和仓库执行信任决策） |

## 调研

| 文档 | 内容 |
|---|---|
| [research/projects-teardown.md](research/projects-teardown.md) | Cursor Projects、Claude Code Projects、dsh-superagent 拆解与论文索引 |
| [research/cursor-findings.md](research/cursor-findings.md) | Cursor Projects 客户端源码细节：外观、状态、Files Changed |
| [research/loopx.md](research/loopx.md) | LoopX 深度拆解：域模型、存储、控制循环、DSH 集成、可借鉴与不该照搬 |
| [research/oss-survey.md](research/oss-survey.md) | Vibe Kanban、Agent Orchestrator、opencode、OpenHands、Backlog.md、Task Master、claude-squad、crystal 对比 |
| [research/dsh-capabilities.md](research/dsh-capabilities.md) | DSH 现有能力审计：ACP、SSH、沙箱、子代理、模型、worktree、forge |
| [research/external-agents-cloud.md](research/external-agents-cloud.md) | Cursor Projects 云 / 本地、Claude Code、Codex、ACP、多执行器编排器、云端底座、凭据条款 |
| [research/dsh-source-verification.md](research/dsh-source-verification.md) | 旧设计中关于 DSH / dsh-superagent 的说法逐条源码核查 |

## 约定

- 名词以 [domain-model.md](architecture/domain-model.md) 为准，代码、UI、文档不另起别名。
- 改变结构的决定先写 ADR，再改架构文档。
- 架构文档描述「现在要做成什么样」；历史版本进 `archive/`，不在现行文档里保留过时内容。
- 引用宿主源码时写明版本与 `file:line`。
