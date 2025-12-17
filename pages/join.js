import { useRouter } from 'next/router';
import JoinForm from '../components/common/JoinForm';
import SEOHead from '../components/common/SEOHead';

export default function Join() {
    const router = useRouter();
    const { gameId } = router.query;

    return (
        <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Join the Party</h1>
            <p style={{ color: '#888', marginBottom: '30px' }}>Enter your name and the Game ID to join.</p>
            <JoinForm initialGameId={gameId || ''} />
        </div>
    );
}
