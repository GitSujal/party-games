import React from 'react';

/**
 * PhaseAnnouncement - Data-driven announcement phase
 * Displays headline, subtext, and instruction from config
 */
export default function PhaseAnnouncement({ config, onNext }) {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
            background: '#0a0a0a',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#d62828', textAlign: 'center', padding: '40px'
        }}>
            <h1 style={{ fontSize: '4rem', textTransform: 'uppercase', letterSpacing: '5px', animation: 'pulse 3s infinite' }}>
                {config.headline || 'Announcement'}
            </h1>

            {config.subtext && (
                <p style={{ fontSize: '1.8rem', color: '#fff', maxWidth: '800px', marginTop: '30px', lineHeight: '1.6' }}>
                    {config.subtext.split('.').map((sentence, i) => (
                        <span key={i}>
                            {sentence.trim()}
                            {i < config.subtext.split('.').length - 1 && sentence.trim() && <><br /><span style={{ color: '#aaa' }}>{''}</span></>}
                        </span>
                    ))}
                </p>
            )}

            {config.instruction && (
                <div style={{ marginTop: '50px', border: '1px solid #d62828', padding: '20px', borderRadius: '10px', background: 'rgba(214, 40, 40, 0.1)' }}>
                    <h3 style={{ color: '#d62828', margin: '0 0 10px 0' }}>HOST INSTRUCTION</h3>
                    <p style={{ fontSize: '1.2rem', margin: 0, color: '#fff' }}>
                        {config.instruction}
                    </p>
                </div>
            )}

            <button
                className="btn"
                onClick={onNext}
                style={{ marginTop: '60px', fontSize: '1.5rem', padding: '15px 40px', background: '#333' }}
            >
                Continue &rarr;
            </button>
        </div>
    );
}
