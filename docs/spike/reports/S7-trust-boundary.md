# S7 执行信任边界
- 结论：未完成（待 live 运行）
- 执行者：D 路（S7 执行信任边界）    日期：2026-11-08（准备完成；live 运行日期待填）
- 基线：deepseek-harness@fcc0ad46，dsh-superagent-prototype@8c32a9d，其他版本：待 live 记录（DSH、Node、操作系统、sandbox runner）
- 实验代码：spike/s7-trust-boundary@b2aa72b（材料提交；报告草稿在同分支后续提交）

## 结论摘要（3 句以内）
（待 live 运行后填写。）

## 逐项结果（表：检查项 / 结果 / 证据链接 / 备注）

| 条件 × 探测 | 结果 | 证据 | 备注 |
|---|---|---|---|
| A workspace-write × P1 读 `~/.ssh` | （待填） | | |
| A workspace-write × P2 读 CLI 登录目录 | （待填） | | |
| A workspace-write × P3 用 `SSH_AUTH_SOCK` | （待填） | | 须记录当时有无 agent 在跑 |
| A workspace-write × P4 写 Checkout 之外 | （待填） | | 分 `$HOME` 标记与 `/tmp` 标记两项；`/tmp` 须附宿主侧可见性核查 |
| A workspace-write × P5 未声明外网 | （待填） | | |
| A workspace-write × P6 读宿主 DSH 配置 | （待填） | | 另记 `DSH_*` 变量计数 |
| B 隔离 HOME install × P1–P6 | （待填） | | `$HOME` 侧与绝对路径侧分开记 |
| C-claude `credential=cli-login` × P1–P6 | 未测（缺凭据） | — | 缺 Claude Code 登录凭据与 CLI，见「未完成与推断项」 |
| C-codex `credential=cli-login` × P1–P6 | 未测（缺凭据） | — | 缺 Codex 登录凭据与 CLI，见「未完成与推断项」 |
| D validator 只读快照 × P1–P6 | （待填） | | `$HOME` 侧与绝对路径侧分开记 |
| macOS 覆盖 | 未覆盖 | — | 需要用户的 Mac，本轮不做 |

判定规则（见 `spikes/s7/RUNBOOK.md` §5）：凡是出现 `ESCAPED`（除
`EXPECTED-SHARED` / `ALLOWED-TEMP` / `ALLOWED-ISOLATED` 设计使然项外）
的组合，标为「须禁用或须 full-access 风险确认」。

## 反例与故障场景
（待 live 运行后填写。至少一个失败或边界场景：例如模型拒绝执行、
approval 卡住、runner 不可识别、机器中途暂停等，记录实际行为。）

## 对设计的影响（需改的 ADR 或文档，给出建议措辞，不直接改 ADR）
（待 live 结论后填写。）

## 未完成与推断项（明确标注）

- live 运行尚未执行：条件 A、B、D 待指挥者在 dsh-01 上调度；条件 C
  缺凭据；macOS 未覆盖。矩阵与结论均为空，属实。
- 条件 C 缺的东西：Claude Code 登录凭据（用户的 Claude 账号 OAuth，
  `~/.claude.json`）与 dsh-01 上的 `claude` CLI；Codex 登录凭据
  （`~/.codex/auth.json`）与 dsh-01 上的 `codex` CLI。不要编造 C 的结果。
