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
// R2 Image Storage (AES-256 encrypted at rest by default)
// ============================================================================

/**
 * Upload a base64 image to R2 and return the public URL
 * @param {R2Bucket} r2Bucket - The R2 bucket binding
 * @param {string} base64Image - Base64-encoded image data
 * @param {string} key - Unique key for the image (e.g., "avatars/player-{id}-original.jpg")
 * @returns {Promise<string>} - Public URL to the uploaded image
 */
async function uploadImageToR2(r2Bucket, base64Image, key) {
    try {
        // Remove data URL prefix if present
        const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

        // Convert base64 to binary
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Determine content type
        let contentType = 'image/jpeg';
        if (base64Image.includes('data:image/png')) contentType = 'image/png';
        else if (base64Image.includes('data:image/webp')) contentType = 'image/webp';

        // Upload to R2
        await r2Bucket.put(key, bytes, {
            httpMetadata: {
                contentType: contentType
            }
        });

        // Return the key (will be used to construct URL)
        return key;
    } catch (err) {
        console.error('R2 upload error:', err);
        throw new Error('Failed to upload image to storage');
    }
}

/**
 * Get an image from R2 and convert to base64
 * @param {R2Bucket} r2Bucket - The R2 bucket binding
 * @param {string} key - The key of the image to retrieve
 * @returns {Promise<string>} - Base64-encoded image with data URL prefix
 */
async function getImageFromR2(r2Bucket, key) {
    try {
        const object = await r2Bucket.get(key);
        if (!object) {
            throw new Error('Image not found in R2');
        }

        const arrayBuffer = await object.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Convert to base64 using chunked approach to avoid stack overflow
        let binaryString = '';
        const chunkSize = 1024; // Process 1KB at a time (smaller chunks to avoid stack overflow)
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
            binaryString += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64 = btoa(binaryString);

        // Get content type from metadata
        const contentType = object.httpMetadata?.contentType || 'image/jpeg';

        return `data:${contentType};base64,${base64}`;
    } catch (err) {
        console.error('R2 fetch error:', err);
        throw new Error('Failed to retrieve image from storage');
    }
}

/**
 * Delete an image from R2
 * @param {R2Bucket} r2Bucket - The R2 bucket binding
 * @param {string} key - The key of the image to delete
 */
async function deleteImageFromR2(r2Bucket, key) {
    try {
        if (key && key.startsWith('avatars/')) {
            await r2Bucket.delete(key);
        }
    } catch (err) {
        console.error('R2 delete error:', err);
        // Don't throw - deletion failures shouldn't break the game
    }
}

/**
 * Convert R2 key to public avatar URL
 * @param {string} key - The R2 object key
 * @param {string} origin - Request origin (e.g., http://localhost:3000)
 * @returns {string|null} - Public URL or null if no key
 */
