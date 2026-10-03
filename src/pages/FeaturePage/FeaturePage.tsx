import type { PageId } from '../../components/Sidebar/nav-items'
import { AnalyticsPage } from './AnalyticsPage'
import { AttributesPage } from './AttributesPage'
import { GoalsPage } from './GoalsPage'
import { HabitsPage } from './HabitsPage'
import { QuestManagementPage } from './QuestManagementPage'
import { SettingsPage } from './SettingsPage'
import { TimelinePage } from './TimelinePage'

export interface FeaturePageProps {
  pageId: Exclude<PageId, 'dashboard'>
}

export function FeaturePage({ pageId }: FeaturePageProps) {
  switch (pageId) {
    case 'habits':
      return <HabitsPage />
    case 'quests':
      return <QuestManagementPage />
    case 'goals':
      return <GoalsPage />
    case 'attributes':
      return <AttributesPage />
    case 'timeline':
      return <TimelinePage />
    case 'analytics':
      return <AnalyticsPage />
    case 'settings':
      return <SettingsPage />
  }
}
