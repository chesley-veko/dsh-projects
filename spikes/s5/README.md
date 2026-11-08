# S5 本机 ACP 执行者能力矩阵 — 运行手册

> 分支：`spike/s5-acp-matrix`。状态：实验准备完成，live 未跑。
> 任务书：[docs/spike/README.md §S5](../../docs/spike/README.md)。
> 相关 ADR：[0014](../adr/0014-run-capability-and-acp-permission.md)、
> [0015](../adr/0015-external-effect-reconciliation.md)。

## 1. 目的

自建 ACP client 依赖的能力，三个首批执行者各支持到什么程度：

| 执行者 | 启动命令 | 凭据 |
|---|---|---|
| `dsh --profile acp`（本地） | `dsh --profile acp` | 走 lab 已配好的 opencode-go 路由，可完整测 |
| `@agentclientprotocol/claude-agent-acp` | `claude-agent-acp` | 需 Claude 订阅登录或 `ANTHROPIC_API_KEY` |
| `@agentclientprotocol/codex-acp` | `codex-acp` | 需 ChatGPT 订阅登录或 `OPENAI_API_KEY` |

输出一张「执行者 × 能力」矩阵，每格「支持 / 部分 / 不支持」并附证据。
矩阵本身就是结论，不要求全绿。

## 2. 基线与源码核实结论（fcc0ad46，只读源码得出，标「推断（源码）」）

基线：`deepseek-harness@fcc0ad46`（0.2.2-rc.1 合入点）、`dsh-superagent-prototype@8c32a9d`。
实验主机 dsh-01（Instabox，`$HOME=/data/home`）。**每次 live 前记录实际版本，
不可假设**：`dsh` 版本（dsh-01 正在从 0.2.1-rc.3 升到 0.2.2-rc.1）、
Node 版本（dsh-01 为 v22.23.3，低于 dsh 要求的 >=24.9，安装有警告但能跑）、
各适配器版本、操作系统、模型名，全部写进 `versions.json` 与报告。

源码核实（`~/workspace/dsh-harness-s0`，fcc0ad46）：

- Profile：`dsh --profile acp`，模板 bundles 为
  `[@deepseek-ai/dsh-base, @deepseek-ai/dsh-acp-app]`
  （`packages/util/official-bundles/src/bundles.ts:11-13`）；首次使用时
  CLI 在 `DSH_HOME/profiles/acp/` 按模板自动初始化
  （`apps/cli/src/plugin.ts:44-48`）；合成顺序为 bundles → profile
  `cordis.patch.yml` → `--patch` overlays（`apps/cli/src/profile-boot.ts:82-83`）。
- 调用方式：无选项，stdio 上服务 ACP 直到客户端断开；stdin EOF 触发
  有界关闭（`packages/bundle/acp-app/src/index.ts`）。**stdout 属于 ACP**，
  日志走 stderr；客户端必须分开读。
- `initialize` 返回（`packages/acp/acp/src/index.ts:179`）：
  `agentInfo {name: 'deepseek-harness-acp', version: '0.0.1'}`，
  `agentCapabilities {mcpCapabilities: {http: true}, promptCapabilities:
  {image: <随 provider>, audio: false, embeddedContext: false},
  sessionCapabilities: {close: {}, list: {}, resume: {}}}`，
  `authMethods: []`。`protocolVersion` 为 SDK 常量（SDK 1.4.0），
  **以运行时返回值为准，不预设**。
- 服务端方法表（同文件方法注册）：`initialize`、`authenticate`（空操作）、
  `session/new`、`session/list`、`session/resume`、`session/close`、
  `session/set_config_option`、`session/prompt`；通知 `session/cancel`。
  **没有 `session/load` 方法**——t6 会探一次并记录实际行为，续接机制是
  `session/resume`（+ `session/list` 发现）。
- `session/new` 参数：`cwd`（绝对路径）、`mcpServers`；返回
  `{sessionId, configOptions}`。`session/resume` 要求会话未激活、已持久化、
  `cwd` 与持久化记录一致。`session/list` 可按 `cwd` 过滤、分页。
