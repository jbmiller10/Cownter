import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'

// Lazy load page components for code splitting
const LoginPage = React.lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage }))
)
const DashboardPage = React.lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const CattleListPage = React.lazy(() =>
  import('./pages/CattleListPage').then((m) => ({ default: m.CattleListPage }))
)
const PhotosPage = React.lazy(() =>
  import('./pages/PhotosPage').then((m) => ({ default: m.PhotosPage }))
)
const StatsPage = React.lazy(() =>
  import('./pages/StatsPage').then((m) => ({ default: m.StatsPage }))
)
const WeightLogsPage = React.lazy(() =>
  import('./pages/WeightLogsPage').then((m) => ({ default: m.WeightLogsPage }))
)
const NotFoundPage = React.lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
)
const HerdListView = React.lazy(() =>
  import('./components/HerdListView').then((m) => ({ default: m.HerdListView }))
)

// Loading component for lazy-loaded routes
const PageLoader: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
    <CircularProgress />
  </Box>
)

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="cattle"
            element={
              <Suspense fallback={<PageLoader />}>
                <CattleListPage />
              </Suspense>
            }
          />
          <Route
            path="herd"
            element={
              <Suspense fallback={<PageLoader />}>
                <HerdListView />
              </Suspense>
            }
          />
          <Route
            path="cattle/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <div>Cattle Detail Page - Coming Soon</div>
              </Suspense>
            }
          />
          <Route
            path="cattle/:id/edit"
            element={
              <Suspense fallback={<PageLoader />}>
                <div>Cattle Edit Page - Coming Soon</div>
              </Suspense>
            }
          />
          <Route
            path="cattle/new"
            element={
              <Suspense fallback={<PageLoader />}>
                <div>Add New Cattle - Coming Soon</div>
              </Suspense>
            }
          />
          <Route
            path="photos"
            element={
              <Suspense fallback={<PageLoader />}>
                <PhotosPage />
              </Suspense>
            }
          />
          <Route
            path="stats"
            element={
              <Suspense fallback={<PageLoader />}>
                <StatsPage />
              </Suspense>
            }
          />
          <Route
            path="weight-logs"
            element={
              <Suspense fallback={<PageLoader />}>
                <WeightLogsPage />
              </Suspense>
            }
          />
        </Route>

        <Route
          path="/404"
          element={
            <Suspense fallback={<PageLoader />}>
              <NotFoundPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
