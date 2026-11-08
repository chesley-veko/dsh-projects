/**
 * Spike S2 takeover composer for `conversation.composer`.
 *
 * Election (ui-slots/src/index.ts:300-310): selectors run in ascending
 * `priority`; the first non-null return elects its entry and becomes the
 * component's `matched` prop; all-null falls to the owner's fallback.
 * This entry's selector only recognises `proj-coordinator-` sessions
 * (priority 10, after the subagent read-only composer at -10), so ordinary
 * and subagent sessions keep the resident composer.
 *
 * The resident composer is kept mounted but display:none while this entry
 * is elected (`overlay: true` semantics, ChainRenderOpts:273-290). The
 * `conversation.input.left` chip and `conversation.input.model` selector
 * live inside the resident InputBar, so they would be hidden with it.
 * This component re-renders both slots inside itself, declaring them as
 * its `children` in the register call (the framework's way for a component
 * to render sub-slots; `__renders` enforces component ⊆ children at the
 * register site). If the dsh-01 build rejects the children declaration
 * or the renderSlot calls, the documented fallback is to delete the two
 * re-render lines and verify chip + model selector in the project-overview
 * view instead (see spikes/s2/README.md).
 */
import { useState, type ReactElement } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { T } from './locales.ts'
import styles from './panel.module.css'

type ComposerProps = PropsRuntime<'conversation.composer'> & {
  t: T
  matched: { mode: string }
}

export function TakeoverComposer(props: ComposerProps): ReactElement {
  const { t, sessionId, matched, renderSlot } = props
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'sent' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)
  const send = async (): Promise<void> => {
    if (sessionId === undefined || text.trim() === '') return
    try {
      const res = await fetch(`/spike-s2/api/coordinators/${encodeURIComponent(sessionId)}/message`, {
        method: 'POST',
        headers: { 'x-spike-request': '1', 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setText('')
      setStatus('sent')
      setError(null)
    } catch (e) {
      setStatus('failed')
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <div className={styles.composer}>
      <p>{t('takeoverNote')} ({matched.mode})</p>
      <div className={styles.composerRow}>
        <input
          type="text"
          value={text}
          placeholder={t('composerPlaceholder')}
          onChange={(e) => { setText(e.target.value); setStatus('idle') }}
          onKeyDown={(e) => { if (e.key === 'Enter') void send() }}
        />
        <button type="button" onClick={() => { void send() }}>{t('send')}</button>
      </div>
      {status === 'sent' ? <p>{t('composerSent')}</p> : null}
      {status === 'failed' ? <p>{t('composerFailed')}: {error}</p> : null}
      <div className={styles.composerRow}>
        {renderSlot('conversation.input.left', {})}
        {renderSlot('conversation.input.model', {})}
      </div>
    </div>
  )
}
