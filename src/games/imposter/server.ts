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
import words from './content/words.json';

export type Phase = 'waiting' | 'reveal' | 'discussion' | 'voting' | 'results' | 'finished';
export type ImposterRole = 'imposter' | 'genuine';
export type Winner = 'genuine' | 'imposters';

type ImposterSettings = { imposterPercent: number; discussionSeconds: number };
type Ctx = GameContext<ImposterSettings>;

export interface ImposterState {
    phase: Phase;
    word: string | null;
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

const WORDS: string[] = words.words;
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

function pickWord(state: ImposterState, ctx: Ctx): string {
    let pool = WORDS.filter(w => !state.usedWords.includes(w) && w !== state.word);
    if (pool.length === 0) {
        state.usedWords = [];
        pool = WORDS.filter(w => w !== state.word);
    }
    const word = ctx.random.pick(pool);
    state.usedWords.push(word);
    return word;
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

export default defineServer<ImposterState, ImposterSettings>({
    setup: () => ({
        phase: 'waiting',
        word: null,
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
