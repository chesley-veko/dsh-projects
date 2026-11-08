# S4 DSH 原生 worker 的创建与能力
- 结论：（待填：通过 / 有条件通过 / 不通过 / 部分完成）
- 执行者：B 路（Spike 执行）    日期：（待填）
- 基线：deepseek-harness@fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，dsh-superagent-prototype@8c32a9d，其他版本：（待填：dsh-01 实际构建版本、node、OS、模型）
- 实验代码：spike/s4-native-worker@（待填 SHA）

## driver 实现状态（2026-11-08，live 前）

驱动插件 `spikes/s4/driver-plugin/`（`dsh-spike-s4-driver`，独立测试
profile `spikes/s4/profile/`，端口 3093，不加载 superagent）已实现
`plugin-interface.md` 的全部端点，无缺接口项：

| 端点 | 状态 | 备注 |
|---|---|---|
| `GET /spike/version` | 已实现 | 版本经 `dsh --version` / `npm root -g` 读取，失败记 null |
| `GET /spike/global-default` | 已实现 | `agentDefaultModel.currentSelection()` |
| `GET /spike/workspaces` | 已实现 | `workspaceRegistry.list()` 直接映射 |
| `POST /spike/agents.create` | 已实现 | setup 变体 `"projects-probe"` / `"none"`；`abortAfterMs` 经 creation signal 实现（有竞态，见 README） |
| `POST /spike/agents.abort` | 已实现 | 创建中 `aborted`，创建后 `noop / signal-detached` |
| `POST /spike/agents.prompt` | 已实现 | `followup` + `whenIdle()`，经 `session/event` 订阅收集当轮事件；`model` 取自最新 `request/header`，绝不回显请求值 |
| `POST /spike/agents.resume` | 已实现 | 另接受可选 `agentPreset` / `agentOptions` / `setup`；preset 默认取恢复出的 header |
| `GET /spike/agents.inspect` | 已实现 | `exists` = live 或本进程已知；持久化存在性只能由 resume 证明 |
| `GET /spike/tools.visible` | 已实现 | `tools.schemas(scope)`（屏蔽后可见集） |
| `GET /spike/system-prompt` | 已实现 | `assemble()`；返回 `{name, position, text}`，`order` 无公开接缝（见下） |
| `POST /spike/agents.compact` | 已实现 | `compactNow`；无安全区间返回 literal `null` |

契约偏差（实现与假设不一致处，全表见 `driver-plugin/README.md`
"Contract diffs"）：`system-prompt` 返回 `position` 而非 `order`
（`assemble()` 不输出 `order`）；`inspect.exists` 不含持久化存在性；
`create` 的 `cwd` 只透传、不建目录、不校验存在性；`abortAfterMs`
与 setup 完成竞态；`resume` 接受可选扩展字段。结论仍为空，待 live
运行后填。

## 结论摘要（3 句以内）
（待填）

## 逐项结果（表：检查项 / 结果 / 证据链接 / 备注）
| 检查项 | 结果 | 证据链接 | 备注 |
|---|---|---|---|
| 1 预生成 sessionId 后创建 | （待填） | （待填） |  |
| 1 同一 sessionId 创建两次 | （待填） | （待填） | 反例 |
| 2 agentOptions 非默认模型首轮即用 | （待填） | （待填） |  |
| 2 全局默认模型未被改 | （待填） | （待填） | 前后快照 diff |
| 2 路由外模型失败位置 | （待填） | （待填） | 反例 |
| 3 cwd 指向 git worktree | （待填） | （待填） |  |
| 3 cwd 指向无仓库空目录 | （待填） | （待填） |  |
| 3 cwd 指向不存在目录被拒 | （待填） | （待填） | 反例 |
| 4 setup 注册 Projects 工具并被调用 | （待填） | （待填） |  |
| 4 无 setup 的会话调 probe 失败 | （待填） | （待填） | 反例 |
| 5 不调 workspaceRegistry.create，工作区数量不变 | （待填） | （待填） | 每次创建前后 count |
| 5 对照：走 Ticket 创建确实多分组 | （待填） | （待填） | 反例（证明量表有效） |
| 6a 创建期 abort：创建失败、agent 未公告、事件残留 | （待填） | （待填） |  |
| 6a abort 后 resume | （待填） | （待填） |  |
| 6b 创建完成后 abort 无效果 | （待填） | （待填） |  |
| 7 DSH 重启后按 sessionId 找回并引用历史 | （待填） | （待填） |  |
| 7 resume 不存在 sessionId | （待填） | （待填） | 反例 |

## 反例与故障场景
（待填：见 checks.md 各项反例的实际行为）

## 对设计的影响（需改的 ADR 或文档，给出建议措辞，不直接改 ADR）
（待填）

## 未完成与推断项（明确标注）
- spike 插件接口已实现（`spikes/s4/driver-plugin/`，见上节“driver 实现状态”），
  不再是纯假设；但 live 运行尚未做，表中结论仍为空。S3 的驱动缺口由同一
  插件解：S3 用 fence preset + `setup: "none"` 创建协调者，走同一
  `/spike/agents.prompt` / `/spike/agents.compact` / `/spike/tools.visible` /
  `/spike/system-prompt` 端点。
- 以下为推断（源码），未算作通过：agents.create / setup 回滚 /
  resume / workspaceRegistry 与 sessionController 的区别机制（见
  spikes/s4/README.md 接缝表，引 deepseek-harness@fcc0ad46 行号）。
- 驱动实现时的推断（源码）：`agent.ctx` 上的 `session/event` 订阅能收到
  该 agent 的事件；`ctx.agentDefaultModel` / `ctx.compaction` 不注入也可读；
  bundle 行可省略 `client` 条目——三者均在 `driver-plugin/README.md`
  标注，live 冒烟时验证。
- 路由临时扩展 deepseek-v4-pro 的 revert 情况：（待填）。

## 复现步骤
1. 同步分支 spike/s4-native-worker 到 dsh-01（分支未 push，指挥者
   安排传输）。
2. 按 spikes/s4/test-fixtures.md 备好目录、路由扩展、全局默认快照、
   版本与角色模型复查。
3. 按 `spikes/s4/driver-plugin/README.md` 安装并启动驱动（standalone
   profile 端口 3093，或挂进 lab profile 走 3082），跑冒烟 curl：
   health / version / global-default / workspaces / 一次 create+inspect+
   prompt+compact。驱动与 plugin-interface.md 的偏差见该 README
   "Contract diffs"，已同步进 checks.md。
4. 按 spikes/s4/checks.md 与 prompts.md 逐项执行，取证按
   plugin-interface.md 的返回字段存档。
