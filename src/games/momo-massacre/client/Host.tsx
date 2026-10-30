/** Host (TV) screens for each manifest phase type. */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Play, X } from 'lucide-react';
import type { GameScreenProps } from '../../../platform/client/types';
import { PLATFORM_ACTIONS } from '../../../platform/protocol';
import type { Player } from '../../../platform/sdk';
import { Button, IconButton, Markdown, useAction, useGameEvent, useToast } from '../../../ui';
import type { PhaseConfig } from '../content';
import { asset, phaseConfig, playerName, portraitOf, storyline, suspects, type CastEntry, type View } from './shared';

type Act = (type: string, payload?: unknown) => Promise<boolean>;

/** Full-height panel; with a photo it becomes a dark panel (light text) over the image. */
function Panel({ image, children, className = '', style }: { image?: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
    return (
        <div
            className={`momo-panel ${image ? 'pg-dark' : ''} ${className}`}
            style={{
                ...(image
                    ? { backgroundImage: `linear-gradient(90deg, rgb(10 10 10 / 0.9) 0%, rgb(10 10 10 / 0.72) 50%, rgb(10 10 10 / 0.4) 100%), url("${image}")` }
                    : {}),
                ...style,
            }}
        >
            {children}
        </div>
    );
}

function AudioButton({ src }: { src: string }) {
    const ref = useRef<HTMLAudioElement>(null);
    return (
        <>
            <audio ref={ref} src={src} autoPlay />
            <Button icon={<Play size={16} />} onClick={() => ref.current?.play().catch(() => undefined)} style={{ background: 'transparent' }}>
                Play narration
            </Button>
        </>
    );
}

function Cinematic({ config, next }: { config: PhaseConfig; next: () => void }) {
    return (
        <Panel image={asset(config.background)}>
            <div className="momo-copy pg-enter">
                <span className="pg-label-sm" style={{ fontSize: 18 }}>
                    {config.title}
                </span>
                {config.textKey && <Markdown style={{ fontSize: 24, lineHeight: 1.6 }}>{storyline[config.textKey]}</Markdown>}
                <div className="pg-row">
                    <Button variant="primary" size="lg" onClick={next}>
                        Continue <ArrowRight size={18} />
                    </Button>
                    {config.audio && <AudioButton src={asset(config.audio)!} />}
                </div>
            </div>
        </Panel>
    );
}

function Toast({ config, step, act, next }: { config: PhaseConfig; step: number; act: Act; next: () => void }) {
    const steps = config.steps ?? [];
    const current = steps[step] ?? steps[0];
    const last = step >= steps.length - 1;
    const image = step === 0 ? asset(config.victimImage) : asset(config.toastImage);
    return (
        <Panel image={image} style={{ justifyContent: 'flex-end' }}>
            <div className="momo-copy pg-enter" key={step}>
                <h1 className="pg-display" style={{ fontSize: 'clamp(44px, 5vw, 72px)', margin: 0 }}>
                    {current?.title}
                </h1>
                {current?.textKey && <p style={{ fontSize: 26, lineHeight: 1.5, margin: 0, maxWidth: 820 }}>“{storyline[current.textKey]}”</p>}
                {current?.instruction && (
                    <p className="pg-muted" style={{ margin: 0, fontSize: 17 }}>
                        Host: {current.instruction}
                    </p>
                )}
                <div className="pg-row">
                    {last ? (
                        <Button variant="primary" size="lg" onClick={next}>
                            Next <ArrowRight size={18} />
                        </Button>
                    ) : (
                        <Button variant="primary" size="lg" onClick={() => act('setToastStep', { index: step + 1 })}>
                            Continue <ArrowRight size={18} />
                        </Button>
                    )}
                    {current?.audio && <AudioButton key={current.id} src={asset(current.audio)!} />}
                </div>
            </div>
        </Panel>
    );
}

function Announcement({ config, next }: { config: PhaseConfig; next: () => void }) {
    return (
        <Panel>
            <div className="momo-copy pg-enter">
                <h1 className="pg-display" style={{ fontSize: 'clamp(56px, 8vw, 112px)', margin: 0, color: 'var(--pg-primary)' }}>
                    {config.headline}
                </h1>
                {config.subtext && <p style={{ fontSize: 32, letterSpacing: '-0.02em', margin: 0, maxWidth: 820 }}>{config.subtext}</p>}
                {config.instruction && (
                    <p className="pg-muted" style={{ fontSize: 18, margin: 0, maxWidth: 720 }}>
                        Host: {config.instruction}
                    </p>
                )}
                <div>
                    <Button variant="ink" size="lg" onClick={next}>
                        Continue <ArrowRight size={18} />
                    </Button>
                </div>
            </div>
        </Panel>
    );
}

function Portrait({ entry, players, fit = 'cover' }: { entry: CastEntry; players: Player[]; fit?: 'cover' | 'contain' }) {
    const image = portraitOf(entry, players);
    const [failed, setFailed] = useState<string | null>(null);
    return image && failed !== image ? (
        <img src={image} alt="" onError={() => setFailed(image)} style={{ width: '100%', height: '100%', objectFit: fit }} />
    ) : (
        <span style={{ fontSize: 72, fontWeight: 600, color: 'var(--pg-faint)' }}>{entry.character.name.replace(/^The /, '').charAt(0)}</span>
    );
}

function Carousel({ config, game, players, act, next }: { config: PhaseConfig; game: View; players: Player[]; act: Act; next: () => void }) {
    const list = suspects(game, config.excludeCharacterIds ?? []);
    const i = Math.min(game.suspectIndex, Math.max(0, list.length - 1));
    const entry = list[i];

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && i > 0) act('setSuspectIndex', { index: i - 1 });
            if (e.key === 'ArrowRight' && i < list.length - 1) act('setSuspectIndex', { index: i + 1 });
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [i, list.length, act]);

    if (!entry) {
        return (
            <Panel>
                <div className="momo-copy">
                    <p className="pg-muted">No suspects have been cast.</p>
                    <div>
                        <Button onClick={next}>Skip</Button>
                    </div>
                </div>
            </Panel>
        );
    }
    return (
        <div className="momo-carousel">
            <div className="momo-carousel__image">
                <Portrait entry={entry} players={players} fit="contain" />
            </div>
            <div className="momo-carousel__copy pg-enter" key={entry.playerId}>
                <span className="pg-label-sm" style={{ fontSize: 15 }}>
                    Suspect {i + 1} of {list.length}
                </span>
                <h1 className="pg-display" style={{ fontSize: 'clamp(40px, 4.5vw, 64px)', margin: 0 }}>
                    {entry.character.name}
                </h1>
                <span className="pg-muted" style={{ fontSize: 17 }}>
                    Played by {playerName(players, entry.playerId)}
                </span>
                <Markdown style={{ fontSize: 21, lineHeight: 1.65 }}>{entry.character.about}</Markdown>
                {config.instruction && (
                    <p className="pg-muted" style={{ margin: 0 }}>
                        Host: {config.instruction}
                    </p>
                )}
            </div>
            <div className="momo-carousel__nav">
                <Button variant="ghost" disabled={i === 0} icon={<ArrowLeft size={18} />} onClick={() => act('setSuspectIndex', { index: i - 1 })}>
                    Previous
                </Button>
                <span className="pg-label-sm pg-mono">
                    {i + 1} / {list.length}
                </span>
                {i < list.length - 1 ? (
                    <Button variant="ink" onClick={() => act('setSuspectIndex', { index: i + 1 })}>
                        Next suspect <ArrowRight size={18} />
                    </Button>
                ) : (
                    <Button variant="primary" onClick={next}>
                        Begin the investigation <ArrowRight size={18} />
                    </Button>
                )}
            </div>
        </div>
    );
}

