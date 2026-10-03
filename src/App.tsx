import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell/AppShell'
import { navItems, type PageId } from './components/Sidebar/nav-items'
import { useTheme } from './hooks/useTheme'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { FeaturePage } from './pages/FeaturePage/FeaturePage'

function isPageId(route: string): route is PageId {
  return navItems.some((item) => item.id === route)
}

function App() {
  // Owns the theme so `data-theme` stays in sync for the whole session.
  useTheme()
  const [activePageId, setActivePageId] = useState<PageId>(() => {
    const route = window.location.hash.replace(/^#\/?/, '')
    return isPageId(route) ? route : 'dashboard'
  })
  const activePage = navItems.find((item) => item.id === activePageId) ?? navItems[0]

  useEffect(() => {
    const handleHashChange = () => {
      const route = window.location.hash.replace(/^#\/?/, '')
      setActivePageId(isPageId(route) ? route : 'dashboard')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const pageTitles: Record<PageId, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Your daily progress at a glance' },
    habits: { title: 'Habits', subtitle: 'Build reliable routines through consistent practice' },
    quests: { title: 'Quests', subtitle: 'Turn your priorities into clear, rewarding actions' },
    goals: { title: 'Goals', subtitle: 'Track meaningful outcomes one milestone at a time' },
    attributes: { title: 'Character', subtitle: 'Review the capabilities growing through your activity' },
    timeline: { title: 'Timeline', subtitle: 'A chronological record of your activity' },
    analytics: { title: 'Analytics', subtitle: 'Understand your consistency, progress, and focus' },
    settings: { title: 'Settings', subtitle: 'Configure the app and your rules' },
  }
  const page = pageTitles[activePage.id]

  return (
    <AppShell page={{ pageId: activePage.id, ...page }} activePageId={activePage.id}>
      {activePage.id === 'dashboard' ? (
        <Dashboard />
      ) : (
        <FeaturePage pageId={activePage.id} />
      )}
    </AppShell>
  )
}

export default App
