# S3 协调者工具围栏与 INDEX 注入
- 结论：（待填：通过 / 有条件通过 / 不通过 / 部分完成）
- 执行者：B 路（Spike 执行）    日期：（待填）
- 基线：deepseek-harness@fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，dsh-superagent-prototype@8c32a9d，其他版本：（待填：dsh-01 实际构建版本、node、OS、模型）
- 实验代码：spike/s3-tool-fence@（待填 SHA）

## 结论摘要（3 句以内）
（待填）

## 逐项结果（表：检查项 / 结果 / 证据链接 / 备注）
| 检查项 | 结果 | 证据链接 | 备注 |
|---|---|---|---|
| 1a 屏蔽前/后工具清单对比 | （待填） | （待填） |  |
| 1b working_directory 调用被拒 | （待填） | （待填） |  |
| 1b shell 调用被拒 | （待填） | （待填） |  |
| 1b 文件读写调用被拒 | （待填） | （待填） |  |
| 1b 全局 MCP 调用被拒 | （待填） | （待填） |  |
| 1b decoy 被 guard 拒绝且无副作用 | （待填） | （待填） |  |
| 1b 白名单 probe 调用成功 | （待填） | （待填） |  |
| 2 deny 未知工具名抛错，会话未公告 | （待填） | （待填） |  |
| 2 deny scoped 名抛错（对照） | （待填） | （待填） |  |
| 3 compaction 后 INDEX 完整 | （待填） | （待填） |  |
| 3 compaction 后缓存字段 | （待填） | （待填） | opencode-go 路由可能不返回缓存字段，缺失记 null |
| 3 空闲短会话 compactNow 无操作 | （待填） | （待填） |  |

## 反例与故障场景
（待填：步骤 2 的 mount 抛错行为；decoy 侧写文件检查；空闲 compactNow；pruner 活动）

## 对设计的影响（需改的 ADR 或文档，给出建议措辞，不直接改 ADR）
（待填）

## 未完成与推断项（明确标注）
- fence 插件在 dsh-01 上编译前为「未编译」状态；编译结果以 live 为准。
- 以下为推断（源码），未算作通过：tools.restrict / guard / section /
  setup 回滚 / compaction 保留 section 的机制（见 spikes/s3/README.md
  接缝表，引 deepseek-harness@fcc0ad46 行号）。
- opencode-go 路由缓存字段未核实。

## 复现步骤
1. 同步分支 spike/s3-tool-fence 到 dsh-01（分支未 push，见 spikes/s3/README.md）。
2. 按 spikes/s3/coordinator-preset.patch.yml 与
   profile-package.json.fragment 合并 lab 配置；`pnpm install`；
   构建 fence 插件。
3. 记录版本（dsh --version + 全局包 version + node + OS + 模型）。
4. 复查 eval/executor 角色模型仍钉死 deepseek-v4.1-flash。
5. 按 spikes/s3/prompts.md 与 evidence-checklist.md 执行步骤 1–3，
   经 spike 插件接口发送提示词、取工具清单、取 system-prompt、触发
   compaction。插件接口假设见 spike/s4-native-worker 分支的
   spikes/s4/plugin-interface.md（与 A 路 S1 插件对接后以实际接口为准）。
