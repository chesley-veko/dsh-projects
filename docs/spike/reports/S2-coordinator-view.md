# S2 协调者会话的视图、输入框与右栏

- 结论：部分完成
- 执行者：A 路负责人（spike 实验准备） 日期：2026-11-08
- 基线：deepseek-harness@fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159（0.2.2-rc.1 合入点），其他版本：dsh-01 实测 dsh 0.2.2-rc.1、已装 @deepseek-ai/dsh 0.2.2-rc.1、node v22.23.3；模型端点返回默认 opencode-go/deepseek-v4.1-flash；角色模型经 dump-config 核实为 agent-default-model opencode-go/deepseek-v4.1-flash。注：S0 锁定的基线 fcc0ad46 实际可达（`origin/master` 上 release-dsh-0.2.2-rc.1 的合并提交，PR #7873），比官方标签 dsh-v0.2.2-rc.1（提交 66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db）晚 811 个提交；实验运行的是该标签的发布构建，S0 行号按 fcc0ad46 引用。
- 实验代码：spikes/s2@3b7c3745fccc88aca67bef7845b1f33a645b4686

## 结论摘要（3 句以内）

S2 插件在 dsh-01 上构建、加载、创建协调者与发送消息均在 API 层通过，协调者已用默认模型回复；composer.tsx 的 children + renderSlot 未被类型系统拒绝，解释 (b) 未触发。视图 tab、接管输入框、chip 与右栏的运行时行为因 dsh 0.2.2-rc.1 web 鉴权缺陷（打印的 token 始终 401）无法打开浏览器而未验证，结论为部分完成。

## 逐项结果（表：检查项 / 结果 / 证据链接 / 备注）

| 检查项 | 结果 | 证据链接 | 备注 |
|---|---|---|---|
| 1. 两个视图注册成功，tab 出现 | 未验证（UI 受阻） | 构建产物 lib/client.js 含 conversation.view 注册；源码核实 tab 来自全部已注册条目，无按会话过滤；浏览器 UI 未打开，截图缺失。 | 源码：`conversation.view` 为 list 插槽 scope session（contract/slots.ts:285）；tab 来自 entries 的 options.id + label（apply.ts:211-222）。 |
| 2a. 切换视图（tab 栏点击） | 未验证（UI 受阻） | 源码：视图内切换按钮 openView 存在；浏览器 UI 未打开，截图缺失。 | 视图内也有切换按钮（openView），两条路径都要试。 |
| 2b. 切换会话后返回，视图恢复 | 未验证（UI 受阻） | 源码：restoreView 按会话读偏好；浏览器 UI 未打开，截图缺失。 | 源码：`restoreView` 按会话读偏好（apply.ts:224 附近）；每个会话记住自己的上次视图。 |
| 2c. 打开 main 面板再返回 | 未验证（UI 受阻） | activePanelId 无 DOM 标记，需 UI 观察；右栏探针读 data-sidebar-right-open；浏览器 UI 未打开。 | `activePanelId`（ui-layout stores.ts:19,95）无 DOM 标记，live 从 UI（哪个主面板图标高亮）+ 截图观察；右栏状态用面板探针按钮读 `data-sidebar-right-open`（SidebarRight.tsx:346）。 |
| 2d. 所有切换路径下右栏不被收起 | 未验证（UI 受阻） | 需逐路径截图 + 探针；浏览器 UI 未打开。 | 通过标准之一。若某路径收起右栏，记不通过并写清是哪条路径。 |
| 3. project-run 接管输入框并发送一条消息 | 部分通过（API 层通过，UI 发送未验证） | POST /spike-s2/api/coordinators/:id/message 返回 {ok:true}；协调者已回复（spikes/s2/evidence/s2-coord1-reply.txt）；UI 输入框发送与截图未验证（UI 受阻）。 | 发送走 `POST /spike-s2/api/coordinators/:id/message` → `agent.followup(createUserMessage({content, source:{kind:'user'}}))`。协调者是 live agent（默认模型），应回一条消息；只发不回也算发送成功，但须注明。 |
| 4. 任何时刻底部只有一个输入框 | 未验证（UI 受阻） | 需 overview / run / 普通会话各一截图；浏览器 UI 未打开。 | 接管时常驻输入框保持挂载但 display:none（overlay 语义）；截图须证明底部只看到一个输入框。反例：若 project-run 里同时看到接管输入框和常驻输入框，记不通过。 |
| 5a. chip 可见可用 | 未验证（UI 受阻） | chip 注册于 conversation.input.left，无会话门控；点击只做本地标记；浏览器 UI 未打开，截图缺失。 | chip 在 `conversation.input.left` 注册（apply.ts:470，无 owner props、无会话门控），因此出现在**所有**会话的输入栏里；点击只做本地标记（"＋ 任务"→"✓ 任务"），spike 里无后端动作。 |
| 5b. 模型选择器可见可用 | 未验证（UI 受阻） | conversation.input.model 由 ui-model-selection 注册；点开下拉与切换模型需 UI；浏览器 UI 未打开。 | `conversation.input.model` 是 single 插槽（apply.ts:473），由 ui-model-selection 注册；本 spike 只复用，不替换。检查点：点开下拉能看到 opencode-go/deepseek-v4.1-flash；切换模型后协调者下一轮是否用新模型（可选观察）。 |
| 5c. chip 与模型选择器在 project-run 里是否可见 | 未验证（UI 受阻）；构建已接受 renderSlot | 构建接受 children + renderSlot（BUILD_EXIT=0），解释 (b) 未触发；重渲染运行时效果需 UI 验证；浏览器 UI 未打开。 | 取决于接管组件内 `renderSlot` 重渲染是否生效（见 §未完成与推断项）。若生效，两者应在接管输入框下方可见；若不生效，记为观察结果并按解释 (b) 在 overview 里验收（见 README 已知风险）。 |

