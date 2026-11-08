# S4 DSH 原生 worker 的创建与能力

- 结论：有条件通过 —— `ctx.agents.create` 的核心路径全部成立，driver 的 inject/默认模型/compaction 缺口已修，检查 1、2、4（含反例）本轮通过；检查 3、5 本轮补了新证据，检查 6、7 沿用 retry #2 的通过记录；检查 5 的「走 Ticket 确实多分组」对照仍未做。
- 执行者：B 路（Spike 执行） 日期：2026-11-09（UTC；live 运行 2026-11-08 17:00–17:50 UTC）
- 基线：deepseek-harness@66491b05（tag `dsh-v0.2.2-rc.1`；源码阅读接缝引 master 合并点 fcc0ad46）
- 版本：dsh 0.2.2-rc.1（`npm root -g` 全局包同为 0.2.2-rc.1），node v22.23.3，Linux instabox-dsh-01 6.18.60-instabox，模型 opencode-go/deepseek-v4.1-flash（全局默认）；实验室 3082（`spikes/s4/evidence/r3-env.txt`）
- 实验代码：spike/s4-native-worker@ff1f2f3（driver 修复：inject、默认模型、agent 作用域 compaction）
- 依赖修复：lab 侧 `spikes/s3/relink-host-packages.sh`（profile 重复 `@deepseek-ai` 包软链到宿主副本）——S4 检查 4 的反例成立依赖它，见 S3 报告「根因与修复」。

## driver 实现状态（本轮 live 后）

`/spike/*` 端点全部可用，无 503/缺少 inject 的端点：

| 端点 | 本轮结果 |
|---|---|
| `GET /spike/version` | 200，`{dshVersion:"0.2.2-rc.1", dshPackageVersion:"0.2.2-rc.1", node:"v22.23.3", os, harnessSha:"fcc0ad46", model:"opencode-go/deepseek-v4.1-flash"}` |
| `GET /spike/global-default` | 200，`{provider:"opencode-go", model:"deepseek-v4.1-flash"}` |
| `GET /spike/workspaces` | 200，count=1（含 superagent 自己的 machine workspace） |
| `POST /spike/agents.create` | 200 `{sessionId, status:"created", agentPreset, cwd}`；重复 id 409 `agent ... is already registered` |
| `POST /spike/agents.prompt` | 200，含 reply/model/calls/usage/errors |
| `GET /spike/agents.inspect` | 200，`status:"live"`、cwd、agentPreset、model、workspaceCount、globalDefaultModel |
| `GET /spike/tools.visible` | 200，返回 agent 实际可见工具名 |
| `GET /spike/system-prompt` | 200，`{name, position, text}` |
| `POST /spike/agents.compact` | 200，真实压缩结果；短历史返回字面量 `null`；无引擎的 preset 返回 503 |
| `POST /spike/agents.resume` | 200（resume 活跃会话 409）；不存在 sessionId 返回 500 `session ... not found` |

本轮修复的三处（详见 `spikes/s4/driver-plugin/README.md`「Live fixes after retry #2」）：

1. `inject` 补 `agentDefaultModel`、`sessions`（部署级服务），version/global-default/inspect 恢复。
2. `compaction` 不是 profile 根服务：preset 的 compaction 组被 isolate，compact 端点改走 `agentPresets.serviceFor(agent, 'compaction')`。
3. `agentOptions` 省略时由驱动套用 `ctx.agentDefaultModel.currentSelection()`（与 `experimental/webhook/src/session.ts:57-58` 一致；`AgentRegistry.create` 本身不套默认模型）。

## 逐项结果

