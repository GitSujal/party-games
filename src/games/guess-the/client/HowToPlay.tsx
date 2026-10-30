import type { Role } from '../../../platform/sdk';
import { RuleList } from '../../../ui';

export default function HowToPlay({ role }: { role: Role }) {
    return (
        <div className="pg-stack" style={{ ['--gap' as string]: '8px' }}>
            <RuleList
                rules={[
                    { title: 'Read the clues', body: 'Each question shows one to five pictures. Work out the movie, actor, word, phrase or sports person they point to.' },
                    { title: 'Guess', body: "Type your answer on your phone. Spelling doesn't have to be perfect. Not sure? Pass." },
                    { title: 'Score', body: 'A correct answer is worth 50 points. Answer within 5 seconds for a 50 point bonus; it drops to 35, 25 and 15, and is gone after 15 seconds.' },
                    { title: 'Reveal', body: 'The big screen shows the answer and the leaderboard once everyone is in, or when time runs out.' },
                ]}
            />
            {role === 'host' && (
                <p className="pg-help" style={{ margin: 0 }}>
                    Choose categories in the lobby settings. Skip replaces a bad question without showing its answer.
                </p>
            )}
        </div>
    );
}