## 反例与故障场景

（每项至少一个反例/边界场景；live 后逐项填结果）

1. **tab 全局可见**：在普通会话（非协调者）里也能看到 project-overview / project-run 两个 tab（源码已定：`viewTabs()` 无按会话过滤）。反例操作：新建普通会话，截图 tab 栏（应有两 tab）；点开 project-run，应看到占位提示（"当前会话不是协调者"），而不是空白或报错。 【live 结果】未验证（UI 受阻）：浏览器未打开，未做新建普通会话与 tab 栏截图；源码已定 tab 无按会话过滤。
2. **接管不分视图**：project-overview 里输入框同样被接管（无可读的 active view 状态，接管只能按会话定范围）。反例操作：在 overview 里看底部——应是接管输入框，而不是常驻输入框。若 overview 里出现常驻输入框，说明 select 或 scope 与源码推断不一致，记录下来。 【live 结果】未验证（UI 受阻）：未做 overview 底部观察；源码已定无可读 active view 状态，接管按会话定范围。
3. **空消息**：在接管输入框里直接点发送（空内容）。预期：不发请求、无反应、不报错。记录实际行为。 【live 结果】API 层通过：POST 空 text 返回 400 Bad Request，未发 followup；UI 输入框空发送未验证（UI 受阻）。
4. **子代理会话不受接管**：让协调者派一个子代理，在子代理会话里看底部。预期：子代理只读 composer（priority -10，先于本 spike 的 10 被选中）仍在，接管不出现。记录实际行为。 【live 结果】未验证（UI 受阻）：未派子代理、未做子代理会话底部观察。
5. **运行中切换视图**：给协调者发一条需要较长回复的消息（"从 1 数到 30，每数一个停半秒"），在它回复过程中切换到 overview 再切回 run。预期：回复继续、输入框不重复、右栏不收起。记录实际行为。 【live 结果】部分验证：协调者对短消息已完整回复（turn completed，见会话历史）；长回复过程中切换视图的行为未验证（UI 受阻）。
6. **手动收起右栏再切换**：手动点收起右栏，然后切换一次视图。预期（待观察）：右栏保持收起（切换不应擅自展开）或被重新展开——无论哪种，如实记录；这决定"右栏常驻"在产品里的真实语义。 【live 结果】未验证（UI 受阻）：未做手动收起右栏与切换观察。
7. **刷新页面**：在 run 视图刷新浏览器。预期：回到协调者会话后恢复到 run 视图（偏好持久化）。记录实际行为；若回到 chat 视图，记为观察结果。 【live 结果】未验证（UI 受阻）：未做刷新后视图恢复观察。
8. **切换会话时输入框内容**：在接管输入框里打一半文字不发送，切到另一个会话再切回。预期（待观察）：文字是否保留。记录实际行为。 【live 结果】未验证（UI 受阻）：未做半截输入切换观察。

## 对设计的影响（需改的 ADR 或文档，给出建议措辞，不直接改 ADR）

live 结论（部分完成）：两项边界在源码层成立，UI 层未验证（鉴权受阻）；建议措辞见下方占位，待 UI 验证后确认。

> 占位：若 S2 通过但两项边界成立，建议在设计文档追加："project-overview / project-run 的 tab 对所有会话可见（宿主 tab 栏无按会话过滤），内容按会话门控；composer 接管按会话生效，同一协调者的两个视图共用接管输入框——若产品要求 project-overview 用常驻输入框、仅 project-run 接管，须上游提供可读的 active view 状态或另寻接缝。"

## 未完成与推断项（明确标注）

