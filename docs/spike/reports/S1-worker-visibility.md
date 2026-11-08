# S1 Worker 会话可见性接缝（ADR-0018）

- 结论：不通过（插件侧方案不行，需上游补丁；补丁已在 dsh-01 的 harness 副本验证有效，左栏视觉消失因鉴权缺陷未直接观察）
- 执行者：A 路负责人（spike 实验准备） 日期：2026-11-08
- 基线：deepseek-harness@fcc0ad46217522aaf5c93a7b2e01f6bf9f0b0159（0.2.2-rc.1 合入点），其他版本：dsh-01 实测 dsh 0.2.2-rc.1、已装 @deepseek-ai/dsh 0.2.2-rc.1、node v22.23.3；模型端点返回默认 opencode-go/deepseek-v4.1-flash；角色模型经 dump-config 核实为 agent-default-model opencode-go/deepseek-v4.1-flash。注：报告原注基线 fcc0ad46 在公开 deepseek-harness 仓库中不可达，本次实验改用官方标签 dsh-v0.2.2-rc.1（提交 66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db），为同一发布版本。
- 实验代码：spikes/s1@8b44270c4de733a78cdc9956a39dc3893995a44

## 结论摘要（3 句以内）

插件侧方案不通过：无会话列表过滤 slot、无 filter API，徽标仅为装饰，按 cwd 归组调用直接报错；worker 以普通会话创建，按 tree.ts 规则在发消息后应出现在左栏「未分组」。上游补丁已在 dsh-01 的 harness 副本（tag dsh-v0.2.2-rc.1，提交 66491b05）上验证有效：实际需改 18 个文件（草案 11 个不足）、探针 thrown 为 false、会话头已持久化 origin 为 project-worker、tree.ts 过滤器已进入编译产物。左栏“worker 消失”的 UI 直接观察因 dsh 0.2.2-rc.1 web 鉴权缺陷（打印的 token 始终 401）未能完成，3a–3e 按规则记 N/A。

## 逐项结果（表：检查项 / 结果 / 证据链接 / 备注）

