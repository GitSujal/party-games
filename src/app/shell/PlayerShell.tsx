/** Player (phone) shell: connection, lobby waiting screen, kicked/expired states. */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { HelpCircle } from 'lucide-react';
import { findMeta } from '../../games/catalog';
import { EventBus, EventProvider } from '../../platform/client/events';
import { clearSession, getSession } from '../../platform/client/session';
import { useRoom } from '../../platform/client/useRoom';
import type { GameScreenProps } from '../../platform/client/types';
import { FullscreenMessage, IconButton, Modal, PlayerChip } from '../../ui';
import { useDocumentTheme, useGameClient, useTitle } from '../hooks';
import { ConnectionBanner } from './ConnectionBanner';

function WaitingRoom({ room, meta }: GameScreenProps) {
    const me = room.players.find(p => p.id === room.me.playerId);
    return (
        <div className="pg-narrow pg-stack" style={{ ['--gap' as string]: '32px', paddingTop: 48 }}>
            <div className="pg-stack" style={{ ['--gap' as string]: '8px' }}>
                <h1 className="pg-display" style={{ fontSize: 32, margin: 0 }}>
                    You're in{me ? `, ${me.name}` : ''}.
                </h1>
                <p className="pg-muted" style={{ margin: 0 }}>
                    Waiting for the host to start {meta.name}. Keep this screen open.
                </p>
            </div>
            <section className="pg-stack" style={{ ['--gap' as string]: '8px' }}>
                <h2 className="pg-section-title">In the room · {room.players.length}</h2>
                <ul className="pg-list">
                    {room.players.map(p => (
                        <li key={p.id}>
                            <PlayerChip player={p} />
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

export function PlayerShell({ code }: { code: string }) {
    const navigate = useNavigate();
    const session = useMemo(() => getSession(code, 'player'), [code]);
    const bus = useMemo(() => new EventBus(), []);
    const { status, room, game, send } = useRoom(code, session?.token ?? null, bus.emit);
    const meta = room ? findMeta(room.gameId) : undefined;
    const { client, error } = useGameClient(room?.gameId);
    const [rules, setRules] = useState(false);

    useDocumentTheme(meta?.theme);
    useTitle(meta?.name ?? 'Joining');

    // No (or stale) seat for this room → go pick a name.
    useEffect(() => {
        if (!session || status === 'unauthorized') {
            clearSession(code, 'player');
            navigate(`/join/${code}`, { replace: true });
        }
    }, [session, status, code, navigate]);

    if (status === 'kicked') {
        return (
            <FullscreenMessage title="The host removed you from this room">
                <Link
                    to={`/join/${code}`}
                    className="pg-btn"
                    onClick={() => clearSession(code, 'player')}
                >
                    Rejoin
                </Link>
            </FullscreenMessage>
        );
    }
    if (status === 'closed') {
        return (
            <FullscreenMessage title="This room has ended">
                <Link to="/" className="pg-btn pg-btn--primary">
                    Find another game
                </Link>
            </FullscreenMessage>
        );
    }
    if (error) return <FullscreenMessage title={error} />;
    if (!room || !meta || !client) return <FullscreenMessage title="Joining the room…" loading />;

    const me = room.players.find(p => p.id === room.me.playerId);
    const screenProps: GameScreenProps = { room, game, meta, send };
    const Screen = room.status === 'lobby' ? (client.PlayerLobby ?? WaitingRoom) : client.Player;
    const HowToPlay = client.HowToPlay;

    return (
        <EventProvider bus={bus}>
            <div className="pg-shell">
                <header className="pg-topbar">
                    <span className="pg-topbar__title">
                        <span className="pg-dot" aria-hidden />
                        {meta.name}
                    </span>
                    <span className="pg-grow" />
                    {me && <span className="pg-topbar__meta">{me.name}</span>}
                    {HowToPlay && (
                        <IconButton label="How to play" onClick={() => setRules(true)}>
                            <HelpCircle size={18} />
                        </IconButton>
                    )}
                </header>
                <main className="pg-shell__main">
                    <Screen {...screenProps} />
                </main>
                {HowToPlay && (
                    <Modal open={rules} onClose={() => setRules(false)} title={`How to play ${meta.name}`}>
                        <HowToPlay role="player" game={game} />
                    </Modal>
                )}
                <ConnectionBanner status={status} />
            </div>
        </EventProvider>
    );
}
