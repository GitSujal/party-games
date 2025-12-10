import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import * as api from '../lib/apiClient';

export default function JoinForm({ initialGameId = '' }) {
    const [name, setName] = useState('');
    const [inputGameId, setInputGameId] = useState(initialGameId);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (initialGameId) {
            setInputGameId(initialGameId);
        }
    }, [initialGameId]);

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!name || !inputGameId) return;

        setLoading(true);
        try {
            const data = await api.joinGame(inputGameId, name);

            if (data.player) {
                if (data.player.name.toLowerCase() !== name.toLowerCase()) {
                    alert(`Welcome back, ${data.player.name}! Recovering your session...`);
                }
                localStorage.setItem('playerId', data.player.id);
                localStorage.setItem('gameId', inputGameId); // Store gameId for player page
                router.push(`/player/${data.player.id}`);
            }
        } catch (err) {
            alert(err.message || "Failed to join");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', maxWidth: '300px', margin: '0 auto' }}>
            <div>
                <input
                    type="text"
                    placeholder="Game ID (e.g. A1B2)"
                    value={inputGameId}
                    onChange={(e) => setInputGameId(e.target.value.toUpperCase())}
                    style={{ padding: '15px', fontSize: '1.2rem', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff', textAlign: 'center', width: '100%', fontFamily: 'monospace', letterSpacing: '2px' }}
                />
            </div>

            <div>
                <input
                    type="text"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ padding: '15px', fontSize: '1.2rem', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff', textAlign: 'center', width: '100%' }}
                />
            </div>

            <button
                type="submit"
                className="btn"
                disabled={!inputGameId || !name || loading}
                style={{ width: '100%', padding: '15px', opacity: (!inputGameId || !name || loading) ? 0.5 : 1 }}
            >
                {loading ? 'JOINING...' : 'ENTER'}
            </button>
        </form>
    );
}
