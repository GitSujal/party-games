import React, { useState } from 'react';
import { Menu, HelpCircle } from 'lucide-react';
import PhaseRenderer from '../common/PhaseRenderer';
import PhaseLobby from '../common/PhaseLobby';
import HostSidebar from './HostSidebar';
import HowToPlayModal from './HowToPlayModal';
import { getPhaseConfig } from '../../lib/gameLoader';

export default function HostMomo({
    gameData,
    gameState,
    onAction,
    joinUrl,
    qrSrc,
    hostPin,
    connectedPlayers
}) {
    const { manifest, characters, clues } = gameData;
    const currentPhaseConfig = getPhaseConfig(manifest, gameState.phase);
    const effectiveGameId = gameState.gameId;

    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [showHowToPlay, setShowHowToPlay] = useState(false);

    // Sub-states for phases
    const [audioTime, setAudioTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [toastStep, setToastStep] = useState('INTRO');
    const [suspectIndex, setSuspectIndex] = useState(0);

    const theme = {
        bg: '#0a0a0a',
        headerBg: '#111111',
        text: '#ffffff',
        primary: '#d62828',
        secondary: '#ffc107',
        surface: '#222222',
        border: '#333333'
    };

    return (
        <div style={{
            height: '100vh', display: 'flex', flexDirection: 'column',
            background: theme.bg, color: theme.text, overflow: 'hidden',
            '--primary': theme.primary,
            '--secondary': theme.secondary,
            '--surface': theme.surface,
            '--border': theme.border,
            '--text': theme.text,
        }}>

            {/* Header */}
            <div style={{
                height: '60px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '0 20px', background: theme.headerBg, zIndex: 20
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer' }}
                    >
                        <Menu size={28} />
                    </button>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>{manifest.name}</h2>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <button
                        onClick={() => setShowHowToPlay(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: 'var(--primary, #d62828)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        <HelpCircle size={18} />
                        How to Play
                    </button>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: 'var(--text)', opacity: 0.7 }}>
                        <span>ID: <strong style={{ color: 'var(--text)' }}>{effectiveGameId}</strong></span>
                        <span onClick={() => setShowPin(!showPin)} style={{ cursor: 'pointer' }}>
                            PIN: <strong style={{ color: showPin ? 'var(--primary)' : 'var(--text)' }}>{showPin ? hostPin : '****'}</strong>
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>

                {/* Main Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0', overflowY: 'auto' }}>

                    {/* Status Indicator */}
                    {gameState.phase !== 'LOBBY' && (
                        <div style={{ margin: '20px 0', textAlign: 'center', zIndex: 60, position: 'relative' }}>
                            <span style={{
                                background: 'var(--surface)', padding: '5px 15px', borderRadius: '20px',
                                border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px'
                            }}>
                                Phase: <strong style={{ color: 'var(--secondary)' }}>{gameState.phase}</strong>
                            </span>
                        </div>
                    )}

                    {/* Phase Content */}
                    {gameState.phase === 'LOBBY' ? (
                        <PhaseLobby
                            gameId={effectiveGameId}
                            minPlayers={gameState.minPlayers}
                            players={connectedPlayers}
                            qrSrc={qrSrc}
                            joinUrl={joinUrl}
                            manifest={manifest}
                            onStart={() => onAction('SET_PHASE', { phase: currentPhaseConfig?.next || 'INTRO' })}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', width: '100%', height: '100%' }}>
                            <PhaseRenderer
                                phaseConfig={currentPhaseConfig}
                                gameData={gameData}
                                gameState={gameState}
                                gameType="momo_massacre"
                                onAction={onAction}
                                toastStep={toastStep}
                                setToastStep={setToastStep}
                                suspectIndex={suspectIndex}
                                setSuspectIndex={setSuspectIndex}
                                audioTime={audioTime}
                                setAudioTime={setAudioTime}
                                audioDuration={audioDuration}
                                setAudioDuration={setAudioDuration}
                            />
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <HostSidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    players={connectedPlayers}
                    characters={characters}
                    clues={clues}
                    revealedClues={gameState.revealedClues || []}
                    onAction={onAction}
                    gameId={effectiveGameId}
                    qrSrc={qrSrc}
                    joinUrl={joinUrl}
                />

                {isSidebarOpen && (
                    <div
                        onClick={() => setIsSidebarOpen(false)}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 25 }}
                    />
                )}
            </div>

            {/* How to Play Modal */}
            <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
        </div>
    );
}
