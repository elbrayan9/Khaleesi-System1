import React from 'react';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center space-y-4 text-zinc-300">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-bold text-white">Ocurrió un error inesperado.</h2>
          <p className="text-sm max-w-md">
            Un componente interno (posiblemente un gráfico sin datos suficientes) encontró un problema al renderizarse.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
            className="px-4 py-2 mt-4 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Intentar nuevamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
