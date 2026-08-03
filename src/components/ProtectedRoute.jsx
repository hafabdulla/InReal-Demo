import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SQLServerAuthContext';

/**
 * ProtectedRoute Component
 *
 * Gates a route on an authenticated session, and — since login no longer
 * auto-redirects anywhere — remembers which route was being attempted so the
 * login screen can return the investor to it afterwards.
 *
 * The attempted path travels in router state rather than a query parameter.
 * That keeps it out of the address bar, out of access logs and out of Referer
 * headers, and it means the value cannot be set by someone sending a crafted
 * link. AuthPage still validates it before navigating (see safeInternalPath).
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-white text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
