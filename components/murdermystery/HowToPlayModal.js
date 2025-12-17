import React, { useState } from 'react';
import { X, User, Users, Lightbulb, Play, Eye } from 'lucide-react';

export default function HowToPlayModal({ isOpen, onClose, defaultTab = 'host' }) {
    const [activeTab, setActiveTab] = useState(defaultTab); // 'host' or 'players'

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
                        maxWidth: '800px',
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
                        position: 'sticky',
                        top: 0,
                        background: 'var(--surface, #112240)',
                        zIndex: 1
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: '2rem',
                                color: 'var(--primary, #00f3ff)'
                            }}>
                                🔍 How to Play: Murder Mystery
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

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setActiveTab('host')}
                                style={{
                                    flex: 1,
                                    padding: '12px 20px',
                                    background: activeTab === 'host' ? 'var(--primary, #00f3ff)' : 'rgba(255,255,255,0.05)',
                                    color: activeTab === 'host' ? '#0a192f' : 'var(--text, #e6f1ff)',
                                    border: activeTab === 'host' ? 'none' : '1px solid var(--border, #233554)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <User size={20} />
                                For Host
                            </button>
                            <button
                                onClick={() => setActiveTab('players')}
                                style={{
                                    flex: 1,
                                    padding: '12px 20px',
                                    background: activeTab === 'players' ? 'var(--primary, #00f3ff)' : 'rgba(255,255,255,0.05)',
                                    color: activeTab === 'players' ? '#0a192f' : 'var(--text, #e6f1ff)',
                                    border: activeTab === 'players' ? 'none' : '1px solid var(--border, #233554)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Users size={20} />
                                For Players
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '25px', color: 'var(--text, #e6f1ff)' }}>

                        {/* HOST INSTRUCTIONS */}
                        {activeTab === 'host' && (
                            <>
                                {/* Game Overview */}
                                <section style={{ marginBottom: '30px' }}>
                                    <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                        🎯 Your Role as Host
                                    </h3>
                                    <p style={{ fontSize: '1.1rem', lineHeight: '1.6', opacity: 0.9 }}>
                                        As the host, you control the game flow and ensure everyone has a great experience.
                                        You'll guide players through the story, assign roles, and reveal clues at the right moments.
                                    </p>
                                </section>

                                {/* Setup */}
                                <section style={{ marginBottom: '30px' }}>
                                    <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                        <Play size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                        Setting Up the Game
                                    </h3>
                                    <ol style={{ lineHeight: '2', fontSize: '1.05rem', paddingLeft: '20px' }}>
                                        <li><strong>Share QR Code/Link</strong>: Players scan to join on their phones</li>
                                        <li><strong>Assign Characters</strong>: Open sidebar (☰ menu) and assign each player a character role</li>
                                        <li><strong>Start Game</strong>: Once all characters are assigned, begin the story</li>
                                    </ol>
                                </section>

                                {/* Game Flow */}
                                <section style={{ marginBottom: '30px' }}>
                                    <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                        🔄 Managing Game Phases
                                    </h3>
                                    <div style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '20px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border, #233554)',
                                        marginBottom: '15px'
                                    }}>
                                        <h4 style={{ margin: '0 0 15px 0', fontSize: '1.2rem', color: 'var(--primary, #00f3ff)' }}>
                                            Phase Progression
                                        </h4>
                                        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                                            <li><strong>Intro</strong>: Cinematic introduction sets the scene</li>
                                            <li><strong>Victim Introduction</strong>: The victim is revealed to all players</li>
                                            <li><strong>Murder Announcement</strong>: The crime is announced</li>
                                            <li><strong>Character Introductions</strong>: Each suspect is introduced one by one</li>
                                            <li><strong>Investigation</strong>: The main gameplay where you reveal clues</li>
                                            <li><strong>Conclusion</strong>: Discuss and reveal the solution</li>
                                        </ul>
                                    </div>
                                    <p style={{ fontSize: '1.05rem', lineHeight: '1.6', opacity: 0.9 }}>
                                        <strong>Tip:</strong> Each phase has a "Next" or "Continue" button. Take your time—let players
                                        read and discuss before moving forward.
                                    </p>
                                </section>

                                {/* Revealing Clues */}
                                <section style={{ marginBottom: '30px' }}>
                                    <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                        <Lightbulb size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                        Revealing Clues
                                    </h3>
                                    <div style={{
                                        background: 'rgba(100, 255, 218, 0.1)',
                                        padding: '20px',
                                        borderRadius: '10px',
                                        border: '1px solid #64ffda',
                                    }}>
                                        <p style={{ margin: '0 0 15px 0', fontSize: '1.05rem' }}>
                                            During the <strong>Investigation Phase</strong>:
                                        </p>
                                        <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                                            <li>Open the sidebar (☰ menu)</li>
                                            <li>Go to the "Clues" tab</li>
                                            <li>Click "Reveal" next to any clue to show it to all players</li>
                                            <li>Revealed clues appear on all player screens instantly</li>
                                        </ol>
                                        <p style={{ margin: '15px 0 0 0', fontSize: '1.05rem', opacity: 0.9 }}>
                                            <strong>Strategy:</strong> Pace clue reveals to build suspense. Don't reveal everything at once!
                                        </p>
                                    </div>
                                </section>

                                {/* Host Controls */}
                                <section style={{ marginBottom: '10px' }}>
                                    <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                        ⚙️ Host Controls
                                    </h3>
                                    <ul style={{ lineHeight: '2', fontSize: '1.05rem', paddingLeft: '20px' }}>
                                        <li><strong>Sidebar (☰)</strong>: Access all controls, view players, assign characters, reveal clues</li>
                                        <li><strong>Phase Status</strong>: Top of screen shows current phase</li>
                                        <li><strong>Kick Players</strong>: Remove disruptive players from sidebar</li>
                                        <li><strong>Reset Game</strong>: Start over if needed (clears all progress)</li>
                                    </ul>
                                </section>
                            </>
                        )}

                        {/* PLAYER INSTRUCTIONS */}
                        {activeTab === 'players' && (
                            <>
                                {/* Game Overview */}
                                <section style={{ marginBottom: '30px' }}>
                                    <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                        🎯 Welcome Players!
                                    </h3>
                                    <p style={{ fontSize: '1.1rem', lineHeight: '1.6', opacity: 0.9 }}>
                                        You're about to experience an interactive murder mystery! Each of you will receive a unique
                                        character with secrets, motives, and information. Work together to solve the crime!
                                    </p>
                                </section>

                                {/* How to Join */}
                                <section style={{ marginBottom: '30px' }}>
                                    <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                        📱 Joining the Game
                                    </h3>
                                    <ol style={{ lineHeight: '2', fontSize: '1.05rem', paddingLeft: '20px' }}>
                                        <li><strong>Scan QR Code</strong>: Use your phone to scan the code shown by the host</li>
                                        <li><strong>Enter Your Name</strong>: Choose a name (can be your real name or a fun alias)</li>
                                        <li><strong>Wait for Character</strong>: The host will assign you a character role</li>
                                        <li><strong>Game Begins</strong>: Follow along on your phone screen</li>
                                    </ol>
                                </section>

                                {/* Your Character */}
                                <section style={{ marginBottom: '30px' }}>
                                    <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                        <Eye size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                        Your Character Information
                                    </h3>
                                    <div style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '20px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border, #233554)',
                                        marginBottom: '15px'
                                    }}>
                                        <p style={{ margin: '0 0 15px 0', fontSize: '1.05rem' }}>
                                            Once assigned, you'll have access to <strong>three tabs</strong>:
                                        </p>
                                        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                                            <li><strong>Role</strong>: Your character's public information (visible to all during introductions)</li>
                                            <li><strong>Secret</strong>: Private information only you know (keep this secret!)</li>
                                            <li><strong>Clues</strong>: Evidence revealed by the host during the investigation</li>
                                        </ul>
                                    </div>
                                    <div style={{
                                        background: 'rgba(214, 40, 40, 0.1)',
                                        padding: '15px',
                                        borderRadius: '10px',
                                        border: '1px solid #d62828',
                                    }}>
                                        <p style={{ margin: 0, fontSize: '1.05rem' }}>
                                            ⚠️ <strong>Important:</strong> Don't show your secret information to other players!
                                            Part of the fun is gradually revealing (or hiding) information through discussion.
                                        </p>
                                    </div>
                                </section>

                                {/* Game Flow */}
                                <section style={{ marginBottom: '30px' }}>
                                    <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                        🔄 What to Expect
                                    </h3>
                                    <ol style={{ lineHeight: '2', fontSize: '1.05rem', paddingLeft: '20px' }}>
                                        <li><strong>Story Introduction</strong>: Watch/listen to the setup</li>
                                        <li><strong>Meet the Victim</strong>: Learn about who was murdered</li>
                                        <li><strong>Character Introductions</strong>: Everyone's public role is revealed</li>
                                        <li><strong>Investigation</strong>: Discuss and review clues as they're revealed</li>
                                        <li><strong>Accusation & Solution</strong>: Discuss theories and discover the truth</li>
                                    </ol>
                                </section>

                                {/* Tips */}
                                <section style={{ marginBottom: '10px' }}>
                                    <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '15px' }}>
                                        💡 Playing Tips
                                    </h3>
                                    <div style={{
                                        background: 'rgba(100, 255, 218, 0.1)',
                                        padding: '20px',
                                        borderRadius: '10px',
                                        border: '1px solid #64ffda'
                                    }}>
                                        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                                            <li><strong>Stay in Character</strong>: Act like your character would act</li>
                                            <li><strong>Ask Questions</strong>: Interrogate other players about their motives and alibis</li>
                                            <li><strong>Share Strategically</strong>: Decide what information to reveal and when</li>
                                            <li><strong>Take Notes</strong>: Keep track of clues and suspicious behavior</li>
                                            <li><strong>Have Fun</strong>: The goal is entertainment, not just solving the mystery!</li>
                                        </ul>
                                    </div>
                                </section>
                            </>
                        )}

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
