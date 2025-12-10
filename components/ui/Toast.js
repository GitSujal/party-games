import React, { useState, useEffect } from 'react';

/**
 * Toast Notification Component
 * Accessible, non-blocking notification system
 */
export default function Toast({ message, type = 'info', duration = 5000, onClose }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                if (onClose) onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    if (!isVisible || !message) return null;

    const colors = {
        success: { bg: '#4CAF50', border: '#45a049' },
        error: { bg: '#d62828', border: '#b31f1f' },
        warning: { bg: '#ff9800', border: '#e68900' },
        info: { bg: '#2196F3', border: '#1976D2' }
    };

    const color = colors[type] || colors.info;

    return (
        <div
            role="alert"
            aria-live="polite"
            aria-atomic="true"
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                maxWidth: '400px',
                background: color.bg,
                color: '#fff',
                padding: '16px 48px 16px 16px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                border: `2px solid ${color.border}`,
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '14px',
                lineHeight: '1.5',
                animation: 'slideIn 0.3s ease-out'
            }}
        >
            {message}
            <button
                onClick={() => {
                    setIsVisible(false);
                    if (onClose) onClose();
                }}
                aria-label="Close notification"
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    lineHeight: 1
                }}
            >
                ×
            </button>
        </div>
    );
}

/**
 * Toast Container Component
 * Manages multiple toasts
 */
export function ToastContainer({ toasts, removeToast }) {
    if (!toasts || toasts.length === 0) return null;

    return (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
            {toasts.map((toast, index) => (
                <div key={toast.id || index} style={{ marginBottom: '10px' }}>
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id || index)}
                    />
                </div>
            ))}
        </div>
    );
}

/**
 * useToast Hook
 * Easy toast management in functional components
 */
export function useToast() {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return { toasts, addToast, removeToast, success: (msg) => addToast(msg, 'success'), error: (msg) => addToast(msg, 'error'), warning: (msg) => addToast(msg, 'warning'), info: (msg) => addToast(msg, 'info') };
}
