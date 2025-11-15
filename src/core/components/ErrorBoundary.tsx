import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundaryInternal extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch = (error: Error, errorInfo: ErrorInfo): void => {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
    
    // エラーログの記録は不要（ユーザー要求により無効化）
    // エラーはコンソールに出力されるのみ
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-base-200 dark:bg-base-dark p-8">
            <div className="text-left bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 p-6 rounded-lg shadow-lg max-w-2xl">
                <h2 className="text-2xl font-bold mb-4">予期せぬエラーが発生しました</h2>
                <p className="mb-6">
                    申し訳ありません。アプリケーションの処理中に問題が発生しました。
                    ページを再読み込みして、もう一度お試しください。
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                    ページを再読み込み
                </button>
                <details className="mt-6 text-left text-xs bg-red-200/50 dark:bg-red-800/20 rounded-md">
                    <summary className="cursor-pointer p-2 font-semibold">技術的な詳細</summary>
                    <div className="p-2 border-t border-red-300 dark:border-red-700/50">
                        <pre className="whitespace-pre-wrap font-mono">
                            {this.state.error?.toString()}
                            {"\n\n"}
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </div>
                </details>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ErrorBoundary: React.FC<Props> = (props) => {
    return <ErrorBoundaryInternal {...props} />;
};

export default ErrorBoundary;