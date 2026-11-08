# S3 协调者工具围栏与 INDEX 注入

- 结论：通过（有条件）——围栏、guard、白名单 probe、步骤 2 的两类 deny 反例、INDEX 跨 compactNow 保留全部通过。两个前提要写进 ADR：preset 之间不继承标准工具集；compaction 引擎必须显式挂进 coordinator preset。
- 执行者：B 路（Spike 执行） 日期：2026-11-09（UTC；live 运行 2026-11-08 17:00–17:50 UTC）
- 基线：deepseek-harness@66491b05（tag `dsh-v0.2.2-rc.1`；源码阅读接缝引 master 合并点 fcc0ad46）；dsh-01 实测 dsh 0.2.2-rc.1，node v22.23.3，Linux instabox-dsh-01 6.18.60-instabox，模型 opencode-go/deepseek-v4.1-flash，实验室端口 3082（证据 `spikes/s3/evidence/r3-env.txt`）
- 实验代码：spike/s3-tool-fence@55d3b8c（retry #3 的修复：`relink-host-packages.sh`、fence tsdown `external`、preset 片段补 compaction）
- 驱动：spike/s4-native-worker@ff1f2f3（`/spike/*`，挂载于实验室 3082）

## 结论摘要（3 句以内）
coordinator 会话按 `spike-s3-coordinator` preset 正常创建，可见工具只剩 `spike_projects_probe` 与 `spike_decoy_shell`；全局工具 `working_directory` 被 `tools.restrict()` 屏蔽，decoy 被 guard 拦截且未产生副作用，白名单 probe 返回 `PROBE-OK-51D2`。
步骤 2 的两类 deny 反例都在 mount 阶段抛 `unknown global tool`，会话未公告、无存储残留，服务继续可用。
步骤 3 的 compactNow 真实压缩了 62 个历史节点（约 12,036 tokens），`spike-s3-index` section 与配置的 indexText 逐字节一致（299 bytes），三个哨兵压缩前后各出现一次；缓存字段按 provider 实际返回记录，缺失记 null。

## 逐项结果

