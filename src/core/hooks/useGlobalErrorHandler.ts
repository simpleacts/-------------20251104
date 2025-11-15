import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../contexts/DatabaseContext';
import { analyzeError } from '../utils/errorAnalyzer';

/**
 * グローバルエラーハンドラをセットアップするフック
 * - window.onerror: グローバルエラーをキャッチ
 * - unhandledrejection: Promise rejectionをキャッチ
 * - console.error/warnをインターセプトしてログに記録
 * - console.logをインターセプト（データ読み込み関連のみ記録）
 */
export default function useGlobalErrorHandler() {
    const { database, logError, logWarning, logInfo } = useDatabase();
    const { currentUser } = useAuth();
    const isSetupRef = useRef(false);
    const logDebounceTimerRef = useRef<number | null>(null);
    const isLoggingRef = useRef(false);

    useEffect(() => {
        // データベースが準備できていない場合はスキップ
        if (!database || !database.app_logs) {
            return;
        }

        // 既にセットアップ済みの場合はスキップ
        if (isSetupRef.current) {
            return;
        }

        isSetupRef.current = true;

        // 元のconsole.error、console.warn、console.logを保存
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        const originalConsoleLog = console.log;

        // console.errorをインターセプト
        console.error = (...args: any[]) => {
            // 元のconsole.errorも呼び出す
            originalConsoleError.apply(console, args);
            
            // ログに記録
            try {
                const message = args
                    .map(arg => {
                        if (arg instanceof Error) {
                            return arg.message;
                        } else if (typeof arg === 'object') {
                            return JSON.stringify(arg);
                        }
                        return String(arg);
                    })
                    .join(' ');
                
                const error = args.find(arg => arg instanceof Error) as Error | undefined;
                
                // エラー解析を実行
                const analysis = error ? analyzeError(error) : null;
                
                logError(message, error, {
                    source: 'console.error',
                    userId: currentUser?.id || 'guest',
                    ...(analysis ? {
                        errorType: analysis.errorType,
                        errorCategory: analysis.errorCategory,
                        componentName: analysis.componentName,
                        severity: analysis.severity,
                        fingerprint: analysis.fingerprint,
                        normalizedMessage: analysis.normalizedMessage
                    } : {}),
                    args: args.map(arg => {
                        if (arg instanceof Error) {
                            return {
                                type: 'Error',
                                message: arg.message,
                                stack: arg.stack
                            };
                        } else if (typeof arg === 'object') {
                            return {
                                type: typeof arg,
                                value: JSON.stringify(arg)
                            };
                        }
                        return { type: typeof arg, value: String(arg) };
                    })
                });
            } catch (e) {
                // ログ記録中のエラーは無視（無限ループを防ぐ）
                originalConsoleError('Failed to log error to system logs:', e);
            }
        };

        // console.warnをインターセプト
        console.warn = (...args: any[]) => {
            // 元のconsole.warnも呼び出す
            originalConsoleWarn.apply(console, args);
            
            // ログに記録
            try {
                const message = args
                    .map(arg => {
                        if (typeof arg === 'object') {
                            return JSON.stringify(arg);
                        }
                        return String(arg);
                    })
                    .join(' ');
                
                logWarning(message, {
                    source: 'console.warn',
                    userId: currentUser?.id || 'guest',
                    args: args.map(arg => {
                        if (typeof arg === 'object') {
                            return {
                                type: typeof arg,
                                value: JSON.stringify(arg)
                            };
                        }
                        return { type: typeof arg, value: String(arg) };
                    })
                });
            } catch (e) {
                // ログ記録中のエラーは無視（無限ループを防ぐ）
                originalConsoleError('Failed to log warning to system logs:', e);
            }
        };

        // console.logをインターセプト（データ読み込みの確認などに使用）
        console.log = (...args: any[]) => {
            // 元のconsole.logも呼び出す
            originalConsoleLog.apply(console, args);
            
            // 既にログ記録中の場合はスキップ（無限ループを防ぐ）
            if (isLoggingRef.current) {
                return;
            }
            
            // 早期チェック：最初の引数が文字列の場合、除外パターンをすぐにチェック
            const firstArg = args[0];
            if (typeof firstArg === 'string') {
                // 除外するパターン（システムログに記録しない）
                const excludePatterns = [
                    /\[EstimatorPage\]/i,
                    /Successfully saved/i,
                    /Successfully loaded/i,
                    /Loading essential/i,
                    /Loading product/i,
                    /Transforming data/i,
                    /Data transformation/i,
                    /Grid dimensions/i // グリッドの寸法ログも除外（頻繁に出力されるため）
                ];
                
                // 除外パターンにマッチする場合は即座にスキップ（メッセージ生成を省略）
                if (excludePatterns.some(pattern => pattern.test(firstArg))) {
                    return;
                }
                
                // 記録すべきパターンのみ処理
                const shouldLog = /\[(ProductGrid|ProductSelectionGrid)\].*(data|filter|pagina|empty|空|データ|フィルタ|No data|No filtered)/i.test(firstArg);
                if (!shouldLog) {
                    return; // 記録不要なログは早期リターン
                }
            }
            
            // ログに記録（ただし、データ読み込み関連のパターンを含む場合のみ）
            // デバウンス処理で連続したログをまとめて処理
            if (logDebounceTimerRef.current !== null) {
                clearTimeout(logDebounceTimerRef.current);
            }
            
            logDebounceTimerRef.current = window.setTimeout(() => {
                if (isLoggingRef.current) return;
                isLoggingRef.current = true;
                
                try {
                    // メッセージの生成を簡略化（大きなオブジェクトはスキップ）
                    const message = args
                        .slice(0, 5) // 最初の5つの引数のみ処理（パフォーマンス向上）
                        .map(arg => {
                            if (arg === null || arg === undefined) {
                                return String(arg);
                            }
                            // 大きなオブジェクトや配列は要約のみ
                            if (typeof arg === 'object') {
                                if (Array.isArray(arg)) {
                                    return `[Array(${arg.length})]`;
                                }
                                try {
                                    const str = JSON.stringify(arg);
                                    // 1000文字を超える場合は切り詰め
                                    if (str.length > 1000) {
                                        return str.substring(0, 1000) + '... (truncated)';
                                    }
                                    return str;
                                } catch {
                                    return '[Object]';
                                }
                            }
                            return String(arg);
                        })
                        .join(' ');
                    
                    // 念のため再度除外パターンをチェック（メッセージ生成後のチェック）
                    const excludePatterns = [
                        /\[EstimatorPage\]/i,
                        /Successfully saved/i,
                        /Grid dimensions/i
                    ];
                    
                    if (excludePatterns.some(pattern => pattern.test(message))) {
                        isLoggingRef.current = false;
                        return;
                    }
                    
                    if (message.length < 5000) { // メッセージが長すぎる場合はスキップ
                        // 非同期でログを記録（UIをブロックしない）
                        setTimeout(() => {
                            try {
                                logInfo(message, {
                                    source: 'console.log',
                                    userId: currentUser?.id || 'guest'
                                });
                            } catch (e) {
                                // エラーは無視
                            } finally {
                                isLoggingRef.current = false;
                            }
                        }, 0);
                    } else {
                        isLoggingRef.current = false;
                    }
                } catch (e) {
                    // ログ記録中のエラーは無視（無限ループを防ぐ）
                    isLoggingRef.current = false;
                }
            }, 100); // 100msデバウンス
        };

        // window.onerrorハンドラ（直接プロパティに設定）
        const handleWindowError = (
            message: string | Event,
            source?: string,
            lineno?: number,
            colno?: number,
            error?: Error
        ) => {
            try {
                let errorMessage = 'Unknown error';
                let stackTrace: string | undefined;

                if (error) {
                    errorMessage = error.message || String(message);
                    stackTrace = error.stack;
                } else if (typeof message === 'string') {
                    errorMessage = message;
                    stackTrace = source ? `${source}:${lineno}:${colno}` : undefined;
                } else {
                    errorMessage = 'Unknown error';
                }

                // エラー解析を実行
                const analysis = error ? analyzeError(error) : null;
                
                // エラーオブジェクトがない場合は、メッセージからErrorオブジェクトを作成
                const errorObj = error || new Error(errorMessage);

                logError(errorMessage, errorObj, {
                    source: 'window.onerror',
                    userId: currentUser?.id || 'guest',
                    url: source,
                    line: lineno,
                    column: colno,
                    originalMessage: typeof message === 'string' ? message : undefined,
                    ...(analysis ? {
                        errorType: analysis.errorType,
                        errorCategory: analysis.errorCategory,
                        componentName: analysis.componentName,
                        severity: analysis.severity,
                        fingerprint: analysis.fingerprint,
                        normalizedMessage: analysis.normalizedMessage
                    } : {})
                });
            } catch (e) {
                originalConsoleError('Failed to log window error to system logs:', e);
            }
            return false; // デフォルトのエラーハンドラも実行されるように
        };

        // ErrorEventハンドラ（addEventListener用）
        const handleErrorEvent = (event: ErrorEvent) => {
            try {
                const error = event.error || (event.message ? new Error(event.message) : undefined);
                const analysis = error ? analyzeError(error) : null;
                
                logError(event.message || 'Unknown error', error || event, {
                    source: 'error-event',
                    userId: currentUser?.id || 'guest',
                    url: event.filename,
                    line: event.lineno,
                    column: event.colno,
                    ...(analysis ? {
                        errorType: analysis.errorType,
                        errorCategory: analysis.errorCategory,
                        componentName: analysis.componentName,
                        severity: analysis.severity,
                        fingerprint: analysis.fingerprint,
                        normalizedMessage: analysis.normalizedMessage
                    } : {})
                });
            } catch (e) {
                originalConsoleError('Failed to log error event to system logs:', e);
            }
        };

        // unhandledrejectionハンドラ
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            try {
                const reason = event.reason;
                const message = reason instanceof Error 
                    ? reason.message 
                    : `Unhandled Promise Rejection: ${String(reason)}`;
                const stackTrace = reason instanceof Error ? reason.stack : undefined;

                // エラー解析を実行
                const error = reason instanceof Error ? reason : new Error(message);
                const analysis = analyzeError(error);

                logError(message, reason, {
                    source: 'unhandledrejection',
                    userId: currentUser?.id || 'guest',
                    promise: true,
                    errorType: analysis.errorType,
                    errorCategory: analysis.errorCategory,
                    componentName: analysis.componentName,
                    severity: analysis.severity,
                    fingerprint: analysis.fingerprint,
                    normalizedMessage: analysis.normalizedMessage
                });
            } catch (e) {
                originalConsoleError('Failed to log unhandled rejection to system logs:', e);
            }
        };

        // window.onerrorを設定（既存のハンドラがあれば保存）
        const previousWindowError = window.onerror;
        window.onerror = handleWindowError;

        // ErrorEventハンドラを登録
        window.addEventListener('error', handleErrorEvent);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        // クリーンアップ関数
        return () => {
            isSetupRef.current = false;
            // デバウンスタイマーをクリア
            if (logDebounceTimerRef.current !== null) {
                clearTimeout(logDebounceTimerRef.current);
                logDebounceTimerRef.current = null;
            }
            isLoggingRef.current = false;
            // console.error、console.warn、console.logを元に戻す
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
            console.log = originalConsoleLog;
            // window.onerrorを元に戻す
            window.onerror = previousWindowError;
            // イベントリスナーを削除
            window.removeEventListener('error', handleErrorEvent);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, [database, logError, logWarning, logInfo, currentUser]);
}

