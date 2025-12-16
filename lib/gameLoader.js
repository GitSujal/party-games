/**
 * Game Data Loader
 * Loads game manifest, storyline, characters, and clues from static assets
 */

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
async function fetchGameJson(gameType, filename) {
    const url = getGameAssetPath(gameType, filename);
    const bust = Date.now();
    const res = await fetch(`${url}?t=${bust}`);
    if (!res.ok) throw new Error(`Failed to load ${filename} for ${gameType}`);
    return res.json();
}

/**
 * Load the game registry (list of available games)
 */
export async function loadGameRegistry() {
    const res = await fetch(`${ASSET_BASE}/_registry.json`);
    if (!res.ok) throw new Error('Failed to load game registry');
    const data = await res.json();
    return data.games || [];
}

/**
 * Load all game data for a specific game type
 */
export async function loadGameData(gameType) {
    const [manifest, storyline, cluesData] = await Promise.all([
        fetchGameJson(gameType, 'manifest.json'),
        fetchGameJson(gameType, 'storyline.json'),
        fetchGameJson(gameType, 'clues.json')
    ]);

    // Load all character files
    const characters = [];
    for (let i = 1; i <= 50; i++) {
        try {
            const char = await fetchGameJson(gameType, `characters/${i}.json`);

            // Normalize image path directly in the data
            if (char.image && !char.image.startsWith('http')) {
                // Assuming images are in media/characters/ inside the game folder
                char.image = getGameAssetPath(gameType, `media/characters/${char.image}`);
            }

            characters.push(char);
        } catch {
            // No more characters
            break;
        }
    }

    // Dynamic Max Players Override
    if (manifest) {
        manifest.maxPlayers = characters.length;
    }

    return {
        manifest,
        storyline,
        clues: cluesData.clues || [],
        characters
    };
}

/**
 * Get phase configuration from manifest
 */
export function getPhaseConfig(manifest, phaseId) {
    return manifest.phases.find(p => p.id === phaseId);
}

/**
 * Get next phase ID from current phase
 */
export function getNextPhase(manifest, currentPhaseId) {
    const current = getPhaseConfig(manifest, currentPhaseId);
    return current?.next || null;
}
