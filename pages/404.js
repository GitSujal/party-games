import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Custom404() {
    const router = useRouter();

    useEffect(() => {
        // Get the current path from window.location
        const path = window.location.pathname;

        // If we're on a player route, let the client-side router handle it
        if (path.startsWith('/player/')) {
            // Extract player ID and navigate client-side
            router.replace(path);
        } else if (path !== '/404') {
            // For any other route, try to navigate client-side
            router.replace(path);
        }
    }, [router]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#0a192f',
            color: '#e6f1ff',
            fontFamily: 'Inter, sans-serif',
            padding: '20px',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⏳</div>
            <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Loading...</h1>
            <p style={{ color: '#8892b0', maxWidth: '400px' }}>
                If you're not redirected automatically, please return to the home page.
            </p>
            <button
                onClick={() => router.push('/')}
                style={{
                    marginTop: '30px',
                    padding: '12px 24px',
                    background: '#00f3ff',
                    color: '#0a192f',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                }}
            >
                Go Home
            </button>
        </div>
    );
}
