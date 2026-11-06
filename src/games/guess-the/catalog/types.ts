/**
 * Guess The content model. It lives in Cloudflare KV (questions) and R2 (clue media),
 * not in the bundle, so it can be edited without a deploy and read by other Workers.
 *
 * KV   gt:categories        Category[]            ordered
 *      gt:levels:<category> Level[]               every level of one category
 * R2   guess-the/<category>/<file>                clue pictures and clips
 *
 * Everything here is SECRET (it holds answers) except the asset files, which are public
 * and therefore must never be named after the answer.
 */
import { z } from 'zod';

export const KV_CATEGORIES = 'gt:categories';
export const kvLevelsKey = (category: string) => `gt:levels:${category}`;
export const R2_PREFIX = 'guess-the/';
export const assetKey = (src: string) => R2_PREFIX + src;
/** Public path clients load a stored clue from. */
export const ASSET_ROUTE = '/api/guess-the/assets/';

export const MAX_CLUES = 5;

export const categoryId = z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{1,31}$/, 'Category id: 2–32 lowercase letters, numbers or dashes');
export const levelId = z.string().regex(/^[a-z][a-z0-9-]{0,15}\d$/, 'Level id looks like "m5"');
/** `<category>/<file>` for a stored asset, or an absolute http(s) URL hosted elsewhere. */
export const clueSrc = z.string().min(3).max(600).refine(s => /^https?:\/\//.test(s) || /^[a-z0-9-]+\/[a-z0-9][a-z0-9._-]*$/i.test(s), 'Clue must be an uploaded asset ("category/file") or an http(s) URL');

export const shape = z.tuple([z.number().int().positive().max(10_000), z.number().int().positive().max(10_000)]);

export const clue = z.object({ src: clueSrc, shape: shape.optional() });

const text = (max: number) => z.string().trim().min(1).max(max);

export const levelInput = z.object({
    answer: text(80),
    accept: z.array(text(80)).max(20).default([]),
    clues: z.array(clue).min(1).max(MAX_CLUES),
    credits: z.array(text(300)).max(10).default([]),
});

export const levelPatch = levelInput.partial();

export const categoryInput = z.object({ id: categoryId.optional(), name: text(40) });

export type Shape = z.infer<typeof shape>;
export type Clue = z.infer<typeof clue>;
export type LevelInput = z.infer<typeof levelInput>;

export interface Level extends LevelInput {
    id: string;
    updatedAt: number;
}

export interface Category {
    id: string;
    name: string;
}

/** Everything a game room needs: loaded once per game, not per action. */
export interface Catalog {
    categories: Category[];
    levels: Record<string, Level[]>;
}

/** The full content, as exported and imported by the admin API. */
export interface Snapshot {
    categories: Category[];
    levels: Record<string, Level[]>;
}

// Minimal structural bindings, so this module runs in the Worker, the tests and the app typecheck.
export interface KVLike {
    get(key: string, options: { type: 'json'; cacheTtl?: number }): Promise<unknown>;
    put(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
}

export interface BucketLike {
    get(key: string): Promise<{ body: ReadableStream; httpEtag: string; size: number; httpMetadata?: { contentType?: string } } | null>;
    head(key: string): Promise<{ size: number } | null>;
    put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
    delete(keys: string | string[]): Promise<void>;
    list(options: { prefix: string; cursor?: string }): Promise<{ objects: { key: string; size: number }[]; truncated: boolean; cursor?: string }>;
}

export interface CatalogEnv {
    GUESS_KV: KVLike;
    MEDIA: BucketLike;
}
