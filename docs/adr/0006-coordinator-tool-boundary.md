# 0006 协调者的边界写在工具层
- 状态：Accepted
- 日期：2026-11-08

## 背景
Cursor、Claude Code、dsh-superagent、Agent Orchestrator 都要求协调者不写代码；SA 与 AO 用提示词约束，文档自己承认模型可以不听。协调者一旦开始干活就会被长任务占住，失去响应性。

## 决定
协调者 preset 只注册 `docs/architecture/runtime.md` §2 列出的工具，不提供文件写、shell、长等待与子代理工具。状态变更由引擎执行，协调者只提交请求。

## 后果
- 协调者回答「这段代码在哪」这类问题时，需要派一个只读 worker（或由 worker 的总结回答）。
- 越界率可度量且应为 0。
