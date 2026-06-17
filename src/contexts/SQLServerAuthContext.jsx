import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getApiBase } from '@/lib/utils';

const AuthContext = createContext(undefined);

const API_BASE_URL = getApiBase();

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on mount, and confirm the token is still valid
  // server-side (handles expiry and the rollout of real JWTs replacing old tokens).
  useEffect(() => {
    const checkExistingSession = async () => {
      const storedSession = localStorage.getItem('inreal_session');
      if (!storedSession) {
        setLoading(false);
        return;
      }

      let sessionData;
      try {
        sessionData = JSON.parse(storedSession);
      } catch (error) {
        console.error('Failed to parse stored session:', error);
        localStorage.removeItem('inreal_session');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${sessionData.token}` },
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          // Token expired, malformed, or revoked server-side — log out quietly.
          localStorage.removeItem('inreal_session');
          setLoading(false);
          return;
        }

        const refreshedSession = { ...sessionData, user: data.data };
        localStorage.setItem('inreal_session', JSON.stringify(refreshedSession));
        setSession(refreshedSession);
        setUser(data.data);
        setIsAuthenticated(true);
      } catch (error) {
        // Network error reaching the API — keep the user logged out rather than
        // trusting an unverified local session.
        console.error('Failed to verify session:', error);
        localStorage.removeItem('inreal_session');
      } finally {
        setLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: data.error || 'Invalid email or user not found',
        });
        return { error: data.error };
      }

      // Create session object
      const sessionData = {
        user: data.data,
        token: data.token,
        timestamp: Date.now(),
      };

      // Store session
      localStorage.setItem('inreal_session', JSON.stringify(sessionData));
      setSession(sessionData);
      setUser(data.data);
      setIsAuthenticated(true);

      toast({
        title: 'Login Successful',
        description: `Welcome back, ${data.data.FirstName}!`,
      });

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        variant: 'destructive',
        title: 'Login Error',
        description: error.message || 'An error occurred during login',
      });
      return { error: error.message };
    }
  }, [toast]);

  const signOut = useCallback(() => {
    localStorage.removeItem('inreal_session');
    setSession(null);
    setUser(null);
    setIsAuthenticated(false);

    toast({
      title: 'Logged Out',
      description: 'You have been logged out successfully',
    });
  }, [toast]);

  const isAdmin = user?.Role === 'admin';

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isAuthenticated,
      isAdmin,
      signIn,
      signOut,
    }),
    [user, session, loading, isAuthenticated, isAdmin, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};