- **推断（源码；(f) 已由 live 证实，其余未经 live 验证）**：
  (a) 视图 tab 无按会话过滤（apply.ts:211-222）；
  (b) composer 选举规则与 overlay 语义（ui-slots/src/index.ts:300-310、ChainRenderOpts:273-290）；
  (c) 无可读的 active view 状态（ui-conversation 全仓 grep activeView/currentView 零命中）；
  (d) 右栏状态可经 DOM `data-sidebar-right-open` 观测，`activePanelId` 无 DOM 标记；
  (e) `conversation.input.left`（apply.ts:470）与 `conversation.input.model`（apply.ts:473）存在且可注册/复用；
  (f) 发送路径 `agent.followup(createUserMessage({content, source:{kind:'user'}}))`（acp 测试同款形状）。 【live 已证实：消息 POST 返回 {ok:true}，协调者已用默认模型回复（turn completed）。】
  live 实验负责逐项证实或推翻。
- **待验证的假设（构建时即见分晓）**：接管组件内用 `renderSlot` 重渲染 input.left/model，依赖注册里的 `children` 声明（composer.tsx 顶部注释）。若 dsh-01 构建时类型系统拒绝（`__renders` 要求组件 ⊆ children 声明），或运行时报重复声明/重复渲染，删掉 composer.tsx 里那两行 `renderSlot(...)` 调用，改按解释 (b) 验收（chip 与模型选择器在 project-overview 视图与普通会话里可见可用；project-run 里被隐藏记为观察结果）。这不算构建失败，是 spike 要回答的问题之一。 【live 结果】构建未拒绝（BUILD_EXIT=0），解释 (b) 未触发；运行时重渲染效果未验证（UI 受阻）。
- **未完成**：live 运行已部分执行（§8 步骤 0、1、2-API、4-API 完成；步骤 2–6 的 UI 检查因 dsh web 鉴权缺陷未执行）。UI 检查需待 dsh 修复打印 token 被拒的问题后重做；结论为部分完成。

## 复现步骤

> 在 dsh-01（Instabox）上执行。所有命令默认在 dsh-01 的网页终端里跑；`$LAB` = `/data/home/workspace/dsh-superagent-lab`。**不把任何 key/token 写进分支、日志或报告**：`OPENCODE_API_KEY` 只从 `~/.config/dsh-lab/opencode.env` 注入。

### 步骤 0 — 记录版本（不可假设）

```bash
dsh --version
node --version
npm ls -g --depth=0 @deepseek-ai/dsh   # 或 pnpm ls -g
grep -A3 "agent-default-model" $LAB/profiles/superagent/cordis.patch.yml
```

记下：DSH 构建版本、node 版本、默认模型。**若 DSH 不是 0.2.2-rc.1，停下并先报给指挥者**（基线假设变化）。

### 步骤 1 — 安装并启动 S2 测试 profile

```bash
cd ~/workspace/dsh-projects   # dsh-01 上的 checkout 位置，按实际调整
git checkout spike/s2-coordinator-view
cd spikes/s2/dsh-spike-s2 && pnpm install && pnpm build
cp -r spikes/s2/profile $LAB/profiles/spike-s2
# 确认 profiles/spike-s2/package.json 里的 link: 路径指向本机插件实际位置
cd $LAB/profiles/spike-s2 && pnpm install
```

启动（与 lab 同款方式，另开 tmux 会话，端口 3092）：

```bash
tmux new-session -d -s dsh-spike-s2 -e DSH_HOME="$LAB" -e OPENCODE_API_KEY="$(cat ~/.config/dsh-lab/opencode.env | cut -d= -f2-)" \
  "cd $LAB && dsh --profile spike-s2"
sleep 5; tmux capture-pane -t dsh-spike-s2 -p | tail -20   # 确认无报错、监听 3092
curl -s http://127.0.0.1:3092/spike-s2/api/health -H 'x-spike-request: 1'
# 预期：{"ok":true,"plugin":"dsh-spike-s2"}
```

打开浏览器 http://127.0.0.1:3092。

### 步骤 2 — 创建协调者，确认视图与 tab

```bash
curl -s -X POST http://127.0.0.1:3092/spike-s2/api/coordinators \
  -H 'x-spike-request: 1' -H 'content-type: application/json' -d '{}' | tee /tmp/s2-coord1.json
# 记下返回的 sessionId（形如 proj-coordinator-<uuid>）。
```

