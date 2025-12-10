import React from 'react';
import { Users, Play } from 'lucide-react';

export default function PhaseLobby({ gameId, minPlayers, players, qrSrc, joinUrl, onStart, manifest }) {
    const canStart = players.length >= (minPlayers || 4);
    const gameName = manifest?.name || 'Murder Mystery';

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s' }}>
                <h1 style={{ fontSize: '3.5rem', marginBottom: '30px', color: '#d62828', textTransform: 'uppercase', letterSpacing: '4px', textShadow: '0 0 20px rgba(214, 40, 40, 0.4)' }}>
                    {gameName}
                </h1>

                {qrSrc && (
                    <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', display: 'inline-block' }}>
                        <img src={qrSrc} alt="Join Game QR" style={{ width: '100%', maxWidth: '400px', height: 'auto', display: 'block' }} />
                    </div>
                )}
                <h1 style={{ marginTop: '20px', fontSize: '3rem', fontFamily: 'monospace' }}>{gameId}</h1>
                <p style={{ fontSize: '1.5rem', color: '#888', marginBottom: '5px' }}>scan to join</p>
                {joinUrl && (
                    <p style={{ fontSize: '1rem', color: '#666' }}>
                        or visit <a href={joinUrl} target="_blank" rel="noreferrer" style={{ color: '#61dafb', textDecoration: 'underline' }}>
                            {joinUrl}
                        </a>
                    </p>
                )}
                <div style={{ marginTop: '20px', color: players.length < (minPlayers || 4) ? '#d62828' : '#28d685' }}>
                    Players: {players.length} / {minPlayers || 4}
                </div>
                <div style={{ marginTop: '30px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', maxWidth: '600px', margin: '30px auto 0' }}>
                    {players.map(p => (
                        <div key={p.id} style={{
                            background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '25px',
                            border: '1px solid #444', color: '#fff', fontSize: '1.2rem',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            animation: 'fadeIn 0.5s'
                        }}>
                            <Users size={18} /> {p.name}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: '40px', display: 'flex', gap: '20px' }}>
                <button
                    className="btn"
                    disabled={!canStart}
                    onClick={onStart}
                    style={{ fontSize: '1.2rem', padding: '15px 40px', opacity: canStart ? 1 : 0.5, transform: 'scale(1.1)' }}
                >
                    <Play size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                    START GAME
                </button>
            </div>
        </div>
    );
}
