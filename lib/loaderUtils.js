const ASSET_BASE = '/game_assets';

/**
 * Get the base URL for a game's assets
 */
export function getGameAssetPath(gameType, relativePath = '') {
    return `${ASSET_BASE}/${gameType}/${relativePath}`.replace(/\/+$/, '');
}

/**
 * Fetch JSON from a game's asset folder
 */
export async function fetchGameJson(gameType, filename) {
    const url = getGameAssetPath(gameType, filename);
    const bust = Date.now();
    const res = await fetch(`${url}?t=${bust}`);
    if (!res.ok) throw new Error(`Failed to load ${filename} for ${gameType}`);
    return res.json();
}
