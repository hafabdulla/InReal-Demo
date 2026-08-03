import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import AuthPage from '@/pages/AuthPage';
import PortalLayout from '@/pages/portal/PortalLayout';
import DashboardPage from '@/pages/portal/DashboardPage';
import PropertiesPage from '@/pages/portal/PropertiesPage';
import PropertyDetailPage from '@/pages/portal/PropertyDetailPage';
import InvestmentsPage from '@/pages/portal/InvestmentsPage';
import DocumentsPage from '@/pages/portal/DocumentsPage';
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

        {/* The investor dashboard has always lived at /portal, but it is called
            "Dashboard" in the nav and in the PO's spec, so /dashboard is the
            path people actually type. Renaming the real route would break every
            existing link and all of PortalLayout's navigation for no gain; an
            alias costs one line. Note there is still no catch-all route, so any
            other unmatched path renders a blank page — worth fixing separately. */}
        <Route path="/dashboard" element={<Navigate to="/portal" replace />} />

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
          path="/portal/documents"
          element={
            <ProtectedRoute>
              <PortalLayout>
                <DocumentsPage />
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