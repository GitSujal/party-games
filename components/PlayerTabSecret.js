import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Lock } from 'lucide-react';

export default function PlayerTabSecret({ character }) {
    const isKiller = character.id === "12";

    return (
        <div className="flip-card" onClick={(e) => e.currentTarget.classList.toggle('flipped')}>
            <div className="flip-card-inner">
                <div className="flip-card-front" style={{ background: 'linear-gradient(135deg, #1f0101 0%, #3a0000 100%)', color: '#ff4444', border: '1px solid #ff000050' }}>
                    <h3>TOP SECRET</h3>
                    <Lock size={64} style={{ margin: '20px' }} />
                    <p>Tap to reveal your darkest secret</p>
                    {isKiller && <p style={{ color: 'red', fontWeight: 'bold' }}>⚠ WARNING: KILLER ROLE</p>}
                </div>
                <div className="flip-card-back" style={{ background: '#222', border: '2px solid red', overflowY: 'auto', textAlign: 'left' }}>
                    <h3 style={{ color: 'red' }}>YOUR SECRET</h3>
                    <div style={{ fontSize: '0.9rem' }}>
                        <ReactMarkdown>{character.secret}</ReactMarkdown>
                    </div>
                    <hr style={{ width: '100%', borderColor: '#ff000050' }} />
                    <div style={{ width: '100%' }}>
                        <h3>🤥 Your Alibi</h3>
                        <ReactMarkdown>{character.alibi}</ReactMarkdown>
                        {character.tips && (
                            <div style={{ marginTop: '10px', background: '#331111', padding: '10px', borderRadius: '5px', border: '1px dashed red' }}>
                                <strong>🔥 Strategy Tips:</strong>
                                <div style={{ fontSize: '0.85rem' }}>
                                    <ReactMarkdown>{character.tips}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>
                    <audio controls src={`/game_assets/audio/${character.id}_secret.mp3`} style={{ marginTop: '10px', width: '100%' }}>
                        Your browser does not support the audio element.
                    </audio>
                </div>
            </div>
        </div>
    );
}
