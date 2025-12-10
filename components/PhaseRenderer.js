import React from 'react';
import PhaseLobby from './PhaseLobby';
import PhaseCinematic from './PhaseCinematic';
import PhaseToast from './PhaseToast';
import PhaseAnnouncement from './PhaseAnnouncement';
import PhaseCarousel from './PhaseCarousel';
import PhasePlaying from './PhasePlaying';
import PhaseFinished from './PhaseFinished';

/**
 * PhaseRenderer - Data-driven phase component renderer
 * Renders the appropriate phase component based on manifest configuration
 */
export default function PhaseRenderer({
    phaseConfig,
    gameData,
    gameState,
    gameType,
    onAction,
    // Additional state for specific phases
    toastStep,
    setToastStep,
    suspectIndex,
    setSuspectIndex,
    audioTime,
    setAudioTime,
    audioDuration,
    setAudioDuration
}) {
    if (!phaseConfig) return null;

    const { manifest, storyline, characters, clues } = gameData;
    const assetBase = `/game_assets/${gameType}`;

    // Common props passed to all phase components
    const commonProps = {
        config: phaseConfig,
        storyline,
        assetBase,
        onAction
    };

    switch (phaseConfig.type) {
        case 'lobby':
            return (
                <PhaseLobby
                    {...commonProps}
                    gameId={gameState.gameId}
                    minPlayers={gameState.minPlayers}
                    players={gameState.players.filter(p => !p.isHost)}
                    manifest={manifest}
                />
            );

        case 'cinematic':
            const introWords = (storyline[phaseConfig.textKey] || '').split(' ');
            const activeWordIndex = audioDuration > 0
                ? Math.floor((audioTime / audioDuration) * introWords.length)
                : -1;

            return (
                <PhaseCinematic
                    {...commonProps}
                    introWords={introWords}
                    activeWordIndex={activeWordIndex}
                    onAudioTimeUpdate={(e) => setAudioTime(e.target.currentTime)}
                    onAudioLoadedMetadata={(e) => setAudioDuration(e.target.duration)}
                    onNext={() => {
                        setToastStep?.('INTRO');
                        onAction('SET_PHASE', { phase: phaseConfig.next });
                    }}
                />
            );

        case 'toast':
            return (
                <PhaseToast
                    {...commonProps}
                    step={toastStep}
                    onSetStep={setToastStep}
                    onNext={() => onAction('SET_PHASE', { phase: phaseConfig.next })}
                />
            );

        case 'announcement':
            return (
                <PhaseAnnouncement
                    {...commonProps}
                    onNext={() => {
                        setSuspectIndex?.(0);
                        onAction('SET_PHASE', { phase: phaseConfig.next });
                    }}
                />
            );

        case 'carousel':
            const suspects = gameState.players
                .filter(p => !p.isHost && p.characterId && !phaseConfig.excludeCharacterIds?.includes(p.characterId))
                .map(p => ({
                    player: p,
                    character: characters.find(c => c.id === p.characterId) || {}
                }));

            const currentSuspect = suspects[suspectIndex];

            return (
                <PhaseCarousel
                    {...commonProps}
                    suspect={currentSuspect}
                    suspectIndex={suspectIndex}
                    totalSuspects={suspects.length}
                    onPrev={() => setSuspectIndex(Math.max(0, suspectIndex - 1))}
                    onNext={() => setSuspectIndex(suspectIndex + 1)}
                    onFinish={() => onAction('SET_PHASE', { phase: phaseConfig.next })}
                />
            );

        case 'investigation':
            const allSuspects = gameState.players
                .filter(p => !p.isHost && p.characterId && p.characterId !== manifest.victimCharacterId)
                .map(p => ({
                    player: p,
                    character: characters.find(c => c.id === p.characterId) || {}
                }));

            return (
                <PhasePlaying
                    {...commonProps}
                    suspects={allSuspects}
                    clues={clues}
                    revealedClues={gameState.revealedClues || []}
                    victimName={phaseConfig.victimName}
                    victimImage={`${assetBase}/${phaseConfig.victimImage}`}
                />
            );

        case 'finale':
            return (
                <PhaseFinished
                    {...commonProps}
                />
            );

        default:
            return (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <h2>Unknown Phase: {phaseConfig.type}</h2>
                </div>
            );
    }
}
