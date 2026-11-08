/**
 * Spike S2 client: coordinator views, composer takeover, input chip.
 *
 * Seams (deepseek-harness fcc0ad46):
 * - `conversation.view` is a list slot, scope session
 *   (ui-conversation contract/slots.ts:285); tabs come from the entries'
 *   options.id + label (apply.ts:211-222); activation goes through
 *   `uiConversation.binding(sessionId).activate(id)` (apply.ts:224).
 *   The chat view registration (ui-chat apply.ts:236-260) is the pattern:
 *   id / order / label: () => t(...) / locale / inject(sessionId).
 * - `conversation.composer` is a chain slot, scope session (slots.ts:290);
 *   election runs selectors in ascending `priority`, first non-null wins
 *   and becomes the component's `matched` prop; all-null falls back to the
 *   resident composer (ui-slots/src/index.ts:300-310). The subagent
 *   read-only composer (ui-subagent index.ts:96-103, select +
 *   priority -10) is the in-repo takeover example.
 * - `conversation.input.left` is a list slot, scope session, no owner
 *   props (apply.ts:470); `conversation.input.model` is a single slot
 *   (apply.ts:473), registered by ui-model-selection — this spike reuses
 *   it, it does not replace it.
 * - No readable active-view state exists in ui-conversation (grep
 *   activeView/currentView: zero hits), so the takeover can only be
 *   scoped per session (coordinator), not per view. This is a design
 *   finding, recorded in the report: the composer is taken over in BOTH
 *   coordinator views, not only in project-run.
 * - Right-column state is observable through the DOM attribute
 *   `data-sidebar-right-open` (SidebarRight.tsx:346); `activePanelId`
 *   (ui-layout stores.ts:19,95) has no DOM marker, so it is observed
 *   from the UI (which main-panel icon is highlighted) + screenshots.
 */
import { useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import { Panel } from './panel.tsx'
import { TakeoverComposer } from './composer.tsx'
import { OverviewView, RunView } from './views.tsx'
import { en, zh, type T } from './locales.ts'

type ClientContext = Context & { sessions: ISessions }

const NS = 'dshSpikeS2'
const PANEL_ID = 'spike-s2' as MainPanelId

/** Input-left chip. Renders in every session's input bar (the slot has no
 * owner props / session gate); the click only toggles a local mark — the
 * spike chip has no backend action. */
function TaskChip(props: { t: T }): React.JSX.Element {
  const { t } = props
  const [added, setAdded] = useState(false)
  return (
    <button type="button" title={t('chipTitle')} onClick={() => { setAdded(!added) }}>
      {added ? t('chipAdded') : t('chipLabel')}
    </button>
  )
}

export const inject = ['slots', 'locale', 'sessions', 'uiWorkspace']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-spike-s2: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('main', () => ctx.slots.register(
    { name: 'main', key: PANEL_ID, locale: NS },
    (props: { t: T }) => <Panel ctx={ctx} t={props.t} />,
  ))
  ctx.slots.inject('conversation.view', () => ctx.slots.register(
    {
      name: 'conversation.view',
      id: 'project-overview',
      order: 1,
      label: () => t('overviewTitle'),
      locale: NS,
      inject: (sessionId) => ({ isCoordinator: sessionId?.startsWith('proj-coordinator-') ?? false }),
    },
    (props: { t: T; isCoordinator: boolean; openView: (view: string, focus: string) => void }) => (
      <OverviewView t={props.t} isCoordinator={props.isCoordinator} openView={props.openView} />
    ),
  ))
  ctx.slots.inject('conversation.view', () => ctx.slots.register(
    {
      name: 'conversation.view',
      id: 'project-run',
      order: 2,
      label: () => t('runTitle'),
      locale: NS,
      inject: (sessionId) => ({ isCoordinator: sessionId?.startsWith('proj-coordinator-') ?? false }),
    },
    (props: { t: T; isCoordinator: boolean; openView: (view: string, focus: string) => void }) => (
      <RunView t={props.t} isCoordinator={props.isCoordinator} openView={props.openView} />
    ),
  ))
  ctx.slots.inject('conversation.composer', () => ctx.slots.register(
    {
      name: 'conversation.composer',
      select: (owner) => owner.sessionId?.startsWith('proj-coordinator-') ? { mode: 'project-run' } : null,
      priority: 10,
      locale: NS,
      children: {
        'conversation.input.left': { kind: 'list', scope: 'session' },
        'conversation.input.model': { kind: 'single', scope: 'session' },
      },
    },
    (props) => <TakeoverComposer {...props} />,
  ))
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register(
    { name: 'conversation.input.left', id: 'spike-s2-task-chip', order: 500, locale: NS },
    (props: { t: T }) => <TaskChip t={props.t} />,
  ))
}
