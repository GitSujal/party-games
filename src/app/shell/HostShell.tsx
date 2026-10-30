/**
 * Host shell: everything around a game's Host screen — connection, lobby,
 * top bar with room code/PIN, player management drawer, play again, rules.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { HelpCircle, Menu, RotateCcw, Undo2, UserX, X } from 'lucide-react';
import { findMeta } from '../../games/catalog';
import { EventBus, EventProvider } from '../../platform/client/events';
import { getSession } from '../../platform/client/session';
import { useRoom } from '../../platform/client/useRoom';
import { PLATFORM_ACTIONS } from '../../platform/protocol';
import { Avatar, ConfirmButton, FullscreenMessage, IconButton, Lobby, Modal, QRJoin, useAction } from '../../ui';
import { useDocumentTheme, useGameClient, useTitle } from '../hooks';
import { ConnectionBanner } from './ConnectionBanner';
import { ResumeHost } from './ResumeHost';

export function HostShell({ code }: { code: string }) {
    const [session, setSession] = useState(() => getSession(code, 'host'));
    const bus = useMemo(() => new EventBus(), []);
    const { status, room, game, send } = useRoom(code, session?.token ?? null, bus.emit);
    const meta = room ? findMeta(room.gameId) : undefined;
    const { client, error } = useGameClient(room?.gameId);
    const [act] = useAction(send);
    const [drawer, setDrawer] = useState(false);
    const [rules, setRules] = useState(false);
    const [showPin, setShowPin] = useState(false);

    useDocumentTheme(meta?.theme);
    useTitle(meta ? `${meta.name} · ${code}` : code);

    if (!session || status === 'unauthorized') {
        return <ResumeHost code={code} onResumed={() => setSession(getSession(code, 'host'))} />;
    }
    if (status === 'closed') {
        return (
            <FullscreenMessage title="This room has ended">
                <Link to="/" className="pg-btn pg-btn--primary">
                    Back to games
                </Link>
            </FullscreenMessage>
        );
    }
    if (error) return <FullscreenMessage title={error} />;
    if (!room || !meta || !client) return <FullscreenMessage title="Opening the room…" loading />;

    const screenProps = { room, game, meta, send };
    const { HostLobbyPanel, Host, HowToPlay } = client;

    return (
        <EventProvider bus={bus}>
            <div className="pg-shell">
                <header className="pg-topbar">
                    <span className="pg-topbar__title">
                        <span className="pg-dot" aria-hidden />
                        {meta.name}
                    </span>
                    <span className="pg-grow" />
                    {room.status === 'playing' && <span className="pg-topbar__meta pg-mono">{room.code}</span>}
                    {session.pin && (
                        <button type="button" className="pg-btn pg-btn--sm" onClick={() => setShowPin(s => !s)} title="Use the PIN to host from another device">
                            <span className="pg-muted">PIN</span> <span className="pg-mono">{showPin ? session.pin : '••••'}</span>
                        </button>
                    )}
                    {HowToPlay && (
                        <IconButton label="How to play" onClick={() => setRules(true)}>
                            <HelpCircle size={18} />
                        </IconButton>
                    )}
                    <IconButton label="Room menu" onClick={() => setDrawer(true)}>
                        <Menu size={18} />
                    </IconButton>
                </header>

                <main className="pg-shell__main">
                    {room.status === 'lobby' ? (
                        <Lobby room={room} meta={meta} send={send} panel={HostLobbyPanel && <HostLobbyPanel {...screenProps} />} />
                    ) : (
                        <Host {...screenProps} />
                    )}
                </main>

                {drawer && (
                    <>
                        <div className="pg-drawer-backdrop" onClick={() => setDrawer(false)} />
                        <aside className="pg-drawer" aria-label="Room menu">
                            <div className="pg-modal__head">
                                <h3>Room</h3>
                                <IconButton label="Close" onClick={() => setDrawer(false)}>
                                    <X size={18} />
                                </IconButton>
                            </div>
                            <div className="pg-drawer__body">
                                <QRJoin code={room.code} compact />

                                <section className="pg-stack" style={{ ['--gap' as string]: '8px' }}>
                                    <h4 className="pg-section-title">Players · {room.players.length}</h4>
                                    {room.players.length === 0 ? (
                                        <span className="pg-muted">Nobody yet.</span>
                                    ) : (
                                        <ul className="pg-list">
                                            {room.players.map(p => (
                                                <li key={p.id} style={{ justifyContent: 'space-between' }}>
                                                    <span className="pg-player">
                                                        <Avatar name={p.name} src={p.photoUrl} size={30} offline={!p.connected} />
                                                        <span>
                                                            {p.name}
                                                            {!p.connected && <span className="pg-muted"> · offline</span>}
                                                        </span>
                                                    </span>
                                                    <ConfirmButton size="sm" variant="ghost" icon={<UserX size={16} />} confirmLabel="Kick" onConfirm={() => act(PLATFORM_ACTIONS.kick, { playerId: p.id })}>
                                                        Kick
                                                    </ConfirmButton>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>

                                {room.status === 'playing' && (
                                    <section className="pg-stack" style={{ ['--gap' as string]: '10px' }}>
                                        <h4 className="pg-section-title">Game</h4>
                                        <ConfirmButton icon={<RotateCcw size={16} />} confirmLabel="Restart now" onConfirm={() => act(PLATFORM_ACTIONS.playAgain).then(() => setDrawer(false))}>
                                            Restart with same players
                                        </ConfirmButton>
                                        <ConfirmButton icon={<Undo2 size={16} />} confirmLabel="Back to lobby" onConfirm={() => act(PLATFORM_ACTIONS.backToLobby).then(() => setDrawer(false))}>
                                            End game, back to lobby
                                        </ConfirmButton>
                                    </section>
                                )}

                                <Link to="/" className="pg-link">
                                    All games (the room stays open)
                                </Link>
                            </div>
                        </aside>
                    </>
                )}

                {HowToPlay && (
                    <Modal open={rules} onClose={() => setRules(false)} title={`How to play ${meta.name}`}>
                        <HowToPlay role="host" game={game} />
                    </Modal>
                )}
                <ConnectionBanner status={status} />
            </div>
        </EventProvider>
    );
}
