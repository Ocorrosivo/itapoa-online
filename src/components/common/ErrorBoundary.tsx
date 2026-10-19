/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * React Error Boundary — class component captures render errors.
 * Uses a plain class without generic typing to avoid needing @types/react.
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

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
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
            ReactAny.createElement('p', { className: 'text-xs text-slate-400 leading-relaxed' }, 'Ocorreu uma exceção inesperada na interface. Os dados permanecem seguros no banco de dados.')
          ),
          this.state.error
            ? ReactAny.createElement('div', { className: 'bg-slate-950 p-3 rounded-xl border border-slate-800 text-left font-mono text-[10px] text-red-400 max-h-28 overflow-y-auto' }, String(this.state.error))
            : null,
          ReactAny.createElement('button', { onClick: this.handleReset, className: 'w-full py-3 bg-blue-600 hover:bg-blue-700 font-bold text-white text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2' },
            ReactAny.createElement(RefreshCw, { className: 'w-4 h-4' }),
            ReactAny.createElement('span', null, 'Recarregar Aplicação')
          )
        )
      );
    }
    return this.props.children;
  }
}
