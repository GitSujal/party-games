import { Layers } from 'lucide-react';
import type { GameScreenProps } from '../../../platform/client/types';
import { useAction } from '../../../ui';
import type { View } from './shared';

/** Lobby: choose which word categories the secret word is drawn from. */
export default function CategoriesPanel({ game, send }: GameScreenProps<View>) {
    const [act, busy] = useAction(send);
    return (
        <section className="pg-stack" style={{ ['--gap' as string]: '12px' }}>
            <div className="pg-stack" style={{ ['--gap' as string]: '2px' }}>
                <h2 className="pg-eyebrow" style={{ margin: 0, alignSelf: 'flex-start' }}>
                    <Layers size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                    Word categories
                </h2>
                <span className="pg-help">The secret word comes from one of the categories that are on. You can show its category to everyone during the game.</span>
            </div>
            {game.categories.map(c => (
                <label key={c.id} className="pg-switch">
                    <input type="checkbox" checked={c.enabled} disabled={busy} onChange={e => act('setCategory', { id: c.id, enabled: e.target.checked })} />
                    <span className="pg-label">
                        {c.name} <span className="pg-muted">· {c.words} words</span>
                    </span>
                </label>
            ))}
        </section>
    );
}
