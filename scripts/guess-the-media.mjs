#!/usr/bin/env node
/**
 * Guess The clue media: keeps every clue to a few canonical shapes and records each clue's size.
 *
 *   node scripts/guess-the-media.mjs dims                rebuild src/games/guess-the/dims.json
 *   node scripts/guess-the-media.mjs normalize [--write] report (or apply) the snap below to existing images
 *
 * Snap: a picture within 8% of a canonical shape (1:1, 4:3, 3:4, 16:9) is centre-cropped to it; anything
 * further off is padded (never stretched) so nothing important is cut. The long edge is capped at 1024px.
 * Pictures are never scaled up. SVGs and videos are left alone (SVG scales; clips are square or 16:9 already).
 *
 * dims.json maps "<category>/<file>" to [width, height]. It is public (it only holds shapes) and the server
 * sends it with each question, so the TV and phones lay clues out correctly before any image has loaded.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const mediaDir = join(root, 'public/games/guess-the');
const dimsFile = join(root, 'src/games/guess-the/dims.json');

export const SHAPES = [1, 4 / 3, 3 / 4, 16 / 9];
export const CROP_TOLERANCE = 1.08;
export const MAX_EDGE = 1024;
const PAD_COLOUR = '0xF5F2EC';
const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function run(cmd, argv) {
    const r = spawnSync(cmd, argv, { encoding: 'utf8' });
    if (r.error) throw new Error(`${cmd} not found. Install ffmpeg (winget install ffmpeg).`);
    if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr.trim().split('\n').slice(-2).join(' ')}`);
    return r.stdout;
}

/** [width, height] of an image, SVG or video file. */
export function probeSize(path) {
    if (extname(path).toLowerCase() === '.svg') {
        const svg = readFileSync(path, 'utf8');
        const box = svg.match(/viewBox="[\d.\-]+[ ,]+[\d.\-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/);
        if (box) return [Math.round(Number(box[1])), Math.round(Number(box[2]))];
        const w = svg.match(/<svg[^>]*\swidth="([\d.]+)/);
        const h = svg.match(/<svg[^>]*\sheight="([\d.]+)/);
        return w && h ? [Math.round(Number(w[1])), Math.round(Number(h[1]))] : null;
    }
    const out = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path]).trim();
    const [w, h] = out.split(',').map(Number);
    return w && h ? [w, h] : null;
}

/** The canonical shape closest to this one (in log space) and how far off it is (1 = exact). */
export function nearestShape(w, h) {
    let best = SHAPES[0];
    for (const s of SHAPES) if (Math.abs(Math.log(w / h / s)) < Math.abs(Math.log(w / h / best))) best = s;
    const off = Math.exp(Math.abs(Math.log(w / h / best)));
    return { shape: best, off };
}

/** What snapping a w×h picture does: nothing, crop, or pad (then the size cap). */
export function planSnap(w, h) {
    const { shape, off } = nearestShape(w, h);
    const action = off < 1.02 ? 'keep' : off <= CROP_TOLERANCE ? 'crop' : 'pad';
    const long = Math.max(w, h);
    const resize = long > MAX_EDGE;
    return { shape, action, resize, change: action !== 'keep' || resize };
}

/** Snap one raster file; returns the new bytes (or null when it already fits). */
export function snapFile(src, outExt, work) {
    const [w, h] = probeSize(src);
    const plan = planSnap(w, h);
    if (!plan.change) return null;
    const T = plan.shape.toFixed(5);
    const filters = [];
    if (plan.action === 'crop') filters.push(`crop='if(gt(iw/ih,${T}),ih*${T},iw)':'if(gt(iw/ih,${T}),ih,iw/${T})'`);
    if (plan.action === 'pad') filters.push(`pad=w='2*ceil(max(iw,ih*${T})/2)':h='2*ceil(max(ih,iw/${T})/2)':x='(ow-iw)/2':y='(oh-ih)/2':color=${PAD_COLOUR}`);
    filters.push(`scale='min(${MAX_EDGE},iw)':'min(${MAX_EDGE},ih)':force_original_aspect_ratio=decrease:flags=lanczos`);
    // JPEG/WebP encoders want even sizes.
    filters.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');
    const out = join(work, `snap-${Date.now()}-${Math.random().toString(36).slice(2)}${outExt}`);
    const codec = outExt === '.webp' ? ['-c:v', 'libwebp', '-quality', '86'] : outExt === '.jpg' ? ['-q:v', '3', '-pix_fmt', 'yuvj420p'] : [];
    run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-i', src, '-map_metadata', '-1', '-vf', filters.join(','), ...codec, out]);
    return { bytes: readFileSync(out), plan };
}

/** Snap in-memory image bytes (used by add-level.mjs). */
export function snapBytes(bytes, ext, work) {
    if (!RASTER.has(ext)) return { bytes, ext };
    const src = join(work, `snap-in-${Date.now()}${ext}`);
    writeFileSync(src, bytes);
    const done = snapFile(src, ext === '.jpeg' ? '.jpg' : ext, work);
    return done ? { bytes: done.bytes, ext } : { bytes, ext };
}

function* mediaFiles() {
    for (const cat of readdirSync(mediaDir)) {
        const dir = join(mediaDir, cat);
        if (!statSync(dir).isDirectory()) continue;
        for (const f of readdirSync(dir).sort()) yield { key: `${cat}/${f}`, path: join(dir, f), ext: extname(f).toLowerCase() };
    }
}

export function rebuildDims() {
    const dims = {};
    for (const f of mediaFiles()) {
        const size = probeSize(f.path);
        if (size) dims[f.key] = size;
        else console.warn(`! no size for ${f.key}`);
    }
    writeFileSync(dimsFile, JSON.stringify(dims, null, 4) + '\n');
    return dims;
}

function normalizeAll(write) {
    const work = mkdtempSync(join(tmpdir(), 'guess-the-snap-'));
    let changed = 0;
    for (const f of mediaFiles()) {
        if (!RASTER.has(f.ext)) continue;
        const [w, h] = probeSize(f.path);
        const plan = planSnap(w, h);
        const label = `${f.key.padEnd(34)} ${w}×${h}`;
        if (!plan.change) {
            console.log(`  ok    ${label}`);
            continue;
        }
        changed++;
        console.log(`  ${plan.action === 'keep' ? 'size ' : plan.action.padEnd(5)} ${label} → ${plan.action === 'keep' ? '' : `${plan.shape.toFixed(2)} `}${plan.resize ? `max ${MAX_EDGE}` : ''}`);
        if (write) {
            const done = snapFile(f.path, f.ext === '.jpeg' ? '.jpg' : f.ext, work);
            if (done) writeFileSync(f.path, done.bytes);
        }
    }
    console.log(write ? `Rewrote ${changed} file(s).` : `${changed} file(s) would change. Re-run with --write to apply.`);
    if (write) rebuildDims();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const [cmd, ...rest] = process.argv.slice(2);
    if (cmd === 'dims') console.log(`Wrote ${Object.keys(rebuildDims()).length} sizes to src/games/guess-the/dims.json`);
    else if (cmd === 'normalize') normalizeAll(rest.includes('--write'));
    else console.error('Usage: guess-the-media.mjs dims | normalize [--write]');
}
