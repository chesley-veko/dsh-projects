# S4 发给 worker 的提示词（逐字使用，经 POST /spike/agents.prompt 发送）

## P-S4-1（检查项 2：模型确认）
> 用一句话回答：你现在用的模型是哪一个？只报 provider 和 model 名，不要多说。

- 期望（worker B）：`opencode-go/deepseek-v4-pro`。
- 期望（普通对照会话）：`opencode-go/deepseek-v4.1-flash`。

## P-S4-2（检查项 3：cwd 与 git 状态）
> 告诉我你当前的工作目录绝对路径，以及它是不是一个 git 仓库（如果
> 是，报分支名；如果不是，直接说不是）。

- 期望（3a worktree）：报出 `/data/home/workspace/spike-s4-test/wt-1`
  与分支 `spike-wt-1`。
- 期望（3b 空目录）：报出 `/data/home/workspace/spike-s4-test/empty-1`
  且说不是仓库，无错误。

## P-S4-3（检查项 4：调用 probe 工具）
> 调用 spike_projects_probe 工具，把返回的 echo 原样贴出来。

- 期望：`calls` 里有该工具调用，结果 `PROBE-OK-51D2`；回复含该串。

## P-S4-4（检查项 6b：存活确认）
> 你还在吗？用一句话回答。

## P-S4-5（检查项 7：重启后历史引用）
> 上一轮我们聊了什么？用两句话概括。

- 期望：能引用重启前至少一轮的实质内容（不是“我没有之前对话的
  记录”）。
