import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle, HelpCircle } from 'lucide-react';
import PlayerVoting from './PlayerVoting';
import PhaseElimination from './PhaseElimination';
import Scorecard from './Scorecard';
import HowToPlayModal from './HowToPlayModal';

export default function PlayerImposter({ gameState, player, onAction }) {
    const { phase } = gameState;
    const [toggled, setToggled] = useState(false);
    const [votedPlayerId, setVotedPlayerId] = useState(null);
    const [showHowToPlay, setShowHowToPlay] = useState(false);

    // Parse role/word from characterId (e.g. "IMPOSTER" or "WORD:Airport")
    const rawRole = player.characterId || '';
    const isImposter = rawRole === 'IMPOSTER';
    const word = rawRole.startsWith('WORD:') ? rawRole.replace('WORD:', '') : null;

    if (phase === 'imposter_assign') {
        // Logic for assign phase if any special UI needed
    }

    // How to Play Button Component
    const HowToPlayButton = () => (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
            <button
                onClick={() => setShowHowToPlay(true)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    background: 'var(--primary, #00f3ff)',
                    color: '#0a192f',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    transition: 'transform 0.2s',
                    boxShadow: '0 2px 8px rgba(0, 243, 255, 0.3)'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                <HelpCircle size={18} />
                How to Play
            </button>
        </div>
    );

    const renderCard = () => {
        return (
            <div
                onClick={() => setToggled(!toggled)}
                style={{
                    background: '#222',
                    border: '2px solid #fff',
                    borderRadius: '15px',
                    padding: '40px',
                    margin: '30px auto',
                    cursor: 'pointer',
                    maxWidth: '300px',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s'
                }}
            >
                <div style={{ marginBottom: '20px' }}>
                    {toggled ? <EyeOff size={40} /> : <Eye size={40} />}
                </div>

                {!toggled ? (
                    <h3 style={{ fontSize: '1.5rem', margin: 0 }}>TAP TO REVEAL</h3>
                ) : (
                    <>
                        {isImposter ? (
                            <>
                                <p style={{ fontSize: '1rem', margin: '0 0 10px 0', color: '#ccc' }}>YOUR ROLE</p>
                                <h1 style={{ fontSize: '2.5rem', margin: '0 0 10px 0', textTransform: 'uppercase' }}>IMPOSTER</h1>
                                <p style={{ fontSize: '0.9rem', color: '#aaa' }}>You don't know the secret word.</p>
                                <p style={{ fontSize: '0.9rem', color: '#aaa' }}>Blend in and find it!</p>
                            </>
                        ) : (
                            <>
                                <p style={{ fontSize: '1rem', margin: '0 0 10px 0', color: '#ccc' }}>SECRET WORD</p>
                                <h1 style={{ fontSize: '3rem', margin: 0, textTransform: 'uppercase', color: 'var(--accent)' }}>{word}</h1>
                            </>
                        )}
                    </>
                )}
            </div>
        );
    };

    if (phase === 'ASSIGN' || phase === 'PLAYING') {
        return (
            <>
                <Scorecard gameState={gameState} />
                <HowToPlayButton />
                <div style={{ padding: '20px', textAlign: 'center', color: '#fff' }}>
                    <h2 style={{ color: 'var(--gold)' }}>
                        {phase === 'ASSIGN' ? 'Round Starting' : 'Discussion Time'}
                    </h2>
                    {renderCard()}
                    <p style={{ color: '#888' }}>Tap card to toggle visibility</p>
                </div>
                <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
            </>
        );
    }

    if (phase === 'VOTING') {
        // Only show voting if player is alive
        if (!player.isAlive) {
            return (
                <>
                    <Scorecard gameState={gameState} />
                    <HowToPlayButton />
                    <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>
                        <h2 style={{ color: '#d62828' }}>You have been eliminated</h2>
                        <p style={{ color: '#888', marginTop: '20px' }}>
                            You can watch the voting unfold on the host screen
                        </p>
                    </div>
                    <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
                </>
            );
        }

        return (
            <>
                <Scorecard gameState={gameState} />
                <HowToPlayButton />
                <PlayerVoting gameState={gameState} playerId={player.id} />
                <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
            </>
        );
    }

    if (phase === 'ELIMINATION') {
        return (
            <>
                <Scorecard gameState={gameState} />
                <HowToPlayButton />
                <PhaseElimination gameData={{}} gameState={gameState} onAction={() => {}} isHost={false} />
                <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
            </>
        );
    }

    return (
        <>
            <Scorecard gameState={gameState} />
            <HowToPlayButton />
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>Wait for host...</h2>
            </div>
            <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
        </>
    );
}
