/**
 * Dashboard — player status overview.
 *
 * Layout follows the reference template: status card on the left, attribute
 * overview beside it. The cover image / GIF slot and page title come from the
 * AppShell page header (src/components/PageHeader), which every page receives.
 *
 * Status numbers come from usePlayerStatus() and are placeholders until the
 * backend lands (PRD §8).
 */
import { usePlayerStatus } from '../../features/player/usePlayerStatus'
import { AttributesPanel } from './AttributesPanel/AttributesPanel'
import { PlayerStatusCard } from './PlayerStatusCard/PlayerStatusCard'
import './Dashboard.css'

export function Dashboard() {
  const status = usePlayerStatus()

  return (
    <div className="dashboard">
      <PlayerStatusCard status={status} />
      <AttributesPanel status={status} />
    </div>
  )
}