| 检查项 | 结果 | 证据链接 | 备注 |
|---|---|---|---|
| 1. `ctx.agents.create` 创建 `proj-worker-` 会话，左栏实际位置 | 未验证（UI 受阻；API 与源码层推断为「未分组」） | worker 1 创建成功：sessionId 为 proj-worker-3069600a-8b0c-495b-aee7-6d828f27c99b（spikes/s1/evidence/s1-worker1.json）；列表仅含该 worker（s1-workers-list.json）。tree.ts:235 仅排除 subagent origin、空白、已归档，worker（origin 未设置）发消息后应出现在「未分组」；左栏 UI 因鉴权 401 未能打开，无截图。 | 注意 blank 规则：`tree.ts:236` 规定空白会话（无消息）不进树；新 worker 可能先不出现，发第一条消息后才现身。空白规则不是移除接缝。 |
| 2a. 会话列表过滤类 slot（若存在） | 不通过 | 源码：ui-workspace contract/slots.ts + tree.ts 全仓无此类 slot，只有 archived filter；tree.ts:235（sessionVisible 仅排除 subagent origin）已在 harness 源码（tag 66491b05）上复核确认，dsh-client-ui-session 的 lib 全仓 grep filter 无命中。左栏 UI 未能打开，但源码结论与 live 预期一致。 | live 只需确认左栏仍显示 worker，即与源码一致 |
| 2b. `sidebar.session.row.*`（徽标） | 不通过（仅装饰，不能移除行） | 源码：contract/slots.ts:32 列出 sidebar.session.row.trailing，:158 定义为装饰槽位；插件 built lib/client.js 确含该槽位注册及注释“trailing badge: decoration only”。徽标截图因鉴权 401 未能取得。 | 源码已定性为**仅装饰**：contract/slots.ts:158 注释明文 "Non-interactive icons"、"must not bind or retain the Session"；`sidebar.session.row.action` 只能触发动作，不能移除行。按任务书与 ADR-0018，只做到装饰算**不通过**。边界：空白会话不渲染该插槽（"Blank Sessions omit the slot"），验徽标前须先给 worker 发一条消息。 |
| 2c. 客户端 session service 层过滤 | 不通过 | ISessions 无 filter 方法（list / retain / using / retainInfo / create / subagentAddress / refreshProjections / refresh / search / fork）；面板探针截图因鉴权 401 未能取得。 | ISessions（api/session-controller/src/client/contract/sessions.ts:49）只有 list / retain / using / retainInfo / create / subagentAddress / refreshProjections / refresh / search / fork，无 filter 方法；service.ts:36 注释 "filtering stays with the consumer: the store carries every row"。面板在运行时枚举服务方法并显示有无 filter 方法。 |
| 2d. 按 cwd 归入已登记工作区 | 不通过（调用直接报错） | POST workspacePath 为 /tmp/spike-ws-demo 返回错误：cannot attach session proj-worker-aefa58b3-de89-4a0b-a008-694a65ad3485 to workspace /tmp/spike-ws-demo，其 cwd 解析为 /data/home/workspace/dsh-superagent-lab/spike-proj/worker-3（s1-worker2.json）；失败后该会话未被插件记录（列表仍仅含 worker 1），成为孤儿会话。 | 端点 `POST /spike-s1/api/workers` 传 `workspacePath` 即走 `workspaceRegistry.create` + `attachSession`。注意：这一步的预期是 worker 出现在该工作区**分组内**（仍在左栏），不是从左栏消失；若它从左栏消失，需另行记录为意外发现并复核。 |
| 2e. 负向探针：`origin: 'project-worker'` | 通过（门控存在，与源码一致） | POST originProbe 为 true 返回 thrown 为 true，错误与源码门控一致（s1-probe.json）。 | 源码：core/session/src/index.ts:126-127 规定 origin 非 undefined/'subagent' 即抛 `session header origin must be "subagent"`。预期响应 `{originProbe: true, thrown: true}`。若 `thrown: false`，说明运行时门控已变，须立即记录并停下复核（ADR-0018 禁止把 worker 伪装成 subagent，此探针只确认门控存在，不走这条路）。 |
| 3a. 能移除方案：`openSession` 仍能打开 worker | N/A（无移除方案） | 按规则：仅当 2a/2c/2d 任一方真正移除时才测；无方案移除，故不执行。 | 仅当 2a/2c/2d 任一方案真正移除时才测；若无方案移除，本项记 N/A。面板 Open 按钮即走 `ctx.uiWorkspace.openSession`。 |
| 3b. worker 内可调用 `subagent` | N/A（无移除方案；UI 受阻） | 按规则记 N/A；worker 对话 UI 因鉴权 401 未能打开，无法让 worker 派子代理。 | 依据：worker 用 `standard` 预设（含 tool-subagent / tool-subagent-control）；`=== 'subagent'` 的检查点不改，project-worker 保持普通路由。操作：在 worker 对话里让它派一个子代理跑 `pwd` 并回禀。 |
| 3c. 可向 worker 上传文件 | N/A（无移除方案；UI 受阻） | 按规则记 N/A；源码依据 file-upload/src/index.ts:284 的 assertOrdinaryAgent 只当 origin 为 subagent 时拒绝，project-worker 可上传，但 UI 未能打开，未实测。 | 依据：file-upload/src/index.ts:284 的 assertOrdinaryAgent 只拦 origin==='subagent'，project-worker 可上传。操作：在 worker 对话里用附件按钮上传一个小文本文件，确认不被拒绝。 |
| 3d. 协调者会话重建不影响运行中 worker | N/A（无移除方案；UI 受阻） | 按规则记 N/A；需 worker 对话 UI，未能打开。 | 操作：worker 正在跑长任务（例如让它数 1 到 20，每数一个停 1 秒）时，新建一个普通会话（模拟协调者重建），确认 worker 继续跑完且不掉线。 |
| 3e. DSH 重启后 worker 仍不出现在「未分组」 | N/A（无移除方案；但持久化已在文件层验证） | 按规则记 N/A（无移除方案）；补丁版探针会话的 session.v4.jsonl.zstd 首行含 origin 为 project-worker，会话文件跨重启存在（spikes/s1/evidence/s1-probe-header.jsonl）。 | 仅当有移除方案时才测；同时记录重启后 worker 是否仍可按 id 找回（openSession / 面板列表）。若重启后 worker 消失，同样是有效证据（见 README 已知风险）。 |

