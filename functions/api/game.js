/**
 * Murder Mystery Platform - Game API
 * Cloudflare Pages Function
 */

// ============================================================================
// Cryptographic ID Generation
// ============================================================================

const generateId = () => {
    return crypto.randomUUID();
};

const generateGameId = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    return Array.from(bytes)
        .map(b => b.toString(36))
        .join('')
        .substring(0, 6)
        .toUpperCase();
};

const generatePin = () => {
    const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
    return String((randomValue % 9000) + 1000);
};

// ============================================================================
// PIN Hashing (using SubtleCrypto)
// ============================================================================

async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPin(inputPin, hashedPin) {
    const inputHash = await hashPin(inputPin);
    return inputHash === hashedPin;
}

// ============================================================================
// CORS Configuration
// ============================================================================

function getCorsHeaders(env) {
    const origin = env.ENVIRONMENT === 'production' && env.ALLOWED_ORIGIN
        ? env.ALLOWED_ORIGIN
        : '*';

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

// ============================================================================
// Response Helpers
// ============================================================================

const json = (data, status = 200, corsHeaders) => new Response(
    JSON.stringify(data),
    {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
    }
);

const error = (message, status = 400, corsHeaders) => json({ error: message }, status, corsHeaders);

// ============================================================================
// Input Validation
// ============================================================================

const VALID_GAME_TYPES = ['momo_massacre']; // Extend as you add games
const VALID_PHASES = ['LOBBY', 'INTRO', 'TOAST', 'MURDER', 'INTRODUCTIONS', 'PLAYING', 'FINISHED'];
const MAX_NAME_LENGTH = 50;
const MIN_NAME_LENGTH = 1;
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 20;

function validateName(name) {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Name is required' };
    }
    if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
        return { valid: false, error: `Name must be ${MIN_NAME_LENGTH}-${MAX_NAME_LENGTH} characters` };
    }
    // Allow alphanumeric, spaces, hyphens, underscores, common unicode
    if (!/^[\w\s\-\u00C0-\u017F]+$/u.test(name)) {
        return { valid: false, error: 'Name contains invalid characters' };
    }
    return { valid: true };
}

function validateGameId(gameId) {
    if (!gameId || typeof gameId !== 'string') {
        return { valid: false, error: 'Game ID is required' };
    }
    if (!/^[A-Z0-9]{4,8}$/.test(gameId)) {
        return { valid: false, error: 'Invalid game ID format' };
    }
    return { valid: true };
}

function validateGameType(gameType) {
    if (!gameType || !VALID_GAME_TYPES.includes(gameType)) {
        return { valid: false, error: 'Invalid game type' };
    }
    return { valid: true };
}

function validateMinPlayers(minPlayers) {
    const num = parseInt(minPlayers, 10);
    if (isNaN(num) || num < MIN_PLAYERS || num > MAX_PLAYERS) {
        return { valid: false, error: `Min players must be ${MIN_PLAYERS}-${MAX_PLAYERS}` };
    }
    return { valid: true, value: num };
}

function validatePin(pin) {
    if (!pin || typeof pin !== 'string') {
        return { valid: false, error: 'PIN is required' };
    }
    if (!/^\d{4}$/.test(pin)) {
        return { valid: false, error: 'Invalid PIN format' };
    }
    return { valid: true };
}

function validatePhase(phase) {
    if (!phase || !VALID_PHASES.includes(phase)) {
        return { valid: false, error: 'Invalid phase' };
    }
    return { valid: true };
}

// ============================================================================
// Rate Limiting (In-Memory Store)
// ============================================================================

class RateLimiter {
    constructor() {
        this.requests = new Map();
    }

    check(key, limit, windowMs) {
        const now = Date.now();

        // Clean up old entries while checking (no setInterval needed)
        for (const [k, data] of this.requests.entries()) {
            if (now - data.resetTime > windowMs * 2) {
                this.requests.delete(k);
            }
        }

        const data = this.requests.get(key);

        if (!data || now - data.resetTime > windowMs) {
            this.requests.set(key, { count: 1, resetTime: now });
            return { allowed: true, remaining: limit - 1 };
        }

        if (data.count >= limit) {
            return { allowed: false, remaining: 0, retryAfter: windowMs - (now - data.resetTime) };
        }

        data.count++;
        return { allowed: true, remaining: limit - data.count };
    }
}

