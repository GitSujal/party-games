/**
 * Reads and writes the Guess The catalog (KV + R2). Used by the admin API, the seed
 * script's HTTP calls and the game rooms. No Cloudflare imports: bindings are
 * passed in, so the tests run it against in-memory fakes.
 *
 * KV has no transactions. Writes are read-modify-write on one category's key, which is
 * fine for a single admin; two people editing the same category at the same instant can
 * overwrite each other. KV reads can also lag a write by up to a minute at other locations.
 */
import { normalizeAnswer } from '../../../platform/mechanics/answers';
import {
    KV_CATEGORIES,
    MAX_CLUES,
    R2_PREFIX,
    assetKey,
    categoryId,
    categoryInput,
    kvLevelsKey,
    levelInput,
    levelPatch,
    type Catalog,
    type Category,
    type CatalogEnv,
    type Clue,
    type Level,
    type LevelInput,
    type Shape,
    type Snapshot,
} from './types';

export class CatalogError extends Error {
    constructor(
        readonly status: 400 | 404 | 409 | 413 | 415,
        message: string
    ) {
        super(message);
    }
}

const bad = (message: string): never => {
    throw new CatalogError(400, message);
};

const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif' };
const VIDEO_TYPES: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm' };
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 12 * 1024 * 1024;
const FILE_NAME = /^[a-z0-9][a-z0-9._-]{0,63}\.(jpg|png|webp|gif|svg|avif|mp4|webm)$/i;

