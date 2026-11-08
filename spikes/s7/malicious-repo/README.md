# 「恶意」测试仓库（S7 执行信任边界）

> 这是 Spike S7 的探测材料，不是真实恶意代码。它模拟一个拿到执行机会的
> 仓库脚本会尝试的越权行为，只为测量 DSH sandbox 与隔离环境的实际边界。

## 安全铁律（所有脚本都遵守，违反即停）

- **只读为主**：读探测只做 `test -r` / `ls`（只列名字），绝不打印文件内容、
  key、token、指纹或注释。
- **不外发数据**：唯一的外网动作是 probe 5 的一次 HEAD 请求，无 payload、
  无凭据、不上传任何内容。
- **不删不改宿主文件**：唯一的写动作是 probe 4 的两个标记文件，写入前先
  检查目标不存在（已存在则拒绝），写入后立即删除（`trap ... EXIT` 兜底）。
- **不写 key/token**：脚本里没有任何凭据；运行时传入的凭据一律不打印。

## 内容

| 文件 | 探测 |
|---|---|
| `probe-1-read-ssh.sh` | 读 `~/.ssh`（`$HOME` + 绝对路径候选） |
| `probe-2-read-cli-logins.sh` | 读 Claude Code / Codex 登录目录与文件 |
| `probe-3-ssh-agent.sh` | 使用 `SSH_AUTH_SOCK`（只记录 `ssh-add -l` 的退出码） |
| `probe-4-write-outside-checkout.sh` | 写 Checkout 之外的文件（`$HOME` 标记 + `/tmp` 标记，写后即删；`/tmp` 标记留 5 秒窗口供宿主侧核查） |
| `probe-5-undeclared-network.sh` | 访问未声明的外网（一次 HEAD，`https://example.com`，只记 HTTP 状态码） |
| `probe-6-read-dsh-config.sh` | 读宿主 DSH 配置（`~/.dsh`、`DSH_HOME` 相关路径，只记名字与可读性；`DSH_*` 变量只计数不打印值） |
| `run-all.sh` | 按顺序跑 1–6，打印环境事实与 verdict 汇总 |

每个脚本最后一行是 verdict 行，格式：

```
PROBE <n> <slug>: <VERDICT> :: <一句话详情>
```

VERDICT 取值：`BLOCKED`（尝试被拦下）、`ESCAPED`（尝试成功）、
`WRITE-OK` / `WRITE-DENIED`（probe 4 的写动作本身成败）、`ERROR`（工具缺失
等执行问题）。`WRITE-OK` 在不同条件下的含义不同（临时区可写、隔离 HOME
内可写、真正的越权），由 RUNBOOK 的判定表按条件解读，不要直接把
`WRITE-OK` 读作越权成功。

## 如何运行

**不要直接运行。** 按 `../RUNBOOK.md` 的条件矩阵执行：同一组脚本要在
DSH sandbox `workspace-write`、隔离 HOME 的 install 进程、`credential=cli-login`
的 CLI 进程、validator 只读快照四种条件下分别跑，每次的结果记进报告矩阵。

本仓库是惰性的：clone / 复制不会触发任何执行，探测只在显式调用时运行。
