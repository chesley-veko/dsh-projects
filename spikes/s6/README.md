# S6 SSH 远端执行与 MCP 回路 — 运行手册

> 分支：`spike/s6-ssh-remote`。状态：实验准备完成，live 未跑。
> 任务书：[docs/spike/README.md §S6](../../docs/spike/README.md)。
> 依赖：S5（薄代理与假 Engine 复用 `spikes/s5/`；远端执行者候选以 S5 矩阵为准）。
> 相关 ADR：[0016](../adr/0016-local-project-host-availability.md)（lease 与回收设计输入）、
> [0015](../adr/0015-external-effect-reconciliation.md)（断线后 effect 状态）、
> [0014](../adr/0014-run-capability-and-acp-permission.md)（远端 Run capability）。

## 1. 要回答的问题

`ssh host -- dsh --profile acp`（以及 S5 中表现最好的一个外部执行者）
能否作为远端 Run。

## 2. 拓扑（dsh-01 为本机 Host，dsh-02 为远端）

```
dsh-01（本机）                                   dsh-02（远端）
┌──────────────────────────────┐                  ┌──────────────────────────┐
│ s6-remote-roundtrip.mjs      │  ACP over        │ dsh --profile acp        │
│ s6-disconnect.mjs            │  ssh stdio       │  (DSH_HOME=<lab>)        │
│   └─ rpc-client (../s5/) ────┼──ssh -p 2222───▶│   └─ session/new          │
│ fake-engine.mjs :8931 ◀──────┼── ssh -R ───────│       └─ thin proxy      │
│   (POST /engine/call)        │   8931:127.0.0.1 │          (stdio, 本机)   │
└──────────────────────────────┘                  └──────────────────────────┘
第二条 ssh 通道跑 remote-check.sh（分区期间与退出后观测远端 ps）。
```

关键点：

- ACP stdio 本身走第一条 ssh 通道；MCP 回路走 `ssh -R`：远端 thin proxy
  向 `http://127.0.0.1:8931` 发出的调用，在 dsh-02 上被 `-R` 转回
  dsh-01 的假 Engine。假 Engine 日志收到调用 = 回路打通的直接证据。
- 远端 `session/new` 的 `cwd`、thin proxy 的 `--scratch` 都是
  **dsh-02 上的路径**，禁止用本机路径代替。

## 3. 环境准备

### 3.1 dsh-02（远端）

```sh
# 以下均在 dsh-02 的终端里执行（经控制台网页终端或 SSH）。
# 0. 记录实际值，禁止假设：
hostname; whoami; echo $HOME; node --version; npm --version
command -v node    # 记下绝对路径，后面 --remote-node 用
command -v dsh     # 若无，走下一步安装

# 1. 装 dsh（与 dsh-01 同基线：0.2.2-rc.1；以实测版本为准记入报告）
npm install -g @deepseek-ai/dsh@0.2.2-rc.1

# 2. 建 lab 并放 acp 覆盖层（与 dsh-01 的 lab 同构）
mkdir -p ~/workspace/dsh-superagent-lab/profiles
cp -r <spikes/s5/lab-acp-overlay> ~/workspace/dsh-superagent-lab/profiles/acp
cd ~/workspace/dsh-superagent-lab/profiles/acp && pnpm install
DSH_HOME=~/workspace/dsh-superagent-lab dsh --profile acp --dump-config | grep -A4 'id: agent-default-model'
# 必须是 opencode-go / deepseek-v4.1-flash，否则停下报卡住。

# 3. 放真 key（指挥者操作；路径与 dsh-01 一致，600 权限；不得写入分支/日志/报告）
mkdir -p ~/.config/dsh-lab
printf '%s' '<真 key>' > ~/.config/dsh-lab/opencode.env && chmod 600 ~/.config/dsh-lab/opencode.env
wc -c ~/.config/dsh-lab/opencode.env   # 应为 51 字节（与 dsh-01 的真 key 同长）

# 4. 传实验材料（spikes/s5 + spikes/s6 两份；live 前指挥者从分支推或直传）
mkdir -p ~/workspace/spike-materials
cp -r <spikes/s5> ~/workspace/spike-materials/s5
cp -r <spikes/s6> ~/workspace/spike-materials/s6
mkdir -p ~/workspace/spike-s6-work
```

### 3.2 dsh-01（本机）

