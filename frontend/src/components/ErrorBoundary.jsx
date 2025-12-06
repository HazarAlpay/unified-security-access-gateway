import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-8 bg-red-50 min-h-screen flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full border-l-4 border-red-600">
            <h2 className="text-2xl font-bold text-red-700 mb-4">Something went wrong.</h2>
            <p className="text-gray-700 mb-4">
              The application encountered an unexpected error. Please check the console for more details.
            </p>
            <div className="bg-gray-100 p-4 rounded overflow-x-auto font-mono text-sm text-red-800 mb-4">
               {this.state.error && this.state.error.toString()}
            </div>
            {this.state.errorInfo && (
                 <details className="whitespace-pre-wrap text-xs text-gray-500">
                     {this.state.errorInfo.componentStack}
                 </details>
            )}
            <button 
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                onClick={() => window.location.reload()}
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

