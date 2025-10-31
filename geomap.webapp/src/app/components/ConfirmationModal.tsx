import React from 'react';

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  message?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ open, onClose, message }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.4)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 8,
        padding: '32px 24px',
        maxWidth: 400,
        boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
        textAlign: 'center',
      }}>
        <h2 style={{ color: '#0072BC', marginBottom: 16 }}>Notice</h2>
        <p style={{ color: '#333', marginBottom: 24 }}>
          {message || 'Your changes have been submitted and will be reviewed by our team for verification. You will receive a confirmation email shortly.'}
        </p>
        <button
          style={{
            background: 'linear-gradient(to right, #0072BC, #00B140)',
            color: '#fff',
            border: 'none',
            borderRadius: 5,
            padding: '10px 24px',
            fontWeight: 'bold',
            fontSize: 16,
            cursor: 'pointer',
          }}
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default ConfirmationModal;
