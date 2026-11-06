import { describe, expect, it } from 'vitest';
import {
    CatalogError,
    createCategory,
    createLevel,
    deleteAsset,
    deleteCategory,
    deleteLevel,
    exportSnapshot,
    getLevel,
    importSnapshot,
    listAssets,
    listCategories,
    listLevels,
    loadCatalog,
    pruneAssets,
    putAsset,
    renameCategory,
    reorderCategories,
    sniffSize,
    updateLevel,
} from '../../src/games/guess-the/catalog/store';
import type { BucketLike, CatalogEnv } from '../../src/games/guess-the/catalog/types';
import { adminApi, publicApi } from '../../src/worker/guess-the-api';
import { catalog as seed } from '../fixtures/guess-the-catalog';

/** In-memory KV and R2, enough for the store and the API. */
function fakeEnv() {
    const kv = new Map<string, string>();
    const files = new Map<string, { bytes: Uint8Array; type: string }>();
    const MEDIA: BucketLike = {
        get: async key => {
            const f = files.get(key);
            return f ? { body: new Blob([f.bytes as BlobPart]).stream(), httpEtag: '"x"', size: f.bytes.length, httpMetadata: { contentType: f.type } } : null;
        },
        head: async key => (files.has(key) ? { size: files.get(key)!.bytes.length } : null),
        put: async (key, value, options) => void files.set(key, { bytes: new Uint8Array(value as ArrayBuffer), type: options?.httpMetadata?.contentType ?? '' }),
        delete: async keys => void [keys].flat().forEach(k => files.delete(k)),
        list: async ({ prefix }) => ({ objects: [...files].filter(([k]) => k.startsWith(prefix)).map(([key, f]) => ({ key, size: f.bytes.length })), truncated: false }),
    };
    const env: CatalogEnv = {
        GUESS_KV: { get: async key => (kv.has(key) ? JSON.parse(kv.get(key)!) : null), put: async (key, value) => void kv.set(key, value), delete: async key => void kv.delete(key) },
        MEDIA,
    };
    return { env, kv, files };
}

/** A real 2x1 PNG header is enough for size sniffing. */
const png = (w: number, h: number) => {
    const b = new Uint8Array(33);
    b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const v = new DataView(b.buffer);
    v.setUint32(16, w);
    v.setUint32(20, h);
    return b;
};

const rejects = async (p: Promise<unknown>, status: number, message?: RegExp) => {
    const err = await p.then(() => null, e => e);
    expect(err).toBeInstanceOf(CatalogError);
    expect((err as CatalogError).status).toBe(status);
    if (message) expect((err as CatalogError).message).toMatch(message);
};

async function withCategory() {
    const f = fakeEnv();
    await createCategory(f.env, { name: 'Sports Person' });
    return f;
}

describe('guess-the catalog: categories', () => {
    it('creates, lists, renames, reorders and deletes', async () => {
        const { env } = fakeEnv();
        expect(await createCategory(env, { name: 'Sports Person' })).toEqual({ id: 'sports-person', name: 'Sports Person' });
        await createCategory(env, { name: 'Word', id: 'words' });
        expect((await listCategories(env)).map(c => c.id)).toEqual(['sports-person', 'words']);

        await renameCategory(env, 'words', 'Phrase');
        expect((await listCategories(env))[1]).toEqual({ id: 'words', name: 'Phrase' });

        await reorderCategories(env, ['words', 'sports-person']);
        expect((await listCategories(env)).map(c => c.id)).toEqual(['words', 'sports-person']);
        await rejects(reorderCategories(env, ['words']), 400);

        await deleteCategory(env, 'words');
        expect((await listCategories(env)).map(c => c.id)).toEqual(['sports-person']);
    });

    it('refuses duplicates and unknown categories', async () => {
        const { env } = await withCategory();
        await rejects(createCategory(env, { name: 'Sports Person' }), 409);
        await rejects(createCategory(env, { name: 'sports person', id: 'other' }), 409);
        await rejects(createCategory(env, { name: '???' }), 400);
        await rejects(listLevels(env, 'nope').then(() => getLevel(env, 'nope', 'x')), 404);
    });

    it('needs force to delete a category with levels, then removes its levels and files', async () => {
        const { env, files } = await withCategory();
        const clue = await putAsset(env, { category: 'sports-person', bytes: png(4, 3), contentType: 'image/png' });
        await createLevel(env, 'sports-person', { answer: 'Messi', clues: [clue] });
        await rejects(deleteCategory(env, 'sports-person'), 409, /force/);
        expect(await deleteCategory(env, 'sports-person', true)).toEqual({ levels: 1, assets: 1 });
        expect(files.size).toBe(0);
        expect(await listCategories(env)).toEqual([]);
    });
});

