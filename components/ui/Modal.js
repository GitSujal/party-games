import React, { useEffect, useRef } from 'react';

export default function Modal({ isOpen, onClose, children, maxWidth = '500px', title }) {
    const modalRef = useRef(null);
    const previousFocusRef = useRef(null);

    // Focus trap and keyboard handling
    useEffect(() => {
        if (!isOpen) return;

        // Store previously focused element
        previousFocusRef.current = document.activeElement;

        // Focus modal when it opens
        if (modalRef.current) {
            modalRef.current.focus();
        }

        // Handle keyboard events
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }

            // Focus trap
            if (e.key === 'Tab') {
                const focusableElements = modalRef.current?.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (!focusableElements || focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // Cleanup
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            // Restore focus to previous element
            if (previousFocusRef.current) {
                previousFocusRef.current.focus();
            }
        };
    }, [isOpen, onClose]);

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
            role="presentation"
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? "modal-title" : undefined}
                tabIndex={-1}
                style={{
                    background: '#1a1a1d', border: '1px solid #333', borderRadius: '15px',
                    padding: '30px', maxWidth, width: '100%', maxHeight: '85vh', overflowY: 'auto',
                    position: 'relative', boxShadow: '0 0 30px rgba(0,0,0,0.8)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {title && (
                    <h2 id="modal-title" style={{ marginTop: 0, marginBottom: '20px', color: 'var(--gold)' }}>
                        {title}
                    </h2>
                )}

                <button
                    onClick={onClose}
                    aria-label="Close modal"
                    style={{
                        position: 'absolute', top: '15px', right: '15px',
                        background: 'transparent', border: 'none', color: '#fff',
                        fontSize: '1.5rem', cursor: 'pointer'
                    }}
                >
                    ×
                </button>
                {children}
            </div>
        </div>
    );
}
