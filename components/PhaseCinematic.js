import React from 'react';
import { Play } from 'lucide-react';

/**
 * PhaseCinematic - Data-driven cinematic intro phase
 * Displays background image, audio, and karaoke-style text
 */
export default function PhaseCinematic({
    config,
    storyline,
    assetBase,
    introWords,
    activeWordIndex,
    onAudioTimeUpdate,
    onAudioLoadedMetadata,
    onNext
}) {
    // Sliding Window Logic
    const WINDOW_SIZE = 24;
    const start = Math.max(0, activeWordIndex - 8);
    const end = Math.min(introWords.length, start + WINDOW_SIZE);
    const visibleWords = introWords.slice(start, end);

    const backgroundUrl = config.background ? `${assetBase}/${config.background}` : null;
    const audioUrl = config.audio ? `${assetBase}/${config.audio}` : null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
            background: backgroundUrl ? `url("${backgroundUrl}") center/cover no-repeat` : '#111',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            color: '#fff'
        }}>
            <div style={{
                background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 70%, transparent 100%)',
                padding: '40px', paddingTop: '100px', textAlign: 'center'
            }}>
                <h1 style={{ fontSize: '3rem', margin: '0 0 20px 0', color: '#61dafb', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                    {config.title || 'The Setting'}
                </h1>

                <div style={{ maxHeight: '200px', overflow: 'hidden', fontSize: '1.8rem', lineHeight: '1.8', marginBottom: '30px', padding: '0 40px', transition: 'all 0.3s ease' }}>
                    {start > 0 && <span style={{ color: '#444' }}>... </span>}
                    {visibleWords.map((word, index) => {
                        const actualIndex = start + index;
                        return (
                            <span key={actualIndex} style={{
                                color: actualIndex === activeWordIndex ? '#61dafb' : actualIndex < activeWordIndex ? '#fff' : '#666',
                                fontWeight: actualIndex === activeWordIndex ? 'bold' : 'normal',
                                textShadow: actualIndex === activeWordIndex ? '0 0 15px rgba(97, 218, 251, 0.8)' : 'none',
                                transition: 'all 0.2s',
                                marginRight: '8px',
                                display: 'inline-block'
                            }}>
                                {word}
                            </span>
                        );
                    })}
                    {end < introWords.length && <span style={{ color: '#444' }}> ...</span>}
                </div>

                {audioUrl && (
                    <audio
                        id="introAudio"
                        src={audioUrl}
                        controls
                        style={{ width: '100%', maxWidth: '400px', marginBottom: '20px' }}
                        onTimeUpdate={onAudioTimeUpdate}
                        onLoadedMetadata={onAudioLoadedMetadata}
                    />
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    {audioUrl && (
                        <button
                            onClick={() => {
                                const audio = document.getElementById('introAudio');
                                if (audio) audio.play().catch(e => alert("Click again to play - browser blocked autoplay"));
                            }}
                            className="btn"
                            style={{ fontSize: '1.2rem', padding: '10px 30px' }}
                        >
                            <Play size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} /> Play Audio
                        </button>
                    )}

                    <button
                        onClick={onNext}
                        style={{ background: 'transparent', border: '1px solid #666', color: '#ccc', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        Next &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
}
