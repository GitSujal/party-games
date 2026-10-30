/**
 * WebSocket protocol between browsers and a room's Durable Object.
 *
 * Client → server: one message type, `action`. Platform actions are prefixed with
 * "room:" (start, kick, …); everything else is routed to the game's action table.
 * Every action carries an `id`; the server answers with `ack` or `error` for that id.
 *
 * Server → client: `state` is a full snapshot (room + the game's per-viewer view),
 * sent after every change. `event` is an ephemeral effect. `kicked` precedes a close.
 */
import { z } from 'zod';
import type { GameEvent, RoomView } from './sdk';

export const PLATFORM_ACTIONS = {
    start: 'room:start',
    kick: 'room:kick',
    playAgain: 'room:playAgain',
    backToLobby: 'room:backToLobby',
    updateSettings: 'room:updateSettings',
} as const;

export const clientMessage = z.object({
    t: z.literal('action'),
    id: z.number().int(),
    type: z.string().min(1).max(64),
    payload: z.unknown().optional(),
});
export type ClientMessage = z.infer<typeof clientMessage>;

export type ServerMessage =
    | { t: 'state'; v: number; room: RoomView; game: unknown }
    | { t: 'ack'; id: number }
    | { t: 'error'; id?: number; message: string }
    | { t: 'event'; event: GameEvent }
    | { t: 'kicked' };

/** Close codes used by the room. */
export const CLOSE = {
    kicked: 4001,
    unauthorized: 4003,
    roomClosed: 4004,
} as const;

// ---------------------------------------------------------------------------
// HTTP API payloads (Worker routes)
// ---------------------------------------------------------------------------

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const roomCode = z.string().regex(/^[A-Z2-9]{4,8}$/, 'Invalid room code');

export const playerName = z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(24, 'Name must be 24 characters or fewer')
    .regex(/^[\p{L}\p{N} _'.-]+$/u, 'Name contains invalid characters');

export const createRoomBody = z.object({
    gameId: z.string().min(1).max(64),
    settings: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
});

/** Selfies arrive as data URLs; ~1.5 MB cap after base64. */
export const joinBody = z.object({
    name: playerName,
    photo: z
        .string()
        .regex(/^data:image\/(jpeg|png|webp);base64,/)
        .max(2_000_000)
        .optional(),
});

export const resumeBody = z.object({
    pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
});

export interface CreateRoomResponse {
    code: string;
    hostToken: string;
    pin: string;
}
export interface JoinResponse {
    playerId: string;
    playerToken: string;
    name: string;
}
export interface ResumeResponse {
    hostToken: string;
}
