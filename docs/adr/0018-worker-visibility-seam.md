# 0018 Worker 可见性必须依赖真实列表过滤接缝
- 状态：Accepted
- 日期：2026-11-08

## 背景

原设计把 worker 作为普通 root session 创建，同时计划用 `proj-worker-` 前缀和 session row slot 隐藏它们。row slot 是行装饰接缝，不等于从 session list 移除节点；如果前缀方案不能过滤列表，worker 会堆进「未分组」，M0 的界面验收失败。

## 决定

- M0 前必须在实际锁定的 DSH 版本上证明一个真正的 session list/filter seam，能隐藏或归组 `project-worker`，且不影响 `openSession`、子代理、文件上传、协调者重建和运行中会话。
- `sidebar.session.row.*` 只能用于徽标、项目入口和状态装饰，不得当作隐藏能力写入验收结论。
- 若插件侧前缀、会话行 slot 或其他降级方案无法从列表过滤 worker，则 M0 阻断；只有已验证的 DSH `SessionOrigin=project-worker` / list filter 补丁或等价真实接缝才能解除阻断。任何上游补丁都要保留可验证的失败行为，不以 mock 代替。
- worker 会话不能通过 `origin=subagent` 伪装，也不能归档活动会话来达到隐藏效果。过滤方案必须保留 worker 内部子代理能力和文件上传能力。

## 后果

- 首个 Spike 的结论是发布门槛，不是“待优化”的 UI 事项。
- 在过滤接缝未通过前，项目可以继续开发 Engine 和无 UI 的本地闭环，但不能宣称 Projects 左栏验收完成。
- 上游版本变化必须重新跑 list/filter、open、重启恢复和活动 worker 测试。

## 备选方案

- 只用会话 id 前缀和 row 装饰：没有证明能从列表移除 worker，放弃。
- 把 worker 伪装成 subagent 或归档活动会话：会触发宿主围栏/归档门禁，损坏子代理或运行能力，放弃。