- `session/set_config_option`：`configId` 为 `model` 或 `reasoning_effort`，
  `value` 为此前 `configOptions` 返回的不透明 id；未知 model/effort 抛
  `AcpModelConfigError` 转 `invalidParams`；**从 Agent 的下一轮模型步骤起生效**
  （`packages/acp/acp/src/model-control.ts`）。同一会话同时只能有一个
  prompt 在途（第二个报 `a prompt is already in flight`）；`prompt` 返回
  `{stopReason}`。
- 权限回调是 agent → client 的请求 `session/request_permission`
  （`packages/acp/acp/src/index.ts:155-172`）：参数
  `{sessionId, toolCall: {toolCallId}, options: [{optionId: 'allow-once',
  kind: 'allow_once'}, {optionId: 'reject-once', kind: 'reject_once'}]}`；
  回应形状 `{outcome: {outcome: 'selected', optionId}}` 或
  `{outcome: {outcome: 'cancelled'}}`。
- MCP 服务器（`packages/acp/acp/src/mcp.ts`）：stdio 要求 `command` 为绝对路径，
  支持 `env`；http 要求 URL + headers；同名（归一化后）去重报错；未知
  transport 报错；`failOnStartupError: true`（坏的 MCP 服务器会让
  `session/new` 失败）。
- 默认模型：bundle 自带 patch 把 acp 插件配成
  `provider: deepseek-official, model: deepseek-v4-flash`
  （`packages/bundle/acp-app/cordis.patch.yml`）。lab 必须用
  `lab-acp-overlay/` 覆盖成 opencode-go / deepseek-v4.1-flash（见 §3）。

## 3. 环境准备（dsh-01 上执行）

```sh
# 0. 预检：版本与 lab 服务（升级到 0.2.2-rc.1 后，角色模型需重验）
DSH_HOME=/data/home/workspace/dsh-superagent-lab
dsh --version 2>&1; node --version; npm --version
curl -s -H "x-orchestrator-request: 1" http://127.0.0.1:3082/orchestrator/api/models
curl -s -H "x-orchestrator-request: 1" http://127.0.0.1:3082/orchestrator/api/settings/eval
curl -s -H "x-orchestrator-request: 1" http://127.0.0.1:3082/orchestrator/api/settings/executor
# 若服务未跑：/data/home/workspace/dsh-superagent-lab/start.sh

# 1. 安装 acp profile 覆盖层（把 lab 路由与默认模型带进 acp profile）
cp -r spikes/s5/lab-acp-overlay "$DSH_HOME/profiles/acp"
cd "$DSH_HOME/profiles/acp" && pnpm install
DSH_HOME="$DSH_HOME" dsh --profile acp --dump-config | grep -A4 'id: agent-default-model'
DSH_HOME="$DSH_HOME" dsh --profile acp --dump-config | grep -A6 'id: acp$'
# 两处都必须是 opencode-go / deepseek-v4.1-flash，否则停下报卡住，不要绕。

# 2. 取 S5 分支材料（本分支已含），建工作目录
cd ~/workspace/dsh-projects && git checkout spike/s5-acp-matrix
mkdir -p /tmp/spike-s5-work

# 3. 外部执行者（按需；无凭据时只装不跑，矩阵记「未测（缺凭据）」）
npm install -g @agentclientprotocol/claude-agent-acp
npm install -g @agentclientprotocol/codex-acp
# 凭据由指挥者提供（测试账户 / 最小权限 Key），不得写入分支、日志或报告。
# Claude：订阅登录 或 ANTHROPIC_API_KEY；Codex：订阅登录 或 OPENAI_API_KEY。
```

## 4. 实验装置

