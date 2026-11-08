# Spike S1 — worker 会话可见性（ADR-0018）

要回答：不改宿主时，能否让项目 worker 会话不进入左栏「未分组」，同时不损坏其他能力。
任务书：`docs/spike/README.md` §3 S1；门槛 ADR：`docs/adr/0018-worker-visibility-seam.md`。
报告草稿：`docs/spike/reports/S1-worker-visibility.md`（结论空着，live 实验后填）。

## 布局

- `dsh-spike-s1/` — 最小 spike 插件（cordis bundle，仿 dsh-superagent 构建）：
  - `src/index.ts` — 服务端：`POST /spike-s1/api/workers` 经 `ctx.agents.create`
    创建 id 前缀 `proj-worker-` 的会话（preset `standard`，模型
    opencode-go/deepseek-v4.1-flash）；`originProbe: true` 为负向探针，
    故意传 `origin: 'project-worker'` 并记录抛错；`GET /spike-s1/api/workers`
    列出已创建的 worker；`GET /spike-s1/api/health` 健康检查。
    可选请求字段 `workspacePath`：传了就 `workspaceRegistry.create` +
    `attachSession`（按 cwd 归组方案用）。
  - `src/client/index.tsx` — 客户端：`main` 面板（列出 worker + Open 按钮，
    走 `ctx.uiWorkspace.openSession`）+ `sidebar.session.row.trailing` 徽标
    （仅装饰演示）+ 启动时枚举 `sessions` 服务方法，确认无 filter API，
    结果显示在面板上。
- `profile/` — 测试 profile（端口 **3091**，不加载 dsh-superagent）：
  `package.json`（bundles）+ `cordis.yml` + `cordis.patch.yml`（webserver +
  llm-pi-ai opencode-go 路由 + agent-default-model）+ `pnpm-workspace.yaml`。

## 源码核实结论（fcc0ad46，见报告 §逐项结果）

- 没有会话列表过滤类 slot（ui-workspace contract/slots.ts + tree.ts 只有
  archived filter）；`sidebar.workspaces` 是 single 插槽，整栏替换不是接缝。
- `sidebar.session.row.trailing` 是装饰（contract 注释明文 "Non-interactive
  icons"、"must not bind or retain the Session"）；边界：空白会话不渲染
  该插槽（"Blank Sessions omit the slot"），验徽标前须先给 worker 发一条消息。
- `origin: 'project-worker'` 在创建时抛错（core/session/src/index.ts:126-127），
  不只是类型问题；`=== 'subagent'` 的检查点一律不改（project-worker 保持
  普通路由，`openSession` 才通）。
- ISessions 无 filter 方法；`sidebar.session.row.action` 只能触发动作，不能移除行。

## dsh-01 安装与启动（指挥者调度，见报告 §复现步骤）

1. 在 dsh-01 上 checkout 本分支，`cd spikes/s1/dsh-spike-s1 && pnpm install && pnpm build`。
2. 把 `spikes/s1/profile/` 复制到 lab 的 profiles 下（例如
   `/data/home/workspace/dsh-superagent-lab/profiles/spike-s1/`），并确认
   `profile/package.json` 里的 `link:` 路径指向 dsh-01 上插件的实际位置。
3. 在该 profile 目录 `pnpm install`，用与 lab 相同的方式启动（tmux 新会话，
   `DSH_HOME` 指向 lab 目录，`OPENCODE_API_KEY` 经 `~/.config/dsh-lab/opencode.env`
   注入，端口 3091）。**先记版本**：`dsh --version`、已装 `@deepseek-ai/dsh`
   版本、`node --version`；角色模型升级后未重验，live 前复查默认模型是否
   仍为 opencode-go/deepseek-v4.1-flash。
4. 打开 http://127.0.0.1:3091，左栏应为空（除默认会话外）；用报告里的 curl
   创建 worker，逐项观察。

## 已知风险（live 前注意）

- 构建时 devDeps 钉的是 0.2.1-alpha.2（与 dsh-superagent 相同、在 dsh-01
  上已验证可装），运行时是 profile 装的 0.2.2-rc.1；若 `pnpm build` 报
  类型错，先看是不是 `AgentOptions` / `CreateAgentOptions` /
  `MainPanelId` 导出差异，再按报告 §未完成与推断项 的备选改。
- `main` 面板的显示标题取自 locale 字典 `title` 键；若标题显示为原始 key，
  属外观问题，不影响实验，记入报告备注即可。
- 插件的 worker 在 DSH 重启后是否保留，取决于宿主的会话持久化；步骤 3
  的重启检查会如实记录（若重启后 worker 消失，同样是有效证据——说明
  worker 的生命周期与持久化方式需要另行设计）。
