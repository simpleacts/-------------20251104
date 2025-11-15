import React, { useEffect, useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { Database } from '@shared/types';
import { SpinnerIcon } from '@components/atoms';
import AccountsReceivable from '../components/accounts-receivables/organisms/AccountsReceivable';

const AccountsReceivableTool: React.FC = () => {
    const { t } = useTranslation('accounting');
    const { database, setDatabase } = useDatabase();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!database) {
                setIsLoading(true);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                // Determine required tables for this tool
                const requiredTables = ['quotes', 'customers', 'customer_groups', 'bills'];
                const missingTables = requiredTables.filter(t => !database[t]);
                if (missingTables.length > 0) {
                    const data = await fetchTables(missingTables, { toolName: 'accounts-receivable' });
                    setDatabase(prev => ({...(prev || {}), ...data}));
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : t('accounting.receivable.load_failed', 'データの読み込みに失敗しました。'));
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [database, setDatabase]);

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <SpinnerIcon className="w-12 h-12 mx-auto text-brand-primary" />
                    <p className="mt-4 text-lg font-semibold">{t('accounting.receivable.loading', '売掛管理データを読み込み中...')}</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return <div className="text-red-600 p-4">{error}</div>;
    }

    if (!database || !database.quotes || !database.customers || !database.bills) {
         return <div className="text-gray-500 p-4">{t('accounting.receivable.table_error', '売掛管理に必要なテーブルデータを読み込めませんでした。')}</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">{t('accounting.receivable.title', '売掛管理 (請求)')}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('accounting.receivable.description', '顧客への請求と入金状況を管理します。')}</p>
            </header>
            <div className="flex-grow min-h-0">
                <AccountsReceivable database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />
            </div>
        </div>
    );
};

export default AccountsReceivableTool;
