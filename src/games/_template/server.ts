/**
 * Starter game — "Fastest Finger". Replace with your own logic.
 *
 * Shows the main SDK pieces: setup/start, host and player actions, a server
 * timer, scoring, an ephemeral event, and a per-viewer view.
 */
import { GameError, defineAction, defineServer, type Viewer } from '../../platform/sdk';
import { addPoints, assertPhase, leaderboard, type Scores } from '../../platform/mechanics';

type Settings = { rounds: number };
type Phase = 'ready' | 'armed' | 'go' | 'scored' | 'finished';

export interface State {
    phase: Phase;
    round: number;
    scores: Scores;
    /** Who tapped first this round. */
    winner: string | null;
}

function view(state: State, viewer: Viewer) {
    return {
        phase: state.phase,
        round: state.round,
        winner: state.winner,
        leaderboard: leaderboard(state.scores),
        // Per-viewer data goes here. Never put secrets in shared fields.
        myScore: viewer.playerId ? (state.scores[viewer.playerId] ?? 0) : null,
    };
}

export type View = ReturnType<typeof view>;

export default defineServer<State, Settings>({
    setup: () => ({ phase: 'ready', round: 0, scores: {}, winner: null }),

    start(state, ctx) {
        state.scores = Object.fromEntries(ctx.players.map(p => [p.id, 0]));
        state.round = 0;
        state.phase = 'ready';
    },

    actions: {
        // Host arms the round; GO appears after a random 1.5–4.5s delay.
        arm: defineAction<State, Settings>({
            by: 'host',
            handle(state, _p, ctx) {
                assertPhase(state.phase, 'ready', 'scored');
                state.round++;
                state.winner = null;
                state.phase = 'armed';
                ctx.timers.set('go', 1500 + ctx.random.int(3000));
            },
        }),

        tap: defineAction<State, Settings>({
            by: 'player',
            handle(state, _p, ctx, actor) {
                if (state.phase === 'armed') throw new GameError('Too early!');
                assertPhase(state.phase, 'go');
                state.winner = actor.playerId!;
                addPoints(state.scores, actor.playerId!, 1);
                state.phase = state.round >= ctx.settings.rounds ? 'finished' : 'scored';
                if (state.phase === 'finished') ctx.emit({ type: 'confetti' });
            },
        }),
    },

    onTimer(state, id) {
        if (id === 'go' && state.phase === 'armed') state.phase = 'go';
    },

    onPlayerLeave(state, playerId) {
        delete state.scores[playerId];
    },

    view,
});
