#!/usr/bin/env node
/**
 * Manage the Guess The content that lives in Cloudflare (questions in KV, pictures and clips in R2)
 * through the Worker's admin API. Also the HTTP client that add-level.mjs uses.
 *
 *   node scripts/guess-the-catalog.mjs <command> ...
 *
 *   categories                                  list categories with their level counts
 *   category add "<name>" [--id <id>]           new category (id defaults to a slug of the name)
 *   category rename <id> "<name>"
 *   category order <id> <id> ...                every id, in the order the lobby should list them
 *   category rm <id> [--force]                  --force also deletes its levels and files
 *
 *   levels <category>                           list levels
 *   level show <category> <id>
 *   level update <category> <id> [--answer "<text>"] [--accept "<alias>"]... [--credit "<text>"]... [--clue <file|url>]...
 *                                               fields you pass are replaced as a whole (--accept/--credit/--clue replace the list);
 *                                               pass --no-accept or --no-credits to empty them. New --clue files are uploaded;
 *                                               an existing "category/file" clue is kept as is.
 *   level rm <category> <id>                    deletes the level and the files only it used
 *   (add a level with .claude/skills/create-guess-the-level/add-level.mjs: it finds, checks and uploads the clues)
 *
 *   assets <category>                           stored files and which levels use them
 *   asset add <category> <file>                 upload one file, print its clue entry
 *   asset rm <category> <name> [--force]
 *   asset prune <category>                      delete files no level uses
 *
 *   export [file]                               snapshot of categories and levels (JSON). Files are not included.
 *   import <file> [--replace]
 *   seed [--replace | --if-empty]               upload seed/guess-the (catalog.json + assets/) to the target;
 *                                               --if-empty does nothing when the target already has categories (used by deploy)
 *
 * Target: GUESS_API (default http://localhost:5173) and ADMIN_TOKEN, from the environment or .env. Against localhost the token is read from
 * .dev.vars when ADMIN_TOKEN isn't set. Production: GUESS_API=https://partygames.datasparta.com with the token
 * you set via `wrangler secret put ADMIN_TOKEN`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
// GUESS_API and ADMIN_TOKEN may live in .env (real environment variables win).
try {
    process.loadEnvFile(join(root, '.env'));
} catch {
    /* no .env */
}
const BASE = (process.env.GUESS_API ?? 'http://localhost:5173').replace(/\/$/, '');

export const MIME = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
    '.svg': 'image/svg+xml', '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

function token() {
    if (process.env.ADMIN_TOKEN) return process.env.ADMIN_TOKEN;
    const vars = join(root, '.dev.vars');
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE) && existsSync(vars)) {
        const m = readFileSync(vars, 'utf8').match(/^ADMIN_TOKEN=(.+)$/m);
        if (m) return m[1].trim();
    }
    throw new Error(`No admin token. Set ADMIN_TOKEN (the secret you gave the Worker); against localhost it is read from .dev.vars.`);
}