- 以下为**推断（源码）**——只读源码得出，不能算作通过，仅供 live 运行
  对照。基线 deepseek-harness@fcc0ad46，行号按该 SHA：
  - sandbox 的词表只有文件效应：`packages/sandbox/sandbox/src/index.ts:27`
    “Network and process visibility are outside this vocabulary.” 因此
    P5（未声明外网）在 workspace-write 下预期可达，P1/P2/P6 的读预期
    可达——若 live 证实，这些组合须标「须禁用或须 full-access 风险确认」。
  - fs-sandbox 是策略检查，不是内核边界：`packages/fs/fs-sandbox/src/index.ts:7,11`
    “Reads pass through untouched: every mode permits reading”；“NOT a kernel
    boundary … kernel-grade isolation of untrusted CODE stays `ctx.shell`'s job
    (`@deepseek-ai/dsh-bash-sandbox`)”。
  - Linux runner 链为 bwrap 而后 Landlock，缺失则 fail-closed：
    `packages/sandbox/sandbox-local/src/index.ts:2-5`。bwrap 的
    workspace-write 形态（`packages/sandbox/sandbox-local/src/profiles.ts:17-26`）：
    全盘 `--ro-bind / /`（读全部可达）、`/tmp` 为全新 tmpfs（宿主不可见）、
    workspace 根目录 `--bind` 可写、无 `--unshare-net`（网络不受限）。
    Landlock 形态（同文件 28–35）：readOnly `['/']`，readWrite
    `['/dev/null', '/tmp', workspace 根目录]`——读全部可达，`/tmp` 是真实
    目录的读写授权（宿主可见）。
  - 子进程环境清洗（S0 已核实）：`packages/subprocess/subprocess/src/index.ts:47,66-80`，
    `scrubbedParentEnv()` 丢弃 `*KEY*`/`*PASSWORD*/*SECRET*/*TOKEN*` 与全部
    `DSH_*`（大小写不敏感），保留 PATH、HOME、locale 与 proxy 变量；
    `SSH_AUTH_SOCK` 不匹配清洗规则，全仓库源码无任何处理它的代码——
    因此 P3 在 DSH 子进程里预期可用（若当时有 agent 在跑）。
  - bash-local 把显式 env 合并在环境清洗之后：
    `packages/shell/bash-local/src/index.ts:169-173`；subagent-acp 同样走
    该清洗（`packages/subagent/subagent-acp/src/run.ts:344-345`），因此
    Claude Code / Codex 子进程同样继承 HOME 与 `SSH_AUTH_SOCK`。
  - 默认 preset 为 workspace-write（sandbox workspace-write + approval ask）：
    `packages/interaction/permission-presets/src/index.ts:155-156,183-184`；
    sandbox-policy 配置的 fail-safe 默认是 read-only
    （`packages/sandbox/sandbox-policy/src/index.ts:137`）。
  - 临时区可写是设计行为：`packages/sandbox/sandbox/src/roots.ts:97-99`，
    workspace-write 的可写根 = workspace 根 + 显式额外目录 + `/tmp` 与
    `os.tmpdir()`。probe 4 的 `/tmp` 标记写成功不等于越权成功，
    按 RUNBOOK §5 结合宿主可见性解读。
  - dsh-base 默认挂载 sandbox 执行器与本地 sandbox provider：
    `packages/bundle/base/package.json:47,80`
    （`@deepseek-ai/dsh-bash-sandbox`、`@deepseek-ai/dsh-sandbox-local`），
    即 shipped DSH 默认启用 sandbox（以 runner 探查通过为前提）。
  - Windows rung 同样诚实：`packages/sandbox/sandbox-windows-acl/src/index.ts:27`
    “writes are restricted; reads, network, and process visibility are NOT [restricted]”。
- 实验环境说明（准备时已知，live 时复核）：dsh-01（Instabox，Linux），
  `$HOME=/data/home`，lab 在 `/data/home/workspace/dsh-superagent-lab`，
  dsh 全局安装在 `/opt/npm/bin/dsh`，服务跑在 tmux 会话 dsh-superagent、
  127.0.0.1:3082；正在升级到 0.2.2-rc.1 对齐基线，live 时记录实际跑的版本
  与操作系统。dsh-01 的 node 为 v22.23.3，低于 dsh 要求的 >=24.9，
  安装有警告但能跑；角色模型升级后未重验，live 实验前需复查。

## 复现步骤

1. 取材料：`spike/s7-trust-boundary@b2aa72b`（分支本地提交，未 push；
   传到 dsh-01 的方式见 `spikes/s7/RUNBOOK.md` §0）。
2. 按 `spikes/s7/RUNBOOK.md` §1 记录环境，§3 依次跑条件 A、B、D，
   §4 做宿主侧 `/tmp` 核查，§5 填矩阵。
3. 条件 C 与 macOS 按「未完成与推断项」处理，不编造。
4. 本报告只含准备与（待填的）结果；每次尝试的命令与输出见 RUNBOOK
   引用的日志文件（`/tmp/s7-condition-*.log`、`/tmp/s7-condition-A.jsonl`）。
