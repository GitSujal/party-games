#!/usr/bin/env node
/**
 * Scaffold a new game from src/games/_template and register it.
 *
 *   npm run new-game trivia-night "Trivia Night"
 */
import { cpSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [id, ...nameParts] = process.argv.slice(2);

if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
    console.error('Usage: npm run new-game <kebab-case-id> ["Display Name"]');
    process.exit(1);
}
const name = nameParts.join(' ') || id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
const ident = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const gamesDir = join(root, 'src/games');
const target = join(gamesDir, id);

if (existsSync(target)) {
    console.error(`src/games/${id} already exists`);
    process.exit(1);
}

// 1. Copy the template and fill in placeholders.
cpSync(join(gamesDir, '_template'), target, { recursive: true });
const walk = dir => readdirSync(dir).flatMap(f => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
for (const file of walk(target)) {
    const text = readFileSync(file, 'utf8').replaceAll('__GAME_ID__', id).replaceAll('__GAME_NAME__', name);
    writeFileSync(file, text);
}

// 2. Register it (markers live in each registry file).
function insert(file, marker, line) {
    const path = join(gamesDir, file);
    const text = readFileSync(path, 'utf8');
    const re = new RegExp(`^([ \t]*)// new-game:${marker}$`, 'm');
    if (!re.test(text)) throw new Error(`Marker new-game:${marker} missing in ${file}`);
    writeFileSync(path, text.replace(re, (_m, indent) => `${indent}${line}\n${indent}// new-game:${marker}`));
}
const key = /^[a-zA-Z_$][\w$]*$/.test(id) ? id : `'${id}'`;
insert('catalog.ts', 'import', `import ${ident} from './${id}/meta';`);
insert('catalog.ts', 'entry', `${ident},`);
insert('registry.server.ts', 'import', `import ${ident} from './${id}/server';`);
insert('registry.server.ts', 'entry', `${key}: ${ident},`);
insert('registry.client.ts', 'entry', `${key}: () => import('./${id}/client'),`);

// 3. A test file to grow.
const testPath = join(root, 'tests/games', `${id}.test.ts`);
writeFileSync(
    testPath,
    `import { describe, expect, it } from 'vitest';
import server from '../../src/games/${id}/server';
import { HOST, as, harness, players } from '../helpers';

describe('${name}', () => {
    it('starts and plays a round', () => {
        const h = harness(server, players('Ann', 'Ben', 'Cat'), { rounds: 3 });
        h.start();
        h.act('arm', HOST);
        h.advance(5_000);
        h.act('tap', as('p2'));
        expect(h.view(HOST).leaderboard[0]).toMatchObject({ id: 'p2', score: 1 });
    });
});
`
);

console.log(`
Created src/games/${id} and registered "${name}".

Next:
  1. Edit src/games/${id}/meta.ts   (name, players, theme, settings; set enabled: true to list it)
  2. Write   src/games/${id}/server.ts  (state, actions, view)
  3. Build   src/games/${id}/client/    (Host + Player screens from src/ui)
  4. Test    tests/games/${id}.test.ts  → npm test
  5. Play    npm run dev → http://localhost:5173/g/${id}
`);
