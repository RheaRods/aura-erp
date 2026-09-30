import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`[${this.props.name}] crashed:`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="font-medium">{this.props.name} couldn't load.</p>
          <p className="text-xs mt-1">{this.state.error.message}</p>
          <p className="text-xs mt-1 text-red-500">The other Procurement sections still work.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
