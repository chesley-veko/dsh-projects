# 里程碑与验收

> 状态：现行（v3，2026-11-08）。按「先本地 DSH 跑通 → 外部执行者 → 云端」的顺序推进；每一步都保持可用。

验收一律用**真实 DSH + 真实模型 / 真实 CLI** 跑通，保留录屏或截图作为证据；不接受只有 mock 的测试。

| 阶段 | 范围 | 验收 |
|---|---|---|
| **Spike（2 天）** | ① 验证**不改宿主**时压住本地 worker 会话：插件侧固定会话 id 前缀 `proj-worker-`，用 `sidebar.session.row.*` / 会话列表过滤 slot 隐藏或折叠到协调者行下；评估 `openSession`、子代理与文件上传是否受影响。上游 `origin` 扩展仅作增强（`origin` 目前是字面量类型 `'subagent'`，见 `core/session/src/types.ts:122,161`、`api/session-controller/src/list.ts:374`、`client/sessions/service.ts:36`、`lineage.ts:34`，需改动 core 会话头与 controller / client 多处，不是一行补丁）；② 验证协调者会话挂载 `conversation.view`（`project-overview` / `project-run`）+ `conversation.composer` 接管时，右栏 `sidebarRightTabs` 常驻且无双输入框冲突；③ 验证 `presetCtx.tools.restrict({ deny })` + `tools.guard()` 完全屏蔽宿主平面 `working_directory` 与全局工具，以及 `systemPrompt.section` 注入 `INDEX.md` 的 Prefix KV Cache 命中与防 compaction；④ 本机起 `claude-agent-acp`、`codex-acp`、`dsh --profile acp`，验证 `session/new` 带薄代理 `projects-mcp`、`set_config_option(model)`、`request_permission`、`session/cancel` 合成 `steer`、`session/resume`；⑤ `ssh host -- dsh --profile acp` 的 stdio 往返与 `ssh -R` MCP 回路转发 | 每项一段结论 + 证据，写进对应 ADR；④ 产出能力矩阵实测表 |
| **M0 最薄闭环（3–4 天）** | `core`、`store-sqlite`（含 `lane_key` 与启动恢复重置 `running` effect）、`server` 骨架；协调者 preset（`tools.restrict` 围栏 + 建项目初始引导事件脱离 `blank` 态）与 `task_create / task_start / project_status`；本地位置（worktree 及无仓库目录）；DSH 原生执行者（预生成 `session_ref` + `agentOptions` 初始模型）；projects-mcp（DSH 侧以工具注册）；`validate`（记录 `commit_sha`）；合成消息回报 | 对协调者说一句话 → 拆出 2 个 Task → 2 个 worktree 并行 → verified（绑定 `head_sha`）→ 协调者汇报；左栏「未分组」不堆叠 worker 会话；杀进程重启后状态与 effect 完整恢复 |
| **M1 状态与面板（4–5 天）** | 状态推导（终态与运行态优先）、`change_log` + SSE；右栏 List / Board / Peek / 详情 + root 级 `ProjectUiStore`；Projects 首页面板；`conversation.view` 概览页；会话行徽标；状态菜单与拖拽映射为命令；任务卡显示「执行者 · 模型 · 位置」；DSH 执行者的模型选择 | 运行、等待、失败、返工、完成在右栏实时正确；切进本地 worker 会话时右栏保持同项目看板；断线后按 seq 补齐 |
| **M2 外部执行者（5–6 天）** | ACP client（流式 chunk 走内存 SSE + `.jsonl`、低频事件入 SQLite、权限转 Question、按次选模型、合成 `steer`、续接、能力降级）；本机 `projects-mcp-stdio.mjs` 薄代理转发回主进程 `Engine`；Claude Code、Codex 接入，Gemini / OpenCode 顺带；设置 → Agents（探测、登录状态、模型目录、角色默认）；`conversation.view` 外部运行视图（`project-run` + `conversation.composer` 接管输入框）；启动摘要的执行者 / 模型选择 | 同一项目里 DSH、Claude Code、Codex 各跑一个任务；4 路并行流式输出不阻塞主线程；Claude 的权限请求在托盘批准后继续；任务卡与运行头显示正确的执行者、模型、计费来源 |
| **M3 人与 PR（4–5 天）** | Question 三类 + 托盘直答；PR / CI 观察与回流（复用 forge，新提交自动使旧 Evidence 失效）；Pause / Archive / Delete；检出回收与 preserved ref；分支管理 | worker 提问在主窗口一键回答直达；CI 红自动回给 worker 返工并回到 In Progress；删项目后本地检出清理、远端分支保留 |
| **M4 云端一（5–6 天）** | `.dsh/environment.json`；SSH 主机与 Docker 位置（含 `pushFile / pullFile`）；远端 install 与缓存；远端起执行者（含 `dsh --profile acp`）；`projects-mcp` 经 `ssh -R` 或第二条 `exec` stdio 通道桥接；API Key 按次注入；本地 ⇄ 云端交接 | 本地起头的任务「移到云端」后在 SSH 主机上用 Codex 跑完并 verified，工件经 `artifact_put`（`pullFile`）回传本机；再「拉回本地」继续；凭据从未落盘到远端 |
| **M5 云端二与 best-of-N（4–5 天）** | **前置 spike**：验证所选沙箱（E2B / Daytona）的 exec 是否支持长连接 + 持续 stdin，能否同时承载执行者 stdio 与第二条 `projects-mcp-bridge` 通道；不行则改为提供商端口预览 + 一次性 token 的出站 HTTPS。一家沙箱提供商（E2B 或 Daytona）；快照；端口转发预览；沙箱内 `projects-mcp-bridge.mjs` 双通道桥接；best-of-N（逐空槽启动 + `reviewer Run` 槽位优先）与对比视图 | 同一任务 Claude / Codex / DSH 三个候选在沙箱并行，对比后采用一个，其余回收 |
| **M6 Library（4–5 天）** | `context/` git 仓库；INDEX 经 `systemPrompt.section` 注入；decisions / specs；runbook propose → verified（匹配 `head_sha`）转正；dispute；云端运行的上下文读写经 `projects-mcp` | 本地任务摸出的测试命令进 runbook 并转正，云端的下一个任务经 `context_read` 直接复用、零试错 |
| **M7 外部事件与引用（3–4 天）** | `intake` 接 GitHub / 飞书；`@YOU-1` / `#PR` 引用；「加入项目」收编会话；命令面板；订阅（定时、PR） | PR 评论 @机器人 在正确项目里开 Task，Mandate 可审计 |

## 度量（从 M1 起采集）

- **冷启动轮次**：同类任务在新 Run 中到达第一次有效工具调用的轮数（应下降）。
- **重复解释率**：人重复说明同一件事的次数（应下降）。
- **人等待时长**：Question（含权限请求）从创建到回答的中位数。
- **验证通过率**：按执行者 × 模型分组的 done → verified 比例（用于改进推荐）。
- **协调者越界率**：协调者回合中尝试读代码 / 跑命令的比例（工具层应为 0）。
- **交接成功率**：交接后新 Run 第一次 validate 通过的比例。
- **云端成本**：按位置记录的算力时长与 API 用量。
- **上下文体积**：`context/` 总 token 曲线。
