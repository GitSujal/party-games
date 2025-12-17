import React from 'react';
import { Skull } from 'lucide-react';

export default function Scorecard({ gameState }) {
    const eliminatedPlayers = gameState.players?.filter(p => !p.isHost && !p.isAlive) || [];

    if (eliminatedPlayers.length === 0) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            right: '20px',
            top: '20px',
            background: 'var(--surface, #112240)',
            border: '2px solid var(--border, #233554)',
            borderRadius: '12px',
            padding: '15px',
            maxWidth: '250px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            zIndex: 100
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '15px',
                borderBottom: '1px solid var(--border, #233554)',
                paddingBottom: '10px'
            }}>
                <Skull size={24} style={{ color: '#d62828' }} />
                <h3 style={{
                    margin: 0,
                    fontSize: '1.2rem',
                    color: 'var(--text, #e6f1ff)',
                    fontWeight: 'bold'
                }}>
                    Eliminated
                </h3>
            </div>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {eliminatedPlayers.map(player => {
                    const isImposter = player.characterId === 'IMPOSTER';

                    return (
                        <div
                            key={player.id}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '10px',
                                borderRadius: '8px',
                                borderLeft: `3px solid ${isImposter ? '#d62828' : '#64ffda'}`
                            }}
                        >
                            <div style={{
                                fontSize: '0.95rem',
                                color: 'var(--text, #e6f1ff)',
                                fontWeight: '600',
                                marginBottom: '4px'
                            }}>
                                {player.name}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: isImposter ? '#d62828' : '#64ffda',
                                fontWeight: '500'
                            }}>
                                {isImposter ? '🎭 Imposter' : '✓ Genuine'}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