describe('guess-the catalog: levels', () => {
    it('adds, reads, updates and deletes a level, with its files', async () => {
        const { env, files } = await withCategory();
        const a = await putAsset(env, { category: 'sports-person', bytes: png(4, 3), contentType: 'image/png' });
        const b = await putAsset(env, { category: 'sports-person', bytes: png(1, 1), contentType: 'image/png' });
        expect(a.shape).toEqual([4, 3]);

        const level = await createLevel(env, 'sports-person', { answer: 'Lionel Messi', accept: ['Messi'], clues: [a, b], credits: ['Photo: someone'] });
        expect(level.id).toBe('s1');
        expect((await createLevel(env, 'sports-person', { answer: 'Usain Bolt', clues: [a] })).id).toBe('s2');
        expect((await getLevel(env, 'sports-person', 's1')).accept).toEqual(['Messi']);

        // Dropping a clue deletes its file (unless another level still uses it).
        const updated = await updateLevel(env, 'sports-person', 's1', { clues: [b], accept: ['Leo Messi'] });
        expect(updated.clues).toEqual([b]);
        expect(updated.answer).toBe('Lionel Messi');
        expect(files.has(`guess-the/${a.src}`)).toBe(true); // s2 still uses it
        expect(files.has(`guess-the/${b.src}`)).toBe(true);

        expect(await deleteLevel(env, 'sports-person', 's2')).toEqual({ assets: 1 });
        expect(files.has(`guess-the/${a.src}`)).toBe(false);
        await deleteLevel(env, 'sports-person', 's1');
        expect(files.size).toBe(0);
        await rejects(getLevel(env, 'sports-person', 's1'), 404);
    });

    it('validates: clue count, duplicate answers, missing files, answers in file names', async () => {
        const { env } = await withCategory();
        const clue = await putAsset(env, { category: 'sports-person', bytes: png(4, 3), contentType: 'image/png' });
        await rejects(createLevel(env, 'sports-person', { answer: 'X Y', clues: [] }), 400);
        await rejects(createLevel(env, 'sports-person', { answer: 'X Y', clues: Array(6).fill(clue) }), 400);
        await rejects(createLevel(env, 'sports-person', { answer: 'X Y', clues: [{ src: 'sports-person/ghost.png' }] }), 400, /not been uploaded/);
        await rejects(createLevel(env, 'sports-person', { answer: 'X Y', clues: [{ src: 'other/abc.png' }] }), 400);

        await createLevel(env, 'sports-person', { answer: 'Lionel Messi', accept: ['Messi'], clues: [clue] });
        await rejects(createLevel(env, 'sports-person', { answer: 'messi', clues: [clue] }), 409);
        await rejects(createLevel(env, 'sports-person', { answer: 'The Messi', clues: [clue] }), 409);

        // A public file name must not give the answer away.
        const leaky = await putAsset(env, { category: 'sports-person', bytes: png(4, 3), contentType: 'image/png', name: 'usain-bolt.png' });
        await rejects(createLevel(env, 'sports-person', { answer: 'Usain Bolt', clues: [leaky] }), 400, /contains the answer/);
        await rejects(createLevel(env, 'sports-person', { answer: 'Usain Bolt', clues: [{ src: 'https://example.com/usain_bolt.jpg' }] }), 400, /URL contains the answer/);
        // External URLs are fine otherwise.
        expect((await createLevel(env, 'sports-person', { answer: 'Usain Bolt', clues: [{ src: 'https://example.com/a1.jpg' }] })).clues).toHaveLength(1);
    });

    it('lets a level keep its own answer when it is updated', async () => {
        const { env } = await withCategory();
        const clue = await putAsset(env, { category: 'sports-person', bytes: png(4, 3), contentType: 'image/png' });
        await createLevel(env, 'sports-person', { answer: 'Lionel Messi', clues: [clue] });
        expect((await updateLevel(env, 'sports-person', 's1', { credits: ['Photo: me'] })).credits).toEqual(['Photo: me']);
    });
});

