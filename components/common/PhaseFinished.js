import React from 'react';
import { RotateCcw } from 'lucide-react';

export default function PhaseFinished({ config, gameType, gameState, onAction }) {
    const isImposter = gameType === 'imposter';

    // For imposter game, determine winner
    let winner = null;
    if (isImposter && gameState) {
        const alivePlayers = gameState.players?.filter(p => !p.isHost && p.isAlive) || [];
        const impostersAlive = alivePlayers.filter(p => p.characterId === 'IMPOSTER').length;

        if (impostersAlive === 0) {
            winner = 'Genuine Players Win!';
        } else {
            winner = 'Imposters Win!';
        }
    }

    return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '30px', color: '#d62828', textTransform: 'uppercase', letterSpacing: '3px' }}>
                {isImposter ? winner : (config?.headline || 'Game Over')}
            </h1>
            <p style={{ fontSize: '1.5rem', lineHeight: '1.6', color: '#ccc', maxWidth: '600px', margin: '0 auto' }}>
                {isImposter ? 'Thanks for playing!' : (config?.subtext || 'The investigation has concluded. Discuss the outcome!')}
            </p>
            <div style={{ marginTop: '50px', fontSize: '4rem' }}>
                {isImposter ? '🎭🔍🎭' : '🔍⚰️🔍'}
            </div>

            {isImposter && onAction && (
                <button
                    onClick={() => onAction('RESTART_IMPOSTER')}
                    style={{
                        marginTop: '50px',
                        padding: '18px 40px',
                        fontSize: '1.3rem',
                        background: 'var(--primary, #00f3ff)',
                        color: '#0a192f',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                    <RotateCcw size={24} />
                    PLAY AGAIN (NEW WORD)
                </button>
            )}
        </div>
    );
}
