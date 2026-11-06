/**
 * Guess The — server logic.
 *
 * Flow: guessing → reveal → (guessing … | finished)
 * Each question shows 1–5 picture clues. Players type a guess (matched forgivingly)
 * or pass. The answer is revealed once everyone has submitted, when the timer runs
 * out, or when the host forces it. Scores only change at the reveal, so the
 * leaderboard never hints at who got it right early. The host can skip a question
 * without revealing it.
 *
 * Questions come from a shuffle bag that lasts for the whole room: `seen` survives
 * play-again and back-to-lobby (via setup's `previous`), so no question repeats until
 * every question in the chosen categories has been played.
 */
import { z } from 'zod';
import { GameError, defineAction, defineServer, type GameContext, type SettingValue, type Viewer } from '../../platform/sdk';
import { addPoints, assertPhase, leaderboard, matchesAnswer, startCountdown, type Countdown, type Scores } from '../../platform/mechanics';
import { loadCatalog } from './catalog/store';
import { ASSET_ROUTE, type Catalog, type CatalogEnv, type Clue } from './catalog/types';

type Settings = { questions: number; answerSeconds: number } & Record<string, SettingValue>;
type Ctx = GameContext<Settings>;
type Phase = 'lobby' | 'guessing' | 'reveal' | 'finished';

/** A level, as dealt. `credits` are attribution for the clues, shown only at the reveal. */
export interface Question {
    key: string;
    category: string;
    answer: string;
    accept: string[];
    clues: Clue[];
    credits: string[];
}

interface Guess {
    /** null = passed. */
    text: string | null;
    correct: boolean;
    points: number;
}

export interface State {
    phase: Phase;
    /** 1-based question number; skipped questions don't count. */
    round: number;
    total: number;
    /** Keys of upcoming questions. Never sent to clients. */
    deck: string[];
    /** Categories the host switched off. Carried across games in the room. */
    disabled: string[];
    /** Keys already dealt in this room (current cycle). Carried across games. */
    seen: string[];
    /** Keys dealt in this game. */
    dealt: string[];
    /** `q` is a copy made when the question opened, so editing the catalog mid-question can't break it. Never sent to clients. */
    current: { key: string; openedAt: number; q: Question } | null;
    participants: string[];
    guesses: Record<string, Guess>;
    scores: Scores;
    countdown: Countdown | null;
    reveal: { answer: string; credits: string[]; results: { id: string; guess: string | null; correct: boolean; points: number }[] } | null;
}

export const BASE_POINTS = 50;
/** Speed bonus by time since the question opened: answer within `ms` to get `bonus`. */
export const SPEED_TIERS = [
    { ms: 5_000, bonus: 50 },
    { ms: 7_500, bonus: 35 },
    { ms: 10_000, bonus: 25 },
    { ms: 15_000, bonus: 15 },
];
const ANSWER_TIMER = 'answer';

const EMPTY: Catalog = { categories: [], levels: {} };
const catalogOf = (ctx: { content: unknown }): Catalog => (ctx.content as Catalog | undefined) ?? EMPTY;

const questionIndex = new WeakMap<Catalog, Record<string, Question>>();
/** Every question in the loaded catalog, by key `<category>/<id>`. */
export function questionsOf(ctx: { content: unknown }): Record<string, Question> {
    const catalog = catalogOf(ctx);
    let index = questionIndex.get(catalog);
    if (!index) {
        index = {};
        for (const [category, levels] of Object.entries(catalog.levels)) {
            for (const l of levels) index[`${category}/${l.id}`] = { key: `${category}/${l.id}`, category, answer: l.answer, accept: l.accept ?? [], clues: l.clues, credits: l.credits ?? [] };
        }
        questionIndex.set(catalog, index);
    }
    return index;
}

/** Content (KV/R2) is read by the room, not the bundle. See catalog/store.ts. */
const loadContent = (env: unknown) => loadCatalog(env as CatalogEnv);

