import { useEffect } from 'react';

interface TokenManagerProps {
  onTokenExpired: () => void;
  onTokenRefreshed: (newToken: string) => void;
}

export default function TokenManager({ onTokenExpired, onTokenRefreshed }: TokenManagerProps) {
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem('geomap-auth-token');
      if (!token) return;

      try {
        // Decode JWT to check expiration
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = payload.exp - currentTime;

        // If token expires in less than 5 minutes, refresh it
        if (timeUntilExpiry < 300) {
          refreshToken();
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
        onTokenExpired();
      }
    };

    const refreshToken = async () => {
      try {
        const refreshTokenValue = localStorage.getItem('geomap-refresh-token');
        if (!refreshTokenValue) {
          onTokenExpired();
          return;
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
          onTokenRefreshed(data.accessToken);
        } else {
          onTokenExpired();
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        onTokenExpired();
      }
    };

    // Check token expiration every minute
    const interval = setInterval(checkTokenExpiration, 60000);
    
    // Check immediately on mount
    checkTokenExpiration();

    return () => clearInterval(interval);
  }, [onTokenExpired, onTokenRefreshed]);

  return null; // This component doesn't render anything
}