const rateLimiter = new RateLimiter();

function checkRateLimit(ip, action, corsHeaders) {
    let limit, window;

    switch (action) {
        case 'CREATE_SESSION':
            limit = 5000;
            window = 60000; // 5000 per minute
            break;
        case 'JOIN':
            limit = 10000;
            window = 60000; // 10000 per minute
            break;
        case 'ADMIN_ACTION':
            limit = 30000;
            window = 60000; // 30000 per minute
            break;
        default:
            limit = 60000;
            window = 60000; // 60000 per minute for general requests
    }

    const result = rateLimiter.check(`${ip}:${action}`, limit, window);

    if (!result.allowed) {
        return error(
            `Rate limit exceeded. Try again in ${Math.ceil(result.retryAfter / 1000)} seconds`,
            429,
            corsHeaders
        );
    }

    return null;
}

// ============================================================================
// Database Helpers with Error Handling
// ============================================================================

async function dbQuery(db, query, params = []) {
    try {
        const stmt = db.prepare(query);
        const bound = params.length > 0 ? stmt.bind(...params) : stmt;
        return await bound.all();
    } catch (e) {
        console.error('Database query error:', e);
        throw new Error('Database operation failed');
    }
}

async function dbQueryFirst(db, query, params = []) {
    try {
        const stmt = db.prepare(query);
        const bound = params.length > 0 ? stmt.bind(...params) : stmt;
        return await bound.first();
    } catch (e) {
        console.error('Database query error:', e);
        throw new Error('Database operation failed');
    }
}

async function dbRun(db, query, params = []) {
    try {
        const stmt = db.prepare(query);
        const bound = params.length > 0 ? stmt.bind(...params) : stmt;
        return await bound.run();
    } catch (e) {
        console.error('Database run error:', e);
        throw new Error('Database operation failed');
    }
}

// ============================================================================
// Main Request Handler
// ============================================================================

export async function onRequest(context) {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders(env);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (request.url.endsWith('/api/game/health')) {
        return json({ status: 'healthy', timestamp: new Date().toISOString() }, 200, corsHeaders);
    }

    const db = env.murder_mystery_db;
    if (!db) {
        return error('Database not available', 503, corsHeaders);
    }

    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    try {
        // GET - Fetch game state
        if (request.method === 'GET') {
            const rateLimitError = checkRateLimit(ip, 'GET', corsHeaders);
            if (rateLimitError) return rateLimitError;

            const gameId = url.searchParams.get('gameId');
            const validation = validateGameId(gameId);
            if (!validation.valid) {
                return error(validation.error, 400, corsHeaders);
            }

            return await getGameState(db, gameId, corsHeaders);
        }

        // POST - Actions
        if (request.method === 'POST') {
            let body;
            try {
                body = await request.json();
            } catch (e) {
                return error('Invalid JSON', 400, corsHeaders);
            }

            const { action, payload } = body;
            if (!action) {
                return error('Action is required', 400, corsHeaders);
            }

            const rateLimitError = checkRateLimit(ip, action, corsHeaders);
            if (rateLimitError) return rateLimitError;

            switch (action) {
                case 'CREATE_SESSION':
                    return await createSession(db, payload || {}, corsHeaders);
                case 'JOIN':
                    return await joinGame(db, payload || {}, ip, env, corsHeaders);
                case 'ADMIN_ACTION':
                    return await adminAction(db, payload || {}, corsHeaders);
                case 'KICK':
                    return await kickPlayer(db, payload || {}, corsHeaders);
                default:
                    return error('Unknown action', 400, corsHeaders);
            }
        }

        return error('Method not allowed', 405, corsHeaders);
    } catch (e) {
        console.error('API Error:', e);
        return error(e.message || 'Internal server error', 500, corsHeaders);
    }
}

// ============================================================================
// Game State
// ============================================================================

