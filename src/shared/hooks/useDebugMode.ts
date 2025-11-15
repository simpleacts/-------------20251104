import { useCallback, useEffect, useState } from 'react';

export interface DebugLogEntry {
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'debug';
    category: string;
    message: string;
    data?: any;
    stackTrace?: string;
}

interface UseDebugModeReturn {
    debugMode: boolean;
    setDebugMode: (enabled: boolean) => void;
    logs: DebugLogEntry[];
    addLog: (level: DebugLogEntry['level'], category: string, message: string, data?: any, error?: Error) => void;
    clearLogs: () => void;
    exportLogs: () => string;
}

/**
 * デバッグモード管理フック
 * すべてのツールで共通して使用できるデバッグ機能を提供
 */
export const useDebugMode = (toolName: string): UseDebugModeReturn => {
    const [debugMode, setDebugModeState] = useState(() => {
        // ローカルストレージからデバッグモードの状態を復元
        const saved = localStorage.getItem(`debug_mode_${toolName}`);
        return saved === 'true';
    });
    
    const [logs, setLogs] = useState<DebugLogEntry[]>([]);

    // デバッグモードの状態を保存
    useEffect(() => {
        localStorage.setItem(`debug_mode_${toolName}`, String(debugMode));
    }, [debugMode, toolName]);

    const setDebugMode = useCallback((enabled: boolean) => {
        setDebugModeState(enabled);
        if (enabled) {
            addLog('info', 'system', 'デバッグモードが有効になりました');
        }
    }, []);

    const addLog = useCallback((
        level: DebugLogEntry['level'],
        category: string,
        message: string,
        data?: any,
        error?: Error
    ) => {
        if (!debugMode && level !== 'error') {
            return; // デバッグモードが無効の場合はエラー以外をスキップ
        }

        const entry: DebugLogEntry = {
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            data: data !== undefined ? (typeof data === 'object' ? JSON.parse(JSON.stringify(data)) : data) : undefined,
            stackTrace: error?.stack
        };

        setLogs(prev => [...prev, entry]);

        // エラーと警告はコンソールにも出力
        if (level === 'error' || level === 'warning') {
            const consoleMethod = level === 'error' ? console.error : console.warn;
            consoleMethod(`[${toolName}] [${category}] ${message}`, data || '', error || '');
        } else if (debugMode && level === 'debug') {
            console.debug(`[${toolName}] [${category}] ${message}`, data || '');
        }

        // ログが多すぎる場合は古いものを削除（最大1000件）
        setLogs(prev => {
            if (prev.length > 1000) {
                return prev.slice(-1000);
            }
            return prev;
        });
    }, [debugMode, toolName]);

    const clearLogs = useCallback(() => {
        setLogs([]);
        addLog('info', 'system', 'ログをクリアしました');
    }, [addLog]);

    const exportLogs = useCallback(() => {
        const exportedAt = new Date();
        const dateStr = exportedAt.toLocaleString('ja-JP');
        
        let text = `========================================\n`;
        text += `デバッグログエクスポート\n`;
        text += `========================================\n`;
        text += `ツール名: ${toolName}\n`;
        text += `エクスポート日時: ${dateStr}\n`;
        text += `デバッグモード: ${debugMode ? '有効' : '無効'}\n`;
        text += `ログ数: ${logs.length}\n`;
        text += `========================================\n\n`;

        if (logs.length === 0) {
            text += `ログがありません。\n`;
        } else {
            logs.forEach((log, index) => {
                const logDate = new Date(log.timestamp);
                const timeStr = logDate.toLocaleString('ja-JP');
                
                text += `[${index + 1}] ${log.level.toUpperCase()}\n`;
                text += `時刻: ${timeStr}\n`;
                text += `カテゴリ: ${log.category}\n`;
                text += `メッセージ: ${log.message}\n`;
                
                if (log.data !== undefined) {
                    text += `データ:\n`;
                    if (typeof log.data === 'string') {
                        text += `${log.data}\n`;
                    } else if (typeof log.data === 'object') {
                        text += `${JSON.stringify(log.data, null, 2)}\n`;
                    } else {
                        text += `${String(log.data)}\n`;
                    }
                }
                
                if (log.stackTrace) {
                    text += `スタックトレース:\n${log.stackTrace}\n`;
                }
                
                text += `\n${'-'.repeat(40)}\n\n`;
            });
        }
        
        return text;
    }, [toolName, debugMode, logs]);

    return {
        debugMode,
        setDebugMode,
        logs,
        addLog,
        clearLogs,
        exportLogs
    };
};

/**
 * API呼び出しをラップしてデバッグログを記録する
 */
export const debugFetch = async (
    url: string,
    options: RequestInit,
    addLog: (level: DebugLogEntry['level'], category: string, message: string, data?: any) => void
): Promise<Response> => {
    const startTime = Date.now();
    addLog('debug', 'api', `API呼び出し開始: ${options.method || 'GET'} ${url}`, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined
    });

    try {
        const response = await fetch(url, options);
        const duration = Date.now() - startTime;
        
        // レスポンスの内容を取得（エラー時も含む）
        const responseClone = response.clone();
        let responseData: any = null;
        try {
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                responseData = await responseClone.json();
            } else {
                responseData = await responseClone.text();
            }
        } catch (e) {
            // レスポンスの読み取りに失敗した場合はスキップ
        }

        if (response.ok) {
            addLog('debug', 'api', `API呼び出し成功: ${options.method || 'GET'} ${url}`, {
                status: response.status,
                statusText: response.statusText,
                duration: `${duration}ms`,
                responseData: responseData ? (typeof responseData === 'object' ? JSON.stringify(responseData).substring(0, 500) : responseData.substring(0, 500)) : null
            });
        } else {
            addLog('error', 'api', `API呼び出し失敗: ${options.method || 'GET'} ${url}`, {
                status: response.status,
                statusText: response.statusText,
                duration: `${duration}ms`,
                responseData: responseData ? (typeof responseData === 'object' ? JSON.stringify(responseData).substring(0, 500) : responseData.substring(0, 500)) : null
            });
        }

        return response;
    } catch (error) {
        const duration = Date.now() - startTime;
        addLog('error', 'api', `API呼び出し例外: ${options.method || 'GET'} ${url}`, {
            error: error instanceof Error ? error.message : String(error),
            duration: `${duration}ms`
        }, error instanceof Error ? error : undefined);
        throw error;
    }
};

