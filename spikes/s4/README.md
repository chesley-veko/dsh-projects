# S4 DSH 原生 worker 的创建与能力（B 路）

状态：实验准备完成，待指挥者调度 live 运行（dsh-01）。
分支：`spike/s4-native-worker`（自 main 233365a）。实验代码不进 main。
本分支的工作树：`/home/hatch/workspace/dsh-projects-s4`（独立 worktree，
避免与共享 checkout 里的其他路抢分支；内容以分支为准）。

## 要回答的问题（任务书 §3 S4）

`ctx.agents.create({ sessionId, signal, meta: { cwd, agentPreset },
agentOptions, setup })` 是否满足 worker 需要。

## 已核实的接缝（deepseek-harness@fcc0ad46，全部为源码阅读结论，标「推断（源码）」）

| 接缝 | 位置 | 结论 |
|---|---|---|
| `ctx.agents.create` 签名 | `packages/core/agent/src/index.ts:61-119`（CreateAgentOptions） | sessionId（live 身份）；meta{cwd, parentSession, isSeeded, origin:'subagent', delegationDepth, agentPreset}；agentOptions；signal（仅创建期，返回前 detach）；setup（组合，不驱动） |
| setup 抛错回滚 | 同上 `:100-119` | setup 抛错/拒绝、commit 抛错或 owner dispose → scope 回滚，不公告 agent 创建；已提交的 Session 事件保留；注册项在 `agent/created` 与首次 prompt assembly 之前就存在 |
| `agentOptions` 模型字段 | `packages/core/agent/src/runtime-types.ts:31-41` | `{provider?, model?, reasoningEffort?, maxTokens?}`；model 是“由所选 provider 适配器解释的模型 id”，调用时须有已注册适配器 |
| 参考调用 | `packages/experimental/webhook/src/session.ts:110-118` | `createWebhookSession` 先 `workspaceRegistry.create(path)` 再 `agents.create({sessionId, signal, meta:{cwd: workspace.path, agentPreset}, agentOptions, setup: mount preset})`；S4 的对照点就是**不调** `workspaceRegistry.create` |
| `sessionController.create({cwd})` | `packages/api/session-controller/src/commands.ts:120-140` | workspaceId 与 cwd 二选一；只给 cwd 时会话落进单一“未分组”组，不登记 workspace；见 S0 §3 |
| `workspaceRegistry.create` | `packages/workspace/workspace/src/index.ts:222-244` | 要求已存在目录；同一规范路径复用；新 workspace prepend 到注册表最前 |
| `workspaceRegistry.list()` | `index.ts:292` | 返回全部 workspace；S4 用它数工作区数量 |
| `agents.resume` | `packages/core/agent/src/index.ts:127-144`（ResumeAgentOptions） | `{resumeSessionId, agentOptions?, signal?, setup?}`；先加载持久化，再进新 agentCtx、公告重建的 Session、await setup；setup 拒绝则 unwind，保留 pending inbox |
| `workspaceRegistry.create` vs `sessionController.create` 的区别 | S0 §3 | 前者登记 workspace（左栏多分组）；后者只给 cwd（未分组，无登记） |
| 默认模型（全局） | `packages/core/agent-default-model`（见 S0） | agent-default-model 插件配置；per-agent AgentOptions 不应改动它 |

## 设计要点

1. **create 调用复用 A 路的 spike 插件。** 本实验不另写调用方；检查写
   成对一个「暴露 agents.create 调用的插件」的步骤。接口假设见
   `plugin-interface.md`——是指挥者拿去与 A 路 S1 插件对接的契约，
   不是已实现的接口；live 前必须确认实际接口与假设一致，不一致时
   先改 checks，不改结论口径。
2. **非默认模型需要路由配合。** lab 的 llm-pi-ai 路由只列了
   deepseek-v4.1-flash；agentOptions 指定 deepseek-v4-pro 前，指挥者
   须先在 dsh-01 的 lab patch 里把 deepseek-v4-pro 加进路由 models
   列表（测试脚手架，跑完 revert）。否则模型在调用时无法解析，
   失败原因会是路由而不是 agents.create。
3. **cwd 两种形态各一次。** git worktree（真实仓库）与无仓库空目录；
   两处目录须事先存在（meta.cwd 是“已验证的绝对路径”）。
4. **不调 workspaceRegistry.create 是检查项，不是默认行为。**
   每步前后都数 `workspaceRegistry.list()`，并截图左栏。
5. **signal 有两种时态。** 创建期 abort（setup 进行中）与创建完成后
   abort（已 detach，应无效果）；两种都要测，结论分开写。
6. **重启找回依赖持久化。** lab 的 DSH_HOME 持久化会话；重启指
   dsh-01 上 `tmux kill-session -t dsh-superagent && start.sh`，不是
   机器重启。注意机器 30 分钟空闲自动暂停，重启测试须在暂停前跑完。

## 文件清单

| 文件 | 用途 |
|---|---|
| `plugin-interface.md` | 假设的 spike 插件 HTTP 接口契约（供指挥者与 A 路对接） |
| `checks.md` | 逐项检查步骤、期望结果与反例 |
| `test-fixtures.md` | worktree/空目录/路由扩展/全局默认快照的准备命令 |
| `prompts.md` | 发给 worker 的提示词（调用 probe 工具等） |
| `../docs/spike/reports/S4-native-worker.md` | 报告草稿（结论空着，待 live 证据） |

## 未验证项（必须在 live 前/中补）

- spike 插件接口是假设，未与 A 路 S1 插件对接；live 前以实际为准。
- sessionId 格式校验未核实（`spike-s4-<uuid>` 若被拒，记录原文并改用
  `webhook-<uuid>` 形态重测）。
- 0.2.2-rc.1 升级后 eval/executor 角色模型未重验（live 前复查）。
- dsh-01 的 node v22.23.3 低于 dsh 要求的 >=24.9（安装有警告但能跑）。

## 通过标准（任务书）

上述全部成立，或给出可行替代。
