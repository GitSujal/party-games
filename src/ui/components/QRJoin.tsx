import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { joinUrl } from '../../platform/client/api';

export function useQrCode(text: string, width = 600): string {
    const [src, setSrc] = useState('');
    useEffect(() => {
        let cancelled = false;
        QRCode.toDataURL(text, { margin: 0, width, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } })
            .then(url => !cancelled && setSrc(url))
            .catch(() => setSrc(''));
        return () => {
            cancelled = true;
        };
    }, [text, width]);
    return src;
}

/** QR code + "join at" line + room code — the standard "how to join" block. */
export function QRJoin({ code, compact }: { code: string; compact?: boolean }) {
    const url = joinUrl(code);
    const qr = useQrCode(url);
    const host = url.replace(/^https?:\/\//, '').replace(/\/join\/.*$/, '');

    return (
        <div className="pg-stack" style={{ ['--gap' as string]: compact ? '12px' : '28px' }}>
            {qr && (
                <div className="pg-qr" style={compact ? { padding: 10, borderRadius: 12 } : undefined}>
                    <img src={qr} alt={`QR code to join room ${code}`} style={compact ? { width: 140 } : undefined} />
                </div>
            )}
            <div className="pg-stack" style={{ ['--gap' as string]: '6px' }}>
                <span className="pg-label-sm" style={compact ? { fontSize: 13 } : { fontSize: 15 }}>
                    Join at {host}
                </span>
                <span className="pg-room-code" style={compact ? { fontSize: 32 } : undefined}>
                    {code}
                </span>
            </div>
        </div>
    );
}
