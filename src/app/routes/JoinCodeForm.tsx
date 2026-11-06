import { useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../ui';

/** Room-code entry. `inline` puts the button beside the field (homepage). */
export function JoinCodeForm({ autoFocus, inline, label }: { autoFocus?: boolean; inline?: boolean; label?: string }) {
    const navigate = useNavigate();
    const id = useId();
    const [code, setCode] = useState('');

    const input = (
        <input
            id={id}
            className="pg-input pg-input--code"
            style={inline ? { flex: 1, minWidth: 0 } : undefined}
            placeholder="ABCD"
            value={code}
            maxLength={8}
            autoFocus={autoFocus}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            aria-label={label ? undefined : 'Room code'}
        />
    );

    return (
        <form
            className="pg-stack"
            style={{ ['--gap' as string]: '12px' }}
            onSubmit={e => {
                e.preventDefault();
                if (code.length >= 4) navigate(`/join/${code}`);
            }}
        >
            {label && (
                <label htmlFor={id} className="pg-label-sm">
                    {label}
                </label>
            )}
            {inline ? (
                <div className="pg-row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                    {input}
                    <Button type="submit" variant="ink" size="lg" disabled={code.length < 4}>
                        Join
                    </Button>
                </div>
            ) : (
                <>
                    {input}
                    <Button type="submit" variant="ink" size="lg" block disabled={code.length < 4}>
                        Join
                    </Button>
                </>
            )}
        </form>
    );
}
