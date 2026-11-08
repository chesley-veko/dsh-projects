/**
 * Bilingual dictionaries for the S2 spike panel, views and composer,
 * `[zh, en]` pairs. Mirrors the dsh-superagent locale shape.
 */
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'

const TEXT = {
  title: ['Spike S2 — 协调者视图', 'Spike S2 — coordinator view'],
  intro: ['本面板列出由 spike 端点创建的 proj-coordinator- 会话；切换路径与右栏状态由 live 实验观察。', 'Lists proj-coordinator- sessions created by the spike endpoint; switch paths and right-column state are observed live.'],
  refresh: ['刷新', 'Refresh'],
  open: ['打开', 'Open'],
  create: ['新建协调者', 'New coordinator'],
  noCoordinators: ['暂无协调者会话。', 'No coordinator sessions yet.'],
  loadError: ['读取失败', 'Load failed'],
  probeTitle: ['右栏状态探针', 'Right-column probe'],
  checkRightColumn: ['检查右栏状态', 'Check right-column state'],
  rightColumnOpen: ['右栏：展开', 'Right column: open'],
  rightColumnClosed: ['右栏：收起', 'Right column: closed'],
  rightColumnUnknown: ['右栏：未检测到标记', 'Right column: marker not found'],
  overviewTitle: ['项目总览（spike 占位）', 'Project overview (spike placeholder)'],
  overviewBody: ['这是 project-overview 视图。真实项目总览尚未实现；本视图只验证视图注册、切换与右栏常驻。', 'This is the project-overview view. A real project overview is not implemented; this view only verifies view registration, switching and a resident right column.'],
  runTitle: ['项目运行（spike 占位）', 'Project run (spike placeholder)'],
  runBody: ['这是 project-run 视图。下方的输入框是 conversation.composer 接管版本；常驻输入框已被隐藏（overlay 保持挂载但 display:none）。', 'This is the project-run view. The input below is the conversation.composer takeover; the resident composer stays mounted but display:none (overlay).'],
  notCoordinator: ['当前会话不是协调者（id 不以 proj-coordinator- 开头），本视图为空白占位。', 'This session is not a coordinator (id lacks the proj-coordinator- prefix); this view is an empty placeholder.'],
  switchToRun: ['切换到 project-run', 'Switch to project-run'],
  switchToOverview: ['切换到 project-overview', 'Switch to project-overview'],
  composerPlaceholder: ['给协调者发消息…', 'Message the coordinator…'],
  send: ['发送', 'Send'],
  composerSent: ['已发送', 'Sent'],
  composerFailed: ['发送失败', 'Send failed'],
  takeoverNote: ['接管输入框（spike）：下方重新渲染了 input.left chip 与模型选择器。', 'Takeover composer (spike): the input.left chip and model selector are re-rendered below.'],
  chipLabel: ['＋ 任务', '+ Task'],
  chipAdded: ['✓ 任务', '✓ Task'],
  chipTitle: ['Spike S2 chip：仅本地标记，无后端动作', 'Spike S2 chip: local mark only, no backend action'],
  yes: ['是', 'Yes'],
  no: ['否', 'No'],
} as const satisfies Record<string, readonly [string, string]>

export type SpikeS2Key = keyof typeof TEXT
const language = (index: 0 | 1) => Object.fromEntries(Object.entries(TEXT).map(([key, pair]) => [key, pair[index]])) as Record<SpikeS2Key, string>
export const zh = language(0), en = language(1)
export type T = Translate<SpikeS2Key>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { dshSpikeS2: SpikeS2Key }
}
