import React from 'react';
import { X, Users, Vote, Skull, Trophy } from 'lucide-react';

export default function HowToPlayModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}
            >
                {/* Modal */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'var(--surface, #112240)',
                        borderRadius: '15px',
                        border: '2px solid var(--border, #233554)',
                        maxWidth: '700px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        position: 'relative'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '25px',
                        borderBottom: '1px solid var(--border, #233554)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'sticky',
                        top: 0,
                        background: 'var(--surface, #112240)',
                        zIndex: 1
                    }}>
                        <h2 style={{
                            margin: 0,
                            fontSize: '2rem',
                            color: 'var(--primary, #00f3ff)'
                        }}>
                            🎭 How to Play: Imposter
                        </h2>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text, #e6f1ff)',
                                cursor: 'pointer',
                                padding: '5px'
                            }}
                        >
                            <X size={28} />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '25px', color: 'var(--text, #e6f1ff)' }}>

                        {/* Game Overview */}
                        <section style={{ marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                🎯 Game Overview
                            </h3>
                            <p style={{ fontSize: '1.1rem', lineHeight: '1.6', opacity: 0.9 }}>
                                Imposter is a social deduction game where players must identify who among them are imposters.
                                The genuine players know a secret word, but the imposters don't!
                            </p>
                        </section>

                        {/* Roles */}
                        <section style={{ marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                <Users size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                Player Roles
                            </h3>

                            <div style={{
                                background: 'rgba(100, 255, 218, 0.1)',
                                padding: '20px',
                                borderRadius: '10px',
                                border: '1px solid #64ffda',
                                marginBottom: '15px'
                            }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#64ffda' }}>
                                    ✓ Genuine Players (75%)
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                                    <li>See the secret word on their role card</li>
                                    <li>Must identify and vote out the imposters</li>
                                    <li>Can discuss the word without saying it directly</li>
                                    <li>Work together to find suspicious players</li>
                                </ul>
                            </div>

                            <div style={{
                                background: 'rgba(214, 40, 40, 0.1)',
                                padding: '20px',
                                borderRadius: '10px',
                                border: '1px solid #d62828',
                            }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#d62828' }}>
                                    🎭 Imposters (25%)
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                                    <li>DON'T see the secret word</li>
                                    <li>Must blend in and act like they know the word</li>
                                    <li>Try to figure out the word from context</li>
                                    <li>Avoid being discovered and voted out</li>
                                </ul>
                            </div>
                        </section>

                        {/* Game Flow */}
                        <section style={{ marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                🔄 Game Flow
                            </h3>
                            <ol style={{ lineHeight: '2', fontSize: '1.05rem', paddingLeft: '20px' }}>
                                <li><strong>Setup</strong>: Roles are randomly assigned</li>
                                <li><strong>Discussion</strong>: Players say one word that is related to the secret word.</li>
                                <li><strong>Voting</strong>: Everyone votes for who they think is an imposter</li>
                                <li><strong>Elimination</strong>: Results revealed, player(s) eliminated</li>
                                <li><strong>Win Check</strong>: If no winner yet, repeat from step 2</li>
                            </ol>
                        </section>

                        {/* Voting Rules */}
                        <section style={{ marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                <Vote size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                Voting Rules
                            </h3>
                            <ul style={{ lineHeight: '2', fontSize: '1.05rem', paddingLeft: '20px' }}>
                                <li><strong>Everyone votes</strong>: Each player selects one person to eliminate</li>
                                <li><strong>Votes are hidden</strong>: No one sees the votes until host finalizes</li>
                                <li><strong>Ties mean no elimination</strong>: If multiple players have the same highest votes, nobody is eliminated and voting happens again</li>
                                <li><strong>Winner announced</strong>: Only the player(s) with the most votes (if alone) get eliminated</li>
                            </ul>
                        </section>

                        {/* Win Conditions */}
                        <section style={{ marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                <Trophy size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                Win Conditions
                            </h3>

                            <div style={{
                                background: 'rgba(100, 255, 218, 0.1)',
                                padding: '15px',
                                borderRadius: '10px',
                                border: '1px solid #64ffda',
                                marginBottom: '15px'
                            }}>
                                <strong style={{ fontSize: '1.1rem', color: '#64ffda' }}>
                                    ✓ Genuine Players Win
                                </strong>
                                <p style={{ margin: '8px 0 0 0' }}>
                                    All imposters have been eliminated
                                </p>
                            </div>

                            <div style={{
                                background: 'rgba(214, 40, 40, 0.1)',
                                padding: '15px',
                                borderRadius: '10px',
                                border: '1px solid #d62828',
                            }}>
                                <strong style={{ fontSize: '1.1rem', color: '#d62828' }}>
                                    🎭 Imposters Win
                                </strong>
                                <p style={{ margin: '8px 0 0 0' }}>
                                    Imposters equal or outnumber genuine players
                                </p>
                            </div>
                        </section>

                        {/* Tips */}
                        <section style={{ marginBottom: '10px' }}>
                            <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                💡 Strategy Tips
                            </h3>
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '20px',
                                borderRadius: '10px',
                                border: '1px solid var(--border, #233554)'
                            }}>
                                <p style={{ margin: '0 0 15px 0', fontSize: '1.05rem' }}>
                                    <strong style={{ color: '#64ffda' }}>For Genuine Players:</strong><br />
                                    Everyone is allowed to say only one word related to the secret word.
                                    Watch for vague or confused answers,
                                    coordinate with other genuine players to identify suspicious behavior.
                                </p>
                                <p style={{ margin: 0, fontSize: '1.05rem' }}>
                                    <strong style={{ color: '#d62828' }}>For Imposters:</strong><br />
                                    Stay calm, listen carefully to figure out the word, give vague but confident answers,
                                    mirror what others say, and try to identify other imposters through their behavior.
                                </p>
                            </div>
                        </section>

                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '20px 25px',
                        borderTop: '1px solid var(--border, #233554)',
                        display: 'flex',
                        justifyContent: 'center',
                        position: 'sticky',
                        bottom: 0,
                        background: 'var(--surface, #112240)'
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '12px 40px',
                                fontSize: '1.1rem',
                                background: 'var(--primary, #00f3ff)',
                                color: '#0a192f',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            Got It!
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
