import { useState, type ReactNode } from 'react';
import { PLATFORM_ACTIONS } from '../../platform/protocol';
import type { GameMeta, RoomView, SettingField, Settings } from '../../platform/sdk';
import type { SendAction } from '../../platform/client/useRoom';
import { useAction } from '../useAction';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Modal } from './Feedback';
import { QRJoin } from './QRJoin';
import { SettingsForm } from './SettingsForm';

function summary(field: SettingField, value: Settings[string]): string {
    if (field.type === 'boolean') return value ? 'On' : 'Off';
    if (field.type === 'select') return field.options.find(o => o.value === value)?.label ?? String(value);
    if (field.unit === 'seconds') {
        const s = Number(value);
        return s === 0 ? 'Off' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }
    return field.unit?.startsWith('%') ? `${value}%` : String(value);
}

/** Standard host lobby (the TV): join QR + code on the left, live roster and start on the right. */
export function Lobby({ room, meta, send, panel }: { room: RoomView; meta: GameMeta; send: SendAction; panel?: ReactNode }) {
    const [act, busy] = useAction(send);
    const [editing, setEditing] = useState(false);
    const count = room.players.length;
    const { min, max } = meta.players;
    const ready = count >= min;
    const fields = meta.settings ?? [];

    return (
        <div className="pg-lobby">
            <section className="pg-lobby__join">
                <QRJoin code={room.code} />
            </section>

            <section className="pg-lobby__main">
                <div className="pg-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h1 className="pg-display" style={{ fontSize: 'clamp(32px, 4vw, 44px)', margin: 0 }}>
                        {count === 0 ? 'Waiting for players' : ready ? 'Ready when you are' : 'Waiting for players'}
                    </h1>
                    <span className="pg-label-sm" style={{ fontSize: 18 }}>
                        {count} of {min}–{max}
                    </span>
                </div>

                <ul className="pg-roster pg-roster--lg">
                    {room.players.map(p => (
                        <li key={p.id} style={{ color: p.connected ? undefined : 'var(--pg-faint)' }}>
                            <Avatar name={p.name} src={p.photoUrl} size={36} offline={!p.connected} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        </li>
                    ))}
                    <li className="pg-roster__empty">
                        <span className="pg-avatar" style={{ background: 'transparent', border: '1px dashed var(--pg-border-strong)' }} aria-hidden />
                        Scan to join
                    </li>
                </ul>

                {panel}

                <div className="pg-row" style={{ marginTop: 'auto', justifyContent: 'space-between', gap: 24, paddingTop: 28, borderTop: '1px solid var(--pg-border)' }}>
                    <div className="pg-row" style={{ gap: 32, alignItems: 'flex-end' }}>
                        <dl className="pg-facts" style={{ fontSize: 15 }}>
                            {fields.map(f => (
                                <div key={f.key}>
                                    <dt>{f.label}</dt>
                                    <dd>{summary(f, room.settings[f.key] ?? f.default)}</dd>
                                </div>
                            ))}
                        </dl>
                        {fields.length > 0 && (
                            <button type="button" className="pg-link" style={{ color: 'var(--pg-primary)', fontSize: 15 }} onClick={() => setEditing(true)}>
                                Change
                            </button>
                        )}
                    </div>
                    <div className="pg-stack" style={{ ['--gap' as string]: '6px', alignItems: 'flex-end' }}>
                        <Button variant="primary" size="lg" disabled={!ready} loading={busy} onClick={() => act(PLATFORM_ACTIONS.start)}>
                            Start game
                        </Button>
                        {!ready && (
                            <span className="pg-help">
                                {min - count} more player{min - count === 1 ? '' : 's'} needed
                            </span>
                        )}
                    </div>
                </div>
            </section>

            <Modal open={editing} onClose={() => setEditing(false)} title="Settings">
                <SettingsForm fields={fields} values={room.settings} disabled={busy} onChange={(key, value) => act(PLATFORM_ACTIONS.updateSettings, { settings: { [key]: value } })} />
            </Modal>
        </div>
    );
}
