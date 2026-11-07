# 里程碑与验收

> 状态：现行（2026-11-08）。取代旧稿的 M1「改 superagent 三刀」路线。

验收一律用**真实 DSH + 真实模型**跑通，保留录屏或截图作为证据；不接受只有 mock 的测试。

| 阶段 | 范围 | 验收 |
|---|---|---|
| **Spike（1 天）** | [dsh-integration.md §5](dsh-integration.md) 的四个问题 | 每个问题一段结论 + 证据，写进对应 ADR |
| **M0 最薄闭环（3–4 天）** | pnpm workspace；`core`、`store-sqlite`、`server` 骨架；协调者 preset 与 `task_create / task_start / project_status`；`git` 建 worktree；`executor-dsh` 起 worker；`validate`；合成消息回报 | 对协调者说一句话 → 拆出 2 个 Task → 2 个 worktree 并行 → 验证命令 verified → 协调者汇报；左栏不新增工作区；杀进程重启后状态完整恢复 |
| **M1 状态与面板（4–5 天）** | 状态推导、`change_log` + SSE；右栏 Project Tab（List / Board / Peek / 详情）；Projects 首页面板；会话行徽标；状态菜单与拖拽映射为命令 | 运行、等待、失败、完成在右栏实时正确；断线后按 seq 补齐；非法拖拽给出原因 |
| **M2 人与 PR（4–5 天）** | Question 三类 + 托盘直答；PR / CI 观察与回流；Pause / Archive / Delete；worktree 回收与 preserved ref；分支管理 | worker 提问在主窗口一键回答直达；CI 红自动回给 worker；删项目后本地 worktree 清理、远端分支保留 |
| **M3 Library（4–5 天）** | `context/` git 仓库；INDEX 注入；decisions / specs；runbook propose → verified 转正；dispute；Library 视图 | YOU-1 摸出的测试命令进 runbook 并转正，YOU-2 启动后直接复用、零试错 |
| **M4 外部事件与引用（3–4 天）** | `intake` 接 GitHub / 飞书；`@YOU-1` / `#PR` 引用；「加入项目」收编会话；命令面板 | PR 评论 @机器人 在正确项目里开 Task，Mandate 可审计；收编的会话生成建议任务待确认 |

## 度量（从 M1 起采集）

- **冷启动轮次**：同类任务在新 Run 中到达第一次有效工具调用的轮数（应下降）。
- **重复解释率**：人重复说明同一件事的次数（应下降）。
- **人等待时长**：Question 从创建到回答的中位数。
- **验证通过率**：worker 声明 done 后 validate 通过的比例。
- **协调者越界率**：协调者回合中尝试读代码 / 跑命令的比例（工具层应为 0）。
- **上下文体积**：`context/` 总 token 曲线；只涨不跌说明在变成垃圾场。
