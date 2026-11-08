# Spike 插件 HTTP 接口假设（S4 检查的调用契约）

状态：**假设，未实现，未与 A 路 S1 插件对接。** 指挥者 live 前必须拿
这份契约与 A 路实际交付的插件逐项对齐：端点、字段名、返回结构任一
不一致，先改 `checks.md` 里的调用方式，不改结论口径；若 A 路插件
根本不提供某端点，把对应检查标「未完成（缺接口）」，不得用别的
方式绕过去冒充。

## 部署形态假设

- 插件以后缀形式挂在 DSH web server 上（与 superagent 的
  `/orchestrator` 同款：`ctx.webServer.register({kind:'prefix'})`，
  只允许 loopback + 同源访问）。
- 鉴权与 lab 一致：请求头 `x-orchestrator-request: 1`。
- 所有端点只做实验用，不做生产鉴权；不得在请求里放真实 key/token。
- 插件服务端直接调用 `ctx.agents.create` / `ctx.agents.resume` /
  `ctx.workspaceRegistry.list()`，与 `createWebhookSession`
  （`packages/experimental/webhook/src/session.ts:110-118`）同一调用
  层，**但不调 `workspaceRegistry.create`**（除非检查项明确要求）。

## 端点

### GET /spike/version
记录实际运行版本。返回：
```json
{
  "dshVersion": "<dsh --version 输出>",
  "dshPackageVersion": "<全局 @deepseek-ai/dsh package.json 的 version>",
  "node": "v22.23.3",
  "os": "<uname -a>",
  "harnessSha": "fcc0ad46",
  "model": "opencode-go/deepseek-v4.1-flash"
}
```

### POST /spike/agents.create
创建 worker。请求：
```json
{
  "sessionId": "spike-s4-<uuid>",
  "cwd": "/data/home/workspace/spike-s4-test/wt-1",
  "agentPreset": "dsh-superagent-worker",
  "agentOptions": { "provider": "opencode-go", "model": "deepseek-v4-pro" },
  "setup": "projects-probe",
  "abortAfterMs": 0
}
```
- `agentPreset` 省略时用 lab 默认 worker preset；`agentOptions` 省略
  时用全局默认模型。
- `setup` 只接受命名变体，不接受任意代码：`"projects-probe"`（在
  agent scope 注册 `spike_projects_probe` 工具，见 S3 fence 插件同名
  工具，返回 `PROBE-OK-51D2`）；`"none"`（不注册额外工具）。
- `abortAfterMs > 0` 时插件在 setup 进行中按指定毫秒 abort 创建
  signal（供检查项 6a）。
- 成功返回 `200 {"sessionId": "...", "status": "created"}`；失败返回
  4xx/5xx `{"error": "<原文>"}`，不得吞掉原始错误。

### POST /spike/agents.abort
```json
{ "sessionId": "spike-s4-<uuid>" }
```
Abort 指定会话的创建 signal（仅创建进行中有效；创建完成后 signal
已 detach，应返回 `{"status": "noop", "reason": "signal-detached"}`）。

### POST /spike/agents.prompt
向已创建会话发一条 user 消息并等首轮回复。请求：
```json
{ "sessionId": "spike-s4-<uuid>", "text": "..." }
```
返回：
```json
{
  "reply": "<模型回复全文>",
  "model": "<本轮实际使用的 provider/model，如 opencode-go/deepseek-v4-pro>",
  "calls": [{ "name": "spike_projects_probe", "args": {}, "result": "PROBE-OK-51D2", "error": null }],
  "usage": { "inputTokens": 0, "outputTokens": 0, "cacheReadTokens": null, "cacheWriteTokens": null }
}
```
- `model` 字段是检查项 2 的关键证据：必须是 agentOptions 指定的模型。
- `usage` 缺失的缓存字段记 null，不得按 0 计。

### POST /spike/agents.resume
```json
{ "sessionId": "spike-s4-<uuid>" }
```
按 sessionId 找回（对应 `agents.resume({resumeSessionId})`）。
成功返回 `200 {"sessionId": "...", "status": "resumed"}`。

### GET /spike/agents.inspect?sessionId=…
```json
{
  "exists": true,
  "status": "live | disposed | unknown",
  "model": "opencode-go/deepseek-v4-pro",
  "cwd": "/data/home/workspace/spike-s4-test/wt-1",
  "agentPreset": "dsh-superagent-worker",
  "workspaceCount": 3,
  "globalDefaultModel": "opencode-go/deepseek-v4.1-flash"
}
```

### GET /spike/tools.visible?sessionId=…
```json
{ "tools": ["spike_projects_probe", "read", "..."] }
```
返回该 agent 视角的可见工具名（供 S3 步骤 1a 用）。

### GET /spike/system-prompt?sessionId=…
```json
{ "sections": [{ "name": "spike-s3-index", "order": 10, "text": "..." }] }
```
返回当轮 assembly 的 section 全文（供 S3 步骤 3 用）。

### POST /spike/agents.compact
```json
{ "sessionId": "spike-s3-<uuid>" }
```
触发 compactNow。返回 `{"summary": "...", "replacedRange": [a, b],
"tokenAccounting": {...}}`，无安全可压区间时返回 `null`（供 S3 步骤 3 用）。

### GET /spike/workspaces
```json
{ "count": 3, "ids": ["...", "..."] }
```
`workspaceRegistry.list()` 的直接映射（供 S4 检查项 5 用）。

### GET /spike/global-default
```json
{ "provider": "opencode-go", "model": "deepseek-v4.1-flash" }
```
全局默认模型（对应 `agent-default-model` 配置；供 S4 检查项 2 的
前后对比用）。

## 与 A 路对接时必须确认的点

1. 插件是否真实存在、是否已装进 lab profile、走哪个前缀与端口。
2. `setup` 命名变体是否含 `"projects-probe"`；若无，谁来提供
   probe 工具注册。
3. `agents.create` 的 `signal` 是否可由插件在 `abortAfterMs` 后 abort；
   若无，检查项 6a 改为「插件侧不支持，改由指挥者在创建调用进行中
   直接调 abort 端点」。
4. `model` 字段是否真实取自本轮路由选择，而非回显请求值。
5. `GET /spike/workspaces` 的 count 是否含 superagent 自己的
   machine workspace（基线数以实验前实测为准，不得假设为 0）。
