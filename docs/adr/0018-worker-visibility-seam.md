# 0018 Worker 可见性必须依赖真实列表过滤接缝
- 状态：Accepted（S1 实测见「S1 实测」）
- 日期：2026-11-08

## 背景

原设计把 worker 作为普通 root session 创建，同时计划用 `proj-worker-` 前缀和 session row slot 隐藏它们。row slot 是行装饰接缝，不等于从 session list 移除节点；如果前缀方案不能过滤列表，worker 会堆进「未分组」，M0 的界面验收失败。

## 决定

- M0 前必须在实际锁定的 DSH 版本上证明一个真正的 session list/filter seam，能隐藏或归组 `project-worker`，且不影响 `openSession`、子代理、文件上传、协调者重建和运行中会话。
- `sidebar.session.row.*` 只能用于徽标、项目入口和状态装饰，不得当作隐藏能力写入验收结论。
- 若插件侧前缀、会话行 slot 或其他降级方案无法从列表过滤 worker，则 M0 阻断；只有已验证的 DSH `SessionOrigin=project-worker` / list filter 补丁或等价真实接缝才能解除阻断。任何上游补丁都要保留可验证的失败行为，不以 mock 代替。
- worker 会话不能通过 `origin=subagent` 伪装，也不能归档活动会话来达到隐藏效果。过滤方案必须保留 worker 内部子代理能力和文件上传能力。

## S1 实测（2026-11-08）

- **插件侧全部方案不通过**：无会话列表过滤 slot（只有 archived filter），`sidebar.session.row.*` 仅装饰（`contract/slots.ts:158` 明文 non-interactive、不得绑定或保留 Session），客户端 `ISessions` 无 `filter` 方法，按 cwd 归组调用 `attachSession` 直接报错（`cannot attach session …`）。worker 以普通会话创建，发消息后按 `tree.ts:235` 规则应进入「未分组」（推断（源码），左栏 UI 未直接观察）；S1 判定「不通过」，本 ADR 的 M0 阻断不解除（[S1 报告](../spike/reports/S1-worker-visibility.md)）。
- **上游补丁实测范围**：`SessionOrigin = 'project-worker'` 补丁在锁定发布版上为 18 个文件、26 行。基线按 S1/S2 报告口径为官方 tag `dsh-v0.2.2-rc.1`（`66491b05`）；S0 锁定的 `fcc0ad46` 是 release 合回 `origin/master` 的合并提交（PR #7873），比该 tag 晚 811 个提交。S0 复核的行号按 `fcc0ad46` 引用；实验运行的是 0.2.2-rc.1 发布构建（tag）。本次引用的文件中，`subagent/subagent/src/index.ts` 与 `control.ts` 在两个提交间有差异，其余一致。文件清单：`packages/api/session-controller/src/client/sessions/lineage.ts`、`packages/api/session-controller/src/client/sessions/service.ts`、`packages/api/session-controller/src/list.ts`、`packages/api/session-controller/src/types.ts`、`packages/bundle/headless/src/index.ts`、`packages/client/ui-workspace/src/client/tree.ts`、`packages/core/agent/src/index.ts`、`packages/core/session/src/index.ts`、`packages/core/session/src/types.ts`、`packages/session/session-format-v0-to-v1/src/codec.ts`、`packages/session/session-format-v0-to-v1/src/validation.ts`、`packages/session/session-format-v1-to-v2/src/codec.ts`、`packages/session/session-format-v1-to-v2/src/validation.ts`、`packages/session/session-format-v3-to-v4/src/validation.ts`、`packages/session/session-format/src/types.ts`、`packages/session/session-log-deepseek/src/types.ts`、`packages/session/session-persistence-jsonl/src/format.ts`、`packages/session/session-persistence-jsonl/src/index.ts`。行号与改动点见 [ADR-0003](0003-host-extension-points.md)。
- **关键门控**：`packages/core/session/src/index.ts:126-127` 放宽为允许 `'project-worker'`；`packages/client/ui-workspace/src/client/tree.ts:235` 在 origin 为 `'subagent'` 或 `'project-worker'` 时不可见。
- **保持原样的普通路由检查点**（`=== 'subagent'`）：`api/session-controller/src/agent.ts`、`history.ts`、`archived-session-gate.ts`、`manager.ts`、`commands.ts`、`web/controller.ts`、`headless/index.ts`、`acp/index.ts`，以及 `client/file-upload/src/index.ts:283-290` 的 `assertOrdinaryAgent`（只拦 `origin === 'subagent'`）。worker 必须继续走普通路由，才能保留 `openSession`、子代理与文件上传。
- **补丁状态：建议，待批准**。补丁未合入上游；左栏 UI 直接观察因 dsh 0.2.2-rc.1 web 鉴权缺陷未完成，3a–3e 记 N/A。探针与持久化只证明补丁生效，不证明验收通过；解除阻断须补丁合并后重跑 S1 全部检查（含左栏视觉观察与 3a–3e）。

## 后果

- 首个 Spike 的结论是发布门槛，不是“待优化”的 UI 事项。
- 在过滤接缝未通过前，项目可以继续开发 Engine 和无 UI 的本地闭环，但不能宣称 Projects 左栏验收完成。
- 上游版本变化必须重新跑 list/filter、open、重启恢复和活动 worker 测试。

## 备选方案

- 只用会话 id 前缀和 row 装饰：没有证明能从列表移除 worker，放弃。
- 把 worker 伪装成 subagent 或归档活动会话：会触发宿主围栏/归档门禁，损坏子代理或运行能力，放弃。
