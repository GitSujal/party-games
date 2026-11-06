import type { ConnectionStatus } from '../../platform/client/useRoom';

export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
    if (status !== 'reconnecting' && status !== 'connecting') return null;
    return (
        <div className="pg-conn-banner" role="status">
            <span className="pg-spinner" style={{ width: 14, height: 14, borderColor: 'rgb(255 255 255 / 0.3)', borderTopColor: '#fff' }} />
            {status === 'connecting' ? 'Connecting' : 'Reconnecting'}
        </div>
    );
}
