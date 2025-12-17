import React, { useState, useEffect } from 'react';
import { User, ShieldAlert, CheckCircle, Clock, Vote } from 'lucide-react';
import PhaseVoting from './PhaseVoting';
import PhaseElimination from './PhaseElimination';

export default function PhaseImposter({ config, gameState, gameData, onAction }) {
    const { type } = config;
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes default
    const [timerActive, setTimerActive] = useState(false);

    // Reset timer on phase change
    useEffect(() => {
        if (type === 'imposter_playing') {
            setTimeLeft(300);
            setTimerActive(true);
        } else {
            setTimerActive(false);
        }
    }, [type]);

    useEffect(() => {
        let interval;
        if (timerActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timerActive, timeLeft]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (type === 'imposter_assign') {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <h2 style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '20px' }}>Secret Words Revealed</h2>
                <p style={{ fontSize: '1.2rem', color: 'var(--text)', marginBottom: '40px', opacity: 0.8 }}>
                    Players are memorizing their word. The Imposter is trying to panic.
                </p>
                <div style={{ fontSize: '4rem', marginBottom: '40px' }}>🤫</div>
                <button
                    onClick={() => onAction('SET_PHASE', { phase: 'PLAYING' })}
                    style={{
                        padding: '15px 40px', fontSize: '1.2rem', background: 'var(--primary)',
                        color: 'var(--bg)', border: 'none', borderRadius: '50px', cursor: 'pointer',
                        boxShadow: '0 0 20px rgba(0, 243, 255, 0.4)', fontWeight: 'bold'
                    }}
                >
                    Start Timer
                </button>
            </div>
        );
    }

    if (type === 'imposter_playing') {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '10px', color: 'var(--text)' }}>Discussion Time</h2>
                <div style={{
                    fontSize: '5rem', fontWeight: 'bold', fontFamily: 'monospace',
                    color: timeLeft < 60 ? 'var(--primary)' : 'var(--text)', margin: '30px 0'
                }}>
                    {formatTime(timeLeft)}
                </div>

                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    <button
                        onClick={() => setTimerActive(!timerActive)}
                        style={{
                            padding: '10px 20px', fontSize: '1rem', background: 'var(--surface)',
                            color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '5px', cursor: 'pointer'
                        }}
                    >
                        {timerActive ? 'Pause' : 'Resume'}
                    </button>
                    <button
                        onClick={() => onAction('SET_PHASE', { phase: 'VOTING' })}
                        style={{
                            padding: '10px 30px', fontSize: '1.2rem', background: 'var(--primary)',
                            color: 'var(--bg)', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        Start Voting
                    </button>
                </div>
            </div>
        );
    }

    if (type === 'imposter_voting') {
        return (
            <PhaseVoting
                gameData={gameData}
                gameState={gameState}
                onAction={onAction}
                isHost={true}
            />
        );
    }

    if (type === 'imposter_elimination') {
        return (
            <PhaseElimination
                gameData={gameData}
                gameState={gameState}
                onAction={onAction}
                isHost={true}
            />
        );
    }

    return <div>Unknown Phase Type</div>;
}
