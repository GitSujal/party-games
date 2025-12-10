import React from 'react';

export default function PhaseIntroductions({
    character,
    suspectName,
    suspectIndex,
    totalSuspects,
    onPrev,
    onNext,
    onBeginInvestigation
}) {
    if (!character) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
            background: '#111',
            display: 'flex', flexDirection: 'column',
            color: '#fff'
        }}>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left Side: Image */}
                <div style={{ flex: 1, position: 'relative', background: '#000' }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: `url("/game_assets/characters/${character.image}") center/contain no-repeat`,
                        opacity: 0.8
                    }} />
                </div>

                {/* Right Side: Info */}
                <div style={{ flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>Suspect #{suspectIndex + 1}</h3>
                    <h1 style={{ fontSize: '3.5rem', margin: '0 0 30px 0', color: '#61dafb' }}>{character.name}</h1>

                    <div style={{
                        fontSize: '1.5rem', lineHeight: '1.8', color: '#ddd',
                        background: '#222', padding: '30px', borderRadius: '15px', borderLeft: '4px solid #61dafb'
                    }}>
                        <div dangerouslySetInnerHTML={{ __html: character.about.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </div>

                    <div style={{ marginTop: '20px', color: '#888', fontStyle: 'italic' }}>
                        Played by: <strong style={{ color: '#fff' }}>{suspectName}</strong>
                    </div>

                    <p style={{ marginTop: '40px', fontSize: '1.2rem', color: 'var(--gold)' }}>
                        📢 Please read your introduction aloud to the group.
                    </p>
                </div>
            </div>

            {/* Navigation Bar */}
            <div style={{
                height: '80px', background: '#1a1a1d', borderTop: '1px solid #333',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px'
            }}>
                <button
                    onClick={onPrev}
                    disabled={suspectIndex === 0}
                    style={{ background: 'transparent', border: '1px solid #444', color: suspectIndex === 0 ? '#444' : '#fff', padding: '10px 20px', borderRadius: '5px', cursor: suspectIndex === 0 ? 'default' : 'pointer' }}
                >
                    &larr; Previous
                </button>

                <div style={{ color: '#666' }}>
                    {suspectIndex + 1} of {totalSuspects}
                </div>

                {suspectIndex < totalSuspects - 1 ? (
                    <button
                        onClick={onNext}
                        className="btn"
                        style={{ padding: '10px 30px', fontSize: '1.2rem' }}
                    >
                        Next Suspect &rarr;
                    </button>
                ) : (
                    <button
                        onClick={onBeginInvestigation}
                        className="btn"
                        style={{ padding: '10px 30px', fontSize: '1.2rem', background: '#d62828' }}
                    >
                        Begin Investigation &rarr;
                    </button>
                )}
            </div>
        </div>
    );
}
