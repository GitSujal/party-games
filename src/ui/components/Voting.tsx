/** Voting UI that pairs with platform/mechanics/voting. */
import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Player } from '../../platform/sdk';
import { Avatar } from './Avatar';
import { Button } from './Button';

/** Phone: pick one candidate and submit. Changing your vote is allowed until the host closes it. */
export function VotePicker({
    candidates,
    myVote,
    onVote,
    prompt = 'Players',
}: {
    candidates: Player[];
    myVote: string | null;
    onVote: (candidateId: string) => Promise<void>;
    prompt?: string;
}) {
    const [selected, setSelected] = useState<string | null>(myVote);
    const [busy, setBusy] = useState(false);
    const changed = selected !== myVote;
    const lockedName = candidates.find(c => c.id === myVote)?.name;

    return (
        <div className="pg-stack" style={{ ['--gap' as string]: '24px' }}>
            <div className="pg-choices" role="radiogroup" aria-label={prompt}>
                {candidates.map(p => (
                    <button key={p.id} type="button" role="radio" className="pg-choice" aria-checked={selected === p.id} onClick={() => setSelected(p.id)}>
                        <span className="pg-choice__ring" aria-hidden />
                        <span className="pg-grow">{p.name}</span>
                    </button>
                ))}
            </div>
            <div className="pg-stack" style={{ ['--gap' as string]: '10px' }}>
                {myVote && !changed && (
                    <p className="pg-label-sm" style={{ margin: 0, textAlign: 'center' }}>
                        Vote locked in for {lockedName}.
                    </p>
                )}
                <Button
                    variant="primary"
                    size="lg"
                    block
                    disabled={!selected || !changed}
                    loading={busy}
                    onClick={async () => {
                        if (!selected) return;
                        setBusy(true);
                        try {
                            await onVote(selected);
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    {myVote ? (changed ? 'Change vote' : 'Vote locked in') : 'Cast vote'}
                </Button>
            </div>
        </div>
    );
}

/** Host screen: who has voted (never who they voted for). */
export function VoteProgress({ voters, voted }: { voters: Player[]; voted: string[] }) {
    return (
        <div className="pg-stack" style={{ ['--gap' as string]: '16px' }}>
            <span className="pg-label-sm" style={{ fontSize: 18 }}>
                {voted.length} of {voters.length} voted
            </span>
            <ul className="pg-roster pg-roster--lg">
                {voters.map(p => {
                    const done = voted.includes(p.id);
                    return (
                        <li key={p.id} style={{ color: done ? 'var(--pg-text)' : 'var(--pg-faint)' }}>
                            <Avatar name={p.name} src={p.photoUrl} size={36} offline={!done} />
                            <span className="pg-grow">{p.name}</span>
                            {done && <Check size={20} aria-label="Voted" />}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

/** Horizontal bars for a tally (top N); the leader is drawn in the game colour. */
export function VoteResults({ tally, players, top = 5 }: { tally: { id: string; count: number }[]; players: Player[]; top?: number }) {
    const rows = tally.filter(t => t.count > 0).slice(0, top);
    const max = Math.max(1, ...rows.map(r => r.count));
    const label = rows.map(r => `${players.find(p => p.id === r.id)?.name ?? 'Unknown'} ${r.count}`).join(', ');
    return (
        <div className="pg-bars" role="img" aria-label={`Votes: ${label}`}>
            {rows.map((row, i) => {
                const name = players.find(p => p.id === row.id)?.name ?? 'Unknown';
                const lead = i === 0 && (rows[1]?.count ?? 0) < row.count;
                return (
                    <div key={row.id} className={`pg-bar ${lead ? 'pg-bar--lead' : ''}`} aria-hidden>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                        <span className="pg-bar__track">
                            <span className="pg-bar__fill" style={{ width: `${(row.count / max) * 100}%`, animationDelay: `${i * 100}ms` }} />
                        </span>
                        <span className="pg-mono" style={{ textAlign: 'right' }}>
                            {row.count}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
