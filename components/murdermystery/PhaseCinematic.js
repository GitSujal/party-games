import React from 'react';
import { Play } from 'lucide-react';

/**
 * PhaseCinematic - Data-driven cinematic intro phase
 * Displays background image, audio, and karaoke-style text
 */
export default function PhaseCinematic({
    config,
    assetBase,
    onAudioTimeUpdate,
    onAudioLoadedMetadata,
    onNext
}) {
    const backgroundUrl = config.background ? `${assetBase}/${config.background}` : null;
    const audioUrl = config.audio ? `${assetBase}/${config.audio}?v=1` : null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
            background: backgroundUrl ? `url("${backgroundUrl}") center/cover no-repeat` : '#111',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            color: '#fff'
        }}>
            <div style={{
                background: 'rgba(0,0,0,0.6)',
                padding: '60px', borderRadius: '20px', textAlign: 'center',
                backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h1 style={{ fontSize: '4rem', margin: '0 0 40px 0', color: '#61dafb', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                    {config.title || 'The Setting'}
                </h1>

                {audioUrl && (
                    <audio
                        id="introAudio"
                        src={audioUrl}
                        controls
                        autoPlay
                        style={{ width: '100%', maxWidth: '400px', marginBottom: '30px' }}
                        onTimeUpdate={onAudioTimeUpdate}
                        onLoadedMetadata={onAudioLoadedMetadata}
                    />
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    {audioUrl && (
                        <button
                            onClick={() => {
                                const audio = document.getElementById('introAudio');
                                if (audio) audio.play().catch(e => console.log("Audio play blocked:", e));
                            }}
                            className="btn"
                            style={{ fontSize: '1.2rem', padding: '15px 40px' }}
                        >
                            <Play size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} /> Play Audio
                        </button>
                    )}

                    <button
                        onClick={onNext}
                        style={{ background: 'transparent', border: '1px solid #666', color: '#ccc', padding: '15px 30px', borderRadius: '5px', cursor: 'pointer', fontSize: '1.1rem' }}
                    >
                        Next Phase &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
}