async function getGameState(db, gameId, corsHeaders) {
    const game = await dbQueryFirst(db, 'SELECT * FROM games WHERE id = ?', [gameId]);
    if (!game) {
        return error('Game not found', 404, corsHeaders);
    }

    const playersResult = await dbQuery(
        db,
        'SELECT id, name, character_id, is_host FROM players WHERE game_id = ?',
        [gameId]
    );
    const cluesResult = await dbQuery(
        db,
        'SELECT clue_id FROM revealed_clues WHERE game_id = ?',
        [gameId]
    );

    return json({
        gameId: game.id,
        gameType: game.game_type,
        phase: game.phase,
        minPlayers: game.min_players,
        players: playersResult.results.map(p => ({
            id: p.id,
            name: p.name,
            characterId: p.character_id,
            isHost: !!p.is_host
        })),
        revealedClues: cluesResult.results.map(c => c.clue_id)
    }, 200, corsHeaders);
}

// ============================================================================
// Create Session
// ============================================================================

async function createSession(db, payload, corsHeaders) {
    const { gameType = 'momo_massacre', minPlayers = 4, name = 'HOST' } = payload;

    // Validate inputs
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
        return error(nameValidation.error, 400, corsHeaders);
    }

    const gameTypeValidation = validateGameType(gameType);
    if (!gameTypeValidation.valid) {
        return error(gameTypeValidation.error, 400, corsHeaders);
    }

    const minPlayersValidation = validateMinPlayers(minPlayers);
    if (!minPlayersValidation.valid) {
        return error(minPlayersValidation.error, 400, corsHeaders);
    }

    const gameId = generateGameId();
    const hostPin = generatePin();
    const hashedPin = await hashPin(hostPin);
    const hostId = generateId();

    // Create game with expiration (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await dbRun(
        db,
        'INSERT INTO games (id, game_type, host_pin, min_players, expires_at) VALUES (?, ?, ?, ?, ?)',
        [gameId, gameType, hashedPin, minPlayersValidation.value, expiresAt]
    );

    // Create host player
    await dbRun(
        db,
        'INSERT INTO players (id, game_id, name, is_host) VALUES (?, ?, ?, 1)',
        [hostId, gameId, name]
    );

    return json({
        gameId,
        hostPin, // Return plain PIN to user (only time it's visible)
        player: { id: hostId, name, isHost: true }
    }, 200, corsHeaders);
}

// ============================================================================
// Join Game
// ============================================================================

async function joinGame(db, payload, ip, env, corsHeaders) {
    const { gameId, name } = payload;

    // Validate inputs
    const gameIdValidation = validateGameId(gameId);
    if (!gameIdValidation.valid) {
        return error(gameIdValidation.error, 400, corsHeaders);
    }

    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
        return error(nameValidation.error, 400, corsHeaders);
    }

    // Check game exists and not expired
    const game = await dbQueryFirst(db, 'SELECT * FROM games WHERE id = ?', [gameId]);
    if (!game) {
        return error('Game not found', 404, corsHeaders);
    }

    // Check if game has expired
    if (game.expires_at && new Date(game.expires_at) < new Date()) {
        return error('Game has expired', 410, corsHeaders);
    }

    // Check max players (get from game type or use default)
    const playerCount = await dbQueryFirst(
        db,
        'SELECT COUNT(*) as count FROM players WHERE game_id = ? AND is_host = 0',
        [gameId]
    );

    if (playerCount && playerCount.count >= MAX_PLAYERS) {
        return error('Game is full', 400, corsHeaders);
    }

    // Check if IP limiting is enabled (default: true)
    const ipLimitEnabled = env.IP_PLAYER_LIMIT !== 'false';

    // Check if IP already has a player in this game (IP locking)
    if (ipLimitEnabled) {
        const existingByIp = await dbQueryFirst(
            db,
            'SELECT * FROM players WHERE game_id = ? AND ip_address = ? AND is_host = 0',
            [gameId, ip]
        );

        if (existingByIp) {
            return json({
                player: {
                    id: existingByIp.id,
                    name: existingByIp.name,
                    characterId: existingByIp.character_id,
                    isHost: false
                }
            }, 200, corsHeaders);
        }
    }

    // Check for duplicate name
    const existingByName = await dbQueryFirst(
        db,
        'SELECT * FROM players WHERE game_id = ? AND LOWER(name) = LOWER(?)',
        [gameId, name]
    );

    if (existingByName) {
        return error('Name already taken!', 409, corsHeaders);
    }

    // Create player
    const playerId = generateId();
    await dbRun(
        db,
        'INSERT INTO players (id, game_id, name, ip_address) VALUES (?, ?, ?, ?)',
        [playerId, gameId, name, ip]
    );

    return json({
        player: { id: playerId, name, characterId: null, isHost: false }
    }, 200, corsHeaders);
}

