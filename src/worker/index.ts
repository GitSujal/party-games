/**
 * Worker entry: HTTP API for rooms + media. Everything outside /api/* is the
 * static SPA, served by the assets binding before this code runs.
 */
import { Hono, type Context } from 'hono';
import { getGame } from '../games/registry.server';
import { createRoomBody, joinBody, resumeBody, roomCode, type CreateRoomResponse } from '../platform/protocol';
import { randomRoomCode, sha256Hex } from './crypto';
import { adminApi, publicApi } from './guess-the-api';
import { keyFromMediaPath } from './media';
import type { RpcResult } from './room/GameRoom';

export { GameRoom } from './room/GameRoom';

type App = { Bindings: Env };
const app = new Hono<App>();

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
};

app.use('/api/*', async (c, next) => {
    await next();
    // WebSocket upgrades come back from the Durable Object with immutable headers.
    if (c.res.status === 101) return;
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) c.res.headers.set(k, v);
});

function clientIp(c: Context<App>): string {
    return c.req.header('CF-Connecting-IP') ?? 'local';
}

async function limited(limiter: RateLimit | undefined, key: string): Promise<boolean> {
    if (!limiter) return false;
    const { success } = await limiter.limit({ key });
    return !success;
}

function room(c: Context<App>, code: string) {
    return c.env.ROOMS.get(c.env.ROOMS.idFromName(code));
}

function rpc<T>(c: Context<App>, result: RpcResult<T>) {
    return result.ok ? c.json(result.value) : c.json({ error: result.error }, result.status);
}

function parseCode(c: Context<App>): string | null {
    const parsed = roomCode.safeParse(c.req.param('code')?.toUpperCase());
    return parsed.success ? parsed.data : null;
}

async function readJson(c: Context<App>): Promise<unknown> {
    try {
        return await c.req.json();
    } catch {
        return null;
    }
}

app.get('/api/health', c => c.json({ ok: true }));

// Create a room ---------------------------------------------------------------
app.post('/api/rooms', async c => {
    if (await limited(c.env.CREATE_LIMITER, clientIp(c))) {
        return c.json({ error: 'Too many rooms created. Wait a minute and try again.' }, 429);
    }
    const body = createRoomBody.safeParse(await readJson(c));
    if (!body.success) return c.json({ error: 'Invalid request' }, 400);

    const game = getGame(body.data.gameId);
    if (!game) return c.json({ error: 'Unknown game' }, 404);

    for (let attempt = 0; attempt < 6; attempt++) {
        const code = randomRoomCode(attempt < 4 ? 4 : 5);
        const result = await room(c, code).create({ code, gameId: game.meta.id, settings: body.data.settings ?? {} });
        if (result.ok) return c.json({ code, ...result.value } satisfies CreateRoomResponse);
        if (result.status !== 409) return rpc(c, result);
    }
    return c.json({ error: 'Could not allocate a room code. Try again.' }, 503);
});

// Room info (join page) -------------------------------------------------------
app.get('/api/rooms/:code', async c => {
    const code = parseCode(c);
    if (!code) return c.json({ error: 'Invalid room code' }, 400);
    return rpc(c, await room(c, code).info());
});

// Join as a player ------------------------------------------------------------
app.post('/api/rooms/:code/join', async c => {
    const code = parseCode(c);
    if (!code) return c.json({ error: 'Invalid room code' }, 400);
    const ip = clientIp(c);
    if (await limited(c.env.JOIN_LIMITER, ip)) return c.json({ error: 'Too many attempts. Slow down.' }, 429);

    const body = joinBody.safeParse(await readJson(c));
    if (!body.success) return c.json({ error: body.error.issues[0]?.message ?? 'Invalid request' }, 400);

    const deviceHash = c.env.ONE_PLAYER_PER_DEVICE === 'true' ? await sha256Hex(`${code}:${ip}`) : undefined;
    return rpc(c, await room(c, code).join({ ...body.data, deviceHash }));
});

// Resume hosting on another device -------------------------------------------
app.post('/api/rooms/:code/resume', async c => {
    const code = parseCode(c);
    if (!code) return c.json({ error: 'Invalid room code' }, 400);
    if (await limited(c.env.JOIN_LIMITER, clientIp(c))) return c.json({ error: 'Too many attempts. Slow down.' }, 429);

    const body = resumeBody.safeParse(await readJson(c));
    if (!body.success) return c.json({ error: body.error.issues[0]?.message ?? 'Invalid request' }, 400);
    return rpc(c, await room(c, code).resume(body.data.pin));
});

// Realtime connection ---------------------------------------------------------
app.get('/api/rooms/:code/ws', async c => {
    const code = parseCode(c);
    if (!code) return c.json({ error: 'Invalid room code' }, 400);
    if (c.req.header('Upgrade') !== 'websocket') return c.json({ error: 'Expected WebSocket' }, 426);
    return room(c, code).fetch(c.req.raw);
});

// Media (player photos, generated portraits) ----------------------------------
app.get('/api/media/*', async c => {
    const key = keyFromMediaPath(new URL(c.req.url).pathname);
    if (!key || !c.env.MEDIA) return c.notFound();
    const object = await c.env.MEDIA.get(key);
    if (!object) return c.notFound();
    return new Response(object.body, {
        headers: {
            'Content-Type': object.httpMetadata?.contentType ?? 'image/jpeg',
            'Cache-Control': 'private, max-age=3600',
            ETag: object.httpEtag,
        },
    });
});

// Guess The content: public assets + categories, and the token-guarded admin API.
app.route('/api/guess-the', publicApi);
app.route('/api/admin/guess-the', adminApi);

app.all('/api/*', c => c.json({ error: 'Not found' }, 404));

export default app;
