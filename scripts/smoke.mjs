#!/usr/bin/env node
/**
 * End-to-end smoke test against a running server (npm run dev, or a deployed URL).
 *
 *   node scripts/smoke.mjs                         # http://localhost:5173
 *   node scripts/smoke.mjs https://partygames.datasparta.com
 *
 * Plays a full Imposter game, a Momo Massacre setup and a short Guess The game through the real HTTP + WebSocket
 * API, and checks that secrets never reach the wrong screens.
 */
const BASE = process.argv[2] ?? 'http://localhost:5173';
const WS_BASE = BASE.replace(/^http/, 'ws');

let failures = 0;
function check(cond, label) {
    console.log(`${cond ? '  ✓' : '  ✗'} ${label}`);
    if (!cond) failures++;
}

async function http(method, path, body) {
    const res = await fetch(BASE + path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${data.error}`);
    return data;
}

/** A WebSocket client that remembers every frame and lets us await conditions. */
function connect(code, token) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${WS_BASE}/api/rooms/${code}/ws?token=${encodeURIComponent(token)}`);
        const client = {
            frames: [],
            state: null,
            nextId: 1,
            waiters: [],
            send(type, payload) {
                const id = client.nextId++;
                ws.send(JSON.stringify({ t: 'action', id, type, payload }));
                return client.until(() => client.frames.find(f => (f.t === 'ack' || f.t === 'error') && f.id === id)).then(f => {
                    if (f.t === 'error') throw new Error(`${type}: ${f.message}`);
                });
            },
            until(fn, ms = 5000) {
                const hit = fn();
                if (hit) return Promise.resolve(hit);
                return new Promise((res, rej) => {
                    const timer = setTimeout(() => rej(new Error('timed out waiting')), ms);
                    client.waiters.push(() => {
                        const v = fn();
                        if (v) {
                            clearTimeout(timer);
                            res(v);
                            return true;
                        }
                    });
                });
            },
            close: () => ws.close(),
            raw: () => client.frames.map(f => JSON.stringify(f)).join('\n'),
        };
        ws.onmessage = e => {
            const msg = JSON.parse(e.data);
            client.frames.push(msg);
            if (msg.t === 'state') client.state = msg;
            client.waiters = client.waiters.filter(w => !w());
        };
        ws.onopen = () => resolve(client);
        ws.onerror = () => reject(new Error('ws error'));
    });
}

const phaseIs = (c, phase) => () => c.state?.game?.phase === phase && c.state;

