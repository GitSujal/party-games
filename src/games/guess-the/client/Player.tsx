import { useState, type ReactNode } from 'react';
import type { GameScreenProps } from '../../../platform/client/types';
import { Button, Countdown, useAction } from '../../../ui';
import { Clues, ordinal, useGuessEvents, type View } from './shared';

function Screen({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
    return (
        <>
            <div className="pg-stack" style={{ ['--gap' as string]: '8px', marginTop: 24 }}>
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

function GuessForm({ send }: { send: GameScreenProps<View>['send'] }) {
    const [act, busy] = useAction(send);
    const [text, setText] = useState('');
    return (
        <form
            className="pg-stack guess-dock"
            style={{ ['--gap' as string]: '10px' }}
            onSubmit={e => {
                e.preventDefault();
                if (text.trim()) void act('guess', { text });
            }}
        >
            <input
                className="pg-input"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Your guess"
                maxLength={80}
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="send"
                aria-label="Your guess"
            />
            <Button type="submit" variant="primary" size="lg" block loading={busy} disabled={!text.trim()}>
                Submit
            </Button>
            <Button type="button" variant="ghost" block disabled={busy} onClick={() => act('pass')}>
                Pass
            </Button>
        </form>
    );
}

export default function Player({ room, game, send }: GameScreenProps<View>) {
    useGuessEvents();
    const me = game.me;

    if (!me) {
        return (
            <div className="pg-narrow">
                <Screen title="Game in progress" sub="You'll be dealt in on the next question." />
            </div>
        );
    }

    const score = (
        <span className="pg-label-sm pg-mono">
            {me.score} points{me.rank ? ` · ${ordinal(me.rank)}` : ''}
        </span>
    );

    if (game.phase === 'finished') {
        return (
            <div className="pg-narrow pg-stack" style={{ ['--gap' as string]: '24px' }}>
                <Screen title={me.rank === 1 ? 'You won.' : `You came ${me.rank ? ordinal(me.rank) : 'in'}.`} sub={`${me.score} points. The host can start another game.`} />
            </div>
        );
    }

    const q = game.question;
    if (!q) return null;
    const result = game.reveal?.results.find(r => r.id === room.me.playerId) ?? null;

    return (
        <div className="pg-narrow pg-stack" style={{ ['--gap' as string]: '20px' }}>
            <div className="pg-row" style={{ justifyContent: 'space-between', marginTop: 16 }}>
                <span className="pg-label-sm">
                    {game.round} / {game.total}
                </span>
                {score}
            </div>

            {game.phase === 'guessing' && (
                <>
                    <div className="pg-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <h1 className="pg-display" style={{ fontSize: 30, lineHeight: 1.05, margin: 0 }}>
                            {q.prompt}
                        </h1>
                        {game.countdown && <Countdown countdown={game.countdown} lowAtMs={10_000} style={{ fontSize: 28 }} />}
                    </div>
                    <Clues images={q.images} shapes={q.shapes} compact />
                    {me.submitted ? (
                        <div className="pg-stack pg-paper pg-enter" style={{ ['--gap' as string]: '6px', padding: 20, marginTop: 8 }}>
                            <span className="pg-tape" aria-hidden />
                            <span className="pg-eyebrow">{me.passed ? 'You passed' : 'Locked in'}</span>
                            {!me.passed && <span style={{ fontSize: 24, fontWeight: 600 }}>{me.guess}</span>}
                            <span className="pg-muted">Waiting for everyone else.</span>
                        </div>
                    ) : (
                        <GuessForm key={`${game.round}:${q.images[0]}`} send={send} />
                    )}
                </>
            )}

            {game.phase === 'reveal' && game.reveal && <Reveal game={game} result={result} />}
        </div>
    );
}

function Reveal({ game, result }: { game: View; result: NonNullable<View['reveal']>['results'][number] | null }) {
    const answer = game.reveal!.answer;
    if (result?.correct) return <Screen title={<span className="pg-stamp">Correct +{result.points}</span>} sub={`It was ${answer}.`} />;
    return (
        <Screen title={result?.guess === null ? 'You passed.' : 'Not quite.'} sub={`It was ${answer}.`}>
            {result?.guess && <p className="pg-muted" style={{ margin: 0 }}>You said "{result.guess}".</p>}
        </Screen>
    );
}
