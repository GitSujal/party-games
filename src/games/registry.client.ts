/** gameId -> lazily loaded client module. Imported by the app only. */
import type { GameClient } from '../platform/client/types';

const clients: Record<string, () => Promise<{ default: GameClient }>> = {
    imposter: () => import('./imposter/client'),
    'momo-massacre': () => import('./momo-massacre/client'),
    'guess-the': () => import('./guess-the/client'),
    // new-game:entry
};

export function loadClient(gameId: string): Promise<GameClient> | null {
    return clients[gameId]?.().then(m => m.default) ?? null;
}
