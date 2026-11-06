/**
 * Guess The content API.
 *
 *   Public (no secrets):
 *     GET  /api/guess-the/categories             id, name, level count
 *     GET  /api/guess-the/assets/<cat>/<file>    a clue picture or clip (immutable, CORS open)
 *
 *   Admin (Authorization: Bearer <ADMIN_TOKEN>; these expose answers):
 *     GET    /api/admin/guess-the/categories
 *     POST   /api/admin/guess-the/categories                       {name, id?}
 *     PATCH  /api/admin/guess-the/categories/:cat                  {name}
 *     PUT    /api/admin/guess-the/categories/order                 {ids: [...]}
 *     DELETE /api/admin/guess-the/categories/:cat[?force=1]
 *     GET    /api/admin/guess-the/categories/:cat/levels
 *     POST   /api/admin/guess-the/categories/:cat/levels           {answer, accept?, clues, credits?}
 *     GET    /api/admin/guess-the/categories/:cat/levels/:id
 *     PATCH  /api/admin/guess-the/categories/:cat/levels/:id       any of the level fields
 *     DELETE /api/admin/guess-the/categories/:cat/levels/:id       also deletes its files
 *     GET    /api/admin/guess-the/categories/:cat/assets           with the levels that use each
 *     POST   /api/admin/guess-the/categories/:cat/assets[?w&h]     raw file body → random opaque name
 *     PUT    /api/admin/guess-the/categories/:cat/assets/:name     raw file body → fixed name
 *     DELETE /api/admin/guess-the/categories/:cat/assets/:name[?force=1]
 *     DELETE /api/admin/guess-the/categories/:cat/assets            delete files no level uses
 *     GET    /api/admin/guess-the/export          POST /api/admin/guess-the/import[?replace=1]
 *
 * New content shows up in rooms from their next game start (rooms re-read it then).
 */
import { Hono, type Context } from 'hono';
import {
    CatalogError,
    contentTypeOf,
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
    pruneAssets,
    putAsset,
    renameCategory,
    requireCategory,
    reorderCategories,
    updateLevel,
} from '../games/guess-the/catalog/store';
import { assetKey, type CatalogEnv, type Shape, type Snapshot } from '../games/guess-the/catalog/types';
import { sha256Hex, safeEqual } from './crypto';

/** Just the bindings these routes use, so the module also typechecks (and runs in tests) outside the Worker project. */
type App = { Bindings: CatalogEnv & { ADMIN_TOKEN?: string } };

/** Public routes: mounted at /api/guess-the. */
export const publicApi = new Hono<App>();

publicApi.get('/categories', async c => {
    const categories = await listCategories(c.env, 60);
    const counts = await Promise.all(categories.map(async x => (await listLevels(c.env, x.id, 60)).length));
    return c.json(categories.map((x, i) => ({ id: x.id, name: x.name, levels: counts[i] })), 200, { 'Cache-Control': 'public, max-age=60', 'Access-Control-Allow-Origin': '*' });
});

publicApi.get('/assets/:category/:name', async c => {
    const src = `${c.req.param('category')}/${c.req.param('name')}`;
    if (!/^[a-z0-9-]+\/[a-z0-9][a-z0-9._-]*$/i.test(src)) return c.notFound();
    const object = await c.env.MEDIA.get(assetKey(src));
    if (!object) return c.notFound();
    // Stored files are never overwritten under the same name unless seeded, so they cache hard.
    return new Response(object.body, {
        headers: {
            'Content-Type': object.httpMetadata?.contentType ?? contentTypeOf(src),
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
            'Access-Control-Allow-Origin': '*',
            'Cross-Origin-Resource-Policy': 'cross-origin',
            ETag: object.httpEtag,
        },
    });
});

/** Admin routes: mounted at /api/admin/guess-the. */
export const adminApi = new Hono<App>();

