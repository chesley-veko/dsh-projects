# S3 协调者工具围栏与 INDEX 注入（B 路）

状态：实验准备完成，待指挥者调度 live 运行（dsh-01）。
分支：`spike/s3-tool-fence`（自 main 233365a）。实验代码不进 main。

## 要回答的问题（任务书 §3 S3）

协调者能否只拿到 Projects 工具；INDEX 注入是否稳定。

## 已核实的接缝（deepseek-harness@fcc0ad46，全部为源码阅读结论，标「推断（源码）」）

| 接缝 | 位置 | 结论 |
|---|---|---|
| `tools.restrict({deny})` | `packages/core/tools/src/index.ts:162-191` | 需 scoped ctx（agent.ctx）；空 filter 抛错；命名未知全局工具抛错并附已知全局工具清单；命名 `run_code` 抛错；只屏蔽全局工具，scoped 注册豁免；多层 restrict 取交集 |
| `tools.guard()` / `checkGuards()` | `index.ts:384-404`；`pipeline.ts:213-228` | 单调拒绝：返回 reason 即拒绝，返回 undefined 即放行；拒绝时返回 isError:true（`Error: <reason>`），工具体不执行，会话继续 |
| `systemPrompt.section` | `packages/core/system-prompt/src/index.ts:54-75` | 名唯一（重复抛错）；order 升序拼接；text 每轮 assembly 时重算；`interpolate: false` 可保字面量 |
| setup 抛错回滚 | `packages/core/agent/src/index.ts:100-119`（CreateAgentOptions.setup 文档） | setup 抛错/拒绝 → scope 回滚，不公告 agent 创建；已提交的 Session 事件保留 |
| preset 挂载失败 | `packages/preset/agent-preset-registry/src/mount.ts:204-216` | 失败行或服务泄漏 → mountPreset 抛错 |
| `ctx.agents.create` | `packages/experimental/webhook/src/session.ts:110-118` | setup 内 `agentPresets.mount(agentCtx, preset.id)`；见 S0 复核表 |
| compaction 触发 | `packages/compaction/compaction-basic/src/index.ts:163,228`；`config.ts:19` | 触发器 `pressure`（请求预算 80%）与 `context-overflow`；compaction 只替换消息历史区间为摘要节点，不动注册的 system-prompt section（section 每轮重算） |
| 缓存字段 | `packages/llm/llm/src/types.ts:182-200`（TokenUsage）；`packages/llm/llm-deepseek/src/translate.ts:36` | `cacheReadTokens` / `cacheWriteTokens` 为可选字段；DeepSeek 直连适配器映射 `cache_read_input_tokens`；opencode-go 路由是否返回未核实，live 时如实记录（缺失记 null） |
| 工具名实测 | `packages/session/tool-working-directory/src/index.ts:21`；`packages/fs/tool-fs/src/{read,write,edit,apply-patch,read-image}.ts`；`packages/shell/tool-bash/src/index.ts:369` | `working_directory` / `read` / `write` / `edit` / `apply_patch` / `read_image` / `bash` / `pwsh`；MCP 工具前缀 `mcp__<server>__` |
| 运行时枚举模式 | `packages/experimental/browser-use-runtime/src/mcp.ts:117-121` | `ctx.tools.schemas(agent)` 枚举继承工具 → `mask.ctx.tools.restrict({ deny: inherited… })`；本实验的 fence 插件照此模式 |

## 设计要点

1. **deny 清单运行时枚举，不手写。** fence 插件在 apply() 里先调
   `ctx.tools.schemas(scope)` 取继承全局工具名，再 `restrict({deny})`。
   手写清单一旦含 scoped 名或错名，mount 当场抛错（这正是步骤 2 要
   测的行为，不应出现在步骤 1 里）。
2. **guard 是第二层。** restrict 只能去掉全局工具；scoped 注册的工具
   （如本插件的 decoy）只能由 guard 拦。guard 按白名单（仅
   `spike_projects_probe`）拒绝，拒绝不杀会话。
3. **INDEX 注入用 section，不用 context。** section 每轮重算，compaction
   只动消息历史，所以 INDEX 理论上不受 compaction 影响；步骤 3 在运行
   时验证，并用哨兵串逐字节比对。
4. **compaction 用 compactNow 确定性触发。** 自然 pressure 阈值是请求
   预算 80%，1M 上下文下等自然触发不现实；compactNow 走同一引擎路径。

## 文件清单

| 文件 | 用途 |
|---|---|
| `fence-plugin/src/index.ts` | fence 插件：枚举 → restrict → 注册 probe/decoy → guard → section |
| `fence-plugin/package.json` / `tsconfig.json` / `tsdown.config.ts` | 插件构建配置（tsdown，与 superagent 原型同款） |
| `coordinator-preset.patch.yml` | 协调者 preset A/B 的 cordis.patch.yml 片段 |
| `profile-package.json.fragment` | lab profile 的 package.json 合并片段（link 依赖） |
| `index-fixture.md` | INDEX 固定内容（3 个哨兵） |
| `prompts.md` | 逐字测试提示词 P1/P2a–P2g 与步骤 2/3 流程 |
| `evidence-checklist.md` | 证据采集清单与填充提示词模板 |
| `../docs/spike/reports/S3-coordinator-fence.md` | 报告草稿（结论空着，待 live 证据填） |

## 未验证项（必须在 live 前/中补）

- fence 插件未在本机编译（本机无 DSH 依赖与 tsdown；dsh-01 上
  `pnpm install` + `pnpm build` 后以编译结果为准；编译失败即停，
  按 Spike 规则 7 提交部分结论）。
- opencode-go 路由是否返回缓存字段未核实。
- 0.2.2-rc.1 升级后 eval/executor 角色模型未重验（live 前复查）。

## 通过标准（任务书）

被屏蔽的工具在模型侧不可见且调用被拒；compaction 后 INDEX 完整；
缓存命中率不因注入而归零。
