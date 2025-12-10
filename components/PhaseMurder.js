import React from 'react';

export default function PhaseMurder({ onMeetSuspects }) {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
            background: '#0a0a0a',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#d62828', textAlign: 'center', padding: '40px'
        }}>
            <h1 style={{ fontSize: '4rem', textTransform: 'uppercase', letterSpacing: '5px', animation: 'pulse 3s infinite' }}>
                A Murder Has Occurred!
            </h1>
            <p style={{ fontSize: '1.8rem', color: '#fff', maxWidth: '800px', marginTop: '30px', lineHeight: '1.6' }}>
                The Momo King is dead.<br />
                <span style={{ color: '#aaa' }}>He has been poisoned.</span>
            </p>
            <div style={{ marginTop: '50px', border: '1px solid #d62828', padding: '20px', borderRadius: '10px', background: 'rgba(214, 40, 40, 0.1)' }}>
                <h3 style={{ color: '#d62828', margin: '0 0 10px 0' }}>HOST INSTRUCTION</h3>
                <p style={{ fontSize: '1.2rem', margin: 0 }}>
                    "Lock the doors. No one leaves until we find the killer."<br />
                    "Everyone here is a suspect."
                </p>
            </div>

            <button
                className="btn"
                onClick={onMeetSuspects}
                style={{ marginTop: '60px', fontSize: '1.5rem', padding: '15px 40px', background: '#333' }}
            >
                Meet The Suspects &rarr;
            </button>
        </div>
    );
}
