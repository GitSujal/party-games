import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useRouter } from 'next/router';

// Lib
import { loadGameData } from '../../lib/gameLoader';
import * as api from '../../lib/apiClient';

// Components
import HostImposter from '../imposter/HostImposter';
import HostMomo from '../murdermystery/HostMomo';

export default function HostSessionManager({ gameId }) {
    const router = useRouter();

    // Game Data (loaded from static assets)
    const [gameData, setGameData] = useState(null);
    const [gameType, setGameType] = useState(null); // Start as null, load from sessionStorage

    // Game State (from API)
    const [gameState, setGameState] = useState(null);
    const [error, setError] = useState(null);

    // UI State
    const [qrSrc, setQrSrc] = useState('');
    const [joinUrl, setJoinUrl] = useState('');
    const [hostPin, setHostPin] = useState('');

    // Load host PIN and game type from sessionStorage only (never from URL)
    useEffect(() => {
        const storedPin = sessionStorage.getItem('hostPin');
        const storedGameType = sessionStorage.getItem('gameType');
        console.log('[HostSessionManager] SessionStorage read - gameType:', storedGameType, 'hostPin:', storedPin ? 'SET' : 'NOT SET');

        if (storedPin) setHostPin(storedPin);
        if (storedGameType) {
            console.log('[HostSessionManager] Setting gameType from sessionStorage:', storedGameType);
            setGameType(storedGameType);
        } else {
            console.warn('[HostSessionManager] No gameType in sessionStorage, defaulting to momo_massacre');
            setGameType('momo_massacre');
        }

        // Security: Redirect to home if no PIN found
        if (!storedPin && gameId) {
            router.push('/');
        }
    }, [gameId, router]);

    // Load game data from static assets
    useEffect(() => {
        if (gameType) {
            console.log('[HostSessionManager] Loading game data for:', gameType);
            loadGameData(gameType)
                .then(data => {
                    console.log('[HostSessionManager] Game data loaded:', data.manifest?.name, 'words:', data.words?.length);
                    console.log('[HostSessionManager] Full game data:', data);
                    console.log('[HostSessionManager] Words array:', data.words);
                    setGameData(data);
                })
                .catch(err => {
                    console.error('[HostSessionManager] Error loading game data:', err);
                    setError(`Failed to load game data: ${err.message}`);
                });
        }
    }, [gameType]);

    // Poll game state from API
    useEffect(() => {
        if (!gameId) return;

        let interval;
        let errorCount = 0;
        const baseInterval = 2000;
        const maxInterval = 10000;
        const maxErrors = 5;

        const fetchState = async () => {
            try {
                const state = await api.getGameState(gameId);
                setGameState(state);
                if (state.gameType && state.gameType !== gameType) {
                    setGameType(state.gameType);
                    sessionStorage.setItem('gameType', state.gameType);
                }
                setError(null);
                errorCount = 0;
            } catch (err) {
                errorCount++;
                if (errorCount >= maxErrors) {
                    setError(`Connection failed: ${err.message}`);
                    clearInterval(interval);
                }
            }
        };

        const getInterval = () => {
            if (errorCount === 0) return baseInterval;
            return Math.min(baseInterval * Math.pow(2, errorCount - 1), maxInterval);
        };

        fetchState();

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
    }, [gameId]); // Removed gameType from dep array to avoid re-fetch loops if it changes quickly

    // Generate QR Code
    useEffect(() => {
        if (gameId) {
            const url = `${window.location.origin}/join?gameId=${gameId}`;
            setJoinUrl(url);
            QRCode.toDataURL(url, { margin: 1, width: 400 }).then(setQrSrc);
        }
    }, [gameId]);

    // Admin action wrapper
    const performAction = async (subAction, payload = {}) => {
        try {
            if (subAction === 'SET_PHASE') {
                await api.setPhase(gameId, hostPin, payload.phase);
            } else if (subAction === 'ASSIGN_CHARACTER') {
                const character = gameData?.characters?.find(c => c.id === payload.characterId);
                const characterInfo = character ? {
                    name: character.name,
                    role: character.role,
                    description: character.description || character.about
                } : null;
                await api.assignCharacter(gameId, hostPin, payload.playerId, payload.characterId, characterInfo);
            } else if (subAction === 'REVEAL_CLUE') {
                await api.revealClue(gameId, hostPin, payload.clueId);
            } else if (subAction === 'KICK') {
                await api.kickPlayer(gameId, hostPin, payload.playerId);
            } else if (subAction === 'RESET') {
                await api.resetGame(gameId, hostPin);
            } else if (subAction === 'START_ROUND_IMPOSTER') {
                await api.adminAction(gameId, hostPin, 'START_ROUND_IMPOSTER', payload);
            } else if (subAction === 'CHANGE_WORD') {
                await api.changeWord(gameId, hostPin, payload.newWord);
            } else if (subAction === 'RESTART_IMPOSTER') {
                // Pick a random word and restart
                const words = gameData?.words || [];
                if (words.length === 0) {
                    alert('No words available for restart');
                    return;
                }
                const randomWord = words[Math.floor(Math.random() * words.length)];
                await api.restartImposterGame(gameId, hostPin, randomWord);
            } else if (subAction === 'FINALIZE_VOTING') {
                await api.finalizeVoting(gameId, hostPin);
            }
            const state = await api.getGameState(gameId);
            setGameState(state);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    if (error) return <div style={{ color: 'red', textAlign: 'center', marginTop: '20px' }}>Error: {error}</div>;
    if (!gameData) return <div style={{ textAlign: 'center', marginTop: '50px', color: '#888' }}>Loading game data...</div>;
    if (!gameState) return <div style={{ textAlign: 'center', marginTop: '50px', color: '#888' }}>Connecting to game...</div>;

    const connectedPlayers = gameState.players?.filter(p => !p.isHost) || [];
    console.log('[HostSessionManager] Rendering with gameType:', gameType, 'manifest:', gameData.manifest?.name);

    if (gameType === 'imposter') {
        return (
            <HostImposter
                gameData={gameData}
                gameState={gameState}
                onAction={performAction}
                joinUrl={joinUrl}
                qrSrc={qrSrc}
                hostPin={hostPin}
                connectedPlayers={connectedPlayers}
            />
        );
    }

    return (
        <HostMomo
            gameData={gameData}
            gameState={gameState}
            onAction={performAction}
            joinUrl={joinUrl}
            qrSrc={qrSrc}
            hostPin={hostPin}
            connectedPlayers={connectedPlayers}
        />
    );
}
