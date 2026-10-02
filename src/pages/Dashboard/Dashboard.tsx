/**
 * Dashboard — first page of the LifeOS RPG dashboard.
 *
 * Structure only at this stage: the sidebar shell is live and the Dashboard
 * nav entry is active, but no HUD content (level, XP, health, streaks,
 * attributes, timeline) is filled in yet — see PRD §3.2 for the target
 * feature set.
 */
import './Dashboard.css'

export function Dashboard() {
  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Dashboard</h1>
      </header>
    </div>
  )
}
