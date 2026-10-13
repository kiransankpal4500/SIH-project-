/**
 * OceanScope Frontend Application Shell
 * Configures top-level routing, global providers, authentication lifecycle, and core application layout.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { OceanProvider } from './store/OceanContext';
import { AuthProvider } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/Home/HomePage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { ExplorerPage } from './pages/Explorer/ExplorerPage';
import { ObservationsPage } from './pages/Observations/ObservationsPage';
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage';
import { AboutPage } from './pages/About/AboutPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { SignupPage } from './pages/Auth/SignupPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

export const App: React.FC = () => {
  return (
    <OceanProvider>
      <AuthProvider>
        <BrowserRouter>
          <MainLayout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/explorer" element={<ExplorerPage />} />
              <Route path="/observations" element={<ObservationsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/about" element={<AboutPage />} />

              {/* Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Protected User Profile Route */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      </AuthProvider>
    </OceanProvider>
  );
};

export default App;
