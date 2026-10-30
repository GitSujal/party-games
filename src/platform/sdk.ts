/**
 * Party Games SDK — the contract every game implements.
 *
 * A game is three pieces:
 *   meta.ts    GameMeta     (shared: catalog card, players, settings, theme)
 *   server.ts  GameServer   (runs inside the room's Durable Object)
 *   client/    GameClient   (React screens for the host display and player phones)
 *
 * Server logic is reducer-style: handlers receive a draft of the state and mutate it.
 * The room engine clones state before each handler and only commits if it doesn't throw,
 * so a thrown GameError leaves the room untouched.
 */
import type { ZodType } from 'zod';

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export type Role = 'host' | 'player';

export interface Viewer {
    role: Role;
    /** Present when role === 'player'. */
    playerId?: string;
}

/** Public roster entry, as games and clients see it. */
export interface Player {
    id: string;
    name: string;
    /** Uploaded selfie (if the game asked for one). */
    photoUrl: string | null;
    connected: boolean;
    joinedAt: number;
}

export type RoomStatus = 'lobby' | 'playing';

/** Platform part of every state snapshot sent to clients. */
export interface RoomView {
    code: string;
    gameId: string;
    status: RoomStatus;
    players: Player[];
    settings: Settings;
    hostConnected: boolean;
    me: Viewer;
}

// ---------------------------------------------------------------------------
// Meta (catalog + configuration)
// ---------------------------------------------------------------------------

export type SettingValue = number | string | boolean;
export type Settings = Record<string, SettingValue>;

interface SettingBase {
    key: string;
    label: string;
    help?: string;
}

export type SettingField =
    | (SettingBase & { type: 'number'; default: number; min: number; max: number; step?: number; unit?: string })
    | (SettingBase & { type: 'select'; default: string; options: { value: string; label: string }[] })
    | (SettingBase & { type: 'boolean'; default: boolean });

/**
 * Every game shares the platform's paper-and-ink look. A game brings one colour,
 * used for its cover tile, primary buttons and highlights. Pick a mid-dark shade
 * (white text must read on it), e.g. "#2F49D1".
 */
export interface Theme {
    color: string;
}

export interface GameMeta {
    id: string;
    name: string;
    /** One line for the catalog card. */
    tagline: string;
    /** A short paragraph for the game page. */
    description: string;
    /**
     * A simple white-on-transparent SVG under /public drawn on the game's colour
     * (catalog tile, game page), e.g. "/games/imposter/mark.svg". Without one the
     * tile shows the game's initial.
     */
    mark?: string;
    players: { min: number; max: number };
    /** e.g. "15–30 min" */
    duration: string;
    tags: string[];
    theme: Theme;
    features?: {
        /** Ask joining players for an optional selfie. */
        photo?: boolean;
    };
    settings?: SettingField[];
    /** false = unlisted: hidden from the homepage, still playable at /g/<id>. Defaults to true. */
    enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Server contract
// ---------------------------------------------------------------------------

/** Throw from a handler to reject an action with a user-facing message. */
export class GameError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GameError';
    }
}

export interface Random {
    /** Integer in [0, max). */
    int(max: number): number;
    pick<T>(items: readonly T[]): T;
    shuffle<T>(items: readonly T[]): T[];
}

/** Ephemeral, fire-and-forget effects (confetti, sounds). Not persisted. */
export interface GameEvent {
    type: string;
    [key: string]: unknown;
}

export interface MediaService {
    /** True when R2 storage is bound. */
    readonly storage: boolean;
    /** True when storage and an image model key are both configured. */
    readonly imageGeneration: boolean;
    /** Public URL for a stored key. */
    url(key: string): string;
    /**
     * Generate an image from a stored source photo and a prompt, store it under outKey.
     * Resolves to the stored key. Can take tens of seconds — call it from ctx.runAsync.
     */
    generateFromPhoto(input: { photoKey: string; prompt: string; outKey: string }): Promise<string>;
}

export interface GameContext<S extends Settings = Settings> {
    roomCode: string;
    /** Current roster (host excluded). */
    players: Player[];
    settings: S;
    random: Random;
    now(): number;
    /** Server-side timers; fire GameServer.onTimer(id). Setting an existing id replaces it. */
    timers: {
        set(id: string, delayMs: number): void;
        clear(id: string): void;
    };
    /** Send an ephemeral event to everyone (default) or one viewer. */
    emit(event: GameEvent, to?: Viewer): void;
    media: MediaService;
    /** Storage key of a player's uploaded photo, if any. Server-only. */
    photoKeyOf(playerId: string): string | null;
    /**
     * Run slow async work (e.g. AI image generation) without blocking the action.
     * The returned function, if any, is applied to the latest state when the work
     * finishes, and the result is broadcast like any other change.
     */
    runAsync<State>(work: () => Promise<((state: State, ctx: GameContext<S>) => void) | void>): void;
}

export type ActionActor = 'host' | 'player' | 'any';

export interface ActionDef<State, S extends Settings, P> {
    /** Who may send it. */
    by: ActionActor;
    /** Validates the raw payload. Omit for actions without a payload. */
    schema?: ZodType<P>;
    handle(state: State, payload: P, ctx: GameContext<S>, actor: Viewer): void;
}

export interface GameServer<State, S extends Settings = Settings> {
    /**
     * Fresh state for a new room, play-again, back-to-lobby or a settings change. Roster may be empty.
     * `previous` is the state being replaced (undefined for a new room): use it to carry over
     * room-long memory such as already-used questions or words.
     */
    setup(ctx: GameContext<S>, previous?: State): State;
    /** Host pressed Start. Return an error message to refuse (e.g. not enough players). */
    start(state: State, ctx: GameContext<S>): string | void;
    actions: Record<string, ActionDef<State, S, any>>;
    onPlayerJoin?(state: State, player: Player, ctx: GameContext<S>): void;
    onPlayerLeave?(state: State, playerId: string, ctx: GameContext<S>): void;
    onTimer?(state: State, timerId: string, ctx: GameContext<S>): void;
    /**
     * What a given viewer is allowed to see. REQUIRED — never send secrets
     * (roles, words, other players' private info) to viewers who shouldn't have them.
     */
    view(state: State, viewer: Viewer, ctx: GameContext<S>): unknown;
}

/** Identity helper that gives full type inference for a game's server. */
export function defineServer<State, S extends Settings = Settings>(server: GameServer<State, S>): GameServer<State, S> {
    return server;
}

export function defineAction<State, S extends Settings, P = undefined>(
    def: ActionDef<State, S, P>
): ActionDef<State, S, P> {
    return def;
}

export function defineMeta(meta: GameMeta): GameMeta {
    return meta;
}
