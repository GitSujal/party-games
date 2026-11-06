import { ROOM_CODE_ALPHABET } from '../platform/protocol';
import { random } from '../platform/mechanics/random';

export async function sha256Hex(input: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** URL-safe random token (default 192 bits). */
export function randomToken(bytes = 24): string {
    const buf = crypto.getRandomValues(new Uint8Array(bytes));
    return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomPin(): string {
    return String(1000 + random.int(9000));
}

export function randomRoomCode(length = 4): string {
    let code = '';
    for (let i = 0; i < length; i++) code += ROOM_CODE_ALPHABET[random.int(ROOM_CODE_ALPHABET.length)];
    return code;
}

/** Constant-time comparison for equal-length hex strings. */
export function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}
