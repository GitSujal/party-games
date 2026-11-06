/** Player phone: your character, your secret, and the clues you've been shown. */
import { useState, type ReactNode } from 'react';
import { Lock, Search, Target, Theater, User } from 'lucide-react';
import type { GameScreenProps } from '../../../platform/client/types';
import { Avatar, FlipCard, Markdown, useGameEvent, useToast } from '../../../ui';
import { portraitOf, type View } from './shared';

type Tab = 'role' | 'secret' | 'clues';

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'role', label: 'Role', icon: User },
    { id: 'secret', label: 'Secret', icon: Lock },
    { id: 'clues', label: 'Clues', icon: Search },
];

function Front({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
    return (
        <>
            {icon}
            <h3 style={{ margin: '8px 0 0', fontSize: 20 }}>{title}</h3>
            <span className="pg-label-sm">{hint}</span>
        </>
    );
}

export default function Player({ room, game }: GameScreenProps<View>) {
    const [tab, setTab] = useState<Tab>('role');
    const toast = useToast();
    useGameEvent('clue', () => toast('New clue. Check the Clues tab.'));

    const me = game.me;
    if (!me) {
        return (
            <div className="pg-narrow pg-stack" style={{ ['--gap' as string]: '8px', paddingTop: 56 }}>
                <h1 className="pg-display" style={{ fontSize: 32, margin: 0 }}>
                    Waiting for your character
                </h1>
                <p className="pg-muted" style={{ margin: 0 }}>
                    The host will cast you shortly.
                </p>
            </div>
        );
    }

    const entry = game.cast.find(c => c.playerId === room.me.playerId);
    const portrait = portraitOf(entry, room.players);
    const myName = room.players.find(p => p.id === room.me.playerId)?.name ?? '';
    const generating = entry?.portrait?.status === 'generating';

    return (
        <div className="pg-narrow pg-stack" style={{ ['--gap' as string]: '24px' }}>
            <div className="pg-row" style={{ gap: 16, flexWrap: 'nowrap', marginTop: 8 }}>
                <Avatar name={me.name.replace(/^The /, '')} src={portrait} size={72} />
                <div className="pg-stack" style={{ ['--gap' as string]: '4px', minWidth: 0 }}>
                    <h1 style={{ margin: 0, fontSize: 24, letterSpacing: '-0.03em' }}>{me.name}</h1>
                    <span className="pg-label-sm">
                        Played by {myName}
                        {generating ? ' · painting your portrait…' : ''}
                    </span>
                </div>
            </div>

            <div className="pg-tabs" role="tablist" aria-label="Your character">
                {TABS.map(t => (
                    <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
                        <t.icon size={16} strokeWidth={1.75} /> {t.label}
                        {t.id === 'clues' && game.clues.length > 0 && <span className="pg-mono" style={{ fontSize: 12 }}>{game.clues.length}</span>}
                    </button>
                ))}
            </div>

            {tab === 'role' && (
                <div className="pg-stack">
                    <FlipCard
                        height={420}
                        front={<Front icon={<User size={28} strokeWidth={1.5} />} title="Who are you?" hint="Tap to reveal your identity" />}
                        back={
                            <>
                                <h3 style={{ fontSize: 20 }}>{me.name}</h3>
                                <Markdown>{me.about}</Markdown>
                            </>
                        }
                    />
                    <FlipCard
                        height={280}
                        front={<Front icon={<Target size={28} strokeWidth={1.5} />} title="Your mission" hint="Tap to reveal your goal" />}
                        back={
                            <>
                                <h3 style={{ fontSize: 20 }}>Your objective</h3>
                                <Markdown>{me.goal}</Markdown>
                            </>
                        }
                    />
                    <FlipCard
                        height={280}
                        front={<Front icon={<Theater size={28} strokeWidth={1.5} />} title="Your script" hint="Tap to reveal your key actions" />}
                        back={
                            <>
                                <h3 style={{ fontSize: 20 }}>Key actions</h3>
                                <Markdown>{me.action}</Markdown>
                            </>
                        }
                    />
                </div>
            )}

            {tab === 'secret' && (
                <FlipCard
                    height={560}
                    frontStyle={{ background: '#111111', color: '#f4f4f2', borderColor: '#111111' }}
                    front={
                        <>
                            <Lock size={28} strokeWidth={1.5} />
                            <h3 style={{ margin: '8px 0 0', fontSize: 20 }}>Top secret</h3>
                            <span style={{ fontSize: 14, color: 'rgb(244 244 242 / 0.7)' }}>Make sure nobody is looking, then tap</span>
                        </>
                    }
                    back={
                        <div className="pg-stack" style={{ ['--gap' as string]: '14px' }}>
                            {me.isKiller && (
                                <div className="pg-banner pg-banner--danger">
                                    <strong>You are the killer.</strong> Nobody else knows. Keep it that way.
                                </div>
                            )}
                            <h3 style={{ margin: 0, fontSize: 20 }}>Your secret</h3>
                            <Markdown>{me.secret}</Markdown>
                            <hr className="pg-divider" />
                            <h3 style={{ margin: 0, fontSize: 17 }}>Your alibi</h3>
                            <Markdown>{me.alibi}</Markdown>
                            {me.tips && (
                                <>
                                    <hr className="pg-divider" />
                                    <h3 style={{ margin: 0, fontSize: 17 }}>Strategy</h3>
                                    <Markdown style={{ fontSize: 15 }}>{me.tips}</Markdown>
                                </>
                            )}
                        </div>
                    }
                />
            )}

            {tab === 'clues' &&
                (game.clues.length === 0 ? (
                    <p className="pg-muted" style={{ margin: '16px 0 0' }}>
                        No clues yet. The host reveals them during the investigation.
                    </p>
                ) : (
                    <ol className="pg-list" style={{ listStyle: 'none' }}>
                        {game.clues.map(c => (
                            <li key={c.id} className="pg-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: '16px 0' }}>
                                <div className="pg-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <strong style={{ fontWeight: 600 }}>{c.name}</strong>
                                    {c.audience !== 'all' && <span className="pg-label-sm">{c.content ? 'Only you' : c.audience}</span>}
                                </div>
                                {c.content ? (
                                    <Markdown style={{ fontSize: 15 }}>{c.content}</Markdown>
                                ) : (
                                    <p className="pg-muted" style={{ margin: 0 }}>
                                        A private clue was given to someone else.
                                    </p>
                                )}
                            </li>
                        ))}
                    </ol>
                ))}
        </div>
    );
}
