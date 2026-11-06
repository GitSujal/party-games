import type { SettingField, Settings } from '../../platform/sdk';

function display(field: SettingField, value: Settings[string]): string {
    if (field.type !== 'number') return '';
    if (field.unit === 'seconds') {
        const s = Number(value);
        return s === 0 ? 'Off' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }
    return `${value}${field.unit ? (field.unit.startsWith('%') ? field.unit : ` ${field.unit}`) : ''}`;
}

/** Renders a game's declared settings (meta.settings) as a form. */
export function SettingsForm({
    fields,
    values,
    onChange,
    disabled,
}: {
    fields: SettingField[];
    values: Settings;
    onChange: (key: string, value: Settings[string]) => void;
    disabled?: boolean;
}) {
    if (fields.length === 0) return null;
    return (
        <div className="pg-stack" style={{ ['--gap' as string]: '24px' }}>
            {fields.map(field => {
                const id = `setting-${field.key}`;
                const value = values[field.key] ?? field.default;
                return (
                    <div className="pg-field" key={field.key}>
                        {field.type === 'boolean' ? (
                            <label className="pg-switch" htmlFor={id}>
                                <input id={id} type="checkbox" checked={!!value} disabled={disabled} onChange={e => onChange(field.key, e.target.checked)} />
                                <span className="pg-label">{field.label}</span>
                            </label>
                        ) : field.type === 'number' ? (
                            <>
                                <div className="pg-field-head">
                                    <label className="pg-label" htmlFor={id}>
                                        {field.label}
                                    </label>
                                    <span className="pg-muted">{display(field, value)}</span>
                                </div>
                                <input
                                    id={id}
                                    type="range"
                                    min={field.min}
                                    max={field.max}
                                    step={field.step ?? 1}
                                    value={Number(value)}
                                    disabled={disabled}
                                    onChange={e => onChange(field.key, Number(e.target.value))}
                                />
                            </>
                        ) : (
                            <>
                                <label className="pg-label" htmlFor={id}>
                                    {field.label}
                                </label>
                                <select id={id} className="pg-select" value={String(value)} disabled={disabled} onChange={e => onChange(field.key, e.target.value)}>
                                    {field.options.map(o => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}
                        {field.help && <span className="pg-help">{field.help}</span>}
                    </div>
                );
            })}
        </div>
    );
}
