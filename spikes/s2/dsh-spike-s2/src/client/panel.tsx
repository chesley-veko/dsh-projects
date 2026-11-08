/**
 * Spike S2 main panel: lists the coordinators created by the server
 * endpoint (Open via `ctx.uiWorkspace.openSession`), creates new ones,
 * and probes the right-column state through the DOM marker
 * `data-sidebar-right-open` (SidebarRight.tsx:346).
 */
import { useEffect, useState, type ReactElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { T } from './locales.ts'
import styles from './panel.module.css'

type ClientContext = Context & { sessions: ISessions }

interface CoordinatorRow {
  sessionId: SessionId
  cwd: string
  workspacePath?: string
  createdAt: number
}

export function Panel(props: { ctx: ClientContext; t: T }): ReactElement {
  const { ctx, t } = props
  const [coordinators, setCoordinators] = useState<CoordinatorRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [rightColumn, setRightColumn] = useState<string | null>(null)
  const load = async (): Promise<void> => {
    try {
      const res = await fetch('/spike-s2/api/coordinators', { headers: { 'x-spike-request': '1' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { coordinators: CoordinatorRow[] }
      setCoordinators(data.coordinators)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  const create = async (): Promise<void> => {
    try {
      const res = await fetch('/spike-s2/api/coordinators', {
        method: 'POST',
        headers: { 'x-spike-request': '1', 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  const checkRightColumn = (): void => {
    const el = document.querySelector('[data-sidebar-right-open]')
    const value = el?.getAttribute('data-sidebar-right-open')
    setRightColumn(value === 'true' ? t('rightColumnOpen') : value === 'false' ? t('rightColumnClosed') : t('rightColumnUnknown'))
  }
  useEffect(() => { void load() }, [])
  return (
    <div className={styles.panel}>
      <h2>{t('title')}</h2>
      <p>{t('intro')}</p>
      <button type="button" onClick={() => { void load() }}>{t('refresh')}</button>
      <button type="button" onClick={() => { void create() }}>{t('create')}</button>
      {error ? <p>{t('loadError')}: {error}</p> : null}
      {coordinators.length === 0
        ? <p>{t('noCoordinators')}</p>
        : (
          <ul>
            {coordinators.map((c) => (
              <li key={c.sessionId}>
                <code>{c.sessionId}</code>
                <span>{c.cwd}</span>
                <button type="button" onClick={() => { void ctx.uiWorkspace.openSession(c.sessionId) }}>{t('open')}</button>
              </li>
            ))}
          </ul>
        )}
      <h3>{t('probeTitle')}</h3>
      <button type="button" onClick={checkRightColumn}>{t('checkRightColumn')}</button>
      {rightColumn ? <p>{rightColumn}</p> : null}
    </div>
  )
}
