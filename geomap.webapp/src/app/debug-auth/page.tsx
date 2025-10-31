'use client';

import { useState } from 'react';

export default function DebugAuth() {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [debugResult, setDebugResult] = useState<any>(null);

  const checkLocalStorage = () => {
    const accessToken = localStorage.getItem('geomap-auth-token');
    const refreshToken = localStorage.getItem('geomap-refresh-token');
    
    setTokenInfo({
      accessToken: accessToken ? {
        value: accessToken.substring(0, 50) + '...',
        length: accessToken.length,
        parts: accessToken.split('.').length,
        isValid: accessToken.split('.').length === 3,
        type: (() => {
          try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            return payload.type || 'unknown';
          } catch {
            return 'invalid';
          }
        })()
      } : null,
      refreshToken: refreshToken ? {
        value: refreshToken.substring(0, 50) + '...',
        length: refreshToken.length,
        parts: refreshToken.split('.').length,
        isValid: refreshToken.split('.').length === 3,
        type: (() => {
          try {
            const payload = JSON.parse(atob(refreshToken.split('.')[1]));
            return payload.type || 'unknown';
          } catch {
            return 'invalid';
          }
        })()
      } : null
    });
  };

  const clearTokens = () => {
    localStorage.removeItem('geomap-auth-token');
    localStorage.removeItem('geomap-refresh-token');
    setTokenInfo(null);
    setDebugResult(null);
    alert('Tokens cleared from localStorage');
  };

  const fixTokens = async () => {
    const token = localStorage.getItem('geomap-auth-token');
    if (!token) {
      setDebugResult({ error: 'No token found in localStorage' });
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.type !== 'refresh') {
        setDebugResult({ error: 'Current token is not a refresh token, cannot fix. Current type: ' + (payload.type || 'unknown') });
        return;
      }

      const response = await fetch('/api/fix-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        localStorage.setItem('geomap-auth-token', result.accessToken);
        localStorage.setItem('geomap-refresh-token', result.refreshToken);
        setDebugResult({ 
          success: true, 
          message: 'Tokens fixed successfully!',
          accessTokenPreview: result.accessToken.substring(0, 50) + '...',
          refreshTokenPreview: result.refreshToken.substring(0, 50) + '...'
        });
      } else {
        setDebugResult(result);
      }
    } catch (error) {
      setDebugResult({ error: (error as Error).message });
    }
  };

  const testToken = async () => {
    const token = localStorage.getItem('geomap-auth-token');
    if (!token) {
      setDebugResult({ error: 'No token found in localStorage' });
      return;
    }

    try {
      const response = await fetch('/api/debug-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      setDebugResult(result);
    } catch (error) {
      setDebugResult({ error: (error as Error).message });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="space-y-4">
        <button 
          onClick={checkLocalStorage}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Check LocalStorage Tokens
        </button>
        
        <button 
          onClick={clearTokens}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 ml-2"
        >
          Clear All Tokens
        </button>
        
        <button 
          onClick={fixTokens}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 ml-2"
        >
          Fix Token Types
        </button>
        
        <button 
          onClick={testToken}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-2"
        >
          Test Current Token
        </button>
      </div>

      {tokenInfo && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold mb-2">Token Information</h2>
          <div className="space-y-2">
            <div>
              <strong>Access Token:</strong>
              {tokenInfo.accessToken ? (
                <div className="ml-4">
                  <div>Value: {tokenInfo.accessToken.value}</div>
                  <div>Length: {tokenInfo.accessToken.length}</div>
                  <div>Parts: {tokenInfo.accessToken.parts}</div>
                  <div>Type: <span className={tokenInfo.accessToken.type === 'access' ? 'text-green-600' : 'text-red-600'}>{tokenInfo.accessToken.type}</span></div>
                  <div className={tokenInfo.accessToken.isValid ? 'text-green-600' : 'text-red-600'}>
                    Valid Format: {tokenInfo.accessToken.isValid ? 'Yes' : 'No'}
                  </div>
                </div>
              ) : (
                <span className="text-gray-500"> None</span>
              )}
            </div>
            
            <div>
              <strong>Refresh Token:</strong>
              {tokenInfo.refreshToken ? (
                <div className="ml-4">
                  <div>Value: {tokenInfo.refreshToken.value}</div>
                  <div>Length: {tokenInfo.refreshToken.length}</div>
                  <div>Parts: {tokenInfo.refreshToken.parts}</div>
                  <div>Type: <span className={tokenInfo.refreshToken.type === 'refresh' ? 'text-green-600' : 'text-red-600'}>{tokenInfo.refreshToken.type}</span></div>
                  <div className={tokenInfo.refreshToken.isValid ? 'text-green-600' : 'text-red-600'}>
                    Valid Format: {tokenInfo.refreshToken.isValid ? 'Yes' : 'No'}
                  </div>
                </div>
              ) : (
                <span className="text-gray-500"> None</span>
              )}
            </div>
          </div>
        </div>
      )}

      {debugResult && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold mb-2">Debug Result</h2>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(debugResult, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click "Check LocalStorage Tokens" to see current token status</li>
          <li>If access token shows type "refresh", click "Fix Token Types"</li>
          <li>If tokens are invalid format, click "Clear All Tokens"</li>
          <li>Go to <a href="http://localhost:3000/auth/authenticate" className="text-blue-600 underline" target="_blank">localhost:3000/auth/authenticate</a> to get new tokens</li>
          <li>Return here and test again</li>
        </ol>
      </div>
    </div>
  );
}