| 检查项 | 结果 | 证据链接 | 备注 |
|---|---|---|---|
| 1a standard 工具清单（屏蔽前基线） | 通过 | `spikes/s3/evidence/r3-1a-tools-standard.json` | 33 个工具；P1 模型只列出 31 个（漏 `exit_plan_mode`、`web_search`，属模型复述遗漏，不是围栏） |
| 1a coordinator 工具清单 | 通过 | `spikes/s3/evidence/r3-1a-tools-coord.json` | 仅 `spike_projects_probe`、`spike_decoy_shell`，两份清单 diff 见 `r3-1a-tools-diff.json` |
| 1a P1 枚举（coordinator） | 通过 | `spikes/s3/evidence/r3-1a-p1-coord.json` | 模型列出的正好是那两个工具；usage 1228/462/null/null |
| 1a P1b「working_directory 能不能用」 | 通过 | `spikes/s3/evidence/r3-1a-p1b-coord.json` | 模型确认工具清单里没有 working_directory，并解释工作目录来自运行时上下文而不是工具；usage 1711/468/null/null（该轮 `request/header` 未携带 model，driver 如实返回 null） |
| 1b working_directory 调用被拒 | 通过 | `spikes/s3/evidence/r3-1b-p2a.json` | 工具不在 schemas（standard 基线里它是唯一全局工具，coordinator 被 restrict 屏蔽），模型无法发起调用，回复明确「注册表里只有两个工具」 |
| 1b bash 调用被拒 | 通过 | `spikes/s3/evidence/r3-1b-p2b.json` | 同上：bash 不在 coordinator preset 组合里，模型未发起调用 |
| 1b write / read 调用被拒 | 通过 | `spikes/s3/evidence/r3-1b-p2c.json`、`r3-1b-p2d.json` | 同上；`/tmp/spike-s3-probe.txt` 不存在（pre/post 均 `No such file`） |
| 1b 全局 MCP 调用被拒 | 通过 | `spikes/s3/evidence/r3-1b-p2e.json` | 无 `mcp__*` 工具可见，模型未编造调用 |
| 1b decoy 被 guard 拦截且无副作用 | 通过 | `spikes/s3/evidence/r3-1b-p2f.json` | 工具调用记录：`spike_decoy_shell`，error=`tool-error`，result=`Error: spike-s3-fence: tool "spike_decoy_shell" is outside the coordinator whitelist`；`/tmp/spike-s3-decoy-ran.txt` 不存在（pre/post 均 `No such file`），工具体未执行 |
| 1b 白名单 probe 调用成功 | 通过 | `spikes/s3/evidence/r3-1b-p2g.json` | calls 两次 `spike_projects_probe`，result=`PROBE-OK-51D2`；usage cacheReadTokens=11776 |
| 1b 每轮会话存活 | 通过 | `spikes/s3/evidence/r3-1b-p2a-alive.json` … `r3-1b-p2g-alive.json` | 7 轮追问全部返回正常回复 |
| 2 deny 未知全局工具名抛错、会话未公告 | 通过 | `spikes/s3/evidence/r3-2-step2.json` | create 500：`tools.restrict() names unknown global tool "tool_that_does_not_exist_xyz"; known global tools: working_directory`；inspect 记录 `creation failed, agent never announced`；resume 报 `session ... not found`；`find` 无该 sessionId 的存储文件（`r3-2-session-residue.json`） |
| 2 deny scoped 名（对照） | 通过 | `spikes/s3/evidence/r3-2-step2.json` | extraDeny 改为 `spike_projects_probe` 后同样抛 `names unknown global tool "spike_projects_probe"`，说明 restrict 只接受全局工具名 |
| 2 服务在失败创建后仍可用 | 通过 | `spikes/s3/evidence/r3-2-step2.json` | `/spike/health` 200，`/spike/global-default` 正常 |
| 3 INDEX 注入可见（压缩前） | 通过 | `spikes/s3/evidence/r3-3-step3.json`、`r3-3-index-before.txt` | section `spike-s3-index` 299 bytes，三个哨兵各 1 次；INDEX 问答答出 P-BETA / BETA-9C21 |
| 3 30 轮填充对话 | 通过 | `spikes/s3/evidence/r3-3-step3.json`（`filler_turns`） | 30 轮，段落取自 dsh README.zh.md 切块（200–800 字符，无哨兵、无工具调用）；每 5 轮 usage 见下表 |
| 3 compactNow 真实压缩 | 通过 | `spikes/s3/evidence/r3-3-step3.json`（`compact`） | replacedRange [8,254]，shadowedSeqs 62 个，shadowedTokenCount 12036，summarySeq 259；`compaction/summary` 的 usage：input 635 / output 1793 / total 23036 / cacheRead 20608 |
| 3 压缩后 INDEX 逐字节保留 | 通过 | `spikes/s3/evidence/r3-3-index-configured-compare.json`、`r3-3-index-diff.txt` | 配置的 indexText === 压缩前 section === 压缩后 section（299 bytes），diff 为空；三个哨兵各 1 次 |
| 3 压缩后 INDEX 问答 | 通过 | `spikes/s3/evidence/r3-3-step3.json`（`index_question_after`） | 仍答 P-BETA / BETA-9C21；模型未以「已压缩」为由拒绝 |
| 3 压缩后 3 轮 token 记账 | 通过 | `spikes/s3/evidence/r3-3-step3.json`（`post_compaction_turns`） | input/output/cacheRead 依次 2975/24/null、1986/8/1024、2005/8/1024；cacheWriteTokens 全程 null（字段缺失） |
| 3 空闲短会话 compactNow 无操作 | 通过 | `spikes/s3/evidence/r3-3-step3.json`（`empty_compact`） | 返回字面量 `null`，200，不写盘不报错 |
| 3 pruner 活动 | 未观测到 | — | 服务日志没有 pruner 行；本轮工具结果都很短（无大段工具输出），pruner 未触发；INDEX 在 system-prompt section 里，不经过 pruner |

每 5 轮 TokenUsage（`r3-3-step3.json`）：

| 轮次 | inputTokens | outputTokens | cacheReadTokens | cacheWriteTokens |
|---|---|---|---|---|
| 5 | 3787 | 4775 | null | null |
| 10 | 639 | 300 | 9600 | null |
| 15 | 1354 | 225 | 11904 | null |
| 20 | 702 | 328 | 14464 | null |
| 25 | 635 | 207 | 18176 | null |
| 30 | 769 | 294 | 20096 | null |

