import React, { useState } from 'react';
import { DebugLogEntry } from '../../hooks/useDebugMode';
import { Button } from '../atoms/Button';
import { BugIcon, XMarkIcon } from '../atoms/icons';

interface DebugPanelProps {
    debugMode: boolean;
    onToggle: (enabled: boolean) => void;
    logs: DebugLogEntry[];
    onClearLogs: () => void;
    onExportLogs: () => string;
    toolName: string;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
    debugMode,
    onToggle,
    logs,
    onClearLogs,
    onExportLogs,
    toolName
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<'all' | 'error' | 'warning' | 'info' | 'debug'>('all');

    const filteredLogs = logs.filter(log => {
        if (selectedLevel === 'all') return true;
        return log.level === selectedLevel;
    });

    const errorCount = logs.filter(l => l.level === 'error').length;
    const warningCount = logs.filter(l => l.level === 'warning').length;

    const handleExport = () => {
        const logData = onExportLogs();
        const blob = new Blob([logData], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-logs-${toolName}-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getLevelIcon = (level: DebugLogEntry['level']) => {
        switch (level) {
            case 'error':
                return <span className="text-red-600">●</span>;
            case 'warning':
                return <span className="text-orange-600">▲</span>;
            case 'info':
                return <span className="text-blue-600">ℹ</span>;
            case 'debug':
                return <span className="text-gray-600">○</span>;
        }
    };

    const getLevelColor = (level: DebugLogEntry['level']) => {
        switch (level) {
            case 'error':
                return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
            case 'warning':
                return 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200';
            case 'info':
                return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
            case 'debug':
                return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';
        }
    };

    return (
        <>
            {/* デバッグパネルトグルボタン */}
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`p-3 rounded-full shadow-lg transition-all ${
                        debugMode 
                            ? errorCount > 0 
                                ? 'bg-red-500 hover:bg-red-600 text-white' 
                                : warningCount > 0
                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            : 'bg-gray-500 hover:bg-gray-600 text-white'
                    }`}
                    title="デバッグパネル"
                >
                    <BugIcon className="w-6 h-6" />
                    {(errorCount > 0 || warningCount > 0) && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {errorCount + warningCount}
                        </span>
                    )}
                </button>
            </div>

            {/* デバッグパネル */}
            {isOpen && (
                <div className="fixed bottom-4 right-4 w-96 h-96 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-2xl z-50 flex flex-col">
                    {/* ヘッダー */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <BugIcon className="w-5 h-5" />
                            <h3 className="font-semibold text-sm">デバッグパネル ({toolName})</h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* コントロール */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={debugMode}
                                onChange={(e) => onToggle(e.target.checked)}
                                className="rounded"
                            />
                            <span>デバッグモード</span>
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={selectedLevel}
                                onChange={(e) => setSelectedLevel(e.target.value as any)}
                                className="text-xs border border-default dark:border-default-dark bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content rounded px-2 py-1 flex-1"
                            >
                                <option value="all">すべて ({logs.length})</option>
                                <option value="error">エラー ({errorCount})</option>
                                <option value="warning">警告 ({warningCount})</option>
                                <option value="info">情報 ({logs.filter(l => l.level === 'info').length})</option>
                                <option value="debug">デバッグ ({logs.filter(l => l.level === 'debug').length})</option>
                            </select>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onClearLogs}
                                className="text-xs"
                            >
                                クリア
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleExport}
                                className="text-xs"
                            >
                                エクスポート
                            </Button>
                        </div>
                    </div>

                    {/* ログ一覧 */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredLogs.length === 0 ? (
                            <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
                                ログがありません
                            </div>
                        ) : (
                            filteredLogs.slice().reverse().map((log, index) => (
                                <div
                                    key={index}
                                    className={`p-2 rounded text-xs border ${getLevelColor(log.level)}`}
                                >
                                    <div className="flex items-start gap-2">
                                        {getLevelIcon(log.level)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold">[{log.category}]</span>
                                                <span className="text-gray-500 dark:text-gray-400 text-xs">
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className="break-words">{log.message}</div>
                                            {log.data && (
                                                <details className="mt-1">
                                                    <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                                                        データを表示
                                                    </summary>
                                                    <pre className="mt-1 p-1 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto text-gray-800 dark:text-gray-200">
                                                        {typeof log.data === 'string' 
                                                            ? log.data 
                                                            : JSON.stringify(log.data, null, 2)}
                                                    </pre>
                                                </details>
                                            )}
                                            {log.stackTrace && (
                                                <details className="mt-1">
                                                    <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                                                        スタックトレース
                                                    </summary>
                                                    <pre className="mt-1 p-1 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                                                        {log.stackTrace}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default DebugPanel;

