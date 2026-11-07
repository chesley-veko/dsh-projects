# 里程碑与验收

> 状态：现行（v3，2026-11-08）。按「先本地 DSH 跑通 → 外部执行者 → 云端」的顺序推进；每一步都保持可用。

验收一律用**真实 DSH + 真实模型 / 真实 CLI** 跑通，保留录屏或截图作为证据；不接受只有 mock 的测试。

| 阶段 | 范围 | 验收 |
|---|---|---|
| **Spike（2 天）** | ① `sessionController.create({cwd})` 不登记工作区时的左栏表现与 `openSession`；② `INDEX.md` 注入点；③ 协调者 preset 能否移除内置文件 / shell 工具；④ 本机起 `claude-agent-acp`、`codex-acp`、`dsh --profile acp`，验证 `session/new` 带 `mcpServers`、`set_config_option(model)`、`request_permission`、`session/resume`；⑤ `ssh host -- dsh --profile acp` 的 stdio 往返 | 每项一段结论 + 证据，写进对应 ADR；④ 产出能力矩阵实测表 |
| **M0 最薄闭环（3–4 天）** | `core`、`store-sqlite`、`server` 骨架；协调者 preset 与 `task_create / task_start / project_status`；本地位置（worktree）；DSH 原生执行者；projects-mcp（DSH 侧以工具注册）；`validate`；合成消息回报 | 对协调者说一句话 → 拆出 2 个 Task → 2 个 worktree 并行 → verified → 协调者汇报；左栏不新增工作区；杀进程重启后状态完整恢复 |
| **M1 状态与面板（4–5 天）** | 状态推导、`change_log` + SSE；右栏 List / Board / Peek / 详情；Projects 首页面板；会话行徽标；状态菜单与拖拽映射为命令；任务卡显示「执行者 · 模型 · 位置」；DSH 执行者的模型选择 | 运行、等待、失败、完成在右栏实时正确；断线后按 seq 补齐 |
| **M2 外部执行者（5–6 天）** | ACP client（完整事件、权限转 Question、按次选模型、续接、能力降级）；Claude Code、Codex 接入，Gemini / OpenCode 顺带；设置 → Agents（探测、登录状态、模型目录、角色默认）；运行视图；启动摘要的执行者 / 模型选择 | 同一项目里 DSH、Claude Code、Codex 各跑一个任务；Claude 的权限请求在托盘批准后继续；任务卡与运行头显示正确的执行者、模型、计费来源 |
| **M3 人与 PR（4–5 天）** | Question 三类 + 托盘直答；PR / CI 观察与回流（复用 forge）；Pause / Archive / Delete；检出回收与 preserved ref；分支管理 | worker 提问在主窗口一键回答直达；CI 红自动回给 worker；删项目后本地检出清理、远端分支保留 |
| **M4 云端一（5–6 天）** | `.dsh/environment.json`；SSH 主机与 Docker 位置；远端 install 与缓存；远端起执行者（含 `dsh --profile acp`）；projects-mcp 经隧道；API Key 按次注入；本地 ⇄ 云端交接 | 本地起头的任务「移到云端」后在 SSH 主机上用 Codex 跑完并 verified；再「拉回本地」继续；凭据从未落盘到远端 |
| **M5 云端二与 best-of-N（4–5 天）** | 一家沙箱提供商（E2B 或 Daytona，按 Q2 决定）；快照；端口转发预览；best-of-N 与对比视图 | 同一任务 Claude / Codex / DSH 三个候选在沙箱并行，对比后采用一个，其余回收 |
| **M6 Library（4–5 天）** | `context/` git 仓库；INDEX 注入；decisions / specs；runbook propose → verified 转正；dispute；云端运行的上下文读写经 projects-mcp | 本地任务摸出的测试命令进 runbook 并转正，云端的下一个任务直接复用、零试错 |
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