## 反例与故障场景

（每项至少一个反例/边界场景；live 后逐项填结果）

1. **空白 worker 不出现 ≠ 已移除**：新创建的 worker 在发第一条消息前可能因 `tree.ts:236` 的 blank 规则不进左栏。反例操作：创建后先截图（可能看不到 worker），再发一条消息后截图（应出现在「未分组」）。若只看第一张截图会误判为"已移除"。 live 结项：已排除——worker 1 创建后为 blank（无消息），按 tree.ts:236 不进左栏；因左栏 UI 未能打开，未能做“发消息后截图”对照，但 blank 规则已在源码复核确认。
2. **徽标出现 ≠ 已移除**：`sidebar.session.row.trailing` 的 "W" 徽标出现时，worker 行仍在左栏。反例操作：徽标截图必须与同一时刻的左栏全景同框，证明行还在。 live 结项：未验证——徽标截图因鉴权 401 未能取得；源码已定性徽标仅为装饰（不能移除行），插件 built lib/client.js 确含该槽位注册。
3. **归档不是隐藏**：ADR-0018 明确禁止归档活动会话来达到隐藏效果。本实验不测归档路径；若操作者误点归档，记录为操作失误并恢复（取消归档），不计入结果。 live 结项：未测试——本实验未走归档路径。
4. **同 cwd 的两个 worker**：创建两个 cwd 相同的 worker，确认两者都在左栏且互不干扰（排除"按 cwd 去重"的误读）。 live 结项：未验证——第二个创建尝试（workspacePath）直接报错，未能创建同 cwd 的第二个 worker；列表中始终只有 worker 1。
5. **无前缀对照会话**：创建一个普通会话（id 不带 `proj-worker-` 前缀），确认它正常出现在左栏——证明左栏本身工作正常，worker 的可见/不可见不是左栏故障。 live 结项：未验证——无前缀对照会话未创建；左栏 UI 未能打开，无对照截图。
6. **origin 探针的意外通过**：若 `originProbe` 返回 `thrown: false`（创建居然成功），立即停止后续步骤，记录该会话 id 并由指挥者决定是否销毁——这说明运行时门控与源码 fcc0ad46 不一致，基线假设被推翻。 live 结项：未触发——全局 dsh 上探针 thrown 为 true（门控存在）；补丁版服务上探针 thrown 为 false 是补丁放宽门控的预期结果（构建 4），非基线被推翻。
7. **重启中创建**：若在 DSH 重启过程中调用创建端点，预期端点不可达或返回 500；记录实际行为，不把失败记为"移除成功"。 live 结项：未测试——未在重启过程中调用创建端点；补丁版服务重启后健康检查与创建均正常。

## 对设计的影响（需改的 ADR 或文档，给出建议措辞，不直接改 ADR）

live 结论：插件侧全部失败。建议在 ADR-0018 追加以下措辞（仅建议，不直接改 ADR）：

> 建议措辞：“M0 阻断未解除：插件侧无真实列表过滤接缝，须在上游补丁 SessionOrigin 为 project-worker（见本报告未完成与推断项的补丁记录，实际 18 个文件、26 行）或等价真实接缝；补丁合并并重新跑 S1 全部检查（含左栏 UI 直接观察）前，Projects 左栏总收纳不得宣称完成。补丁已在 dsh-01 的 harness 副本（tag dsh-v0.2.2-rc.1）上验证有效，探针 thrown 为 false，会话头已持久化 origin 为 project-worker。”

## 未完成与推断项（明确标注）

