/**
 * Authenticated fetch wrapper that automatically includes JWT token from localStorage
 * and handles token refresh if needed
 */

interface AuthFetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function authFetch(url: string, options: AuthFetchOptions = {}): Promise<Response> {
  // Get token from localStorage
  let token = localStorage.getItem('geomap-auth-token');
  
  if (!token) {
    throw new Error('No authentication token found. Please log in.');
  }

  // Prepare headers with authentication
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  // Make the request
  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If token expired, try to refresh
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('geomap-refresh-token');
    if (refreshToken) {
      try {
        const refreshResponse = await fetch('/api/refresh-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          localStorage.setItem('geomap-auth-token', data.accessToken);
          localStorage.setItem('geomap-refresh-token', data.refreshToken);
          
          // Retry the original request with new token
          response = await fetch(url, {
            ...options,
            headers: {
              ...headers,
              'Authorization': `Bearer ${data.accessToken}`,
            },
          });
        } else {
          // Refresh failed, redirect to login
          localStorage.removeItem('geomap-auth-token');
          localStorage.removeItem('geomap-refresh-token');
          const onboardingUrl = `${process.env.ONBOARDING_APP_URL || 'http://localhost:3000'}/auth/authenticate?redirect=${encodeURIComponent(window.location.href)}`;
          window.location.href = onboardingUrl;
          throw new Error('Authentication failed. Redirecting to login.');
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Redirect to login
        const onboardingUrl = `${process.env.ONBOARDING_APP_URL || 'http://localhost:3000'}/auth/authenticate?redirect=${encodeURIComponent(window.location.href)}`;
        window.location.href = onboardingUrl;
        throw new Error('Authentication failed. Redirecting to login.');
      }
    } else {
      // No refresh token available, redirect to login
      localStorage.removeItem('geomap-auth-token');
      const onboardingUrl = `${process.env.ONBOARDING_APP_URL || 'http://localhost:3000'}/auth/authenticate?redirect=${encodeURIComponent(window.location.href)}`;
      window.location.href = onboardingUrl;
      throw new Error('Authentication failed. Redirecting to login.');
    }
  }

  return response;
}
