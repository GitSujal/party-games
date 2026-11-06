import { useEffect, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import type { GameScreenProps } from '../../../platform/client/types';
import { PLATFORM_ACTIONS } from '../../../platform/protocol';
import { Banner, Button, ConfirmButton, Countdown, VoteProgress, VoteResults, useAction } from '../../../ui';
import { CategoryTag, Eliminated, WINNER_TEXT, byId, remainingLine, useImposterEvents, type View } from './shared';

/** Two-column TV layout: the moment on the left, standings + the host's next action on the right. */
function Split({ main, side }: { main: ReactNode; side: ReactNode }) {
    return (
        <div className="imposter-split">
            <section className="imposter-split__main">{main}</section>
            <aside className="imposter-split__side">{side}</aside>
        </div>
    );
}

const headline = (size = 'clamp(48px, 7vw, 96px)'): React.CSSProperties => ({ fontSize: size, margin: 0 });

export default function Host({ room, game, send }: GameScreenProps<View>) {
    useImposterEvents();
    const [act, busy] = useAction(send);
    const { players } = room;
    const result = game.result;

    // Results reveal: eliminated → status → winner advance on their own after a beat.
    useEffect(() => {
        if (game.phase !== 'results') return;
        const delay = game.revealStep === 2 ? 4000 : game.revealStep === 3 && result?.gameOver ? 3000 : null;
        if (!delay) return;
        const t = setTimeout(() => act('revealNext'), delay);
        return () => clearTimeout(t);
    }, [game.phase, game.revealStep, result?.gameOver, act]);

    const changeWord = (
        <ConfirmButton variant="ghost" confirmLabel="New word" onConfirm={() => act('changeWord')}>
            Change word
        </ConfirmButton>
    );

    // Always on offer, so the host can drop the hint whenever the table is stuck.
    const categoryToggle = (
        <Button variant="ghost" loading={busy} onClick={() => act('showCategory', { visible: !game.category })}>
            {game.category ? 'Hide category' : 'Show category'}
        </Button>
    );

    const side = (action: ReactNode) => (
        <>
            <span className="pg-label-sm" style={{ fontSize: 15 }}>
                Round {game.round}
            </span>
            <CategoryTag game={game} />
            <Eliminated game={game} players={players} />
            <div className="pg-stack" style={{ marginTop: 'auto', ['--gap' as string]: '8px' }}>
                {action}
                {categoryToggle}
            </div>
        </>
    );

    if (game.phase === 'reveal') {
        return (
            <Split
                main={
                    <>
                        <h1 className="pg-display" style={headline()}>
                            Check your phones.
                        </h1>
                        <p className="pg-muted" style={{ fontSize: 22, maxWidth: 620, margin: 0, lineHeight: 1.45 }}>
                            Everyone has the secret word except the imposter. Memorise it, then hide your screen.
                        </p>
                    </>
                }
                side={side(
                    <>
                        <Button variant="ink" size="lg" block loading={busy} onClick={() => act('beginDiscussion')}>
                            Start discussion
                        </Button>
                        {changeWord}
                    </>
                )}
            />
        );
    }

    if (game.phase === 'discussion') {
        return (
            <Split
                main={
                    <>
                        <span className="pg-label-sm" style={{ fontSize: 18 }}>
                            Discussion
                        </span>
                        {game.countdown ? (
                            <Countdown countdown={game.countdown} style={{ fontSize: 'clamp(96px, 14vw, 180px)' }} />
                        ) : (
                            <h1 className="pg-display" style={headline()}>
                                Give your clues.
                            </h1>
                        )}
                        <p className="pg-muted" style={{ fontSize: 22, maxWidth: 620, margin: 0, lineHeight: 1.45 }}>
                            Go round the room. One word each, linked to the secret word. Not too obvious.
                        </p>
                    </>
                }
                side={side(
                    <>
                        <Button variant="ink" size="lg" block loading={busy} onClick={() => act('startVoting')}>
                            Open voting
                        </Button>
                        {changeWord}
                    </>
                )}
            />
        );
    }

    if (game.phase === 'voting' && game.voting) {
        const voters = game.voting.voters.map(id => byId(players, id)!).filter(Boolean);
        const all = game.voting.voted.length >= game.voting.voters.length;
        return (
            <Split
                main={
                    <>
                        {game.tied && <Banner tone="danger">It was a tie, so nobody left. Vote again.</Banner>}
                        <h1 className="pg-display" style={headline('clamp(44px, 5vw, 72px)')}>
                            Who's the imposter?
                        </h1>
                        <VoteProgress voters={voters} voted={game.voting.voted} />
                    </>
                }
                side={side(
                    all ? (
                        <Button variant="ink" size="lg" block loading={busy} onClick={() => act('closeVoting')}>
                            Reveal the votes
                        </Button>
                    ) : (
                        <ConfirmButton size="lg" block disabled={game.voting.voted.length === 0} confirmLabel="Close now" onConfirm={() => act('closeVoting')}>
                            Close voting early
                        </ConfirmButton>
                    )
                )}
            />
        );
    }

    if (game.phase === 'results' && result) {
        const name = byId(players, result.eliminated)?.name ?? 'A player';
        const imposter = result.eliminatedRole === 'imposter';
        let action: ReactNode = null;
        if (game.revealStep === 1) {
            action = (
                <Button variant="ink" size="lg" block loading={busy} onClick={() => act('revealNext')}>
                    Reveal who's out
                </Button>
            );
        } else if (game.revealStep >= 3 && result.gameOver === false) {
            action = (
                <Button variant="ink" size="lg" block loading={busy} onClick={() => act('nextRound')}>
                    Next round
                </Button>
            );
        } else if (game.revealStep === 4) {
            action = (
                <Button variant="ink" size="lg" block loading={busy} onClick={() => act('nextRound')}>
                    Finish
                </Button>
            );
        }

        return (
            <Split
                main={
                    <>
                        {result.eliminated ? (
                            <div className="pg-stack pg-enter" style={{ ['--gap' as string]: '16px' }}>
                                <span className="pg-label-sm" style={{ fontSize: 18 }}>
                                    Voted out
                                </span>
                                <h1 className="pg-display" style={headline('clamp(64px, 8vw, 112px)')}>
                                    {name}
                                </h1>
                                <p style={{ margin: 0, fontSize: 36, letterSpacing: '-0.02em' }}>
                                    was {imposter ? <strong style={{ color: 'var(--pg-primary)', fontWeight: 600 }}>an imposter.</strong> : 'a genuine player.'}
                                </p>
                            </div>
                        ) : (
                            <h1 className="pg-display" style={headline('clamp(44px, 5vw, 72px)')}>
                                The votes are in.
                            </h1>
                        )}
                        <div style={{ maxWidth: 720, width: '100%' }}>
                            <VoteResults tally={result.tally} players={players} />
                        </div>
                        {result.winner && (
                            <div className="pg-stack pg-enter" style={{ ['--gap' as string]: '6px' }}>
                                <span className="pg-display" style={{ fontSize: 44 }}>
                                    {WINNER_TEXT[result.winner].title}
                                </span>
                                <span className="pg-muted" style={{ fontSize: 18 }}>
                                    {WINNER_TEXT[result.winner].line}
                                </span>
                            </div>
                        )}
                    </>
                }
                side={
                    <>
                        {result.remaining && (
                            <div className="pg-stack pg-enter" style={{ ['--gap' as string]: '4px' }}>
                                <span className="pg-label-sm" style={{ fontSize: 15 }}>
                                    Still in the game
                                </span>
                                <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>{remainingLine(result.remaining)}</span>
                            </div>
                        )}
                        <CategoryTag game={game} />
                        <Eliminated game={game} players={players} />
                        <div className="pg-stack" style={{ marginTop: 'auto', ['--gap' as string]: '8px' }}>
                            {action}
                            {categoryToggle}
                        </div>
                    </>
                }
            />
        );
    }

    if (game.phase === 'finished') {
        const imposters = game.players.filter(p => p.role === 'imposter');
        return (
            <Split
                main={
                    <>
                        <span className="pg-label-sm" style={{ fontSize: 18 }}>
                            Game over
                        </span>
                        <h1 className="pg-display" style={headline()}>
                            {game.winner ? WINNER_TEXT[game.winner].title : 'Game over.'}
                        </h1>
                        <p className="pg-muted" style={{ fontSize: 22, margin: 0 }}>
                            The imposter{imposters.length === 1 ? ' was' : 's were'}{' '}
                            <strong style={{ color: 'var(--pg-text)', fontWeight: 600 }}>
                                {imposters.map(p => byId(players, p.id)?.name ?? 'someone who left').join(' and ')}
                            </strong>
                            .
                        </p>
                    </>
                }
                side={
                    <>
                        <CategoryTag game={game} />
                        <Eliminated game={game} players={players} />
                        <div className="pg-stack" style={{ marginTop: 'auto', ['--gap' as string]: '8px' }}>
                            <Button variant="primary" size="lg" block icon={<RotateCcw size={18} />} loading={busy} onClick={() => act(PLATFORM_ACTIONS.playAgain)}>
                                Play again
                            </Button>
                            {categoryToggle}
                        </div>
                    </>
                }
            />
        );
    }

    return null;
}
