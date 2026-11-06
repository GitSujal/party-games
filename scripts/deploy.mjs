#!/usr/bin/env node
/**
 * npm run deploy: build, deploy the Worker, then make sure Guess The has content.
 *
 *   1. vite build
 *   2. wrangler deploy, uploading ADMIN_TOKEN from .env as the Worker's secret
 *   3. guess-the-catalog seed --if-empty against GUESS_API (from .env)
 *
 * .env needs GUESS_API (https://partygames.datasparta.com) and ADMIN_TOKEN. The seed only runs when the
 * live catalog has no categories, so it never overwrites or resurrects levels you've edited or deleted.
 * To force a re-seed by hand: node scripts/guess-the-catalog.mjs seed [--replace]
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
process.chdir(root);
try {
    process.loadEnvFile('.env');
} catch {
    /* no .env: rely on the real environment */
}

const { GUESS_API, ADMIN_TOKEN } = process.env;
if (!GUESS_API || !ADMIN_TOKEN) {
    console.error('✗ Put GUESS_API and ADMIN_TOKEN in .env first (see .dev.vars.example).');
    process.exit(1);
}

function run(label, cmd, args) {
    console.log(`\n▸ ${label}`);
    const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
    if (r.status !== 0) {
        console.error(`✗ ${label} failed`);
        process.exit(r.status ?? 1);
    }
}

run('Build', 'npx', ['vite', 'build']);

// Only the token goes up as a secret, not the rest of .env.
const dir = mkdtempSync(join(tmpdir(), 'pg-secrets-'));
const secrets = join(dir, 'secrets.json');
writeFileSync(secrets, JSON.stringify({ ADMIN_TOKEN }));
try {
    run('Deploy Worker', 'npx', ['wrangler', 'deploy', '--secrets-file', `"${secrets}"`]);
} finally {
    rmSync(dir, { recursive: true, force: true });
}

run('Seed Guess The content (only if the catalog is empty)', 'node', ['scripts/guess-the-catalog.mjs', 'seed', '--if-empty']);
console.log('\n✓ Deployed');
