import React, { useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database } from '@shared/types';
import SaveChangesToCsvModal from '@shared/modals/SaveChangesToCsvModal';
import AppModeSettings from '../organisms/AppModeSettings';
import CacheManagement from '../organisms/CacheManagement';
import CsvRewriteSettings from '../organisms/CsvRewriteSettings';
import { AppMode } from '@core/types/appMode';

interface DevToolsProps {
    appMode: AppMode;
    setAppMode: (mode: AppMode) => void;
    database: Database | null;
}

const DevTools: React.FC<DevToolsProps> = ({ appMode, setAppMode, database }) => {
    const { t } = useTranslation('dev-tools');
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

    return (
        <>
            <div>
                <header className="mb-6">
                    <h1 className="text-3xl font-bold">{t('dev_tools.title', '開発ツール')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('dev_tools.description', 'アプリケーションの動作モードや設定を変更します。')}</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AppModeSettings appMode={appMode} setAppMode={setAppMode} />
                    <CsvRewriteSettings appMode={appMode} onOpenPromptModal={() => setIsPromptModalOpen(true)} />
                    <CacheManagement />
                </div>
            </div>
            
            {database && (
                <SaveChangesToCsvModal
                    isOpen={isPromptModalOpen}
                    onClose={() => setIsPromptModalOpen(false)}
                    database={database as Database}
                />
            )}
        </>
    );
};

export default DevTools;
