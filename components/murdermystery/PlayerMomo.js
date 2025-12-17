import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import PlayerHeader from './PlayerHeader';
import PlayerTabNav from './PlayerTabNav';
import PlayerTabRole from './PlayerTabRole';
import PlayerTabSecret from './PlayerTabSecret';
import PlayerTabClues from './PlayerTabClues';
import HowToPlayModal from './HowToPlayModal';

export default function PlayerMomo({
    gameState,
    player,
    gameData,
    assetBase
}) {
    const { characters, clues } = gameData;
    const [activeTab, setActiveTab] = useState('character');
    const [showHowToPlay, setShowHowToPlay] = useState(false);

    const character = characters.find(c => c.id === player.characterId);

    // Filter clues
    const revealedClues = clues.filter(c => {
        const isRevealed = (gameState.revealedClues || []).includes(c.id);
        if (!isRevealed) return false;
        if (!c.revealed_to) return true;
        return c.revealed_to === "all" || c.revealed_to === character?.name;
    });

    return (
        <div className="container" style={{ maxWidth: '600px' }}>
            <PlayerHeader
                character={character}
                playerName={player.name}
                avatarUrl={player.avatarUrl}
                originalImageUrl={player.originalImageUrl}
            />

            {/* How to Play Button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <button
                    onClick={() => setShowHowToPlay(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 20px',
                        background: 'var(--accent, #d62828)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        transition: 'transform 0.2s',
                        boxShadow: '0 2px 8px rgba(214, 40, 40, 0.3)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <HelpCircle size={18} />
                    How to Play
                </button>
            </div>

            <PlayerTabNav activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'character' && <PlayerTabRole
                character={character}
                assetBase={assetBase}
                avatarUrl={player.avatarUrl}
                originalImageUrl={player.originalImageUrl}
            />}
            {activeTab === 'secret' && <PlayerTabSecret character={character} assetBase={assetBase} />}
            {activeTab === 'clues' && <PlayerTabClues revealedClues={revealedClues} />}

            {/* How to Play Modal - defaults to player tab */}
            <HowToPlayModal
                isOpen={showHowToPlay}
                onClose={() => setShowHowToPlay(false)}
                defaultTab="players"
            />
        </div>
    );
}
