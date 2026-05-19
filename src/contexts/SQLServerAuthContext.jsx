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

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = () => {
      const storedSession = localStorage.getItem('inreal_session');
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          setSession(sessionData);
          setUser(sessionData.user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Failed to parse stored session:', error);
          localStorage.removeItem('inreal_session');
        }
      }
      setLoading(false);
    };

    checkExistingSession();
  }, []);

  const signIn = useCallback(async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
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

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isAuthenticated,
      signIn,
      signOut,
    }),
    [user, session, loading, isAuthenticated, signIn, signOut]
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
