import React, { useState } from 'react';
import { Menu, HelpCircle } from 'lucide-react';
import PhaseRenderer from '../common/PhaseRenderer';
import PhaseLobby from '../common/PhaseLobby';
import HostSidebar from '../murdermystery/HostSidebar';
import Scorecard from './Scorecard';
import HowToPlayModal from './HowToPlayModal';
import { getPhaseConfig } from '../../lib/gameLoader';
import * as api from '../../lib/apiClient';

export default function HostImposter({
    gameData,
    gameState,
    onAction,
    joinUrl,
    qrSrc,
    hostPin,
    connectedPlayers
}) {
    console.log('>>> HostImposter render - gameData:', gameData);
    console.log('>>> gameData.words:', gameData?.words);
    console.log('>>> words length:', gameData?.words?.length);

    const { manifest, characters } = gameData;
    const currentPhaseConfig = getPhaseConfig(manifest, gameState.phase);
    const effectiveGameId = gameState.gameId;

    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [showHowToPlay, setShowHowToPlay] = useState(false);

    // Sub-states
    const [timeLeft, setTimeLeft] = useState(300);

    const theme = {
        bg: '#0a192f', // Dark Blue
        headerBg: '#112240',
        text: '#e6f1ff',
        primary: '#00f3ff', // Neon Cyan
        secondary: '#64ffda', // Neon Green
        surface: '#112240',
        border: '#233554'
    };

    const handleStartImposter = () => {
        console.log('>>> handleStartImposter called');
        console.log('>>> gameData in handler:', gameData);
        console.log('>>> gameData.words in handler:', gameData?.words);

        const words = gameData.words || [];
        console.log('>>> words array:', words);
        console.log('>>> words.length:', words.length);

        if (words.length === 0) {
            alert(`No words loaded! Check words.json\n\nDebug info:\ngameData: ${JSON.stringify(gameData, null, 2)}`);
            return;
        }
        // Pick random word
        const randomWord = words[Math.floor(Math.random() * words.length)];

        // Logic: 1 imposter for < 6 players, 2 for 6-10, etc.
        const playerCount = connectedPlayers.length;
        const imposterCount = Math.max(1, Math.floor(playerCount * 0.25));

        // Shuffle players
        const shuffled = [...connectedPlayers].sort(() => 0.5 - Math.random());
        const imposters = shuffled.slice(0, imposterCount);
        const civilians = shuffled.slice(imposterCount);

        const roles = {};
        imposters.forEach(p => roles[p.id] = "IMPOSTER");
        civilians.forEach(p => roles[p.id] = `WORD:${randomWord}`);

        onAction('START_ROUND_IMPOSTER', { roles });
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
                            background: 'var(--primary, #00f3ff)',
                            color: '#0a192f',
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
                            onStart={handleStartImposter}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', width: '100%', height: '100%' }}>
                            <PhaseRenderer
                                phaseConfig={currentPhaseConfig}
                                gameData={gameData}
                                gameState={gameState}
                                gameType="imposter"
                                onAction={onAction}
                            />
                        </div>
                    )}
                </div>

                {/* Sidebar (Optional for Imposter, but good for Kick features) */}
                <HostSidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    players={connectedPlayers}
                    characters={[]} // No characters in Imposter
                    clues={[]}
                    revealedClues={[]}
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

                {/* Scorecard - Shows eliminated players */}
                {gameState.phase !== 'LOBBY' && <Scorecard gameState={gameState} />}
            </div>

            {/* How to Play Modal */}
            <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
        </div>
    );
}
