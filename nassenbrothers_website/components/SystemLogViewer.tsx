// components/SystemLogViewer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { AppLog } from '../types';

const LoadingComponent: React.FC = () => (
    <div className="flex items-center justify-center h-full p-8">
        <i className="fas fa-spinner fa-spin text-2xl text-gray-500 mr-2"></i>
        ログを読み込み中...
    </div>
);

const SystemLogViewer: React.FC = () => {
    const [logs, setLogs] = useState<AppLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/get_logs.php?cachebust=' + new Date().getTime());
            if (!response.ok) throw new Error('ログの取得に失敗しました。');
            const data = await response.json();
            if (data.success) {
                setLogs(data.logs);
            } else {
                throw new Error(data.message || 'ログデータの取得に失敗');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラーです。');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleClearLogs = async () => {
        if (window.confirm('本当にすべてのログを削除しますか？この操作は元に戻せません。')) {
            try {
                const response = await fetch('/api/clear_logs.php', { method: 'POST' });
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.message || 'ログの削除に失敗しました。');
                setLogs([]);
            } catch (err) {
                alert(err instanceof Error ? err.message : 'エラーが発生しました。');
            }
        }
    };
    
    const toggleRow = (id: number) => {
        setExpandedRow(prev => (prev === id ? null : id));
    };

    return (
        <div>
            <div className="bg-white p-4 border-b sticky top-0 z-10 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">システムログ</h2>
                    <p className="text-sm text-gray-500">アプリケーションで発生したエラーログを閲覧します。</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchLogs} disabled={loading} className="text-sm bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-300">
                        <i className="fas fa-sync-alt mr-2"></i>更新
                    </button>
                    <button onClick={handleClearLogs} className="text-sm bg-accent text-white font-semibold py-2 px-4 rounded-md hover:bg-red-700">
                        <i className="fas fa-trash-alt mr-2"></i>ログを消去
                    </button>
                </div>
            </div>
            
            <div className="p-4">
                {loading ? <LoadingComponent /> : error ? <div className="p-4 text-red-600">{error}</div> : (
                    <div className="bg-white shadow-md rounded-lg overflow-hidden">
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left w-48">日時</th>
                                        <th className="p-3 text-left">メッセージ</th>
                                        <th className="p-3 text-left">発生場所</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <React.Fragment key={log.id}>
                                            <tr className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer" onClick={() => toggleRow(log.id)}>
                                                <td className="p-3 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                                                <td className="p-3 font-semibold text-red-700 truncate max-w-sm">{log.message}</td>
                                                <td className="p-3 text-gray-600 truncate max-w-xs">{log.location}</td>
                                            </tr>
                                            {expandedRow === log.id && (
                                                <tr className="bg-gray-100">
                                                    <td colSpan={3} className="p-4">
                                                        <div className="space-y-2">
                                                            <div>
                                                                <h4 className="font-semibold text-xs text-gray-500">ユーザーエージェント:</h4>
                                                                <p className="text-xs font-mono bg-white p-2 border rounded">{log.user_agent}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-xs text-gray-500">スタックトレース:</h4>
                                                                <pre className="text-xs font-mono bg-white p-2 border rounded max-h-60 overflow-y-auto whitespace-pre-wrap">{log.stack_trace}</pre>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                         {logs.length === 0 && <p className="text-center text-gray-500 p-8">ログはありません。</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemLogViewer;
