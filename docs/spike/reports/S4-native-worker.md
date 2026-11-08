# S4 DSH 原生 worker 的创建与能力
- 结论：部分完成（有条件通过）——核心路径已验证，但文档指定的 worker preset 与全局默认模型路径被驱动缺口阻断；检查 1、检查 4 反例未按预期成立。
- 执行者：B 路（Spike 执行）    日期：2026-11-08
- 基线：deepseek-harness@fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，dsh-superagent-prototype@8c32a9d，其他版本：dsh 0.2.2-rc.1，node v22.23.3，模型 opencode-go/deepseek-v4.1-flash（全局默认），lab 覆盖 cordis 4.1.0、dsh-tools 0.2.2-rc.1、schemastery 3.19.0
- 实验代码：spike/s4-native-worker@70d8c13164fa4fcb894201c53dd172d3fe9dacd7（live 时 HEAD；报告提交见 git log）

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
其余契约偏差见 driver-plugin/README.md。

## 结论摘要（3 句以内）
live 运行 7 项检查：核心创建、提示词、恢复与历史引用路径成立。但文档指定的 dsh-superagent-worker preset 因工具重复注册无法挂载，全局默认模型因 agentDefaultModel 未注入无法被驱动读取，检查 1 与检查 2 的默认模型子项被阻断，检查 4 的无 setup 调 probe 失败反例不成立（S3 fence preset 已全局提供该工具）。路由 deepseek-v4-pro 临时扩展已按计划 revert 并验证。

## 逐项结果（表：检查项 / 结果 / 证据链接 / 备注）
| 检查项 | 结果 | 证据链接 | 备注 |
|---|---|---|---|
| 1 预生成 sessionId 后创建 | FAIL | spikes/s4/evidence/check1.txt |  |
| 1 同一 sessionId 创建两次 | PASS | spikes/s4/evidence/check1.txt | 反例 |
| 2 agentOptions 非默认模型首轮即用 | PASS | spikes/s4/evidence/check2.txt |  |
| 2 全局默认模型未被改 | PASS | spikes/s4/evidence/check2.txt | 前后快照 diff |
| 2 路由外模型失败位置 | PASS | spikes/s4/evidence/check2.txt | 反例 |
| 3 cwd 指向 git worktree | PASS | spikes/s4/evidence/check3.txt |  |
| 3 cwd 指向无仓库空目录 | PASS | spikes/s4/evidence/check3.txt |  |
| 3 cwd 指向不存在目录被拒 | NOT AS EXPECTED | spikes/s4/evidence/check3.txt | 反例 |
| 4 setup 注册 Projects 工具并被调用 | PASS | spikes/s4/evidence/check4.txt |  |
| 4 无 setup 的会话调 probe 失败 | FAIL | spikes/s4/evidence/check4.txt | 反例 |
| 5 不调 workspaceRegistry.create，工作区数量不变 | PASS | spikes/s4/evidence/check5.txt | 每次创建前后 count |
| 5 对照：走 Ticket 创建确实多分组 | NOT DONE | spikes/s4/evidence/check5.txt | 反例（证明量表有效） |
| 6a 创建期 abort：创建失败、agent 未公告、事件残留 | PARTIAL | spikes/s4/evidence/check6.txt |  |
| 6a abort 后 resume | PASS | spikes/s4/evidence/check6.txt |  |
| 6b 创建完成后 abort 无效果 | PASS | spikes/s4/evidence/check6.txt |  |
| 7 DSH 重启后按 sessionId 找回并引用历史 | PASS | spikes/s4/evidence/check7.txt |  |
| 7 resume 不存在 sessionId | PASS | spikes/s4/evidence/check7.txt | 反例 |

