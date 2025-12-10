import React from 'react';

export default function PlayerHeader({ character, playerName }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '2rem' }}>{character.icon}</span>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{character.name}</h2>
                    <span style={{ fontSize: '0.8rem', background: '#333', padding: '2px 8px', borderRadius: '4px' }}>{playerName}</span>
                </div>
            </div>
        </div>
    );
}
