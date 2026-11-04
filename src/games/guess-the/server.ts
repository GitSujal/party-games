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
import { CATEGORIES, categoryKey } from './categories';
import dims from './dims.json';

type Settings = { questions: number; answerSeconds: number } & Record<string, SettingValue>;
type Ctx = GameContext<Settings>;
type Phase = 'lobby' | 'guessing' | 'reveal' | 'finished';

export interface QuestionFile {
    /** `credits`: attribution for the clue images, shown only at the reveal. */
    questions: { id: string; answer: string; accept?: string[]; images: string[]; credits?: string[] }[];
}

interface Question {
    key: string;
    category: string;
    answer: string;
    accept: string[];
    images: string[];
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
    /** Keys already dealt in this room (current cycle). Carried across games. */
    seen: string[];
    /** Keys dealt in this game. */
    dealt: string[];
    current: { key: string; openedAt: number } | null;
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

const files = import.meta.glob<QuestionFile>('./content/guess-the-*.json', { eager: true, import: 'default' });

/** Every question, by key `<category>/<id>`. */
export const QUESTIONS: Record<string, Question> = {};
for (const [path, file] of Object.entries(files)) {
    const category = path.match(/guess-the-(.+)\.json$/)![1];
    for (const q of file.questions) {
        QUESTIONS[`${category}/${q.id}`] = { key: `${category}/${q.id}`, category, answer: q.answer, accept: q.accept ?? [], images: q.images, credits: q.credits ?? [] };
    }
}

/** [width, height] of each local clue (scripts/guess-the-media.mjs). Shapes are public; they let clients lay out before images load. */
const DIMS = dims as unknown as Record<string, [number, number]>;
const shapeOf = (src: string): [number, number] | null => DIMS[src] ?? null;
const imageUrl = (src: string) => (/^(https?:)?\//.test(src) ? src : `/games/guess-the/${src}`);
const categoryName = (id: string) => CATEGORIES.find(c => c.id === id)?.name ?? id;

export function enabledCategories(settings: Settings): string[] {
    return CATEGORIES.map(c => c.id).filter(id => settings[categoryKey(id)] !== false);
}

const poolOf = (settings: Settings) => {
    const categories = enabledCategories(settings);
    return Object.keys(QUESTIONS).filter(k => categories.includes(QUESTIONS[k].category));
};

/** Shuffle each category, then deal them round-robin so categories stay mixed. */
function shuffleMixed(keys: string[], ctx: Ctx): string[] {
    const categories = [...new Set(keys.map(k => QUESTIONS[k].category))];
    const piles = categories.map(c => ctx.random.shuffle(keys.filter(k => QUESTIONS[k].category === c)));
    const deck: string[] = [];
    while (piles.some(p => p.length)) {
        for (const pile of ctx.random.shuffle(piles)) if (pile.length) deck.push(pile.shift()!);
    }
    return deck;
}

/** Unseen questions first (shuffled); already-seen ones only after the bag runs dry. */
function buildDeck(state: State, ctx: Ctx): string[] {
    // Questions already played in this game are never dealt again.
    const pool = poolOf(ctx.settings).filter(k => !state.dealt.includes(k));
    const unseen = pool.filter(k => !state.seen.includes(k));
    const seen = pool.filter(k => state.seen.includes(k));
    return [...shuffleMixed(unseen, ctx), ...shuffleMixed(seen, ctx)];
}

/** Record a dealt question. Once the whole pool has been seen, a new cycle starts. */
function markSeen(state: State, key: string, ctx: Ctx): void {
    if (state.seen.includes(key)) {
        const pool = poolOf(ctx.settings);
        state.seen = state.seen.filter(k => !pool.includes(k) || state.dealt.includes(k));
    }
    state.seen.push(key);
    state.dealt.push(key);
}

function openQuestion(state: State, ctx: Ctx): void {
    const key = state.deck.shift()!;
    markSeen(state, key, ctx);
    state.current = { key, openedAt: ctx.now() };
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
        answer: QUESTIONS[state.current!.key].answer,
        // Credits can name the subject, so they're only sent with the answer.
        credits: QUESTIONS[state.current!.key].credits,
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
    const q = QUESTIONS[state.current!.key];
    const correct = text !== null && matchesAnswer(text, [q.answer, ...q.accept]);
    state.guesses[playerId] = { text, correct, points: correct ? speedPoints(state, ctx) : 0 };
    if (everyoneIn(state)) reveal(state, ctx);
}

function view(state: State, viewer: Viewer, { settings }: Ctx) {
    const me = viewer.playerId;
    const inGame = !!me && state.participants.includes(me);
    const q = state.current ? QUESTIONS[state.current.key] : null;
    const board = leaderboard(state.scores, state.participants);
    const mine = me ? state.guesses[me] : undefined;

    return {
        phase: state.phase,
        round: state.round,
        total: state.total,
        // The answer is never part of `question`; it only appears in `reveal`.
        question: q ? { category: categoryName(q.category), prompt: `Guess the ${categoryName(q.category)}`, images: q.images.map(imageUrl), shapes: q.images.map(shapeOf) } : null,
        countdown: state.countdown,
        participants: state.participants,
        /** Who has answered (ids only), during guessing. */
        submitted: state.phase === 'guessing' ? Object.keys(state.guesses) : [],
        reveal: state.phase === 'reveal' ? state.reveal : null,
        leaderboard: board,
        canSkip: state.deck.length > 0,
        /** Enabled categories, and how many unplayed questions each still has. */
        categories: CATEGORIES.map(c => ({
            id: c.id,
            name: c.name,
            enabled: settings[categoryKey(c.id)] !== false,
            left: Object.values(QUESTIONS).filter(q => q.category === c.id && !state.dealt.includes(q.key)).length,
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

const categoryToggle = z.object({ id: z.string(), enabled: z.boolean() });
const guess = z.object({ text: z.string().trim().min(1, 'Type a guess').max(80) });

export default defineServer<State, Settings>({
    setup: (_ctx, previous) => ({
        phase: 'lobby',
        round: 0,
        total: 0,
        deck: [],
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
        if (deck.length === 0) return 'Pick at least one category';
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
                if (state.deck.length === 0) throw new GameError('No more questions in these categories');
                openQuestion(state, ctx);
                ctx.emit({ type: 'skipped' });
            },
        }),

        next: defineAction<State, Settings>({
            by: 'host',
            handle(state, _p, ctx) {
                assertPhase(state.phase, 'reveal');
                if (state.round >= state.total || state.deck.length === 0) return finish(state, ctx);
                state.round++;
                openQuestion(state, ctx);
            },
        }),

        /** Switch categories on or off mid-game. Takes effect from the next question. */
        setCategory: defineAction<State, Settings, z.infer<typeof categoryToggle>>({
            by: 'host',
            schema: categoryToggle,
            handle(state, { id, enabled }, ctx) {
                assertPhase(state.phase, 'guessing', 'reveal');
                if (!CATEGORIES.some(c => c.id === id)) throw new GameError('Unknown category');
                // Persisted in the room's settings, so the lobby and play-again keep the choice.
                ctx.settings[categoryKey(id)] = enabled;
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
