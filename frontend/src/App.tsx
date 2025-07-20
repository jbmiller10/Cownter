import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import {
  LoginPage,
  DashboardPage,
  CattleListPage,
  PhotosPage,
  StatsPage,
  WeightLogsPage,
  NotFoundPage,
} from './pages'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="cattle" element={<CattleListPage />} />
        <Route path="photos" element={<PhotosPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="weight-logs" element={<WeightLogsPage />} />
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}

export default App
