import React, { useState } from 'react';
import { Skull, ChevronUp, ChevronDown } from 'lucide-react';

export default function Scorecard({ gameState }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const eliminatedPlayers = gameState.players?.filter(p => !p.isHost && !p.isAlive) || [];

    if (eliminatedPlayers.length === 0) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            right: '20px',
            bottom: '20px', // Move to bottom to avoid overlapping host info
            background: 'var(--surface, #112240)',
            border: '2px solid var(--border, #233554)',
            borderRadius: '12px',
            padding: '12px',
            width: '240px',
            maxWidth: 'calc(100vw - 40px)',
            maxHeight: isCollapsed ? '50px' : '400px',
            overflowY: isCollapsed ? 'hidden' : 'auto',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            transition: 'max-height 0.3s ease-in-out',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    paddingBottom: isCollapsed ? '0' : '10px',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--border, #233554)',
                    marginBottom: isCollapsed ? '0' : '10px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Skull size={18} style={{ color: '#d62828' }} />
                    <h3 style={{
                        margin: 0,
                        fontSize: '1rem',
                        color: 'var(--text, #e6f1ff)',
                        fontWeight: 'bold'
                    }}>
                        Eliminated
                    </h3>
                </div>
                {isCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {!isCollapsed && (
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
            )}
        </div>
    );
}