| 文件 | 作用 | 是什么 / 不是什么 |
|---|---|---|
| `fake-engine.mjs` | 回环 HTTP（默认 127.0.0.1:8931）：`POST /engine/call` 回显并记录，`GET /health`、`/calls` | 假 Engine，实验装置；不冒充真实 Engine |
| `projects-mcp-stdio.mjs` | MCP stdio 服务器：`initialize`/`ping`/`tools/list`/`tools/call`；工具 `projects_echo`、`projects_sleep`、`projects_slow_write`；每条进出 JSON-RPC 记日志 | 薄代理，实验装置；工具调用转发到假 Engine |
| `rpc-client.mjs` | 自建 ACP 客户端：spawn、NDJSON 收发、权限请求处理、脱敏日志（敏感键名一律 `[REDACTED]`，环境变量不记日志） | 测试底座 |
| `t1-*.mjs` … `t8-*.mjs` | 逐项测试脚本（见 §5） | 每项含至少一个反例/边界场景 |
| `run-all.sh` | 全套：版本记录（`versions.json`）→ t8 → t1..t7；t4 跑 allow/reject/cancel/bogus 四次 | 约 30–45 分钟 |

装置自检（已在本机跑过，不含 live 执行者）：`fake-engine` +
`projects-mcp-stdio` 的 initialize / tools/list / echo / slow_write /
未知工具错误往返全部通过；`rpc-client` 对桩 ACP 服务的
initialize / session/new / 未知方法拒绝 / 关闭退出全部通过。

## 5. 逐项步骤

每项的命令形如（`<label>` 为 `dsh-acp` / `claude-acp` / `codex-acp`）：

```sh
cd spikes/s5
./run-all.sh --executor-cmd "dsh --profile acp" --label dsh-acp
# 或单项：
node t1-initialize.mjs --executor-cmd "dsh --profile acp" --log-dir ./evidence/<run>/t1 --label dsh-acp
```

| 项 | 脚本 | 测什么 | 关键断言 / 证据 | 反例 |
|---|---|---|---|---|
| 1 | `t1-initialize.mjs` | `initialize` 能力声明原样存档 | `initialize-<label>.json` 原样存档；`protocolVersion` 非空（值以运行时为准）；`agentInfo`、`agentCapabilities` 齐全 | 重复 initialize（空 `protocolVersion`）；未知方法 `session/nope` 应报 `-32601` |
| 2 | `t2-session-new-mcp.mjs` | `session/new` 带 `mcpServers`，列出并调用薄代理工具 | `session/new` 返回 `sessionId` + `configOptions`；`tool_call` 的 **title 精确等于 `mcp__projects__projects_echo`**；假 Engine 日志收到 `spike-s5-probe`；薄代理日志出现该 `tools/call` | 同名 MCP 服务器、相对路径 `command`、不存在的 `command`（条目 schema 合法时应被拒）；同一不存在的 `command` 但缺 `env`（会被 ACP SDK 静默丢弃，`session/new` 成功——这是旧版「未挂载」的根因） |
| 3 | `t3-set-config-option.mjs` | `set_config_option` 切 model / effort，下一轮生效 | effort 切到另一值后 `configOptions` 当前值已变，下一轮 prompt 正常；model 有第二值时切、prompt、切回；路由单模型时如实记「未测（路由单模型）」，不临时加模型 | 未知 value id；未知 sessionId；未知 effort（均应报 `invalidParams`，选择不变） |
| 4 | `t4-request-permission.mjs` | `session/request_permission` 挂起数分钟后回应原 RPC | 挂起 120 秒期间原 prompt 不结束；allow→升级重试执行、文件写出；reject→工具被拒、文件不写；cancel→审批取消（工具错误，`stopReason` 仍是 `end_turn`）；bogus→未知 optionId 按 rejected 处理（fail closed） | `--permission-outcome bogus`；默认 workspace-write 下 workspace 内写/删**不会**触发审批，prompt 必须越界写（`/var/tmp/...`）并在被拒后带 `sandbox_permissions: danger-full-access` + justification 重试一次（见 §7 源码条件） |
| 5 | `t5-cancel.mjs` | `session/cancel` 在工具调用进行中取消 | `projects_sleep` 进行中取消：prompt 有明确 `stopReason`；`projects_slow_write` 半写文件块数/字节数如实记录；取消后下一轮 prompt 正常 | 空闲时 cancel；连续两次 cancel |
| 6 | `t6-resume-load.mjs` | `session/resume` / `load`，进程退出后续接 | 关闭 stdin 后进程退出；新进程 `session/list` 发现会话，`session/resume` 续接，模型记得暗号 BLUEBIRD | resume 未知 id；resume 错 cwd；已激活会话再 resume；`session/load` 探一次（源码无此方法，预期 `-32601`，以实际为准） |
| 7 | `t7-reconcile.mjs` | 按外部 id 查询/去重（ADR-0015 探针） | 两次相同 `session/new` 是否返回同一 id；两次相同 prompt 是否两次 turn；`session/list` 可见性；编造外部 id `ext-123` 做 resume 应被拒。预期「不支持，恢复走 unknown」，以证据为准 | 请求模式里无外部 id / 幂等键字段（源码依据见 §2） |
| 8 | `t8-credentials.mjs` | 订阅登录与 API Key 两种凭据下的可测性 | 输出 `credentials-gap.json`：每行「执行者 × 凭据 → 可测 / 缺凭据 + 被挡住的步骤」。只记有/无布尔值，不记凭据值 | ——（本项本身就是缺口审计；不 spawn 执行者） |

