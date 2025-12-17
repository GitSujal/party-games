import React from 'react';

export default function PlayerWaiting({ playerName }) {
    return (
        <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1 className="momo-font">Wait for Host</h1>
            <p>You have joined as <strong>{playerName}</strong></p>
            <p>Waiting for the host to assign your character and start the game...</p>
            <div style={{ marginTop: '50px', fontSize: '3rem', animation: 'pulse 2s infinite' }}>⏳</div>
        </div>
    );
}