| 检查项 | 结果 | 证据链接 | 备注 |
|---|---|---|---|
| 1 预生成 sessionId 后创建（`dsh-superagent-worker` preset，不传 agentOptions） | 通过 | `spikes/s4/evidence/r3-check1b.json` | create 200 `status:created`；inspect `status:live`、`agentStatus:idle`、cwd=`/data/home/workspace/spike-s4-test/wt-1`、model=`opencode-go/deepseek-v4.1-flash` |
| 1 首轮模型为全局默认 | 通过 | `spikes/s4/evidence/r3-check1b.json` | `prompt1` 的 `model` 取自 `request/header`：`opencode-go/deepseek-v4.1-flash`；usage 4830/92/null/null |
| 1 反例：同一 sessionId 创建两次 | 通过 | `spikes/s4/evidence/r3-check1b.json` | 第二次 409：`agent "spike-s4-310feb67-…" is already registered` |
| 2 agentOptions 指定非默认模型，首轮即用 | 通过 | `spikes/s4/evidence/r3-check2.json` | worker B 首轮 `model=opencode-go/deepseek-v4-pro`（回复 `deepseek-v4-pro（provider: deepseek）`） |
| 2 普通会话仍用全局默认 | 通过 | `spikes/s4/evidence/r3-check2.json` | 不传 agentOptions 的对照会话首轮 `model=opencode-go/deepseek-v4.1-flash` |
| 2 全局默认未被改 | 通过 | `spikes/s4/evidence/r3-check2.json` | 前后 `/spike/global-default` 与 dump-config 的 agent-default-model 均 opencode-go/deepseek-v4.1-flash，无 diff |
| 2 反例：路由外模型失败位置 | 通过 | `spikes/s4/evidence/r3-check2.json` | `glm-5.3`：create 成功，首轮 prompt `errors=["pi-ai provider \"opencode-go\" has no configured model \"glm-5.3\""]`，失败在模型解析层 |
| 2 路由临时扩展已 revert | 通过 | `spikes/s4/evidence/r3-env.txt`、`r3-dump-config-excerpt.txt` | 终态 dump-config 的 llm-pi-ai models 只有 deepseek-v4.1-flash；global-default 已复查 |
| 3a cwd 指向 git worktree | 通过 | `spikes/s4/evidence/r3-check3.json` | 模型报 `/data/home/workspace/spike-s4-test/wt-1`，是 git 仓库，分支 `spike-wt-1` |
| 3b cwd 指向无仓库空目录 | 通过 | `spikes/s4/evidence/r3-check3.json` | 模型报 `empty-1` 绝对路径并明确「不是 git 仓库」，无报错 |
| 3 反例：cwd 指向不存在目录 | 不符合预期（记录为发现） | `spikes/s4/evidence/r3-check3.json` | create 仍 200，inspect 回显该 cwd；harness 只校验绝对路径，不校验存在性；驱动按要求只透传，不 mkdir |
| 4 setup:"projects-probe" 注册并被调用 | 通过 | `spikes/s4/evidence/r3-check4.json` | `tools.visible` 含 `spike_projects_probe`；prompt 的 calls：`spike_projects_probe → PROBE-OK-51D2`；追问轮会话正常 |
| 4 反例：setup:"none" 看不到也调不了 probe | 通过 | `spikes/s4/evidence/r3-check4.json` | 重启后 19 个工具中无 `spike_projects_probe`；让它调用时模型核对后回答「不在当前可用工具列表」，未产生 probe 调用（只用了 bash/read 自查） |
| 5 不调 workspaceRegistry.create，工作区数不变 | 通过（计数证据） | `spikes/s4/evidence/r3-check5.json` | 检查 1/2/3/4 创建的会话 inspect 的 `workspaceCount` 均为 1；基线 `/spike/workspaces` count=1 |
| 5 对照：走 Ticket 创建确实多分组 | 未做 | — | 沿用 retry #2 的未完成项；量表有效性仍无对照证据 |
| 6a 创建期 abort | 沿用 retry #2 | `spikes/s4/evidence/check6.txt` | 竞态：setup 完成后 abort 返回 noop/signal-detached；本轮未重跑 |
| 6b 创建完成后 abort 无效果 | 沿用 retry #2 | `spikes/s4/evidence/check6.txt` | 同上 |
| 7 DSH 重启后按 sessionId 找回并引用历史 | 沿用 retry #2 | `spikes/s4/evidence/check7.txt` | 本轮未重跑（本轮多次重启后会话仍按 sessionId resume，未单独取证历史引用） |
| 7 反例：resume 不存在 sessionId | 通过（本轮顺带） | `spikes/s4/evidence/check7.txt`、`spikes/s3/evidence/r3-2-step2.json` | `session ... not found` |

## 反例与故障场景

- **检查 4 假阴性（retry #2）**：根因与 S3 的 `scopeOf` 失效同一个——lab profile 里重复安装的 `@deepseek-ai/dsh-tools`/`dsh-scope` 让 setup 里的 `agentCtx.tools.register(probe)` 找不到 scope，工具被静默注册成全局工具，`setup:"none"` 的会话也能调。修 `relink-host-packages.sh` 并重启清掉全局注册后，反例成立（19 个工具里没有 probe，且模型无法调用）。
- **`dsh-superagent-worker` preset 挂载失败（retry #2）**：同一根因（工具重复注册）导致的 mount 抛错；本轮该 preset 正常挂载，检查 1/2/3/4 都直接用它。
- **检查 2 反例**：路由外模型 create 成功、首轮 prompt 失败，错误为 `pi-ai provider "opencode-go" has no configured model "glm-5.3"`；失败点在模型解析，不在 `agents.create`。
- **检查 3 反例**：不存在的 cwd 未被拒绝（create 200、inspect 回显该路径、模型轮次无回复内容）。结论是「harness 未校验 cwd 存在性」，驱动不替它补校验。
- **compaction 端点两次踩坑**：先是缺 `inject`（`cannot get property "compaction" without inject`），补 inject 后仍是 503，因为 compaction 服务在 preset 组内被 isolate；最终用 `agentPresets.serviceFor` 读，短历史返回 `null`、长历史真实压缩（S3 步骤 3）。
- **`/spike/agents.inspect` 的 `exists` 语义**：`status:"unknown"` 只表示「本驱动进程记录到一次创建失败」，不是 harness 公告过该 agent。检查 2 步骤 2 的失败会话即此形态（S3 证据 `r3-2-step2.json`）。

