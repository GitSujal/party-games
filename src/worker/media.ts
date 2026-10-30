/**
 * Media service: player photos in R2 and photo-to-portrait generation with Gemini.
 * All keys live under rooms/<CODE>/ so a room's media is deleted with the room.
 */
import type { MediaService } from '../platform/sdk';

const MEDIA_ROUTE = '/api/media/';

export function mediaPrefix(roomCode: string): string {
    return `rooms/${roomCode}/`;
}

export function mediaUrl(key: string): string {
    return MEDIA_ROUTE + key;
}

export function keyFromMediaPath(pathname: string): string | null {
    if (!pathname.startsWith(MEDIA_ROUTE)) return null;
    const key = decodeURIComponent(pathname.slice(MEDIA_ROUTE.length));
    return key.startsWith('rooms/') && !key.includes('..') ? key : null;
}

function parseDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } {
    const match = /^data:(image\/[a-z]+);base64,(.*)$/s.exec(dataUrl);
    if (!match) throw new Error('Expected an image data URL');
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, contentType: match[1] };
}

function toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

export async function putDataUrl(bucket: R2Bucket, key: string, dataUrl: string): Promise<void> {
    const { bytes, contentType } = parseDataUrl(dataUrl);
    await bucket.put(key, bytes, { httpMetadata: { contentType } });
}

export async function deletePrefix(bucket: R2Bucket, prefix: string): Promise<void> {
    let cursor: string | undefined;
    do {
        const page = await bucket.list({ prefix, cursor });
        if (page.objects.length) await bucket.delete(page.objects.map(o => o.key));
        cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
}

// ---------------------------------------------------------------------------
// Gemini image generation
// ---------------------------------------------------------------------------

const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];
const REQUEST_TIMEOUT_MS = 60_000;

class RetryableError extends Error {}

async function callGemini(apiKey: string, model: string, prompt: string, image: { mimeType: string; data: string }) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: image }] }] }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
        const detail = (await res.text()).slice(0, 300);
        const message = `Gemini ${model} returned ${res.status}: ${detail}`;
        if (res.status === 429 || res.status >= 500) throw new RetryableError(message);
        throw new Error(message);
    }
    const data = (await res.json()) as {
        candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[];
    };
    const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error('Gemini response contained no image');
    return part.inlineData;
}

/**
 * Try the primary model, retrying transient failures; switch to the fallback
 * model after the second failed attempt.
 */
async function generateImage(env: Env, prompt: string, image: { mimeType: string; data: string }) {
    const apiKey = env.GEMINI_API_KEY!;
    let lastError: unknown;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        const model = attempt >= 2 && env.GEMINI_FALLBACK_MODEL ? env.GEMINI_FALLBACK_MODEL : env.GEMINI_MODEL;
        try {
            return await callGemini(apiKey, model, prompt, image);
        } catch (err) {
            lastError = err;
            const retryable = err instanceof RetryableError || (err instanceof Error && err.name === 'TimeoutError');
            if (!retryable || attempt === RETRY_DELAYS_MS.length) break;
            await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        }
    }
    throw lastError;
}

export function createMediaService(env: Env): MediaService {
    const bucket = env.MEDIA as R2Bucket | undefined;
    return {
        storage: !!bucket,
        imageGeneration: !!bucket && !!env.GEMINI_API_KEY,
        url: mediaUrl,
        async generateFromPhoto({ photoKey, prompt, outKey }) {
            if (!bucket || !env.GEMINI_API_KEY) throw new Error('Image generation is not configured');
            const source = await bucket.get(photoKey);
            if (!source) throw new Error('Source photo not found');
            const bytes = new Uint8Array(await source.arrayBuffer());
            const mimeType = source.httpMetadata?.contentType ?? 'image/jpeg';

            const generated = await generateImage(env, prompt, { mimeType, data: toBase64(bytes) });
            await putDataUrl(bucket, outKey, `data:${generated.mimeType};base64,${generated.data}`);
            return outKey;
        },
    };
}
