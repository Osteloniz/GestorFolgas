import React from "react";

// Catches render errors in a subtree so a single page crash doesn't blank
// the whole application. Shows the error message inline for diagnosis.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
     
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="rounded-full bg-rose-50 p-3">
            <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-900">Algo deu errado ao renderizar esta página.</p>
          <pre className="max-w-xl overflow-auto rounded-lg bg-slate-50 p-3 text-left text-xs text-rose-700">
            {String(this.state.error?.message ?? this.state.error)}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}