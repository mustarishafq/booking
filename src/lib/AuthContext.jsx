import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { db, getToken, clearToken } from '@/api/base44Client';
import { getPostLogoutUrl, clearLoginSession } from '@/lib/nexusBrain';

const AuthContext = createContext();

const PUBLIC_PATHS = ['/login', '/sso/nexus', '/reset-password'];

function isPublicPath() {
  const path = window.location.pathname;
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(`${p}/`));
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState({ id: 'app', public_settings: {} });

  const checkUserAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await db.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      setAuthError(null);
    } catch (error) {
      clearToken();
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      if (!isPublicPath()) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      } else {
        setAuthError(null);
      }
    }
  }, []);

  const checkAppState = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      if (!getToken()) {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        if (!isPublicPath()) {
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        }
        return;
      }

      await checkUserAuth();
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingAuth(false);
    }
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  const logout = (shouldRedirect = true) => {
    const redirectUrl = getPostLogoutUrl();
    clearToken();
    clearLoginSession();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    setAuthChecked(true);
    if (shouldRedirect) {
      window.location.href = redirectUrl;
    }
  };

  const navigateToLogin = () => {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?redirect=${redirect}`;
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
