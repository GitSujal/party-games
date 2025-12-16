import React from 'react';
import ReactMarkdown from 'react-markdown';

function FlipCard({ frontContent, backContent, frontStyle = {}, backStyle = {} }) {
    return (
        <div className="flip-card" onClick={(e) => e.currentTarget.classList.toggle('flipped')}>
            <div className="flip-card-inner">
                <div className="flip-card-front" style={frontStyle}>
                    {frontContent}
                </div>
                <div className="flip-card-back" style={{ textAlign: 'left', ...backStyle }}>
                    {backContent}
                </div>
            </div>
        </div>
    );
}

export default function PlayerTabRole({ character, avatarUrl }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', paddingBottom: '40px' }}>

            {/* 1. Identity Card */}
            <FlipCard
                frontStyle={avatarUrl ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(${avatarUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                } : {}}
                frontContent={
                    <>
                        <h3 style={{ position: 'relative', zIndex: 1 }}>Who are you?</h3>
                        {!avatarUrl && (
                            <div style={{
                                width: '120px', height: '120px', background: character.image ? '#444' : 'transparent',
                                borderRadius: '50%', margin: '20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden', border: character.image ? '3px solid var(--gold)' : 'none'
                            }}>
                                {character.image ? (
                                    <img
                                        src={character.image}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.style.background = 'transparent';
                                            e.target.parentElement.style.border = 'none';
                                        }}
                                        alt={character.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : null}
                                <span style={{ fontSize: '4rem', display: character.image ? 'none' : 'block' }}>{character.icon}</span>
                            </div>
                        )}
                        <p style={{ marginTop: '10px', color: '#ccc', position: 'relative', zIndex: 1 }}>Tap to Reveal Identity</p>
                    </>
                }
                backContent={
                    <>
                        <h3 style={{ marginTop: 0, color: 'var(--gold)' }}>{character.name}</h3>
                        <div style={{ fontSize: '0.9rem', flex: 1, overflowY: 'auto' }}>
                            <ReactMarkdown>{character.about}</ReactMarkdown>
                        </div>
                    </>
                }
                backStyle={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}
            />

            {/* 2. Goal Card */}
            <FlipCard
                frontStyle={{ background: 'linear-gradient(135deg, #1a2a3a 0%, #2b3b4b 100%)' }}
                frontContent={
                    <>
                        <h3 style={{ color: '#61dafb' }}>🎯 Mission</h3>
                        <div style={{ fontSize: '3rem', margin: '20px 0' }}>🏆</div>
                        <p style={{ color: '#ccc' }}>Tap to Reveal Goal</p>
                    </>
                }
                backStyle={{ background: '#223344', border: '2px solid #61dafb' }}
                backContent={
                    <>
                        <h3 style={{ marginTop: 0, color: '#61dafb' }}>Your Objective</h3>
                        <div style={{ fontSize: '0.9rem', overflowY: 'auto' }}>
                            <ReactMarkdown>{character.goal}</ReactMarkdown>
                        </div>
                    </>
                }
            />

            {/* 3. Action Card */}
            <FlipCard
                frontStyle={{ background: 'linear-gradient(135deg, #2a1a3a 0%, #3b2b4b 100%)' }}
                frontContent={
                    <>
                        <h3 style={{ color: '#d161fb' }}>🎬 Action</h3>
                        <div style={{ fontSize: '3rem', margin: '20px 0' }}>🎭</div>
                        <p style={{ color: '#ccc' }}>Tap to Reveal Script</p>
                    </>
                }
                backStyle={{ background: '#332244', border: '2px solid #d161fb' }}
                backContent={
                    <>
                        <h3 style={{ marginTop: 0, color: '#d161fb' }}>Key Actions</h3>
                        <div style={{ fontSize: '0.9rem', overflowY: 'auto' }}>
                            <ReactMarkdown>{character.action}</ReactMarkdown>
                        </div>
                    </>
                }
            />
        </div>
    );
}
