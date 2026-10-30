import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../platform/client/api';
import { saveSession } from '../../platform/client/session';
import { Button } from '../../ui';

/** Shown when this browser has no host credentials for the room: unlock with the PIN. */
export function ResumeHost({ code, onResumed }: { code: string; onResumed: () => void }) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const { hostToken } = await api.resume(code, pin);
            saveSession(code, { role: 'host', token: hostToken, pin });
            onResumed();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not resume');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="pg-narrow pg-fullscreen-msg">
            <span className="pg-label-sm">Room <span className="pg-mono" style={{ color: 'var(--pg-text)' }}>{code}</span></span>
            <h1 className="pg-display" style={{ fontSize: 32, margin: 0 }}>Enter your host PIN</h1>
            <p className="pg-muted" style={{ margin: 0 }}>
                The 4-digit PIN was shown when the room was created.
            </p>
            <form onSubmit={submit} className="pg-stack" style={{ width: '100%', maxWidth: 320 }}>
                <input
                    className="pg-input pg-input--code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    aria-label="Host PIN"
                    autoFocus
                />
                {error && <div className="pg-error">{error}</div>}
                <Button type="submit" variant="primary" size="lg" block loading={busy} disabled={pin.length !== 4}>
                    Resume hosting
                </Button>
                <Link to={`/join/${code}`} className="pg-link">
                    Joining as a player instead?
                </Link>
            </form>
        </div>
    );
}
