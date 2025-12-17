import '@/styles/globals.css';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function App({ Component, pageProps }) {
    return (
        <ErrorBoundary>
            <Component {...pageProps} />
        </ErrorBoundary>
    );
}
