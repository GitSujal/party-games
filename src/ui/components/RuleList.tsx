import type { ReactNode } from 'react';

/** Numbered rules as hairline rows (01, 02, …) — use in a game's HowToPlay. */
export function RuleList({ rules }: { rules: { title: string; body: ReactNode }[] }) {
    return (
        <ol className="pg-rules">
            {rules.map((r, i) => (
                <li key={r.title}>
                    <span className="pg-mono">{String(i + 1).padStart(2, '0')}</span>
                    <p>
                        <strong>{r.title}.</strong> {r.body}
                    </p>
                </li>
            ))}
        </ol>
    );
}
