# 0017 仓库脚本与 agent 在隔离的信任边界内执行
- 状态：Accepted（2026-11-08 S7 实测后收紧默认组合，见「S7 实测」）
- 日期：2026-11-08

## 背景

`.dsh/environment.json` 中的 `install`、`start`、`validate`、Dockerfile 和仓库依赖脚本都可能执行任意代码。本地保留 `HOME`、CLI 登录态或 `SSH_AUTH_SOCK` 是兼容已有产品决策的需要，但 worktree 只是 Git 文件隔离，不是宿主机安全边界。将凭据按次放进同一进程，也不能阻止恶意仓库读取或外传。

## 决定

- 首次把仓库或环境配置交给 Projects 执行时，要求用户确认仓库身份、远端、配置文件 hash、实际执行命令、网络策略和凭据范围。配置内容或 hash 改变后重新确认；worker 不能代表用户确认。
- `install`、`start`、Docker build 和依赖准备使用与 agent 分离的进程环境。默认使用隔离 HOME、空 SSH agent、最小 PATH/locale，且不注入 runtime secrets；build secrets 只在用户单独批准后对指定 build step 短时可见。隔离 HOME 只替换 `$HOME` 指针，不构成文件系统隔离：在未安装 `bwrap`（需具备独立 `--tmpfs /tmp`、`--unshare-net` 与受限只读挂载）或容器隔离的宿主机上，`install` / `start` / `validate` 默认阻断，或要求用户显式确认 `full-access` 风险模式后才放行。
- agent 默认在 DSH OS sandbox 的 workspace-write 模式运行，限定到本 Attempt Checkout；默认不传递 `SSH_AUTH_SOCK`、其他仓库路径、宿主 DSH 凭据或全局写权限。`workspace-write` 在 Landlock 下只限制写、不限制读与出站网络，`/tmp` 还是宿主真实目录。需要使用本机 CLI 登录时，用户必须显式选择 `credential=cli-login` 并看到该 provider 会访问本机对应账户；在未安装 `bwrap` 或容器隔离的宿主机上，`credential=cli-login` 不得宣称隔离，默认阻断或要求显式确认 `full-access` 风险模式。不可证明隔离的宿主/执行者组合不得宣称安全。
- API Key 只注入实际需要它的 agent 进程，不注入仓库 install/start；可写网络策略随环境配置 hash 版本化，默认拒绝未声明的出站访问。凭据泄漏疑虑触发撤销与 Run 停止，不继续自动重试。
- validator 在无运行时 secrets、已停止 Run 并冻结写 capability 的原 Checkout 上原位执行（复用已装好的依赖，结束后校验 `tree_sha` 与 `git status --porcelain` 未变以防篡改；不再额外拷贝只读代码快照，因 S7 实测只读快照在 Landlock 下并不阻止按绝对路径读取宿主其他路径、连外网或访问 `/tmp` 套接字）；如果验证确需外部服务凭据，必须以独立的最小测试凭据和网络策略授权，不能复用生产凭据。不受信仓库的防逃逸统一依赖外部隔离（`bwrap` / 容器）或按 `full-access` 风险模式显式放行。

## S7 实测（2026-11-08，Linux Landlock）

实测环境：dsh 0.2.2-rc.1，Debian GNU/Linux 13 (trixie)，内核 Linux 6.18.60-instabox x86_64，runner 为 Landlock（宿主未安装 `bwrap`）；macOS 未覆盖，`credential=cli-login` 条件（C-claude / C-codex）因缺凭据未测（[S7 报告](../spike/reports/S7-trust-boundary.md)）。

