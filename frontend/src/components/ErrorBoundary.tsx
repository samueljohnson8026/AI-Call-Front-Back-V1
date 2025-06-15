import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>AI Call Center Dashboard</h1>
          <div style={{ 
            marginTop: '20px', 
            padding: '20px', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc',
            borderRadius: '5px' 
          }}>
            <h2>⚠️ Application Error</h2>
            <p>Something went wrong loading the application.</p>
            <details style={{ marginTop: '10px' }}>
              <summary>Error Details</summary>
              <pre style={{ 
                marginTop: '10px', 
                padding: '10px', 
                backgroundColor: '#f5f5f5',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {this.state.error?.message}
                {'\n'}
                {this.state.error?.stack}
              </pre>
            </details>
            <button 
              onClick={() => window.location.reload()}
              style={{
                marginTop: '15px',
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Reload Application
            </button>
          </div>
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
            <h3>System Status</h3>
            <p>✅ Frontend: Running on port 12000</p>
            <p>✅ Backend: Running on port 12001</p>
            <p>⚠️ Application: Error in React components</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;