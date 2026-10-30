import type { ReactNode } from 'react';
import { useState } from 'react';
import { Check, Layers, RotateCcw } from 'lucide-react';
import type { GameScreenProps } from '../../../platform/client/types';
import { PLATFORM_ACTIONS } from '../../../platform/protocol';
import type { Player } from '../../../platform/sdk';
import { Button, ConfirmButton, Countdown, Modal, useAction } from '../../../ui';
import { Clues, nameOf, useGuessEvents, type View } from './shared';

/** Standings with each player's status: answered (while guessing) or their guess (at the reveal). */
function Standings({ game, players }: { game: View; players: Player[] }) {
    const results = game.reveal?.results;
    return (
        <section className="pg-stack" style={{ ['--gap' as string]: '0px' }}>
            <h2 className="pg-label-sm" style={{ margin: 0, paddingBottom: 12, borderBottom: '1px solid var(--pg-border)', fontWeight: 400 }}>
                Leaderboard
            </h2>
            {game.leaderboard.map(row => {
                const result = results?.find(r => r.id === row.id);
                const answered = game.submitted.includes(row.id);
                return (
                    <div key={row.id} className="guess-standing">
                        <span className="pg-mono pg-muted">{row.rank}</span>
                        <span className="guess-standing__name">
                            {nameOf(players, row.id)}
                            {result && (
                                <span className="guess-standing__guess" style={{ color: result.correct ? 'var(--pg-primary)' : 'var(--pg-muted)' }}>
                                    {result.guess === null ? 'Passed' : result.guess}
                                </span>
                            )}
                        </span>
                        <span className="pg-mono" style={{ textAlign: 'right' }}>
                            {result ? (
                                result.points > 0 && <span style={{ color: 'var(--pg-primary)', marginRight: 10 }}>+{result.points}</span>
                            ) : (
                                game.phase === 'guessing' && <span className={answered ? 'pg-dot' : 'pg-dot pg-dot--off'} title={answered ? 'Answered' : 'Thinking'} style={{ marginRight: 12 }} />
                            )}
                            {row.score}
                        </span>
                    </div>
                );
            })}
        </section>
    );
}

/** Switch categories on or off while the game is running. */
function CategoriesButton({ game, send }: { game: View; send: GameScreenProps<View>['send'] }) {
    const [open, setOpen] = useState(false);
    const [act, busy] = useAction(send);
    const enabled = game.categories.filter(c => c.enabled).length;
    return (
        <>
            <Button variant="ghost" icon={<Layers size={16} />} onClick={() => setOpen(true)}>
                Categories · {enabled} of {game.categories.length}
            </Button>
            <Modal open={open} onClose={() => setOpen(false)} title="Categories">
                <div className="pg-stack" style={{ ['--gap' as string]: '10px' }}>
                    <p className="pg-muted" style={{ margin: 0 }}>
                        Changes apply from the next question.
                    </p>
                    {game.categories.map(c => (
                        <label key={c.id} className="pg-switch">
                            <input type="checkbox" checked={c.enabled} disabled={busy} onChange={e => act('setCategory', { id: c.id, enabled: e.target.checked })} />
                            <span className="pg-label">
                                {c.name} <span className="pg-muted">· {c.left} left</span>
                            </span>
                        </label>
                    ))}
                    <Button variant="primary" icon={<Check size={16} />} onClick={() => setOpen(false)}>
                        Done
                    </Button>
                </div>
            </Modal>
        </>
    );
}

