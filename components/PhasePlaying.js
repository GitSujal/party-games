import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * PhasePlaying - Investigation phase with suspects and evidence board
 * Data-driven: uses victimName and victimImage from config
 */
export default function PhasePlaying({ suspects, clues = [], revealedClues = [], victimName, victimImage, assetBase }) {
    const cluesEndRef = useRef(null);
    const [expandedSuspect, setExpandedSuspect] = useState(null);

    // Auto-scroll to new clues
    useEffect(() => {
        if (cluesEndRef.current) {
            cluesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [revealedClues]);

    // Filter relevant clues
    const visibleClues = clues.filter(c => revealedClues.includes(c.id) || revealedClues.includes(String(c.id)));

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Header: Victim Status */}
            <div style={{ textAlign: 'center', padding: '20px 0', borderBottom: '1px solid #333', background: '#0a0a0a', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden',
                        border: '3px solid #d62828', position: 'relative'
                    }}>
                        {victimImage && (
                            <img src={victimImage} alt={victimName || 'Victim'} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%)' }} />
                        )}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(214, 40, 40, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff', transform: 'rotate(-15deg)', border: '1px solid #fff', padding: '0 5px' }}>DEAD</span>
                        </div>
                    </div>
                    <div>
                        <h2 style={{ color: '#d62828', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.8rem', margin: 0 }}>
                            {victimName || 'Victim'} is Dead
                        </h2>
                        <p style={{ color: '#888', margin: '5px 0 0', fontSize: '1rem' }}>Investigation in progress...</p>
                    </div>
                </div>
            </div>

            {/* Split Content */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Left: Suspects Grid */}
                <div style={{ flex: 3, padding: '20px', overflowY: 'auto', borderRight: '1px solid #333' }}>
                    <h3 style={{ color: '#666', marginTop: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Suspects (Click to Inspect)</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '15px'
                    }}>
                        {suspects.map(suspect => (
                            <div
                                key={suspect.player.id}
                                onClick={() => setExpandedSuspect(suspect)}
                                style={{
                                    background: '#1a1a1d',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    border: '1px solid #333',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    ':hover': { transform: 'scale(1.02)' }
                                }}
                            >
                                <div style={{
                                    height: '200px',
                                    position: 'relative',
                                    background: '#000',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {suspect.player.avatarUrl ? (
                                        <img
                                            src={suspect.player.avatarUrl}
                                            alt={suspect.character.name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    ) : suspect.character.image ? (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            background: `url("${assetBase || '/game_assets/momo_massacre'}/media/characters/${suspect.character.image}") center/cover no-repeat`
                                        }} />
                                    ) : (
                                        <div style={{ fontSize: '3rem' }}>👤</div>
                                    )}
                                    <div style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                                        padding: '5px 10px'
                                    }}>
                                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#61dafb' }}>{suspect.character.name}</h3>
                                    </div>
                                </div>
                                <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#ccc', flex: 1 }}>
                                        {suspect.character.description || "A mysterious guest."}
                                    </p>
                                    <div style={{ fontSize: '0.7rem', color: '#666', textAlign: 'right' }}>
                                        {suspect.player.name}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Evidence Board */}
                <div style={{ flex: 2, background: '#111', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ color: 'var(--gold, #ffd700)', marginTop: 0, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Evidence Board</h3>

                    {visibleClues.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontStyle: 'italic' }}>
                            No clues revealed yet...
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {visibleClues.map((clue) => {
                                const isPublic = !clue.revealed_to || clue.revealed_to === "all";
                                const targetAudience = isPublic ? "All players" : clue.revealed_to;

                                // Find which player has the character this clue is for
                                const targetPlayer = !isPublic && suspects.find(s => s.character.name === clue.revealed_to);

                                return (
                                    <div key={clue.id} style={{
                                        background: '#222', padding: '20px', borderRadius: '5px', borderLeft: '4px solid var(--gold, #ffd700)',
                                        animation: 'slideIn 0.5s ease-out'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <h4 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>{clue.name}</h4>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                color: isPublic ? '#61dafb' : '#ffd700',
                                                background: 'rgba(0,0,0,0.3)',
                                                padding: '4px 8px',
                                                borderRadius: '10px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {isPublic ? '👥' : '👤'} {targetAudience}
                                            </span>
                                        </div>
                                        {isPublic ? (
                                            <p style={{ margin: 0, color: '#ccc', lineHeight: '1.5' }}>{clue.content}</p>
                                        ) : (
                                            <p style={{ margin: 0, color: '#888', fontStyle: 'italic', lineHeight: '1.5' }}>
                                                Private clue revealed to {targetPlayer ? targetPlayer.player.name : clue.revealed_to}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={cluesEndRef} />
                        </div>
                    )}
                </div>

            </div>

            {/* Expanded Modal */}
            {expandedSuspect && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.95)', zIndex: 100,
                    display: 'flex', flexDirection: 'column',
                    padding: '20px'
                }}>
                    <button
                        onClick={() => setExpandedSuspect(null)}
                        style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 101 }}
                    >
                        <X size={40} />
                    </button>

                    <div style={{ flex: 1, display: 'flex', gap: '40px', maxWidth: '1200px', margin: '0 auto', alignItems: 'center', width: '100%' }}>
                        {/* Use Avatar or Character Image */}
                        <div style={{ flex: 1, height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {expandedSuspect.player.avatarUrl ? (
                                <img src={expandedSuspect.player.avatarUrl} alt={expandedSuspect.character.name} style={{ maxHeight: '100%', maxWidth: '100%', borderRadius: '10px', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }} />
                            ) : expandedSuspect.character.image ? (
                                <img src={`${assetBase || '/game_assets/momo_massacre'}/media/characters/${expandedSuspect.character.image}`} alt={expandedSuspect.character.name} style={{ maxHeight: '100%', maxWidth: '100%', borderRadius: '10px' }} />
                            ) : (
                                <div style={{ fontSize: '10rem' }}>👤</div>
                            )}
                        </div>

                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: '3rem', color: '#61dafb', marginBottom: '10px' }}>
                                {expandedSuspect.character.name}
                            </h2>
                            <h3 style={{ fontSize: '1.5rem', color: '#888', marginBottom: '30px' }}>
                                Played by {expandedSuspect.player.name}
                            </h3>
                            <div style={{ fontSize: '1.4rem', lineHeight: '1.6', color: '#ccc', background: '#222', padding: '30px', borderRadius: '10px', borderLeft: '4px solid #61dafb' }}>
                                {expandedSuspect.character.description}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
