# DSH 原生对话与过程面板

本页记录从本机 DSH 源码 checkout（`~/work/agents/deepseek-harness`）确认的对话、过程与输入区规则，原型的中栏按这套规则实现；Projects 面板仍沿用 Cursor 的交互。

## 来源

- `packages/client/ui-chat/src/client/conversation-nodes/README.zh.md`
- `packages/client/ui-chat/src/client/chat/TurnProcessNodeView.tsx` / `.module.css`
- `packages/client/ui-chat/src/client/chat/ReasoningRow.tsx` / `.module.css`
- `packages/client/ui-sidebar/src/client/SidebarRoot.tsx` / `.module.css`
- `packages/client/ui-chat/src/client/locale.ts`

## 侧栏

- 顶部是品牌行：深海鲸标 + `deepseek` 字标（DeepSeek 卡为品牌蓝）+ 侧栏开合。
- 全局入口只有「新会话」「插件」两行，图标 18px，行高约 34px。
- 「工作区」是二级分组：工作区名 + 其下会话；会话是 5px 空心圆 + 标题 + 相对时间。
- 底部只有账户行：小鲸鱼 + 名字 + chevron，不再放设置/齿轮。
- 侧栏宽度约 272px，字号 13–14px。

## 对话头部

- 标题是衬线字体，后接一个灰色小徽标（如「标准模式」）。
- 中间偏右是「对话 / 轨迹」分段控件。
- 右侧依次是文件/上下文按钮、更多、右侧栏开合。
- 头部高度约 60px。

## 过程控件

- 一轮完成后在过程内容上方显示一行「用时 X」；展开后显示二级过程组。
- 控件是整行按钮：底部 0.5px 分隔线、文字 14px、右侧 chevron；展开时 chevron 旋转。
- 过程组是二级折叠：组头显示类别摘要（如「读取 1 · 命令 1」）；展开后是思考 / 工具行。
- 思考行：思考图标 + 「思考」 + 小圆点 + 首行摘要；可单独展开完整推理。
- 工具行：读取 / 运行命令 / 编辑等类别 + 文件路径或命令；工具名与路径用等宽字体。
- 最终答案正文不参与过程收起；默认收起过程，保留答案。
- 过程控件与操作只在轮次结束后出现；运行中有单独的运行状态。

## 输入区

- 单行圆角输入框，placeholder 提示 `/type for commands` 一类命令入口。
- 底部状态行：左侧环境/接受编辑，中间轮次、步骤、token/缓存统计，右侧模型与百分比。
- 模型不在输入框内部；附件/动作在底部状态行。
- 用户消息在右侧气泡；助手消息是正文；消息底部有复制、反馈、分支与时间。

## 原型映射

- 侧栏、头部、对话、过程、输入区恢复 DSH 视觉与文案。
- 过程数据由每个 Worker Ticket 的运行记录生成：`用时` + 过程组 + 思考/工具行。
- Projects 面板（List/Board/Library、状态图标、Peek、拖拽调宽、Recents/All Files）仍采用 Cursor Projects 的交互与信息密度。
- 命令面板、项目图标/颜色选择、右键菜单属于 Projects 层增强，不改变宿主对话形态。
