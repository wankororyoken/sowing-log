import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from './components/Layout'
import { ComingSoon, Home } from './pages/Home'
import { BackupPage } from './pages/more/BackupPage'
import { CropsPage } from './pages/more/CropsPage'
import { FieldForm, FieldList } from './pages/more/FieldsPage'
import { MachinePage } from './pages/more/MachinePage'
import { MoreMenu } from './pages/more/MoreMenu'
import { RollCatalog, RollForm, RollList } from './pages/more/RollsPage'
import { SettingsPage } from './pages/more/SettingsPage'
import { SeedDetail } from './pages/seeds/SeedDetail'
import { SeedForm } from './pages/seeds/SeedForm'
import { SeedList } from './pages/seeds/SeedList'

// ホーム画面に追加した PWA や静的ホスティングでも確実に動くよう Hash ルーターを使う
const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/record', element: <ComingSoon title="播種を記録" /> },
      { path: '/history', element: <ComingSoon title="履歴" /> },
      { path: '/seeds', element: <SeedList /> },
      { path: '/seeds/new', element: <SeedForm /> },
      { path: '/seeds/:id', element: <SeedDetail /> },
      { path: '/seeds/:id/edit', element: <SeedForm /> },
      { path: '/more', element: <MoreMenu /> },
      { path: '/more/fields', element: <FieldList /> },
      { path: '/more/fields/new', element: <FieldForm /> },
      { path: '/more/fields/:id', element: <FieldForm /> },
      { path: '/more/crops', element: <CropsPage /> },
      { path: '/more/rolls', element: <RollList /> },
      { path: '/more/rolls/new', element: <RollForm /> },
      { path: '/more/rolls/catalog', element: <RollCatalog /> },
      { path: '/more/rolls/:id', element: <RollForm /> },
      { path: '/more/machine', element: <MachinePage /> },
      { path: '/more/settings', element: <SettingsPage /> },
      { path: '/more/backup', element: <BackupPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
