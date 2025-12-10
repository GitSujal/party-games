/**
 * Game Cleanup Cron Job
 * Deletes expired games and associated data
 *
 * Configure in wrangler.toml:
 * [triggers]
 * crons = ["0 * * * *"]  # Run every hour
 */

export async function onRequest(context) {
    const { request, env } = context;

    // Security: Only allow cron triggers or requests with auth header
    const authHeader = request.headers.get('X-Cron-Auth');
    const expectedAuth = env.CRON_SECRET || 'default-secret-change-me';

    // Check if it's a cron trigger or has valid auth
    const isCronTrigger = request.headers.get('CF-Worker-Cron') !== null;
    const hasValidAuth = authHeader === expectedAuth;

    if (!isCronTrigger && !hasValidAuth) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const db = env.murder_mystery_db;
    if (!db) {
        return new Response(JSON.stringify({ error: 'Database not available' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const now = new Date().toISOString();

        // Find expired games
        const expiredGames = await db.prepare(
            'SELECT id FROM games WHERE expires_at < ?'
        ).bind(now).all();

        if (!expiredGames.results || expiredGames.results.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: 'No expired games to clean up',
                cleaned: 0
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const gameIds = expiredGames.results.map(g => g.id);
        let deletedCount = 0;

        // Delete each expired game (cascade will handle players and clues)
        for (const gameId of gameIds) {
            await db.prepare('DELETE FROM games WHERE id = ?').bind(gameId).run();
            deletedCount++;
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Cleaned up ${deletedCount} expired game(s)`,
            cleaned: deletedCount,
            gameIds: gameIds
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Cleanup failed'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
