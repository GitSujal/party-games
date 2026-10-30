import type { Role } from '../../../platform/sdk';
import { Markdown, RuleList } from '../../../ui';
import type { View } from './shared';

export default function HowToPlay({ role, game }: { role: Role; game: View | null }) {
    return (
        <div className="pg-stack" style={{ ['--gap' as string]: '16px' }}>
            <p style={{ margin: 0 }}>
                A Christmas dinner party. The Momo King is celebrating his "Best Momo of all Time" recipe until someone poisons him. Everyone at the table is a suspect, including you.
            </p>
            <RuleList
                rules={[
                    { title: 'Get into character', body: 'Your phone has your character, goal, script and a secret. Show no one.' },
                    { title: 'Listen to the story', body: 'The host narrates the evening on the big screen, then introduces every suspect.' },
                    { title: 'Investigate', body: 'Question each other and protect your secret. Clues arrive for everyone, or just for you.' },
                    { title: 'Accuse', body: 'The table decides who did it. The killer wins if they get away with it.' },
                ]}
            />
            {role === 'host' && game?.host?.guide && (
                <details className="pg-rule">
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Host guide (spoilers)</summary>
                    <Markdown style={{ marginTop: 12 }}>{game.host.guide}</Markdown>
                </details>
            )}
        </div>
    );
}