export default function Host({ room, game, send }: GameScreenProps<View>) {
    useGuessEvents();
    const [act, busy] = useAction(send);
    const { players } = room;

    const layout = (main: ReactNode, actions: ReactNode) => (
        <div className="guess-split">
            <section className="guess-split__main">{main}</section>
            <aside className="guess-split__side">
                <Standings game={game} players={players} />
                <div className="pg-stack" style={{ marginTop: 'auto', ['--gap' as string]: '8px' }}>
                    {actions}
                </div>
            </aside>
        </div>
    );

    if (game.phase === 'finished') {
        const top = game.leaderboard.filter(r => r.rank === 1);
        return layout(
            <>
                <span className="pg-label-sm" style={{ fontSize: 18 }}>
                    Game over
                </span>
                <h1 className="pg-display" style={{ fontSize: 'clamp(56px, 8vw, 112px)', margin: 0 }}>
                    {top.length ? `${top.map(r => nameOf(players, r.id)).join(' and ')} ${top.length > 1 ? 'win' : 'wins'}.` : 'Game over.'}
                </h1>
                {top[0] && (
                    <p className="pg-muted" style={{ fontSize: 24, margin: 0 }}>
                        {top[0].score} points
                    </p>
                )}
            </>,
            <Button variant="primary" size="lg" block icon={<RotateCcw size={18} />} loading={busy} onClick={() => act(PLATFORM_ACTIONS.playAgain)}>
                Play again
            </Button>
        );
    }

    const q = game.question;
    if (!q) return null;
    const answered = game.submitted.length;
    const everyone = game.participants.length;

    const head = (
        <div className="pg-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
            <div className="pg-stack" style={{ ['--gap' as string]: '6px' }}>
                <span className="pg-label-sm" style={{ fontSize: 16 }}>
                    Question {game.round} of {game.total}
                </span>
                <h1 className="pg-display" style={{ fontSize: 'clamp(40px, 5vw, 72px)', margin: 0 }}>
                    {q.prompt}
                </h1>
            </div>
            {game.phase === 'guessing' && game.countdown && <Countdown countdown={game.countdown} lowAtMs={10_000} style={{ fontSize: 56 }} />}
        </div>
    );

    if (game.phase === 'reveal' && game.reveal) {
        const right = game.reveal.results.filter(r => r.correct).length;
        return layout(
            <>
                {head}
                <Clues images={q.images} />
                <div className="pg-stack pg-enter" style={{ ['--gap' as string]: '6px' }}>
                    <span className="pg-label-sm" style={{ fontSize: 16 }}>
                        The answer
                    </span>
                    <span className="pg-display" style={{ fontSize: 'clamp(44px, 6vw, 88px)', color: 'var(--pg-primary)' }}>
                        {game.reveal.answer}
                    </span>
                    <span className="pg-muted" style={{ fontSize: 20 }}>
                        {right === 0 ? 'Nobody got it.' : right === everyone ? 'Everyone got it.' : `${right} of ${everyone} got it.`}
                    </span>
                    {game.reveal.credits.length > 0 && (
                        <span className="pg-label-sm" style={{ marginTop: 8 }}>
                            {game.reveal.credits.join(' · ')}
                        </span>
                    )}
                </div>
            </>,
            <>
                <Button variant="ink" size="lg" block loading={busy} onClick={() => act('next')}>
                    {game.isLast ? 'Final scores' : 'Next question'}
                </Button>
                <CategoriesButton game={game} send={send} />
                {!game.isLast && (
                    <ConfirmButton variant="ghost" confirmLabel="End now" onConfirm={() => act('end')}>
                        End game
                    </ConfirmButton>
                )}
            </>
        );
    }

    return layout(
        <>
            {head}
            <Clues images={q.images} />
            <p className="pg-muted" style={{ fontSize: 20, margin: 0 }}>
                {answered} of {everyone} answered. Type your guess on your phone.
            </p>
        </>,
        <>
            <ConfirmButton variant="ink" size="lg" block confirmLabel="Reveal now" onConfirm={() => act('reveal')}>
                Reveal answer
            </ConfirmButton>
            <CategoriesButton game={game} send={send} />
            {game.canSkip && (
                <ConfirmButton variant="ghost" confirmLabel="Skip it" onConfirm={() => act('skip')}>
                    Skip question
                </ConfirmButton>
            )}
        </>
    );
}