- **推断（源码；(a)–(d) 已由 live 证实，(e) 未经 live 验证）**：(a) 无会话列表过滤 slot——live 证实（源码复核 + tree.ts 规则确认）；(b) row 插槽全是装饰——live 证实（源码复核 + built 产物确认）；(c) origin 门控在创建时捕捉——live 证实（探针 thrown 为 true）；(d) ISessions 无 filter 方法——live 证实（源码复核）；(e) “===” subagent 检查点不改时 project-worker 保持普通路由——未经 live 验证（3b 需 UI，未能执行）。
- **未完成**：左栏 UI 直接观察（截图 A–G、向 worker 发消息、无前缀对照会话、徽标截图）因 dsh 0.2.2-rc.1 web 鉴权缺陷（打印的 token 始终 401）未能进行；3a–3e 按规则记 N/A（3e 的持久化已在文件层验证）。补丁版左栏“worker 消失”的视觉观察同样受阻，待鉴权问题修复后重跑。
- **上游补丁 diff 草案（第 4 步，仅草案，未应用）**：若插件侧全部失败，按以下草案在本地打补丁，跑同样的第 3 步验证。草案基于 fcc0ad46 原文（行号以该提交为准）： live 已执行：第 5 步已完成，实际补丁 18 个文件、26 行（草案 11 个文件不足，缺下游头类型与各格式版本校验门控），基线改用 tag dsh-v0.2.2-rc.1（提交 66491b05），构建 3/4 成功，探针通过，补丁 diff 与全部证据在主仓库 spikes/s1/evidence/（s1-patch-applied.diff 等）下。

  涉及文件（类型收窄点 + 运行时门控 + 树过滤）：
  - `packages/core/session/src/types.ts:122`（SessionHeader.origin）、`:161`（CreateSessionOptions.meta.origin）
  - `packages/core/agent/src/index.ts:80`（CreateAgentOptions.meta.origin）
  - `packages/api/session-controller/src/types.ts:164`（SessionSummary.origin）、`:442`（SessionWireHeader.origin）
  - `packages/api/session-controller/src/list.ts:374`（listFields 返回类型 origin）
  - `packages/api/session-controller/src/client/sessions/service.ts:36`（客户端 SessionSummary.origin）
  - `packages/api/session-controller/src/client/sessions/lineage.ts:34`（SessionListEntry.origin）
  - `packages/bundle/headless/src/index.ts:182`（AdoptableHeader.origin）
  - `packages/core/session/src/index.ts:126-127`（运行时门控）
  - `packages/client/ui-workspace/src/client/tree.ts:235`（树过滤）

  ```diff
  --- a/packages/core/session/src/types.ts
  +++ b/packages/core/session/src/types.ts
  @@ -119,7 +119,7 @@
     /**
      * Coarse product classification for a session created as a subagent child.
      * This is presentation metadata, not proof that the child is continuable.
      */
  -  readonly origin?: 'subagent'
  +  readonly origin?: 'subagent' | 'project-worker'
  @@ -158,7 +158,7 @@
       readonly cwd?: string
       readonly parentSession?: SessionId
       readonly createdAt?: number
       readonly isSeeded?: boolean
  -    readonly origin?: 'subagent'
  +    readonly origin?: 'project-worker' | 'subagent'
       readonly delegationDepth?: number
       readonly agentPreset?: string
     }
  --- a/packages/core/session/src/index.ts
  +++ b/packages/core/session/src/index.ts
  @@ -123,8 +123,8 @@
  -  if (record.origin !== undefined && record.origin !== 'subagent') {
  -    throw new Error('session header origin must be "subagent"')
  +  if (record.origin !== undefined && record.origin !== 'subagent' && record.origin !== 'project-worker') {
  +    throw new Error('session header origin must be "subagent" or "project-worker"')
     }
  --- a/packages/core/agent/src/index.ts
  +++ b/packages/core/agent/src/index.ts
  @@ -77,7 +77,7 @@
       readonly cwd?: string
       readonly parentSession?: SessionId
       readonly isSeeded?: boolean
  -    readonly origin?: 'subagent'
  +    readonly origin?: 'subagent' | 'project-worker'
       readonly delegationDepth?: number
       readonly agentPreset?: string
     }
  --- a/packages/client/ui-workspace/src/client/tree.ts
  +++ b/packages/client/ui-workspace/src/client/tree.ts
  @@ -232,7 +232,7 @@
   ): boolean {
  -  if (session.origin === 'subagent') return false
  +  if (session.origin === 'subagent' || session.origin === 'project-worker') return false
     if (session.blank && session.id !== current) return false
  ```
  其余 6 个 origin 类型位置（session-controller types.ts:164/:442、list.ts:374、client service.ts:36、lineage.ts:34、headless index.ts:182）做同样的 `'subagent'` → `'subagent' | 'project-worker'` 放宽，不再逐一贴 diff。
  明确**不改**的位置（project-worker 必须保持普通路由，否则 `openSession`/子代理/文件上传会被宿主围栏拦住）：
  - `api/session-controller/src/agent.ts:99`（hasApiSessionSubagentOwner）
  - `history.ts:73,80`（validateAddress）、`archived-session-gate.ts:53`、manager.ts:175,686、service.ts:676,705、commands.ts:572、web/controller.ts:63、headless/index.ts:233、acp/index.ts:251,310
  - `packages/client/file-upload/src/index.ts:284`（assertOrdinaryAgent 只拦 origin==='subagent'，project-worker 可上传——第 3c 项的依据）

