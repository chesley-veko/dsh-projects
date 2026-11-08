# S6 SSH 远端执行与 MCP 回路

- 结论：—（待 live 运行后填）
- 执行者：C 路　日期：
- 基线：deepseek-harness@fcc0ad46（0.2.2-rc.1 合入点），其他版本：（live 时记入 `versions.json`：两机 dsh/Node/操作系统、SSH 网关、模型名）
- 实验代码：spike/s6-ssh-remote@（live 后填 SHA）

## 结论摘要（3 句以内）

（待 live 运行后填。）

## 逐项结果

| 检查项 | 结果 | 证据链接 | 备注 |
|---|---|---|---|
| 远端 initialize（`ssh host -- dsh --profile acp`） | 待跑 | `evidence/<run>/phase-a/rpc.jsonl` | 能力声明原样存档 |
| 远端 `session/new` + MCP 回路（`ssh -R` 转回本机假 Engine） | 待跑 | `evidence/<run>/phase-a/`、假 Engine 日志 | 本机假 Engine 收到远端调用为打通证据 |
| 断线 30 秒：分区前开始的长 prompt | 待跑 | `evidence/<run>/phase-b/rpc.jsonl`、`remote-check-during.txt` | SIGSTOP 本机 ssh（主方法）；强变体为整机暂停 |
| 断线 30 秒：分区中途发出的 prompt | 待跑 | `evidence/<run>/phase-b/` | 是否送达、是否完成 |
| 恢复后 MCP 回路与会话健康 | 待跑 | `evidence/<run>/phase-b/` | echo + OK prompt |
| 本机进程退出后远端进程残留 | 待跑 | `remote-check-after-local-exit.txt`、`remote-check-final.txt` | `ps` 输出为准 |
| 外部执行者变体（S5 最佳者） | 待跑（视 S5 结果与凭据） | `evidence/<run>/phase-a-ext/` | 只在 S5 通过且凭据就绪时跑 |

## 反例与故障场景

（待 live 运行后填。）

设计好的反例（见 `spikes/s6/README.md`）：

- 远端不存在的 `command`（`session/new` 应失败）。
- 分区中途发出的 prompt（恢复后是否送达）。
- 本机退出后远端残留检查。
- 强变体：控制台暂停 dsh-02 整机 30 秒（第二通道亦断，恢复后补查）。

## 对设计的影响（需改的 ADR 或文档，给出建议措辞，不直接改 ADR）

（待 live 运行后填。预期落点：ADR-0016 的 lease 与回收——断线后远端
进程停止/保留策略、Host 恢复后的对账顺序；ADR-0015 的断线后 effect
状态；ADR-0014 的远端 Run capability 撤销。）

## 未完成与推断项（明确标注）

- live 运行尚未执行；本草稿只含实验准备。
- 以下结论来自只读源码，标「推断（源码）」，不算通过：
  - `dsh --profile acp` 走 stdio、stdin EOF 有界关闭（fcc0ad46
    `packages/bundle/acp-app/src/index.ts`）；远端进程在 stdin 断开后
    的行为以 live 的 `ps` 输出为准，不预设。
  - `ssh -R` 转发与 thin proxy 的组合未在源码层面验证，以 live 为准。
- dsh-02 尚未接入（SSH 接入与真 key 放置待指挥者提供）；dsh-01 已升
  0.2.2-rc.1，dsh-02 版本以 live 预检为准。

## 复现步骤

```sh
# dsh-01 上（前置见 spikes/s6/README.md §3）
cd <spikes/s6 所在目录>
./run-s6.sh --ssh-target "<user>@ssh.instabox.sh" \
  --remote-node "$(ssh -o BatchMode=yes -p 2222 <user>@ssh.instabox.sh 'command -v node')" \
  --remote-lab /data/home/workspace/dsh-superagent-lab \
  --remote-workdir /data/home/workspace/spike-s6-work
```

## 审核

（Hark 审核后填。）