const categoryOf = (key: string) => key.slice(0, key.indexOf('/'));
const imageUrl = (src: string) => (/^https?:\/\//.test(src) ? src : ASSET_ROUTE + src);

export function enabledCategories(state: { disabled: string[] }, ctx: { content: unknown }): string[] {
    return catalogOf(ctx).categories.map(c => c.id).filter(id => !state.disabled.includes(id));
}

const poolOf = (state: State, ctx: Ctx) => {
    const categories = enabledCategories(state, ctx);
    return Object.keys(questionsOf(ctx)).filter(k => categories.includes(categoryOf(k)));
};

/** Shuffle each category, then deal them round-robin so categories stay mixed. */
function shuffleMixed(keys: string[], ctx: Ctx): string[] {
    const categories = [...new Set(keys.map(categoryOf))];
    const piles = categories.map(c => ctx.random.shuffle(keys.filter(k => categoryOf(k) === c)));
    const deck: string[] = [];
    while (piles.some(p => p.length)) {
        for (const pile of ctx.random.shuffle(piles)) if (pile.length) deck.push(pile.shift()!);
    }
    return deck;
}

/** Unseen questions first (shuffled); already-seen ones only after the bag runs dry. */
function buildDeck(state: State, ctx: Ctx): string[] {
    // Questions already played in this game are never dealt again.
    const pool = poolOf(state, ctx).filter(k => !state.dealt.includes(k));
    const unseen = pool.filter(k => !state.seen.includes(k));
    const seen = pool.filter(k => state.seen.includes(k));
    return [...shuffleMixed(unseen, ctx), ...shuffleMixed(seen, ctx)];
}

/** Record a dealt question. Once the whole pool has been seen, a new cycle starts. */
function markSeen(state: State, key: string, ctx: Ctx): void {
    if (state.seen.includes(key)) {
        const pool = poolOf(state, ctx);
        state.seen = state.seen.filter(k => !pool.includes(k) || state.dealt.includes(k));
    }
    state.seen.push(key);
    state.dealt.push(key);
}

/** Deal the next question. False when the deck has nothing left (a level may have been deleted since it was built). */
function openQuestion(state: State, ctx: Ctx): boolean {
    const questions = questionsOf(ctx);
    let key = state.deck.shift();
    while (key && !questions[key]) key = state.deck.shift();
    if (!key) return false;
    markSeen(state, key, ctx);
    state.current = { key, openedAt: ctx.now(), q: questions[key] };
    state.guesses = {};
    state.reveal = null;
    state.phase = 'guessing';
    const seconds = ctx.settings.answerSeconds;
    if (seconds > 0) {
        state.countdown = startCountdown(ANSWER_TIMER, seconds * 1000, ctx.now());
        ctx.timers.set(ANSWER_TIMER, seconds * 1000);
    } else {
        state.countdown = null;
    }
    return true;
}

function speedPoints(state: State, ctx: Ctx): number {
    const elapsed = ctx.now() - state.current!.openedAt;
    return BASE_POINTS + (SPEED_TIERS.find(t => elapsed <= t.ms)?.bonus ?? 0);
}

function reveal(state: State, ctx: Ctx): void {
    ctx.timers.clear(ANSWER_TIMER);
    state.countdown = null;
    for (const [id, g] of Object.entries(state.guesses)) addPoints(state.scores, id, g.points);
    state.reveal = {
        answer: state.current!.q.answer,
        // Credits can name the subject, so they're only sent with the answer.
        credits: state.current!.q.credits,
        results: state.participants.map(id => {
            const g = state.guesses[id];
            return { id, guess: g?.text ?? null, correct: !!g?.correct, points: g?.points ?? 0 };
        }),
    };
    state.phase = 'reveal';
}

function finish(state: State, ctx: Ctx): void {
    ctx.timers.clear(ANSWER_TIMER);
    state.countdown = null;
    state.current = null;
    state.reveal = null;
    state.guesses = {};
    state.phase = 'finished';
    ctx.emit({ type: 'confetti' });
}

const everyoneIn = (state: State) => state.participants.length > 0 && state.participants.every(id => state.guesses[id]);

function submit(state: State, ctx: Ctx, playerId: string, text: string | null): void {
    assertPhase(state.phase, 'guessing');
    if (!state.participants.includes(playerId)) throw new GameError("You're not in this game");
    if (state.guesses[playerId]) throw new GameError('You already answered');
    const q = state.current!.q;
    const correct = text !== null && matchesAnswer(text, [q.answer, ...q.accept]);
    state.guesses[playerId] = { text, correct, points: correct ? speedPoints(state, ctx) : 0 };
    if (everyoneIn(state)) reveal(state, ctx);
}

function view(state: State, viewer: Viewer, ctx: Ctx) {
    const me = viewer.playerId;
    const inGame = !!me && state.participants.includes(me);
    const q = state.current?.q ?? null;
    const catalog = catalogOf(ctx);
    const board = leaderboard(state.scores, state.participants);
    const mine = me ? state.guesses[me] : undefined;

    return {
        phase: state.phase,
        round: state.round,
        total: state.total,
        // The answer is never part of `question`; it only appears in `reveal`.
        question: q ? { category: categoryName(catalog, q.category), prompt: `Guess the ${categoryName(catalog, q.category)}`, images: q.clues.map(c => imageUrl(c.src)), shapes: q.clues.map(c => c.shape ?? null) } : null,
        countdown: state.countdown,
        participants: state.participants,
        /** Who has answered (ids only), during guessing. */
        submitted: state.phase === 'guessing' ? Object.keys(state.guesses) : [],
        reveal: state.phase === 'reveal' ? state.reveal : null,
        leaderboard: board,
        canSkip: state.deck.length > 0,
        /** Enabled categories, and how many unplayed questions each still has. */
        categories: catalog.categories.map(c => ({
            id: c.id,
            name: c.name,
            enabled: !state.disabled.includes(c.id),
            left: (catalog.levels[c.id] ?? []).filter(l => !state.dealt.includes(`${c.id}/${l.id}`)).length,
        })),
        isLast: state.round >= state.total || state.deck.length === 0,
        me: inGame
            ? {
                  submitted: !!mine,
                  // Own guess text only; whether it's right stays hidden until the reveal.
                  guess: mine?.text ?? null,
                  passed: !!mine && mine.text === null,
                  score: state.scores[me] ?? 0,
                  rank: board.find(r => r.id === me)?.rank ?? null,
              }
            : null,
    };
}

export type View = ReturnType<typeof view>;

const categoryName = (catalog: Catalog, id: string) => catalog.categories.find(c => c.id === id)?.name ?? id;

const categoryToggle = z.object({ id: z.string(), enabled: z.boolean() });
const guess = z.object({ text: z.string().trim().min(1, 'Type a guess').max(80) });

export default defineServer<State, Settings>({
    loadContent,

    setup: (_ctx, previous) => ({
        phase: 'lobby',
        round: 0,
        total: 0,
        deck: [],
        disabled: previous?.disabled ?? [],
        seen: previous?.seen ?? [],
        dealt: [],
        current: null,
        participants: [],
        guesses: {},
        scores: {},
        countdown: null,
        reveal: null,
    }),

    start(state, ctx) {
        const deck = buildDeck(state, ctx);
        if (deck.length === 0) return catalogOf(ctx).categories.length ? 'Pick at least one category with questions' : 'No questions are available yet';
        state.dealt = [];
        state.participants = ctx.players.map(p => p.id);
        state.scores = Object.fromEntries(state.participants.map(id => [id, 0]));
        state.deck = deck;
        state.total = Math.min(ctx.settings.questions, deck.length);
        state.round = 1;
        openQuestion(state, ctx);
    },

    actions: {
        guess: defineAction<State, Settings, z.infer<typeof guess>>({
            by: 'player',
            schema: guess,
            handle: (state, { text }, ctx, actor) => submit(state, ctx, actor.playerId!, text),
        }),

        pass: defineAction<State, Settings>({
            by: 'player',
            handle: (state, _p, ctx, actor) => submit(state, ctx, actor.playerId!, null),
        }),

        reveal: defineAction<State, Settings>({
            by: 'host',
            handle(state, _p, ctx) {
                assertPhase(state.phase, 'guessing');
                reveal(state, ctx);
            },
        }),

        /** Replace the current question without revealing it. */
        skip: defineAction<State, Settings>({
            by: 'host',
            handle(state, _p, ctx) {
                assertPhase(state.phase, 'guessing');
                if (!openQuestion(state, ctx)) throw new GameError('No more questions in these categories');
                ctx.emit({ type: 'skipped' });
            },
        }),

        next: defineAction<State, Settings>({
            by: 'host',
            handle(state, _p, ctx) {
                assertPhase(state.phase, 'reveal');
                if (state.round >= state.total || !openQuestion(state, ctx)) return finish(state, ctx);
                state.round++;
            },
        }),

        /** Switch categories on or off, in the lobby or mid-game. Takes effect from the next question. */
        setCategory: defineAction<State, Settings, z.infer<typeof categoryToggle>>({
            by: 'host',
            schema: categoryToggle,
            handle(state, { id, enabled }, ctx) {
                assertPhase(state.phase, 'lobby', 'guessing', 'reveal');
                if (!catalogOf(ctx).categories.some(c => c.id === id)) throw new GameError('Unknown category');
                // Kept in state (and carried over by setup), so play-again keeps the choice.
                state.disabled = enabled ? state.disabled.filter(d => d !== id) : [...new Set([...state.disabled, id])];
                if (state.phase === 'lobby') return;
                const deck = buildDeck(state, ctx);
                if (deck.length === 0) throw new GameError('Keep at least one category with questions left');
                state.deck = deck;
                // The current question counts as played, so it is kept when it is not yet revealed.
                state.total = Math.min(ctx.settings.questions, state.round + deck.length);
            },
        }),

        end: defineAction<State, Settings>({
            by: 'host',
            handle(state, _p, ctx) {
                assertPhase(state.phase, 'guessing', 'reveal');
                finish(state, ctx);
            },
        }),
    },

    onTimer(state, id, ctx) {
        if (id === ANSWER_TIMER && state.phase === 'guessing') reveal(state, ctx);
    },

    // Late joiners are dealt in with zero points.
    onPlayerJoin(state, player) {
        if (state.phase === 'lobby' || state.phase === 'finished' || state.participants.includes(player.id)) return;
        state.participants.push(player.id);
        state.scores[player.id] = 0;
    },

    onPlayerLeave(state, playerId, ctx) {
        if (!state.participants.includes(playerId)) return;
        state.participants = state.participants.filter(id => id !== playerId);
        delete state.guesses[playerId];
        delete state.scores[playerId];
        if (state.reveal) state.reveal.results = state.reveal.results.filter(r => r.id !== playerId);
        if (state.phase === 'guessing' && everyoneIn(state)) reveal(state, ctx);
    },

    view,
});
