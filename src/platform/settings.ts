import type { GameMeta, Settings } from './sdk';

/** Defaults for every declared setting. */
export function defaultSettings(meta: GameMeta): Settings {
    const out: Settings = {};
    for (const field of meta.settings ?? []) out[field.key] = field.default;
    return out;
}

/**
 * Merge user-provided settings onto defaults, dropping unknown keys and
 * coercing/clamping values to what the game declared.
 */
export function resolveSettings(meta: GameMeta, input: Record<string, unknown> = {}): Settings {
    const out = defaultSettings(meta);
    for (const field of meta.settings ?? []) {
        const raw = input[field.key];
        if (raw === undefined) continue;
        switch (field.type) {
            case 'number': {
                const n = Number(raw);
                if (Number.isFinite(n)) out[field.key] = Math.min(field.max, Math.max(field.min, n));
                break;
            }
            case 'select':
                if (field.options.some(o => o.value === raw)) out[field.key] = raw as string;
                break;
            case 'boolean':
                out[field.key] = raw === true || raw === 'true';
                break;
        }
    }
    return out;
}
