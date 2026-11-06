import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { findMeta } from '../../games/catalog';
import { api } from '../../platform/client/api';
import { saveSession } from '../../platform/client/session';
import { defaultSettings } from '../../platform/settings';
import { Button, FullscreenMessage, SettingsForm } from '../../ui';
import { useDocumentTheme, useGameClient, useTitle } from '../hooks';
import { GameTile, SiteHeader } from './SiteChrome';

export default function GameDetail() {
    const { gameId = '' } = useParams();
    const navigate = useNavigate();
    const meta = findMeta(gameId);
    const { client } = useGameClient(meta ? gameId : null);
    const [settings, setSettings] = useState(() => (meta ? defaultSettings(meta) : {}));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useDocumentTheme(meta?.theme);
    useTitle(meta?.name ?? 'Not found');

    if (!meta) {
        return (
            <FullscreenMessage title="We couldn't find that game">
                <Link to="/" className="pg-btn">
                    All games
                </Link>
            </FullscreenMessage>
        );
    }

    const host = async () => {
        setBusy(true);
        setError(null);
        try {
            const { code, hostToken, pin } = await api.createRoom(meta.id, settings);
            saveSession(code, { role: 'host', token: hostToken, pin });
            navigate(`/host/${code}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create a room');
            setBusy(false);
        }
    };

    const HowToPlay = client?.HowToPlay;

    return (
        <div className="pg-container">
            <SiteHeader>
                <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ChevronLeft size={16} /> All games
                </Link>
            </SiteHeader>

            <div className="detail">
                <main className="detail__main">
                    <div className="pg-stack" style={{ ['--gap' as string]: '20px' }}>
                        <GameTile game={meta} size={64} />
                        <h1 className="pg-display" style={{ fontSize: 'clamp(44px, 6vw, 64px)', margin: 0 }}>
                            {meta.name}
                        </h1>
                        <p style={{ margin: 0, fontSize: 20, lineHeight: 1.45, letterSpacing: '-0.01em' }}>{meta.tagline}</p>
                        <dl className="pg-facts" style={{ marginTop: 8 }}>
                            <div>
                                <dt>Players</dt>
                                <dd>
                                    {meta.players.min}–{meta.players.max}
                                </dd>
                            </div>
                            <div>
                                <dt>Length</dt>
                                <dd>{meta.duration}</dd>
                            </div>
                            {meta.tags[0] && (
                                <div>
                                    <dt>Type</dt>
                                    <dd>{meta.tags[0]}</dd>
                                </div>
                            )}
                        </dl>
                        <p className="pg-muted" style={{ margin: 0, maxWidth: 620, lineHeight: 1.6 }}>
                            {meta.description}
                        </p>
                    </div>

                    {HowToPlay && (
                        <section className="pg-rule pg-stack" style={{ ['--gap' as string]: '16px' }}>
                            <h2 className="pg-section-title" style={{ fontSize: '2rem' }}>
                                How to <span className="pg-hl">play</span>
                            </h2>
                            <HowToPlay role="host" game={null} />
                        </section>
                    )}
                </main>

                <aside className="pg-card pg-stack detail__host" style={{ ['--gap' as string]: '24px' }}>
                    <span className="pg-tape" aria-hidden />
                    <div className="pg-stack" style={{ ['--gap' as string]: '6px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.6rem' }}>Host a room</h2>
                        <p className="pg-label-sm" style={{ margin: 0 }}>
                            Open this on the screen everyone can see.
                        </p>
                    </div>
                    {meta.settings && meta.settings.length > 0 && (
                        <SettingsForm fields={meta.settings} values={settings} onChange={(k, v) => setSettings(s => ({ ...s, [k]: v }))} />
                    )}
                    {error && <div className="pg-error">{error}</div>}
                    <Button variant="primary" size="lg" block loading={busy} onClick={host}>
                        Create room
                    </Button>
                    <Link to="/join" className="pg-link" style={{ textAlign: 'center' }}>
                        Joining someone else's game?
                    </Link>
                </aside>
            </div>
        </div>
    );
}