## 对设计的影响（建议措辞，不直接改 ADR）

- 建议 ADR 明确：`AgentRegistry.create` 不应用全局默认模型，**入口负责**把 `ctx.agentDefaultModel.currentSelection()` 合进 `agentOptions`；引用 `experimental/webhook/src/session.ts:57-58` 作为参考实现。这样「不传 agentOptions = 全局默认」才成立。
- 建议 ADR 明确 compaction 的取用方式：引擎由 preset 组合提供且被 isolate，调用方用 `agentPresets.serviceFor(agent, 'compaction')`；profile 根不挂 compaction 服务是部署常态（dsh-web-app 把顶层 compaction-basic disabled）。
- 建议 ADR 写明 `agents.create` 的 cwd 语义：只校验绝对路径、不建目录、不校验存在性；调用方如需目录存在必须自己保证（驱动透传是刻意的）。
- 建议 ADR 写明部署约束：profile 目录不得与宿主重复安装 `@deepseek-ai/*`（或用 `relink-host-packages.sh` 软链），否则 `scopeOf` 类故障会以「restrict 抛错 / setup 注册漏成全局工具 / preset 挂载失败」等形式散点出现。
- 保留 retry #2 已确认的结论：同一 sessionId 二次创建被拒（409 / already registered）、resume 按 sessionId 找回、不存在 sessionId 报 not found、`workspaceRegistry.create` 不被原生 worker 创建触发。

## 未完成与推断项（明确标注）

- 检查 6a/6b（signal 两态）与检查 7（重启后历史引用）本轮未重跑，引用 retry #2 的 `check6.txt`/`check7.txt`；本轮代码修复不触及 signal/resume 路径，但这仍是「沿用旧证据」而不是「本轮复验」。
- 检查 5 的对照（走 Ticket 创建确认左栏多分组）未做，计数方法的检出能力仍未被对照证明。
- 检查 3「不存在 cwd 未被拒」是观察结果，不是通过项；是否要在上层补校验属 ADR 决策。
- `abortAfterMs` 与 setup 完成的竞态仍在（retry #2 已记录），本轮未再验证窗口。
- 只在 Linux（x64）、dsh 0.2.2-rc.1 上验证；0.2.1-alpha.2 的 superagent 侧不适用。
- 独立 profile（3093）本轮未启动；所有 S4 检查都在 lab 3082 上跑。driver 的 inject 在独立 profile 下是否同样成立未单独验证（`agent-default-model`、`session` 由 dsh-base 提供，理论上成立，但未取证）。

## 复现步骤

1. 同步 `spike/s4-native-worker` 到 dsh-01，`cd spikes/s4/driver-plugin && pnpm install && pnpm build`（产物 `lib/index.js`）。
2. 跑 `spikes/s3/relink-host-packages.sh`（S4 检查 4 的反例依赖它；不跑会复现 probe 全局泄漏）。
3. lab profile：`package.json` 加 `dsh-spike-s4-driver: link:<path>` 与 bundles 行，`cordis.patch.yml` 加 `- id: dsh-spike-s4-driver / config: {}`（提交版 `driver-plugin/cordis.patch.yml` 的 bundles 映射在 0.2.2-rc.1 上不可用，本地修复未提交），`pnpm install`，`~/workspace/dsh-superagent-lab/start.sh`。
4. 检查 2 需要临时把 `deepseek-v4-pro` 加进 lab patch 的 `llm-pi-ai.providers.opencode-go.models`，跑完 revert 并复查 dump-config（本次已 revert，证据 `r3-env.txt`）。
5. 按 `checks.md`、`prompts.md` 逐项调用 `/spike/*`（所有请求带 `x-orchestrator-request: 1`），证据落 `spikes/s4/evidence/`（gitignored，本轮前缀 `r3-`）。
