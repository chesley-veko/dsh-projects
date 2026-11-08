/**
 * Bilingual dictionaries for the S1 spike panel, `[zh, en]` pairs.
 * Mirrors the dsh-superagent locale shape.
 */
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'

const TEXT = {
  title: ['Spike S1 — worker 可见性', 'Spike S1 — worker visibility'],
  intro: ['本面板列出由 spike 端点创建的 proj-worker- 会话；左栏位置由 live 实验观察。', 'Lists proj-worker- sessions created by the spike endpoint; their left-column position is observed live.'],
  refresh: ['刷新', 'Refresh'],
  open: ['打开', 'Open'],
  noWorkers: ['暂无 worker 会话。', 'No worker sessions yet.'],
  loadError: ['读取失败', 'Load failed'],
  probeTitle: ['sessions 服务探针', 'sessions service probe'],
  probeFilter: ['存在 filter 方法', 'filter method present'],
  probeMethods: ['服务方法', 'Service methods'],
  yes: ['是', 'Yes'],
  no: ['否', 'No'],
} as const satisfies Record<string, readonly [string, string]>

export type SpikeS1Key = keyof typeof TEXT
const language = (index: 0 | 1) => Object.fromEntries(Object.entries(TEXT).map(([key, pair]) => [key, pair[index]])) as Record<SpikeS1Key, string>
export const zh = language(0), en = language(1)
export type T = Translate<SpikeS1Key>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { dshSpikeS1: SpikeS1Key }
}
