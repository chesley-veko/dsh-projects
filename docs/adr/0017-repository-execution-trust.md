# 0017 仓库脚本与 agent 在隔离的信任边界内执行
- 状态：Accepted
- 日期：2026-11-08

## 背景

`.dsh/environment.json` 中的 `install`、`start`、`validate`、Dockerfile 和仓库依赖脚本都可能执行任意代码。本地保留 `HOME`、CLI 登录态或 `SSH_AUTH_SOCK` 是兼容已有产品决策的需要，但 worktree 只是 Git 文件隔离，不是宿主机安全边界。将凭据按次放进同一进程，也不能阻止恶意仓库读取或外传。

## 决定

- 首次把仓库或环境配置交给 Projects 执行时，要求用户确认仓库身份、远端、配置文件 hash、实际执行命令、网络策略和凭据范围。配置内容或 hash 改变后重新确认；worker 不能代表用户确认。
- `install`、`start`、Docker build 和依赖准备使用与 agent 分离的进程环境。默认使用隔离 HOME、空 SSH agent、最小 PATH/locale，且不注入 runtime secrets；build secrets 只在用户单独批准后对指定 build step 短时可见。
- agent 默认在 DSH OS sandbox 的 workspace-write 模式运行，限定到本 Attempt Checkout；默认不传递 `SSH_AUTH_SOCK`、其他仓库路径、宿主 DSH 凭据或全局写权限。需要使用本机 CLI 登录时，用户必须显式选择 `credential=cli-login` 并看到该 provider 会访问本机对应账户；不可证明隔离的宿主/执行者组合不得宣称安全，须阻断或要求用户选择明确的 full-access 风险模式。
- API Key 只注入实际需要它的 agent 进程，不注入仓库 install/start；可写网络策略随环境配置 hash 版本化，默认拒绝未声明的出站访问。凭据泄漏疑虑触发撤销与 Run 停止，不继续自动重试。
- validator 在无运行时 secrets、独立隔离、只读代码快照上执行；如果验证确需外部服务凭据，必须以独立的最小测试凭据和网络策略授权，不能复用生产凭据。

## 后果

- “本机复用 CLI 登录态”是用户显式授权的兼容选项，不是 worker 的默认环境继承。
- 需要环境配置 hash、用户批准记录和启动摘要中的信任/凭据显示。
- M0 Spike 必须实际验证 DSH sandbox 对文件、进程、网络和 CLI 凭据的隔离能力；失败则禁用相应组合，不以 worktree 代替 sandbox。

## 备选方案

- 所有仓库脚本、agent 与 DSH 主进程共享 HOME/SSH agent：实现方便，但仓库代码可读取本机凭据，放弃。
- 禁止一切本机 CLI 登录态：边界简单，但违反本地复用用户登录这一已接受产品目标；改为显式、隔离且可审计的 opt-in。