缓存命中没有因 INDEX 注入而归零：首轮无缓存字段，之后 cacheReadTokens 随历史增长单调上升（9600 → 20096），压缩调用本身 cacheRead 20608。

## 根因与修复（retry #2 不通过 → retry #3 通过）

retry #2 的失败点不是 fence 设计，而是 lab profile 的模块重复实例：

1. profile 的 `pnpm-workspace.yaml` 把本插件的 devDependencies（`@deepseek-ai/cordis`、`dsh-scope`、`dsh-tools`、`schemastery` 等）以 hoisted 方式装进了 `$LAB/profiles/superagent/node_modules/@deepseek-ai/`，与 dsh 宿主安装目录形成两份模块实例。
2. `tools` 服务由 profile 那份 `dsh-tools` 提供时，其内部 `scopeOf()` 读的是 profile 那份 `dsh-scope` 的模块内 `Symbol('dsh.scope')`，而 agent scope 标签由宿主那份 `dsh-scope` 的 `createScope()` 打上。Symbol 不同 → `scopeOf(this.ctx) === undefined` → `tools.restrict()` 抛 `requires a scoped context`；同一根因下 setup 里的 `tools.register()` 找不到 scope，会把工具静默注册成全局工具（S4 检查 4 的 probe 泄漏）。
3. 运行时实证：fence `apply()` 里临时 `createRequire` + 文件日志显示，fence 自身解析到宿主副本，`scopeOf(ctx)` 与 `scopeOf(ctx.tools.ctx)` 都是有效 scope 对象，唯独 `restrict()` 内部仍判 undefined，即两份 `dsh-scope`（诊断记录 `spikes/s3/evidence/r3-scope-diagnosis.jsonl`）。

修复前后用同一次构建对照（`spikes/s3/evidence/r3-before-fix-create.json` / `r3-after-fix-create.json`）：恢复 profile 重复包时 create 返回 `tools.restrict() requires a scoped context`；执行 `spikes/s3/relink-host-packages.sh` 后同一 create 返回 `status: created`。

同时修掉两个准备期缺口：

- fence 的 `tsdown.config.ts` 补 `external: [/^@deepseek-ai\//]`，避免构建期打包出第二份模块实例。
- coordinator preset 片段补 compaction 组（`compaction-basic` + `tool-result-pruner`）。preset 之间不继承，且 dsh-web-app 把顶层 `compaction-basic` 设为 disabled，不加这组时 coordinator 作用域里没有 compaction 引擎，`POST /spike/agents.compact` 返回 503（首次尝试的证据 `spikes/s3/evidence/r3-3-nocompaction-run1.json`）。
- 驱动侧 `/spike/agents.compact` 改从 `agentPresets.serviceFor(agent, 'compaction')` 取引擎（preset 内的 compaction 组被 isolate，profile 根与 `agent.ctx` 都取不到），见 S4 报告。

## 反例与故障场景

- **deny 未知全局工具名**：`tool_that_does_not_exist_xyz` → mount 抛 `names unknown global tool ...`，setup 回滚，agent 未公告，resume 报 session not found，无存储文件（`r3-2-step2.json`、`r3-2-session-residue.json`）。这就是步骤 2 期望的行为，说明 scope 已真正生效。
- **deny scoped 名**：`spike_projects_probe` 同样抛 `unknown global tool`，证明 restrict 的名称校验把 scoped 注册排除在外。
- **decoy guard**：`spike_decoy_shell` 可见、可被模型调用，但工具体未执行，返回 `Error: spike-s3-fence: tool "spike_decoy_shell" is outside the coordinator whitelist`；标记文件 `/tmp/spike-s3-decoy-ran.txt` 不存在。
- **无引擎的 compactNow**：加了 compaction 组之前，coordinator 会话 compact 返回 503；这是配置缺口，不是驱动或引擎行为。
- **模型复述偏差**：standard 基线 33 个工具，模型只列出 31 个（漏 `exit_plan_mode`、`web_search`）；围栏结论以 `/spike/tools.visible` 为准，不依赖模型自我枚举的完整性。
- 1b 里 `working_directory`/`bash`/`read`/`write`/MCP 都没有产生 tool call：它们不在 coordinator 的 schemas 里，模型无法发起调用。这比「调用被拒」更强（不可见即不可调），但也意味着拿不到 `UNKNOWN_TOOL` 错误码；`UNKNOWN_TOOL` 只在工具可见但解析不到时才会出现，本轮没有该场景。

