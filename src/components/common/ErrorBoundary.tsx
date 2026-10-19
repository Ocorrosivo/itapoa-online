/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * React Error Boundary — class component captures render errors.
 * Merges: defensive class boundary (Fase 1) + window error/rejection listeners
 * and "Voltar ao Início" recovery (navegacao fix).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactAny: any = require('react');
const ComponentBase: any = ReactAny.Component;
const AlertTriangle: any = (() => {
  try { return require('lucide-react').AlertTriangle; } catch { return () => null; }
})();
const RefreshCw: any = (() => {
  try { return require('lucide-react').RefreshCw; } catch { return () => null; }
})();

export class ErrorBoundary extends ComponentBase {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any): void {
    console.error('[ErrorBoundary]', error, info);
  }

  componentDidMount(): void {
    this._attachWindowListeners();
  }

  componentWillUnmount(): void {
    this._detachWindowListeners();
  }

  _errorHandler = (event: ErrorEvent) => {
    const msg = event.message || '';
    if (msg.includes('chrome-extension') || msg.includes('moz-extension')) return;
    console.error('[ErrorBoundary] window error:', event.error || msg);
    this.setState({ hasError: true, error: event.error || new Error(event.message) });
  };

  _rejectionHandler = (event: PromiseRejectionEvent) => {
    console.error('[ErrorBoundary] unhandled rejection:', event.reason);
    this.setState({ hasError: true, error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)) });
  };

  _attachWindowListeners(): void {
    window.addEventListener('error', this._errorHandler);
    window.addEventListener('unhandledrejection', this._rejectionHandler);
  }

  _detachWindowListeners(): void {
    window.removeEventListener('error', this._errorHandler);
    window.removeEventListener('unhandledrejection', this._rejectionHandler);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = (): void => {
    this.setState({ hasError: false, error: null });
    try {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      window.location.href = '/';
    }
  };

  render(): any {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return ReactAny.createElement(
        'div',
        { className: 'min-h-screen flex items-center justify-center bg-slate-950 text-white p-6 text-center' },
        ReactAny.createElement(
          'div',
          { className: 'bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6' },
          ReactAny.createElement('div', { className: 'w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto' },
            ReactAny.createElement(AlertTriangle, { className: 'w-8 h-8' })
          ),
          ReactAny.createElement('div', { className: 'space-y-2' },
            ReactAny.createElement('h2', { className: 'text-xl font-black text-white' }, 'Algo deu errado'),
            ReactAny.createElement('p', { className: 'text-xs text-slate-400 leading-relaxed' }, 'Tente voltar à página inicial. Se o erro persistir, recarregue a aplicação.')
          ),
          this.state.error
            ? ReactAny.createElement('div', { className: 'bg-slate-950 p-3 rounded-xl border border-slate-800 text-left font-mono text-[10px] text-red-400 max-h-28 overflow-y-auto' }, String(this.state.error))
            : null,
          ReactAny.createElement('div', { className: 'flex flex-col gap-2' },
            ReactAny.createElement('button', { onClick: this.handleGoHome, className: 'w-full py-3 bg-slate-800 hover:bg-slate-700 font-bold text-white text-xs rounded-xl transition shadow flex items-center justify-center gap-2' },
              ReactAny.createElement('span', null, 'Voltar ao Início')
            ),
            ReactAny.createElement('button', { onClick: this.handleReset, className: 'w-full py-3 bg-blue-600 hover:bg-blue-700 font-bold text-white text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2' },
              ReactAny.createElement(RefreshCw, { className: 'w-4 h-4' }),
              ReactAny.createElement('span', null, 'Recarregar Aplicação')
            )
          )
        )
      );
    }
    return this.props.children;
  }
}
