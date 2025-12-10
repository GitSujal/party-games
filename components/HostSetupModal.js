import React, { useRef, useState } from 'react';
import Modal from './ui/Modal';

export default function HostSetupModal({ isOpen, onClose, onCreateSession }) {
    const minPlayersRef = useRef(null);
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        const inputVal = minPlayersRef.current ? minPlayersRef.current.value : '4';
        const minPlayers = parseInt(inputVal);

        if (isNaN(minPlayers) || minPlayers < 3) {
            alert("Minimum players must be at least 3.");
            return;
        }

        setLoading(true);
        try {
            await onCreateSession(minPlayers);
        } catch (e) {
            alert(`Failed to start game: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const primaryBtn = {
        width: '100%', padding: '15px', margin: '10px 0', fontSize: '1.2rem',
        border: 'none', borderRadius: '8px', cursor: 'pointer',
        fontWeight: 'bold', textTransform: 'uppercase', background: '#d62828', color: '#fff'
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="400px">
            <h2 style={{ color: '#d62828', marginTop: 0, textAlign: 'center' }}>Create Game Session</h2>
            <p style={{ color: '#ccc', marginBottom: '20px', textAlign: 'center' }}>How many players (including you)?</p>

            <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                <input
                    ref={minPlayersRef}
                    type="number"
                    min="3"
                    max="20"
                    defaultValue={4}
                    style={{
                        padding: '15px', borderRadius: '5px', border: '1px solid #444',
                        background: '#222', color: '#fff', fontSize: '1.5rem',
                        width: '100px', textAlign: 'center'
                    }}
                />
            </div>

            <button
                onClick={handleCreate}
                disabled={loading}
                style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}
            >
                {loading ? 'Creating...' : 'LAUNCH SESSION'}
            </button>
            <button
                onClick={onClose}
                style={{ background: 'transparent', border: 'none', color: '#666', marginTop: '10px', cursor: 'pointer', width: '100%', textAlign: 'center' }}
            >
                Cancel
            </button>
        </Modal>
    );
}
