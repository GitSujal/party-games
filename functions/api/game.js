/**
 * Murder Mystery Platform - Game API
 * Cloudflare Pages Function
 */

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);
const generateGameId = () => Math.random().toString(36).substr(2, 6).toUpperCase();
const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// JSON response helper
const json = (data, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
});

// Error response helper
const error = (message, status = 400) => json({ error: message }, status);

export async function onRequest(context) {
    const { request, env } = context;
    const db = env.murder_mystery_db; // Updated to match wrangler.toml binding

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    try {
        // GET - Fetch game state
        if (request.method === 'GET') {
            const gameId = url.searchParams.get('gameId');
            if (!gameId) return error('gameId required');

            return await getGameState(db, gameId);
        }

        // POST - Actions
        if (request.method === 'POST') {
            const body = await request.json();
            const { action, payload } = body;

            switch (action) {
                case 'CREATE_SESSION':
                    return await createSession(db, payload);
                case 'JOIN':
                    return await joinGame(db, payload, ip, env);
                case 'ADMIN_ACTION':
                    return await adminAction(db, payload);
                case 'KICK':
                    return await kickPlayer(db, payload);
                default:
                    return error('Unknown action');
            }
        }

        return error('Method not allowed', 405);
    } catch (e) {
        console.error('API Error:', e);
        return error(e.message || 'Internal server error', 500);
    }
}

// Get game state
async function getGameState(db, gameId) {
    const game = await db.prepare('SELECT * FROM games WHERE id = ?').bind(gameId).first();
    if (!game) return error('Game not found', 404);

    const players = await db.prepare('SELECT id, name, character_id, is_host FROM players WHERE game_id = ?').bind(gameId).all();
    const clues = await db.prepare('SELECT clue_id FROM revealed_clues WHERE game_id = ?').bind(gameId).all();

    return json({
        gameId: game.id,
        gameType: game.game_type,
        phase: game.phase,
        minPlayers: game.min_players,
        players: players.results.map(p => ({
            id: p.id,
            name: p.name,
            characterId: p.character_id,
            isHost: !!p.is_host
        })),
        revealedClues: clues.results.map(c => c.clue_id)
    });
}

// Create new session
async function createSession(db, payload) {
    const { gameType = 'momo_massacre', minPlayers = 4, name = 'HOST' } = payload;

    const gameId = generateGameId();
    const hostPin = generatePin();
    const hostId = generateId();

    // Create game
    await db.prepare(
        'INSERT INTO games (id, game_type, host_pin, min_players) VALUES (?, ?, ?, ?)'
    ).bind(gameId, gameType, hostPin, minPlayers).run();

    // Create host player
    await db.prepare(
        'INSERT INTO players (id, game_id, name, is_host) VALUES (?, ?, ?, 1)'
    ).bind(hostId, gameId, name).run();

    return json({
        gameId,
        hostPin,
        player: { id: hostId, name, isHost: true }
    });
}

// Join game
async function joinGame(db, payload, ip, env) {
    const { gameId, name } = payload;
    if (!gameId || !name) return error('gameId and name required');

    // Check game exists
    const game = await db.prepare('SELECT * FROM games WHERE id = ?').bind(gameId).first();
    if (!game) return error('Game not found');

    // Check if IP limiting is enabled (default: true)
    const ipLimitEnabled = env.IP_PLAYER_LIMIT !== 'false';

    // Check if IP already has a player in this game (IP locking)
    if (ipLimitEnabled) {
        const existingByIp = await db.prepare(
            'SELECT * FROM players WHERE game_id = ? AND ip_address = ? AND is_host = 0'
        ).bind(gameId, ip).first();

        if (existingByIp) {
            return json({
                player: {
                    id: existingByIp.id,
                    name: existingByIp.name,
                    characterId: existingByIp.character_id,
                    isHost: false
                }
            });
        }
    }

    // Check for duplicate name
    const existingByName = await db.prepare(
        'SELECT * FROM players WHERE game_id = ? AND LOWER(name) = LOWER(?)'
    ).bind(gameId, name).first();

    if (existingByName) return error('Name already taken!');

    // Create player
    const playerId = generateId();
    await db.prepare(
        'INSERT INTO players (id, game_id, name, ip_address) VALUES (?, ?, ?, ?)'
    ).bind(playerId, gameId, name, ip).run();

    return json({
        player: { id: playerId, name, characterId: null, isHost: false }
    });
}

// Admin actions (require PIN)
async function adminAction(db, payload) {
    const { gameId, pin, subAction } = payload;
    if (!gameId || !pin) return error('gameId and pin required');

    // Verify PIN
    const game = await db.prepare('SELECT * FROM games WHERE id = ?').bind(gameId).first();
    if (!game || game.host_pin !== pin) return error('Invalid PIN');

    switch (subAction) {
        case 'SET_PHASE':
            await db.prepare('UPDATE games SET phase = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .bind(payload.phase, gameId).run();
            break;

        case 'ASSIGN_CHARACTER':
            await db.prepare('UPDATE players SET character_id = ? WHERE id = ?')
                .bind(payload.characterId, payload.playerId).run();
            break;

        case 'REVEAL_CLUE':
            await db.prepare(
                'INSERT OR IGNORE INTO revealed_clues (game_id, clue_id) VALUES (?, ?)'
            ).bind(gameId, payload.clueId).run();
            break;

        case 'RESET':
            await db.prepare('DELETE FROM players WHERE game_id = ? AND is_host = 0').bind(gameId).run();
            await db.prepare('DELETE FROM revealed_clues WHERE game_id = ?').bind(gameId).run();
            await db.prepare("UPDATE games SET phase = 'LOBBY', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(gameId).run();
            break;

        default:
            return error('Unknown subAction');
    }

    return json({ success: true });
}

// Kick player
async function kickPlayer(db, payload) {
    const { gameId, pin, playerId } = payload;
    if (!gameId || !pin || !playerId) return error('gameId, pin, and playerId required');

    // Verify PIN
    const game = await db.prepare('SELECT * FROM games WHERE id = ?').bind(gameId).first();
    if (!game || game.host_pin !== pin) return error('Invalid PIN');

    await db.prepare('DELETE FROM players WHERE id = ? AND game_id = ?').bind(playerId, gameId).run();

    return json({ success: true });
}
