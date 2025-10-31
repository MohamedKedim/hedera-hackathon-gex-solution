'use client';
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

interface AuthBridgeProps {
  onAuthChange?: (isAuthenticated: boolean, user?: any) => void;
}

// Define the ref interface for exposed methods
interface AuthBridgeRef {
  handleLogin: () => void;
  handleLogout: () => void;
}

const AuthBridge = forwardRef<AuthBridgeRef, AuthBridgeProps>(({ onAuthChange }, ref) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check for token in URL params first (from redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');
      const refreshTokenFromUrl = urlParams.get('refresh_token');
      if (tokenFromUrl) {
        // Validate token format before storing
        if (tokenFromUrl.split('.').length === 3) {
          localStorage.setItem('geomap-auth-token', tokenFromUrl);
          if (refreshTokenFromUrl && refreshTokenFromUrl.split('.').length === 3) {
            localStorage.setItem('geomap-refresh-token', refreshTokenFromUrl);
          }
        } else {
          console.warn('Invalid token format from URL, not storing');
        }
        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('token');
        newUrl.searchParams.delete('refresh_token');
        window.history.replaceState({}, document.title, newUrl.toString());
      }
      let token = localStorage.getItem('geomap-auth-token');
      // Validate stored token format
      if (token && token.split('.').length !== 3) {
        console.warn('Invalid token format in localStorage, clearing');
        localStorage.removeItem('geomap-auth-token');
        localStorage.removeItem('geomap-refresh-token');
        token = null;
      }
      // Check if stored access token is actually a refresh token
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.type === 'refresh') {
            console.warn('Refresh token found in access token slot, attempting to get new access token');
            localStorage.setItem('geomap-refresh-token', token);
            localStorage.removeItem('geomap-auth-token');
            try {
              const newAccessToken = await refreshToken();
              if (newAccessToken) {
                token = newAccessToken;
                console.log('Successfully exchanged refresh token for access token');
              } else {
                console.error('Failed to get new access token');
                token = null;
              }
            } catch (refreshError) {
              console.error('Error refreshing token:', refreshError);
              token = null;
            }
          }
        } catch (error) {
          console.warn('Could not decode token payload:', error);
        }
      }
      if (token) {
        let response = await fetch('/api/verify-token', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        // If token expired, try to refresh
        if (response.status === 401) {
          const refreshedToken = await refreshToken();
          if (refreshedToken) {
            response = await fetch('/api/verify-token', {
              headers: { 'Authorization': `Bearer ${refreshedToken}` }
            });
          }
        }
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setUser(data.user);
          onAuthChange?.(true, data.user);
        } else {
          handleAuthFailure();
        }
      } else {
        handleAuthFailure();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      handleAuthFailure();
    }
    setLoading(false);
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('geomap-refresh-token');
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }
      const response = await fetch('/api/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTokenValue })
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('geomap-auth-token', data.accessToken);
        localStorage.setItem('geomap-refresh-token', data.refreshToken);
        return data.accessToken;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      localStorage.removeItem('geomap-auth-token');
      localStorage.removeItem('geomap-refresh-token');
      return null;
    }
  };

  const handleAuthFailure = () => {
    localStorage.removeItem('geomap-auth-token');
    localStorage.removeItem('geomap-refresh-token');
    setIsAuthenticated(false);
    setUser(null);
    onAuthChange?.(false, null);
  };

  const handleLogin = () => {
    const onboardingUrl = process.env.NEXT_PUBLIC_ONBOARDING_URL;
    if (!onboardingUrl) {
      console.error('NEXT_PUBLIC_ONBOARDING_URL environment variable is not set');
      return;
    }
    const redirectUrl = `${onboardingUrl}/auth/authenticate?redirect=${encodeURIComponent(window.location.href)}`;
    window.location.href = redirectUrl;
  };

  const handleLogout = async () => {
    localStorage.removeItem('geomap-auth-token');
    localStorage.removeItem('geomap-refresh-token');
    setIsAuthenticated(false);
    setUser(null);
    onAuthChange?.(false);
    const onboardingUrl = process.env.NEXT_PUBLIC_ONBOARDING_URL;
    const geomapUrl = process.env.NEXT_PUBLIC_GEOMAP_URL;
    if (!onboardingUrl || !geomapUrl) {
      console.error('Environment variables NEXT_PUBLIC_ONBOARDING_URL or NEXT_PUBLIC_GEOMAP_URL are not set');
      return;
    }
    window.location.href = `${onboardingUrl}/api/auth/signout?callbackUrl=${geomapUrl}`;
  };

  // Expose handleLogin and handleLogout via ref
  useImperativeHandle(ref, () => ({
    handleLogin,
    handleLogout,
  }));

  // Render nothing (logic-only component)
  return null;
});

AuthBridge.displayName = 'AuthBridge';

export default AuthBridge;