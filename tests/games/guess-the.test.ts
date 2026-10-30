import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import server, { BASE_POINTS, QUESTIONS } from '../../src/games/guess-the/server';
import meta from '../../src/games/guess-the/meta';
import { CATEGORIES, categoryKey } from '../../src/games/guess-the/categories';
import { resolveSettings } from '../../src/platform/settings';
import { HOST, as, harness, players } from '../helpers';

const roster = players('Ann', 'Ben', 'Cat');
const base = { questions: 5, answerSeconds: 30 };
type Settings = typeof base & Record<string, number | boolean | string>;

function started(settings: Partial<Settings> = {}, seed = 3) {
    const h = harness(server, roster, { ...base, ...settings } as Settings, seed);
    h.start();
    return h;
}

const answerOf = (h: ReturnType<typeof started>) => QUESTIONS[h.state.current!.key].answer;
const allAnswers = Object.values(QUESTIONS).map(q => q.answer);

describe('guess-the: content', () => {
    it('has one question file per category and valid questions', () => {
        const dir = join(__dirname, '../../src/games/guess-the/content');
        const files = readdirSync(dir).map(f => f.match(/^guess-the-(.+)\.json$/)?.[1]).filter(Boolean).sort();
        expect(files).toEqual(CATEGORIES.map(c => c.id).sort());
        for (const q of Object.values(QUESTIONS)) {
            expect(q.answer.trim()).not.toBe('');
            expect(q.images.length).toBeGreaterThanOrEqual(1);
            expect(q.images.length).toBeLessThanOrEqual(5);
            expect(Array.isArray(q.credits) && q.credits.every(c => typeof c === 'string' && c.trim() !== '')).toBe(true);
            // Public image paths must not give the answer away.
            for (const src of q.images) {
                expect(src.toLowerCase()).not.toContain(q.answer.toLowerCase());
                // Pictures, or short clips the client plays as muted looping video.
                expect(src).toMatch(/\.(svg|png|jpe?g|webp|gif|avif|mp4|webm)$/i);
            }
        }
    });

    it('declares an on/off setting per category, all on by default', () => {
        const settings = resolveSettings(meta);
        for (const c of CATEGORIES) expect(settings[categoryKey(c.id)]).toBe(true);
    });
});

describe('guess-the: start', () => {
    it('opens the first question with a timer', () => {
        const h = started();
        expect(h.state.phase).toBe('guessing');
        expect(h.state.round).toBe(1);
        expect(h.state.total).toBe(5);
        expect(h.view(HOST).question.prompt).toMatch(/^Guess the /);
        expect(h.timers.has('answer')).toBe(true);
    });

    it('only deals questions from the chosen categories', () => {
        const off = Object.fromEntries(CATEGORIES.filter(c => c.id !== 'word').map(c => [categoryKey(c.id), false]));
        const h = started({ ...off, questions: 50 });
        expect(h.state.total).toBe(Object.keys(QUESTIONS).filter(k => k.startsWith('word/')).length);
        expect([h.state.current!.key, ...h.state.deck].every(k => k.startsWith('word/'))).toBe(true);
    });

    it('refuses to start with no categories', () => {
        const off = Object.fromEntries(CATEGORIES.map(c => [categoryKey(c.id), false]));
        const h = harness(server, roster, { ...base, ...off } as Settings);
        expect(() => h.start()).toThrow(/at least one category/);
    });

    it('mixes categories rather than clustering them', () => {
        const h = started({ questions: 50 });
        const first = [h.state.current!.key, ...h.state.deck].slice(0, CATEGORIES.length).map(k => k.split('/')[0]);
        expect(new Set(first).size).toBe(CATEGORIES.length);
    });
});

