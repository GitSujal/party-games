import type { Player } from '../../../platform/sdk';
import { fireConfetti, useGameEvent, useToast } from '../../../ui';
import type { ImposterView, Winner } from '../server';

export type View = ImposterView;

export function byId(players: Player[], id: string | null | undefined): Player | undefined {
    return players.find(p => p.id === id);
}

export const WINNER_TEXT: Record<Winner, { title: string; line: string }> = {
    genuine: { title: 'Genuine players win.', line: 'Every imposter has been caught.' },
    imposters: { title: 'Imposters win.', line: 'They blended in long enough to take over.' },
};

/** Shared reactions to server events, for both host and phones. */
export function useImposterEvents(): void {
    const toast = useToast();
    useGameEvent('confetti', () => fireConfetti());
    useGameEvent('tie', () => toast("It's a tie. Nobody leaves; vote again."));
    useGameEvent('wordChanged', () => toast('New word. Check your card again.'));
}

/** Players who are out, with their (now public) role. Never shows the word. */
export function Eliminated({ game, players }: { game: View; players: Player[] }) {
    const out = game.players.filter(p => !p.alive);
    if (out.length === 0) return null;
    return (
        <section className="pg-stack" style={{ ['--gap' as string]: '0px' }}>
            <h2 className="pg-label-sm" style={{ margin: 0, paddingBottom: 12, borderBottom: '1px solid var(--pg-border)', fontWeight: 400 }}>
                Out
            </h2>
            {out.map(p => {
                const imposter = p.role === 'imposter';
                return (
                    <div key={p.id} className="pg-row" style={{ justifyContent: 'space-between', minHeight: 52, borderBottom: '1px solid var(--pg-border)', fontSize: 17 }}>
                        <span style={{ color: imposter ? 'var(--pg-text)' : 'var(--pg-muted)' }}>{byId(players, p.id)?.name ?? 'Left the game'}</span>
                        <span style={{ color: imposter ? 'var(--pg-primary)' : 'var(--pg-muted)', fontWeight: imposter ? 500 : 400 }}>{imposter ? 'Imposter' : 'Genuine'}</span>
                    </div>
                );
            })}
        </section>
    );
}

/** "1 imposter · 3 genuine" */
export function remainingLine(r: { imposters: number; genuine: number }): string {
    return `${r.imposters} imposter${r.imposters === 1 ? '' : 's'} · ${r.genuine} genuine`;
}
