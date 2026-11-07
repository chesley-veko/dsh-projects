# 0009 位置 = 代码与 agent 进程所在处；云端是「远程起 agent」
- 状态：Accepted
- 日期：2026-11-08

## 背景
调研显示主流 agent 都不使用 ACP 的 client `fs/*`、`terminal/*` 回调，而是直接读写本地磁盘、用自己的 shell；ACP v2 草案也删除了这些方法。DSH 的 SSH provider 在部署级替换 fs / subprocess，不能按任务选择（`docs/subsystems/ssh.md:27`），E2B 支持已被移除。

## 决定
- `LocationProvider{health, prepare, spawn, exec, sync, release, ports}`；执行者进程在位置内启动，stdio 经 ssh / exec / 提供商 PTY 桥回本机。
- 位置顺序：`local`（M0）→ `ssh`、`docker`（M4）→ 一家沙箱（M5）→ 厂商云黑盒（延后）。
- 环境规格放 `.dsh/environment.json`（兼容 devcontainer）：image / install / start / validate / ports / network / secrets / agents。
- 产品上只呈现「本地 / 云端」两档，云端下选择具体环境。
- 协调者固定在本机。

## 后果
- 远端需要预装执行者 CLI（由 `agents` 字段驱动安装）。
- projects-mcp 需要隧道回本机（ssh 反向转发或出站 HTTPS）。
