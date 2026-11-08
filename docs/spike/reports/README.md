# Spike 报告

各工作包报告放在此目录，命名 `S<n>-<slug>.md`，模板见 [../README.md](../README.md) §4。审核意见写在每份报告末尾的 `## 审核` 小节。各报告「审核」小节由执行代理代填，Hark 的独立审核结论以本汇总为准。

- S0 的复核表在 [../research/dsh-source-verification.md](../../research/dsh-source-verification.md) §7（无独立报告文件，其余 S1–S7 在本目录）。

## S0–S7 汇总

基线：S0 锁定 `deepseek-harness@fcc0ad46`（`origin/master` 上 release-dsh-0.2.2-rc.1 的合并提交，PR #7873）与 `dsh-superagent-prototype@8c32a9d`。live 运行环境为官方发布 `dsh 0.2.2-rc.1`（tag `dsh-v0.2.2-rc.1`，`66491b05`）；S0 行号按 `fcc0ad46` 引用，两提交间 `subagent/subagent/src/index.ts` 与 `control.ts` 有差异，其余被引文件一致。本仓库基线 `origin/main@233365a`。

| 编号 | 主题 | 结论 | 关键结论 | 报告 |
|---|---|---|---|---|
| S0 | 基线锁定与源码复核 | 通过 | 锁定 `fcc0ad46`；9 项行号/签名复核完成，修正 6 处文档引用（`file-upload`、`parent-unavailable`、`agents.create` 签名、`agentOptions.model` 等） | [research §7](../../research/dsh-source-verification.md) |
| S1 | Worker 会话可见性接缝 | 不通过（M0 阻断） | 插件侧无真实列表过滤接缝（只有装饰 slot，无 filter API）；上游 `SessionOrigin='project-worker'` 补丁实测 18 文件 26 行、探针有效，但未合入；左栏 UI 因 Web 鉴权 401 未直接观察 | [S1](S1-worker-visibility.md) |
| S2 | 协调者视图、输入框与右栏 | 部分完成 | `conversation.view` 的 tab 全局可见（无按会话过滤，内容须按会话门控）；`conversation.composer` 接管按会话生效，两个视图共用或插件内按激活视图切换；UI 未验证 | [S2](S2-coordinator-view.md) |
| S3 | 协调者工具围栏与 INDEX | 通过（有条件） | 围栏在 preset 挂载路径成立：可见工具 33 → 2，被屏蔽工具不可见即不可调，decoy 被 guard 拦截，deny 未知名报 `unknown global tool` 并回滚；`compactNow` 压缩 62 节点后 INDEX 逐字节保留（299 B），`cacheReadTokens` 9600→20096 | [S3](S3-coordinator-fence.md) |
| S4 | DSH 原生 worker 的创建与能力 | 有条件通过 | 创建、默认模型、非默认模型首轮生效、全局默认不变、setup 工具隔离成立；`cwd` 只校验绝对路径、不建目录；`agents.create` 不套默认模型，入口负责合入；检查 5 的 Ticket 对照与 6/7 未复验 | [S4](S4-native-worker.md) |
| S5 | 本机 ACP 执行者能力矩阵 | 部分完成 | `dsh --profile acp` 8 项跑完：stdio MCP 补 `env: []` 后真实挂载（假 Engine 收到调用）；`session/request_permission` 四轮触发（allow/reject/cancel/bogus 行为已记录）；Claude Code 与 Codex 缺凭据未测 | [S5](S5-acp-matrix.md) |
| S6 | SSH 远端执行与 MCP 回路 | 未通过 | 远程 SSH + ACP 与 30 秒断线恢复可用；远端 MCP 回路未打通（`ssh -R` 被网关拒绝，`projects-mcp-bridge.mjs` 未实现/未验证）；根因已从「agent 不支持 stdio」纠正为客户端缺 `env` 被 ACP SDK 静默丢弃 | [S6](S6-ssh-remote.md) |
| S7 | 执行信任边界 | 不通过 | Landlock `workspace-write` 只限写不限读（`~/.ssh`、CLI 登录目录、宿主 DSH 配置可读）、不限制未声明外网（HTTP 200）、共享真实 `/tmp`（可 glob `/tmp/ssh-*/agent.*` 连存活 SSH agent）；隔离 HOME 与只读快照只挡 `$HOME` 指针；受限组合须禁用或须 full-access 风险确认 | [S7](S7-trust-boundary.md) |

## M0 放行结论

**放行 Engine、SQLite 状态推导与无 UI 本地闭环开发。** Projects 左栏 UI 验收受两道门控：

1. **S1 上游补丁（降级已接受，2026-11-09）**：补丁未合入时左栏按 [ADR-0003](../../adr/0003-host-extension-points.md) 降级交付（worker 留在「未分组」，前缀 + 徽标区分），不阻断 M0；补丁合入并重跑 S1 全部检查（含左栏视觉观察与 3a–3e）后，才可宣称「worker 不出现在未分组」。
2. **DSH Web 鉴权修复门控**：dsh 0.2.2-rc.1 的 web 打印 token 始终 401，S1/S2 的 UI 观察（左栏截图、tab、右栏常驻、单输入框、chip 与模型选择器）无法执行；修复后须补做，当前不得把这些写成已验证。

3. **Node 版本**：dsh 0.2.2-rc.1 要求 Node ≥ 24.9，本轮 live 全部跑在 v22.23.3。M0 开发环境统一用 Node 24，并在 Node 24 上抽查复跑 S4 创建与 S5 t2 各一次；结果与本轮不一致时以 Node 24 为准并回改报告。

另两条执行边界同时生效：

- **S7**：默认 `workspace-write` 不得承载不受信仓库脚本；未安装 `bwrap`（独立 `--tmpfs /tmp`、`--unshare-net`）或容器隔离的宿主机上，`install` / `start` / `validate` 与 `credential=cli-login` 默认阻断，或要求用户显式确认 `full-access` 风险模式。
- **S6**：远端 Run 在 `projects-mcp-bridge.mjs` 的 exec stdio 桥接回路实测前只能进入 `unknown` / `stale`，不能标 `verified`。

## 需要修订的 ADR

已在本次提交同步：ADR-0003、0006、0008、0012、0014、0015、0016、0017、0018（S0 行号/签名修正另涉及 `docs/research/dsh-capabilities.md`、`docs/architecture/dsh-integration.md`、`execution.md`、`runtime.md` 与 `docs/spike/README.md`）。

## 原型需同步的改动

- **创建 worker**：`ctx.agents.create` 显式传 `signal` 与 `agentOptions { provider, model }`；不传时不会套全局默认模型。`checkout.prepare` 自行校验并创建 `cwd`。
- **compaction**：引擎在 preset 组内被 isolate，用 `agentPresets.serviceFor(agent, 'compaction')` 取；协调者 preset 须自带 compaction 组。
- **插件打包**：`@deepseek-ai/*` 一律 external；profile 不得安装与宿主同名的包，重复安装时软链回宿主副本（每次 `pnpm install` 后重跑）。
- **MCP 回路**：stdio 条目必须带 `env: []`；`mcpCapabilities.http: true` 是本机 HTTP 直连的依据，不代表仅支持 HTTP；远端默认走 exec stdio 桥接。
- **协调者 UI**：`conversation.view` 的 tab 全局可见，内容按会话门控；`conversation.composer` 接管按会话生效。
- **INDEX**：用 `systemPrompt.section` 注入，不用 message/context；压缩前后逐字节保留已验证。
