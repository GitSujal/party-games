import React, { useState, useEffect } from 'react';
import { Skull, Users, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PhaseElimination({ gameData, gameState, onAction, isHost }) {
    const [revealStep, setRevealStep] = useState(1); // 1: votes, 2: elimination, 3: status, 4: winner
    const alivePlayers = gameState.players?.filter(p => !p.isHost && p.isAlive) || [];
    const eliminatedPlayers = gameState.players?.filter(p => !p.isHost && !p.isAlive) || [];
    const votes = gameState.votes || [];

    // Calculate vote counts for all players who were alive during this round
    const allPlayersThisRound = [...alivePlayers, ...eliminatedPlayers].filter(p => !p.isHost);
    const voteCounts = {};
    allPlayersThisRound.forEach(p => {
        voteCounts[p.id] = votes.filter(v => v.votedForId === p.id).length;
    });

    // Calculate imposters and genuine players
    const impostersAlive = alivePlayers.filter(p => p.characterId === 'IMPOSTER').length;
    const genuineEliminated = eliminatedPlayers.filter(p => p.characterId && p.characterId.startsWith('WORD:')).length;
    const initialImposterCount = gameState.initialImposterCount || 1;

    // Recently eliminated (last round)
    const recentlyEliminated = eliminatedPlayers.slice(-2); // Show last 2 eliminations max

    const handleContinue = () => {
        // Go back to PLAYING phase (round will auto-increment in API)
        onAction('SET_PHASE', { phase: 'PLAYING' });
    };

    const gameOver = impostersAlive === 0 || genuineEliminated >= initialImposterCount;

    // Trigger confetti when winner is revealed
    useEffect(() => {
        if (revealStep === 4 && gameOver) {
            const duration = 3000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#00f3ff', '#64ffda', '#d62828']
                });
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#00f3ff', '#64ffda', '#d62828']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };

            frame();
        }
    }, [revealStep, gameOver]);

    useEffect(() => {
        if (!isHost) return;

        let timer;
        if (revealStep === 2) {
            // Auto-advance from Recently Eliminated to Game Status after 4s
            timer = setTimeout(() => handleNext(), 4000);
        } else if (revealStep === 3) {
            // Auto-advance to Winner or Continue after 3s
            timer = setTimeout(() => handleNext(), 3000);
        }
        return () => clearTimeout(timer);
    }, [revealStep, isHost]);

    const getNextButtonText = () => {
        if (revealStep === 1) return 'REVEAL ELIMINATIONS';
        if (revealStep === 2) return 'SKIP TO STATUS';
        if (revealStep === 3 && gameOver) return 'SKIP TO WINNER';
        if (revealStep === 3 && !gameOver) return 'START NEXT ROUND';
        if (revealStep === 4 && gameOver) return 'END GAME';
        return 'NEXT';
    };

    const handleNext = () => {
        if (revealStep === 1) {
            setRevealStep(2);
        } else if (revealStep === 2) {
            setRevealStep(3);
        } else if (revealStep === 3 && gameOver) {
            setRevealStep(4);
        } else if (revealStep === 3 && !gameOver) {
            handleContinue();
        } else if (revealStep === 4) {
            onAction('SET_PHASE', { phase: 'FINISHED' });
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            minHeight: '400px'
        }}>
            {/* Step 1: Show vote counts */}
            {revealStep >= 1 && (
                <>
                    <Skull size={80} style={{ color: '#d62828', marginBottom: '30px' }} />
                    <h1 style={{ fontSize: '3rem', marginBottom: '20px', color: '#d62828' }}>
                        Voting Results
                    </h1>

                    <div style={{
                        background: 'var(--surface, #112240)',
                        padding: '25px',
                        borderRadius: '15px',
                        border: '1px solid var(--border, #233554)',
                        width: '100%',
                        maxWidth: '700px',
                        marginBottom: '40px'
                    }}>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)', marginBottom: '20px', textAlign: 'center' }}>
                            Top Votes
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {(() => {
                                const maxVotes = Math.max(...Object.values(voteCounts), 0);
                                const sortedPlayers = allPlayersThisRound
                                    .map(player => ({
                                        ...player,
                                        voteCount: voteCounts[player.id] || 0
                                    }))
                                    .sort((a, b) => b.voteCount - a.voteCount)
                                    .slice(0, 5); // Show only top 5

                                return sortedPlayers.map(player => {
                                    const wasEliminated = !player.isAlive;
                                    const barWidth = maxVotes > 0 ? (player.voteCount / maxVotes) * 100 : 0;

                                    return (
                                        <div
                                            key={player.id}
                                            style={{
                                                position: 'relative',
                                                borderRadius: '10px',
                                                overflow: 'hidden',
                                                border: wasEliminated ? '2px solid #d62828' : '1px solid var(--border, #233554)'
                                            }}
                                        >
                                            {/* Background bar */}
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    height: '100%',
                                                    width: `${barWidth}%`,
                                                    background: 'linear-gradient(90deg, rgba(214, 40, 40, 0.3), rgba(214, 40, 40, 0.1))',
                                                    transition: 'width 0.5s ease'
                                                }}
                                            />
                                            {/* Content */}
                                            <div style={{
                                                position: 'relative',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '15px 20px',
                                                background: 'rgba(255,255,255,0.02)'
                                            }}>
                                                <span style={{ fontSize: '1.1rem', color: 'var(--text, #e6f1ff)', fontWeight: '600' }}>
                                                    {player.name} {wasEliminated && '💀'}
                                                </span>
                                                <span style={{
                                                    padding: '5px 20px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    borderRadius: '20px',
                                                    color: 'var(--text, #e6f1ff)',
                                                    fontSize: '1.2rem',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {player.voteCount} {player.voteCount === 1 ? 'vote' : 'votes'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </>
            )}

            {/* Step 2: Show eliminated players and their roles */}
            {revealStep >= 2 && recentlyEliminated.length > 0 && (
                <>
                    <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: '#d62828' }}>
                        {recentlyEliminated.length === 1 ? 'Player Eliminated!' : 'Players Eliminated!'}
                    </h2>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        marginBottom: '40px',
                        width: '100%',
                        maxWidth: '500px'
                    }}>
                        {recentlyEliminated.map(player => {
                            const isImposter = player.characterId === 'IMPOSTER';

                            return (
                                <div
                                    key={player.id}
                                    style={{
                                        background: isImposter ? 'rgba(214, 40, 40, 0.2)' : 'rgba(100, 255, 218, 0.1)',
                                        padding: '25px',
                                        borderRadius: '15px',
                                        border: `2px solid ${isImposter ? '#d62828' : '#64ffda'}`,
                                        textAlign: 'center'
                                    }}
                                >
                                    <p style={{
                                        fontSize: '1.8rem',
                                        marginBottom: '10px',
                                        color: 'var(--text, #e6f1ff)',
                                        fontWeight: 'bold'
                                    }}>
                                        {player.name}
                                    </p>
                                    <p style={{
                                        fontSize: '1.3rem',
                                        color: isImposter ? '#d62828' : '#64ffda',
                                        fontWeight: 'bold'
                                    }}>
                                        {isImposter ? '🎭 WAS THE IMPOSTER!' : '✓ Genuine Player'}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Step 3: Show game status */}
            {revealStep >= 3 && (
                <div style={{
                    background: 'var(--surface, #112240)',
                    padding: '25px',
                    borderRadius: '15px',
                    border: '1px solid var(--border, #233554)',
                    width: '100%',
                    maxWidth: '500px',
                    marginBottom: '30px',
                    animation: 'fadeIn 0.5s ease-out'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                        <div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text, #e6f1ff)', opacity: 0.7, marginBottom: '5px' }}>
                                Imposters Remaining
                            </p>
                            <p style={{ fontSize: '2rem', color: '#d62828', fontWeight: 'bold' }}>
                                {impostersAlive}
                            </p>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border, #233554)' }}></div>
                        <div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text, #e6f1ff)', opacity: 0.7, marginBottom: '5px' }}>
                                Genuine Eliminated
                            </p>
                            <p style={{ fontSize: '2rem', color: '#64ffda', fontWeight: 'bold' }}>
                                {genuineEliminated} / {initialImposterCount}
                            </p>
                            <p style={{ fontSize: '0.7rem', color: '#888', marginTop: '5px' }}>
                                (Target for Imposter win: {initialImposterCount})
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Show winner */}
            {revealStep >= 4 && gameOver && (
                <div style={{
                    marginBottom: '30px',
                    padding: '30px',
                    background: 'rgba(214, 40, 40, 0.2)',
                    borderRadius: '15px',
                    textAlign: 'center',
                    border: '2px solid #d62828',
                    width: '100%',
                    maxWidth: '500px'
                }}>
                    <AlertTriangle size={50} style={{ color: '#d62828', marginBottom: '15px' }} />
                    <h2 style={{ fontSize: '2.5rem', color: '#d62828', fontWeight: 'bold', marginBottom: '10px' }}>
                        {impostersAlive === 0 ? 'GENUINE PLAYERS WIN!' : 'IMPOSTERS WIN!'}
                    </h2>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text, #e6f1ff)' }}>
                        {impostersAlive === 0
                            ? 'All imposters have been eliminated!'
                            : `The imposters have eliminated ${initialImposterCount} genuine players!`}
                    </p>
                </div>
            )}

            {isHost && (
                <button
                    onClick={handleNext}
                    style={{
                        padding: '20px 50px',
                        fontSize: '1.3rem',
                        background: (revealStep === 4 || (revealStep === 3 && !gameOver)) ? '#d62828' : 'var(--primary, #00f3ff)',
                        color: (revealStep === 4 || (revealStep === 3 && !gameOver)) ? '#fff' : '#0a192f',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'transform 0.2s',
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                    {getNextButtonText()}
                </button>
            )}
        </div>
    );
}