/** Call the admin API. Throws with the server's message on a non-2xx. */
export async function api(method, path, body, headers = {}) {
    const isJson = body !== undefined && !(body instanceof Uint8Array) && !Buffer.isBuffer(body);
    const res = await fetch(`${BASE}/api/admin/guess-the${path}`, {
        method,
        headers: { Authorization: `Bearer ${token()}`, ...(isJson ? { 'Content-Type': 'application/json' } : {}), ...headers },
        body: body === undefined ? undefined : isJson ? JSON.stringify(body) : body,
    }).catch(e => {
        throw new Error(`Cannot reach ${BASE} (${e.cause?.code ?? e.message}). Start it with \`npm run dev\`, or set GUESS_API.`);
    });
    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${data?.error ?? text.slice(0, 200)}`);
    return data;
}

/** Upload a file to a category. Returns the clue entry `{ src, shape? }`. `size` is for clips, which the server can't measure. */
export function uploadAsset(category, bytes, ext, { name, size } = {}) {
    const type = MIME[ext.toLowerCase()];
    if (!type) throw new Error(`Unsupported file type "${ext}"`);
    const query = size ? `?w=${size[0]}&h=${size[1]}` : '';
    const path = `/categories/${category}/assets${name ? `/${name}` : ''}${query}`;
    return api(name ? 'PUT' : 'POST', path, bytes, { 'Content-Type': type });
}

/** [width, height] of a picture or clip via ffprobe (SVG viewBox handled), or undefined. */
export function probeSize(file) {
    if (extname(file).toLowerCase() === '.svg') {
        const box = readFileSync(file, 'utf8').match(/viewBox="[\d.\-]+[ ,]+[\d.\-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/);
        return box ? [Math.round(Number(box[1])), Math.round(Number(box[2]))] : undefined;
    }
    const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' });
    const [w, h] = (r.stdout ?? '').trim().split(',').map(Number);
    return w && h ? [w, h] : undefined;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parse(argv) {
    const pos = [];
    const flags = {};
    const multi = new Set(['accept', 'credit', 'clue']);
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) pos.push(a);
        else {
            const key = a.slice(2);
            if (['force', 'replace', 'if-empty', 'no-accept', 'no-credits'].includes(key)) flags[key] = true;
            else if (multi.has(key)) (flags[key] ??= []).push(argv[++i]);
            else flags[key] = argv[++i];
        }
    }
    return { pos, flags };
}

const table = rows => rows.forEach(r => console.log(r.join('  ')));
const need = (v, what) => v ?? (console.error(`Missing ${what}. See the usage at the top of scripts/guess-the-catalog.mjs`), process.exit(1));

async function resolveClue(category, clue) {
    if (/^https?:\/\//.test(clue) || /^[a-z0-9-]+\/[a-z0-9][a-z0-9._-]*$/i.test(clue) && !existsSync(clue)) return { src: clue };
    const file = resolve(clue);
    if (!existsSync(file)) throw new Error(`Clue not found: ${clue}`);
    return uploadAsset(category, readFileSync(file), extname(file), { size: probeSize(file) });
}

async function seed({ replace, 'if-empty': ifEmpty }) {
    if (ifEmpty && (await api('GET', '/categories')).length) {
        console.log(`✓ ${BASE} already has content; seed skipped`);
        return;
    }
    const dir = join(root, 'seed/guess-the');
    const snapshot = JSON.parse(readFileSync(join(dir, 'catalog.json'), 'utf8'));
    // Categories first (uploads need them), then files under their fixed names, then the levels.
    const have = new Set((await api('GET', '/categories')).map(c => c.id));
    for (const c of snapshot.categories) if (!have.has(c.id)) await api('POST', '/categories', c);
    let files = 0;
    for (const c of snapshot.categories) {
        const assets = join(dir, 'assets', c.id);
        if (!existsSync(assets)) continue;
        for (const name of readdirSync(assets).sort()) {
            const file = join(assets, name);
            if (!statSync(file).isFile()) continue;
            await uploadAsset(c.id, readFileSync(file), extname(name), { name });
            files++;
        }
    }
    const result = await api('POST', `/import${replace ? '?replace=1' : ''}`, snapshot);
    console.log(`✓ Seeded ${result.categories} categories, ${result.levels} levels, ${files} files → ${BASE}`);
}

async function main() {
    const { pos, flags } = parse(process.argv.slice(2));
    const [cmd, sub, ...rest] = pos;

    if (cmd === 'categories') {
        table((await api('GET', '/categories')).map(c => [c.id.padEnd(18), String(c.levels).padStart(3) + ' levels', c.name]));
    } else if (cmd === 'category') {
        if (sub === 'add') console.log(await api('POST', '/categories', { name: need(rest[0], 'name'), ...(flags.id ? { id: flags.id } : {}) }));
        else if (sub === 'rename') console.log(await api('PATCH', `/categories/${need(rest[0], 'id')}`, { name: need(rest[1], 'name') }));
        else if (sub === 'order') console.log((await api('PUT', '/categories/order', { ids: rest })).map(c => c.id).join(' '));
        else if (sub === 'rm') console.log(await api('DELETE', `/categories/${need(rest[0], 'id')}${flags.force ? '?force=1' : ''}`));
        else console.error('category add | rename | order | rm');
    } else if (cmd === 'levels') {
        const levels = await api('GET', `/categories/${need(sub, 'category')}/levels`);
        table(levels.map(l => [l.id.padEnd(6), String(l.clues.length) + ' clues', l.answer + (l.accept.length ? `  (also: ${l.accept.join(', ')})` : '')]));
    } else if (cmd === 'level') {
        const [category, id] = rest;
        if (sub === 'show') console.log(JSON.stringify(await api('GET', `/categories/${need(category, 'category')}/levels/${need(id, 'id')}`), null, 4));
        else if (sub === 'rm') console.log(await api('DELETE', `/categories/${need(category, 'category')}/levels/${need(id, 'id')}`));
        else if (sub === 'update') {
            need(category, 'category');
            need(id, 'id');
            const patch = {};
            if (flags.answer !== undefined) patch.answer = flags.answer;
            if (flags['no-accept']) patch.accept = [];
            else if (flags.accept) patch.accept = flags.accept;
            if (flags['no-credits']) patch.credits = [];
            else if (flags.credit) patch.credits = flags.credit;
            if (flags.clue) {
                const current = await api('GET', `/categories/${category}/levels/${id}`);
                const known = new Map(current.clues.map(c => [c.src, c]));
                patch.clues = [];
                for (const clue of flags.clue) patch.clues.push(known.get(clue) ?? (await resolveClue(category, clue)));
            }
            if (!Object.keys(patch).length) throw new Error('Nothing to update. Pass --answer, --accept, --credit, --clue, --no-accept or --no-credits.');
            console.log(JSON.stringify(await api('PATCH', `/categories/${category}/levels/${id}`, patch), null, 4));
        } else console.error('level show | update | rm  (add levels with add-level.mjs)');
    } else if (cmd === 'assets') {
        table((await api('GET', `/categories/${need(sub, 'category')}/assets`)).map(a => [a.src.padEnd(34), `${Math.round(a.size / 1024)} KB`.padStart(8), a.usedBy.length ? a.usedBy.join(',') : '(unused)']));
    } else if (cmd === 'asset') {
        const [category, arg] = rest;
        if (sub === 'add') {
            const file = resolve(need(arg, 'file'));
            console.log(await uploadAsset(need(category, 'category'), readFileSync(file), extname(file), { size: probeSize(file) }));
        } else if (sub === 'rm') console.log(await api('DELETE', `/categories/${need(category, 'category')}/assets/${need(arg, 'name')}${flags.force ? '?force=1' : ''}`));
        else if (sub === 'prune') console.log(await api('DELETE', `/categories/${need(category, 'category')}/assets`));
        else console.error('asset add | rm | prune');
    } else if (cmd === 'export') {
        const out = JSON.stringify(await api('GET', '/export'), null, 4) + '\n';
        if (sub) {
            writeFileSync(sub, out);
            console.log(`✓ Wrote ${sub}`);
        } else process.stdout.write(out);
    } else if (cmd === 'import') {
        console.log(await api('POST', `/import${flags.replace ? '?replace=1' : ''}`, JSON.parse(readFileSync(need(sub, 'file'), 'utf8'))));
    } else if (cmd === 'seed') {
        await seed(flags);
    } else {
        console.error(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n/, '').replace(/^\/\*\*\n|^ \* ?/gm, ''));
        process.exit(cmd ? 1 : 0);
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(e => {
        console.error(`✗ ${e.message}`);
        process.exit(1);
    });
}
