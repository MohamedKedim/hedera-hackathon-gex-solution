import React from 'react';

export default function UnauthorizedPage() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      textAlign: 'center',
      fontFamily: 'sans-serif'
    }}>
      <div>
        <h1>🚫 Access Denied</h1>
        <p>You do not have the necessary permissions to view this page.</p>
        <a href="/" style={{ color: 'blue' }}>Return to Homepage</a>
      </div>
    </div>
  );
}