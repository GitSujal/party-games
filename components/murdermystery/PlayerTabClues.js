import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Search } from 'lucide-react';

export default function PlayerTabClues({ revealedClues }) {
    return (
        <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Search size={20} /> Evidence Board</h3>
            {revealedClues.length === 0 ? (
                <p style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center', marginTop: '40px' }}>No clues revealed yet...</p>
            ) : (
                revealedClues.map(clue => (
                    <div key={clue.id} className="card" style={{ borderLeft: '4px solid var(--gold)' }}>
                        <h4>{clue.name}</h4>
                        <ReactMarkdown>{clue.content}</ReactMarkdown>
                    </div>
                ))
            )}
        </div>
    );
}
