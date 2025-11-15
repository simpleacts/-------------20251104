// components/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Log the error to the backend
    this.logErrorToApi(error, errorInfo);
  }
  
  private async logErrorToApi(error: Error, errorInfo: ErrorInfo) {
    try {
      const payload = {
        message: error.message,
        stack_trace: error.stack, // error.stack often includes the full JS call stack
        user_agent: navigator.userAgent,
        location: window.location.href,
      };
      
      await fetch('/api/log_error.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (loggingError) {
      console.error("Failed to log error to API:", loggingError);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 p-8 text-center">
            <div className="w-16 h-16 text-accent mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-heading mb-2">予期せぬエラーが発生しました</h1>
            <p className="text-text-secondary">問題は自動的に報告されました。ページを再読み込みしてお試しください。</p>
            <button onClick={() => window.location.reload()} className="mt-6 bg-primary text-white font-bold py-2 px-6 hover:bg-primary/90 transition">
                ページを再読み込み
            </button>
        </div>
      );
    }
    // FIX: Changed to directly access this.props.children to resolve a potential linting error.
    return this.props.children;
  }
}