/**
 * Avatar Serving Endpoint
 * Serves images from R2 bucket with proper caching headers
 */

export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const key = url.searchParams.get('key');

        if (!key) {
            return new Response('Missing key parameter', { status: 400 });
        }

        // Security: Only allow avatar paths
        if (!key.startsWith('avatars/')) {
            return new Response('Invalid key', { status: 403 });
        }

        if (!env.AVATARS) {
            return new Response('Storage not configured', { status: 503 });
        }

        // Fetch from R2
        const object = await env.AVATARS.get(key);

        if (!object) {
            return new Response('Avatar not found', { status: 404 });
        }

        // Serve with proper headers
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('cache-control', 'public, max-age=31536000, immutable'); // Cache for 1 year
        headers.set('access-control-allow-origin', '*'); // Allow CORS

        return new Response(object.body, {
            headers
        });
    } catch (err) {
        console.error('Avatar serving error:', err);
        return new Response('Internal server error', { status: 500 });
    }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}
