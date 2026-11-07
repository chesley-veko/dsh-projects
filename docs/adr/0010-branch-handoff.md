# 0010 Attempt / Checkout / Run 三层，git 分支是交接介质
- 状态：Accepted
- 日期：2026-11-08

## 背景
本地 ⇄ 云端交接、换执行者、best-of-N 都需要「代码状态」与「会话」「位置」解耦。Cursor、Codex Cloud、Claude teleport 都以分支交接；会话迁移只对会话文件在本地磁盘的执行者可行（Claude、Codex、OpenCode、DSH），Claude 的 teleport 还是单向的。

## 决定
- Attempt = 分支；Checkout = 分支在某位置的检出；Run = 执行者会话。
- 交接：停 Run → WIP 提交 + push + preserved ref → 目标位置检出并 install → 新 Run（可续接则带会话，否则交接简报）→ 释放旧 Checkout。
- best-of-N：一个 Task 并行最多 4 个 Attempt，采用一个，其余 `superseded`，分支保留。
- 只承诺「代码 + 简报」迁移；会话迁移是按执行者提供的增强，UI 标明本次带了什么。

## 后果
- 取代 ADR-0004 中「Attempt 持有 worktree」的表述；worktree 回收规则改为对 Checkout 生效。
