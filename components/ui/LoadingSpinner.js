import React from 'react';

/**
 * Loading Spinner Component
 * Accessible loading indicator
 */
export default function LoadingSpinner({ size = 'medium', message = 'Loading...' }) {
    const sizes = {
        small: 20,
        medium: 40,
        large: 60
    };

    const spinnerSize = sizes[size] || sizes.medium;

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={message}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
            }}
        >
            <div
                style={{
                    width: `${spinnerSize}px`,
                    height: `${spinnerSize}px`,
                    border: '4px solid #333',
                    borderTop: '4px solid #61dafb',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}
            />
            {message && (
                <span style={{ color: '#888', fontSize: '14px' }}>
                    {message}
                </span>
            )}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}

/**
 * Full Page Loading Component
 */
export function FullPageLoader({ message = 'Loading...' }) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#0a0a0a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998
        }}>
            <LoadingSpinner size="large" message={message} />
        </div>
    );
}

/**
 * Inline Loading Component
 */
export function InlineLoader({ message }) {
    return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <LoadingSpinner size="small" message={message} />
        </div>
    );
}
