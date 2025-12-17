import { useRouter } from 'next/router';
import PlayerSessionManager from '../../components/common/PlayerSessionManager';

export default function Player() {
    const router = useRouter();
    const { id } = router.query;

    if (!id) return null;

    return <PlayerSessionManager playerId={id} />;
}
