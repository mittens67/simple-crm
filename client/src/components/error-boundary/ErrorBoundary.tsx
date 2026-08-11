import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import './error-boundary.scss';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-boundary-fallback">
            <div className="error-content">
              <h1>Something went wrong</h1>
              <p className="error-message">{this.state.error?.message || 'An unexpected error occurred'}</p>
              <button className="btn-primary" onClick={this.handleReset}>
                Try Again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