```sh
# 0. 预检：lab 服务在跑（3082）、角色模型与 dsh-01 升级后一致
curl -s -H "x-orchestrator-request: 1" http://127.0.0.1:3082/orchestrator/api/models
# 1. 传实验材料到 dsh-01（与 dsh-02 同布局，路径见 run-s6.sh 默认值）
# 2. 确认 SSH 接入：指挥者提供 dsh-02 的 SSH 用户名（ibssh_<token>@ssh.instabox.sh）
ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -p 2222 <user>@ssh.instabox.sh 'echo ok; hostname'
```

## 4. 执行步骤（dsh-01 上）

```sh
cd <spikes/s6 所在目录>
./run-s6.sh --ssh-target "<user>@ssh.instabox.sh" \
  --remote-node "$(ssh -o BatchMode=yes -p 2222 <user>@ssh.instabox.sh 'command -v node')" \
  --remote-lab /data/home/workspace/dsh-superagent-lab \
  --remote-workdir /data/home/workspace/spike-s6-work
```

| 阶段 | 脚本 | 做什么 | 证据 |
|---|---|---|---|
| 预检 | `remote-check.sh`（第二通道） | 两机版本、`$HOME`、端口、lab、key 文件存在性 | `remote-check-preflight.txt`、`versions-local.json` |
| A | `s6-remote-roundtrip.mjs` | 远端 initialize 存档；`session/new` 带远端 thin proxy；prompt 调 `projects_echo`；本机假 Engine 日志必须收到该调用 | `phase-a/rpc.jsonl`、`phase-a/summary.json`、假 Engine 日志；反例：远端不存在的 command |
| B | `s6-disconnect.mjs` | 分区前起 120 秒 `projects_sleep`；SIGSTOP 本机 ssh 30 秒（分区）；期间第二通道 `remote-check`；分区中途再发一个 echo prompt；SIGCONT 后等前一个 prompt 结束、看中途 prompt 是否送达、恢复后 echo 与 OK prompt | `phase-b/rpc.jsonl`、`remote-check-before|during|after-resume|after-local-exit.txt`、`phase-b/summary.json`（含 SIGSTOP/SIGCONT 时间戳） |
| C | `remote-check.sh`（独立复查） | 本机进程退出后，远端 `dsh` / thin proxy 进程是否残留 | `remote-check-final.txt` |

断线方法说明：主方法为 SIGSTOP 本机 ssh 进程（冻结 stdio 通道，等价于
网络分区，不改任何机器网络配置，可精确计时）。强变体：在控制台暂停
dsh-02 整机 30 秒再恢复，同样记录 1–5；机器暂停时第二通道也会断，
`remote-check` 改为恢复后补查，并在报告里注明用的是哪种方法。

### 外部执行者变体（S5 出结果后）

把 `--executor-cmd` 里的远端命令换成 S5 表现最好的外部执行者，例如：

```sh
ssh -R 8931:127.0.0.1:8931 -o BatchMode=yes -p 2222 <user>@ssh.instabox.sh -- claude-agent-acp
```

只在 S5 矩阵已给该执行者打出「支持/部分」且凭据就绪时跑；否则记
「未测（S5 未通过 / 缺凭据）」，不硬跑。

## 5. 判定与证据

- 通过标准：正常往返与 MCP 回路可用；断线行为被准确记录，能据此设计
  ADR-0016 的 lease 与回收。
- 每项证据：往返日志（`rpc.jsonl`，脱敏）、断线前后远端 `ps` 输出
  （`remote-check-*.txt`）、假 Engine 调用日志。
- 反例（每阶段至少一个）：远端不存在的 command；分区中途发出的 prompt；
  本机退出后远端残留检查；强变体（整机暂停）。

## 6. 指挥者需提供

- dsh-02 的 SSH 接入（`ibssh_<token>@ssh.instabox.sh` 用户名，或等效接入方式）。
- dsh-02 上真 key 的放置（按 §3.1 步骤 3，600 权限；或明确由谁放）。
- 把 `spike/s5-acp-matrix` 与 `spike/s6-ssh-remote` 两个分支推到远端，
  或把 `spikes/s5`、`spikes/s6` 两份材料传到 dsh-01 与 dsh-02
  （live 实验在 dsh-01/dsh-02 上跑，材料必须先到位）。
- S5 矩阵结果（决定外部执行者变体跑哪一个）。

## 7. 填报告

live 跑完后，按 [报告模板](../docs/spike/README.md#4-报告格式)填
`docs/spike/reports/S6-ssh-remote.md`：逐项结果、断线前后状态表、
对 ADR-0016（lease 与回收）的设计建议措辞；所有「推断（源码）」与
「需补丁」项明确标注。
