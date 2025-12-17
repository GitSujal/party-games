import React from 'react';
import { useRouter } from 'next/router';
import HostSessionManager from '../components/common/HostSessionManager';

export default function Host() {
    const router = useRouter();
    const { gameId } = router.query;

    if (!gameId) return null;

    return <HostSessionManager gameId={gameId} />;
}
