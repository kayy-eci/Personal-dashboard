import { AppShell } from './components/AppShell/AppShell'
import { Dashboard } from './pages/Dashboard/Dashboard'

function App() {
  return (
    <AppShell page={{ pageId: 'dashboard', title: 'Dashboard' }}>
      <Dashboard />
    </AppShell>
  )
}

export default App

