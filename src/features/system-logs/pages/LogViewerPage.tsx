
import React, { useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, Row, ToolDependency } from '@shared/types';
import { PencilIcon, XMarkIcon } from '@components/atoms';
import DependencyEditModal from '@features/tool-dependency-manager/modals/DependencyEditModal';


interface LogDetailModalProps {
    log: Row;
    onClose: () => void;
    onEditDependency: (toolName: string, tableName: string, dependency: Partial<ToolDependency>) => void;
}

const LogDetailModal: React.FC<LogDetailModalProps> = ({ log, onClose, onEditDependency }) => {
    const { t } = useTranslation('system-logs');
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const contextData = useMemo(() => {
        try {
            return JSON.parse(log.context || '{}');
        } catch {
            return {};
        }
    }, [log.context]);

    const copyToClipboard = async (text: string, fieldName: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    const copyAllContent = async () => {
        let content = '';
        content += `ID: ${log.id}\n`;
        content += `Timestamp: ${new Date(log.timestamp).toLocaleString('ja-JP')}\n`;
        content += `Level: ${log.level}\n`;
        content += `User ID: ${log.user_id}\n`;
        content += `\nMessage:\n${log.message || 'N/A'}\n`;
        
        if (log.stack_trace) {
            content += `\nStack Trace:\n${log.stack_trace}\n`;
        }
        
        if (log.context) {
            content += `\nContext:\n${JSON.stringify(contextData, null, 2)}\n`;
        }
        
        await copyToClipboard(content, 'all');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">{t('system_logs.log_detail_title', 'ログ詳細')}</h2>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={copyAllContent}
                            className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"
                            title={t('system_logs.copy_all', '全ての内容をコピー')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                            </svg>
                        </button>
                        {copiedField === 'all' && (
                            <span className="text-xs text-green-600 dark:text-green-400">{t('system_logs.copied', 'コピーしました')}</span>
                        )}
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                    </div>
                </header>
                <main className="overflow-y-auto p-6 space-y-4 text-sm">
                    <div><strong>ID:</strong> {log.id}</div>
                    <div><strong>Timestamp:</strong> {new Date(log.timestamp).toLocaleString('ja-JP')}</div>
                    <div><strong>Level:</strong> <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getLogLevelClass(log.level)}`}>{log.level}</span></div>
                    <div><strong>User ID:</strong> {log.user_id}</div>
                    
                    {log.level === 'DATA_ACCESS' ? (
                        <>
                            <div><h4 className="font-semibold mt-2">{t('system_logs.data_access_info', 'データアクセス情報')}:</h4></div>
                            <div className="bg-base-200 dark:bg-base-dark-300 p-3 rounded-md space-y-2">
                                <p><strong>{t('system_logs.tool_source', 'ツール/ソース')}:</strong> {contextData.tool}</p>
                                <div className="space-y-2">
                                    {(contextData.access_details || []).map((detail: any, index: number) => (
                                        <div key={index} className="text-xs p-2 bg-base-100 dark:bg-base-dark-200 rounded">
                                            <div className="flex justify-between items-center">
                                                <p className="font-mono font-bold">{detail.table_name}</p>
                                                <button onClick={() => onEditDependency(contextData.tool, detail.table_name, detail)} className="p-1 text-gray-500 hover:text-blue-600" title={t('system_logs.edit_dependency', '依存関係を編集')}>
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p><strong>{t('system_logs.load_strategy', '取得タイミング')}:</strong> {detail.load_strategy}</p>
                                            <p><strong>{t('system_logs.read_fields', '読み込み許可')}:</strong> <span className="font-mono text-blue-600 dark:text-blue-400">{detail.read_fields || t('system_logs.none', 'なし')}</span></p>
                                            <p><strong>{t('system_logs.write_fields', '書き込み許可')}:</strong> <span className="font-mono text-red-600 dark:text-red-400">{detail.write_fields || t('system_logs.none', 'なし')}</span></p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                             <div className="relative">
                                 <div className="flex justify-between items-center">
                                     <h4 className="font-semibold mt-2">Message:</h4>
                                     <button 
                                         onClick={() => copyToClipboard(log.message as string, 'message')}
                                         className="p-1 rounded hover:bg-base-200 dark:hover:bg-base-dark-300"
                                         title={t('system_logs.copy_message', 'メッセージをコピー')}
                                     >
                                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                             <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                         </svg>
                                     </button>
                                 </div>
                                 <pre className="whitespace-pre-wrap font-sans bg-base-200 dark:bg-base-dark-300 p-2 rounded">{log.message}</pre>
                                 {copiedField === 'message' && (
                                     <span className="absolute top-8 right-2 text-xs text-green-600 dark:text-green-400">{t('system_logs.copied', 'コピーしました')}</span>
                                 )}
                             </div>
                             {log.stack_trace && (
                                 <div className="relative">
                                     <div className="flex justify-between items-center">
                                         <h4 className="font-semibold mt-2">Stack Trace:</h4>
                                         <button 
                                             onClick={() => copyToClipboard(log.stack_trace as string, 'stack')}
                                             className="p-1 rounded hover:bg-base-200 dark:hover:bg-base-dark-300"
                                             title={t('system_logs.copy_stack', 'スタックトレースをコピー')}
                                         >
                                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                             </svg>
                                         </button>
                                     </div>
                                     <pre className="whitespace-pre-wrap font-mono text-xs bg-base-200 dark:bg-base-dark-300 p-2 rounded">{log.stack_trace}</pre>
                                     {copiedField === 'stack' && (
                                         <span className="absolute top-8 right-2 text-xs text-green-600 dark:text-green-400">{t('system_logs.copied', 'コピーしました')}</span>
                                     )}
                                 </div>
                             )}
                             {log.context && (
                                 <div className="relative">
                                     <div className="flex justify-between items-center mt-2">
                                         <details className="flex-1">
                                             <summary className="cursor-pointer font-semibold">
                                                 Context:
                                             </summary>
                                             <pre className="whitespace-pre-wrap font-mono text-xs bg-base-200 dark:bg-base-dark-300 p-2 rounded mt-2">{JSON.stringify(contextData, null, 2)}</pre>
                                         </details>
                                         <button 
                                             onClick={() => copyToClipboard(JSON.stringify(contextData, null, 2), 'context')}
                                             className="p-1 rounded hover:bg-base-200 dark:hover:bg-base-dark-300 ml-2"
                                             title={t('system_logs.copy_context', 'コンテキストをコピー（折りたたみ部分も含む）')}
                                             aria-label={t('system_logs.copy_context_aria', 'コンテキストをコピー')}
                                         >
                                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                             </svg>
                                         </button>
                                     </div>
                                     {copiedField === 'context' && (
                                         <span className="absolute top-8 right-2 text-xs text-green-600 dark:text-green-400">{t('system_logs.copied', 'コピーしました')}</span>
                                     )}
                                 </div>
                             )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

const getLogLevelClass = (level: string) => {
    switch(level) {
        case 'ERROR': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
        case 'WARN': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
        case 'DATA_ACCESS': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
        default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
    }
};

const LOG_LEVELS = ['ALL', 'DATA_ACCESS', 'INFO', 'WARN', 'ERROR'];

const LogViewer: React.FC<{ database: Database; }> = ({ database: initialDatabase }) => {
    const { database, setDatabase } = useDatabase();
    const [selectedLog, setSelectedLog] = useState<Row | null>(null);
    const [levelFilter, setLevelFilter] = useState('ALL');
    const [depModalState, setDepModalState] = useState<{ toolName: string; tableName: string; dependency: Partial<ToolDependency> } | null>(null);
    const [showUniqueErrorsOnly, setShowUniqueErrorsOnly] = useState(false);
    const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

    const logsTable = database?.app_logs;

    const { t } = useTranslation('system-logs');
    if (!logsTable) {
        return <div className="text-red-500">{t('system_logs.table_not_found', 'app_logsテーブルが見つかりません。データベースのセットアップを確認してください。')}</div>;
    }

    // 重複エラーを集約した一覧を生成
    const uniqueErrors = useMemo(() => {
        const errorLogs = logsTable.data.filter((log: Row) => log.level === 'ERROR');
        const errorMap = new Map<string, {
            log: Row;
            count: number;
            firstOccurrence: string;
            lastOccurrence: string;
        }>();

        errorLogs.forEach((log: Row) => {
            try {
                const context = log.context ? JSON.parse(log.context as string) : {};
                const fingerprint = context.fingerprint || log.id;
                const count = context.count || 1;

                if (errorMap.has(fingerprint)) {
                    const existing = errorMap.get(fingerprint)!;
                    existing.count = Math.max(existing.count, count);
                    const logTime = new Date(log.timestamp as string).getTime();
                    const existingTime = new Date(existing.lastOccurrence).getTime();
                    if (logTime > existingTime) {
                        existing.lastOccurrence = log.timestamp as string;
                        existing.log = log; // 最新のログを保持
                    }
                } else {
                    errorMap.set(fingerprint, {
                        log,
                        count,
                        firstOccurrence: log.timestamp as string,
                        lastOccurrence: log.timestamp as string
                    });
                }
            } catch {
                // パースエラーの場合は個別に扱う
                errorMap.set(log.id as string, {
                    log,
                    count: 1,
                    firstOccurrence: log.timestamp as string,
                    lastOccurrence: log.timestamp as string
                });
            }
        });

        return Array.from(errorMap.values()).sort((a, b) => 
            new Date(b.lastOccurrence).getTime() - new Date(a.lastOccurrence).getTime()
        );
    }, [logsTable.data]);

    // 重複エラー一覧をコピー用テキストに変換
    const copyUniqueErrorsToClipboard = async () => {
        const errorText = uniqueErrors.map(({ log, count, firstOccurrence, lastOccurrence }) => {
            const context = log.context ? (() => {
                try {
                    return JSON.parse(log.context as string);
                } catch {
                    return {};
                }
            })() : {};
            const errorType = context.errorType || 'UNKNOWN';
            const errorCategory = context.errorCategory || 'OTHER';
            const severity = context.severity || 'MEDIUM';
            
            let text = `[${count}件] ${log.message}\n`;
            text += `  種類: ${errorType} (${errorCategory})\n`;
            text += `  重要度: ${severity}\n`;
            text += `  初回発生: ${new Date(firstOccurrence).toLocaleString('ja-JP')}\n`;
            text += `  最終発生: ${new Date(lastOccurrence).toLocaleString('ja-JP')}\n`;
            
            if (log.stack_trace) {
                text += `  スタックトレース:\n${(log.stack_trace as string).split('\n').slice(0, 5).map(line => `    ${line}`).join('\n')}\n`;
            }
            
            text += '\n';
            return text;
        }).join('\n---\n\n');

        try {
            await navigator.clipboard.writeText(errorText);
            setCopiedMessage('コピーしました');
            setTimeout(() => setCopiedMessage(null), 3000);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            setCopiedMessage('コピーに失敗しました');
            setTimeout(() => setCopiedMessage(null), 3000);
        }
    };

    const sortedLogs = useMemo(() => {
        let filtered = levelFilter === 'ALL'
            ? logsTable.data
            : logsTable.data.filter(log => log.level === levelFilter);
        
        // 重複エラーのみ表示モードの場合
        if (showUniqueErrorsOnly && (levelFilter === 'ALL' || levelFilter === 'ERROR')) {
            filtered = uniqueErrors.map(({ log }) => log);
        }
        
        return [...filtered].sort((a, b) => 
            new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime()
        );
    }, [logsTable.data, levelFilter, showUniqueErrorsOnly, uniqueErrors]);

    const getDependency = (toolName: string, tableName: string) => {
        return (database?.tool_dependencies?.data as ToolDependency[])?.find(d => d.tool_name === toolName && d.table_name === tableName);
    };

    const handleEditDependency = (toolName: string, tableName: string, dependency: Partial<ToolDependency>) => {
        setDepModalState({ toolName, tableName, dependency });
    };

    const handleSaveDependency = (updatedDep: ToolDependency) => {
        setDatabase(db => {
            if (!db || !db.tool_dependencies) return db;
            const newDb = JSON.parse(JSON.stringify(db));
            const deps = newDb.tool_dependencies.data;
            const index = deps.findIndex((d: ToolDependency) => d.tool_name === updatedDep.tool_name && d.table_name === updatedDep.table_name);
            if (index > -1) {
                deps[index] = updatedDep;
            } else {
                deps.push(updatedDep);
            }
            return newDb;
        });
        setDepModalState(null);
    };

    const depModalProps = useMemo(() => {
        if (!depModalState || !database) return null;

        const { toolName, tableName, dependency } = depModalState;
        const readFieldsFromLog = dependency.read_fields || '';
        const writeFieldsFromLog = dependency.write_fields || '';
        const allFields = database[tableName]?.schema.map(c => c.name) || [];

        // FIX: Explicitly create Sets of type string to satisfy prop types.
        const highlightedReadFields = new Set<string>(
            readFieldsFromLog === '*' ? allFields : String(readFieldsFromLog).split(',').filter(Boolean)
        );
        const highlightedWriteFields = new Set<string>(
            writeFieldsFromLog === '*' ? allFields : String(writeFieldsFromLog).split(',').filter(Boolean)
        );

        return {
            isOpen: true,
            onClose: () => setDepModalState(null),
            onSave: handleSaveDependency,
            toolName,
            tableName,
            schema: database[tableName]?.schema || [],
            initialDependency: getDependency(toolName, tableName),
            highlightedReadFields,
            highlightedWriteFields,
        };
    }, [depModalState, database, handleSaveDependency]);

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                 <div>
                    <h1 className="text-3xl font-bold">{t('system_logs.title', 'システムログ')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('system_logs.description', 'アプリケーションで記録されたエラーやイベント、データアクセスの履歴です。')}</p>
                 </div>
                 <div className="flex items-center gap-4">
                     <div>
                         <label htmlFor="log-level-filter" className="text-sm font-medium">{t('system_logs.level_filter', 'レベルで絞り込み')}: </label>
                         <select 
                            id="log-level-filter"
                            name="log_level_filter"
                            value={levelFilter}
                            onChange={e => setLevelFilter(e.target.value)}
                            className="ml-2 p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark"
                         >
                            {LOG_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                         </select>
                     </div>
                     {(levelFilter === 'ALL' || levelFilter === 'ERROR') && (
                         <>
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input
                                     type="checkbox"
                                     checked={showUniqueErrorsOnly}
                                     onChange={e => setShowUniqueErrorsOnly(e.target.checked)}
                                     className="w-4 h-4"
                                 />
                                 <span className="text-sm">重複エラーのみ表示</span>
                             </label>
                             {showUniqueErrorsOnly && (
                                 <button
                                     onClick={copyUniqueErrorsToClipboard}
                                     className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center gap-2"
                                 >
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                         <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                     </svg>
                                     重複エラー一覧をコピー
                                 </button>
                             )}
                             {copiedMessage && (
                                 <span className="text-sm text-green-600 dark:text-green-400">{copiedMessage}</span>
                             )}
                         </>
                     )}
                 </div>
            </header>
            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-auto h-full">
                    <table className="min-w-full divide-y divide-base-300 dark:divide-base-dark-300">
                        <thead className="sticky top-0 bg-base-100 dark:bg-base-dark-200">
                            <tr>
                                <th className="px-4 py-2 text-left text-sm font-semibold">{t('system_logs.table_header_datetime', '日時')}</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold">{t('system_logs.table_header_level', 'レベル')}</th>
                                {showUniqueErrorsOnly && (
                                    <th className="px-4 py-2 text-left text-sm font-semibold">発生件数</th>
                                )}
                                <th className="px-4 py-2 text-left text-sm font-semibold">{t('system_logs.table_header_message', 'メッセージ')}</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold">{t('system_logs.table_header_user_id', 'ユーザーID')}</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-base-300 dark:divide-base-dark-300">
                            {sortedLogs.map(log => {
                                const context = log.context ? (() => {
                                    try {
                                        return JSON.parse(log.context as string);
                                    } catch {
                                        return {};
                                    }
                                })() : {};
                                const count = context.count || 1;
                                
                                return (
                                    <tr key={log.id as string} onClick={() => setSelectedLog(log)} className="cursor-pointer hover:bg-base-200 dark:hover:bg-base-dark-300">
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">{new Date(log.timestamp as string).toLocaleString('ja-JP')}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getLogLevelClass(log.level as string)}`}>
                                                {log.level}
                                            </span>
                                        </td>
                                        {showUniqueErrorsOnly && (
                                            <td className="px-4 py-2 text-sm">
                                                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded-full text-xs font-semibold">
                                                    {count}件
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-4 py-2 text-sm truncate max-w-md">{log.message as string}</td>
                                        <td className="px-4 py-2 text-sm">{log.user_id as string}</td>
                                    </tr>
                                );
                            })}
                         </tbody>
                    </table>
                </div>
            </div>
            {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} onEditDependency={handleEditDependency} />}
            {depModalProps && <DependencyEditModal {...depModalProps} />}
        </div>
    );
};

export default LogViewer;
