import React, { useState, useCallback, useMemo } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { getRequiredTablesForPage, ALL_TOOLS } from '@core/config/Routes';
import { getFixSuggestion } from '@shared/services/geminiService';
import { useTranslation } from '@shared/hooks/useTranslation';
import { SpinnerIcon, Button, Select } from '@components/atoms';
import { PageHeader } from '@components/molecules';
import TestItem from '../molecules/TestItem';
import AiSuggestion from '../molecules/AiSuggestion';

type TestStatus = 'pending' | 'running' | 'success' | 'failure';

interface Test {
    id: string;
    name: string;
    description: string;
    action: () => Promise<string | void>;
}

interface TestResult {
    status: TestStatus;
    error?: string;
    suggestion?: { diagnosis: string; suggestion: string } | null;
    isSuggestionLoading?: boolean;
}

const SystemDiagnosticsTool: React.FC = () => {
    const { t } = useTranslation('system-diagnostics');
    const { database } = useDatabase();
    const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
    const [isTesting, setIsTesting] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');
    const [selectedDetailTestId, setSelectedDetailTestId] = useState<string>('');
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    const tests: Test[] = useMemo(() => [
        {
            id: 'apiConnection',
            name: t('diagnostics.test_api_connection', 'APIサーバー接続'),
            description: t('diagnostics.test_api_connection_desc', 'フロントエンドからバックエンドAPI (PHP) への基本的な疎通を確認します。'),
            action: async () => {
                const response = await fetch('/api/get-php-info.php');
                if (!response.ok) {
                    throw new Error(t('diagnostics.api_endpoint_error', 'APIエンドポイントにアクセスできませんでした。ステータス: {status}').replace('{status}', `${response.status} ${response.statusText}`));
                }
                const data = await response.json();
                 if (data.error) {
                    throw new Error(t('diagnostics.api_error', 'APIエラー: {error}').replace('{error}', data.error));
                }
            }
        },
        {
            id: 'dbConnection',
            name: t('diagnostics.test_db_connection', 'データベース接続'),
            description: t('diagnostics.test_db_connection_desc', 'バックエンドAPIからデータベースへの接続を確認します。'),
            action: async () => {
                await fetchTables(['settings'], { toolName: 'system-diagnostics' });
            }
        },
        {
            id: 'phpExtensions',
            name: t('diagnostics.test_php_extensions', '必須PHP拡張機能'),
            description: t('diagnostics.test_php_extensions_desc', 'アプリケーションの動作に必要なPHP拡張機能（pdo_mysql, gd, imapなど）が有効か確認します。'),
            action: async () => {
                const response = await fetch('/api/get-php-info.php');
                const data = await response.json();
                const loadedExtensions = data.loaded_extensions.map((ext: string) => ext.toLowerCase());
                const required = ['pdo_mysql', 'gd', 'imap', 'json', 'mbstring'];
                const missing = required.filter(ext => !loadedExtensions.includes(ext));
                if (missing.length > 0) {
                    throw new Error(t('diagnostics.missing_extensions', '必須のPHP拡張機能が不足しています: {extensions}').replace('{extensions}', missing.join(', ')));
                }
            }
        },
        ...ALL_TOOLS.map(tool => ({
            id: `tool_${tool.name}`,
            name: t('diagnostics.test_tool_data', 'ツールデータ取得: {tool}').replace('{tool}', tool.displayName),
            description: t('diagnostics.test_tool_data_desc', '{tool}ツールが必要とする主要なデータを取得できるか確認します。').replace('{tool}', tool.displayName),
            action: async () => {
                if (!database) throw new Error(t('diagnostics.db_context_error', 'データベースコンテキストが利用できません。'));
                const requiredTables = getRequiredTablesForPage(tool.name, undefined, database);
                if (requiredTables.length > 0) {
                    await fetchTables(requiredTables, { toolName: tool.name });
                }
            }
        }))
    ], [database, t]);

    const runAllTests = useCallback(async () => {
        setIsTesting(true);
        setExpandedItems(new Set());
        const initialResults: Record<string, TestResult> = {};
        tests.forEach(t => initialResults[t.id] = { status: 'pending' });
        setTestResults(initialResults);

        for (const test of tests) {
            setTestResults(prev => ({ ...prev, [test.id]: { status: 'running' } }));
            try {
                await test.action();
                setTestResults(prev => ({ ...prev, [test.id]: { status: 'success' } }));
            } catch (e) {
                const error = e instanceof Error ? e.message : String(e);
                setTestResults(prev => ({ ...prev, [test.id]: { status: 'failure', error } }));
            }
        }
        setIsTesting(false);
    }, [tests]);
    
    const getAiSuggestion = async (testId: string) => {
        const result = testResults[testId];
        if (!result || !result.error) return;

        const test = tests.find(t => t.id === testId);
        if (!test) return;

        setTestResults(prev => ({ ...prev, [testId]: { ...result, isSuggestionLoading: true, suggestion: null } }));
        try {
            const suggestion = await getFixSuggestion(test.name, result.error);
            setTestResults(prev => ({ ...prev, [testId]: { ...result, isSuggestionLoading: false, suggestion } }));
        } catch (e) {
            setTestResults(prev => ({ ...prev, [testId]: { ...result, isSuggestionLoading: false, suggestion: { diagnosis: t('diagnostics.ai_diagnosis_failed', 'AIによる診断に失敗しました。'), suggestion: (e as Error).message } } }));
        }
    };
    
    const toggleExpansion = (testId: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(testId)) {
                newSet.delete(testId);
            } else {
                newSet.add(testId);
            }
            return newSet;
        });
    };

    const selectedTestForDetails = useMemo(() => {
        if (!selectedDetailTestId) return null;
        return tests.find(t => t.id === selectedDetailTestId);
    }, [selectedDetailTestId, tests]);

    const getTabClass = (tabName: string) => `py-2 px-4 text-sm font-medium rounded-t-lg ${activeTab === tabName ? 'bg-base-100 dark:bg-base-dark-200 border-b-0' : 'bg-base-200 dark:bg-base-dark-300 hover:bg-base-100/50'}`;

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title={t('diagnostics.title', 'システム診断')}
                description={t('diagnostics.description', 'アプリケーションの接続性や健全性を診断し、問題の特定を支援します。')}
            >
                <Button onClick={runAllTests} disabled={isTesting}>
                    {isTesting ? <SpinnerIcon className="w-5 h-5 mr-2" /> : <i className="fa-solid fa-play w-5 text-center mr-2"></i>}
                    {isTesting ? t('diagnostics.running', '診断中...') : t('diagnostics.run_all', 'すべての診断を実行')}
                </Button>
            </PageHeader>
            
            <div className="mt-4 border-b border-default">
                <nav className="flex space-x-2">
                    <button onClick={() => setActiveTab('overview')} className={getTabClass('overview')}>{t('diagnostics.tab_overview', '概要')}</button>
                    <button onClick={() => setActiveTab('details')} className={getTabClass('details')}>{t('diagnostics.tab_details', '詳細結果')}</button>
                </nav>
            </div>

            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-b-lg shadow-md overflow-y-auto">
                {activeTab === 'overview' && (
                    <div className="space-y-3">
                        {tests.map(test => (
                            <TestItem 
                                key={test.id} 
                                test={test} 
                                result={testResults[test.id]} 
                                onGetSuggestion={() => getAiSuggestion(test.id)}
                                isExpanded={expandedItems.has(test.id)}
                                onToggle={() => toggleExpansion(test.id)}
                            >
                                {testResults[test.id]?.suggestion && <AiSuggestion suggestion={testResults[test.id].suggestion!} />}
                            </TestItem>
                        ))}
                    </div>
                )}
                {activeTab === 'details' && (
                    <div>
                        <Select value={selectedDetailTestId} onChange={e => setSelectedDetailTestId(e.target.value)} className="mb-4">
                            <option value="">{t('diagnostics.select_test', '診断項目を選択してください...')}</option>
                            {tests.map(test => (
                                <option key={test.id} value={test.id}>{test.name}</option>
                            ))}
                        </Select>
                        {selectedTestForDetails && (
                            <TestItem
                                test={selectedTestForDetails}
                                result={testResults[selectedTestForDetails.id]}
                                onGetSuggestion={() => getAiSuggestion(selectedTestForDetails.id)}
                                isExpanded={true}
                                onToggle={() => {}}
                            >
                                {testResults[selectedTestForDetails.id]?.suggestion && <AiSuggestion suggestion={testResults[selectedTestForDetails.id].suggestion!} />}
                            </TestItem>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemDiagnosticsTool;