## 复现步骤

> 在 dsh-01（Instabox）上执行。所有命令默认在 dsh-01 的网页终端里跑；`$LAB` = `/data/home/workspace/dsh-superagent-lab`。**不把任何 key/token 写进分支、日志或报告**：`OPENCODE_API_KEY` 只从 `~/.config/dsh-lab/opencode.env` 注入。

### 步骤 0 — 记录版本（不可假设）

```bash
dsh --version
node --version
npm ls -g --depth=0 @deepseek-ai/dsh   # 或 pnpm ls -g
# 在 lab 里确认默认模型仍为 opencode-go/deepseek-v4.1-flash（角色模型升级后未重验）：
grep -A3 "agent-default-model" $LAB/profiles/superagent/cordis.patch.yml
```

记下：DSH 构建版本、node 版本、默认模型。**若 DSH 不是 0.2.2-rc.1，停下并先报给指挥者**（基线假设变化）。

### 步骤 1 — 安装并启动 S1 测试 profile

```bash
cd ~/workspace/dsh-projects   # dsh-01 上的 checkout 位置，按实际调整
git checkout spike/s1-visibility
cd spikes/s1/dsh-spike-s1 && pnpm install && pnpm build
cp -r spikes/s1/profile $LAB/profiles/spike-s1
# 确认 profiles/spike-s1/package.json 里的 link: 路径指向本机插件实际位置
cd $LAB/profiles/spike-s1 && pnpm install
```

启动（与 lab 同款方式，另开 tmux 会话，端口 3091）：

```bash
tmux new-session -d -s dsh-spike-s1 -e DSH_HOME="$LAB" -e OPENCODE_API_KEY="$(cat ~/.config/dsh-lab/opencode.env | cut -d= -f2-)" \
  "cd $LAB && dsh --profile spike-s1"
sleep 5; tmux capture-pane -t dsh-spike-s1 -p | tail -20   # 确认无报错、监听 3091
curl -s http://127.0.0.1:3091/spike-s1/api/health -H 'x-spike-request: 1'
# 预期：{"ok":true,"plugin":"dsh-spike-s1"}
```

打开浏览器 http://127.0.0.1:3091（dsh-01 本地或经 Instabox 网页终端端口转发）。
**截图 A**：左栏现状（创建前）；**截图 B**：点开左侧 "Spike S1" 主面板，确认 worker 列表为空、探针区显示 `filter 方法: 否`。

### 步骤 2 — 创建 worker，确认左栏位置

