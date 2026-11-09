import { Component, type ErrorInfo, type ReactNode } from 'react';
import { FinanceBootScreen } from '@/components/finance/FinanceBootScreen';

type Props = { children: ReactNode };
type State = { hasError: boolean };
export class FinanceStartupErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('[foco-startup] Error al cargar el tablero', error, info);
  }
  render() {
    if (this.state.hasError) {
      return <FinanceBootScreen description="No se pudo abrir el tablero. Reintentá la carga." slow />;
    }
    return this.props.children;
  }
}
