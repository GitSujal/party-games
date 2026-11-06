/** gameId -> server implementation. Imported by the Worker only. */
import type { GameMeta, GameServer } from '../platform/sdk';
import { findMeta } from './catalog';
import imposter from './imposter/server';
import momoMassacre from './momo-massacre/server';
import guessThe from './guess-the/server';
// new-game:import

const servers: Record<string, GameServer<any, any>> = {
    imposter,
    'momo-massacre': momoMassacre,
    'guess-the': guessThe,
    // new-game:entry
};

export interface RegisteredGame {
    meta: GameMeta;
    server: GameServer<any, any>;
}

export function getGame(gameId: string): RegisteredGame | null {
    const meta = findMeta(gameId);
    const server = servers[gameId];
    return meta && server ? { meta, server } : null;
}