describe('guess-the catalog: assets', () => {
    it('stores under opaque names, with type and size limits', async () => {
        const { env, files } = await withCategory();
        const clue = await putAsset(env, { category: 'sports-person', bytes: png(1920, 1080), contentType: 'image/png' });
        expect(clue.src).toMatch(/^sports-person\/[0-9a-f]{12}\.png$/);
        expect(clue.shape).toEqual([1920, 1080]);
        expect(files.get(`guess-the/${clue.src}`)!.type).toBe('image/png');

        await rejects(putAsset(env, { category: 'sports-person', bytes: new Uint8Array([1]), contentType: 'text/html' }), 415);
        await rejects(putAsset(env, { category: 'sports-person', bytes: new Uint8Array(), contentType: 'image/png' }), 400);
        await rejects(putAsset(env, { category: 'sports-person', bytes: new Uint8Array(6 * 1024 * 1024), contentType: 'image/png' }), 413);
        await rejects(putAsset(env, { category: 'sports-person', bytes: png(1, 1), contentType: 'image/png', name: '../x.png' }), 400);
        await rejects(putAsset(env, { category: 'sports-person', bytes: png(1, 1), contentType: 'image/png', name: 'a.mp4' }), 400);
        await rejects(putAsset(env, { category: 'nope', bytes: png(1, 1), contentType: 'image/png' }), 404);
        // Videos can't be measured from the header: the caller says.
        expect((await putAsset(env, { category: 'sports-person', bytes: new Uint8Array(10), contentType: 'video/mp4', size: [640, 640] })).shape).toEqual([640, 640]);
    });

    it('lists usage, protects used files, and prunes orphans', async () => {
        const { env } = await withCategory();
        const used = await putAsset(env, { category: 'sports-person', bytes: png(4, 3), contentType: 'image/png' });
        const orphan = await putAsset(env, { category: 'sports-person', bytes: png(4, 3), contentType: 'image/png' });
        await createLevel(env, 'sports-person', { answer: 'Lionel Messi', clues: [used] });

        const listed = await listAssets(env, 'sports-person');
        expect(listed.find(a => a.src === used.src)!.usedBy).toEqual(['s1']);
        expect(listed.find(a => a.src === orphan.src)!.usedBy).toEqual([]);

        await rejects(deleteAsset(env, 'sports-person', used.src.split('/')[1]), 409, /used by s1/);
        await deleteAsset(env, 'sports-person', orphan.src.split('/')[1]);
        const another = await putAsset(env, { category: 'sports-person', bytes: png(4, 3), contentType: 'image/png' });
        expect(await pruneAssets(env, 'sports-person')).toEqual([another.src]);
        expect((await listAssets(env, 'sports-person')).map(a => a.src)).toEqual([used.src]);
    });

    it('reads sizes from PNG, GIF, SVG and JPEG headers', () => {
        expect(sniffSize(png(300, 200), 'image/png')).toEqual([300, 200]);
        expect(sniffSize(new TextEncoder().encode('<svg viewBox="0 0 800 600"></svg>'), 'image/svg+xml')).toEqual([800, 600]);
        const gif = new Uint8Array(12);
        new DataView(gif.buffer).setUint16(6, 40, true);
        new DataView(gif.buffer).setUint16(8, 30, true);
        expect(sniffSize(gif, 'image/gif')).toEqual([40, 30]);
        const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0x02, 0x58, 0x03, 0x20, 3, 1, 0x22, 0, 2, 0x11, 1]);
        expect(sniffSize(jpg, 'image/jpeg')).toEqual([800, 600]);
        expect(sniffSize(new Uint8Array(3), 'image/png')).toBeNull();
    });
});