- 在浏览器里点左侧 "Spike S2" 主面板 → 点该协调者的 Open 按钮（或在左栏点开它）。
- **截图 A**：协调者会话的 tab 栏——预期有 chat / project-overview / project-run 三个 tab。
- **截图 B**：点 project-overview——应看到总览占位 + "切换到 project-run"按钮；底部应是**接管输入框**（见 §反例 2），并确认 chip 与模型选择器是否可见（见步骤 5）。
- **截图 C**：点 project-run（或点视图内的切换按钮）——应看到运行占位 + "切换到 project-overview"按钮；底部应是接管输入框。
- **截图 D**：新建一个普通会话，截图 tab 栏（预期仍有两 project tab，§反例 1）；点 project-run，应看到"当前会话不是协调者"占位提示；底部应是**常驻输入框**（非接管），chip 可见。

### 步骤 3 — 切换路径与右栏（每条路径都截图 + 探针）

右栏检查方法（每条路径做一次）：先确保右栏处于展开态（点右栏任一 tab 打开）；做完该路径后，点左侧 "Spike S2" 面板里的"检查右栏状态"按钮，记下"展开/收起"；再回到对话截图，确认右栏视觉上仍在。

1. **视图切换**：协调者会话里 overview ↔ run 来回切 2 次。**截图 E1/E2**。
2. **会话切换**：从协调者切到普通会话，再切回协调者。**截图 F**：回来后应恢复到切走前的视图（run 还是 overview，以实际为准，记下来）。
3. **main 面板往返**：点左侧任一 main 面板图标（例如 Spike S2 面板），再点回对话（左栏点协调者会话）。**截图 G**：记下返回后哪个主面板图标高亮（activePanelId 观察）、右栏探针结果。
4. **手动收起右栏再切换**（§反例 6）：手动收起右栏，切一次视图，记右栏是保持收起还是被展开。

### 步骤 4 — 接管输入框发送一条消息

- 在 project-run 视图的接管输入框里输入 `hello，请用一句话介绍你自己`，点发送（或回车）。
- **截图 H**：发送后——输入框应清空并显示"已发送"；对话里应出现这条用户消息；等协调者回复，**截图 I**：回复内容。
- **截图 J**：发送过程中与发送后，底部只有一个输入框（无第二个输入框出现）。
- 反例：空内容点发送（§反例 3），记行为。

### 步骤 5 — chip 与模型选择器

- **截图 K**（overview 视图底部）：chip（"＋ 任务"）与模型选择器是否可见；点 chip 一次，应变为"✓ 任务"（再点一次变回）。
- **截图 L**（project-run 视图底部）：chip 与模型选择器是否可见（取决于重渲染是否生效，见 §未完成与推断项）。
- **截图 M**：点开模型选择器下拉，确认能看到 opencode-go/deepseek-v4.1-flash；如方便，切换一次模型后给协调者发一条消息，观察它是否按新模型回复（可选）。
- **截图 N**（普通会话底部）：chip 是否可见（预期可见，§反例 1 的一部分）。

### 步骤 6 — 其余反例（§反例与故障场景 4、5、7、8）

- **4 子代理**：在协调者对话里让它派子代理跑 `pwd`；打开子代理会话，截图底部（预期只读 composer，无接管）。
- **5 运行中切换**：发长任务消息，回复过程中切换视图，截图并记行为。
- **7 刷新**：在 run 视图刷新页面，回到协调者会话，记恢复到哪个视图。
- **8 半截输入**：接管输入框打一半文字不发送，切会话再切回，记文字是否保留。

## 审核

审核人：Hark（执行代理代填，2026-11-09）。审核项按 [Spike 计划 §6](../README.md)。

1. **基线与版本**：同 S1 的基线说明（报告头已更正 `fcc0ad46` 可达性）；实测 dsh 0.2.2-rc.1、node v22.23.3、模型 opencode-go/deepseek-v4.1-flash 与报告一致。
2. **真实运行证据**：部分成立。协调者创建、消息 POST 返回 `{ok:true}`、模型回复（`s2-coord1-reply.txt`）、空消息 400 有真实证据；tab、右栏、单输入框、chip 与模型选择器全部未在 UI 观察，报告逐项标注「未验证（UI 受阻）」，未冒充通过。
3. **反例记录**：8 条反例中仅空消息与部分发送路径实际执行，其余标注未验证；tab 无按会话过滤、接管按会话生效为推断（源码），报告已标注。
4. **移除 vs 装饰**：无此问题；S2 也未把 composer 接管或 tab 注册写成「已通过」。
5. **对设计的影响**：已落到 ADR-0006 与 `docs/architecture/dsh-integration.md`（tab 全局可见、内容按会话门控；composer 按会话接管，两视图共用或插件内部按激活视图切换）。
6. **抽查复现**：协调者回复文件与构建产物在 dsh-01 可查；UI 复现受 401 限制，未复跑。

**裁决**：S2「部分完成」成立。视图/输入框设计可继续，但 UI 验收须待 DSH Web 401 修复后补测；当前不得宣称右栏常驻与单输入框已验证。

