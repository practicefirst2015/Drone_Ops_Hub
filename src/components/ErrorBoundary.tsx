import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logError } from "@/lib/errorLogger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  component?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    logError({
      errorType: "render",
      errorMessage: error.message,
      errorStack: error.stack || info.componentStack || undefined,
      component: this.props.component || "ErrorBoundary",
      severity: "critical",
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="max-w-md w-full surface border border-border p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-4" />
            <h2 className="font-mono text-sm font-semibold text-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              An unexpected error occurred. Try refreshing the page.
            </p>
            {this.state.error && (
              <p className="font-mono text-[10px] text-destructive bg-destructive/5 p-3 mb-6 text-left break-all border border-border">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="h-9 px-4 bg-secondary text-secondary-foreground font-mono text-xs tracking-wide flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-3 h-3" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="h-9 px-4 bg-primary text-primary-foreground font-mono text-xs tracking-wide hover:opacity-90 transition-opacity"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
