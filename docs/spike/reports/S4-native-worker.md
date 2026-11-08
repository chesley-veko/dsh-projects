# S4 DSH 原生 worker 的创建与能力
- 结论：（待填：通过 / 有条件通过 / 不通过 / 部分完成）
- 执行者：B 路（Spike 执行）    日期：（待填）
- 基线：deepseek-harness@fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，dsh-superagent-prototype@8c32a9d，其他版本：（待填：dsh-01 实际构建版本、node、OS、模型）
- 实验代码：spike/s4-native-worker@（待填 SHA）

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
- spike 插件接口是假设（spikes/s4/plugin-interface.md），live 前须与
  A 路 S1 插件实际接口对齐；对齐前的任何偏差以实际接口为准。
- 以下为推断（源码），未算作通过：agents.create / setup 回滚 /
  resume / workspaceRegistry 与 sessionController 的区别机制（见
  spikes/s4/README.md 接缝表，引 deepseek-harness@fcc0ad46 行号）。
- 路由临时扩展 deepseek-v4-pro 的 revert 情况：（待填）。

## 复现步骤
1. 同步分支 spike/s4-native-worker 到 dsh-01（分支未 push，指挥者
   安排传输）。
2. 按 spikes/s4/test-fixtures.md 备好目录、路由扩展、全局默认快照、
   版本与角色模型复查。
3. 确认 spike 插件接口与 plugin-interface.md 一致（不一致先改
   checks.md 的调用方式）。
4. 按 spikes/s4/checks.md 与 prompts.md 逐项执行，取证按
   plugin-interface.md 的返回字段存档。