async function imposter() {
    console.log('\nImposter');
    const room = await http('POST', '/api/rooms', { gameId: 'imposter', settings: { discussionSeconds: 0 } });
    check(/^[A-Z2-9]{4,5}$/.test(room.code) && /^\d{4}$/.test(room.pin), `room created (${room.code})`);

    const host = await connect(room.code, room.hostToken);
    const names = ['Ada', 'Bo', 'Cy', 'Di', 'Ed'];
    const seats = [];
    for (const name of names) seats.push(await http('POST', `/api/rooms/${room.code}/join`, { name }));
    const dup = await fetch(`${BASE}/api/rooms/${room.code}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'ada' }) });
    check(dup.status === 409, 'duplicate name rejected');

    const phones = await Promise.all(seats.map(s => connect(room.code, s.playerToken)));
    await host.until(() => host.state?.room.players.filter(p => p.connected).length === 5 && host.state);
    check(true, 'host sees 5 connected players');

    let err = null;
    await phones[0].send('room:start').catch(e => (err = e));
    check(err?.message.includes('Only the host'), 'players cannot start the game');

    await host.send('room:start');
    await host.until(phaseIs(host, 'reveal'));
    await Promise.all(phones.map(p => p.until(phaseIs(p, 'reveal'))));

    const roles = phones.map(p => p.state.game.me);
    const imposters = roles.filter(r => r.role === 'imposter').length;
    const word = roles.find(r => r.role === 'genuine').word;
    check(imposters === 1, `1 imposter among 5 (25%) — got ${imposters}`);
    check(roles.every(r => (r.role === 'genuine' ? r.word === word : r.word === null)), 'genuine players share the word, imposter has none');
    check(!host.raw().includes(word), 'host screen never receives the word');
    phones.forEach((p, i) => {
        if (roles[i].role === 'imposter') check(!p.raw().includes(word), 'imposter phone never receives the word');
    });
    check(host.state.game.players.every(p => p.role === null), 'roles hidden while everyone is alive');

    await host.send('beginDiscussion');
    await host.send('startVoting');
    await Promise.all(phones.map(p => p.until(phaseIs(p, 'voting'))));

    // Engineer a 2–2 tie (one abstains): A,B → C ; C,D → A
    const id = i => seats[i].playerId;
    err = null;
    await phones[0].send('vote', { targetId: id(0) }).catch(e => (err = e));
    check(!!err, 'self-vote rejected');
    await phones[0].send('vote', { targetId: id(2) });
    await phones[1].send('vote', { targetId: id(2) });
    await phones[2].send('vote', { targetId: id(0) });
    await phones[3].send('vote', { targetId: id(0) });
    await host.until(() => host.state.game.voting?.voted.length === 4 && host.state);
    check(!JSON.stringify(host.state.game.voting).includes('myVote":"'), 'host cannot see who voted for whom');
    await host.send('closeVoting');
    await host.until(() => host.state.game.tied && host.state.game.round === 2 && host.state);
    check(host.state.game.phase === 'voting' && host.state.game.players.every(p => p.alive), 'tie → nobody out, new round');

    // Now vote out the imposter outright.
    const impIdx = roles.findIndex(r => r.role === 'imposter');
    for (let i = 0; i < 5; i++) {
        if (i === impIdx) continue;
        await phones[i].send('vote', { targetId: id(impIdx) });
    }
    await host.send('closeVoting');
    await host.until(phaseIs(host, 'results'));
    check(host.state.game.result.eliminated === null, 'step 1 shows only the tally');
    await host.send('revealNext');
    await host.until(() => host.state.game.result.eliminated === id(impIdx) && host.state);
    check(host.state.game.result.eliminatedRole === 'imposter', 'eliminated imposter revealed');
    await host.send('revealNext');
    await host.send('revealNext');
    await host.until(() => host.state.game.result.winner === 'genuine' && host.state);
    check(true, 'genuine players win');
    await host.send('nextRound');
    await host.until(phaseIs(host, 'finished'));
    check(!host.raw().includes(word), 'word never sent to host, even at the end');

    await host.send('room:playAgain');
    await host.until(() => host.state.game.phase === 'reveal' && host.state.game.round === 1 && host.state.game.players.every(p => p.alive) && host.state);
    check(true, 'play again: everyone revived, new round 1');

    await host.send('room:kick', { playerId: id(4) });
    await phones[4].until(() => phones[4].frames.some(f => f.t === 'kicked'));
    await host.until(() => host.state.room.players.length === 4 && host.state);
    check(host.state.game.players.length === 4, 'kicked player removed from room and game');

    const bad = await fetch(`${BASE}/api/rooms/${room.code}/resume`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: room.pin === '1111' ? '2222' : '1111' }) });
    check(bad.status === 403, 'wrong PIN rejected');
    const resumed = await http('POST', `/api/rooms/${room.code}/resume`, { pin: room.pin });
    const host2 = await connect(room.code, resumed.hostToken);
    await host2.until(() => host2.state?.room.me.role === 'host' && host2.state);
    check(true, 'PIN resume gives a working host session');

    [host, host2, ...phones].forEach(c => c.close());
}

async function momo() {
    console.log('\nMomo Massacre');
    const room = await http('POST', '/api/rooms', { gameId: 'momo-massacre', settings: {} });
    const host = await connect(room.code, room.hostToken);
    const seats = [];
    for (const name of ['Ann', 'Ben', 'Cat', 'Dan']) seats.push(await http('POST', `/api/rooms/${room.code}/join`, { name }));
    const phones = await Promise.all(seats.map(s => connect(room.code, s.playerToken)));

    let err = null;
    await host.send('room:start').catch(e => (err = e));
    check(err?.message.includes('Cast a character'), 'cannot start before casting');

    await host.send('autoCast');
    await host.until(() => host.state.game.cast.length === 4 && host.state);
    const castIds = host.state.game.cast.map(c => c.character.id);
    check(castIds.includes('1') && castIds.includes('12'), 'auto-cast includes the victim and the killer');

    await host.send('room:start');
    await Promise.all(phones.map(p => p.until(() => p.state?.game?.me && p.state)));
    const killerPhone = phones.find(p => p.state.game.me.isKiller);
    check(!!killerPhone, 'one phone is told it is the killer');
    const killerSecret = killerPhone.state.game.me.secret;
    check(phones.filter(p => p !== killerPhone).every(p => !p.raw().includes(killerSecret)), "other phones never receive the killer's secret");
    check(!host.raw().includes(killerSecret), "host never receives character secrets");

    await host.send('setPhase', { phase: 'PLAYING' });
    for (const clueId of [1, 3]) await host.send('revealClue', { clueId });
    await host.until(() => host.state.game.clues.length === 2 && host.state);
    const priv = host.state.game.clues.find(c => c.id === 3);
    check(priv.content === null, 'private clue content hidden from the host screen');
    const chemistPhone = phones.find(p => p.state.game.me.name === 'The Chemist');
    if (chemistPhone) {
        await chemistPhone.until(() => chemistPhone.state.game.clues.length === 2 && chemistPhone.state);
        check(chemistPhone.state.game.clues.find(c => c.id === 3).content !== null, 'private clue reaches its recipient');
    }
    [host, ...phones].forEach(c => c.close());
}

async function guessThe() {
    console.log('\nGuess The');
    const onlyWords = { 'category:movie': false, 'category:actor': false, 'category:phrase': false, 'category:sports-person': false };
    const room = await http('POST', '/api/rooms', { gameId: 'guess-the', settings: { questions: 2, answerSeconds: 0, ...onlyWords } });
    const host = await connect(room.code, room.hostToken);
    const seats = [];
    for (const name of ['Ann', 'Ben', 'Cat']) seats.push(await http('POST', `/api/rooms/${room.code}/join`, { name }));
    const phones = await Promise.all(seats.map(s => connect(room.code, s.playerToken)));
    await host.until(() => host.state?.room.players.filter(p => p.connected).length === 3 && host.state);

    await host.send('room:start');
    await host.until(phaseIs(host, 'guessing'));
    const q = host.state.game.question;
    check(q.prompt === 'Guess the Word', 'only the chosen category is dealt');
    check(q.images.length >= 1 && q.images.length <= 5, `${q.images.length} clue image(s)`);
    const img = await fetch(BASE + q.images[0]);
    check(img.ok, 'clue image is served');

    await phones[0].send('guess', { text: 'zebra-crossing-guess' });
    await host.until(() => host.state.game.submitted.includes(seats[0].playerId) && host.state);
    check(!host.raw().includes('zebra-crossing-guess') && !phones[1].raw().includes('zebra-crossing-guess'), 'a guess stays private until the reveal');

    await host.send('skip');
    await host.until(() => host.state.game.question.images[0] !== q.images[0] && host.state);
    check(host.state.game.round === 1 && host.state.game.submitted.length === 0, 'host skip deals a fresh question without counting it');

    const before = [host, ...phones].map(c => c.frames.length);
    await phones[0].send('guess', { text: 'something' });
    await phones[1].send('pass');
    await phones[2].send('guess', { text: 'another' });
    await host.until(phaseIs(host, 'reveal'));
    const answer = host.state.game.reveal.answer;
    check(!!answer && host.state.game.reveal.results.length === 3, `revealed after everyone answered (${answer})`);
    const early = [host, ...phones].map((c, i) => c.frames.slice(0, before[i]).map(f => JSON.stringify(f)).join('')).join('');
    check(!early.toLowerCase().includes(answer.toLowerCase()), 'answer never sent before the reveal');

    await host.send('next');
    await host.until(() => host.state.game.phase === 'guessing' && host.state.game.round === 2 && host.state);
    await host.send('reveal');
    await host.send('next');
    await host.until(phaseIs(host, 'finished'));
    check(host.state.game.leaderboard.length === 3, 'game finishes with a leaderboard');

    // Play again: the shuffle bag carries over, so none of the questions dealt so far come back.
    const shown = new Set(host.frames.filter(f => f.t === 'state' && f.game?.question).map(f => f.game.question.images[0]));
    await host.send('room:playAgain');
    await host.until(() => host.state.game.phase === 'guessing' && host.state.game.round === 1 && host.state);
    const again = [host.state.game.question.images[0]];
    await host.send('reveal');
    await host.send('next');
    await host.until(() => host.state.game.round === 2 && host.state.game.phase === 'guessing' && host.state);
    again.push(host.state.game.question.images[0]);
    check(again.every(img => !shown.has(img)), `play again deals unseen questions (${shown.size} seen before)`);
    [host, ...phones].forEach(c => c.close());
}

try {
    await imposter();
    await momo();
    await guessThe();
} catch (e) {
    console.error('\n  ✗ crashed:', e.message);
    failures++;
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
