import { Layers } from 'lucide-react';
import type { GameScreenProps } from '../../../platform/client/types';
import { useAction } from '../../../ui';
import type { View } from './shared';

/** Lobby: choose which categories the game draws from. (The host can still change them during play.) */
export default function CategoriesPanel({ game, send }: GameScreenProps<View>) {
    const [act, busy] = useAction(send);
    return (
        <section className="pg-stack" style={{ ['--gap' as string]: '12px' }}>
                <h3 className="pg-eyebrow" style={{ margin: 0, alignSelf: 'flex-start' }}>
                    <Layers size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                    Categories
                </h3>
                {game.categories.length === 0 && <p className="pg-muted" style={{ margin: 0 }}>No categories yet.</p>}
                {game.categories.map(c => (
                    <label key={c.id} className="pg-switch">
                        <input type="checkbox" checked={c.enabled} disabled={busy} onChange={e => act('setCategory', { id: c.id, enabled: e.target.checked })} />
                        <span className="pg-label">
                            {c.name} <span className="pg-muted">· {c.left} questions</span>
                        </span>
                    </label>
                ))}
        </section>
    );
}
