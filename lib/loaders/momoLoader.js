import { fetchGameJson, getGameAssetPath } from '../loaderUtils';

export async function loadMomoData(gameType) {
    const [manifest, storyline, cluesData] = await Promise.all([
        fetchGameJson(gameType, 'manifest.json'),
        fetchGameJson(gameType, 'storyline.json'),
        fetchGameJson(gameType, 'clues.json').catch(() => ({}))
    ]);

    // Load all character files (1-50)
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
