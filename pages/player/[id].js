import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { loadGameData } from '../../lib/gameLoader';
import * as api from '../../lib/apiClient';

// Components
import PlayerWaiting from '../../components/PlayerWaiting';
import PlayerIntro from '../../components/PlayerIntro';
import PlayerHeader from '../../components/PlayerHeader';
import PlayerTabNav from '../../components/PlayerTabNav';
import PlayerTabRole from '../../components/PlayerTabRole';
import PlayerTabSecret from '../../components/PlayerTabSecret';
import PlayerTabClues from '../../components/PlayerTabClues';

export default function Player() {
    const router = useRouter();
    const { id } = router.query;

    // Game Data (loaded from static assets)
    const [gameData, setGameData] = useState(null);
    const [gameType, setGameType] = useState(null);

    // Game State (from API)
    const [gameState, setGameState] = useState(null);
    const [error, setError] = useState(null);

    const [activeTab, setActiveTab] = useState('character');

    // Poll game state from API
    useEffect(() => {
        if (!id) return;

        const fetchState = async () => {
            try {
                // Get player's game ID from localStorage or query params
                const storedGameId = localStorage.getItem('gameId');
                if (!storedGameId) {
                    setError('Game ID not found. Please rejoin the game.');
                    return;
                }

                const state = await api.getGameState(storedGameId);
                setGameState(state);

                // Load game data if not already loaded
                if (state.gameType && !gameType) {
                    setGameType(state.gameType);
                }
            } catch (err) {
                setError(err.message);
            }
        };

        fetchState();
        const interval = setInterval(fetchState, 1000);
        return () => clearInterval(interval);
    }, [id, gameType]);

    // Load game data when game type is known
    useEffect(() => {
        if (gameType) {
            loadGameData(gameType)
                .then(setGameData)
                .catch(err => setError(`Failed to load game data: ${err.message}`));
        }
    }, [gameType]);

    // Loading/Error states
    if (error) return <div className="container" style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>{error}</div>;
    if (!id) return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
    if (!gameState) return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Connecting to game...</div>;
    if (!gameData) return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading game data...</div>;

    const { manifest, storyline, characters, clues } = gameData;
    const player = gameState.players?.find(p => p.id === id);

    if (!player) {
        return <div className="container">Player not found or game reset. <a href="/">Go Home</a></div>;
    }

    const character = characters.find(c => c.id === player.characterId);
    const revealedClues = clues.filter(c => (gameState.revealedClues || []).includes(c.id));
    const assetBase = `/game_assets/${gameType}`;

    // Waiting State
    if (gameState.phase === 'LOBBY' || !character) {
        return <PlayerWaiting playerName={player.name} />;
    }

    // Intro State (handle early phases as passive viewing)
    if (['INTRO', 'TOAST', 'MURDER', 'INTRODUCTIONS'].includes(gameState.phase)) {
        return <PlayerIntro storyline={storyline} />;
    }

    // Playing / Finished State (Full UI)
    return (
        <div className="container" style={{ maxWidth: '600px' }}>
            <PlayerHeader character={character} playerName={player.name} />
            <PlayerTabNav activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'character' && <PlayerTabRole character={character} assetBase={assetBase} />}
            {activeTab === 'secret' && <PlayerTabSecret character={character} assetBase={assetBase} />}
            {activeTab === 'clues' && <PlayerTabClues revealedClues={revealedClues} />}
        </div>
    );
}