- **workspace-write 只限制写**：P4 写行为符合设计预期（`$HOME` 写被拒；`/tmp` 可写，宿主可见约 5 秒后无残留）；但 P1 读 `~/.ssh`（该目录为空，反映目录可读性而非密钥内容）、P2 读 `~/.claude` / `~/.codex`（`auth.json` 不存在，同样反映目录可读性）、P6 读宿主 DSH 配置（`profiles/superagent/cordis.patch.yml`）全部成功。
- **不限制未声明外网**：P5 在条件 A/B/D 下均为 HTTP 200。workspace-write 没有 `--unshare-net` 等价物，出站默认放行。
- **共享宿主机真实 `/tmp`**：沙箱内写入的 `/tmp` 标记在宿主可见。`SSH_AUTH_SOCK` 未设置时，可直接 glob `/tmp/ssh-*/agent.*` 找到存活 SSH agent 套接字（实测 `/tmp/ssh-eFu9V8tVuJ7V/agent.2980`），套接字可应答但当时无已加载身份；单纯清空环境变量挡不住这条路径。
- **隔离 HOME 与只读快照不够**：条件 B（隔离 HOME install）与条件 D（validator 只读快照）只是把 `$HOME` 换成隔离目录，`$HOME` 侧写被 BLOCKED，但绝对路径读取、`/tmp` 套接字与外网全部照旧（P1/P2/P6 绝对路径侧 ESCAPED）。
- **DSH 会在清洗后重新注入变量名**：环境清洗丢弃父进程 `DSH_*` 后，DSH 自身又注入 5 个变量名——`DSH_PROFILE`、`DSH_PROFILE_DIR`、`DSH_SHELL`、`DSH_SESSION_ID`、`DSH_HOME`。值为空，但变量名本身泄露 lab 路径与会话 id 的存在；条件 B/D 用 `env -i` 时为 0 个。
- **推断（源码，未实测）**：sandbox 词表只覆盖文件效应（`packages/sandbox/sandbox/src/index.ts:27`「Network and process visibility are outside this vocabulary」）；`fs-sandbox` 明确「Reads pass through untouched」（`packages/fs/fs-sandbox/src/index.ts:7,11`）；`bwrap` 形态本应是全盘 `--ro-bind / /`、`/tmp` 为全新 tmpfs、无 `--unshare-net`（`packages/sandbox/sandbox-local/src/profiles.ts:17-26`），因 `bwrap` 未安装未实测；Landlock 形态的 readOnly `['/']`、readWrite `['/dev/null', '/tmp', workspace 根目录]`（同文件 `:28-35`）与 live 观测一致。
- **判定**：按 S7 的 RUNBOOK §5，凡出现 ESCAPED 的组合标「须禁用或须 full-access 风险确认」；只有 P4 的写行为符合设计预期。

## 收紧策略（S7 后）

- 在未安装 `bwrap`（具备独立 `--tmpfs /tmp`、`--unshare-net` 与受限只读挂载）或容器隔离的宿主机上，不受信仓库的 `install` / `start` / `validate` 与 `credential=cli-login` 不得宣称隔离，必须默认阻断，或要求用户显式确认 `full-access` 风险模式后才运行。
- 隔离 HOME、只读代码快照、清空 `SSH_AUTH_SOCK` 环境变量都不能替代文件系统与网络边界；不得用它们作为「已隔离」的证据。
- `bwrap` 形态与 macOS 均未实测；部署前须按实际 runner 重新验证，检测项至少包含 runner 类型、`/tmp` 是否独立 tmpfs、出站是否受限、SSH agent 套接字是否可达。

## 后果

- “本机复用 CLI 登录态”是用户显式授权的兼容选项，不是 worker 的默认环境继承。
- 需要环境配置 hash、用户批准记录和启动摘要中的信任/凭据显示。
- S7 已实测（Linux Landlock）：默认 `workspace-write` 不满足本 ADR 的隔离前提，失败组合按「须禁用或须 full-access 风险确认」处理，不以 worktree 代替 sandbox；macOS 与 `credential=cli-login` 仍待补测。
- 部署检查须识别 runner（`bwrap` / Landlock / 容器）并核对 `/tmp` 是否独立 tmpfs、出站是否受限、SSH agent 套接字是否可达；不满足隔离条件的环境默认阻断。

## 备选方案

- 所有仓库脚本、agent 与 DSH 主进程共享 HOME/SSH agent：实现方便，但仓库代码可读取本机凭据，放弃。
- 禁止一切本机 CLI 登录态：边界简单，但违反本地复用用户登录这一已接受产品目标；改为显式、隔离且可审计的 opt-in。
