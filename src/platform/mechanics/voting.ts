/**
 * Voting rounds: one ballot per voter per round, changeable until closed.
 *
 *   const ballot = openBallot(eligibleVoterIds, candidateIds);
 *   castVote(ballot, voterId, candidateId);
 *   const result = tallyBallot(ballot); // { tally, leaders, winner, tie }
 */
import { GameError } from '../sdk';

export interface Ballot {
    round: number;
    voters: string[];
    candidates: string[];
    /** voterId -> candidateId */
    votes: Record<string, string>;
    allowSelfVote: boolean;
}

export interface TallyEntry {
    id: string;
    count: number;
}

export interface BallotResult {
    round: number;
    /** Every candidate, most votes first (ties keep candidate order). */
    tally: TallyEntry[];
    /** Candidates sharing the top count (empty if nobody voted). */
    leaders: string[];
    /** The single leader, or null on a tie / no votes. */
    winner: string | null;
    tie: boolean;
    totalVotes: number;
}

export function openBallot(
    voters: string[],
    candidates: string[],
    opts: { round?: number; allowSelfVote?: boolean } = {}
): Ballot {
    return {
        round: opts.round ?? 1,
        voters: [...voters],
        candidates: [...candidates],
        votes: {},
        allowSelfVote: opts.allowSelfVote ?? false,
    };
}

export function castVote(ballot: Ballot, voterId: string, candidateId: string): void {
    if (!ballot.voters.includes(voterId)) throw new GameError('You are not voting in this round');
    if (!ballot.candidates.includes(candidateId)) throw new GameError('That player is not on the ballot');
    if (!ballot.allowSelfVote && voterId === candidateId) throw new GameError('You cannot vote for yourself');
    ballot.votes[voterId] = candidateId;
}

export function hasVoted(ballot: Ballot, voterId: string): boolean {
    return voterId in ballot.votes;
}

export function votesCast(ballot: Ballot): number {
    return Object.keys(ballot.votes).length;
}

export function everyoneVoted(ballot: Ballot): boolean {
    return ballot.voters.every(v => v in ballot.votes);
}

export function tallyBallot(ballot: Ballot): BallotResult {
    const counts = new Map<string, number>(ballot.candidates.map(c => [c, 0]));
    for (const target of Object.values(ballot.votes)) counts.set(target, (counts.get(target) ?? 0) + 1);

    const tally = [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
    const max = tally[0]?.count ?? 0;
    const leaders = max > 0 ? tally.filter(t => t.count === max).map(t => t.id) : [];

    return {
        round: ballot.round,
        tally,
        leaders,
        winner: leaders.length === 1 ? leaders[0] : null,
        tie: leaders.length > 1,
        totalVotes: votesCast(ballot),
    };
}