// ============================================================================
// Admin Actions
// ============================================================================

async function adminAction(db, payload, corsHeaders) {
    const { gameId, pin, subAction } = payload;

    // Validate inputs
    const gameIdValidation = validateGameId(gameId);
    if (!gameIdValidation.valid) {
        return error(gameIdValidation.error, 400, corsHeaders);
    }

    const pinValidation = validatePin(pin);
    if (!pinValidation.valid) {
        return error(pinValidation.error, 400, corsHeaders);
    }

    // Verify PIN
    const game = await dbQueryFirst(db, 'SELECT * FROM games WHERE id = ?', [gameId]);
    if (!game) {
        return error('Game not found', 404, corsHeaders);
    }

    const pinValid = await verifyPin(pin, game.host_pin);
    if (!pinValid) {
        return error('Invalid PIN', 403, corsHeaders);
    }

    switch (subAction) {
        case 'SET_PHASE':
            const phaseValidation = validatePhase(payload.phase);
            if (!phaseValidation.valid) {
                return error(phaseValidation.error, 400, corsHeaders);
            }
            await dbRun(
                db,
                'UPDATE games SET phase = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [payload.phase, gameId]
            );
            break;

        case 'ASSIGN_CHARACTER':
            if (!payload.playerId || !payload.characterId) {
                return error('playerId and characterId required', 400, corsHeaders);
            }
            // Verify player exists in this game
            const player = await dbQueryFirst(
                db,
                'SELECT * FROM players WHERE id = ? AND game_id = ?',
                [payload.playerId, gameId]
            );
            if (!player) {
                return error('Player not found in this game', 404, corsHeaders);
            }
            await dbRun(
                db,
                'UPDATE players SET character_id = ? WHERE id = ?',
                [payload.characterId, payload.playerId]
            );
            break;

        case 'REVEAL_CLUE':
            if (!payload.clueId) {
                return error('clueId required', 400, corsHeaders);
            }
            await dbRun(
                db,
                'INSERT OR IGNORE INTO revealed_clues (game_id, clue_id) VALUES (?, ?)',
                [gameId, payload.clueId]
            );
            break;

        case 'RESET':
            await dbRun(db, 'DELETE FROM players WHERE game_id = ? AND is_host = 0', [gameId]);
            await dbRun(db, 'DELETE FROM revealed_clues WHERE game_id = ?', [gameId]);
            await dbRun(
                db,
                "UPDATE games SET phase = 'LOBBY', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [gameId]
            );
            break;

        default:
            return error('Unknown subAction', 400, corsHeaders);
    }

    return json({ success: true }, 200, corsHeaders);
}

// ============================================================================
// Kick Player
// ============================================================================

async function kickPlayer(db, payload, corsHeaders) {
    const { gameId, pin, playerId } = payload;

    // Validate inputs
    const gameIdValidation = validateGameId(gameId);
    if (!gameIdValidation.valid) {
        return error(gameIdValidation.error, 400, corsHeaders);
    }

    const pinValidation = validatePin(pin);
    if (!pinValidation.valid) {
        return error(pinValidation.error, 400, corsHeaders);
    }

    if (!playerId) {
        return error('playerId required', 400, corsHeaders);
    }

    // Verify PIN
    const game = await dbQueryFirst(db, 'SELECT * FROM games WHERE id = ?', [gameId]);
    if (!game) {
        return error('Game not found', 404, corsHeaders);
    }

    const pinValid = await verifyPin(pin, game.host_pin);
    if (!pinValid) {
        return error('Invalid PIN', 403, corsHeaders);
    }

    await dbRun(db, 'DELETE FROM players WHERE id = ? AND game_id = ?', [playerId, gameId]);

    return json({ success: true }, 200, corsHeaders);
}
