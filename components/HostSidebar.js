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
    localIp
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
                    <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '10px' }}>
                        <a href={`http://${localIp}:3000/join?gameId=${gameId}`} target="_blank" rel="noreferrer" style={{ color: '#61dafb', wordBreak: 'break-all' }}>
                            http://{localIp}:3000/join?gameId={gameId}
                        </a>
                    </div>
                </div>

                {/* Player List */}
                <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888', marginBottom: '15px' }}>
                        <Users size={16} /> PLAYERS ({players.length})
                    </h4>
                    {players.map(p => (
                        <div key={p.id} style={{ background: '#222', padding: '10px', borderRadius: '5px', marginBottom: '8px', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                                <button
                                    onClick={() => {
                                        const pin = prompt(`Kick ${p.name}? Enter Host PIN:`);
                                        if (pin) onAction('KICK', { playerId: p.id, pin });
                                    }}
                                    style={{ background: 'none', border: '1px solid #d62828', color: '#d62828', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer' }}
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
                    ))}
                </div>

                {/* Clues */}
                <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888', marginBottom: '15px' }}>
                        <Search size={16} /> EVIDENCE
                    </h4>
                    {clues.map(clue => (
                        <div key={clue.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '8px', background: revealedClues.includes(clue.id) ? '#222' : 'transparent', borderBottom: '1px solid #333' }}>
                            <span style={{ fontSize: '0.9rem', color: revealedClues.includes(clue.id) ? '#666' : '#fff' }}>{clue.name}</span>
                            {revealedClues.includes(clue.id) ? (
                                <span style={{ fontSize: '0.8rem', color: '#4caf50' }}>✓</span>
                            ) : (
                                <button
                                    onClick={() => onAction('REVEAL_CLUE', { clueId: clue.id })}
                                    style={{ background: '#333', border: '1px solid #666', color: '#fff', fontSize: '0.8rem', padding: '4px 8px', borderRadius: '10px', cursor: 'pointer' }}
                                >
                                    Reveal
                                </button>
                            )}
                        </div>
                    ))}
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
