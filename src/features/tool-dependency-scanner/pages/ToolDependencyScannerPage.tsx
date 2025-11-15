import React, { useState, useCallback, useMemo } from 'react';
import { Database, Row, ToolDependency } from '@shared/types';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useTranslation } from '@shared/hooks/useTranslation';
import { SpinnerIcon, CheckIcon } from '@components/atoms';
import { getRequiredTablesForPageManual, Page, ALL_TOOLS } from '@core/config/Routes';
import { detectDefinitionDifferences, generateDependenciesFromManualDefinition } from '@core/utils';

const ToolDependencyScanner: React.FC = () => {
    const { t } = useTranslation('tool-dependency-scanner');
    const { database, setDatabase } = useDatabase();
    const [scanResult, setScanResult] = useState<ToolDependency[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [scanCompleted, setScanCompleted] = useState(false);
    const [scanMode, setScanMode] = useState<'log' | 'manual' | 'comparison'>('log');
    const [comparisonResult, setComparisonResult] = useState<{
        onlyInManual: ToolDependency[];
        onlyInToolDependencies: ToolDependency[];
        inBoth: Array<{ manual: string[]; toolDeps: ToolDependency[] }>;
    } | null>(null);

    const handleScan = useCallback(() => {
        setIsLoading(true);
        setScanResult([]);
        setScanCompleted(false);
        setComparisonResult(null);

        setTimeout(() => {
            if (!database) {
                setIsLoading(false);
                setScanCompleted(true);
                return;
            }

            if (scanMode === 'log') {
                // 既存のログベーススキャン
                if (!database.app_logs || !database.tool_dependencies) {
                    setIsLoading(false);
                    setScanCompleted(true);
                    return;
                }

                const detectedDeps = new Map<string, ToolDependency>();
                const logs = database.app_logs.data.filter(log => log.level === 'DATA_ACCESS');

                for (const log of logs) {
                    try {
                        const context = JSON.parse(log.context as string);
                        const toolName = context.tool;
                        if (!toolName || !context.access_details) continue;

                        for (const detail of context.access_details) {
                            const tableName = detail.table_name;
                            const key = `${toolName}-${tableName}`;
                            
                            detectedDeps.set(key, {
                                tool_name: toolName,
                                table_name: tableName,
                                read_fields: detail.read_fields || '',
                                write_fields: detail.write_fields || '',
                                load_strategy: detail.load_strategy || 'on_tool_mount',
                                load_condition: detail.load_condition || '',
                            });
                        }
                    } catch {}
                }
                
                const existingDeps = database.tool_dependencies.data as ToolDependency[];
                const newOrUpdatedDeps: ToolDependency[] = [];

                detectedDeps.forEach((detectedDep) => {
                    const existingDep = existingDeps.find(d => 
                        d.tool_name === detectedDep.tool_name && 
                        d.table_name === detectedDep.table_name
                    );

                    if (!existingDep || 
                        existingDep.read_fields !== detectedDep.read_fields ||
                        existingDep.write_fields !== detectedDep.write_fields ||
                        existingDep.load_strategy !== detectedDep.load_strategy ||
                        (existingDep.load_condition || '') !== (detectedDep.load_condition || '')
                    ) {
                        newOrUpdatedDeps.push(detectedDep);
                    }
                });

                setScanResult(newOrUpdatedDeps);
            } else if (scanMode === 'manual') {
                // 手動定義からtool_dependenciesを生成
                const allDeps: ToolDependency[] = [];
                ALL_TOOLS.forEach(tool => {
                    const deps = generateDependenciesFromManualDefinition(tool.name as Page, database);
                    allDeps.push(...deps);
                });
                
                const existingDeps = (database.tool_dependencies?.data as ToolDependency[]) || [];
                const existingKeys = new Set(existingDeps.map(d => `${d.tool_name}-${d.table_name}`));
                
                const missingDeps = allDeps.filter(dep => {
                    const key = `${dep.tool_name}-${dep.table_name}`;
                    return !existingKeys.has(key);
                });
                
                setScanResult(missingDeps);
            } else if (scanMode === 'comparison') {
                // 手動定義とtool_dependenciesの比較
                const differences = detectDefinitionDifferences(database);
                setComparisonResult(differences);
                // 手動定義のみに存在するものを結果として表示
                setScanResult(differences.onlyInManual);
            }

            setIsLoading(false);
            setScanCompleted(true);
        }, 50);

    }, [database, scanMode]);

    const handleApprove = (depToApprove: ToolDependency) => {
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const deps = newDb.tool_dependencies.data;
            const index = deps.findIndex((d: Row) => d.tool_name === depToApprove.tool_name && d.table_name === depToApprove.table_name);
            if (index > -1) {
                deps[index] = depToApprove;
            } else {
                deps.push(depToApprove);
            }
            return newDb;
        });
        setScanResult(prev => prev.filter(r => !(r.tool_name === depToApprove.tool_name && r.table_name === depToApprove.table_name)));
    };

    const handleApproveAll = () => {
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const deps = newDb.tool_dependencies.data;
            scanResult.forEach(depToApprove => {
                const index = deps.findIndex((d: Row) => d.tool_name === depToApprove.tool_name && d.table_name === depToApprove.table_name);
                if (index > -1) {
                    deps[index] = depToApprove;
                } else {
                    deps.push(depToApprove);
                }
            });
            return newDb;
        });
        setScanResult([]);
    };

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">{t('dependency_scanner.title', '依存関係スキャンツール')}</h1>
                <p className="text-gray-500 mt-1">{t('dependency_scanner.description', 'システムログ、手動定義、または両者を比較して、未定義または更新が必要なデータ依存関係を検出・承認します。')}</p>
            </header>

            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md flex flex-col flex-grow min-h-0">
                <div className="flex-shrink-0 mb-4 space-y-3">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setScanMode('log')}
                            className={`px-4 py-2 rounded-md transition-colors ${
                                scanMode === 'log' 
                                    ? 'bg-brand-primary text-white' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            {t('dependency_scanner.mode_log', 'ログベース')}
                        </button>
                        <button
                            onClick={() => setScanMode('manual')}
                            className={`px-4 py-2 rounded-md transition-colors ${
                                scanMode === 'manual' 
                                    ? 'bg-brand-primary text-white' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            {t('dependency_scanner.mode_manual', '手動定義から生成')}
                        </button>
                        <button
                            onClick={() => setScanMode('comparison')}
                            className={`px-4 py-2 rounded-md transition-colors ${
                                scanMode === 'comparison' 
                                    ? 'bg-brand-primary text-white' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            {t('dependency_scanner.mode_comparison', '比較モード')}
                        </button>
                    </div>
                    <button onClick={handleScan} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400">
                        {isLoading ? <SpinnerIcon className="w-5 h-5"/> : <i className="fa-solid fa-magnifying-glass-chart w-5 text-center"></i>}
                        {isLoading ? t('dependency_scanner.scanning', 'スキャン中...') : 
                         scanMode === 'log' ? t('dependency_scanner.scan_log', 'ログから依存関係をスキャン') :
                         scanMode === 'manual' ? t('dependency_scanner.scan_manual', '手動定義から依存関係を生成') :
                         t('dependency_scanner.scan_comparison', '手動定義とtool_dependenciesを比較')}
                    </button>
                </div>
                
                <div className="flex-grow overflow-auto">
                    {scanCompleted && scanResult.length > 0 && (
                        <div className="flex justify-end mb-2">
                            <button onClick={handleApproveAll} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                                {t('dependency_scanner.approve_all', 'すべて承認')}
                            </button>
                        </div>
                    )}
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full"><SpinnerIcon className="w-8 h-8 text-brand-primary" /></div>
                    ) : scanCompleted && scanResult.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <p>{t('dependency_scanner.no_dependencies', '未定義または更新が必要な依存関係は見つかりませんでした。')}</p>
                        </div>
                    ) : scanMode === 'comparison' && comparisonResult ? (
                        <div className="space-y-6">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                                <h3 className="font-semibold mb-2">{t('dependency_scanner.only_in_manual', '手動定義のみに存在（移行候補）')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {t('dependency_scanner.only_in_manual_desc', '{count}件の依存関係がtool_dependenciesに未定義です。').replace('{count}', String(comparisonResult.onlyInManual.length))}
                                </p>
                                {comparisonResult.onlyInManual.length > 0 && (
                                    <button onClick={handleApproveAll} className="mt-2 px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                                        {t('dependency_scanner.migrate_all', 'すべてtool_dependenciesに移行')}
                                    </button>
                                )}
                            </div>
                            {comparisonResult.onlyInToolDependencies.length > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                    <h3 className="font-semibold mb-2">{t('dependency_scanner.only_in_tool_deps', 'tool_dependenciesのみに存在')}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('dependency_scanner.only_in_tool_deps_desc', '{count}件の依存関係が手動定義に存在しません。').replace('{count}', String(comparisonResult.onlyInToolDependencies.length))}
                                    </p>
                                </div>
                            )}
                            {comparisonResult.inBoth.length > 0 && (
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                    <h3 className="font-semibold mb-2">{t('dependency_scanner.in_both', '両方に存在（一致）')}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('dependency_scanner.in_both_desc', '{count}件の依存関係が両方で定義されています。').replace('{count}', String(comparisonResult.inBoth.reduce((sum, item) => sum + item.toolDeps.length, 0)))}
                                    </p>
                                </div>
                            )}
                            <table className="min-w-full text-xs">
                                <thead className="sticky top-0 bg-base-200 dark:bg-base-dark-300">
                                    <tr>
                                        <th className="p-2 text-left">{t('dependency_scanner.tool_name', 'ツール名')}</th>
                                        <th className="p-2 text-left">{t('dependency_scanner.table_name', 'テーブル名')}</th>
                                        <th className="p-2 text-left">{t('dependency_scanner.read_fields', '読み込みフィールド')}</th>
                                        <th className="p-2 text-left">{t('dependency_scanner.write_fields', '書き込みフィールド')}</th>
                                        <th className="p-2 text-left">{t('dependency_scanner.load_strategy', '読み込み戦略')}</th>
                                        <th className="p-2 text-center">{t('dependency_scanner.actions', '操作')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scanResult.map((dep, index) => (
                                        <tr key={index} className="border-t border-default dark:border-default-dark">
                                            <td className="p-2 font-semibold">{dep.tool_name}</td>
                                            <td className="p-2 font-mono">{dep.table_name}</td>
                                            <td className="p-2 font-mono truncate max-w-xs" title={dep.read_fields}>{dep.read_fields}</td>
                                            <td className="p-2 font-mono truncate max-w-xs" title={dep.write_fields}>{dep.write_fields}</td>
                                            <td className="p-2 font-mono">{dep.load_strategy}</td>
                                            <td className="p-2 text-center">
                                                <button onClick={() => handleApprove(dep)} className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600">
                                                    <CheckIcon className="w-4 h-4"/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <table className="min-w-full text-xs">
                            <thead className="sticky top-0 bg-base-200 dark:bg-base-dark-300">
                                <tr>
                                    <th className="p-2 text-left">{t('dependency_scanner.tool_name', 'ツール名')}</th>
                                    <th className="p-2 text-left">{t('dependency_scanner.table_name', 'テーブル名')}</th>
                                    <th className="p-2 text-left">{t('dependency_scanner.read_fields', '読み込みフィールド')}</th>
                                    <th className="p-2 text-left">{t('dependency_scanner.write_fields', '書き込みフィールド')}</th>
                                    <th className="p-2 text-left">{t('dependency_scanner.load_strategy', '読み込み戦略')}</th>
                                    <th className="p-2 text-center">{t('dependency_scanner.actions', '操作')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scanResult.map((dep, index) => (
                                    <tr key={index} className="border-t border-default dark:border-default-dark">
                                        <td className="p-2 font-semibold">{dep.tool_name}</td>
                                        <td className="p-2 font-mono">{dep.table_name}</td>
                                        <td className="p-2 font-mono truncate max-w-xs" title={dep.read_fields}>{dep.read_fields}</td>
                                        <td className="p-2 font-mono truncate max-w-xs" title={dep.write_fields}>{dep.write_fields}</td>
                                        <td className="p-2 font-mono">{dep.load_strategy}</td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => handleApprove(dep)} className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600">
                                                <CheckIcon className="w-4 h-4"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ToolDependencyScanner;