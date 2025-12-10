import React from 'react';

export default function PhaseFinished({ config }) {
    return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '30px', color: '#d62828', textTransform: 'uppercase', letterSpacing: '3px' }}>
                {config?.headline || 'Game Over'}
            </h1>
            <p style={{ fontSize: '1.5rem', lineHeight: '1.6', color: '#ccc', maxWidth: '600px', margin: '0 auto' }}>
                {config?.subtext || 'The investigation has concluded. Discuss the outcome!'}
            </p>
            <div style={{ marginTop: '50px', fontSize: '4rem' }}>🔍⚰️🔍</div>
        </div>
    );
}
