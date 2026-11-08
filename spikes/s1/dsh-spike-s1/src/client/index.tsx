/**
 * Spike S1 client: a main panel listing the workers created by the server
 * endpoint, plus a `sidebar.session.row.trailing` badge probe.
 *
 * Seams (deepseek-harness fcc0ad46):
 * - `main` is the keyed slot for main panels (ui-layout contract/slots.ts:36).
 * - `sidebar.session.row.trailing` is a list slot, scope root, inline
 *   (ui-workspace contract/slots.ts:158). Its contract comment is explicit:
 *   "Non-interactive icons after the row's time label" and "Occupants
 *   address their own data by Session id; they must not bind or retain the
 *   Session". It is decoration by design, not a removal seam. The badge
 *   below exists only to demonstrate that distinction live.
 * - Boundary: "Blank Sessions omit the slot" (same contract comment), so a
 *   worker row shows no badge until the session has at least one message.
 *   The live procedure sends one message to the worker before checking.
 * - The sessions probe enumerates the runtime `sessions` service face
 *   (ISessions: api/session-controller/src/client/contract/sessions.ts:49
 *   lists list / retain / using / retainInfo / create / subagentAddress /
 *   refreshProjections / refresh / search / fork — no filter method) and
 *   confirms at runtime that no filter method exists.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { Panel } from './panel.tsx'
import { en, zh, type T } from './locales.ts'

type ClientContext = Context & { sessions: ISessions }

const NS = 'dshSpikeS1'
const PANEL_ID = 'spike-s1' as MainPanelId

export interface SessionsProbe {
  methods: string[]
  hasFilterMethod: boolean
}

function collectMethodNames(value: unknown): string[] {
  const names = new Set<string>()
  let current: unknown = value
  while (current !== null && typeof current === 'object' && current !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(current)) {
      if (key !== 'constructor') names.add(key)
    }
    current = Object.getPrototypeOf(current)
  }
  return [...names].sort()
}

function probeSessionsService(sessions: ISessions): SessionsProbe {
  const methods = collectMethodNames(sessions)
  return { methods, hasFilterMethod: methods.some((method) => /filter/i.test(method)) }
}

/** Row-trailing badge: decoration only. Renders only for `proj-worker-` rows. */
function WorkerBadge({ sessionId }: { sessionId: SessionId }): React.JSX.Element | null {
  if (!sessionId.startsWith('proj-worker-')) return null
  return <span title="spike worker (S1)">W</span>
}

export const inject = ['slots', 'locale', 'sessions', 'uiWorkspace']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-spike-s1: dictionaries')
  const probe = probeSessionsService(ctx.sessions)
  ctx.slots.inject('main', () => ctx.slots.register(
    { name: 'main', key: PANEL_ID, locale: NS, inject: () => ({ probe }) },
    (props: { t: T }) => <Panel ctx={ctx} t={props.t} probe={probe} />,
  ))
  ctx.slots.inject('sidebar.session.row.trailing', () => ctx.slots.register(
    { name: 'sidebar.session.row.trailing', id: 'spike-s1-worker-badge', order: 500, locale: NS },
    WorkerBadge,
  ))
}