function SuspectModal({ entry, players, onClose }: { entry: CastEntry; players: Player[]; onClose: () => void }) {
    return (
        <div className="pg-modal-backdrop" onClick={onClose}>
            <div className="pg-modal momo-suspect" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={entry.character.name}>
                <div className="momo-suspect__image">
                    <Portrait entry={entry} players={players} fit="contain" />
                </div>
                <div className="pg-stack" style={{ padding: 32 }}>
                    <div className="pg-row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                        <h2 style={{ margin: 0, fontSize: 32 }}>{entry.character.name}</h2>
                        <IconButton label="Close" onClick={onClose}>
                            <X size={18} />
                        </IconButton>
                    </div>
                    <span className="pg-muted">Played by {playerName(players, entry.playerId)}</span>
                    <Markdown style={{ fontSize: 18, lineHeight: 1.6 }}>{entry.character.about}</Markdown>
                </div>
            </div>
        </div>
    );
}

function Investigation({ config, game, players, act, next }: { config: PhaseConfig; game: View; players: Player[]; act: Act; next: () => void }) {
    const [open, setOpen] = useState<CastEntry | null>(null);
    const [controls, setControls] = useState(false);
    const list = suspects(game);
    const victim = game.cast.find(c => c.character.isVictim);
    const endRef = useRef<HTMLDivElement>(null);
    useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), [game.clues.length]);

    return (
        <div className="momo-investigation">
            <section className="momo-investigation__main">
                <div className="pg-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div className="pg-stack" style={{ ['--gap' as string]: '6px' }}>
                        <span className="pg-label-sm" style={{ fontSize: 15 }}>
                            Investigation{victim ? ` · ${playerName(players, victim.playerId)} now haunts the room` : ''}
                        </span>
                        <h1 className="pg-display" style={{ fontSize: 44, margin: 0 }}>
                            {config.victimName ?? 'The victim'} is dead.
                        </h1>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setControls(c => !c)}>
                        {controls ? 'Hide host controls' : 'Host controls'}
                    </Button>
                </div>

                {controls && game.host && (
                    <div className="pg-card pg-stack" style={{ ['--gap' as string]: '0px', padding: '8px 24px 20px' }}>
                        <ul className="pg-list" style={{ borderTop: 0 }}>
                            {game.host.clueList.map(c => (
                                <li key={c.id} style={{ justifyContent: 'space-between' }}>
                                    <span>
                                        {c.name} <span className="pg-muted">· {c.audience === 'all' ? 'everyone' : c.audience}</span>
                                    </span>
                                    {c.revealed ? (
                                        <span className="pg-label-sm">Revealed</span>
                                    ) : (
                                        <Button size="sm" onClick={() => act('revealClue', { clueId: c.id })}>
                                            Reveal
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <div style={{ marginTop: 16 }}>
                            <Button variant="danger" size="sm" onClick={next}>
                                End the investigation
                            </Button>
                        </div>
                    </div>
                )}

                <h2 className="pg-section-title pg-rule">Suspects</h2>
                <div className="momo-suspects">
                    {list.map(entry => (
                        <button key={entry.playerId} type="button" className="momo-suspect-card" onClick={() => setOpen(entry)}>
                            <span className="momo-suspect-card__image">
                                <Portrait entry={entry} players={players} />
                            </span>
                            <span style={{ fontWeight: 600 }}>{entry.character.name}</span>
                            <span className="pg-label-sm">{playerName(players, entry.playerId)}</span>
                        </button>
                    ))}
                </div>
            </section>

            <aside className="momo-investigation__side">
                <h2 className="pg-section-title">Evidence</h2>
                {game.clues.length === 0 ? (
                    <p className="pg-muted" style={{ margin: 0 }}>
                        No clues revealed yet.
                    </p>
                ) : (
                    <ol className="momo-evidence">
                        {game.clues.map((c, idx) => (
                            <li key={c.id} className="pg-enter">
                                <div className="pg-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <strong style={{ fontWeight: 600 }}>
                                        <span className="pg-mono pg-label-sm" style={{ marginRight: 10 }}>
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                        {c.name}
                                    </strong>
                                    <span className="pg-label-sm">{c.audience === 'all' ? 'Everyone' : c.audience}</span>
                                </div>
                                {c.content ? (
                                    <Markdown style={{ fontSize: 16, lineHeight: 1.6 }}>{c.content}</Markdown>
                                ) : (
                                    <p className="pg-muted" style={{ margin: 0 }}>
                                        Private clue sent to {c.recipient ? playerName(players, c.recipient) : c.audience}.
                                    </p>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
                <div ref={endRef} />
            </aside>

            {open && <SuspectModal entry={open} players={players} onClose={() => setOpen(null)} />}
        </div>
    );
}

function Finale({ config, act }: { config: PhaseConfig; act: Act }) {
    return (
        <Panel>
            <div className="momo-copy pg-enter">
                <span className="pg-label-sm" style={{ fontSize: 18 }}>
                    The end
                </span>
                <h1 className="pg-display" style={{ fontSize: 'clamp(56px, 8vw, 104px)', margin: 0 }}>
                    {config.headline}
                </h1>
                <p className="pg-muted" style={{ fontSize: 24, maxWidth: 720, margin: 0 }}>
                    {config.subtext}
                </p>
                <div>
                    <Button size="lg" onClick={() => act(PLATFORM_ACTIONS.backToLobby)}>
                        Back to the lobby
                    </Button>
                </div>
            </div>
        </Panel>
    );
}

export default function Host({ room, game, send }: GameScreenProps<View>) {
    const [act] = useAction(send);
    const toast = useToast();
    useGameEvent('clue', () => toast('New evidence on the board'));

    const config = phaseConfig(game.phase);
    if (!config) return <p className="pg-muted pg-center">Unknown phase {game.phase}</p>;
    const next = () => config.next && act('setPhase', { phase: config.next });
    const props = { config, game, players: room.players, act, next };

    switch (config.type) {
        case 'cinematic':
            return <Cinematic {...props} />;
        case 'toast':
            return <Toast {...props} step={game.toastStep} />;
        case 'announcement':
            return <Announcement {...props} />;
        case 'carousel':
            return <Carousel {...props} />;
        case 'investigation':
            return <Investigation {...props} />;
        case 'finale':
            return <Finale {...props} />;
        default:
            return null;
    }
}
