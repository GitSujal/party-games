import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'default' | 'primary' | 'ink' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    block?: boolean;
    loading?: boolean;
    icon?: ReactNode;
}

export function Button({ variant = 'default', size = 'md', block, loading, icon, className = '', children, disabled, ...rest }: ButtonProps) {
    const classes = [
        'pg-btn',
        variant !== 'default' && `pg-btn--${variant}`,
        size !== 'md' && `pg-btn--${size}`,
        block && 'pg-btn--block',
        className,
    ]
        .filter(Boolean)
        .join(' ');
    return (
        <button type="button" className={classes} disabled={disabled || loading} {...rest}>
            {loading ? <span className="pg-spinner" style={{ width: 16, height: 16, borderColor: 'currentColor', borderTopColor: 'transparent' }} /> : icon}
            {children}
        </button>
    );
}

export function IconButton({ label, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
    return (
        <button type="button" className="pg-icon-btn" aria-label={label} title={label} {...rest}>
            {children}
        </button>
    );
}

/** Two-step button: first click asks "Sure?", second click runs. No browser dialogs. */
export function ConfirmButton({ onConfirm, confirmLabel = 'Yes, do it', children, ...rest }: ButtonProps & { onConfirm: () => void; confirmLabel?: string }) {
    const [asking, setAsking] = useState(false);
    if (!asking) {
        return (
            <Button {...rest} onClick={() => setAsking(true)}>
                {children}
            </Button>
        );
    }
    return (
        <span className="pg-row" style={{ ['--gap' as string]: '6px' }}>
            <Button
                {...rest}
                variant="danger"
                onClick={() => {
                    setAsking(false);
                    onConfirm();
                }}
            >
                {confirmLabel}
            </Button>
            <Button size={rest.size} variant="ghost" onClick={() => setAsking(false)}>
                Cancel
            </Button>
        </span>
    );
}
