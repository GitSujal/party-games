import React from 'react';

export default function PlayerHeader({ character, playerName, avatarUrl, originalImageUrl }) {
    // Determine which image to display
    const isGenerating = avatarUrl === 'GENERATING';
    const displayUrl = isGenerating ? originalImageUrl : avatarUrl;
    const borderColor = isGenerating ? '#ffaa00' : 'var(--gold, #ffd700)';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '30px',
            padding: '20px',
            background: 'linear-gradient(135deg, #1a1a1d 0%, #0a0a0a 100%)',
            borderRadius: '15px',
            border: '2px solid var(--gold, #ffd700)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
            {/* Avatar */}
            <div style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: `4px solid ${borderColor}`,
                marginBottom: '15px',
                boxShadow: isGenerating ? '0 4px 15px rgba(255,170,0,0.3)' : '0 4px 15px rgba(255,215,0,0.3)',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
            }}>
                {displayUrl ? (
                    <>
                        <img
                            src={displayUrl}
                            alt={character.name}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                        {isGenerating && (
                            <div style={{
                                position: 'absolute',
                                bottom: '5px',
                                right: '5px',
                                background: '#ffaa00',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '3px solid #000',
                                animation: 'pulse 1.5s infinite'
                            }}>
                                <span style={{ fontSize: '1rem' }}>⏳</span>
                            </div>
                        )}
                    </>
                ) : (
                    <span style={{ fontSize: '4rem' }}>{character.icon || '👤'}</span>
                )}
            </div>

            {/* Character Info */}
            <div style={{ textAlign: 'center' }}>
                <h2 style={{
                    margin: '0 0 10px 0',
                    fontSize: '1.8rem',
                    color: 'var(--accent, #61dafb)',
                    letterSpacing: '1px',
                    textShadow: '0 2px 10px rgba(97,218,251,0.3)'
                }}>
                    {character.name}
                </h2>
                <div style={{
                    fontSize: '0.9rem',
                    color: '#888',
                    fontStyle: 'italic',
                    marginBottom: '8px'
                }}>
                    {character.role}
                </div>
                <span style={{
                    fontSize: '0.85rem',
                    background: 'rgba(255,215,0,0.1)',
                    color: 'var(--gold, #ffd700)',
                    padding: '6px 15px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,215,0,0.3)',
                    display: 'inline-block'
                }}>
                    Playing as {playerName}
                </span>
            </div>
        </div>
    );
}
