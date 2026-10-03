import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { AppShell } from './components/AppShell/AppShell'
import { navItems, type PageId } from './components/Sidebar/nav-items'
import { motionSuppressed } from './preferences/apply'
import { PreferencesProvider } from './preferences/PreferencesProvider'
import { usePreferences } from './preferences/usePreferences'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { FeaturePage } from './pages/FeaturePage/FeaturePage'

function isPageId(route: string): route is PageId {
  return navItems.some((item) => item.id === route)
}

/** Route-level shell. Preferences live in the provider above it. */
function AppRoutes() {
  const { preferences } = usePreferences()
  const [activePageId, setActivePageId] = useState<PageId>(() => {
    const route = window.location.hash.replace(/^#\/?/, '')
    return isPageId(route) ? route : 'dashboard'
  })
  const activePage = navItems.find((item) => item.id === activePageId) ?? navItems[0]

  useEffect(() => {
    const handleHashChange = () => {
      const route = window.location.hash.replace(/^#\/?/, '')
      const nextPageId = isPageId(route) ? route : 'dashboard'
      if (nextPageId === activePageId) return

      const updatePage = () => setActivePageId(nextPageId)
      if (
        typeof document.startViewTransition === 'function' &&
        !motionSuppressed(preferences.reduceMotion)
      ) {
        document.startViewTransition(() => flushSync(updatePage))
      } else {
        updatePage()
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [activePageId, preferences.reduceMotion])

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

export default function App() {
  return (
    <PreferencesProvider>
      <AppRoutes />
    </PreferencesProvider>
  )
}
