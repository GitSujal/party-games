import React from 'react';
import { SkipForward, Play } from 'lucide-react';

/**
 * PhaseToast - Data-driven toast phase
 * Reads step config from manifest for flexibility
 */
export default function PhaseToast({ config, storyline, assetBase, step, onSetStep, onNext }) {
    const currentStep = config.steps?.find(s => s.id === step) || config.steps?.[0];
    const stepIndex = config.steps?.findIndex(s => s.id === step) || 0;
    const isLastStep = stepIndex >= (config.steps?.length || 1) - 1;

    const backgroundImage = step === 'INTRO'
        ? (config.victimImage ? `${assetBase}/${config.victimImage}` : null)
        : (config.toastImage ? `${assetBase}/${config.toastImage}` : null);

    const audioUrl = currentStep?.audio ? `${assetBase}/${currentStep.audio}?v=1` : null;

    const text = currentStep?.textKey ? storyline[currentStep.textKey] : '';

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
            background: backgroundImage ? `url("${backgroundImage}") center/cover no-repeat` : '#111',
            display: 'flex', flexDirection: 'column',
            color: '#fff', textAlign: 'center'
        }}>
            <div style={{ flex: 1 }}></div>

            <div style={{
                background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 80%, transparent 100%)',
                padding: '40px 20px', paddingTop: '100px', minHeight: '40%'
            }}>
                <h1 style={{ fontSize: '3rem', color: step === 'INTRO' ? '#61dafb' : 'var(--gold)', marginBottom: '20px' }}>
                    {currentStep?.title || 'Toast'}
                </h1>

                {audioUrl && (
                    <div style={{ marginBottom: '20px' }}>
                        <audio id={`toastAudio-${step}`} src={audioUrl} autoPlay />
                        <button
                            onClick={() => {
                                const audio = document.getElementById(`toastAudio-${step}`);
                                if (audio) audio.play().catch(e => console.log("Audio play blocked:", e));
                            }}
                            className="btn"
                            style={{ fontSize: '1rem', padding: '10px 20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)' }}
                        >
                            <Play size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Play Audio
                        </button>
                    </div>
                )}

                {currentStep?.instruction && (
                    <p style={{ fontSize: '1.2rem', color: '#888', marginBottom: '10px' }}>
                        <strong>Host:</strong> {currentStep.instruction}
                    </p>
                )}

                {text && (
                    <p style={{ fontSize: '1.3rem', lineHeight: '1.6', marginBottom: '30px', maxWidth: '800px', margin: '0 auto 30px', color: '#ddd', fontStyle: 'italic' }}>
                        "{text}"
                    </p>
                )}

                {!isLastStep ? (
                    <button
                        className="btn"
                        onClick={() => onSetStep(config.steps[stepIndex + 1]?.id)}
                        style={{ fontSize: '1.4rem', padding: '15px 40px' }}
                    >
                        Continue &rarr;
                    </button>
                ) : (
                    <button
                        className="btn"
                        onClick={onNext}
                        style={{ fontSize: '1.5rem', padding: '20px 50px', background: '#d62828', animation: 'pulse 2s infinite' }}
                    >
                        <SkipForward size={24} style={{ marginRight: '15px', verticalAlign: 'middle' }} />
                        Next Phase
                    </button>
                )}
            </div>
        </div>
    );
}
