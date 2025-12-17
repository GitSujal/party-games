import React from 'react';

export default function LandingCard({ onJoinGame, onHostGame, onShowGuide }) {
    const cardStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '40px',
        borderRadius: '20px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
    };

    const titleStyle = {
        fontSize: '2.5rem',
        marginBottom: '10px',
        color: '#d62828',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        textShadow: '0 0 10px rgba(214, 40, 40, 0.5)'
    };

    const btnStyle = {
        width: '100%', padding: '15px', margin: '10px 0', fontSize: '1.2rem',
        border: 'none', borderRadius: '8px', cursor: 'pointer',
        transition: 'transform 0.2s, opacity 0.2s', fontWeight: 'bold', textTransform: 'uppercase'
    };

    const primaryBtn = { ...btnStyle, background: '#d62828', color: '#fff' };
    const secondaryBtn = { ...btnStyle, background: '#333', color: '#ccc', border: '1px solid #444' };
    const linkBtn = { background: 'transparent', border: 'none', color: '#888', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline', margin: '0 10px' };

    return (
        <div style={cardStyle}>
            <h1 style={titleStyle}>Party Games</h1>
            <p style={{ color: '#888', marginBottom: '40px', fontSize: '1.1rem' }}>
                Interactive Social Deduction & Mysteries
            </p>

            <div style={{ marginBottom: '30px' }}>
                <button
                    style={primaryBtn}
                    onClick={onJoinGame}
                    onMouseOver={e => e.target.style.opacity = 0.9}
                    onMouseOut={e => e.target.style.opacity = 1}
                >
                    Join Game
                </button>
                <button
                    style={secondaryBtn}
                    onClick={onHostGame}
                    onMouseOver={e => e.target.style.background = '#444'}
                    onMouseOut={e => e.target.style.background = '#333'}
                >
                    Start as Host
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <button style={linkBtn} onClick={() => onShowGuide('PLAYER')}>How to Play</button>
                <span style={{ color: '#444' }}>|</span>
                <button style={linkBtn} onClick={() => onShowGuide('HOST')}>Host Guide</button>
            </div>
        </div>
    );
}
