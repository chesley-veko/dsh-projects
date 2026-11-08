# S5 本机 ACP 执行者能力矩阵

- 结论：—（待 live 运行后填）
- 执行者：C 路　日期：
- 基线：deepseek-harness@fcc0ad46（0.2.2-rc.1 合入点），其他版本：（live 时记入 `versions.json`：dsh、Node、各 CLI 与 ACP 适配器版本、操作系统、模型名）
- 实验代码：spike/s5-acp-matrix@（live 后填 SHA）

## 结论摘要（3 句以内）

（待 live 运行后填。）

## 逐项结果

| 检查项 | dsh --profile acp | claude-agent-acp | codex-acp | 证据链接 | 备注 |
|---|---|---|---|---|---|
| 1. `initialize` 能力声明 | 待跑 | 待跑 | 待跑 | `evidence/<run>/t1/rpc.jsonl`、`initialize-<label>.json` | 原样存档 |
| 2. `session/new` + MCP 薄代理（列出/调用） | 待跑 | 待跑 | 待跑 | `evidence/<run>/t2/` | 假 Engine 日志为准 |
| 3. `set_config_option` 切 model / effort，下一轮生效 | 待跑 | 待跑 | 待跑 | `evidence/<run>/t3/` | 路由单模型时 model 切记「未测（路由单模型）」 |
| 4. `session/request_permission` 挂起后回应（允许/拒绝/取消） | 待跑 | 待跑 | 待跑 | `evidence/<run>/t4-allow|reject|cancel|bogus/` | 挂起 120 秒 |
| 5. `session/cancel` 工具调用进行中取消 | 待跑 | 待跑 | 待跑 | `evidence/<run>/t5/` | 半写文件块数/字节数 |
| 6. `session/resume` / `load`，进程退出后续接 | 待跑 | 待跑 | 待跑 | `evidence/<run>/t6/` | 源码无 `load` 方法，预期 `-32601`，以实际为准 |
| 7. 按外部 id 查询/去重（ADR-0015 探针） | 待跑 | 待跑 | 待跑 | `evidence/<run>/t7/` | 预期「不支持，恢复走 unknown」 |
| 8. 订阅登录凭据 | 可测（lab 路由） | 未测（缺凭据） | 未测（缺凭据） | `evidence/<run>/t8/credentials-gap.json` | 见下 |

### 凭据缺口（准备时状态，不编造）

- `claude-agent-acp`：未测（缺凭据）——缺 Claude 订阅登录或 `ANTHROPIC_API_KEY`；
  被挡住的步骤：进程启动/认证。需指挥者提供测试账户登录态或最小权限 Key。
- `codex-acp`：未测（缺凭据）——缺 ChatGPT 订阅登录或 `OPENAI_API_KEY`；
  被挡住的步骤：进程启动/认证。需指挥者提供测试账户登录态或最小权限 Key。
- `dsh --profile acp`：可完整测（lab opencode-go 路由 + dsh-01 上真 key 文件）。

## 反例与故障场景

（待 live 运行后填。每项至少一个：断线、重启、拒绝、未知工具名等，
记录实际行为。）

设计好的反例（见 `spikes/s5/README.md` §5）：

- t1：重复 initialize（空 `protocolVersion`）；未知方法 `session/nope`。
- t2：同名 MCP 服务器；相对路径 `command`；不存在的 `command`。
- t3：未知 value id；未知 sessionId；未知 effort。
- t4：`--permission-outcome bogus`（未知 optionId）；180 秒内无权限请求。
- t5：空闲时 cancel；连续两次 cancel。
- t6：resume 未知 id；resume 错 cwd；已激活会话再 resume；`session/load` 探针。
- t7：编造外部 id `ext-123` 做 resume；请求模式无外部 id 字段。

## 对设计的影响（需改的 ADR 或文档，给出建议措辞，不直接改 ADR）

（待 live 运行后填。）

## 未完成与推断项（明确标注）

- live 运行尚未执行；本草稿只含实验准备。
- 以下结论来自只读源码，标「推断（源码）」，不算通过：
  - `dsh --profile acp` 的方法表（无 `session/load`）、stdio 行为、
    MCP 绝对路径与去重规则、权限回调形状、配置切换下一轮生效
    （依据：fcc0ad46 `packages/acp/acp/src/index.ts`、`mcp.ts`、
    `model-control.ts`；`packages/bundle/acp-app/cordis.patch.yml`；
    `packages/util/official-bundles/src/bundles.ts`；
    `apps/cli/src/plugin.ts`、`profile-boot.ts`）。
  - `protocolVersion` 具体取值以运行时返回为准，未预设。
- dsh-01 已升到 0.2.2-rc.1；live 前需复查角色模型（升级后未重验）与实际版本。
- 薄代理与假 Engine 是实验装置（只回显并记录），不是被测对象冒充。

## 复现步骤

```sh
# dsh-01 上
cd ~/workspace/dsh-projects && git checkout spike/s5-acp-matrix
# 先装 lab acp 覆盖层并验证（见 spikes/s5/README.md §3）
./spikes/s5/run-all.sh --executor-cmd "dsh --profile acp" --label dsh-acp
# 外部执行者（有凭据后）：
./spikes/s5/run-all.sh --executor-cmd "claude-agent-acp" --label claude-acp
./spikes/s5/run-all.sh --executor-cmd "codex-acp" --label codex-acp
```

## 审核

（Hark 审核后填。）
