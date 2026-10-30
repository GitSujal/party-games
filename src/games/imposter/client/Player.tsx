import type { ReactNode } from 'react';
import type { GameScreenProps } from '../../../platform/client/types';
import { Banner, Countdown, RevealCard, VotePicker } from '../../../ui';
import { Eliminated, WINNER_TEXT, byId, useImposterEvents, type View } from './shared';

function Screen({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
    return (
        <>
            <div className="pg-stack" style={{ ['--gap' as string]: '8px', marginTop: 32 }}>
                <h1 className="pg-display" style={{ fontSize: 32, lineHeight: 1.05, margin: 0 }}>
                    {title}
                </h1>
                {sub && (
                    <p className="pg-muted" style={{ margin: 0, fontSize: 15 }}>
                        {sub}
                    </p>
                )}
            </div>
            {children}
        </>
    );
}

export default function Player({ room, game, send }: GameScreenProps<View>) {
    useImposterEvents();
    const me = game.me;
    const { players } = room;

    if (!me) {
        return (
            <div className="pg-narrow">
                <Screen title="Game in progress" sub="You'll be dealt in when the host starts the next game." />
            </div>
        );
    }

    const imposter = me.role === 'imposter';
    // Same card for both roles; contents only differ once revealed.
    const card = (
        <RevealCard
            label={imposter ? 'Your role' : 'Secret word'}
            value={imposter ? 'Imposter' : me.word}
            hint={imposter ? "You don't know the word. Listen and blend in." : "Hint at it. Don't say it."}
        />
    );

    return (
        <div className="pg-narrow pg-stack" style={{ ['--gap' as string]: '28px', minHeight: 'calc(100dvh - 64px)' }}>
            {!me.alive && game.phase !== 'finished' && <Banner tone="danger">You've been voted out. No hints from here on.</Banner>}

            {game.phase === 'reveal' && (
                <Screen title="Memorise this" sub="Keep your screen to yourself.">
                    {card}
                </Screen>
            )}

            {game.phase === 'discussion' && (
                <Screen title="Discussion" sub="One word each, linked to the secret word.">
                    {game.countdown && <Countdown countdown={game.countdown} style={{ fontSize: 48 }} />}
                    {card}
                </Screen>
            )}

            {game.phase === 'voting' && game.voting && (
                <Screen title="Who's the imposter?" sub={me.alive ? 'You can change your vote until the host closes it.' : 'Voting in progress.'}>
                    {game.tied && <Banner tone="danger">Tie. Nobody left; vote again.</Banner>}
                    {me.alive && (
                        <VotePicker
                            key={game.round}
                            candidates={game.players.filter(p => p.alive && p.id !== room.me.playerId).map(p => byId(players, p.id)!).filter(Boolean)}
                            myVote={game.voting.myVote}
                            onVote={targetId => send('vote', { targetId })}
                        />
                    )}
                    <details>
                        <summary className="pg-link">Peek at your card</summary>
                        <div style={{ marginTop: 16 }}>{card}</div>
                    </details>
                </Screen>
            )}

            {game.phase === 'results' && game.result && (
                <Screen
                    title={
                        game.result.eliminated
                            ? `${game.result.eliminated === room.me.playerId ? 'You were' : `${byId(players, game.result.eliminated)?.name ?? 'A player'} was`} ${game.result.eliminatedRole === 'imposter' ? 'an imposter.' : 'genuine.'}`
                            : 'Counting votes.'
                    }
                    sub={game.result.winner ? WINNER_TEXT[game.result.winner].title : 'Watch the big screen.'}
                />
            )}

            {game.phase === 'finished' && (
                <Screen
                    title={game.winner ? ((game.winner === 'imposters') === imposter ? 'You won.' : 'You lost.') : 'Game over.'}
                    sub={`${game.winner ? WINNER_TEXT[game.winner].title + ' ' : ''}The host can start another round.`}
                />
            )}

            <div style={{ marginTop: 'auto' }}>
                <Eliminated game={game} players={players} />
            </div>
        </div>
    );
}
