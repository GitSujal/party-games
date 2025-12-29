import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import * as api from '../../lib/apiClient';
import { Camera, Upload, X } from 'lucide-react';

export default function JoinForm({ initialGameId = '' }) {
    const [step, setStep] = useState(1); // 1: info, 2: avatar
    const [name, setName] = useState('');
    const [inputGameId, setInputGameId] = useState(initialGameId);
    const [avatarImage, setAvatarImage] = useState(null); // base64 image
    const [showCamera, setShowCamera] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (initialGameId) {
            setInputGameId(initialGameId);
        }
    }, [initialGameId]);

    // Check for existing session on mount
    useEffect(() => {
        const storedPlayerId = localStorage.getItem('playerId');
        const storedGameId = localStorage.getItem('gameId') || initialGameId;

        if (storedPlayerId && storedGameId) {
            console.log('[JoinForm] Found existing session:', { storedPlayerId, storedGameId });
            // Optionally we could auto-redirect, but let's just pre-fill for now
            // or we can just redirect if we are on the join page with no params
            if (!initialGameId || initialGameId === storedGameId) {
                setInputGameId(storedGameId);
                // We'll let the user click join to confirm, but we could also auto-join
            }
        }
    }, [initialGameId]);

    // Cleanup camera stream on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Attach stream to video element when it becomes available
    useEffect(() => {
        if (showCamera && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [showCamera]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            streamRef.current = stream;
            setShowCamera(true);
        } catch (err) {
            alert('Camera access denied. Please use file upload instead.');
        }
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setAvatarImage(imageData);
        stopCamera();
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setAvatarImage(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNext = async (e) => {
        e.preventDefault();
        if (!name || !inputGameId) return;

        setLoading(true);
        try {
            // Fetch game state to determine game type
            const gameState = await api.getGameState(inputGameId);
            const gameType = gameState.gameType || 'momo_massacre';

            // For non-mystery games (like Imposter), skip avatar step and join directly
            if (gameType !== 'momo_massacre') {
                const data = await api.joinGame(inputGameId, name, null);
                if (data.player) {
                    sessionStorage.setItem('playerId', data.player.id);
                    sessionStorage.setItem('gameId', inputGameId);
                    localStorage.setItem('playerId', data.player.id);
                    localStorage.setItem('gameId', inputGameId);
                    router.push(`/player/${data.player.id}`);
                }
            } else {
                // For mystery games, proceed to avatar step
                setStep(2);
            }
        } catch (err) {
            alert(err.message || "Failed to check game");
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!name || !inputGameId) return;

        setLoading(true);
        try {
            const data = await api.joinGame(inputGameId, name, avatarImage);

            if (data.player) {
                if (data.player.name.toLowerCase() !== name.toLowerCase()) {
                    alert(`Welcome back, ${data.player.name}! Recovering your session...`);
                }
                sessionStorage.setItem('playerId', data.player.id);
                sessionStorage.setItem('gameId', inputGameId);
                localStorage.setItem('playerId', data.player.id);
                localStorage.setItem('gameId', inputGameId);
                router.push(`/player/${data.player.id}`);
            }
        } catch (err) {
            alert(err.message || "Failed to join");
        } finally {
            setLoading(false);
        }
    };

    // Step 1: Name and Game ID
    if (step === 1) {
        return (
            <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', maxWidth: '400px', margin: '0 auto' }}>
                <div style={{ width: '100%' }}>
                    <input
                        type="text"
                        placeholder="Game ID (e.g. A1B2)"
                        value={inputGameId}
                        onChange={(e) => setInputGameId(e.target.value.toUpperCase())}
                        style={{ padding: '15px', fontSize: '1.2rem', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff', textAlign: 'center', width: '100%', fontFamily: 'monospace', letterSpacing: '2px' }}
                    />
                </div>

                <div style={{ width: '100%' }}>
                    <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ padding: '15px', fontSize: '1.2rem', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff', textAlign: 'center', width: '100%' }}
                    />
                </div>

                <button
                    type="submit"
                    className="btn"
                    disabled={!inputGameId || !name || loading}
                    style={{ width: '100%', padding: '15px', opacity: (!inputGameId || !name || loading) ? 0.5 : 1 }}
                >
                    {loading ? 'CHECKING...' : 'NEXT'}
                </button>
            </form>
        );
    }

    // Step 2: Avatar Upload
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', maxWidth: '500px', margin: '0 auto' }}>
            {/* Info Banner */}
            <div style={{ background: '#1a1a1d', padding: '20px', borderRadius: '10px', border: '1px solid #444', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--gold, #ffd700)' }}>Create Your Murder Mystery Avatar</h3>
                <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    Take a selfie or upload a photo, and our AI will transform you into a cinematic 1920s-1950s character for the game!
                </p>
            </div>

            {/* Camera View */}
            {showCamera && (
                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{ width: '100%', borderRadius: '10px', border: '2px solid #444' }}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                            onClick={capturePhoto}
                            className="btn"
                            type="button"
                            style={{ flex: 1 }}
                        >
                            Capture
                        </button>
                        <button
                            onClick={stopCamera}
                            type="button"
                            style={{ flex: 1, background: '#d62828', border: 'none', padding: '10px', borderRadius: '5px', color: '#fff', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Avatar Preview */}
            {avatarImage && !showCamera && (
                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                    <img src={avatarImage} alt="Your avatar" style={{ width: '100%', borderRadius: '10px', border: '2px solid var(--gold, #ffd700)' }} />
                    <button
                        onClick={() => setAvatarImage(null)}
                        type="button"
                        style={{ position: 'absolute', top: '10px', right: '10px', background: '#d62828', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <X size={20} color="#fff" />
                    </button>
                </div>
            )}

            {/* Upload Buttons */}
            {!avatarImage && !showCamera && (
                <div style={{ display: 'flex', gap: '15px', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                        onClick={startCamera}
                        type="button"
                        className="btn"
                        style={{ flex: 1, minWidth: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                        <Camera size={20} /> Take Selfie
                    </button>
                    <label style={{ flex: 1, minWidth: '150px' }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                        <div className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}>
                            <Upload size={20} /> Upload Photo
                        </div>
                    </label>
                </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button
                    onClick={() => setStep(1)}
                    type="button"
                    style={{ flex: 1, background: '#333', border: '1px solid #666', padding: '15px', borderRadius: '5px', color: '#fff', cursor: 'pointer' }}
                >
                    Back
                </button>
                {avatarImage ? (
                    <button
                        onClick={handleJoin}
                        type="button"
                        className="btn"
                        disabled={loading}
                        style={{ flex: 2, opacity: loading ? 0.5 : 1 }}
                    >
                        {loading ? 'GENERATING AVATAR...' : 'JOIN GAME'}
                    </button>
                ) : (
                    <button
                        onClick={handleJoin}
                        type="button"
                        style={{ flex: 2, background: '#666', border: 'none', padding: '15px', borderRadius: '5px', color: '#aaa', cursor: 'pointer' }}
                    >
                        Skip Avatar (Join Without)
                    </button>
                )}
            </div>
        </div>
    );
}
