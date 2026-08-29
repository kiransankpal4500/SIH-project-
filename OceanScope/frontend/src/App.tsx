import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { OceanProvider } from './store/OceanContext';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/Home/HomePage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { ExplorerPage } from './pages/Explorer/ExplorerPage';
import { ObservationsPage } from './pages/Observations/ObservationsPage';
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage';
import { AboutPage } from './pages/About/AboutPage';

export const App: React.FC = () => {
  return (
    <OceanProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/explorer" element={<ExplorerPage />} />
            <Route path="/observations" element={<ObservationsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </OceanProvider>
  );
};

export default App;
