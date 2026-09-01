// Qué se ve cuando una pantalla se rompe.
//
// Antes decía "Ocurrió un error inesperado" y **se guardaba el error para
// sí**: quedaba en la consola del navegador, que en un celular no la abre
// nadie. Y como solo envolvía un gráfico, un error en cualquier otra pantalla
// dejaba la app entera en negro, sin una palabra.
//
// Eso es lo peor que puede pasar en un mostrador: no se entiende qué pasó, no
// se puede contar por teléfono, y no hay forma de seguir trabajando. Ahora el
// mensaje se muestra, se puede copiar de un toque y se puede volver.

import React from 'react';
import { AlertCircle, Copy, RotateCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, pila: '', copiado: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    // Las primeras líneas alcanzan para saber qué componente falló; la pila
    // entera no entra en una pantalla de celular ni sirve para más.
    this.setState({
      pila: String(errorInfo?.componentStack || '')
        .trim()
        .split('\n')
        .slice(0, 4)
        .join('\n'),
    });
  }

  get textoDelError() {
    const e = this.state.error;
    const nombre = e?.name ? `${e.name}: ` : '';
    return [
      `${nombre}${e?.message || 'Error desconocido'}`,
      this.state.pila,
      `Pantalla: ${window.location.pathname}`,
      navigator.userAgent,
    ]
      .filter(Boolean)
      .join('\n');
  }

  copiar = async () => {
    try {
      await navigator.clipboard.writeText(this.textoDelError);
      this.setState({ copiado: true });
    } catch {
      // Sin permiso de portapapeles queda el texto a la vista para sacarle
      // una foto, que es lo que la gente termina haciendo igual.
      this.setState({ copiado: false });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="mx-auto max-w-lg p-6 text-zinc-300">
        <div className="mb-4 flex items-center gap-3">
          <AlertCircle className="h-8 w-8 shrink-0 text-red-500" />
          <h2 className="text-xl font-bold text-white">
            Esta pantalla se rompió
          </h2>
        </div>

        <p className="mb-4 text-sm">
          El resto del sistema sigue andando. Si podés, copiá el detalle y
          mandámelo: con eso se arregla.
        </p>

        {/* El mensaje a la vista, no escondido en la consola: en un celular
            nadie la abre, y sin el texto no hay forma de arreglar nada. */}
        <pre className="mb-4 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md bg-zinc-900 p-3 text-xs leading-relaxed text-amber-300">
          {this.textoDelError}
        </pre>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={this.copiar}
            className="flex items-center gap-2 rounded-md bg-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-600"
          >
            <Copy className="h-4 w-4" />
            {this.state.copiado ? 'Copiado' : 'Copiar el detalle'}
          </button>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, pila: '' });
              if (this.props.onReset) this.props.onReset();
            }}
            className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <RotateCcw className="h-4 w-4" />
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
