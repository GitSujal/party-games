import React, { useState } from 'react';
import { Users, CheckCircle, Vote } from 'lucide-react';
import * as api from '../../lib/apiClient';

export default function PlayerVoting({ gameState, playerId }) {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [voted, setVoted] = useState(false);
    const [loading, setLoading] = useState(false);

    const alivePlayers = gameState.players?.filter(p => !p.isHost && p.isAlive && p.id !== playerId) || [];
    const myVote = gameState.votes?.find(v => v.voterId === playerId);
    const hasVoted = !!myVote;

    const handleVote = async () => {
        if (!selectedPlayer) {
            alert('Please select a player to vote for');
            return;
        }

        setLoading(true);
        try {
            await api.castVote(gameState.gameId, playerId, selectedPlayer);
            setVoted(true);
        } catch (err) {
            alert(`Failed to cast vote: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (voted || hasVoted) {
        const votedForId = myVote?.votedForId || selectedPlayer;
        const votedForPlayer = gameState.players?.find(p => p.id === votedForId);

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a192f 0%, #112240 100%)',
                color: '#e6f1ff'
            }}>
                <CheckCircle size={80} style={{ color: '#64ffda', marginBottom: '30px' }} />
                <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', textAlign: 'center' }}>
                    Vote Submitted!
                </h1>
                <p style={{ fontSize: '1.3rem', marginBottom: '40px', opacity: 0.8, textAlign: 'center' }}>
                    You voted for <strong style={{ color: '#64ffda' }}>{votedForPlayer?.name}</strong>
                </p>
                <p style={{ fontSize: '1rem', opacity: 0.6, textAlign: 'center' }}>
                    Waiting for other players to vote...
                </p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 20px',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a192f 0%, #112240 100%)',
            color: '#e6f1ff'
        }}>
            <Vote size={60} style={{ color: '#00f3ff', marginBottom: '20px' }} />
            <h1 style={{ fontSize: '2.5rem', marginBottom: '15px', textAlign: 'center' }}>
                Who is the Imposter?
            </h1>
            <p style={{ fontSize: '1.1rem', marginBottom: '40px', opacity: 0.8, textAlign: 'center' }}>
                Vote for the player you suspect
            </p>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                width: '100%',
                maxWidth: '500px',
                marginBottom: '30px'
            }}>
                {alivePlayers.map(player => (
                    <button
                        key={player.id}
                        onClick={() => setSelectedPlayer(player.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px',
                            padding: '20px',
                            background: selectedPlayer === player.id
                                ? 'rgba(0, 243, 255, 0.2)'
                                : 'rgba(255,255,255,0.05)',
                            border: selectedPlayer === player.id
                                ? '2px solid #00f3ff'
                                : '1px solid #233554',
                            borderRadius: '12px',
                            color: '#e6f1ff',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            textAlign: 'left'
                        }}
                        onMouseOver={(e) => {
                            if (selectedPlayer !== player.id) {
                                e.target.style.background = 'rgba(255,255,255,0.1)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (selectedPlayer !== player.id) {
                                e.target.style.background = 'rgba(255,255,255,0.05)';
                            }
                        }}
                    >
                        <Users size={24} style={{ color: '#64ffda' }} />
                        <span>{player.name}</span>
                        {selectedPlayer === player.id && (
                            <CheckCircle size={24} style={{ color: '#00f3ff', marginLeft: 'auto' }} />
                        )}
                    </button>
                ))}
            </div>

            <button
                onClick={handleVote}
                disabled={!selectedPlayer || loading}
                style={{
                    padding: '18px 60px',
                    fontSize: '1.3rem',
                    background: selectedPlayer && !loading ? '#00f3ff' : 'rgba(100,255,218,0.3)',
                    color: selectedPlayer && !loading ? '#0a192f' : '#e6f1ff',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: selectedPlayer && !loading ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                    transition: 'transform 0.2s',
                    opacity: !selectedPlayer || loading ? 0.5 : 1
                }}
                onMouseOver={(e) => {
                    if (selectedPlayer && !loading) {
                        e.target.style.transform = 'scale(1.05)';
                    }
                }}
                onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                }}
            >
                {loading ? 'Submitting...' : 'CAST VOTE'}
            </button>
        </div>
    );
}
