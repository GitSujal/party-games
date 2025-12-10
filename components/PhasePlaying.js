import React, { useEffect, useRef } from 'react';

/**
 * PhasePlaying - Investigation phase with suspects and evidence board
 * Data-driven: uses victimName and victimImage from config
 */
export default function PhasePlaying({ suspects, clues = [], revealedClues = [], victimName, victimImage, assetBase }) {
    const cluesEndRef = useRef(null);

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
                    <h3 style={{ color: '#666', marginTop: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Suspects</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '15px'
                    }}>
                        {suspects.map(suspect => (
                            <div key={suspect.player.id} style={{
                                background: '#1a1a1d',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                border: '1px solid #333',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{
                                    height: '100px',
                                    background: suspect.character.image
                                        ? `url("${assetBase || '/game_assets/momo_massacre'}/media/characters/${suspect.character.image}") center/cover no-repeat`
                                        : '#333',
                                    position: 'relative'
                                }}>
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
                            {visibleClues.map((clue) => (
                                <div key={clue.id} style={{
                                    background: '#222', padding: '20px', borderRadius: '5px', borderLeft: '4px solid var(--gold, #ffd700)',
                                    animation: 'slideIn 0.5s ease-out'
                                }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '1.2rem' }}>{clue.name}</h4>
                                    <p style={{ margin: 0, color: '#ccc', lineHeight: '1.5' }}>{clue.content}</p>
                                </div>
                            ))}
                            <div ref={cluesEndRef} />
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
