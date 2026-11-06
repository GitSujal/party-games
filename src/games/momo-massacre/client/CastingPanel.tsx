import { Loader2, RefreshCw, Shuffle } from 'lucide-react';
import type { GameScreenProps } from '../../../platform/client/types';
import { Avatar, Button, useAction } from '../../../ui';
import type { View } from './shared';

/** Lobby panel: give each player a character (manually or all at once). */
export default function CastingPanel({ room, game, send }: GameScreenProps<View>) {
    const [act, busy] = useAction(send);
    const characters = game.host?.characters ?? [];
    const castByPlayer = new Map(game.cast.map(c => [c.playerId, c]));
    const taken = new Set(game.cast.map(c => c.character.id));
    const uncast = room.players.filter(p => !castByPlayer.has(p.id)).length;

    return (
        <section className="pg-stack" style={{ ['--gap' as string]: '12px' }}>
            <div className="pg-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div className="pg-stack" style={{ ['--gap' as string]: '2px' }}>
                    <h2 className="pg-section-title">Cast the characters</h2>
                    <span className="pg-help">Auto-cast fills the roles the story needs first.</span>
                </div>
                <Button size="sm" icon={<Shuffle size={16} />} loading={busy} disabled={uncast === 0} onClick={() => act('autoCast')}>
                    Auto-cast{uncast > 0 ? ` ${uncast}` : ''}
                </Button>
            </div>

            {room.players.length === 0 ? (
                <span className="pg-muted">Characters can be cast once players join.</span>
            ) : (
                <ul className="pg-list">
                    {room.players.map(p => {
                        const entry = castByPlayer.get(p.id);
                        const portrait = entry?.portrait;
                        return (
                            <li key={p.id} style={{ flexWrap: 'nowrap', gap: 12 }}>
                                <Avatar name={p.name} src={portrait?.status === 'ready' ? portrait.url : p.photoUrl} size={32} offline={!p.connected} />
                                <span style={{ width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                <select
                                    className="pg-select"
                                    value={entry?.character.id ?? ''}
                                    onChange={e => act('assignCharacter', { playerId: p.id, characterId: e.target.value || null })}
                                    aria-label={`Character for ${p.name}`}
                                >
                                    <option value="">Not cast</option>
                                    {characters.map(c => (
                                        <option key={c.id} value={c.id} disabled={taken.has(c.id) && entry?.character.id !== c.id}>
                                            {c.name}
                                            {c.isVictim ? ' (victim)' : ''}
                                        </option>
                                    ))}
                                </select>
                                {portrait?.status === 'generating' && (
                                    <Loader2 size={18} aria-label="Generating portrait" style={{ animation: 'pg-spin 1s linear infinite', flexShrink: 0, color: 'var(--pg-muted)' }} />
                                )}
                                {portrait?.status === 'failed' && (
                                    <button type="button" className="pg-icon-btn" aria-label="Portrait failed, retry" title="Portrait failed, retry" onClick={() => act('retryPortrait', { playerId: p.id })}>
                                        <RefreshCw size={16} />
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
