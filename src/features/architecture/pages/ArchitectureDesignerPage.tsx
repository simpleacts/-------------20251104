import React, { useState, useCallback } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { generateAiPromptFile, ALL_PROJECT_FILES } from '../services/RefactoringLogic';
import { SpinnerIcon, DownloadIcon, Button } from '@components/atoms';

const ArchitectureDesigner: React.FC = () => {
    const { t } = useTranslation('architecture');
    const [status, setStatus] = useState(t('architecture.ready', '準備完了。ボタンを押してプロンプトを生成してください。'));
    const [isLoading, setIsLoading] = useState(false);

    const handleGeneratePrompt = useCallback(async () => {
        setIsLoading(true);
        setStatus(t('architecture.generating', 'プロンプト生成を開始します...'));
        try {
            await generateAiPromptFile(setStatus);
        } catch (error) {
            setStatus(t('architecture.error', 'エラーが発生しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
        setIsLoading(false);
    }, [t]);

    return (
        <div className="flex flex-col h-full">
            <header className="mb-4">
                <h1 className="text-3xl font-bold">{t('architecture.title', 'ファイルパス一括更新プロンプトジェネレーター')}</h1>
                <p className="text-gray-500 mt-1">{t('architecture.description', 'プロジェクトのファイル構造を解析し、AIにファイルパスの一括更新を指示するためのプロンプトを生成します。')}</p>
            </header>
            <div className="flex items-center justify-between p-2 bg-base-200 dark:bg-base-dark-300 rounded-md mb-2">
                <span className="text-sm font-mono flex-grow truncate">{status}</span>
                <Button onClick={handleGeneratePrompt} disabled={isLoading} size="sm">
                    {isLoading ? <SpinnerIcon className="w-4 h-4 mr-2" /> : <DownloadIcon className="w-4 h-4 mr-2" />}
                    {isLoading ? t('architecture.generating_status', '生成中...') : t('architecture.generate_download', 'プロンプトを生成してダウンロード')}
                </Button>
            </div>
            <div className="flex-grow p-4 border rounded-md overflow-y-auto bg-gray-50 dark:bg-gray-800">
                <h2 className="font-bold text-center">{t('architecture.file_list_title', '現在のプロジェクトファイル一覧')} ({t('architecture.file_count', '{count}件').replace('{count}', String(ALL_PROJECT_FILES.length))})</h2>
                <pre className="text-xs whitespace-pre-wrap mt-4 p-2 bg-white dark:bg-gray-900 rounded">
                    <code>{ALL_PROJECT_FILES.join('\n')}</code>
                </pre>
            </div>
        </div>
    );
};

export default ArchitectureDesigner;
