/**
 * Spike S2 views: `project-overview` and `project-run`.
 *
 * Boundary (verified in source): `viewTabs()` in ui-conversation
 * apply.ts:211-222 builds the tab row from ALL registered
 * `conversation.view` entries — there is no per-session tab filter (only
 * the trajectory view is gated, by developerTools). So these tabs appear
 * in every session's tab row; only the CONTENT is session-gated, via the
 * `inject(sessionId)` face below. A non-coordinator session shows an
 * explicit placeholder notice instead of an empty view.
 */
import type { ReactElement } from 'react'
import type { T } from './locales.ts'
import styles from './panel.module.css'

interface ViewProps {
  t: T
  isCoordinator: boolean
  openView: (view: string, focus: string) => void
}

export function OverviewView(props: ViewProps): ReactElement {
  const { t, isCoordinator, openView } = props
  if (!isCoordinator) {
    return (
      <div className={styles.view}>
        <h2>{t('overviewTitle')}</h2>
        <p>{t('notCoordinator')}</p>
      </div>
    )
  }
  return (
    <div className={styles.view}>
      <h2>{t('overviewTitle')}</h2>
      <p>{t('overviewBody')}</p>
      <button type="button" onClick={() => { openView('project-run', 'spike-s2-run') }}>{t('switchToRun')}</button>
    </div>
  )
}

export function RunView(props: ViewProps): ReactElement {
  const { t, isCoordinator, openView } = props
  if (!isCoordinator) {
    return (
      <div className={styles.view}>
        <h2>{t('runTitle')}</h2>
        <p>{t('notCoordinator')}</p>
      </div>
    )
  }
  return (
    <div className={styles.view}>
      <h2>{t('runTitle')}</h2>
      <p>{t('runBody')}</p>
      <button type="button" onClick={() => { openView('project-overview', 'spike-s2-overview') }}>{t('switchToOverview')}</button>
    </div>
  )
}