## 对 ADR 的影响（建议措辞，不直接改 ADR）

- **围栏设计成立**：`tools.restrict({deny})` 在 agent setup 的 preset mount 路径上可用，前提是插件与服务共用宿主安装的同一份 `@deepseek-ai` 模块实例。建议 ADR 写明部署约束：profile 目录不得安装与宿主同名的 `@deepseek-ai/*` 包（或必须软链到宿主副本），插件构建不得把 `dsh-scope`/`dsh-tools` 打进产物。
- **围栏语义按组合写**：coordinator 的可见工具集由 preset 组合决定（preset 不继承，标准工具集不会自动出现），fence 负责两件事：`restrict` 挡住全部全局继承工具，`guard` 挡住白名单外的 scoped 工具。ADR 不要把「协调者拿到全部工具再减掉」写成实现前提。
- **INDEX 注入方式成立**：`systemPrompt.section` 每轮重算，compactNow 只替换消息历史区间，压缩前后 section 逐字节一致；缓存命中没有因注入归零。建议 ADR 采用「INDEX 用 system-prompt section，不用 message/context」的措辞。
- **步骤 3 的 preset 要求**：需要 INDEX 与 compaction 同时存在的场景，coordinator preset 必须自带 compaction 组；ADR/文档应写明「preset 自包含」这一组合要求。

## 未完成与推断项（明确标注）

- `cacheWriteTokens` 全程 null：opencode-go 路由没有返回该字段，按「字段缺失」记录，未按 0 计。
- 部分轮次的 `request/header` 事件未携带 model，driver 返回 `model: null`；这不是模型未生效（usage 与回复都在），是事件字段缺失。
- pruner 本轮未观测到活动，不能据此推断「pruner 对 INDEX 无影响」；能确定的是 INDEX 不在工具结果里、不经过 pruner。
- 只在 Linux（x64）上跑过；pwsh/Windows 分支未验证。
- 步骤 2 的 scoped-deny 变体是临时加进 lab patch 的第三个 preset，跑完已从 lab 配置撤掉；复现时按本报告片段临时加回（片段见下）。
- 未测自然 pressure 触发的 compaction（1M 上下文下不现实），只测了 `compactNow`；prompts.md 允许这一口径。

## 复现步骤

1. 同步 `spike/s3-tool-fence` 到 dsh-01，构建 fence（`pnpm build`，或用 profile 的 `tsdown`；产物必须是 `lib/index.js`）。
2. **必做**：跑 `spikes/s3/relink-host-packages.sh`（默认 profile 路径 `$HOME/workspace/dsh-superagent-lab/profiles/superagent`）。不跑会复现 retry #2 的 `tools.restrict() requires a scoped context`。profile 每次 `pnpm install` 后都要重跑。
3. 把 `spikes/s3/coordinator-preset.patch.yml` 与 `spikes/s3/profile-package.json.fragment` 合并进 lab profile，`pnpm install`，然后 `~/workspace/dsh-superagent-lab/start.sh` 重启。
4. 冒烟：`/spike/health` 200、`/spike/version` 的 model 为 `opencode-go/deepseek-v4.1-flash`、`/spike/global-default` 同值。
5. 按 `prompts.md` 与 `evidence-checklist.md` 跑 1a/1b/3；步骤 2 用已有的 `spike-s3-coordinator-bad-deny` preset，scoped 对照临时加第三个 preset：

```yaml
    - id: spike-s3-coordinator-scoped-deny-preset
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: spike-s3-coordinator-scoped-deny
        order: 82
        plugins:
          - id: spike-s3-fence
            name: '@spike/s3-coordinator-fence'
            config:
              extraDeny: [spike_projects_probe]
              indexText: |
                # Projects INDEX (spike-s3 fixture)
                - P-ALPHA — 哨兵 ALPHA-7F3A — 罗定征婚视频站：youshi.fun，月浏览 18,379 次
                - P-BETA — 哨兵 BETA-9C21 — dsh-projects：DeepSeek Harness 上的 Projects 工作台
                - P-GAMMA — 哨兵 GAMMA-44D8 — superagent：GitHub 评审编排器原型
```

6. 证据全部落在 `spikes/s3/evidence/`（gitignored，本次 40+ 个文件，前缀 `r3-`），报告中的链接都指向该目录。
