/**
 * Imposter — server logic.
 *
 * Flow: reveal → discussion → voting → results → (discussion … | finished)
 * A tie keeps the phase at voting with a fresh ballot (round + 1); nobody is eliminated.
 * Genuine players win when no imposters are left; imposters win once they are at
 * least as many as the genuine players still in the game.
 */
import { z } from 'zod';
import { GameError, defineAction, defineServer, type GameContext, type Viewer } from '../../platform/sdk';
import {
    assertPhase,
    assignRoles,
    castVote,
    countFromRatio,
    openBallot,
    startCountdown,
    tallyBallot,
    votesCast,
    type Ballot,
    type Countdown,
    type TallyEntry,
} from '../../platform/mechanics';
import content from './content/words.json';

export type Phase = 'waiting' | 'reveal' | 'discussion' | 'voting' | 'results' | 'finished';
export type ImposterRole = 'imposter' | 'genuine';
export type Winner = 'genuine' | 'imposters';

type ImposterSettings = { imposterPercent: number; discussionSeconds: number };
type Ctx = GameContext<ImposterSettings>;

export interface ImposterState {
    phase: Phase;
    word: string | null;
    /** Category id of the current word. Only its name is ever sent, and only while `categoryShown`. */
    category: string | null;
    /** The host chose to reveal the category (a hint for everyone, imposters included). */
    categoryShown: boolean;
    /** Categories the host switched off. Carried across games in the room. */
    disabled: string[];
    usedWords: string[];
    /** Participants of the current game, in join order. Late joiners spectate. */
    participants: string[];
    roles: Record<string, ImposterRole>;
    alive: Record<string, boolean>;
    round: number;
    ballot: Ballot | null;
    /** The previous ballot of this voting phase ended in a tie. */
    tied: boolean;
    result: {
        round: number;
        tally: TallyEntry[];
        eliminated: string;
        winner: Winner | null;
    } | null;
    /** Results are revealed step by step: 1 votes, 2 eliminated, 3 status, 4 winner. */
    revealStep: number;
    countdown: Countdown | null;
}

interface WordCategory {
    id: string;
    name: string;
    words: string[];
}

/** Secret: the words. Client code only ever receives category names and counts, via view(). */
const CATEGORIES: WordCategory[] = content.categories;
const DISCUSSION_TIMER = 'discussion';

function aliveIds(state: ImposterState): string[] {
    return state.participants.filter(id => state.alive[id]);
}

function counts(state: ImposterState) {
    const alive = aliveIds(state);
    const imposters = alive.filter(id => state.roles[id] === 'imposter').length;
    return { imposters, genuine: alive.length - imposters };
}

export function winnerOf(state: ImposterState): Winner | null {
    const { imposters, genuine } = counts(state);
    if (imposters === 0) return 'genuine';
    if (imposters >= genuine) return 'imposters';
    return null;
}

/** Every word of the categories the host left on. */
function wordPool(state: Pick<ImposterState, 'disabled'>): { word: string; category: string }[] {
    return CATEGORIES.filter(c => !state.disabled.includes(c.id)).flatMap(c => c.words.map(word => ({ word, category: c.id })));
}

function pickWord(state: ImposterState, ctx: Ctx): string {
    const all = wordPool(state);
    if (all.length === 0) throw new GameError('Pick at least one category');
    let pool = all.filter(e => !state.usedWords.includes(e.word) && e.word !== state.word);
    if (pool.length === 0) {
        state.usedWords = [];
        pool = all.filter(e => e.word !== state.word);
    }
    // A pool of one word that is already in play: reuse it rather than fail.
    const pick = ctx.random.pick(pool.length ? pool : all);
    state.usedWords.push(pick.word);
    state.category = pick.category;
    return pick.word;
}

function beginDiscussion(state: ImposterState, ctx: Ctx): void {
    state.phase = 'discussion';
    const seconds = ctx.settings.discussionSeconds;
    if (seconds > 0) {
        state.countdown = startCountdown(DISCUSSION_TIMER, seconds * 1000, ctx.now());
        ctx.timers.set(DISCUSSION_TIMER, seconds * 1000);
    } else {
        state.countdown = null;
    }
}