### MCP 条目形状（2026-11-09 修正）

- stdio 条目必须显式带 `env: []`（ACP SDK 1.4.0 的 `zMcpServerStdio` 要求
  `env: EnvVariable[]`；缺了会被 `vecSkipError` 静默丢弃，`session/new` 照样成功）。
  这是 2026-11-08 首轮表现「MCP 未挂载」的直接原因，不是 dsh-acp 不支持 stdio。
- 模型侧工具名是 `mcp__<serverName>__<rawName>`（`mcp-client` 的命名契约），
  例：`mcp__projects__projects_echo`。工具调用断言必须按精确名匹配，禁用 JSON 子串。
- 权限请求的触发条件不是「写文件/rm」本身，而是**越界**写触发沙箱拒绝后，
  模型带 `sandbox_permissions` 的升级重试。详见报告「根因与源码核实」。

证据：每项子目录含 `rpc.jsonl`（脱敏 JSON-RPC 往返）、`summary.json`、
专项产物（`initialize-<label>.json`、`fake-engine.jsonl`、
`projects-mcp.jsonl`）。证据默认不进分支（见 `.gitignore`），live 跑完后
随报告 PR 附上。

## 6. 凭据缺口（准备时状态）

| 执行者 | 凭据 | 状态 |
|---|---|---|
| `dsh --profile acp` | lab opencode-go 路由 + dsh-01 上 `~/.config/dsh-lab/opencode.env` 的真 key | 可完整测（t8 会复核 lab 服务与 key 文件存在性） |
| `claude-agent-acp` | Claude 订阅登录 或 `ANTHROPIC_API_KEY` | 未测（缺凭据）：无 key，订阅登录态未确认；进程会在启动/认证步被挡住 |
| `codex-acp` | ChatGPT 订阅登录 或 `OPENAI_API_KEY` | 未测（缺凭据）：无 key，订阅登录态未确认；进程会在启动/认证步被挡住 |

指挥者需提供：Claude 与 Codex 各一（测试账户登录态，或最小权限 API Key），
以及 dsh-02 的 SSH 接入（S6 用）。**不要编造任何凭据。**

## 7. 填报告

live 跑完后，按 [报告模板](../docs/spike/README.md#4-报告格式)填
`docs/spike/reports/S5-acp-matrix.md`：矩阵每格「支持 / 部分 / 不支持」
+ 证据链接；反例单列一节；对设计的影响落到具体 ADR（措辞建议，不直接改 ADR）；
所有「推断（源码）」与「需补丁」项明确标注。