adminApi.use('*', async (c, next) => {
    const token = c.env.ADMIN_TOKEN;
    if (!token) return c.json({ error: 'Admin API is off: set the ADMIN_TOKEN secret' }, 503);
    const given = /^Bearer (.+)$/.exec(c.req.header('Authorization') ?? '')?.[1] ?? '';
    // Hash both sides so the comparison is constant-time and length-independent.
    if (!safeEqual(await sha256Hex(given), await sha256Hex(token))) return c.json({ error: 'Unauthorized' }, 401);
    c.header('Cache-Control', 'no-store');
    await next();
});

adminApi.onError((err, c) => {
    if (err instanceof CatalogError) return c.json({ error: err.message }, err.status);
    console.error('Guess The admin error', err);
    return c.json({ error: 'Something went wrong' }, 500);
});

const env = (c: Context<App>): CatalogEnv => c.env;
const json = async (c: Context<App>) => c.req.json().catch(() => null);
const flag = (v: string | undefined) => v === '1' || v === 'true';

adminApi.get('/categories', async c => {
    const categories = await listCategories(env(c));
    const counts = await Promise.all(categories.map(async x => (await listLevels(env(c), x.id)).length));
    return c.json(categories.map((x, i) => ({ ...x, levels: counts[i] })));
});
adminApi.post('/categories', async c => c.json(await createCategory(env(c), await json(c)), 201));
adminApi.put('/categories/order', async c => c.json(await reorderCategories(env(c), (await json(c) as { ids?: unknown } | null)?.ids)));
adminApi.patch('/categories/:cat', async c => c.json(await renameCategory(env(c), c.req.param('cat'), (await json(c) as { name?: unknown } | null)?.name)));
adminApi.delete('/categories/:cat', async c => c.json(await deleteCategory(env(c), c.req.param('cat'), flag(c.req.query('force')))));

adminApi.get('/categories/:cat/levels', async c => {
    await requireCategory(env(c), c.req.param('cat'));
    return c.json(await listLevels(env(c), c.req.param('cat')));
});
adminApi.post('/categories/:cat/levels', async c => c.json(await createLevel(env(c), c.req.param('cat'), await json(c)), 201));
adminApi.get('/categories/:cat/levels/:id', async c => c.json(await getLevel(env(c), c.req.param('cat'), c.req.param('id'))));
adminApi.patch('/categories/:cat/levels/:id', async c => c.json(await updateLevel(env(c), c.req.param('cat'), c.req.param('id'), await json(c))));
adminApi.delete('/categories/:cat/levels/:id', async c => c.json(await deleteLevel(env(c), c.req.param('cat'), c.req.param('id'))));

adminApi.get('/categories/:cat/assets', async c => c.json(await listAssets(env(c), c.req.param('cat'))));
adminApi.delete('/categories/:cat/assets', async c => c.json({ deleted: await pruneAssets(env(c), c.req.param('cat')) }));

async function upload(c: Context<App>, name?: string) {
    const w = Number(c.req.query('w'));
    const h = Number(c.req.query('h'));
    const size: Shape | undefined = Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 ? [w, h] : undefined;
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    const contentType = c.req.header('Content-Type') ?? contentTypeOf(name ?? '');
    return putAsset(env(c), { category: c.req.param('cat') ?? '', bytes, contentType, name, size });
}
adminApi.post('/categories/:cat/assets', async c => c.json(await upload(c), 201));
adminApi.put('/categories/:cat/assets/:name', async c => c.json(await upload(c, c.req.param('name')), 201));
adminApi.delete('/categories/:cat/assets/:name', async c => {
    await deleteAsset(env(c), c.req.param('cat'), c.req.param('name'), flag(c.req.query('force')));
    return c.json({ ok: true });
});

adminApi.get('/export', async c => c.json(await exportSnapshot(env(c))));
adminApi.post('/import', async c => {
    const body = (await json(c)) as Snapshot | null;
    if (!body || !Array.isArray(body.categories) || typeof body.levels !== 'object') throw new CatalogError(400, 'Send {categories, levels}');
    return c.json(await importSnapshot(env(c), body, flag(c.req.query('replace'))));
});