function openVoting(state: ImposterState, ctx: Ctx): void {
    ctx.timers.clear(DISCUSSION_TIMER);
    state.countdown = null;
    state.phase = 'voting';
    state.tied = false;
    const alive = aliveIds(state);
    state.ballot = openBallot(alive, alive, { round: state.round });
}

function view(state: ImposterState, viewer: Viewer) {
    const me = viewer.playerId;
    const inGame = !!me && state.participants.includes(me);
    const finished = state.phase === 'finished';
    const step = state.revealStep;
    const result = state.result;

    return {
        phase: state.phase,
        round: state.round,
        tied: state.tied,
        countdown: state.countdown,
        revealStep: step,
        // Roles become public only once a player is out (or the game is over).
        // The word itself is never in a public field.
        players: state.participants.map(id => ({
            id,
            alive: state.alive[id],
            role: !state.alive[id] || finished ? state.roles[id] : null,
        })),
        me: inGame
            ? {
                  role: state.roles[me],
                  word: state.roles[me] === 'genuine' ? state.word : null,
                  alive: state.alive[me],
              }
            : null,
        // A hint everyone gets once the host shows it. Never the word itself.
        category: state.categoryShown ? (CATEGORIES.find(c => c.id === state.category)?.name ?? null) : null,
        categories: CATEGORIES.map(c => ({ id: c.id, name: c.name, enabled: !state.disabled.includes(c.id), words: c.words.length })),
        voting: state.ballot
            ? {
                  voters: state.ballot.voters,
                  voted: Object.keys(state.ballot.votes),
                  myVote: me ? (state.ballot.votes[me] ?? null) : null,
              }
            : null,
        result: result
            ? {
                  tally: result.tally,
                  eliminated: step >= 2 ? result.eliminated : null,
                  eliminatedRole: step >= 2 ? state.roles[result.eliminated] : null,
                  remaining: step >= 3 ? counts(state) : null,
                  gameOver: step >= 3 ? !!result.winner : null,
                  winner: step >= 4 ? result.winner : null,
              }
            : null,
        winner: finished ? (winnerOf(state) ?? result?.winner ?? null) : null,
    };
}

export type ImposterView = ReturnType<typeof view>;

const vote = z.object({ targetId: z.string() });
const categoryToggle = z.object({ id: z.string(), enabled: z.boolean() });
const categoryVisible = z.object({ visible: z.boolean() });

