import React from 'react';
import { X, Terminal } from 'lucide-react';

export default function DebugPanel({ logs, onClose }) {
    if (!logs || logs.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
        }}>
            <div style={{
                background: '#1a1a1a',
                border: '2px solid #00f3ff',
                borderRadius: '12px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 0 30px rgba(0, 243, 255, 0.3)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Terminal size={24} color="#00f3ff" />
                        <h2 style={{ margin: 0, color: '#00f3ff' }}>Avatar Generation Debug Logs</h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '5px'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Logs Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    fontFamily: 'Monaco, Menlo, "Courier New", monospace',
                    fontSize: '0.9rem',
                    lineHeight: '1.6'
                }}>
                    {logs.map((log, index) => {
                        let color = '#e6e6e6';
                        if (log.includes('✓') || log.includes('SUCCESS')) color = '#00ff00';
                        if (log.includes('✗') || log.includes('failed') || log.includes('Error')) color = '#ff4444';
                        if (log.includes('→')) color = '#00f3ff';
                        if (log.includes('⚡')) color = '#ffaa00';
                        if (log.includes('===')) color = '#00f3ff';

                        return (
                            <div
                                key={index}
                                style={{
                                    color,
                                    padding: '2px 0',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all'
                                }}
                            >
                                {log}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '15px 20px',
                    borderTop: '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ color: '#888', fontSize: '0.85rem' }}>
                        Total: {logs.length} log entries
                    </span>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(logs.join('\n'));
                            alert('Logs copied to clipboard!');
                        }}
                        style={{
                            padding: '8px 16px',
                            background: '#00f3ff',
                            color: '#0a192f',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                        }}
                    >
                        Copy Logs
                    </button>
                </div>
            </div>
        </div>
    );
}
