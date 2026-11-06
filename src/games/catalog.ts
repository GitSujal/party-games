/**
 * Every game's metadata, in homepage order. Shared by the Worker and the app.
 * To add a game: `npm run new-game <id>` (or add its meta here and a line in
 * registry.server.ts and registry.client.ts).
 */
import type { GameMeta } from '../platform/sdk';
import imposter from './imposter/meta';
import momoMassacre from './momo-massacre/meta';
import guessThe from './guess-the/meta';
// new-game:import

export const catalog: GameMeta[] = [
    imposter,
    momoMassacre,
    guessThe,
    // new-game:entry
];

export function findMeta(gameId: string): GameMeta | undefined {
    return catalog.find(g => g.id === gameId);
}

export function enabledGames(): GameMeta[] {
    return catalog.filter(g => g.enabled !== false);
}
