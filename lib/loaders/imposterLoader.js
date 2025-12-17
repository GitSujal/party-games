import { fetchGameJson } from '../loaderUtils';

export async function loadImposterData(gameType) {
    const [manifest, wordsData] = await Promise.all([
        fetchGameJson(gameType, 'manifest.json'),
        fetchGameJson(gameType, 'words.json').catch((err) => {
            console.error('Failed to load words.json:', err);
            return { words: [] };
        })
    ]);

    console.log('[imposterLoader] Loaded words:', wordsData.words?.length || 0);

    return {
        manifest,
        words: wordsData.words || [],
        characters: [], // Imposter has no pre-defined characters
        clues: [],
        storyline: {}
    };
}
