import React, { useState } from 'react';
import Modal from './ui/Modal';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';

function PlayerGuide() {
    const sectionStyle = { marginTop: '20px', marginBottom: '20px' };
    const headingStyle = { color: '#61dafb', marginBottom: '10px', fontSize: '1.1rem' };
    const listStyle = { paddingLeft: '20px', color: '#ccc', marginTop: '8px' };
    const warningStyle = { background: '#332211', padding: '12px', borderRadius: '5px', marginTop: '15px', borderLeft: '3px solid #d62828' };

    return (
        <div style={{ lineHeight: '1.6', maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
            <h2 style={{ color: '#61dafb', marginTop: 0, borderBottom: '2px solid #333', paddingBottom: '12px', fontSize: '1.4rem' }}>
                🕵️ How to Play - Player Guide
            </h2>

            <p style={{ color: '#ccc', marginBottom: '20px' }}>
                Welcome to a murder mystery party game! Someone at this gathering is a killer, and it's up to you to figure out who—or survive suspicion yourself.
            </p>

            <div style={sectionStyle}>
                <h3 style={headingStyle}>📱 JOINING THE GAME</h3>
                <ol style={listStyle}>
                    <li style={{ marginBottom: '8px' }}>Scan the QR code or enter the Game ID provided by the host</li>
                    <li style={{ marginBottom: '8px' }}>Enter your name (use your real name for easier gameplay)</li>
                    <li style={{ marginBottom: '8px' }}>Wait for the host to assign you a character</li>
                    <li style={{ marginBottom: '8px' }}>Once assigned, read your character information carefully</li>
                </ol>
            </div>

            <div style={sectionStyle}>
                <h3 style={headingStyle}>📖 YOUR CHARACTER SHEET</h3>
                <p style={{ color: '#aaa', marginBottom: '10px' }}>Your character has several sections:</p>
                <ul style={listStyle}>
                    <li style={{ marginBottom: '8px' }}>
                        <strong style={{ color: '#61dafb' }}>About You:</strong> Your public backstory. You WILL read this aloud to everyone.
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        <strong style={{ color: '#d62828' }}>Your Secret:</strong> Private information. NEVER share unless you have no choice!
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        <strong style={{ color: '#f77f00' }}>Your Actions:</strong> Instructions on what to do during the game.
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        <strong style={{ color: '#06a77d' }}>Your Goal:</strong> What you're trying to achieve.
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        <strong style={{ color: '#9d4edd' }}>Tips:</strong> Additional hints, things you witnessed, or special knowledge.
                    </li>
                </ul>
            </div>

            <div style={sectionStyle}>
                <h3 style={headingStyle}>🎭 DURING THE GAME</h3>
                <p style={{ color: '#aaa', marginBottom: '10px' }}><strong>1. Stay In Character</strong></p>
                <ul style={listStyle}>
                    <li style={{ marginBottom: '6px' }}>Speak and act as your character would</li>
                    <li style={{ marginBottom: '6px' }}>Use your character's personality and motivations</li>
                    <li style={{ marginBottom: '6px' }}>Reference your relationships with other characters</li>
                </ul>

                <p style={{ color: '#aaa', marginBottom: '10px', marginTop: '15px' }}><strong>2. Investigate Actively</strong></p>
                <ul style={listStyle}>
                    <li style={{ marginBottom: '6px' }}>Ask other players questions</li>
                    <li style={{ marginBottom: '6px' }}>Look for contradictions in alibis</li>
                    <li style={{ marginBottom: '6px' }}>Pay attention to who had motive, means, and opportunity</li>
                    <li style={{ marginBottom: '6px' }}>Take notes on your device or paper</li>
                </ul>

                <p style={{ color: '#aaa', marginBottom: '10px', marginTop: '15px' }}><strong>3. What You CAN Share:</strong></p>
                <ul style={listStyle}>
                    <li style={{ marginBottom: '6px' }}>Your "About You" information</li>
                    <li style={{ marginBottom: '6px' }}>Your alibi (where you were during the murder)</li>
                    <li style={{ marginBottom: '6px' }}>Things your "Tips" section says you witnessed</li>
                    <li style={{ marginBottom: '6px' }}>Suspicions about others</li>
                </ul>

                <p style={{ color: '#aaa', marginBottom: '10px', marginTop: '15px' }}><strong>4. What You CANNOT Share:</strong></p>
                <ul style={listStyle}>
                    <li style={{ marginBottom: '6px' }}>Your "Secret" section (unless caught/cornered)</li>
                    <li style={{ marginBottom: '6px' }}>Information your character wouldn't know</li>
                    <li style={{ marginBottom: '6px' }}>Your screen with other players</li>
                </ul>
            </div>

            <div style={sectionStyle}>
                <h3 style={headingStyle}>🏆 WINNING THE GAME</h3>
                <ul style={listStyle}>
                    <li style={{ marginBottom: '8px' }}>
                        <strong>If you're innocent:</strong> Correctly identify the killer during the final vote
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        <strong>If you're the killer:</strong> Avoid being caught by deflecting suspicion
                    </li>
                </ul>
            </div>

            <div style={warningStyle}>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#d62828' }}>⚠️ IMPORTANT RULES</p>
                <ul style={{ ...listStyle, marginBottom: 0, marginTop: '8px' }}>
                    <li style={{ marginBottom: '6px' }}>✅ DO: Stay in character, have fun, be dramatic!</li>
                    <li style={{ marginBottom: '6px' }}>✅ DO: Defend yourself when accused</li>
                    <li style={{ marginBottom: '6px' }}>❌ DON'T: Show your screen to others</li>
                    <li style={{ marginBottom: '6px' }}>❌ DON'T: Reveal your secret too early</li>
                    <li style={{ marginBottom: '6px' }}>❌ DON'T: Take accusations personally—it's just a game!</li>
                </ul>
            </div>

            <div style={{ marginTop: '25px', padding: '15px', background: '#1a1a1a', borderRadius: '5px', borderLeft: '3px solid #61dafb' }}>
                <p style={{ margin: 0, color: '#61dafb', fontWeight: 'bold' }}>💡 Pro Tips:</p>
                <ul style={{ ...listStyle, marginTop: '8px', marginBottom: 0 }}>
                    <li style={{ marginBottom: '6px' }}>Listen carefully during character introductions</li>
                    <li style={{ marginBottom: '6px' }}>Track who was where during the murder</li>
                    <li style={{ marginBottom: '6px' }}>Follow your character's instructions in "Actions"</li>
                    <li style={{ marginBottom: '6px' }}>The most dramatic player often wins!</li>
                </ul>
            </div>
        </div>
    );
}

function HostGuide() {
    // Download functionality disabled for now (will be behind paywall later)
    // const [step, setStep] = useState(1);
    // const [email, setEmail] = useState('');
    // const [isSubmitting, setIsSubmitting] = useState(false);

    const sectionStyle = { marginTop: '20px', marginBottom: '20px' };
    const headingStyle = { color: '#d62828', marginBottom: '10px', fontSize: '1.1rem' };
    const listStyle = { paddingLeft: '20px', color: '#ccc', marginTop: '8px' };

    // PDF download functionality - COMMENTED OUT (for future paywall feature)
    /*
    const buttonStyle = {
        width: '100%', padding: '15px', marginTop: '15px', fontSize: '1.1rem',
        border: 'none', borderRadius: '8px', cursor: 'pointer',
        fontWeight: 'bold', textTransform: 'uppercase', transition: 'all 0.3s'
    };

    const handleDownload = async (email) => {
        try {
            // Fetch the host.md file
            const response = await fetch('/game_assets/momo_massacre/host.md');
            if (!response.ok) throw new Error('Failed to fetch host guide');

            const markdownContent = await response.text();

            // Create PDF
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Add metadata
            doc.setProperties({
                title: 'Momo Massacre Host Guide',
                subject: 'Murder Mystery Host Instructions',
                author: 'Murder Mystery Platform',
                creator: email
            });

            // PDF styling constants
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const maxWidth = pageWidth - (margin * 2);
            let yPosition = margin;

            // Helper to check page break
            const checkPageBreak = (spaceNeeded = 10) => {
                if (yPosition + spaceNeeded > pageHeight - margin) {
                    doc.addPage();
                    yPosition = margin;
                    return true;
                }
                return false;
            };

            // Parse inline markdown (bold, italic, code)
            const parseInlineMarkdown = (text) => {
                const segments = [];
                let remaining = text;

                // Pattern to match **bold**, *italic*, or `code`
                const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
                let lastIndex = 0;
                let match;

                while ((match = pattern.exec(remaining)) !== null) {
                    // Add plain text before match
                    if (match.index > lastIndex) {
                        segments.push({
                            text: remaining.substring(lastIndex, match.index),
                            style: 'normal'
                        });
                    }

                    // Add formatted text
                    if (match[2]) { // **bold**
                        segments.push({ text: match[2], style: 'bold' });
                    } else if (match[3]) { // *italic*
                        segments.push({ text: match[3], style: 'italic' });
                    } else if (match[4]) { // `code`
                        segments.push({ text: match[4], style: 'code' });
                    }

                    lastIndex = pattern.lastIndex;
                }

                // Add remaining plain text
                if (lastIndex < remaining.length) {
                    segments.push({
                        text: remaining.substring(lastIndex),
                        style: 'normal'
                    });
                }

                return segments.length > 0 ? segments : [{ text: remaining, style: 'normal' }];
            };

            // Render text segments with formatting
            const renderTextSegments = (segments, fontSize = 10, baseColor = [0, 0, 0]) => {
                doc.setFontSize(fontSize);

                let currentX = margin;
                const lineHeight = fontSize * 0.5;

                segments.forEach(segment => {
                    // Set style based on segment type
                    if (segment.style === 'bold') {
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(0, 0, 0);
                    } else if (segment.style === 'italic') {
                        doc.setFont('helvetica', 'italic');
                        doc.setTextColor(...baseColor);
                    } else if (segment.style === 'code') {
                        doc.setFont('courier', 'normal');
                        doc.setTextColor(100, 100, 100);
                    } else {
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(...baseColor);
                    }

                    // Split text into words for wrapping
                    const words = segment.text.split(' ');

                    words.forEach((word, idx) => {
                        const wordWidth = doc.getTextWidth(word + ' ');

                        // Check if word fits on current line
                        if (currentX + wordWidth > pageWidth - margin) {
                            yPosition += lineHeight;
                            currentX = margin;
                            checkPageBreak(lineHeight);
                        }

                        doc.text(word + (idx < words.length - 1 ? ' ' : ''), currentX, yPosition);
                        currentX += wordWidth;
                    });
                });

                yPosition += lineHeight;
            };

            // Add title header
            checkPageBreak(25);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(214, 40, 40);
            doc.text('MOMO MASSACRE HOST GUIDE', pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 8;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('⚠️ CONFIDENTIAL - CONTAINS SPOILERS ⚠️', pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(`Downloaded by: ${email} | ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 10;

            // Draw separator line
            doc.setDrawColor(214, 40, 40);
            doc.setLineWidth(0.5);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 8;

            // Parse markdown content
            const lines = markdownContent.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (line.trim() === '') {
                    yPosition += 2;
                    continue;
                }

                // Headers
                if (line.startsWith('# ')) {
                    checkPageBreak(12);
                    yPosition += 4;
                    doc.setFontSize(16);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(214, 40, 40);
                    const text = line.substring(2);
                    doc.text(text, margin, yPosition);
                    yPosition += 8;
                    doc.setDrawColor(214, 40, 40);
                    doc.setLineWidth(0.3);
                    doc.line(margin, yPosition, pageWidth - margin, yPosition);
                    yPosition += 4;
                } else if (line.startsWith('## ')) {
                    checkPageBreak(10);
                    yPosition += 3;
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(42, 157, 143);
                    const text = line.substring(3);
                    doc.text(text, margin, yPosition);
                    yPosition += 6;
                    doc.setDrawColor(42, 157, 143);
                    doc.setLineWidth(0.2);
                    doc.line(margin, yPosition, pageWidth - margin, yPosition);
                    yPosition += 3;
                } else if (line.startsWith('### ')) {
                    checkPageBreak(8);
                    yPosition += 2;
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(231, 111, 81);
                    const text = line.substring(4);
                    doc.text(text, margin, yPosition);
                    yPosition += 6;
                } else if (line.startsWith('#### ')) {
                    checkPageBreak(7);
                    yPosition += 2;
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(38, 70, 83);
                    const text = line.substring(5);
                    doc.text(text, margin, yPosition);
                    yPosition += 5;
                } else if (line.trim().startsWith('---')) {
                    checkPageBreak(5);
                    yPosition += 2;
                    doc.setDrawColor(150, 150, 150);
                    doc.setLineWidth(0.2);
                    doc.line(margin, yPosition, pageWidth - margin, yPosition);
                    yPosition += 3;
                } else if (line.trim().match(/^[-*]\s/)) {
                    // Bullet point
                    checkPageBreak(6);
                    const text = line.trim().substring(2);
                    const segments = parseInlineMarkdown(text);

                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(0, 0, 0);
                    doc.text('•', margin, yPosition);

                    // Temporarily adjust margin for bullet content
                    const oldMargin = margin;
                    const bulletIndent = 7;

                    let currentX = margin + bulletIndent;
                    segments.forEach(segment => {
                        if (segment.style === 'bold') {
                            doc.setFont('helvetica', 'bold');
                        } else if (segment.style === 'italic') {
                            doc.setFont('helvetica', 'italic');
                        } else {
                            doc.setFont('helvetica', 'normal');
                        }

                        const wrappedLines = doc.splitTextToSize(segment.text, maxWidth - bulletIndent);
                        wrappedLines.forEach((wrappedLine, idx) => {
                            if (idx > 0) {
                                yPosition += 5;
                                checkPageBreak(5);
                            }
                            doc.text(wrappedLine, currentX, yPosition);
                            if (idx < wrappedLines.length - 1) {
                                currentX = margin + bulletIndent;
                            }
                        });

                        currentX += doc.getTextWidth(segment.text) + 1;
                    });

                    yPosition += 5;
                } else if (line.trim().match(/^\d+\./)) {
                    // Numbered list
                    checkPageBreak(6);
                    const segments = parseInlineMarkdown(line.trim());

                    let currentX = margin;
                    segments.forEach(segment => {
                        doc.setFontSize(10);
                        if (segment.style === 'bold') {
                            doc.setFont('helvetica', 'bold');
                        } else if (segment.style === 'italic') {
                            doc.setFont('helvetica', 'italic');
                        } else {
                            doc.setFont('helvetica', 'normal');
                        }
                        doc.setTextColor(0, 0, 0);

                        const wrappedLines = doc.splitTextToSize(segment.text, maxWidth - 7);
                        wrappedLines.forEach((wrappedLine, idx) => {
                            if (idx > 0) {
                                yPosition += 5;
                                checkPageBreak(5);
                                currentX = margin + 7;
                            }
                            doc.text(wrappedLine, currentX, yPosition);
                        });

                        currentX += doc.getTextWidth(segment.text) + 1;
                    });

                    yPosition += 5;
                } else {
                    // Regular paragraph with inline formatting
                    checkPageBreak(6);
                    const segments = parseInlineMarkdown(line);

                    let currentX = margin;
                    const lineHeight = 5;

                    segments.forEach(segment => {
                        doc.setFontSize(10);
                        if (segment.style === 'bold') {
                            doc.setFont('helvetica', 'bold');
                            doc.setTextColor(0, 0, 0);
                        } else if (segment.style === 'italic') {
                            doc.setFont('helvetica', 'italic');
                            doc.setTextColor(80, 80, 80);
                        } else if (segment.style === 'code') {
                            doc.setFont('courier', 'normal');
                            doc.setTextColor(100, 100, 100);
                        } else {
                            doc.setFont('helvetica', 'normal');
                            doc.setTextColor(0, 0, 0);
                        }

                        const words = segment.text.split(' ');
                        words.forEach((word, idx) => {
                            const wordText = word + (idx < words.length - 1 ? ' ' : '');
                            const wordWidth = doc.getTextWidth(wordText);

                            if (currentX + wordWidth > pageWidth - margin) {
                                yPosition += lineHeight;
                                currentX = margin;
                                checkPageBreak(lineHeight);
                            }

                            doc.text(wordText, currentX, yPosition);
                            currentX += wordWidth;
                        });
                    });

                    yPosition += 5;
                }
            }

            // Add footer
            const totalPages = doc.internal.pages.length - 1;
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
                doc.text('Murder Mystery Platform - Keep Confidential', pageWidth / 2, pageHeight - 4, { align: 'center' });
            }

            // Save the PDF
            doc.save('momo_massacre_host_guide.pdf');

            // setStep(3);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF. Please try again or contact support.');
        }
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            handleDownload(email);
        }, 500);
    };
    */

    // Show overview directly (no download/email capture for now)
    return (
        <div style={{ lineHeight: '1.6', maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
            <h2 style={{ color: '#d62828', marginTop: 0, borderBottom: '2px solid #333', paddingBottom: '12px', fontSize: '1.4rem' }}>
                🎤 How to Host - Quick Guide
            </h2>

            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                <div style={sectionStyle}>
                    <p style={{ color: '#aaa', marginBottom: '15px' }}>
                        <strong style={{ color: '#d62828' }}>Duration:</strong> 2-3 hours
                    </p>
                    <p style={{ color: '#aaa', marginBottom: '15px' }}>
                        <strong style={{ color: '#d62828' }}>Players:</strong> 7-13 players (full game has 13)
                    </p>
                </div>

                <div style={sectionStyle}>
                    <h4 style={{ ...headingStyle, fontSize: '1rem' }}>Before Game Night:</h4>
                    <ol style={listStyle}>
                        <li style={{ marginBottom: '8px' }}>Familiarize yourself with the game scenario</li>
                        <li style={{ marginBottom: '8px' }}>Prepare any props mentioned in the storyline</li>
                        <li style={{ marginBottom: '8px' }}>Decide which characters to include (minimum 7)</li>
                        <li style={{ marginBottom: '8px' }}>Plan your hosting space for atmosphere</li>
                    </ol>
                </div>

                <div style={sectionStyle}>
                    <h4 style={{ ...headingStyle, fontSize: '1rem' }}>Game Day Setup:</h4>
                    <ol style={listStyle}>
                        <li style={{ marginBottom: '8px' }}>Create game session on this website</li>
                        <li style={{ marginBottom: '8px' }}>Share QR code with players to join</li>
                        <li style={{ marginBottom: '8px' }}>Assign characters to each player</li>
                        <li style={{ marginBottom: '8px' }}>Follow the phase-by-phase instructions</li>
                    </ol>
                </div>

                <div style={sectionStyle}>
                    <h4 style={{ ...headingStyle, fontSize: '1rem' }}>During the Game:</h4>
                    <ul style={listStyle}>
                        <li style={{ marginBottom: '8px' }}>Set the atmosphere with dramatic narration</li>
                        <li style={{ marginBottom: '8px' }}>Have players introduce their characters</li>
                        <li style={{ marginBottom: '8px' }}>Orchestrate the murder reveal</li>
                        <li style={{ marginBottom: '8px' }}>Reveal clues at appropriate times</li>
                        <li style={{ marginBottom: '8px' }}>Keep discussion moving during investigation</li>
                        <li style={{ marginBottom: '8px' }}>Facilitate final accusations and voting</li>
                        <li style={{ marginBottom: '8px' }}>Reveal the truth dramatically!</li>
                    </ul>
                </div>

                <div style={{
                    background: '#1a1a1a',
                    padding: '15px',
                    borderRadius: '5px',
                    marginTop: '20px',
                    borderLeft: '3px solid #61dafb'
                }}>
                    <p style={{ margin: 0, color: '#61dafb', fontWeight: 'bold', marginBottom: '8px' }}>
                        💡 Host Tips:
                    </p>
                    <ul style={{ ...listStyle, marginBottom: 0 }}>
                        <li style={{ marginBottom: '6px' }}>Your energy sets the tone—be dramatic!</li>
                        <li style={{ marginBottom: '6px' }}>Don't reveal who the killer is until the end</li>
                        <li style={{ marginBottom: '6px' }}>Keep clue reveals timed to maintain momentum</li>
                        <li style={{ marginBottom: '6px' }}>Ensure everyone gets a chance to participate</li>
                    </ul>
                </div>

                <div style={{
                    background: '#331111',
                    padding: '15px',
                    borderRadius: '5px',
                    marginTop: '15px',
                    borderLeft: '3px solid #d62828'
                }}>
                    <p style={{ margin: 0, color: '#d62828', fontWeight: 'bold', marginBottom: '8px' }}>
                        ⚠️ Important:
                    </p>
                    <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                        As the host, you'll see all clues and solutions during setup. Keep these secret from players to maintain the mystery!
                    </p>
                </div>
            </div>
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
