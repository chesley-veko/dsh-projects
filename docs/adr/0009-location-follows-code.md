# 0009 位置 = 代码与 agent 进程所在处；云端是「远程起 agent」
- 状态：Accepted
- 日期：2026-11-08

## 背景
调研显示主流 agent 都不使用 ACP 的 client `fs/*`、`terminal/*` 回调，而是直接读写本地磁盘、用自己的 shell；ACP v2 草案也删除了这些方法。DSH 的 SSH provider 在部署级替换 fs / subprocess，不能按任务选择（`docs/subsystems/ssh.md:27`），E2B 支持已被移除。

## 决定
- `LocationProvider{health, prepare, spawn, exec, pushFile, pullFile, sync, release, ports}`；执行者进程在位置内启动，stdio 经 ssh / exec / 提供商 PTY 桥回本机。
- 位置顺序：`local`（M0）→ `ssh`、`docker`（M4）→ 一家沙箱（M5）→ 厂商云黑盒（延后）。
- 环境规格放 `.dsh/environment.json`（兼容 devcontainer）：image / install / start / validate / ports / network / secrets / agents。
- 产品上只呈现「本地 / 云端」两档，云端下选择具体环境。
- 协调者固定在本机。

## 后果
- 远端需要预装执行者 CLI（由 `agents` 字段驱动安装）。
- 不假设远端主机、云端沙箱或容器能出站直连 NAT 后的用户本机，也不依赖被受管 SSH 网关拒绝的 `ssh -R` 端口转发：`projects-mcp` 在 SSH、Docker 与 E2B / Daytona 沙箱三类远端位置统一由注入的薄垫片 `projects-mcp-bridge.mjs` 经 `LocationProvider` 建立的第二条 `exec` stdio 通道回传宿主机 `src/executors`；远端工件通过 `LocationProvider.pullFile` 拉回本机 `<context_dir>/artifacts/<task>/`。
