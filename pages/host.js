import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import QRCode from 'qrcode';
import { Menu } from 'lucide-react';

// Lib
import { loadGameData, getPhaseConfig } from '../lib/gameLoader';
import * as api from '../lib/apiClient';

// Components
import HostSidebar from '../components/HostSidebar';
import PhaseRenderer from '../components/PhaseRenderer';
import PhaseLobby from '../components/PhaseLobby';

export default function Host() {
    const router = useRouter();
    const { gameId: queryGameId, pin: queryPin, gameType: queryGameType } = router.query;

    // Game Data (loaded from static assets)
    const [gameData, setGameData] = useState(null);
    const [gameType, setGameType] = useState('momo_massacre');

    // Game State (from API)
    const [gameState, setGameState] = useState(null);
    const [error, setError] = useState(null);

    // UI State
    const [qrSrc, setQrSrc] = useState('');
    const [hostPin, setHostPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Phase Sub-States
    const [audioTime, setAudioTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [toastStep, setToastStep] = useState('INTRO');
    const [suspectIndex, setSuspectIndex] = useState(0);

    // Load host PIN from URL or sessionStorage
    useEffect(() => {
        if (queryPin) {
            setHostPin(queryPin);
            sessionStorage.setItem('hostPin', queryPin);
        } else {
            const stored = sessionStorage.getItem('hostPin');
            if (stored) setHostPin(stored);
        }
        if (queryGameType) {
            setGameType(queryGameType);
        }
    }, [queryPin, queryGameType]);

    // Load game data from static assets
    useEffect(() => {
        if (gameType) {
            loadGameData(gameType)
                .then(setGameData)
                .catch(err => setError(`Failed to load game data: ${err.message}`));
        }
    }, [gameType]);

    // Poll game state from API with exponential backoff on errors
    useEffect(() => {
        if (!queryGameId) return;

        let interval;
        let errorCount = 0;
        const baseInterval = 2000; // 2 seconds base polling
        const maxInterval = 10000; // Max 10 seconds
        const maxErrors = 5;

        const fetchState = async () => {
            try {
                const state = await api.getGameState(queryGameId);
                setGameState(state);
                setError(null);
                errorCount = 0; // Reset error count on success
            } catch (err) {
                errorCount++;
                if (errorCount >= maxErrors) {
                    setError(`Connection failed: ${err.message}`);
                    clearInterval(interval); // Stop polling after max errors
                } else {
                    console.warn(`Fetch error (${errorCount}/${maxErrors}):`, err.message);
                }
            }
        };

        // Calculate interval with exponential backoff
        const getInterval = () => {
            if (errorCount === 0) return baseInterval;
            return Math.min(baseInterval * Math.pow(2, errorCount - 1), maxInterval);
        };

        fetchState(); // Initial fetch

        // Dynamic interval based on error count
        const scheduleNext = () => {
            interval = setTimeout(() => {
                fetchState().then(() => {
                    if (errorCount < maxErrors) {
                        scheduleNext();
                    }
                });
            }, getInterval());
        };

        scheduleNext();

        return () => clearTimeout(interval);
    }, [queryGameId]);

    // Generate QR Code
    useEffect(() => {
        if (queryGameId) {
            const joinUrl = `${window.location.origin}/join?gameId=${queryGameId}`;
            QRCode.toDataURL(joinUrl, { margin: 1, width: 400 }).then(setQrSrc);
        }
    }, [queryGameId]);

    // Admin action wrapper
    const performAction = async (subAction, payload = {}) => {
        try {
            if (subAction === 'SET_PHASE') {
                await api.setPhase(queryGameId, hostPin, payload.phase);
            } else if (subAction === 'ASSIGN_CHARACTER') {
                await api.assignCharacter(queryGameId, hostPin, payload.playerId, payload.characterId);
            } else if (subAction === 'REVEAL_CLUE') {
                await api.revealClue(queryGameId, hostPin, payload.clueId);
            } else if (subAction === 'KICK') {
                await api.kickPlayer(queryGameId, hostPin, payload.playerId);
            } else if (subAction === 'RESET') {
                await api.resetGame(queryGameId, hostPin);
            }
            // Refresh state
            const state = await api.getGameState(queryGameId);
            setGameState(state);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    // Loading/Error states
    if (error) return <div style={{ color: 'red', textAlign: 'center', marginTop: '20px' }}>Error: {error}</div>;
    if (!gameData) return <div style={{ textAlign: 'center', marginTop: '50px', color: '#888' }}>Loading game data...</div>;
    if (!gameState) return <div style={{ textAlign: 'center', marginTop: '50px', color: '#888' }}>Connecting to game...</div>;

    const { manifest, characters, clues } = gameData;
    const connectedPlayers = gameState.players?.filter(p => !p.isHost) || [];
    const effectiveGameId = gameState.gameId || queryGameId;
    const currentPhaseConfig = getPhaseConfig(manifest, gameState.phase);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#000', color: '#fff', overflow: 'hidden' }}>

            {/* Header / Top Bar */}
            <div style={{
                height: '60px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '0 20px', background: '#111', zIndex: 20
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                    >
                        <Menu size={28} />
                    </button>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)' }}>{manifest.name}</h2>
                </div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#888' }}>
                    <span>ID: <strong style={{ color: '#fff' }}>{effectiveGameId}</strong></span>
                    <span onClick={() => setShowPin(!showPin)} style={{ cursor: 'pointer' }}>
                        PIN: <strong style={{ color: showPin ? 'var(--accent)' : '#fff' }}>{showPin ? hostPin : '****'}</strong>
                    </span>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>

                {/* Main Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0', overflowY: 'auto' }}>

                    {/* Status Indicator */}
                    {gameState.phase !== 'LOBBY' && (
                        <div style={{ margin: '20px 0', textAlign: 'center', zIndex: 60, position: 'relative' }}>
                            <span style={{
                                background: '#222', padding: '5px 15px', borderRadius: '20px',
                                border: '1px solid #444', color: '#ccc', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px'
                            }}>
                                Phase: <strong style={{ color: 'var(--gold)' }}>{gameState.phase}</strong>
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
                            localIp={window.location.hostname}
                            manifest={manifest}
                            onStart={() => performAction('SET_PHASE', { phase: currentPhaseConfig?.next || 'INTRO' })}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', width: '100%', height: '100%' }}>
                            <PhaseRenderer
                                phaseConfig={currentPhaseConfig}
                                gameData={gameData}
                                gameState={gameState}
                                gameType={gameType}
                                onAction={performAction}
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
                    onAction={performAction}
                    gameId={effectiveGameId}
                    qrSrc={qrSrc}
                    localIp={window.location.hostname}
                />

                {/* Overlay */}
                {isSidebarOpen && (
                    <div
                        onClick={() => setIsSidebarOpen(false)}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 25 }}
                    />
                )}
            </div>
        </div>
    );
}
