import { describe, expect, it } from 'vitest';
import {
    addPoints,
    assertPhase,
    assignRoles,
    editDistance,
    matchesAnswer,
    normalizeAnswer,
    castVote,
    countFromRatio,
    everyoneVoted,
    formatClock,
    leaderboard,
    openBallot,
    phaseFlow,
    remainingMs,
    seededRandom,
    splitIntoTeams,
    startCountdown,
    tallyBallot,
} from '../../src/platform/mechanics';
import { resolveSettings } from '../../src/platform/settings';
import imposterMeta from '../../src/games/imposter/meta';

describe('random', () => {
    it('shuffle is a permutation and deterministic per seed', () => {
        const items = ['a', 'b', 'c', 'd', 'e'];
        const a = seededRandom(1).shuffle(items);
        expect([...a].sort()).toEqual(items);
        expect(seededRandom(1).shuffle(items)).toEqual(a);
    });
});

describe('voting', () => {
    const voters = ['a', 'b', 'c', 'd'];

    it('tallies a clear winner', () => {
        const b = openBallot(voters, voters);
        castVote(b, 'a', 'c');
        castVote(b, 'b', 'c');
        castVote(b, 'c', 'a');
        const r = tallyBallot(b);
        expect(r.winner).toBe('c');
        expect(r.tie).toBe(false);
        expect(r.tally[0]).toEqual({ id: 'c', count: 2 });
    });

    it('detects ties and no-vote ballots', () => {
        const b = openBallot(voters, voters);
        castVote(b, 'a', 'c');
        castVote(b, 'c', 'a');
        expect(tallyBallot(b)).toMatchObject({ tie: true, winner: null, leaders: ['a', 'c'] });
        expect(tallyBallot(openBallot(voters, voters))).toMatchObject({ tie: false, winner: null, leaders: [] });
    });

    it('lets voters change their vote and rejects invalid ones', () => {
        const b = openBallot(['a', 'b'], ['a', 'b']);
        castVote(b, 'a', 'b');
        expect(() => castVote(b, 'a', 'a')).toThrow(/yourself/);
        expect(() => castVote(b, 'z', 'a')).toThrow(/not voting/);
        expect(() => castVote(b, 'b', 'z')).toThrow(/not on the ballot/);
        castVote(b, 'b', 'a');
        expect(everyoneVoted(b)).toBe(true);
    });
});

describe('roles', () => {
    it('countFromRatio keeps at least one and fewer than half', () => {
        expect(countFromRatio(3, 0.25)).toBe(1);
        expect(countFromRatio(8, 0.25)).toBe(2);
        expect(countFromRatio(4, 0.45)).toBe(1);
        expect(countFromRatio(10, 0.45)).toBe(4);
    });

    it('assignRoles gives exact counts', () => {
        const ids = ['1', '2', '3', '4', '5', '6'];
        const roles = assignRoles(ids, { spy: 2 }, 'crew', seededRandom(3));
        expect(Object.values(roles).filter(r => r === 'spy')).toHaveLength(2);
        expect(Object.keys(roles).sort()).toEqual(ids);
    });
});

describe('phases', () => {
    it('guards transitions', () => {
        const flow = phaseFlow<'a' | 'b' | 'c'>({ a: ['b'], b: ['c'], c: [] });
        const s = { phase: 'a' as 'a' | 'b' | 'c' };
        flow.go(s, 'b');
        expect(s.phase).toBe('b');
        expect(() => flow.go(s, 'a')).toThrow();
        expect(() => assertPhase(s.phase, 'a')).toThrow();
    });
});

describe('scoring & teams & timers', () => {
    it('ranks with shared places', () => {
        const scores = {};
        addPoints(scores, 'a', 3);
        addPoints(scores, 'b', 5);
        addPoints(scores, 'c', 3);
        expect(leaderboard(scores, ['a', 'b', 'c', 'd']).map(r => [r.id, r.rank])).toEqual([
            ['b', 1],
            ['a', 2],
            ['c', 2],
            ['d', 4],
        ]);
    });

    it('splits teams evenly', () => {
        const teams = splitIntoTeams(['1', '2', '3', '4', '5'], 2, seededRandom(9));
        expect(teams.map(t => t.length).sort()).toEqual([2, 3]);
    });

    it('formats countdowns', () => {
        const c = startCountdown('t', 90_000, 0);
        expect(remainingMs(c, 30_000)).toBe(60_000);
        expect(formatClock(61_000)).toBe('1:01');
        expect(remainingMs(c, 999_999)).toBe(0);
    });
});

describe('settings', () => {
    it('clamps numbers and drops unknown keys', () => {
        const s = resolveSettings(imposterMeta, { imposterPercent: 99, discussionSeconds: '60', bogus: 1 });
        expect(s).toEqual({ imposterPercent: 45, discussionSeconds: 60 });
    });
});

describe('answers', () => {
    it('normalizes case, accents, punctuation and leading articles', () => {
        expect(normalizeAnswer('  The Lion-King! ')).toBe('lion king');
        expect(normalizeAnswer('Beyoncé & Jay-Z')).toBe('beyonce and jay z');
        expect(normalizeAnswer("Don't Stop")).toBe('dont stop');
    });

    it('matches forgivingly, scaled to answer length', () => {
        expect(matchesAnswer('lion king', ['The Lion King'])).toBe(true);
        expect(matchesAnswer('lionking', ['The Lion King'])).toBe(true);
        expect(matchesAnswer('Titanc', ['Titanic'])).toBe(true);
        expect(matchesAnswer('Sachin Tendulker', ['Sachin Tendulkar'])).toBe(true);
        expect(matchesAnswer('cat', ['car'])).toBe(false);
        expect(matchesAnswer('Avatar', ['Titanic'])).toBe(false);
        expect(matchesAnswer('rock', ['Dwayne Johnson', 'The Rock'])).toBe(true);
        expect(matchesAnswer('!!!', ['Titanic'])).toBe(false);
    });

    it('computes edit distance', () => {
        expect(editDistance('kitten', 'sitting')).toBe(3);
        expect(editDistance('', 'abc')).toBe(3);
    });
});
