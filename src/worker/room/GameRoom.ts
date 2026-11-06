/**
 * GameRoom — one Durable Object per room code.
 *
 * Owns the platform side of a room (roster, host auth, lobby, kick, timers, expiry)
 * and delegates everything else to the game's GameServer from the registry.
 * Clients talk to it over hibernatable WebSockets; every change is broadcast as a
 * per-viewer snapshot built with GameServer.view().
 */
import { DurableObject } from 'cloudflare:workers';
import { getGame, type RegisteredGame } from '../../games/registry.server';
import { CLOSE, PLATFORM_ACTIONS, clientMessage, type ServerMessage } from '../../platform/protocol';
import { GameError, type GameContext, type GameEvent, type Player, type RoomView, type Settings, type Viewer } from '../../platform/sdk';
import { random } from '../../platform/mechanics/random';
import { resolveSettings } from '../../platform/settings';
import { randomPin, randomToken, safeEqual, sha256Hex } from '../crypto';
import { createMediaService, deletePrefix, mediaPrefix, mediaUrl, putDataUrl } from '../media';

interface PlayerRecord {
    id: string;
    name: string;
    tokenHash: string;
    joinedAt: number;
    photoKey: string | null;
    deviceHash: string | null;
}

interface RoomRecord {
    code: string;
    gameId: string;
    createdAt: number;
    lastActivity: number;
    status: 'lobby' | 'playing';
    settings: Settings;
    hostTokenHashes: string[];
    pinHash: string;
    pinFailures: number;
    pinLockedUntil: number;
    players: PlayerRecord[];
}

/** Stored on each socket so identity survives hibernation. */
type Attachment = Viewer;

export type RpcResult<T> = { ok: true; value: T } | { ok: false; status: 400 | 403 | 404 | 409 | 410 | 423 | 503; error: string };

interface Effects {
    events: { event: GameEvent; to?: Viewer }[];
    timers: { id: string; delayMs: number | null }[];
    async: (() => Promise<((state: unknown, ctx: GameContext) => void) | void>)[];
}

/** Platform actions after which a game starts from scratch, so it should see the latest content. */
const REFRESHING_ACTIONS = new Set<string>([PLATFORM_ACTIONS.start, PLATFORM_ACTIONS.playAgain, PLATFORM_ACTIONS.backToLobby, PLATFORM_ACTIONS.updateSettings]);

const MAX_HOST_DEVICES = 5;
const PIN_MAX_FAILURES = 8;
const PIN_LOCK_MS = 5 * 60_000;

function fail(status: 400 | 403 | 404 | 409 | 410 | 423 | 503, error: string) {
    return { ok: false as const, status, error };
}

