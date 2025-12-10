import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function PlayerIntro({ storyline }) {
    return (
        <div className="container">
            <h1 style={{ color: 'var(--accent)' }}>The Story Begins...</h1>
            <div className="card">
                <ReactMarkdown>{storyline.intro}</ReactMarkdown>
            </div>
            <div className="card">
                <ReactMarkdown>{storyline.plotStart}</ReactMarkdown>
            </div>
            <p style={{ textAlign: 'center', color: '#aaa' }}>Wait for the host to continue...</p>
        </div>
    );
}
