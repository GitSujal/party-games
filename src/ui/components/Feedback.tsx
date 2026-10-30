import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

// ---------- Spinner / full-screen message -----------------------------------

export function Spinner() {
    return <div className="pg-spinner" role="status" aria-label="Loading" />;
}

export function FullscreenMessage({ title, children, loading }: { title: string; children?: ReactNode; loading?: boolean }) {
    return (
        <div className="pg-fullscreen-msg">
            {loading && <Spinner />}
            <h2>{title}</h2>
            {children}
        </div>
    );
}

// ---------- Banner ------------------------------------------------------------

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'danger'; children: ReactNode }) {
    return <div className={`pg-banner ${tone === 'danger' ? 'pg-banner--danger' : ''}`}>{children}</div>;
}

// ---------- Modal -------------------------------------------------------------

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="pg-modal-backdrop" onClick={onClose}>
            <div className="pg-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                <div className="pg-modal__head">
                    <h3 style={{ margin: 0 }}>{title}</h3>
                    <IconButton label="Close" onClick={onClose}>
                        <X size={18} />
                    </IconButton>
                </div>
                <div className="pg-modal__body">{children}</div>
            </div>
        </div>
    );
}

// ---------- Toasts ------------------------------------------------------------

interface ToastItem {
    id: number;
    message: string;
    kind: 'info' | 'error';
}

const ToastContext = createContext<(message: string, kind?: ToastItem['kind']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([]);
    const push = useCallback((message: string, kind: ToastItem['kind'] = 'info') => {
        const id = Date.now() + Math.random();
        setItems(list => [...list.slice(-2), { id, message, kind }]);
        setTimeout(() => setItems(list => list.filter(t => t.id !== id)), kind === 'error' ? 5000 : 3000);
    }, []);
    return (
        <ToastContext.Provider value={push}>
            {children}
            <div className="pg-toasts" aria-live="polite">
                {items.map(t => (
                    <div key={t.id} className={`pg-toast ${t.kind === 'error' ? 'pg-toast--error' : ''}`}>
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