describe('guess-the catalog: export, import and loading', () => {
    it('round-trips the seed catalog and loads it for a room', async () => {
        const { env } = fakeEnv();
        const result = await importSnapshot(env, seed);
        expect(result.categories).toBe(seed.categories.length);
        const loaded = await loadCatalog(env);
        expect(loaded.categories).toEqual(seed.categories);
        expect(loaded.levels.actor.map(l => l.id)).toEqual(seed.levels.actor.map(l => l.id));
        expect(await exportSnapshot(env)).toEqual({ categories: seed.categories, levels: seed.levels });
    });

    it('replace drops categories that are not in the snapshot', async () => {
        const { env } = await withCategory();
        await importSnapshot(env, { categories: [{ id: 'movie', name: 'Movie' }], levels: { movie: [] } }, true);
        expect((await listCategories(env)).map(c => c.id)).toEqual(['movie']);
    });

    it('loads an empty catalog from empty storage', async () => {
        expect(await loadCatalog(fakeEnv().env)).toEqual({ categories: [], levels: {} });
    });
});

describe('guess-the catalog: HTTP API', () => {
    const TOKEN = 'secret-token';
    const call = (f: ReturnType<typeof fakeEnv>, path: string, init: RequestInit = {}, token: string | null = TOKEN) =>
        adminApi.request(path, { ...init, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers as Record<string, string>) } }, { ...f.env, ADMIN_TOKEN: TOKEN });
    const post = (f: ReturnType<typeof fakeEnv>, path: string, body: unknown, method = 'POST') => call(f, path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    it('rejects missing or wrong tokens, and is off without a token', async () => {
        const f = fakeEnv();
        expect((await call(f, '/categories', {}, null)).status).toBe(401);
        expect((await call(f, '/categories', {}, 'nope')).status).toBe(401);
        expect((await adminApi.request('/categories', { headers: { Authorization: 'Bearer x' } }, { ...f.env })).status).toBe(503);
        expect((await call(f, '/categories')).status).toBe(200);
    });

    it('runs the whole add / update / delete flow', async () => {
        const f = fakeEnv();
        expect((await post(f, '/categories', { name: 'Word' })).status).toBe(201);

        const up = await call(f, '/categories/word/assets?w=640&h=480', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: new Uint8Array(10) });
        expect(up.status).toBe(201);
        const clue = (await up.json()) as { src: string; shape: number[] };
        expect(clue.shape).toEqual([640, 480]);

        const made = await post(f, '/categories/word/levels', { answer: 'Pancake', clues: [clue] });
        expect(made.status).toBe(201);
        expect(((await made.json()) as { id: string }).id).toBe('w1');

        expect((await post(f, '/categories/word/levels/w1', { accept: ['Pan cake'] }, 'PATCH')).status).toBe(200);
        expect((await post(f, '/categories/word/levels', { answer: 'pancake', clues: [clue] })).status).toBe(409);
        expect((await post(f, '/categories/word/levels', { answer: '', clues: [clue] })).status).toBe(400);
        expect((await call(f, '/categories/nope/levels')).status).toBe(404);

        const list = (await (await call(f, '/categories/word/levels')).json()) as { accept: string[] }[];
        expect(list[0].accept).toEqual(['Pan cake']);

        expect((await call(f, '/categories/word/levels/w1', { method: 'DELETE' })).status).toBe(200);
        expect(f.files.size).toBe(0);
        expect((await call(f, '/categories/word', { method: 'DELETE' })).status).toBe(200);
    });

    it('serves clue files publicly and lists categories without answers', async () => {
        const f = fakeEnv();
        await createCategory(f.env, { name: 'Word' });
        const clue = await putAsset(f.env, { category: 'word', bytes: png(4, 3), contentType: 'image/png' });
        await createLevel(f.env, 'word', { answer: 'Pancake', clues: [clue] });
        const file = await publicApi.request(`/assets/${clue.src}`, {}, { ...f.env });
        expect(file.status).toBe(200);
        expect(file.headers.get('Content-Type')).toBe('image/png');
        expect((await publicApi.request('/assets/word/missing.png', {}, { ...f.env })).status).toBe(404);
        expect((await publicApi.request('/assets/word/..%2Fx', {}, { ...f.env })).status).toBe(404);
        const cats = await (await publicApi.request('/categories', {}, { ...f.env })).text();
        expect(JSON.parse(cats)).toEqual([{ id: 'word', name: 'Word', levels: 1 }]);
        expect(cats).not.toContain('Pancake');
    });
});
