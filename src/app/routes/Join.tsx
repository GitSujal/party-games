/** /join and /join/:code — enter a code, then a name (and a selfie if the game wants one). */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Camera, X } from 'lucide-react';
import { findMeta } from '../../games/catalog';
import { api } from '../../platform/client/api';
import { getSession, saveSession } from '../../platform/client/session';
import { roomCode } from '../../platform/protocol';
import { Avatar, Button, FullscreenMessage } from '../../ui';
import { useDocumentTheme, useTitle } from '../hooks';
import { JoinCodeForm } from './JoinCodeForm';

/** Downscale a photo to a JPEG data URL (keeps uploads small on mobile data). */
async function compressPhoto(file: File, maxSide = 768): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
}

function PhoneScreen({ children }: { children: React.ReactNode }) {
    return (
        <div className="pg-narrow pg-stack" style={{ ['--gap' as string]: '0px', minHeight: '100dvh', paddingBottom: 32 }}>
            <Link to="/" style={{ fontSize: 14, fontWeight: 600 }}>
                Party Games
            </Link>
            {children}
        </div>
    );
}

function JoinRoom({ code }: { code: string }) {
    const navigate = useNavigate();
    const existing = getSession(code, 'player');
    const [info, setInfo] = useState<{ gameId: string; wantsPhoto: boolean; players: number } | null>(null);
    const [missing, setMissing] = useState(false);
    const [name, setName] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const meta = info ? findMeta(info.gameId) : undefined;

    useDocumentTheme(meta?.theme);
    useTitle(meta ? `Join ${meta.name}` : 'Join');

    useEffect(() => {
        api.roomInfo(code)
            .then(setInfo)
            .catch(() => setMissing(true));
    }, [code]);

    if (missing) {
        return (
            <PhoneScreen>
                <div className="pg-stack" style={{ ['--gap' as string]: '12px', marginTop: 72 }}>
                    <h1 className="pg-display" style={{ fontSize: 32, margin: 0 }}>
                        No room called <span className="pg-mono">{code}</span>
                    </h1>
                    <p className="pg-muted" style={{ margin: 0 }}>
                        Check the code on the host's screen and try again.
                    </p>
                </div>
                <div style={{ marginTop: 32 }}>
                    <JoinCodeForm />
                </div>
            </PhoneScreen>
        );
    }
    if (!info || !meta) return <FullscreenMessage title="Finding the room" loading />;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const res = await api.join(code, name.trim(), photo ?? undefined);
            saveSession(code, { role: 'player', token: res.playerToken, playerId: res.playerId, name: res.name });
            navigate(`/play/${code}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not join');
            setBusy(false);
        }
    };

    return (
        <PhoneScreen>
            <div className="pg-stack" style={{ ['--gap' as string]: '12px', marginTop: 72 }}>
                <div className="pg-row pg-label-sm" style={{ gap: 10 }}>
                    <span className="pg-dot" style={{ width: 8, height: 8 }} aria-hidden />
                    {meta.name} · Room <span className="pg-mono" style={{ color: 'var(--pg-text)' }}>{code}</span>
                </div>
                <h1 className="pg-display" style={{ fontSize: 36, lineHeight: 1.05, margin: 0 }}>
                    What should we call you?
                </h1>
            </div>

            {existing && (
                <div className="pg-stack" style={{ ['--gap' as string]: '10px', marginTop: 32 }}>
                    <Button variant="primary" size="lg" block onClick={() => navigate(`/play/${code}`)}>
                        Continue as {existing.name}
                    </Button>
                    <span className="pg-help" style={{ textAlign: 'center' }}>
                        or join as someone new below
                    </span>
                </div>
            )}

            <form id="join-form" className="pg-stack" style={{ ['--gap' as string]: '16px', marginTop: 32 }} onSubmit={submit}>
                <label htmlFor="name" className="pg-visually-hidden">
                    Your name
                </label>
                <input
                    id="name"
                    className="pg-input"
                    style={{ minHeight: 56, fontSize: 20, borderColor: 'var(--pg-text)' }}
                    value={name}
                    maxLength={24}
                    autoFocus={!existing}
                    autoComplete="nickname"
                    placeholder="Your name"
                    onChange={e => setName(e.target.value)}
                />
                <p className="pg-help" style={{ margin: 0 }}>
                    {info.players === 0 ? "You're the first one here." : `${info.players} ${info.players === 1 ? 'person is' : 'people are'} already here.`}
                </p>

                {info.wantsPhoto && (
                    <div className="pg-stack" style={{ ['--gap' as string]: '10px', marginTop: 8 }}>
                        <div className="pg-row" style={{ gap: 12 }}>
                            {photo ? (
                                <>
                                    <Avatar name={name || '?'} src={photo} size={56} />
                                    <Button size="sm" variant="ghost" icon={<X size={16} />} onClick={() => setPhoto(null)}>
                                        Remove photo
                                    </Button>
                                </>
                            ) : (
                                <Button icon={<Camera size={18} strokeWidth={1.75} />} onClick={() => fileInput.current?.click()}>
                                    Add a selfie (optional)
                                </Button>
                            )}
                        </div>
                        <span className="pg-help">Used for your character portrait. Deleted when the room closes.</span>
                        <input
                            ref={fileInput}
                            type="file"
                            accept="image/*"
                            capture="user"
                            hidden
                            onChange={async e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                    setPhoto(await compressPhoto(file));
                                } catch {
                                    setError('Could not read that photo');
                                }
                            }}
                        />
                    </div>
                )}

                {error && <div className="pg-error">{error}</div>}
            </form>

            <Button type="submit" form="join-form" variant="primary" size="lg" block loading={busy} disabled={!name.trim()} style={{ marginTop: 'auto' }}>
                Join game
            </Button>
        </PhoneScreen>
    );
}

export default function Join() {
    const { code } = useParams();
    const upper = code?.toUpperCase();
    useTitle('Join');

    if (upper && roomCode.safeParse(upper).success) return <JoinRoom key={upper} code={upper} />;

    return (
        <PhoneScreen>
            <div className="pg-stack" style={{ ['--gap' as string]: '12px', marginTop: 72 }}>
                <h1 className="pg-display" style={{ fontSize: 36, margin: 0 }}>
                    Join a game
                </h1>
                <p className="pg-muted" style={{ margin: 0 }}>
                    Enter the code shown on the host's screen.
                </p>
            </div>
            <div style={{ marginTop: 32 }}>
                <JoinCodeForm autoFocus />
            </div>
        </PhoneScreen>
    );
}
