import { useCallback, useState } from 'react';
import type { SendAction } from '../platform/client/useRoom';
import { useToast } from './components/Feedback';

/**
 * Wrap `send` with a busy flag and an error toast:
 *   const [act, busy] = useAction(send);
 *   <Button loading={busy} onClick={() => act('startVoting')}>…
 */
export function useAction(send: SendAction): [(type: string, payload?: unknown) => Promise<boolean>, boolean] {
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const run = useCallback(
        async (type: string, payload?: unknown) => {
            setBusy(true);
            try {
                await send(type, payload);
                return true;
            } catch (err) {
                toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
                return false;
            } finally {
                setBusy(false);
            }
        },
        [send, toast]
    );
    return [run, busy];
}