describe('guess-the: guessing and reveal', () => {
    it('reveals once everyone has answered and scores correct guesses', () => {
        const h = started();
        const answer = answerOf(h);
        h.act('guess', as('p1'), { text: answer.toUpperCase() });
        h.act('guess', as('p2'), { text: 'definitely wrong' });
        expect(h.state.phase).toBe('guessing');
        // Scores don't move before the reveal.
        expect(h.view(HOST).leaderboard.every((r: { score: number }) => r.score === 0)).toBe(true);
        h.act('pass', as('p3'));

        expect(h.state.phase).toBe('reveal');
        expect(h.timers.has('answer')).toBe(false);
        const v = h.view(HOST);
        expect(v.reveal.answer).toBe(answer);
        expect(v.reveal.results).toEqual([
            { id: 'p1', guess: answer.toUpperCase(), correct: true, points: BASE_POINTS + 50 },
            { id: 'p2', guess: 'definitely wrong', correct: false, points: 0 },
            { id: 'p3', guess: null, correct: false, points: 0 },
        ]);
        expect(v.leaderboard[0]).toEqual({ id: 'p1', score: BASE_POINTS + 50, rank: 1 });
    });

    it('awards the speed bonus in tiers: 50 / 35 / 25 / 15, then nothing after 15s', () => {
        const cases: [number, number][] = [
            [0, 50],
            [5_000, 50],
            [5_001, 35],
            [7_500, 35],
            [10_000, 25],
            [12_000, 15],
            [15_000, 15],
            [15_001, 0],
            [40_000, 0],
        ];
        for (const [at, bonus] of cases) {
            const h = started({ answerSeconds: 60 });
            const answer = answerOf(h);
            h.advance(at);
            h.act('guess', as('p1'), { text: answer });
            expect(h.state.guesses.p1.points, `answered at ${at}ms`).toBe(BASE_POINTS + bonus);
        }
    });

    it('scores the same tiers with the timer off', () => {
        const h = started({ answerSeconds: 0 });
        const answer = answerOf(h);
        h.advance(8_000);
        h.act('guess', as('p1'), { text: answer });
        expect(h.state.guesses.p1.points).toBe(BASE_POINTS + 25);
    });

    it('accepts small typos and listed aliases', () => {
        const h = started();
        h.state.current!.key = 'actor/a6'; // Mark Ruffalo, also "Ruffalo"
        h.act('guess', as('p1'), { text: 'ruffalo' });
        h.act('guess', as('p2'), { text: 'mark rufalo' });
        expect(h.state.guesses.p1.correct).toBe(true);
        expect(h.state.guesses.p2.correct).toBe(true);
    });

    it('rejects double answers, empty guesses and spectators', () => {
        const h = started();
        h.act('guess', as('p1'), { text: 'x' });
        expect(() => h.act('guess', as('p1'), { text: 'y' })).toThrow(/already answered/);
        expect(() => h.act('pass', as('p1'))).toThrow(/already answered/);
        expect(() => h.act('guess', as('p2'), { text: '   ' })).toThrow();
        expect(() => h.act('guess', as('p9'), { text: 'x' })).toThrow(/not in this game/);
    });

    it('reveals when the timer runs out, even if nobody answered', () => {
        const h = started();
        h.advance(30_000);
        expect(h.state.phase).toBe('reveal');
        expect(h.view(HOST).reveal.results.every((r: { guess: unknown }) => r.guess === null)).toBe(true);
    });

    it('lets the host reveal early', () => {
        const h = started({ answerSeconds: 0 });
        expect(h.state.countdown).toBeNull();
        h.act('guess', as('p1'), { text: answerOf(h) });
        h.act('reveal', HOST);
        expect(h.state.phase).toBe('reveal');
        expect(h.state.scores.p1).toBeGreaterThan(BASE_POINTS);
    });

    it('skips a question without revealing or counting it', () => {
        const h = started();
        const skipped = h.state.current!.key;
        const answer = answerOf(h);
        h.act('guess', as('p1'), { text: answer });
        h.act('skip', HOST);
        expect(h.state.phase).toBe('guessing');
        expect(h.state.round).toBe(1);
        expect(h.state.current!.key).not.toBe(skipped);
        expect(h.state.guesses).toEqual({});
        expect(h.state.scores.p1).toBe(0);
        expect(h.events.some(e => e.type === 'skipped')).toBe(true);
        expect(JSON.stringify(h.view(HOST))).not.toContain(answer);
    });

    it('refuses to skip when the deck is empty', () => {
        const off = Object.fromEntries(CATEGORIES.filter(c => c.id !== 'word').map(c => [categoryKey(c.id), false]));
        const h = started({ ...off, questions: 50 });
        while (h.state.deck.length) h.act('skip', HOST);
        expect(() => h.act('skip', HOST)).toThrow(/No more questions/);
    });

    it('plays every question then finishes', () => {
        const h = started({ questions: 2 });
        h.act('reveal', HOST);
        expect(h.view(HOST).isLast).toBe(false);
        h.act('next', HOST);
        expect(h.state.round).toBe(2);
        h.act('reveal', HOST);
        expect(h.view(HOST).isLast).toBe(true);
        h.act('next', HOST);
        expect(h.state.phase).toBe('finished');
        expect(h.events.some(e => e.type === 'confetti')).toBe(true);
    });

    it('lets the host end early', () => {
        const h = started();
        h.act('end', HOST);
        expect(h.state.phase).toBe('finished');
        expect(h.timers.has('answer')).toBe(false);
    });
});

