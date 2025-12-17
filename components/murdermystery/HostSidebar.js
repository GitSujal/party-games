import React from 'react';
import { X, Users, Search, Settings, RefreshCw } from 'lucide-react';

export default function HostSidebar({
    isOpen,
    onClose,
    players,
    characters,
    clues,
    revealedClues,
    onAction,
    gameId,
    qrSrc,
    joinUrl
}) {
    const unassignedCharacters = characters.filter(c =>
        !players.find(p => p.characterId === c.id)
    );

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: '320px', background: '#1a1a1d', borderRight: '1px solid #333',
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease',
            zIndex: 30, display: 'flex', flexDirection: 'column',
            boxShadow: isOpen ? '5px 0 15px rgba(0,0,0,0.5)' : 'none'
        }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#fff' }}>Game Controls</h3>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>
                    <X size={24} />
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

                {/* Sidebar QR Code */}
                <div style={{ marginBottom: '30px', textAlign: 'center', background: '#222', padding: '15px', borderRadius: '10px' }}>
                    {qrSrc && (
                        <img src={qrSrc} alt="Join Game QR" style={{ width: '100%', maxWidth: '150px', height: 'auto', display: 'block', margin: '0 auto 10px' }} />
                    )}
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Scan to Join</div>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: '#fff', marginTop: '5px' }}>{gameId}</div>
                    {joinUrl && (
                        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '10px' }}>
                            <a href={joinUrl} target="_blank" rel="noreferrer" style={{ color: '#61dafb', wordBreak: 'break-all' }}>
                                {joinUrl}
                            </a>
                        </div>
                    )}
                </div>

                {/* Player List */}
                <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888', marginBottom: '15px' }}>
                        <Users size={16} /> PLAYERS ({players.length})
                    </h4>
                    {players.map(p => {
                        // Debug logging
                        console.log(`[HostSidebar] Player ${p.name}:`, {
                            avatarUrl: p.avatarUrl,
                            originalImageUrl: p.originalImageUrl,
                            isGenerating: p.avatarUrl === 'GENERATING'
                        });

                        return (
                            <div key={p.id} style={{ background: '#222', padding: '10px', borderRadius: '5px', marginBottom: '8px', border: '1px solid #333', display: 'flex', gap: '10px' }}>
                                {/* Avatar */}
                                {(() => {
                                    // Determine which image to show
                                    const isGenerating = p.avatarUrl === 'GENERATING';
                                    const displayUrl = isGenerating ? p.originalImageUrl : p.avatarUrl;
                                    const hasBorder = isGenerating ? '2px solid #ffaa00' : '2px solid var(--gold, #ffd700)';

                                    if (displayUrl) {
                                        return (
                                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', border: hasBorder, flexShrink: 0, position: 'relative' }}>
                                                <img
                                                    src={displayUrl}
                                                    alt={p.name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => console.error('Image load error for', p.name, e)}
                                                    onLoad={() => console.log('Image loaded successfully for', p.name)}
                                                />
                                                {isGenerating && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '-2px',
                                                        right: '-2px',
                                                        background: '#ffaa00',
                                                        borderRadius: '50%',
                                                        width: '20px',
                                                        height: '20px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid #222',
                                                        animation: 'pulse 1.5s infinite'
                                                    }}>
                                                        <span style={{ fontSize: '0.7rem' }}>⏳</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#444', border: '2px solid #666', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                                👤
                                            </div>
                                        );
                                    }
                                })()}
                            {/* Player Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                    <button
                                        onClick={() => {
                                            const pin = prompt(`Kick ${p.name}? Enter Host PIN:`);
                                            if (pin) onAction('KICK', { playerId: p.id, pin });
                                        }}
                                        style={{ background: 'none', border: '1px solid #d62828', color: '#d62828', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', flexShrink: 0 }}
                                    >
                                        KICK
                                    </button>
                                </div>
                                {/* Assignment */}
                                {p.characterId ? (
                                    <div style={{ fontSize: '0.8rem', color: '#4caf50' }}>
                                        {characters.find(c => c.id === p.characterId)?.name}
                                    </div>
                                ) : (
                                    <select
                                        onChange={(e) => onAction('ASSIGN_CHARACTER', { playerId: p.id, characterId: e.target.value })}
                                        style={{ width: '100%', padding: '5px', background: '#333', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '0.8rem' }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Assign Character</option>
                                        {unassignedCharacters.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                        );
                    })}
                </div>

                {/* Clues */}
                <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888', marginBottom: '15px' }}>
                        <Search size={16} /> EVIDENCE
                    </h4>
                    {clues.map(clue => {
                        const isRevealed = revealedClues.includes(clue.id);
                        const isPublic = !clue.revealed_to || clue.revealed_to === "all";
                        const targetAudience = isPublic ? "All players" : clue.revealed_to;

                        return (
                            <div key={clue.id} style={{
                                marginBottom: '12px',
                                padding: '10px',
                                background: isRevealed ? '#222' : '#1a1a1a',
                                borderRadius: '5px',
                                border: `1px solid ${isRevealed ? '#333' : '#444'}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', color: isRevealed ? '#666' : '#fff', marginBottom: '4px' }}>
                                            {clue.name}
                                        </div>
                                        <div style={{
                                            fontSize: '0.7rem',
                                            color: isPublic ? '#61dafb' : '#ffd700',
                                            fontStyle: 'italic',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            {isPublic ? '👥' : '👤'} {targetAudience}
                                        </div>
                                    </div>
                                    {isRevealed ? (
                                        <span style={{ fontSize: '0.8rem', color: '#4caf50', marginLeft: '10px' }}>✓</span>
                                    ) : (
                                        <button
                                            onClick={() => onAction('REVEAL_CLUE', { clueId: clue.id })}
                                            style={{
                                                background: '#333',
                                                border: '1px solid #666',
                                                color: '#fff',
                                                fontSize: '0.75rem',
                                                padding: '4px 10px',
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                marginLeft: '10px',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Reveal
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Admin */}
                <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888', marginBottom: '15px' }}>
                        <Settings size={16} /> ADMIN
                    </h4>
                    <button
                        onClick={() => {
                            const pin = prompt("RESET GAME? This is destructive.\nEnter Host PIN to confirm:");
                            if (pin) onAction('RESET', { pin });
                        }}
                        style={{ width: '100%', padding: '10px', background: '#d62828', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                        <RefreshCw size={16} /> Reset Game Session
                    </button>
                </div>
            </div>
        </div>
    );
}
