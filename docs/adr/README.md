# 架构决策记录（ADR）

每个影响结构的决定一篇，编号递增，不删除；被取代时把状态改为 `Superseded by NNNN`。

模板：

```
# NNNN 标题
- 状态：Proposed | Accepted | Superseded by NNNN
- 日期：YYYY-MM-DD
## 背景
## 决定
## 后果
## 备选方案
```

| 编号 | 标题 | 状态 |
|---|---|---|
| [0001](0001-own-engine.md) | 自建项目引擎，不改造 dsh-superagent 的 Eval / Ticket 语义 | Accepted |
| [0002](0002-derived-status.md) | 只存意图与事实，显示状态读时推导 | Accepted |
| [0003](0003-host-extension-points.md) | 只使用宿主已有扩展点 | Accepted |
| [0004](0004-worktree-lifecycle.md) | worktree 可丢，分支必保 | Accepted |
| [0005](0005-validate-before-done.md) | 验证先于完成 | Accepted |
| [0006](0006-coordinator-tool-boundary.md) | 协调者的边界写在工具层 | Accepted |
| [0007](0007-run-spec.md) | 执行者 × 模型 × 位置正交，记为不可变的 RunSpec | Accepted |
| [0008](0008-executor-transports.md) | 本地 DSH 走原生会话，其余一律 ACP | Accepted |
| [0009](0009-location-follows-code.md) | 位置 = 代码与 agent 进程所在处 | Accepted |
| [0010](0010-branch-handoff.md) | Attempt / Checkout / Run 三层，分支是交接介质 | Accepted |
| [0011](0011-credentials.md) | 本地复用 CLI 登录，云端只用 API Key | Accepted |
| [0012](0012-projects-mcp.md) | 给所有执行者同一套工具：projects-mcp | Accepted |
