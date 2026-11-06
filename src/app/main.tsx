import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router';
import { ToastProvider, FullscreenMessage } from '../ui';
import { HostShell } from './shell/HostShell';
import { PlayerShell } from './shell/PlayerShell';
import GameDetail from './routes/GameDetail';
import Home from './routes/Home';
import Join from './routes/Join';
import '../ui/ui.css';
import './app.css';

function HostRoute() {
    const code = useParams().code!.toUpperCase();
    return <HostShell key={code} code={code} />;
}

function PlayRoute() {
    const code = useParams().code!.toUpperCase();
    return <PlayerShell key={code} code={code} />;
}

function NotFound() {
    return (
        <FullscreenMessage title="Nothing here">
            <Link to="/" className="pg-btn pg-btn--primary">
                Back to games
            </Link>
        </FullscreenMessage>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ToastProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/g/:gameId" element={<GameDetail />} />
                    <Route path="/join" element={<Join />} />
                    <Route path="/join/:code" element={<Join />} />
                    <Route path="/host/:code" element={<HostRoute />} />
                    <Route path="/play/:code" element={<PlayRoute />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>
        </ToastProvider>
    </StrictMode>
);
