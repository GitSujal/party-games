import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { enabledGames } from '../../games/catalog';
import { getSession, lastRoom } from '../../platform/client/session';
import type { GameMeta } from '../../platform/sdk';
import { themeStyle } from '../../ui';
import { useTitle } from '../hooks';
import { JoinCodeForm } from './JoinCodeForm';
import { GameTile, SiteHeader } from './SiteChrome';

const STEPS = [
    { title: 'Host on a big screen', body: 'Open a game on a laptop or TV. You get a room code and a QR code.' },
    { title: 'Join from your phone', body: 'Scan and type a name. Secret roles and votes stay on your own screen.' },
    { title: 'Play, live', body: 'Every tap shows up on every screen instantly. Play again in one click.' },
];

function GameCard({ game }: { game: GameMeta }) {
    return (
        <Link to={`/g/${game.id}`} className="game-card" style={themeStyle(game.theme)}>
            <GameTile game={game} />
            <div className="pg-stack" style={{ ['--gap' as string]: '6px' }}>
                <div className="game-card__head">
                    <h3>{game.name}</h3>
                    <span className="pg-label-sm" style={{ fontSize: 13 }}>
                        {game.players.min}–{game.players.max} players · {game.duration}
                    </span>
                </div>
                <p className="pg-muted" style={{ margin: 0, fontSize: 15 }}>
                    {game.tagline}
                </p>
            </div>
        </Link>
    );
}

function ResumeLink() {
    const recent = lastRoom();
    if (!recent || Date.now() - recent.at > 24 * 3_600_000 || !getSession(recent.code, recent.role)) return null;
    const to = recent.role === 'host' ? `/host/${recent.code}` : `/play/${recent.code}`;
    return (
        <Link to={to} className="resume-link">
            {recent.role === 'host' ? 'Back to the room you are hosting' : 'Back to your game'} <span className="pg-mono">{recent.code}</span>
            <ArrowRight size={16} />
        </Link>
    );
}

export default function Home() {
    useTitle('');
    const navigate = useNavigate();
    const games = enabledGames();
    const [hostCode, setHostCode] = useState('');

    return (
        <div className="pg-container">
            <SiteHeader>
                <a href="#games" className="pg-muted">
                    Games
                </a>
                <a href="#how" className="pg-muted">
                    How it works
                </a>
                <Link to="/join" className="pg-btn pg-btn--sm" style={{ borderColor: 'var(--pg-text)' }}>
                    Join a game
                </Link>
            </SiteHeader>

            <section className="hero">
                <div className="pg-stack" style={{ ['--gap' as string]: '24px' }}>
                    <ResumeLink />
                    <h1 className="pg-display hero__title">
                        Games for the
                        <br />
                        room you're in.
                    </h1>
                    <p className="hero__lede">One screen everyone can see. Every phone is a controller. No app, no accounts.</p>
                </div>
                <div className="hero__join">
                    <JoinCodeForm inline label="Have a room code?" />
                </div>
            </section>

            <section id="games" className="site-section">
                <div className="pg-rule section-head">
                    <h2 className="pg-section-title">Games</h2>
                    <span className="pg-label-sm">{games.length}</span>
                </div>
                <div className="game-grid">
                    {games.map(g => (
                        <GameCard key={g.id} game={g} />
                    ))}
                </div>
            </section>

            <section id="how" className="site-section">
                <div className="pg-rule section-head">
                    <h2 className="pg-section-title">How it works</h2>
                </div>
                <ol className="steps">
                    {STEPS.map((s, i) => (
                        <li key={s.title}>
                            <span className="pg-mono pg-label-sm" style={{ fontSize: 13 }}>
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <h3>{s.title}</h3>
                            <p className="pg-muted">{s.body}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <footer className="site-footer">
                <span>partygames.datasparta.com</span>
                <form
                    className="pg-row"
                    style={{ gap: 8 }}
                    onSubmit={e => {
                        e.preventDefault();
                        if (hostCode.length >= 4) navigate(`/host/${hostCode}`);
                    }}
                >
                    <label htmlFor="host-code">Resume hosting</label>
                    <input
                        id="host-code"
                        className="pg-input pg-mono"
                        style={{ width: 110, minHeight: 36, fontSize: 14, letterSpacing: '0.16em', textTransform: 'uppercase' }}
                        placeholder="CODE"
                        value={hostCode}
                        maxLength={8}
                        onChange={e => setHostCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    />
                    <button type="submit" className="pg-btn pg-btn--sm" disabled={hostCode.length < 4}>
                        Open
                    </button>
                </form>
            </footer>
        </div>
    );
}
