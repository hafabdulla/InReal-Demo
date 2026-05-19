
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import AuthPage from '@/pages/AuthPage';
import PortalLayout from '@/pages/portal/PortalLayout';
import DashboardPage from '@/pages/portal/DashboardPage';
import PropertiesPage from '@/pages/portal/PropertiesPage';
import PropertyDetailPage from '@/pages/portal/PropertyDetailPage';
import InvestmentsPage from '@/pages/portal/InvestmentsPage';
import SettingsPage from '@/pages/portal/SettingsPage';
import { AuthProvider } from '@/contexts/SQLServerAuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import '@/i18n'; // Initialize i18n
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Landing/Home Page - uses App.jsx */}
        <Route path="/" element={<App />} />
        
        {/* Auth Page */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />

        {/* Protected Portal Routes */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute>
              <PortalLayout>
                <DashboardPage />
              </PortalLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/properties"
          element={
            <ProtectedRoute>
              <PortalLayout>
                <PropertiesPage />
              </PortalLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/properties/:id"
          element={
            <ProtectedRoute>
              <PortalLayout>
                <PropertyDetailPage />
              </PortalLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/investments"
          element={
            <ProtectedRoute>
              <PortalLayout>
                <InvestmentsPage />
              </PortalLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/settings"
          element={
            <ProtectedRoute>
              <PortalLayout>
                <SettingsPage />
              </PortalLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);