export default defineServer<ImposterState, ImposterSettings>({
    setup: (_ctx, previous) => ({
        phase: 'waiting',
        word: null,
        category: null,
        categoryShown: false,
        disabled: previous?.disabled ?? [],
        usedWords: [],
        participants: [],
        roles: {},
        alive: {},
        round: 1,
        ballot: null,
        tied: false,
        result: null,
        revealStep: 0,
        countdown: null,
    }),

    start(state, ctx) {
        const ids = ctx.players.map(p => p.id);
        if (ids.length < 3) return 'Imposter needs at least 3 players';
        if (wordPool(state).length === 0) return 'Pick at least one category';
        const imposterCount = countFromRatio(ids.length, ctx.settings.imposterPercent / 100);

        state.participants = ids;
        state.roles = assignRoles(ids, { imposter: imposterCount }, 'genuine', ctx.random);
        state.alive = Object.fromEntries(ids.map(id => [id, true]));
        state.word = pickWord(state, ctx);
        state.round = 1;
        state.phase = 'reveal';
    },

    actions: {
        beginDiscussion: defineAction<ImposterState, ImposterSettings>({
            by: 'host',
            handle(state, _p, ctx) {
                assertPhase(state.phase, 'reveal');
                beginDiscussion(state, ctx);
            },
        }),

        changeWord: defineAction<ImposterState, ImposterSettings>({
            by: 'host',
            handle(state, _p, ctx) {
                assertPhase(state.phase, 'reveal', 'discussion');
                state.word = pickWord(state, ctx);
                ctx.emit({ type: 'wordChanged' });
            },
        }),

        /** Switch a word category on or off. Applies from the next word; allowed at any time. */
        setCategory: defineAction<ImposterState, ImposterSettings, z.infer<typeof categoryToggle>>({
            by: 'host',
            schema: categoryToggle,
            handle(state, { id, enabled }) {
                if (!CATEGORIES.some(c => c.id === id)) throw new GameError('Unknown category');
                const disabled = enabled ? state.disabled.filter(d => d !== id) : [...new Set([...state.disabled, id])];
                if (wordPool({ disabled }).length === 0) throw new GameError('Keep at least one category on');
                state.disabled = disabled;
            },
        }),

        /** Show or hide the current word's category on every screen, at any point in a game. */
        showCategory: defineAction<ImposterState, ImposterSettings, z.infer<typeof categoryVisible>>({
            by: 'host',
            schema: categoryVisible,
            handle(state, { visible }, ctx) {
                if (state.phase === 'waiting' || !state.category) throw new GameError('There is no word yet');
                state.categoryShown = visible;
                if (visible) ctx.emit({ type: 'categoryShown' });
            },
        }),

        startVoting: defineAction<ImposterState, ImposterSettings>({
            by: 'host',
            handle(state, _p, ctx) {
                assertPhase(state.phase, 'discussion');
                openVoting(state, ctx);
            },
        }),

        vote: defineAction<ImposterState, ImposterSettings, z.infer<typeof vote>>({
            by: 'player',
            schema: vote,
            handle(state, { targetId }, _ctx, actor) {
                assertPhase(state.phase, 'voting');
                castVote(state.ballot!, actor.playerId!, targetId);
            },
        }),

        closeVoting: defineAction<ImposterState, ImposterSettings>({
            by: 'host',
            handle(state, _p, ctx) {
                assertPhase(state.phase, 'voting');
                const ballot = state.ballot!;
                if (votesCast(ballot) === 0) throw new GameError('Nobody has voted yet');

                const result = tallyBallot(ballot);
                if (!result.winner) {
                    // Tie: nobody leaves, vote again with a fresh ballot.
                    state.round++;
                    const alive = aliveIds(state);
                    state.ballot = openBallot(alive, alive, { round: state.round });
                    state.tied = true;
                    ctx.emit({ type: 'tie' });
                    return;
                }

                state.alive[result.winner] = false;
                state.result = {
                    round: ballot.round,
                    tally: result.tally,
                    eliminated: result.winner,
                    winner: winnerOf(state),
                };
                state.ballot = null;
                state.tied = false;
                state.phase = 'results';
                state.revealStep = 1;
            },
        }),

        revealNext: defineAction<ImposterState, ImposterSettings>({
            by: 'host',
            handle(state, _p, ctx) {
                assertPhase(state.phase, 'results');
                const lastStep = state.result?.winner ? 4 : 3;
                if (state.revealStep >= lastStep) throw new GameError('Everything is already revealed');
                state.revealStep++;
                if (state.revealStep === 4) ctx.emit({ type: 'confetti' });
            },
        }),

        nextRound: defineAction<ImposterState, ImposterSettings>({
            by: 'host',
            handle(state, _p, ctx) {
                assertPhase(state.phase, 'results');
                if (state.result?.winner) {
                    state.phase = 'finished';
                    return;
                }
                state.round++;
                state.result = null;
                state.revealStep = 0;
                beginDiscussion(state, ctx);
            },
        }),
    },

    onTimer(state, id, ctx) {
        if (id === DISCUSSION_TIMER && state.phase === 'discussion') openVoting(state, ctx);
    },

    onPlayerLeave(state, playerId) {
        if (!state.participants.includes(playerId)) return;
        state.participants = state.participants.filter(id => id !== playerId);
        delete state.roles[playerId];
        delete state.alive[playerId];
        if (state.ballot) {
            const b = state.ballot;
            b.voters = b.voters.filter(id => id !== playerId);
            b.candidates = b.candidates.filter(id => id !== playerId);
            delete b.votes[playerId];
            for (const [voter, target] of Object.entries(b.votes)) if (target === playerId) delete b.votes[voter];
        }
        if (state.phase !== 'results' && state.phase !== 'finished' && state.participants.length > 0 && winnerOf(state)) {
            state.phase = 'finished';
            state.countdown = null;
        }
    },

    view,
});
