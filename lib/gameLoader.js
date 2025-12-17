/**
 * Game Data Loader
 * Orchestrator for loading game data.
 */
import { getGameAssetPath } from './loaderUtils';
import { loadMomoData } from './loaders/momoLoader';
import { loadImposterData } from './loaders/imposterLoader';

export { getGameAssetPath };

const ASSET_BASE = '/game_assets';

/**
 * Load the game registry (list of available games)
 */
export async function loadGameRegistry() {
    const bust = Date.now();
    const res = await fetch(`${ASSET_BASE}/_registry.json?t=${bust}`);
    if (!res.ok) throw new Error('Failed to load game registry');
    const data = await res.json();
    return data.games || [];
}

/**
 * Load all game data for a specific game type
 */
export async function loadGameData(gameType) {
    if (gameType === 'imposter') {
        return loadImposterData(gameType);
    }
    // Default to Momo/Mystery loader
    return loadMomoData(gameType);
}

/**
 * Get phase configuration from manifest
 */
export function getPhaseConfig(manifest, phaseId) {
    if (!manifest || !manifest.phases) return null;
    return manifest.phases.find(p => p.id === phaseId);
}

/**
 * Get next phase ID from current phase
 */
export function getNextPhase(manifest, currentPhaseId) {
    const current = getPhaseConfig(manifest, currentPhaseId);
    return current?.next || null;
}
