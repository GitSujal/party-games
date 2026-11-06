/**
 * Tiny phase-machine helpers. Games keep `phase` in their own state;
 * these guard handlers and transitions.
 */
import { GameError } from '../sdk';

export function assertPhase<P extends string>(current: P, ...allowed: P[]): void {
    if (!allowed.includes(current)) {
        throw new GameError(`Not allowed right now (phase: ${current})`);
    }
}

/**
 * Declare allowed transitions once, then move through them safely.
 *
 *   const flow = phaseFlow({ reveal: ['discussion'], discussion: ['voting'], ... });
 *   flow.go(state, 'voting');
 */
export function phaseFlow<P extends string>(transitions: Record<P, P[]>) {
    const can = (from: P, to: P): boolean => transitions[from]?.includes(to) ?? false;
    return {
        can,
        go<S extends { phase: P }>(state: S, to: P): void {
            if (!can(state.phase, to)) throw new GameError(`Cannot go from ${state.phase} to ${to}`);
            state.phase = to;
        },
    };
}