export class GameRoom extends DurableObject<Env> {
    private room: RoomRecord | null = null;
    private state: unknown = null;
    /** timerId -> due epoch ms */
    private timers: Record<string, number> = {};
    private version = 0;
    private media = createMediaService(this.env);
    /** Output of the game's loadContent (e.g. Guess The's catalog from KV). */
    private content: unknown = undefined;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        ctx.blockConcurrencyWhile(async () => {
            const stored = await ctx.storage.get(['room', 'state', 'timers', 'version']);
            this.room = (stored.get('room') as RoomRecord) ?? null;
            this.state = stored.get('state') ?? null;
            this.timers = (stored.get('timers') as Record<string, number>) ?? {};
            this.version = (stored.get('version') as number) ?? 0;
            const game = this.room && getGame(this.room.gameId);
            if (game) await this.loadContent(game).catch(err => console.error('Content load failed', err));
        });
    }

    // -----------------------------------------------------------------------
    // RPC (called by the Worker)
    // -----------------------------------------------------------------------

    async create(input: { code: string; gameId: string; settings: Record<string, unknown> }): Promise<RpcResult<{ hostToken: string; pin: string }>> {
        if (this.room) return fail(409, 'Room code in use');
        const game = getGame(input.gameId);
        if (!game) return fail(404, 'Unknown game');

        const hostToken = randomToken();
        const pin = randomPin();
        const now = Date.now();
        this.room = {
            code: input.code,
            gameId: input.gameId,
            createdAt: now,
            lastActivity: now,
            status: 'lobby',
            settings: resolveSettings(game.meta, input.settings),
            hostTokenHashes: [await sha256Hex(hostToken)],
            pinHash: await sha256Hex(pin),
            pinFailures: 0,
            pinLockedUntil: 0,
            players: [],
        };
        this.timers = {};
        try {
            await this.loadContent(game);
        } catch (err) {
            console.error('Content load failed', err);
            this.room = null;
            return fail(503, 'Game content is unavailable right now. Try again in a moment.');
        }
        this.state = this.withContext(game, ctx => game.server.setup(ctx));
        await this.persist();
        return { ok: true, value: { hostToken, pin } };
    }

    async info(): Promise<RpcResult<{ gameId: string; status: string; players: number; wantsPhoto: boolean }>> {
        if (!this.room) return fail(404, 'Room not found');
        const game = getGame(this.room.gameId);
        return {
            ok: true,
            value: {
                gameId: this.room.gameId,
                status: this.room.status,
                players: this.room.players.length,
                wantsPhoto: !!game?.meta.features?.photo && this.media.storage,
            },
        };
    }

    async join(input: { name: string; photo?: string; deviceHash?: string }): Promise<RpcResult<{ playerId: string; playerToken: string; name: string }>> {
        const room = this.room;
        if (!room) return fail(404, 'Room not found');
        const game = getGame(room.gameId)!;

        const playerToken = randomToken();
        const tokenHash = await sha256Hex(playerToken);

        // Same device rejoining (only when one-player-per-device is enabled): hand back the seat.
        if (input.deviceHash) {
            const existing = room.players.find(p => p.deviceHash === input.deviceHash);
            if (existing) {
                existing.tokenHash = tokenHash;
                await this.persist();
                return { ok: true, value: { playerId: existing.id, playerToken, name: existing.name } };
            }
        }

        const maxPlayers = Math.min(game.meta.players.max, Number(this.env.MAX_PLAYERS_PER_ROOM) || 30);
        if (room.players.length >= maxPlayers) return fail(409, 'This room is full');
        if (room.players.some(p => p.name.toLowerCase() === input.name.toLowerCase())) {
            return fail(409, 'That name is taken — try another');
        }

        const id = crypto.randomUUID();
        let photoKey: string | null = null;
        if (input.photo && game.meta.features?.photo && this.env.MEDIA) {
            try {
                photoKey = `${mediaPrefix(room.code)}${id}/photo`;
                await putDataUrl(this.env.MEDIA, photoKey, input.photo);
            } catch (err) {
                console.error('Photo upload failed', err);
                photoKey = null;
            }
        }

        const record: PlayerRecord = { id, name: input.name, tokenHash, joinedAt: Date.now(), photoKey, deviceHash: input.deviceHash ?? null };
        room.players.push(record);
        room.lastActivity = Date.now();

        if (room.status === 'playing' && game.server.onPlayerJoin) {
            const player = this.publicPlayer(record, new Set());
            this.mutate(game, (state, ctx) => game.server.onPlayerJoin!(state, player, ctx));
        } else {
            await this.commit();
        }
        return { ok: true, value: { playerId: id, playerToken, name: input.name } };
    }

    async resume(pin: string): Promise<RpcResult<{ hostToken: string }>> {
        const room = this.room;
        if (!room) return fail(404, 'Room not found');
        if (room.pinLockedUntil > Date.now()) return fail(423, 'Too many wrong PINs. Try again in a few minutes.');

        if (!safeEqual(await sha256Hex(pin), room.pinHash)) {
            room.pinFailures++;
            if (room.pinFailures >= PIN_MAX_FAILURES) {
                room.pinFailures = 0;
                room.pinLockedUntil = Date.now() + PIN_LOCK_MS;
            }
            await this.persist();
            return fail(403, 'Wrong PIN');
        }

        const hostToken = randomToken();
        room.pinFailures = 0;
        room.hostTokenHashes = [...room.hostTokenHashes, await sha256Hex(hostToken)].slice(-MAX_HOST_DEVICES);
        await this.persist();
        return { ok: true, value: { hostToken } };
    }

    // -----------------------------------------------------------------------
    // WebSockets
    // -----------------------------------------------------------------------

    async fetch(request: Request): Promise<Response> {
        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('Expected WebSocket', { status: 426 });
        }
        const { 0: client, 1: server } = new WebSocketPair();
        this.ctx.acceptWebSocket(server);

        const token = new URL(request.url).searchParams.get('token') ?? '';
        const viewer = this.room ? await this.authenticate(token) : null;
        if (!this.room) {
            server.close(CLOSE.roomClosed, 'Room not found');
        } else if (!viewer) {
            server.close(CLOSE.unauthorized, 'Session not recognised');
        } else {
            server.serializeAttachment(viewer satisfies Attachment);
            this.broadcast();
        }
        return new Response(null, { status: 101, webSocket: client });
    }

    async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
        const viewer = ws.deserializeAttachment() as Attachment | null;
        if (!viewer || !this.room) return;

        let msg;
        try {
            msg = clientMessage.parse(JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)));
        } catch {
            this.send(ws, { t: 'error', message: 'Malformed message' });
            return;
        }

        // A kicked player's socket may still be open for a moment.
        if (viewer.role === 'player' && !this.room.players.some(p => p.id === viewer.playerId)) {
            this.send(ws, { t: 'kicked' });
            ws.close(CLOSE.kicked, 'Removed from room');
            return;
        }

        try {
            // A game picks up content edits whenever it (re)starts, never mid-question.
            if (REFRESHING_ACTIONS.has(msg.type)) {
                const game = getGame(this.room.gameId);
                if (game) await this.loadContent(game).catch(err => {
                    console.error('Content refresh failed', err);
                    if (this.content === undefined) throw new GameError('Game content is unavailable right now. Try again in a moment.');
                });
            }
            this.handleAction(viewer, msg.type, msg.payload);
            this.send(ws, { t: 'ack', id: msg.id });
        } catch (err) {
            const message = err instanceof GameError ? err.message : 'Something went wrong';
            if (!(err instanceof GameError)) console.error(`Action ${msg.type} failed`, err);
            this.send(ws, { t: 'error', id: msg.id, message });
        }
    }

    async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
        try {
            ws.close(code, reason);
        } catch {
            /* already closed */
        }
        this.broadcast(ws);
    }

    async webSocketError(ws: WebSocket): Promise<void> {
        this.broadcast(ws);
    }

    // -----------------------------------------------------------------------
    // Alarms: game timers + room expiry
    // -----------------------------------------------------------------------

    async alarm(): Promise<void> {
        const room = this.room;
        if (!room) return;
        const now = Date.now();

        if (now >= room.lastActivity + this.ttlMs()) {
            await this.destroy();
            return;
        }

        const game = getGame(room.gameId);
        const due = Object.entries(this.timers).filter(([, at]) => at <= now);
        for (const [id] of due) {
            delete this.timers[id];
            if (game?.server.onTimer) {
                try {
                    this.mutate(game, (state, ctx) => game.server.onTimer!(state, id, ctx));
                } catch (err) {
                    console.error(`Timer ${id} failed`, err);
                }
            }
        }
        await this.persist();
    }

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------

    private handleAction(viewer: Viewer, type: string, payload: unknown): void {
        const room = this.room!;
        const game = getGame(room.gameId);
        if (!game) throw new GameError('This game is no longer available');
        room.lastActivity = Date.now();

        if (type.startsWith('room:')) {
            if (viewer.role !== 'host') throw new GameError('Only the host can do that');
            this.handlePlatformAction(game, type, payload);
            return;
        }

        const def = game.server.actions[type];
        if (!def) throw new GameError(`Unknown action: ${type}`);
        if (def.by !== 'any' && def.by !== viewer.role) {
            throw new GameError(def.by === 'host' ? 'Only the host can do that' : 'Only players can do that');
        }
        let parsed = payload;
        if (def.schema) {
            const result = def.schema.safeParse(payload);
            if (!result.success) throw new GameError(result.error.issues[0]?.message ?? 'Invalid input');
            parsed = result.data;
        }
        this.mutate(game, (state, ctx) => def.handle(state, parsed, ctx, viewer));
    }

    private handlePlatformAction(game: RegisteredGame, type: string, payload: unknown): void {
        const room = this.room!;
        const { min } = game.meta.players;

        switch (type) {
            case PLATFORM_ACTIONS.start: {
                if (room.status !== 'lobby') throw new GameError('The game has already started');
                if (room.players.length < min) throw new GameError(`Need at least ${min} players to start`);
                this.mutate(game, (state, ctx) => {
                    const refusal = game.server.start(state, ctx);
                    if (refusal) throw new GameError(refusal);
                    room.status = 'playing';
                });
                return;
            }
            case PLATFORM_ACTIONS.playAgain: {
                if (room.players.length < min) throw new GameError(`Need at least ${min} players to start`);
                this.timers = {};
                this.mutate(game, (state, ctx) => {
                    const fresh = game.server.setup(ctx, state);
                    const refusal = game.server.start(fresh, ctx);
                    if (refusal) throw new GameError(refusal);
                    room.status = 'playing';
                    return fresh;
                });
                return;
            }
            case PLATFORM_ACTIONS.backToLobby: {
                this.timers = {};
                this.mutate(game, (state, ctx) => {
                    room.status = 'lobby';
                    return game.server.setup(ctx, state);
                });
                return;
            }
            case PLATFORM_ACTIONS.close: {
                // Let the ack reach the host before the sockets are closed.
                this.ctx.waitUntil(new Promise<void>(resolve => setTimeout(resolve, 50)).then(() => this.destroy()));
                return;
            }
            case PLATFORM_ACTIONS.kick: {
                const playerId = (payload as { playerId?: unknown } | undefined)?.playerId;
                if (typeof playerId !== 'string') throw new GameError('playerId required');
                const index = room.players.findIndex(p => p.id === playerId);
                if (index === -1) throw new GameError('Player not found');
                room.players.splice(index, 1);
                for (const ws of this.ctx.getWebSockets()) {
                    const a = ws.deserializeAttachment() as Attachment | null;
                    if (a?.playerId === playerId) {
                        this.send(ws, { t: 'kicked' });
                        ws.close(CLOSE.kicked, 'Removed by host');
                    }
                }
                if (room.status === 'playing' && game.server.onPlayerLeave) {
                    this.mutate(game, (state, ctx) => game.server.onPlayerLeave!(state, playerId, ctx));
                } else {
                    void this.commit();
                }
                return;
            }
            case PLATFORM_ACTIONS.updateSettings: {
                if (room.status !== 'lobby') throw new GameError('Settings can only change in the lobby');
                const settings = (payload as { settings?: Record<string, unknown> } | undefined)?.settings ?? {};
                room.settings = resolveSettings(game.meta, { ...room.settings, ...settings });
                this.mutate(game, (state, ctx) => game.server.setup(ctx, state));
                return;
            }
            default:
                throw new GameError(`Unknown action: ${type}`);
        }
    }

    /**
     * Run a game mutation transactionally: the handler gets a clone of state (and
     * may return a replacement). If it throws, nothing changes. Otherwise the new
     * state is committed, timers/events/async work are applied, and everyone gets
     * a fresh snapshot.
     */
    private mutate(game: RegisteredGame, fn: (state: any, ctx: GameContext) => unknown): void {
        const roomBefore = structuredClone(this.room);
        const draft = structuredClone(this.state);
        const effects: Effects = { events: [], timers: [], async: [] };
        let next: unknown;
        try {
            next = this.withContext(game, ctx => fn(draft, ctx) ?? draft, effects);
        } catch (err) {
            this.room = roomBefore;
            throw err;
        }

        this.state = next;
        const now = Date.now();
        for (const t of effects.timers) {
            if (t.delayMs === null) delete this.timers[t.id];
            else this.timers[t.id] = now + t.delayMs;
        }
        void this.commit();
        for (const { event, to } of effects.events) this.sendEvent(event, to);
        for (const work of effects.async) this.startAsync(game, work);
    }

    private startAsync(game: RegisteredGame, work: Effects['async'][number]): void {
        const task = work()
            .then(apply => {
                if (apply && this.room) this.mutate(game, (state, ctx) => apply(state, ctx));
            })
            .catch(err => console.error('Async game work failed', err));
        this.ctx.waitUntil(task);
    }

    private async loadContent(game: RegisteredGame): Promise<void> {
        if (game.server.loadContent) this.content = await game.server.loadContent(this.env);
    }

    private withContext<T>(game: RegisteredGame, fn: (ctx: GameContext) => T, effects?: Effects): T {
        const room = this.room!;
        const connected = this.connectedIds();
        const sink = effects ?? { events: [], timers: [], async: [] };
        const ctx: GameContext = {
            roomCode: room.code,
            players: room.players.map(p => this.publicPlayer(p, connected)),
            settings: room.settings,
            random,
            now: () => Date.now(),
            timers: {
                set: (id, delayMs) => sink.timers.push({ id, delayMs: Math.max(0, delayMs) }),
                clear: id => sink.timers.push({ id, delayMs: null }),
            },
            emit: (event, to) => sink.events.push({ event, to }),
            media: this.media,
            content: this.content,
            photoKeyOf: id => room.players.find(p => p.id === id)?.photoKey ?? null,
            runAsync: work => sink.async.push(work as Effects['async'][number]),
        };
        return fn(ctx);
    }

    // -----------------------------------------------------------------------
    // Snapshots
    // -----------------------------------------------------------------------

    private broadcast(exclude?: WebSocket): void {
        const room = this.room;
        if (!room) return;
        const game = getGame(room.gameId);
        if (!game) return;
        const connected = this.connectedIds(exclude);

        this.withContext(game, ctx => {
            for (const ws of this.ctx.getWebSockets()) {
                if (ws === exclude) continue;
                const viewer = ws.deserializeAttachment() as Attachment | null;
                if (!viewer) continue;
                const roomView: RoomView = {
                    code: room.code,
                    gameId: room.gameId,
                    status: room.status,
                    players: room.players.map(p => this.publicPlayer(p, connected)),
                    settings: room.settings,
                    hostConnected: connected.has('host'),
                    me: viewer,
                };
                let view: unknown = null;
                try {
                    view = game.server.view(this.state, viewer, ctx);
                } catch (err) {
                    console.error('view() failed', err);
                }
                this.send(ws, { t: 'state', v: this.version, room: roomView, game: view });
            }
        });
    }

    private sendEvent(event: GameEvent, to?: Viewer): void {
        for (const ws of this.ctx.getWebSockets()) {
            const viewer = ws.deserializeAttachment() as Attachment | null;
            if (!viewer) continue;
            if (to && (to.role !== viewer.role || (to.playerId && to.playerId !== viewer.playerId))) continue;
            this.send(ws, { t: 'event', event });
        }
    }

    private send(ws: WebSocket, msg: ServerMessage): void {
        try {
            ws.send(JSON.stringify(msg));
        } catch {
            /* socket closing */
        }
    }

    /** Player ids (and 'host') with at least one open socket. */
    private connectedIds(exclude?: WebSocket): Set<string> {
        const ids = new Set<string>();
        for (const ws of this.ctx.getWebSockets()) {
            if (ws === exclude) continue;
            const a = ws.deserializeAttachment() as Attachment | null;
            if (a) ids.add(a.role === 'host' ? 'host' : a.playerId!);
        }
        return ids;
    }

    private publicPlayer(p: PlayerRecord, connected: Set<string>): Player {
        return {
            id: p.id,
            name: p.name,
            photoUrl: p.photoKey ? mediaUrl(p.photoKey) : null,
            connected: connected.has(p.id),
            joinedAt: p.joinedAt,
        };
    }

    // -----------------------------------------------------------------------
    // Persistence & lifecycle
    // -----------------------------------------------------------------------

    private async authenticate(token: string): Promise<Viewer | null> {
        if (!token || !this.room) return null;
        const hash = await sha256Hex(token);
        if (this.room.hostTokenHashes.some(h => safeEqual(h, hash))) return { role: 'host' };
        const player = this.room.players.find(p => safeEqual(p.tokenHash, hash));
        return player ? { role: 'player', playerId: player.id } : null;
    }

    private ttlMs(): number {
        return (Number(this.env.ROOM_TTL_HOURS) || 24) * 3_600_000;
    }

    private async persist(): Promise<void> {
        await this.ctx.storage.put({ room: this.room, state: this.state, timers: this.timers, version: this.version });
        const room = this.room;
        if (!room) return;
        const next = Math.min(room.lastActivity + this.ttlMs(), ...Object.values(this.timers));
        await this.ctx.storage.setAlarm(next);
    }

    /** Bump version, save, and push snapshots. */
    private async commit(): Promise<void> {
        this.version++;
        this.broadcast();
        await this.persist();
    }

    private async destroy(): Promise<void> {
        const code = this.room?.code;
        for (const ws of this.ctx.getWebSockets()) ws.close(CLOSE.roomClosed, 'Room closed');
        if (code && this.env.MEDIA) {
            await deletePrefix(this.env.MEDIA, mediaPrefix(code)).catch(err => console.error('Media cleanup failed', err));
        }
        this.room = null;
        this.state = null;
        this.timers = {};
        await this.ctx.storage.deleteAlarm();
        await this.ctx.storage.deleteAll();
    }
}
