import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

// Lib
import { loadGameRegistry } from '../lib/gameLoader';
import * as api from '../lib/apiClient';

// Components
import SEOHead from '../components/SEOHead';
import LandingCard from '../components/LandingCard';
import HostSetupModal from '../components/HostSetupModal';
import GuideModal from '../components/GuideModal';

export default function Home() {
    const router = useRouter();
    const [showGuide, setShowGuide] = useState(null);
    const [showHostSetup, setShowHostSetup] = useState(false);
    const [games, setGames] = useState([]);
    const [selectedGame, setSelectedGame] = useState('momo_massacre');

    // Load available games
    useEffect(() => {
        loadGameRegistry()
            .then(setGames)
            .catch(console.error);
    }, []);

    const handleCreateSession = async (minPlayers) => {
        const data = await api.createSession(selectedGame, minPlayers, 'HOST');

        if (data.gameId && data.hostPin) {
            // Store sensitive data in sessionStorage (active session)
            sessionStorage.setItem('playerId', data.player.id);
            sessionStorage.setItem('hostPin', data.hostPin);
            sessionStorage.setItem('gameId', data.gameId);
            sessionStorage.setItem('gameType', selectedGame);

            // Persist for recovery in localStorage
            localStorage.setItem('recentSession', JSON.stringify({
                gameId: data.gameId,
                hostPin: data.hostPin,
                gameType: selectedGame,
                timestamp: Date.now()
            }));

            router.push(`/host?gameId=${data.gameId}`);
        } else {
            throw new Error("Invalid response from server");
        }
    };

    const handleResumeSession = async (gameId, hostPin) => {
        // Verify credentials with backend
        const data = await api.verifyHost(gameId, hostPin);

        if (data.success) {
            // Restore session
            sessionStorage.setItem('hostPin', hostPin);
            sessionStorage.setItem('gameId', gameId);
            sessionStorage.setItem('gameType', selectedGame); // Assume same game type or fetch if needed
            router.push(`/host?gameId=${gameId}`);
        } else {
            throw new Error("Invalid Game ID or PIN");
        }
    };

    const containerStyle = {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#fff',
        fontFamily: "'Courier New', Courier, monospace",
        padding: '20px'
    };

    return (
        <div style={containerStyle}>
            <SEOHead />

            <LandingCard
                onJoinGame={() => router.push('/join')}
                onHostGame={() => setShowHostSetup(true)}
                onShowGuide={setShowGuide}
            />

            <HostSetupModal
                isOpen={showHostSetup}
                onClose={() => setShowHostSetup(false)}
                onCreateSession={handleCreateSession}
                onResumeSession={handleResumeSession}
                games={games}
                selectedGame={selectedGame}
                onSelectGame={setSelectedGame}
            />

            <GuideModal
                isOpen={!!showGuide}
                onClose={() => setShowGuide(null)}
                guideType={showGuide}
            />
        </div>
    );
}
