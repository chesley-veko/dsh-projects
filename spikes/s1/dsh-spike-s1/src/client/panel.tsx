/**
 * Spike S1 main panel: lists the workers created by the server endpoint,
 * with an Open button per worker (via `ctx.uiWorkspace.openSession`) and
 * the runtime sessions-service probe result.
 */
import { useEffect, useState, type ReactElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { SessionsProbe } from './index.tsx'
import type { T } from './locales.ts'
import styles from './panel.module.css'

type ClientContext = Context & { sessions: ISessions }

interface WorkerRow {
  sessionId: SessionId
  cwd: string
  workspacePath?: string
  createdAt: number
}

export function Panel(props: { ctx: ClientContext; t: T; probe: SessionsProbe }): ReactElement {
  const { ctx, t, probe } = props
  const [workers, setWorkers] = useState<WorkerRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const load = async (): Promise<void> => {
    try {
      const res = await fetch('/spike-s1/api/workers', { headers: { 'x-spike-request': '1' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { workers: WorkerRow[] }
      setWorkers(data.workers)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  useEffect(() => { void load() }, [])
  return (
    <div className={styles.panel}>
      <h2>{t('title')}</h2>
      <p>{t('intro')}</p>
      <button type="button" onClick={() => { void load() }}>{t('refresh')}</button>
      {error ? <p>{t('loadError')}: {error}</p> : null}
      {workers.length === 0
        ? <p>{t('noWorkers')}</p>
        : (
          <ul>
            {workers.map((w) => (
              <li key={w.sessionId}>
                <code>{w.sessionId}</code>
                <span>{w.cwd}</span>
                <button type="button" onClick={() => { void ctx.uiWorkspace.openSession(w.sessionId) }}>{t('open')}</button>
              </li>
            ))}
          </ul>
        )}
      <h3>{t('probeTitle')}</h3>
      <p>{t('probeFilter')}: {probe.hasFilterMethod ? t('yes') : t('no')}</p>
      <p>{t('probeMethods')}: {probe.methods.join(', ')}</p>
    </div>
  )
}
