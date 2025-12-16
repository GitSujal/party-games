import React, { useRef, useState, useEffect } from 'react';
import Modal from './ui/Modal';

export default function HostSetupModal({ isOpen, onClose, onCreateSession, onResumeSession }) {
    const minPlayersRef = useRef(null);
    const gameIdRef = useRef(null);
    const hostPinRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('create'); // 'create' | 'resume'
    const [errorMessage, setErrorMessage] = useState(null);

    // Auto-fill from localStorage on mount or open
    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem('recentSession');
            if (saved) {
                try {
                    const session = JSON.parse(saved);
                    // If session is less than 24h old, maybe suggest resume?
                    // For now, we just populate the fields if we switch to resume
                } catch (e) { /* ignore */ }
            }
        }
    }, [isOpen]);

    const handleCreate = async () => {
        const inputVal = minPlayersRef.current ? minPlayersRef.current.value : '4';
        const minPlayers = parseInt(inputVal);

        if (isNaN(minPlayers) || minPlayers < 3) {
            alert("Minimum players must be at least 3.");
            return;
        }

        setLoading(true);
        setErrorMessage(null);
        try {
            await onCreateSession(minPlayers);
        } catch (e) {
            // Check for rate limit with existing game suggestion
            if (e.message.includes('Rate limit exceeded') || e.message.includes('429')) {
                // If the API error wasn't parsed fully by the wrapper, we might just get text
                // But the wrapper throws "Server returned invalid..." or the error message

                // If we implemented the client to parse the JSON error body, we could read existingGameId
                // For now, let's assume the user sees the alert or we parse it here if possible.
                // Since our client wrapper throws `data.error`, we see that message.

                // Ideally, we'd pass the whole error object or data back.
                // Assuming simple text for now, but let's try to switch to resume
                setMode('resume');
                setErrorMessage(e.message);

                // Try to auto-find recent session from localStorage to fill PIN
                const saved = localStorage.getItem('recentSession');
                if (saved) {
                    try {
                        const s = JSON.parse(saved);
                        setTimeout(() => {
                            if (gameIdRef.current) gameIdRef.current.value = s.gameId;
                            if (hostPinRef.current) hostPinRef.current.value = s.hostPin;
                        }, 100);
                    } catch (_) { }
                }
            } else {
                alert(`Failed to start game: ${e.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResume = async () => {
        const gameId = gameIdRef.current.value.toUpperCase();
        const pin = hostPinRef.current.value;

        if (!gameId || !pin) {
            alert("Please enter Game ID and PIN");
            return;
        }

        setLoading(true);
        try {
            await onResumeSession(gameId, pin);
        } catch (e) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    const primaryBtn = {
        width: '100%', padding: '15px', margin: '10px 0', fontSize: '1.2rem',
        border: 'none', borderRadius: '8px', cursor: 'pointer',
        fontWeight: 'bold', textTransform: 'uppercase', background: '#d62828', color: '#fff'
    };

    const tabStyle = (active) => ({
        flex: 1, padding: '10px', cursor: 'pointer',
        borderBottom: active ? '2px solid #d62828' : '1px solid #444',
        color: active ? '#fff' : '#888',
        fontWeight: active ? 'bold' : 'normal',
        textAlign: 'center'
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="400px">
            <div style={{ display: 'flex', marginBottom: '20px' }}>
                <div style={tabStyle(mode === 'create')} onClick={() => setMode('create')}>NEW GAME</div>
                <div style={tabStyle(mode === 'resume')} onClick={() => setMode('resume')}>RESUME</div>
            </div>

            {mode === 'create' ? (
                <>
                    <h2 style={{ color: '#d62828', marginTop: 0, textAlign: 'center' }}>Create Session</h2>
                    {errorMessage && (
                        <div style={{ background: '#300', color: '#f88', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.9rem' }}>
                            {errorMessage}
                        </div>
                    )}
                    <p style={{ color: '#ccc', marginBottom: '20px', textAlign: 'center' }}>How many players?</p>
                    <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                        <input
                            ref={minPlayersRef}
                            type="number"
                            min="3"
                            max="20"
                            defaultValue={4}
                            style={{
                                padding: '15px', borderRadius: '5px', border: '1px solid #444',
                                background: '#222', color: '#fff', fontSize: '1.5rem',
                                width: '100px', textAlign: 'center'
                            }}
                        />
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Creating...' : 'LAUNCH SESSION'}
                    </button>
                </>
            ) : (
                <>
                    <h2 style={{ color: '#d62828', marginTop: 0, textAlign: 'center' }}>Resume Session</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                        <input
                            ref={gameIdRef}
                            placeholder="Game ID"
                            style={{ padding: '15px', borderRadius: '5px', background: '#222', border: '1px solid #444', color: '#fff', textAlign: 'center', letterSpacing: '2px' }}
                        />
                        <input
                            ref={hostPinRef}
                            placeholder="Host PIN"
                            type="password" // or text for easier entry
                            inputMode="numeric"
                            style={{ padding: '15px', borderRadius: '5px', background: '#222', border: '1px solid #444', color: '#fff', textAlign: 'center', letterSpacing: '2px' }}
                        />
                    </div>
                    <button
                        onClick={handleResume}
                        disabled={loading}
                        style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Verifying...' : 'RESUME GAME'}
                    </button>
                </>
            )}

            <button
                onClick={onClose}
                style={{ background: 'transparent', border: 'none', color: '#666', marginTop: '10px', cursor: 'pointer', width: '100%', textAlign: 'center' }}
            >
                Cancel
            </button>
        </Modal>
    );
}