## 反例与故障场景
- 1. 检查 1：文档预设 dsh-superagent-worker 因工具重复注册无法挂载，改用 standard preset 创建成功；check1.txt 保存的是 standard 路径，预设挂载失败原文未落入该文件，见未完成项说明。
- 2. 检查 1 反例：同一 sessionId 创建两次，第二次被拒，报错 agent already live，见 check6.txt 相关记录。
- 3. 检查 2：无 agentOptions 的新会话首轮提示词无模型，model 为 null，modelSource 为 none，报错未设置 provider 与 model。
- 4. 检查 2：全局默认模型读取失败，GET /spike/global-default 报错 cannot get property agentDefaultModel without inject，改用 dump-config 验证未变。
- 5. 检查 2 反例：路由外模型 glm-5.3 首轮提示词失败，pi-ai provider opencode-go 无该配置模型，失败在模型解析层而非创建层。
- 6. 检查 3 反例：cwd 指向不存在目录未被拒，创建成功，harness 不校验 cwd 存在性，预期不成立。
- 7. 检查 4 反例：无 setup 会话调 probe 未失败，setup none 同样可调 spike_projects_probe 并返回 PROBE-OK-51D2，反例不成立。
- 8. 检查 5 对照：走 Ticket 建议创建多分组未做，量表有效性未用对照验证。
- 9. 检查 6a：创建期 abort 竞态，abortAfterMs 200ms 时 setup 已完成，abort 返回 noop 与 signal-detached，创建未失败。
- 10. 检查 7 反例：resume 不存在 sessionId 报错 session not found，符合预期。

## 对设计的影响（需改的 ADR 或文档，给出建议措辞，不直接改 ADR）
- 1. 修复 dsh-superagent-worker 预设的工具重复注册，或将文档默认预设改为 standard，否则文档指定路径不可用。
- 2. 让 agentDefaultModel 可注入或由驱动可读，修复 /spike/global-default 的 without inject 报错，否则无 agentOptions 会话无模型可用。
- 3. 明确 agents.create 的 cwd 语义：校验存在性，或文档化只读传、不建目录、不校验存在性。
- 4. 明确 setup 注册工具的可见性边界：S3 fence preset 全局提供 spike_projects_probe，setup none 也能调用，需重新界定工具隔离。
- 5. 明确 abort 语义与竞态窗口：abortAfterMs 与 setup 完成竞态，创建后 abort 为 noop 与 signal-detached，需文档化其含义与 abort 后 resume 行为。
- 6. 保留 workspacesRegistry.create 不被原生 worker 创建触发的结论，并补做 Ticket 多分组对照以证明量表有效。
- 7. 保留 resume 按 sessionId 找回与利用历史的能力，以及 resume 不存在 sessionId 返回 not found 的明确错误语义。

## 未完成与推断项（明确标注）
- spike 插件接口已实现（`spikes/s4/driver-plugin/`，见上节“driver 实现状态”），
- spike 插件接口已实现，见上节 driver 实现状态，不再是纯设计；live 运行已于 2026-11-08 完成，7 项检查全部执行并验证，逐项结果见上表。
  插件解：S3 用 fence preset + `setup: "none"` 创建协调者，走同一
  `/spike/agents.prompt` / `/spike/agents.compact` / `/spike/tools.visible` /
  `/spike/system-prompt` 端点。
- 以下仍为推断，未算作通过：setup 回滚，以及 workspaceRegistry 与 sessionController 的区别机制；agents.create 与 resume 已由 live 检查 1 与检查 7 验证，不再是推断。
  resume / workspaceRegistry 与 sessionController 的区别机制（见
  spikes/s4/README.md 接缝表，引 deepseek-harness@fcc0ad46 行号）。
- 驱动实现时的推断（源码）：`agent.ctx` 上的 `session/event` 订阅能收到
- 驱动实现时的推断已部分证伪：live 显示 ctx.agentDefaultModel 不注入时不可读，GET /spike/global-default 报错 cannot get property agentDefaultModel without inject；其余推断仍见 driver-plugin/README.md 标注，未算作通过。
  bundle 行可省略 `client` 条目——三者均在 `driver-plugin/README.md`
  标注，live 冒烟时验证。
- 路由临时扩展 deepseek-v4-pro 的 revert 情况：已 revert 并经 sha256 验证：routing-before.txt 与 routing-after.txt 各 7 条记录，diff 为空；终检时 3082 模型接口 200，模型列表仅 deepseek-v4.1-flash，/spike/health 正常。
- 证据口径说明：check1.txt 保存的是 standard preset 成功路径，未保存 dsh-superagent-worker 挂载失败原文与同一 sessionId 重复创建原文；重复创建报错 agent already live 见 check6.txt，预设失败结论以 live 运行观察为准。

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
