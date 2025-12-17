import React from 'react';
import { Users, CheckCircle } from 'lucide-react';

export default function PhaseVoting({ gameData, gameState, onAction, isHost }) {
    const alivePlayers = gameState.players?.filter(p => !p.isHost && p.isAlive) || [];
    const votes = gameState.votes || [];
    const currentRound = gameState.currentRound || 1;

    // Check who has voted
    const voterIds = votes.map(v => v.voterId);
    const totalVotes = voterIds.length;
    const totalAlivePlayers = alivePlayers.length;
    const allVoted = totalVotes >= totalAlivePlayers;

    const handleFinalizeVoting = () => {
        if (!allVoted) {
            if (!confirm(`Only ${totalVotes}/${totalAlivePlayers} players have voted. Finalize anyway?`)) {
                return;
            }
        }
        onAction('FINALIZE_VOTING');
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
            {currentRound > 1 && (
                <div style={{
                    background: 'rgba(214, 40, 40, 0.2)',
                    border: '2px solid #d62828',
                    borderRadius: '10px',
                    padding: '15px 30px',
                    marginBottom: '20px',
                    textAlign: 'center',
                    maxWidth: '600px'
                }}>
                    <p style={{ fontSize: '1.3rem', color: '#d62828', fontWeight: 'bold', margin: 0 }}>
                        ⚠️ TIE - Vote Again!
                    </p>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text, #e6f1ff)', marginTop: '5px', marginBottom: 0 }}>
                        Multiple players received the same votes. No elimination. Round {currentRound}.
                    </p>
                </div>
            )}
            <h1 style={{ fontSize: '3rem', marginBottom: '20px', color: 'var(--primary, #00f3ff)' }}>
                Voting in Progress
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text, #e6f1ff)', marginBottom: '30px', opacity: 0.8 }}>
                Players are voting for who they think is the imposter...
            </p>

            <div style={{
                background: 'var(--surface, #112240)',
                padding: '30px',
                borderRadius: '15px',
                border: '1px solid var(--border, #233554)',
                width: '100%',
                maxWidth: '600px'
            }}>
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', color: 'var(--secondary, #64ffda)' }}>
                        {totalVotes} / {totalAlivePlayers} voted
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {alivePlayers.map(player => {
                        const hasVoted = voterIds.includes(player.id);

                        return (
                            <div
                                key={player.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '15px 20px',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border, #233554)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <Users size={20} style={{ color: 'var(--secondary, #64ffda)' }} />
                                    <span style={{ fontSize: '1.1rem', color: 'var(--text, #e6f1ff)' }}>
                                        {player.name}
                                    </span>
                                </div>
                                <div>
                                    {hasVoted && (
                                        <CheckCircle size={18} style={{ color: 'var(--secondary, #64ffda)' }} />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isHost && (
                    <button
                        onClick={handleFinalizeVoting}
                        disabled={!allVoted && totalVotes === 0}
                        style={{
                            width: '100%',
                            marginTop: '30px',
                            padding: '15px',
                            fontSize: '1.2rem',
                            background: allVoted ? 'var(--primary, #00f3ff)' : 'rgba(100,255,218,0.3)',
                            color: allVoted ? '#0a192f' : 'var(--text, #e6f1ff)',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: allVoted || totalVotes > 0 ? 'pointer' : 'not-allowed',
                            fontWeight: 'bold',
                            transition: 'all 0.3s',
                            opacity: (!allVoted && totalVotes === 0) ? 0.5 : 1
                        }}
                    >
                        {allVoted ? 'FINALIZE VOTING' : `FINALIZE (${totalVotes}/${totalAlivePlayers} voted)`}
                    </button>
                )}
            </div>
        </div>
    );
}
