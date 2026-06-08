import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global error boundary — catches React render crashes and shows a
 * user-friendly recovery screen instead of a blank white page.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console for debugging (stripped in production by esbuild)
    console.error("[ErrorBoundary] Caught:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
          <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-xl p-8 text-center space-y-5">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="text-destructive" size={28} />
            </div>

            {/* Title */}
            <div>
              <h2 className="text-lg font-bold text-foreground">
                حدث خطأ غير متوقع
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                نعتذر عن هذا الخلل. يمكنك إعادة المحاولة أو تحديث الصفحة.
              </p>
            </div>

            {/* Error details (dev only) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left bg-muted/30 rounded-lg p-3 text-xs">
                <summary className="cursor-pointer text-muted-foreground font-medium mb-1">
                  Error Details (dev)
                </summary>
                <pre className="whitespace-pre-wrap text-destructive font-mono break-all">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {"\n\nComponent Stack:"}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <RefreshCw size={14} />
                إعادة المحاولة
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
              >
                تحديث الصفحة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