function r2KeyToUrl(key, origin) {
    if (!key) return null;
    // Use our avatar serving endpoint
    return `${origin}/api/avatar?key=${encodeURIComponent(key)}`;
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
            limit = 1;
            window = 300000; // 1 per 5 minutes
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
// Avatar Generation with Gemini API
// ============================================================================

async function generateAvatar(base64Image, apiKey, characterInfo) {
    console.log('>>> generateAvatar called');
    console.log('Image data length:', base64Image ? base64Image.length : 0);
    console.log('Character:', characterInfo);
    console.log('API Key present:', !!apiKey);

    const systemPrompt = `**SYSTEM ROLE:**
You are a high-fidelity cinematic portrait engine specializing in "Character Identity Synthesis." Your objective is to merge a **User Reference Image** with a **Fictional Character Description** to create a seamless, photorealistic murder mystery avatar.

**⚠️ PRIME DIRECTIVE: FACE ID PRESERVATION**
*   **Target:** Facial geometry, bone structure, eye shape, nose bridge, jawline, and skin imperfections (freckles/scars) are **IMMUTABLE**.
*   **Action:** You must "paint" the new character attributes *around* the user's true face.
*   **Constraint:** Never idealize, beautify, or genericize the user's face. If the user looks 40, the avatar looks 40. The output must be instantly recognizable as the specific user.

**AESTHETIC PARAMETERS:**
*   **Visual Style:** Cinematic 8K, Photorealistic, Dramatic Lighting (Rembrandt/Chiaroscuro).
*   **Texture Quality:** Ultra-high. Visible skin pores, fabric weaves, and cinematic film grain.
*   **Composition:** Upper-torso portrait, shallow depth of field (bokeh background).

**GENERATION LOGIC (Step-by-Step):**

1.  **Ingest User Identity:** Lock facial feature points from the provided selfie.
2.  **Apply Character Layer:**
    *   **Hair:** Style according to character description but anchor to user's hairline/color unless specified otherwise.
    *   **Attire:** Apply character-appropriate clothing based on text prompt.
    *   **Expression:** Micro-adjust user's expression only if prompted (e.g., "suspicious glare"), otherwise maintain source neutrality.
3.  **Set the Scene:** Generate atmospheric background (dim library, foggy street, ballroom) matching the character archetype.
4.  **Lighting Integration:** Ensure lighting direction on the face matches the new environment. Fix shadows to prevent "floating head" syndrome.

**⛔ NEGATIVE CONSTRAINTS (Strictly Prohibited):**
*   [NO] Cartoon, anime, painterly, or illustrative styles.
*   [NO] Altering the user's ethnicity, age (unless applying theatrical makeup), or gender presentation.
*   [NO] Plastic/smooth skin filtering.
*   [NO] Mismatched lighting temperatures between face and body.

**OUTPUT GOAL:**
A print-ready, photorealistic JPG/PNG that evokes the feeling: *"I have been transported to a cinematic crime scene."*`;

    // Extract base64 data (remove data:image/jpeg;base64, prefix if present)
    const imageData = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    // Determine mime type from base64 prefix
    let mimeType = 'image/jpeg';
    if (base64Image.includes('data:image/png')) {
        mimeType = 'image/png';
    } else if (base64Image.includes('data:image/webp')) {
        mimeType = 'image/webp';
    }

    const requestBody = {
        contents: [{
            parts: [
                {
                    text: `${systemPrompt}

Transform this person into the following murder mystery character while preserving their exact facial features:

**Character Name:** ${characterInfo.name}
**Role:** ${characterInfo.role}
**Description:** ${characterInfo.description}

Apply character accurate clothing, hairstyle, and atmospheric background that matches this character's role and personality. The character should look like a professional film still from a cinematic murder mystery movie. Ensure the person's face remains completely recognizable while embodying this specific character's essence.`
                },
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: imageData
                    }
                }
            ]
        }]
    };

    console.log('>>> Calling Gemini API...');
    console.log('Request body size:', JSON.stringify(requestBody).length);

    // Use Gemini image generation model
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        }
    );

    console.log('>>> Gemini API response status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('>>> Gemini API error response:', errorText);
        throw new Error(`Avatar generation failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('>>> Response received, parsing data...');
    console.log('Has candidates:', !!data.candidates);
    console.log('Candidates length:', data.candidates?.length || 0);

    // Extract generated image from response (check all parts for inlineData)
    if (data.candidates?.[0]?.content?.parts) {
        const parts = data.candidates[0].content.parts;
        console.log('Number of parts:', parts.length);

        for (const part of parts) {
            if (part.inlineData) {
                console.log('>>> Image found in part, mime type:', part.inlineData.mimeType);
                console.log('>>> Generated image data length:', part.inlineData.data.length);
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            } else if (part.text) {
                console.log('>>> Text part found:', part.text.substring(0, 200));
            }
        }
    }

    console.error('>>> No image data in response structure:', JSON.stringify(data).substring(0, 500));
    throw new Error('No image data in Gemini response');
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

            return await getGameState(db, gameId, url.origin, corsHeaders);
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

            if (action === 'CREATE_SESSION') {
                const rateLimitError = checkRateLimit(ip, action, corsHeaders);
                if (rateLimitError) {
                    // Start of recovery logic
                    try {
                        // Find most recent active game for this host IP
                        const recentGame = await dbQueryFirst(
                            db,
                            "SELECT g.id FROM games g JOIN players p ON g.id = p.game_id WHERE p.ip_address = ? AND p.is_host = 1 AND g.phase != 'FINISHED' ORDER BY g.created_at DESC LIMIT 1",
                            [ip]
                        );

                        if (recentGame) {
                            return json({
                                error: "Rate limit exceeded. You can only create one game every 5 minutes.",
                                existingGameId: recentGame.id
                            }, 429, corsHeaders);
                        }
                    } catch (err) {
                        console.error('Error finding recent game:', err);
                    }
                    // End of recovery logic
                    return rateLimitError;
                }
                return await createSession(db, payload || {}, corsHeaders);
            }

            const rateLimitError = checkRateLimit(ip, action, corsHeaders);
            if (rateLimitError) return rateLimitError;

            switch (action) {
                // case 'CREATE_SESSION': handled above
                case 'JOIN':
                    return await joinGame(db, payload || {}, ip, env, url.origin, corsHeaders);
                case 'ADMIN_ACTION':
                    return await adminAction(db, payload || {}, env, corsHeaders);
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

async function getGameState(db, gameId, origin, corsHeaders) {
    const game = await dbQueryFirst(db, 'SELECT * FROM games WHERE id = ?', [gameId]);
    if (!game) {
        return error('Game not found', 404, corsHeaders);
    }

    const playersResult = await dbQuery(
        db,
        'SELECT id, name, character_id, avatar_url, is_host FROM players WHERE game_id = ?',
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
            avatarUrl: r2KeyToUrl(p.avatar_url, origin), // Convert R2 key to URL
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

async function joinGame(db, payload, ip, env, origin, corsHeaders) {
    const { gameId, name, avatarImage } = payload;

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
                    avatarUrl: r2KeyToUrl(existingByIp.avatar_url, origin), // Convert R2 key to URL
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

    // Upload avatar to R2 if provided
    let originalImageKey = null;
    let avatarUrlKey = null;

    if (avatarImage && env.AVATARS) {
        try {
            // Upload original image to R2
            const originalKey = `avatars/${gameId}/${playerId}/original.jpg`;
            await uploadImageToR2(env.AVATARS, avatarImage, originalKey);
            originalImageKey = originalKey;
            avatarUrlKey = originalKey; // Initially same as original
        } catch (err) {
            console.error('Failed to upload avatar to R2:', err);
            // Continue without avatar rather than failing the join
        }
    }

    // Store R2 keys in database (not the actual image data)
    await dbRun(
        db,
        'INSERT INTO players (id, game_id, name, ip_address, original_image, avatar_url) VALUES (?, ?, ?, ?, ?, ?)',
        [playerId, gameId, name, ip, originalImageKey, avatarUrlKey]
    );

    return json({
        player: { id: playerId, name, characterId: null, isHost: false, avatarUrl: r2KeyToUrl(avatarUrlKey, origin) }
    }, 200, corsHeaders);
}

// ============================================================================
// Admin Actions
// ============================================================================

async function adminAction(db, payload, env, corsHeaders) {
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
        case 'VERIFY_HOST':
            // If we got here, PIN is already verified above
            return json({ success: true, gameId }, 200, corsHeaders);

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

            // Update character assignment
            await dbRun(
                db,
                'UPDATE players SET character_id = ? WHERE id = ?',
                [payload.characterId, payload.playerId]
            );

            console.log('=== AVATAR GENERATION DEBUG ===');
            console.log('Player ID:', payload.playerId);
            console.log('Character ID:', payload.characterId);
            console.log('Has original_image key:', !!player.original_image);
            console.log('Has characterInfo:', !!payload.characterInfo);
            console.log('Character Info:', payload.characterInfo);
            console.log('Has GEMINI_API_KEY:', !!env.GEMINI_API_KEY);
            console.log('Has R2 bucket:', !!env.AVATARS);
            console.log('Avatar already generated for character:', player.avatar_generated_for_character);

            // Check if we need to generate avatar
            const needsGeneration = player.original_image &&
                payload.characterInfo &&
                env.GEMINI_API_KEY &&
                env.AVATARS &&
                player.avatar_generated_for_character !== payload.characterId;

            if (needsGeneration) {
                console.log('✓ Generating new avatar for character:', payload.characterInfo.name);
                try {
                    // Fetch original image from R2
                    console.log('→ Fetching original image from R2:', player.original_image);
                    const originalImageBase64 = await getImageFromR2(env.AVATARS, player.original_image);

                    // Generate AI avatar
                    console.log('→ Calling Gemini API to generate avatar...');
                    const aiAvatarBase64 = await generateAvatar(
                        originalImageBase64,
                        env.GEMINI_API_KEY,
                        payload.characterInfo
                    );

                    console.log('✓ Avatar generated successfully');

                    // Upload generated avatar to R2
                    const generatedKey = `avatars/${gameId}/${payload.playerId}/generated-${payload.characterId}.jpg`;
                    console.log('→ Uploading generated avatar to R2:', generatedKey);
                    await uploadImageToR2(env.AVATARS, aiAvatarBase64, generatedKey);

                    // Update player's avatar with R2 key and mark as generated
                    await dbRun(
                        db,
                        'UPDATE players SET avatar_url = ?, avatar_generated_for_character = ? WHERE id = ?',
                        [generatedKey, payload.characterId, payload.playerId]
                    );

                    console.log('✓ Avatar uploaded to R2 and database updated');
                } catch (err) {
                    console.error('✗ Avatar generation failed:', err);
                    console.error('Error stack:', err.stack);
                    // Continue with original image if generation fails
                }
            } else if (player.avatar_generated_for_character === payload.characterId) {
                console.log('⚡ Using cached avatar - already generated for this character');
            } else {
                console.log('✗ Avatar generation skipped:');
                if (!player.original_image) console.log('  - No original_image key');
                if (!payload.characterInfo) console.log('  - No characterInfo');
                if (!env.GEMINI_API_KEY) console.log('  - No GEMINI_API_KEY');
                if (!env.AVATARS) console.log('  - No R2 bucket');
            }
            console.log('==============================');
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