export const contentTypeOf = (name: string): string => {
    const ext = name.split('.').pop()!.toLowerCase();
    return Object.entries({ ...IMAGE_TYPES, ...VIDEO_TYPES }).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream';
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

const isArray = (v: unknown): v is unknown[] => Array.isArray(v);

export async function listCategories(env: CatalogEnv, cacheTtl?: number): Promise<Category[]> {
    const raw = await env.GUESS_KV.get(KV_CATEGORIES, { type: 'json', cacheTtl });
    return isArray(raw) ? (raw as Category[]) : [];
}

export async function listLevels(env: CatalogEnv, category: string, cacheTtl?: number): Promise<Level[]> {
    const raw = await env.GUESS_KV.get(kvLevelsKey(category), { type: 'json', cacheTtl });
    return isArray(raw) ? (raw as Level[]) : [];
}

/** The whole catalog for a game room. `cacheTtl` (≥ 30 s) lets KV answer from the edge cache. */
export async function loadCatalog(env: CatalogEnv, cacheTtl = 30): Promise<Catalog> {
    const categories = await listCategories(env, cacheTtl);
    const lists = await Promise.all(categories.map(c => listLevels(env, c.id, cacheTtl)));
    return { categories, levels: Object.fromEntries(categories.map((c, i) => [c.id, lists[i]])) };
}

export async function requireCategory(env: CatalogEnv, id: string): Promise<Category> {
    const found = (await listCategories(env)).find(c => c.id === id);
    if (!found) throw new CatalogError(404, `Unknown category "${id}"`);
    return found;
}

export async function getLevel(env: CatalogEnv, category: string, id: string): Promise<Level> {
    await requireCategory(env, category);
    const level = (await listLevels(env, category)).find(l => l.id === id);
    if (!level) throw new CatalogError(404, `No level "${id}" in ${category}`);
    return level;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const slug = (name: string) =>
    name
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32);

export async function createCategory(env: CatalogEnv, input: unknown): Promise<Category> {
    const parsed = categoryInput.safeParse(input);
    if (!parsed.success) bad(parsed.error.issues[0]?.message ?? 'Invalid category');
    const { name, id: given } = parsed.data!;
    const id = given ?? slug(name);
    if (!categoryId.safeParse(id).success) bad('Could not make an id from that name; pass one (2–32 lowercase letters, numbers, dashes)');
    const all = await listCategories(env);
    if (all.some(c => c.id === id)) throw new CatalogError(409, `Category "${id}" already exists`);
    if (all.some(c => c.name.toLowerCase() === name.toLowerCase())) throw new CatalogError(409, `A category named "${name}" already exists`);
    const category = { id, name };
    await env.GUESS_KV.put(KV_CATEGORIES, JSON.stringify([...all, category]));
    await env.GUESS_KV.put(kvLevelsKey(id), '[]');
    return category;
}

/** Rename. The id never changes (levels and asset paths refer to it). */
export async function renameCategory(env: CatalogEnv, id: string, name: unknown): Promise<Category> {
    const parsed = categoryInput.shape.name.safeParse(name);
    if (!parsed.success) bad(parsed.error.issues[0]?.message ?? 'Invalid name');
    const all = await listCategories(env);
    const index = all.findIndex(c => c.id === id);
    if (index === -1) throw new CatalogError(404, `Unknown category "${id}"`);
    if (all.some(c => c.id !== id && c.name.toLowerCase() === parsed.data!.toLowerCase())) throw new CatalogError(409, 'That name is taken');
    all[index] = { id, name: parsed.data! };
    await env.GUESS_KV.put(KV_CATEGORIES, JSON.stringify(all));
    return all[index];
}

/** Put categories in this order (must list every id once). */
export async function reorderCategories(env: CatalogEnv, ids: unknown): Promise<Category[]> {
    const all = await listCategories(env);
    if (!isArray(ids) || ids.length !== all.length || new Set(ids).size !== all.length || !all.every(c => ids.includes(c.id))) bad('Send every category id exactly once');
    const ordered = (ids as string[]).map(id => all.find(c => c.id === id)!);
    await env.GUESS_KV.put(KV_CATEGORIES, JSON.stringify(ordered));
    return ordered;
}

/** Delete a category. A category with levels needs `force`, which also deletes its levels and every file. */
export async function deleteCategory(env: CatalogEnv, id: string, force = false): Promise<{ levels: number; assets: number }> {
    await requireCategory(env, id);
    const levels = await listLevels(env, id);
    if (levels.length && !force) throw new CatalogError(409, `"${id}" still has ${levels.length} level(s). Delete them first or pass force.`);
    const all = await listCategories(env);
    await env.GUESS_KV.put(KV_CATEGORIES, JSON.stringify(all.filter(c => c.id !== id)));
    await env.GUESS_KV.delete(kvLevelsKey(id));
    const assets = await deletePrefix(env, `${R2_PREFIX}${id}/`);
    return { levels: levels.length, assets };
}

async function deletePrefix(env: CatalogEnv, prefix: string): Promise<number> {
    let cursor: string | undefined;
    let count = 0;
    do {
        const page = await env.MEDIA.list({ prefix, cursor });
        if (page.objects.length) await env.MEDIA.delete(page.objects.map(o => o.key));
        count += page.objects.length;
        cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return count;
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

const ownedAsset = (src: string) => !/^https?:\/\//.test(src);

/** Next id in the category's own style: keeps the letter prefix of existing ids ("m5" → "m6"). */
function nextLevelId(category: string, levels: Level[]): string {
    const prefix = levels[0]?.id.match(/^[a-z]+/)?.[0] ?? category[0];
    const next = Math.max(0, ...levels.map(l => Number(l.id.match(/\d+$/)?.[0] ?? 0))) + 1;
    return `${prefix}${next}`;
}

async function checkLevel(env: CatalogEnv, category: string, level: LevelInput, others: Level[]): Promise<void> {
    const names = [level.answer, ...level.accept].map(normalizeAnswer);
    if (names.some(n => !n)) bad('Answers cannot be empty');
    const clash = others.find(o => [o.answer, ...o.accept].some(a => names.includes(normalizeAnswer(a))));
    if (clash) throw new CatalogError(409, `"${clash.answer}" (${clash.id}) already uses that answer or alias`);

    const secrets = names.map(n => n.replace(/ /g, '')).filter(n => n.length > 3);
    for (const { src } of level.clues) {
        if (ownedAsset(src)) {
            if (!src.startsWith(`${category}/`)) bad(`Clue "${src}" belongs to another category`);
            // Public paths are visible to every phone before the reveal.
            const flat = normalizeAnswer(src.slice(category.length + 1).replace(/\.[a-z0-9]+$/i, '')).replace(/ /g, '');
            if (secrets.some(s => flat.includes(s))) bad(`Clue file name "${src}" contains the answer. Upload it again under an opaque name.`);
            if (!(await env.MEDIA.head(assetKey(src)))) bad(`Clue "${src}" has not been uploaded`);
        } else if (secrets.some(s => normalizeAnswer(src).replace(/ /g, '').includes(s))) {
            bad('A clue URL contains the answer; every phone can see it. Upload the file instead.');
        }
    }
}

export async function createLevel(env: CatalogEnv, category: string, input: unknown): Promise<Level> {
    await requireCategory(env, category);
    const parsed = levelInput.safeParse(input);
    if (!parsed.success) bad(`${parsed.error.issues[0]?.path.join('.') || 'level'}: ${parsed.error.issues[0]?.message}`);
    const levels = await listLevels(env, category);
    await checkLevel(env, category, parsed.data!, levels);
    const level: Level = { id: nextLevelId(category, levels), ...parsed.data!, updatedAt: Date.now() };
    await env.GUESS_KV.put(kvLevelsKey(category), JSON.stringify([...levels, level]));
    return level;
}

/** Change any of answer, accept, clues, credits. Clue files no longer used by the level are deleted. */
export async function updateLevel(env: CatalogEnv, category: string, id: string, patch: unknown): Promise<Level> {
    await requireCategory(env, category);
    const parsed = levelPatch.safeParse(patch);
    if (!parsed.success) bad(`${parsed.error.issues[0]?.path.join('.') || 'level'}: ${parsed.error.issues[0]?.message}`);
    const levels = await listLevels(env, category);
    const index = levels.findIndex(l => l.id === id);
    if (index === -1) throw new CatalogError(404, `No level "${id}" in ${category}`);
    const before = levels[index];
    const next: Level = { ...before, ...parsed.data!, id, updatedAt: Date.now() };
    await checkLevel(env, category, next, levels.filter(l => l.id !== id));
    levels[index] = next;
    await env.GUESS_KV.put(kvLevelsKey(category), JSON.stringify(levels));
    await removeUnused(env, category, before.clues, levels);
    return next;
}

export async function deleteLevel(env: CatalogEnv, category: string, id: string): Promise<{ assets: number }> {
    await requireCategory(env, category);
    const levels = await listLevels(env, category);
    const level = levels.find(l => l.id === id);
    if (!level) throw new CatalogError(404, `No level "${id}" in ${category}`);
    const rest = levels.filter(l => l.id !== id);
    await env.GUESS_KV.put(kvLevelsKey(category), JSON.stringify(rest));
    return { assets: await removeUnused(env, category, level.clues, rest) };
}

/** Delete the stored files of `clues` that no remaining level uses. */
async function removeUnused(env: CatalogEnv, category: string, clues: Clue[], remaining: Level[]): Promise<number> {
    const inUse = new Set(remaining.flatMap(l => l.clues.map(c => c.src)));
    const gone = clues.map(c => c.src).filter(src => ownedAsset(src) && !inUse.has(src));
    if (gone.length) await env.MEDIA.delete(gone.map(assetKey));
    return gone.length;
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

/** Pixel size from the file header (PNG, GIF, WebP, JPEG, SVG). Videos need the caller to say. */
export function sniffSize(bytes: Uint8Array, contentType: string): Shape | null {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const ascii = (at: number, n: number) => String.fromCharCode(...bytes.subarray(at, at + n));
    const ok = (w: number, h: number): Shape | null => (w > 0 && h > 0 ? [w, h] : null);
    try {
        if (contentType === 'image/png' && bytes.length > 24) return ok(v.getUint32(16), v.getUint32(20));
        if (contentType === 'image/gif' && bytes.length > 10) return ok(v.getUint16(6, true), v.getUint16(8, true));
        if (contentType === 'image/webp' && ascii(0, 4) === 'RIFF') {
            const kind = ascii(12, 4);
            if (kind === 'VP8X') return ok(1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)), 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)));
            if (kind === 'VP8L') {
                const bits = v.getUint32(21, true);
                return ok((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
            }
            if (kind === 'VP8 ') return ok(v.getUint16(26, true) & 0x3fff, v.getUint16(28, true) & 0x3fff);
        }
        if (contentType === 'image/jpeg') {
            for (let i = 2; i + 9 < bytes.length; ) {
                if (bytes[i] !== 0xff) break;
                const marker = bytes[i + 1];
                if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return ok(v.getUint16(i + 7), v.getUint16(i + 5));
                i += 2 + v.getUint16(i + 2);
            }
        }
        if (contentType === 'image/svg+xml') {
            const head = new TextDecoder().decode(bytes.subarray(0, 2000));
            const box = head.match(/viewBox="[\d.\-]+[ ,]+[\d.\-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/);
            if (box) return ok(Math.round(Number(box[1])), Math.round(Number(box[2])));
        }
    } catch {
        /* truncated file: no shape */
    }
    return null;
}

export interface AssetInput {
    category: string;
    bytes: Uint8Array;
    contentType: string;
    /** Fixed file name (seeding). Omit for a random opaque one. */
    name?: string;
    /** Size to record when it can't be read from the file (videos). */
    size?: Shape;
}

export async function putAsset(env: CatalogEnv, input: AssetInput): Promise<Clue> {
    await requireCategory(env, input.category);
    const type = input.contentType.split(';')[0].trim().toLowerCase();
    const ext = IMAGE_TYPES[type] ?? VIDEO_TYPES[type];
    if (!ext) throw new CatalogError(415, `Unsupported type "${type}". Use ${[...Object.keys(IMAGE_TYPES), ...Object.keys(VIDEO_TYPES)].join(', ')}.`);
    const max = type in VIDEO_TYPES ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (input.bytes.length === 0) bad('The file is empty');
    if (input.bytes.length > max) throw new CatalogError(413, `Too large (${(input.bytes.length / 1048576).toFixed(1)} MB). Limit: ${max / 1048576} MB.`);

    let name = input.name;
    if (name) {
        if (!FILE_NAME.test(name)) bad('File names: letters, numbers, dot, dash, underscore, ending in a media extension');
        if (name.split('.').pop()!.toLowerCase() !== ext && !(ext === 'jpg' && /\.jpe?g$/i.test(name))) bad(`"${name}" does not match its content type ${type}`);
    } else {
        const id = crypto.getRandomValues(new Uint8Array(6));
        name = `${[...id].map(b => b.toString(16).padStart(2, '0')).join('')}.${ext}`;
    }
    const src = `${input.category}/${name}`;
    await env.MEDIA.put(assetKey(src), input.bytes, { httpMetadata: { contentType: type } });
    const shape = sniffSize(input.bytes, type) ?? input.size;
    return shape ? { src, shape } : { src };
}

export interface AssetInfo {
    src: string;
    size: number;
    /** Level ids that use it. Empty = orphan. */
    usedBy: string[];
}

export async function listAssets(env: CatalogEnv, category: string): Promise<AssetInfo[]> {
    await requireCategory(env, category);
    const levels = await listLevels(env, category);
    const out: AssetInfo[] = [];
    let cursor: string | undefined;
    do {
        const page = await env.MEDIA.list({ prefix: `${R2_PREFIX}${category}/`, cursor });
        for (const o of page.objects) {
            const src = o.key.slice(R2_PREFIX.length);
            out.push({ src, size: o.size, usedBy: levels.filter(l => l.clues.some(c => c.src === src)).map(l => l.id) });
        }
        cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return out;
}

/** Delete one stored file. A file a level still uses needs `force` (that level then has a broken clue). */
export async function deleteAsset(env: CatalogEnv, category: string, name: string, force = false): Promise<void> {
    const src = `${category}/${name}`;
    const info = (await listAssets(env, category)).find(a => a.src === src);
    if (!info) throw new CatalogError(404, `No asset "${src}"`);
    if (info.usedBy.length && !force) throw new CatalogError(409, `"${src}" is used by ${info.usedBy.join(', ')}. Edit those levels first or pass force.`);
    await env.MEDIA.delete(assetKey(src));
}

/** Delete every file no level uses. Returns what was removed. */
export async function pruneAssets(env: CatalogEnv, category: string): Promise<string[]> {
    const orphans = (await listAssets(env, category)).filter(a => a.usedBy.length === 0).map(a => a.src);
    if (orphans.length) await env.MEDIA.delete(orphans.map(assetKey));
    return orphans;
}

// ---------------------------------------------------------------------------
// Export / import (backups, moving between environments, seeding)
// ---------------------------------------------------------------------------

export async function exportSnapshot(env: CatalogEnv): Promise<Snapshot> {
    const { categories, levels } = await loadCatalog(env, 0);
    return { categories, levels };
}

/**
 * Write categories and levels exactly as given (ids kept). Existing categories are merged unless
 * `replace` is set. Asset files are not part of a snapshot: upload them with putAsset and a fixed name first.
 */
export async function importSnapshot(env: CatalogEnv, snapshot: Snapshot, replace = false): Promise<{ categories: number; levels: number }> {
    const existing = replace ? [] : await listCategories(env);
    const merged = [...existing];
    let levels = 0;
    for (const c of snapshot.categories) {
        if (!categoryId.safeParse(c.id).success || !c.name) bad(`Bad category "${c.id}"`);
        if (!merged.some(m => m.id === c.id)) merged.push({ id: c.id, name: c.name });
        else merged[merged.findIndex(m => m.id === c.id)] = { id: c.id, name: c.name };
        const list = snapshot.levels[c.id] ?? [];
        for (const l of list) {
            const parsed = levelInput.safeParse(l);
            if (!parsed.success || !l.id) bad(`Bad level ${c.id}/${l.id}: ${parsed.error?.issues[0]?.message ?? 'missing id'}`);
            if (l.clues.length > MAX_CLUES) bad(`Level ${c.id}/${l.id} has too many clues`);
        }
        const current = replace ? [] : await listLevels(env, c.id);
        const byId = new Map(current.map(l => [l.id, l]));
        for (const l of list) byId.set(l.id, { ...l, updatedAt: l.updatedAt ?? Date.now() });
        await env.GUESS_KV.put(kvLevelsKey(c.id), JSON.stringify([...byId.values()]));
        levels += list.length;
    }
    await env.GUESS_KV.put(KV_CATEGORIES, JSON.stringify(merged));
    return { categories: snapshot.categories.length, levels };
}