describe('guess-the: no repeats', () => {
    /** Play a whole game the way the room does: setup(ctx, previous) → start → reveal/next. */
    function playGame(h: ReturnType<typeof started>, previous?: typeof h.state) {
        const s = server.setup(h.ctx, previous);
        server.start(s, h.ctx);
        const keys: string[] = [];
        while (s.phase !== 'finished') {
            keys.push(s.current!.key);
            server.actions.reveal.handle(s, undefined, h.ctx, HOST);
            server.actions.next.handle(s, undefined, h.ctx, HOST);
        }
        return { s, keys };
    }

    it('never repeats a question within a game, skips included', () => {
        const h = started({ questions: 50 });
        const keys = [h.state.current!.key];
        while (h.state.deck.length) {
            h.act('skip', HOST);
            keys.push(h.state.current!.key);
        }
        expect(keys).toHaveLength(Object.keys(QUESTIONS).length);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('uses every question across play-again before any repeats', () => {
        const h = started({ questions: 6 });
        const total = Object.keys(QUESTIONS).length;
        let previous: typeof h.state | undefined;
        const history: string[] = [];
        for (let game = 0; game < 4; game++) {
            const { s, keys } = playGame(h, previous);
            expect(new Set(keys).size).toBe(keys.length);
            history.push(...keys);
            previous = s;
        }
        // The first full pass covers every question exactly once.
        expect(new Set(history.slice(0, total)).size).toBe(total);
        // The next cycle doesn't immediately replay the questions from the end of the last one.
        const next = playGame(h, previous!).keys;
        expect(next.filter(k => history.slice(-6).includes(k))).toEqual([]);
    });

    it('keeps the bag per category selection', () => {
        const onlyWords = Object.fromEntries(CATEGORIES.filter(c => c.id !== 'word').map(c => [categoryKey(c.id), false]));
        const h = started({ ...onlyWords, questions: 2 });
        const a = playGame(h);
        const b = playGame(h, a.s);
        expect([...a.keys, ...b.keys].every(k => k.startsWith('word/'))).toBe(true);
        expect(new Set([...a.keys, ...b.keys]).size).toBe(4);
    });
});

describe('guess-the: roster changes', () => {
    it('reveals when the last missing player is kicked', () => {
        const h = started();
        h.act('guess', as('p1'), { text: 'a' });
        h.act('guess', as('p2'), { text: 'b' });
        const draft = structuredClone(h.state);
        server.onPlayerLeave!(draft, 'p3', h.ctx);
        expect(draft.phase).toBe('reveal');
        expect(draft.participants).toEqual(['p1', 'p2']);
        expect(draft.scores.p3).toBeUndefined();
    });

    it('deals late joiners in with zero points', () => {
        const h = started();
        const draft = structuredClone(h.state);
        server.onPlayerJoin!(draft, { id: 'p4', name: 'Dan', photoUrl: null, connected: true, joinedAt: 9 }, h.ctx);
        expect(draft.participants).toContain('p4');
        expect(draft.scores.p4).toBe(0);
    });
});

describe('guess-the: secrecy', () => {
    const viewers = [HOST, as('p1'), as('p2'), as('p3'), as('p9')];

    it('never sends the answer, or any upcoming answer, before the reveal', () => {
        const h = started({ questions: 50 });
        const answer = answerOf(h);
        const upcoming = h.state.deck.map(k => QUESTIONS[k].answer);
        h.act('guess', as('p1'), { text: 'something' });
        for (const v of viewers) {
            const json = JSON.stringify(h.view(v));
            expect(json).not.toContain(answer);
            for (const a of upcoming) expect(json).not.toContain(a);
            expect(json).not.toContain('"deck"');
        }
    });

    it("keeps each guess and its correctness private until the reveal", () => {
        const h = started();
        h.act('guess', as('p1'), { text: 'zebra crossing' });
        expect(h.view(as('p1')).me.guess).toBe('zebra crossing');
        expect(JSON.stringify(h.view(as('p1')))).not.toMatch(/"correct"/);
        for (const v of [HOST, as('p2'), as('p3')]) expect(JSON.stringify(h.view(v))).not.toContain('zebra crossing');
        expect(h.view(HOST).submitted).toEqual(['p1']);
    });

    it('sends image credits only with the reveal', () => {
        const h = started();
        QUESTIONS[h.state.current!.key].credits.push('Photo: Secret Subject / Wikimedia Commons, CC BY-SA 4.0');
        try {
            for (const v of viewers) expect(JSON.stringify(h.view(v))).not.toContain('Secret Subject');
            h.act('reveal', HOST);
            expect(h.view(as('p2')).reveal.credits).toContain('Photo: Secret Subject / Wikimedia Commons, CC BY-SA 4.0');
        } finally {
            QUESTIONS[h.state.current!.key].credits.pop();
        }
    });

    it('content answers never appear in public meta', () => {
        const json = JSON.stringify(meta) + JSON.stringify(CATEGORIES);
        for (const a of allAnswers) expect(json).not.toContain(a);
    });
});
