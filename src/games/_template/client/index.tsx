/**
 * Client screens. The platform shell already provides the lobby, QR join, room
 * menu, kick, play-again and rules modal — you only build the in-game screens.
 */
import { defineClient, type GameScreenProps } from '../../../platform/client/types';
import { PLATFORM_ACTIONS } from '../../../platform/protocol';
import type { Player as RosterPlayer } from '../../../platform/sdk';
import { Button, RuleList, fireConfetti, useAction, useGameEvent } from '../../../ui';
import type { View } from '../server';

const nameOf = (players: RosterPlayer[], id: string | null) => players.find(p => p.id === id)?.name ?? '—';

function Scores({ game, players }: { game: View; players: RosterPlayer[] }) {
    return (
        <ul className="pg-list">
            {game.leaderboard.map(row => (
                <li key={row.id} style={{ justifyContent: 'space-between' }}>
                    <span>
                        <span className="pg-mono pg-label-sm" style={{ marginRight: 12 }}>
                            {row.rank}
                        </span>
                        {nameOf(players, row.id)}
                    </span>
                    <strong className="pg-mono" style={{ fontWeight: 500 }}>
                        {row.score}
                    </strong>
                </li>
            ))}
        </ul>
    );
}

function Host({ room, game, send }: GameScreenProps<View>) {
    const [act, busy] = useAction(send);
    useGameEvent('confetti', () => fireConfetti());
    const text = {
        ready: 'Get ready.',
        armed: 'Wait for it…',
        go: 'Go!',
        scored: `${nameOf(room.players, game.winner)} +1`,
        finished: `${nameOf(room.players, game.leaderboard[0]?.id ?? null)} wins.`,
    }[game.phase];

    return (
        <div className="pg-stage">
            <span className="pg-label-sm" style={{ fontSize: 18 }}>
                Round {game.round}
            </span>
            <h1 className="pg-display" style={{ fontSize: 'clamp(64px, 10vw, 140px)', margin: 0, color: game.phase === 'go' ? 'var(--pg-primary)' : undefined }}>
                {text}
            </h1>
            <div>
                {(game.phase === 'ready' || game.phase === 'scored') && (
                    <Button variant="ink" size="lg" loading={busy} onClick={() => act('arm')}>
                        Next round
                    </Button>
                )}
                {game.phase === 'finished' && (
                    <Button variant="primary" size="lg" onClick={() => act(PLATFORM_ACTIONS.playAgain)}>
                        Play again
                    </Button>
                )}
            </div>
            <div style={{ maxWidth: 480 }}>
                <Scores game={game} players={room.players} />
            </div>
        </div>
    );
}

function Player({ game, send }: GameScreenProps<View>) {
    const [act] = useAction(send);
    useGameEvent('confetti', () => fireConfetti());
    return (
        <div className="pg-narrow pg-stack" style={{ ['--gap' as string]: '24px' }}>
            <span className="pg-label-sm">Your score: {game.myScore}</span>
            <button type="button" className="pg-reveal" style={{ minHeight: 420, borderColor: game.phase === 'go' ? 'var(--pg-primary)' : undefined }} onClick={() => act('tap')}>
                <span className="pg-reveal__value" style={{ color: game.phase === 'go' ? 'var(--pg-primary)' : 'var(--pg-text)' }}>
                    {game.phase === 'go' ? 'Tap!' : 'Wait…'}
                </span>
            </button>
        </div>
    );
}

function HowToPlay() {
    return (
        <RuleList
            rules={[
                { title: 'Wait', body: 'The host starts a round. Keep your thumb ready.' },
                { title: 'Tap', body: "When GO appears, be the first to tap. Too early doesn't count." },
            ]}
        />
    );
}

export default defineClient<View>({ Host, Player, HowToPlay });
