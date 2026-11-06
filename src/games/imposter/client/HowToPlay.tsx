import type { Role } from '../../../platform/sdk';
import { RuleList } from '../../../ui';

export default function HowToPlay({ role }: { role: Role }) {
    return (
        <div className="pg-stack" style={{ ['--gap' as string]: '8px' }}>
            <RuleList
                rules={[
                    { title: 'Memorise', body: "Tap your card to see the word, or that you're the imposter. Then hide your screen." },
                    { title: 'Give a clue', body: 'One word each, linked to the secret. Too obvious and the imposter learns it.' },
                    { title: 'Vote', body: 'Most votes is out and their role is revealed. A tie means nobody leaves.' },
                    { title: 'Win', body: 'Catch every imposter, or survive until imposters match the genuine players.' },
                ]}
            />
            {role === 'host' && (
                <p className="pg-help" style={{ margin: 0 }}>
                    The big screen never shows the word. Use Change word if someone lets it slip, and Show category to give everyone a hint about the word.
                </p>
            )}
        </div>
    );
}
