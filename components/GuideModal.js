import React from 'react';
import Modal from './ui/Modal';

function PlayerGuide() {
    return (
        <div style={{ lineHeight: '1.6' }}>
            <h2 style={{ color: '#61dafb', marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px' }}>🕵️ Player Guide</h2>
            <p>Welcome to the party. Someone here is a killer.</p>
            <h3>YOUR MISSION</h3>
            <ul style={{ paddingLeft: '20px', color: '#ccc' }}>
                <li style={{ marginBottom: '10px' }}><strong>Roleplay:</strong> Stay in character. Use the <em>Identity</em> tab to know who you are.</li>
                <li style={{ marginBottom: '10px' }}><strong>Investigate:</strong> Talk to others. Ask prying questions based on your <em>Mission</em>.</li>
                <li style={{ marginBottom: '10px' }}><strong>Secrets:</strong> You have a <em>Secret</em>. Hide it unless you have no choice!</li>
            </ul>
        </div>
    );
}

function HostGuide() {
    return (
        <div style={{ lineHeight: '1.6' }}>
            <h2 style={{ color: '#d62828', marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px' }}>🎤 Host Guide</h2>
            <p>You are the Master of Ceremonies. You guide the narrative.</p>
            <h3>STEPS</h3>
            <ol style={{ paddingLeft: '20px', color: '#ccc' }}>
                <li style={{ marginBottom: '10px' }}><strong>Connect:</strong> Cast your screen to a TV.</li>
                <li style={{ marginBottom: '10px' }}><strong>Setup:</strong> Click "Start as Host", set player count.</li>
                <li style={{ marginBottom: '10px' }}><strong>Assign:</strong> Use the sidebar menu to assign characters.</li>
                <li style={{ marginBottom: '10px' }}><strong>Play:</strong> Read the prompts on the TV. Reveal clues when appropriate.</li>
            </ol>
        </div>
    );
}

export default function GuideModal({ isOpen, onClose, guideType }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px">
            {guideType === 'PLAYER' ? <PlayerGuide /> : <HostGuide />}
        </Modal>
    );
}
