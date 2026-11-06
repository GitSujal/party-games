import type { Random } from '../sdk';

/** Uniform integer in [0, max) from the platform CSPRNG, without modulo bias. */
function cryptoInt(max: number): number {
    if (!Number.isInteger(max) || max <= 0) throw new Error('max must be a positive integer');
    const limit = Math.floor(0x1_0000_0000 / max) * max;
    const buf = new Uint32Array(1);
    let x: number;
    do {
        crypto.getRandomValues(buf);
        x = buf[0];
    } while (x >= limit);
    return x % max;
}

/** Build a Random from any integer source (tests pass a seeded one). */
export function createRandom(int: (max: number) => number = cryptoInt): Random {
    return {
        int,
        pick(items) {
            if (items.length === 0) throw new Error('Cannot pick from an empty list');
            return items[int(items.length)];
        },
        shuffle(items) {
            const out = [...items];
            for (let i = out.length - 1; i > 0; i--) {
                const j = int(i + 1);
                [out[i], out[j]] = [out[j], out[i]];
            }
            return out;
        },
    };
}

/** Deterministic Random for tests (mulberry32). */
export function seededRandom(seed: number): Random {
    let a = seed >>> 0;
    const next = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return createRandom(max => Math.floor(next() * max));
}

export const random = createRandom();
