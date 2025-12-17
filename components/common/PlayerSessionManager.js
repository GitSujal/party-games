import React, { useState, useEffect } from 'react';
import { loadGameData } from '../../lib/gameLoader';
import * as api from '../../lib/apiClient';

// Components
import PlayerWaiting from './PlayerWaiting';
import PlayerMomo from '../murdermystery/PlayerMomo';
import PlayerImposter from '../imposter/PlayerImposter';

export default function PlayerSessionManager({ playerId }) {
    // Game Data (loaded from static assets)
    const [gameData, setGameData] = useState(null);
    const [gameType, setGameType] = useState(null);

    // Game State (from API)
    const [gameState, setGameState] = useState(null);
    const [error, setError] = useState(null);

    // Poll game state from API
    useEffect(() => {
        if (!playerId) return;

        let interval;
        let errorCount = 0;
        const baseInterval = 5000;
        const maxInterval = 10000;
        const maxErrors = 5;

        const fetchState = async () => {
            try {
                const storedGameId = sessionStorage.getItem('gameId') || localStorage.getItem('gameId');
                if (!storedGameId) {
                    setError('Game ID not found. Please rejoin the game.');
                    return;
                }

                const state = await api.getGameState(storedGameId);
                setGameState(state);
                setError(null);
                errorCount = 0;

                if (state.gameType && !gameType) {
                    setGameType(state.gameType);
                }
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
    }, [playerId, gameType]);

    // Load game data
    useEffect(() => {
        if (gameType) {
            loadGameData(gameType)
                .then(setGameData)
                .catch(err => setError(`Failed to load game data: ${err.message}`));
        }
    }, [gameType]);

    if (error) return <div className="container" style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>{error}</div>;
    if (!playerId) return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
    if (!gameState) return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Connecting to game...</div>;
    if (!gameData) return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading game data...</div>;

    const player = gameState.players?.find(p => p.id === playerId);

    if (!player) {
        return <div className="container">Player not found or game reset. <a href="/">Go Home</a></div>;
    }

    if (gameState.phase === 'LOBBY') {
        return <PlayerWaiting playerName={player.name} />;
    }

    if (gameType === 'imposter') {
        return <PlayerImposter gameState={gameState} player={player} onAction={() => { }} />;
    }

    // Default to Momo
    const assetBase = `/game_assets/${gameType}`;
    return (
        <PlayerMomo
            gameState={gameState}
            player={player}
            gameData={gameData}
            assetBase={assetBase}
        />
    );
}
