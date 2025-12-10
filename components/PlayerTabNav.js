import React from 'react';
import { User, Lock, Search } from 'lucide-react';

export default function PlayerTabNav({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'character', icon: User, label: 'Role' },
        { id: 'secret', icon: Lock, label: 'Secret' },
        { id: 'clues', icon: Search, label: 'Clues' }
    ];

    return (
        <div style={{ display: 'flex', background: '#333', borderRadius: '10px', padding: '5px', marginBottom: '20px' }}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    style={{
                        flex: 1,
                        background: activeTab === tab.id ? 'var(--card-bg)' : 'transparent',
                        color: activeTab === tab.id ? 'white' : '#888',
                        border: 'none',
                        padding: '10px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'
                    }}
                >
                    <tab.icon size={20} />
                    <span style={{ fontSize: '0.7rem' }}>{tab.label}</span>
                </button>
            ))}
        </div>
    );
}
