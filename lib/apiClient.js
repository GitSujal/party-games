/**
 * API Client
 * Wrapper for communicating with the Cloudflare Pages Function API
 */

const API_BASE = '/api/game';

async function apiRequest(method, params = {}, body = null) {
    const url = new URL(API_BASE, window.location.origin);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const res = await fetch(url.toString(), options);

    // Try to parse JSON, handle non-JSON responses
    let data;
    try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
    } catch (e) {
        throw new Error(`Server returned invalid response (${res.status})`);
    }

    if (!res.ok) {
        throw new Error(data.error || 'API request failed');
    }

    return data;
}

/**
 * Get game state
 */
export async function getGameState(gameId) {
    return apiRequest('GET', { gameId });
}

/**
 * Create a new game session
 */
export async function createSession(gameType, minPlayers, hostName = 'HOST') {
    return apiRequest('POST', {}, {
        action: 'CREATE_SESSION',
        payload: { gameType, minPlayers, name: hostName }
    });
}

/**
 * Join an existing game
 */
export async function joinGame(gameId, name, avatarImage = null) {
    return apiRequest('POST', {}, {
        action: 'JOIN',
        payload: { gameId, name, avatarImage }
    });
}

/**
 * Admin action (requires PIN)
 */
export async function adminAction(gameId, pin, subAction, payload = {}) {
    return apiRequest('POST', {}, {
        action: 'ADMIN_ACTION',
        payload: { gameId, pin, subAction, ...payload }
    });
}

/**
 * Kick a player (requires PIN)
 */
export async function kickPlayer(gameId, pin, playerId) {
    return apiRequest('POST', {}, {
        action: 'KICK',
        payload: { gameId, pin, playerId }
    });
}

// Convenience wrappers for common admin actions
export const setPhase = (gameId, pin, phase) =>
    adminAction(gameId, pin, 'SET_PHASE', { phase });

export const assignCharacter = (gameId, pin, playerId, characterId, characterInfo = null) =>
    adminAction(gameId, pin, 'ASSIGN_CHARACTER', { playerId, characterId, characterInfo });

export const revealClue = (gameId, pin, clueId) =>
    adminAction(gameId, pin, 'REVEAL_CLUE', { clueId });

export const resetGame = (gameId, pin) =>
    adminAction(gameId, pin, 'RESET');

/**
 * Restart imposter game with new word (keeps all players)
 */
export const restartImposterGame = (gameId, pin, newWord) =>
    adminAction(gameId, pin, 'RESET', { keepPlayers: true, newWord });

export const changeWord = (gameId, pin, newWord) =>
    adminAction(gameId, pin, 'CHANGE_WORD', { newWord });

export const verifyHost = (gameId, pin) =>
    adminAction(gameId, pin, 'VERIFY_HOST');

/**
 * Cast a vote (Imposter game)
 */
export async function castVote(gameId, playerId, votedForId) {
    return apiRequest('POST', {}, {
        action: 'CAST_VOTE',
        payload: { gameId, playerId, votedForId }
    });
}

/**
 * Finalize voting and calculate elimination (Host only)
 */
export const finalizeVoting = (gameId, pin) =>
    adminAction(gameId, pin, 'FINALIZE_VOTING');
