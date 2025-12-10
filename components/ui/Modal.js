import React from 'react';

export default function Modal({ isOpen, onClose, children, maxWidth = '500px' }) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.85)', zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px', backdropFilter: 'blur(5px)'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#1a1a1d', border: '1px solid #333', borderRadius: '15px',
                    padding: '30px', maxWidth, width: '100%', maxHeight: '85vh', overflowY: 'auto',
                    position: 'relative', boxShadow: '0 0 30px rgba(0,0,0,0.8)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '15px', right: '15px',
                        background: 'transparent', border: 'none', color: '#fff',
                        fontSize: '1.5rem', cursor: 'pointer'
                    }}
                >
                    &times;
                </button>
                {children}
            </div>
        </div>
    );
}
