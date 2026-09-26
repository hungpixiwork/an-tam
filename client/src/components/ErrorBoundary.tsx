import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen flex items-center justify-center bg-canvas">
          <div className="text-center space-y-4 p-8">
            <h1 className="text-xl font-semibold text-ink">Đã có lỗi xảy ra</h1>
            <p className="text-ink-soft">Vui lòng tải lại trang.</p>
            <button
              className="px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800"
              onClick={() => window.location.reload()}
            >
              Tải lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
