/**
 * Test harness for game servers: a fake GameContext plus helpers that mimic what
 * the room Durable Object does (clone → handle → commit, fire timers).
 */
import type { GameContext, GameServer, MediaService, Player, Settings, Viewer } from '../src/platform/sdk';
import { seededRandom } from '../src/platform/mechanics/random';

export function players(...names: string[]): Player[] {
    return names.map((name, i) => ({ id: `p${i + 1}`, name, photoUrl: null, connected: true, joinedAt: i }));
}

const noMedia: MediaService = {
    storage: false,
    imageGeneration: false,
    url: key => `/api/media/${key}`,
    generateFromPhoto: () => Promise.reject(new Error('not configured')),
};

export function harness<State, S extends Settings>(server: GameServer<State, S>, roster: Player[], settings: S, seed = 42, content?: unknown) {
    const timers = new Map<string, number>();
    const events: { type: string }[] = [];
    let now = 1_000_000;

    const ctx: GameContext<S> = {
        roomCode: 'TEST',
        players: roster,
        settings,
        random: seededRandom(seed),
        now: () => now,
        timers: {
            set: (id, ms) => timers.set(id, now + ms),
            clear: id => timers.delete(id),
        },
        emit: e => events.push(e),
        media: noMedia,
        content,
        photoKeyOf: () => null,
        runAsync: () => undefined,
    };

    let state = server.setup(ctx);

    return {
        ctx,
        events,
        timers,
        get state() {
            return state;
        },
        start() {
            const draft = structuredClone(state);
            const refusal = server.start(draft, ctx);
            if (refusal) throw new Error(refusal);
            state = draft;
        },
        /** Run an action like the room does: validate, act on a clone, commit on success. */
        act(type: string, actor: Viewer, payload?: unknown) {
            const def = server.actions[type];
            if (!def) throw new Error(`no action ${type}`);
            if (def.by !== 'any' && def.by !== actor.role) throw new Error('wrong actor');
            const parsed = def.schema ? def.schema.parse(payload) : payload;
            const draft = structuredClone(state);
            def.handle(draft, parsed, ctx, actor);
            state = draft;
        },
        advance(ms: number) {
            now += ms;
            for (const [id, at] of [...timers]) {
                if (at <= now) {
                    timers.delete(id);
                    const draft = structuredClone(state);
                    server.onTimer?.(draft, id, ctx);
                    state = draft;
                }
            }
        },
        view(viewer: Viewer) {
            return server.view(state, viewer, ctx) as any;
        },
    };
}

export const HOST: Viewer = { role: 'host' };
export const as = (playerId: string): Viewer => ({ role: 'player', playerId });
