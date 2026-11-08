# dsh-projects

在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）上实现对标 Cursor Projects 的 **Projects**：一个常驻协调者统筹多个任务，每个任务可以选**谁做**（DSH 自身、Claude Code、Codex…）、**用什么模型**、**在哪做**（本地 worktree 或你自己的云端），交付分支、PR 与可验证的证据。左栏是项目，中栏是协调者，右栏是 `List | Board | Library` 项目面板。

![DeepSeek 卡](docs/assets/screenshots/deepseek.png)

## 当前阶段

| 部分 | 状态 |
|---|---|
| 交互原型 `prototype/index.html` | 可用，纯前端，浏览器直接打开 |
| 产品意图 | [docs/product/intent.md](docs/product/intent.md)（含待拍板的决策） |
| 架构设计 v5 | [docs/architecture/overview.md](docs/architecture/overview.md)、[执行层](docs/architecture/execution.md) |
| 实现 | S0–S7 Spike 已完成（[汇总](docs/spike/reports/README.md)）；下一步是 M0 最薄闭环，见 [路线图](docs/architecture/roadmap.md) |

## 先读这些

1. [产品意图](docs/product/intent.md)：要做成什么、和 Cursor Projects 的异同、不做什么
2. [架构总览](docs/architecture/overview.md)：设计原则、分层、一次任务的生命周期
3. [执行层](docs/architecture/execution.md)：执行者 × 模型 × 位置、交接、凭据
4. [域模型](docs/architecture/domain-model.md)：对象、不变量、状态推导、Schema
5. [交互规格](docs/design/interaction-spec.md)：三栏界面、启动摘要、运行视图、交接、设置
6. [决策记录](docs/adr/)：为什么这样设计

完整目录见 [docs/README.md](docs/README.md)。

## 打开原型

```bash
open prototype/index.html          # 默认 DeepSeek 色卡
open "prototype/index.html?brand=claude"   # Claude 色卡
```

状态都在内存里，刷新即还原；环境偏好记在 localStorage。深链：`#board`、`#library`、`#detail=YOU-4`、`#tray`、`#new`、`#project=bzti`。截图集见 [docs/design/screenshots.md](docs/design/screenshots.md)。

## 仓库结构

```
prototype/            交互原型（单文件）与字体
docs/
  product/            产品意图
  architecture/       现行架构：总览、执行层、域模型、运行时、宿主集成、路线图
  design/             交互规格、原型对齐、DSH 原生 UI 规则、截图集
  adr/                架构决策记录
  research/           调研：LoopX、开源对比、外部 agent 与云端、DSH 能力审计、源码核查
  assets/screenshots/ 原型截图
archive/              已被取代的原型版本与旧设计稿，只读留档
```

## 参考

- [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- [deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)
- [loopx-project/loopx](https://github.com/loopx-project/loopx)
- [BloopAI/vibe-kanban](https://github.com/BloopAI/vibe-kanban)、[OrchestratorInc/agent-orchestrator](https://github.com/OrchestratorInc/agent-orchestrator)、[sst/opencode](https://github.com/sst/opencode)