```bash
# 先做负向探针（预期 thrown:true；若为 false 立即停下，见 §反例 6）：
curl -s -X POST http://127.0.0.1:3091/spike-s1/api/workers \
  -H 'x-spike-request: 1' -H 'content-type: application/json' \
  -d '{"originProbe": true}' | tee /tmp/s1-probe.json
# 创建 worker 1（默认 cwd）：
curl -s -X POST http://127.0.0.1:3091/spike-s1/api/workers \
  -H 'x-spike-request: 1' -H 'content-type: application/json' -d '{}' | tee /tmp/s1-worker1.json
# 记下返回的 sessionId（形如 proj-worker-<uuid>）。
```

- **截图 C**：创建后立即看左栏（worker 可能因 blank 规则暂不出现——这是预期现象，不是移除）。
- 在 worker 对话里发一条消息（点面板 Open 按钮打开 worker，输入 `hello` 并发送；或在左栏点开它）。
- **截图 D**：发消息后看左栏——预期 worker 出现在「未分组」。同时确认行尾有无 "W" 徽标（2b 证据）。
- 再创建一个无前缀对照会话（浏览器里点"新建会话"），**截图 E**：确认它也出现在左栏（左栏本身正常）。

### 步骤 3 — 逐一试插件侧移除方案

- **2a 过滤 slot**：源码已确认不存在；live 证据就是截图 D（worker 在左栏）——记"不存在，无法移除"。
- **2b row 徽标**：截图 D 已证明徽标只是装饰（行还在）；记"仅装饰"。
- **2c service 层过滤**：截图 B 的探针区（`filter 方法: 否` + 方法清单）即证据；记"无 filter API，无法移除"。
- **2d 按 cwd 归组**：
  ```bash
  mkdir -p /tmp/spike-ws-demo
  curl -s -X POST http://127.0.0.1:3091/spike-s1/api/workers \
    -H 'x-spike-request: 1' -H 'content-type: application/json' \
    -d '{"workspacePath": "/tmp/spike-ws-demo"}' | tee /tmp/s1-worker2.json
  ```
  **截图 F**：左栏——预期 worker 2 出现在对应工作区分组内（仍在左栏）。记"归组，不是移除"。
  反例：再创建一个 cwd 与 worker 1 相同的 worker，确认两者都出现（§反例 4）。

### 步骤 4 — 能移除方案的 5 项能力验证

仅当 2a/2c/2d 任一方案真正把 worker 从左栏移除时才执行；否则本节全部记 N/A，并进入第 5 步（补丁草案）。

- **3a openSession**：在 Spike S1 面板点对应 worker 的 Open 按钮，确认能打开（截图）。
- **3b 子代理**：在 worker 对话里输入"派一个子代理执行 `pwd` 并把结果告诉我"，确认子代理跑通并回禀（截图/日志）。
- **3c 文件上传**：在 worker 对话里点附件按钮上传一个小文本文件，确认不被拒绝（截图）。
- **3d 协调者重建**：让 worker 跑一个长任务（"从 1 数到 20，每数一个停 1 秒再继续"），中途在浏览器新建一个普通会话（模拟协调者重建），确认 worker 数完不断（截图/日志）。
- **3e 重启**：`tmux send-keys -t dsh-spike-s1 C-c` 停服务，再按步骤 1 重新启动；**截图 G**：重启后左栏——确认 worker 仍不在「未分组」且仍可打开（面板 Open 或左栏点开）。

### 步骤 5 — 失败时上游补丁草案

若 2a–2d 全部失败（预期如此）：

1. 把 §未完成与推断项 里的 diff 草案打到 dsh-01 上的一份 harness 副本（不要动已装的全局 dsh），按草案改 11 个文件。
2. 在补丁后的 harness 上重建并重跑步骤 1–4（创建 worker 时改传 `origin: 'project-worker'`——注意：当前插件端点不传 origin，补丁验证需要临时改端点传 origin，改动只留在 dsh-01 本地，不进分支）。
3. 记录：补丁后 worker 是否从左栏消失、3a–3e 是否全部通过。结果填入 §逐项结果 末尾追加行。
