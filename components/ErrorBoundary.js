import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(err, errorInfo) {
        console.error('Error caught by boundary:', err, errorInfo);
        this.setState({
            error: err,
            errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0a0a0a',
                    color: '#fff',
                    padding: '20px',
                    fontFamily: "'Courier New', Courier, monospace"
                }}>
                    <div style={{
                        maxWidth: '600px',
                        textAlign: 'center'
                    }}>
                        <h1 style={{ color: '#ff4444', marginBottom: '20px' }}>
                            Something went wrong
                        </h1>
                        <p style={{ color: '#aaa', marginBottom: '30px' }}>
                            The application encountered an unexpected error. Please refresh the page to try again.
                        </p>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details style={{
                                textAlign: 'left',
                                background: '#1a1a1a',
                                padding: '20px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                border: '1px solid #333'
                            }}>
                                <summary style={{ cursor: 'pointer', marginBottom: '10px', color: '#ff4444' }}>
                                    Error Details
                                </summary>
                                <pre style={{
                                    fontSize: '12px',
                                    overflow: 'auto',
                                    color: '#ff8888'
                                }}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '12px 24px',
                                background: '#4CAF50',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontFamily: "'Courier New', Courier, monospace"
                            }}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
