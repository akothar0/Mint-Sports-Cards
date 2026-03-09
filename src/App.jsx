import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastContainer } from './components/ToastContainer'
import { useAppContext } from './context/AppContext'
import { AIPicksPage } from './pages/AIPicksPage'
import { CardDetailPage } from './pages/CardDetailPage'
import { CollectionPage } from './pages/CollectionPage'
import { ExplorePage } from './pages/ExplorePage'
import { OnboardingPage } from './pages/OnboardingPage'
import { PreferencesPage } from './pages/PreferencesPage'
import { SetsPage } from './pages/SetsPage'
import { SwipePage } from './pages/SwipePage'
import { WatchlistPage } from './pages/WatchlistPage'

export default function App() {
  const { onboardingComplete } = useAppContext()

  return (
    <>
      <Routes>
        {!onboardingComplete && (
          <>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </>
        )}

        {onboardingComplete && (
          <>
            <Route path="/" element={<Navigate to="/swipe" replace />} />
            <Route path="/onboarding" element={<Navigate to="/swipe" replace />} />
            <Route element={<Layout />}>
              <Route path="/swipe" element={<SwipePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/watchlist" element={<WatchlistPage />} />
              <Route path="/collection" element={<CollectionPage />} />
              <Route path="/sets" element={<SetsPage />} />
              <Route path="/ai-picks" element={<AIPicksPage />} />
              <Route path="/card/:id" element={<CardDetailPage />} />
              <Route path="/preferences" element={<PreferencesPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/swipe" replace />} />
          </>
        )}
      </Routes>
      <ToastContainer />
    </>
  )
}
