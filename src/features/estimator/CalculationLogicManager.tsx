

import React, { lazy, useEffect, useState } from 'react';
// FIX: Corrected import path.
import { getRequiredTablesForPage } from '../../core/config/Routes';
import { useDatabase } from '../../core/contexts/DatabaseContext';
import { fetchTables } from '../../core/data/db.live';
// Fixed type import path below, adjust as appropriate:
import type { AppData, Database } from '../../shared/types';
import { SpinnerIcon } from '../../shared/ui/atoms/icons';
import transformDatabaseToAppData from '../../shared/utils/estimatorDataTransformer';

const SilkscreenLogicTool = lazy(() => import('../silkscreen/pages/SilkscreenLogicPage'));
const DtfLogicTool = lazy(() => import('../dtf/pages/DtfLogicPage'));
// FIX: Corrected import path for ShippingLogicTool.
const ShippingLogicTool = lazy(() => import('../pricing-management/pages/ShippingLogicToolPage'));

const CalculationLogicManager: React.FC = () => {
    const { database, setDatabase } = useDatabase();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [appData, setAppData] = useState<AppData | null>(null);

    const [activeTab, setActiveTab] = useState('silkscreen');
    
    useEffect(() => {
        const requiredTables = getRequiredTablesForPage('estimator', undefined, database); // Calculation logic needs same data as estimator
        
        const loadNeededData = async () => {
            if (!database) {
                setIsLoading(true);
                return;
            };

            const missingTables = requiredTables.filter(t => !database[t]);

            if (missingTables.length > 0) {
                setIsLoading(true);
                try {
                    const newData = await fetchTables(missingTables, { toolName: 'calculation-logic-manager' });
                    setDatabase(prev => ({ ...prev, ...newData }));
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました。');
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };
        loadNeededData();
    }, [database, setDatabase]);
    
    useEffect(() => {
        if (!isLoading && database) {
            const requiredTables = getRequiredTablesForPage('estimator', undefined, database);
            const allTablesPresent = requiredTables.every(t => database[t]);
            if (allTablesPresent) {
                const transformedData = transformDatabaseToAppData(database as Database);
                setAppData(transformedData);
            } else {
                // This might indicate that not all required tables were fetched, which could be a configuration issue.
                // For now, we'll let it be handled by the loading/error state.
            }
        }
    }, [database, isLoading]);

    if (isLoading || !appData) {
        return <div className="flex h-full items-center justify-center"><SpinnerIcon className="w-8 h-8"/></div>;
    }
    if (error) {
        return <div className="text-red-500 p-4">{error}</div>;
    }
    
    return (
        <div className="flex flex-col h-full">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">計算ロジック管理</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">アプリケーション内の計算ロジックを可視化・調整します。</p>
            </header>

            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('silkscreen')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'silkscreen' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>シルクスクリーン</button>
                    <button onClick={() => setActiveTab('dtf')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'dtf' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>DTF</button>
                    <button onClick={() => setActiveTab('shipping')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'shipping' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>送料</button>
                </nav>
            </div>
            
            <div className="flex-grow">
                {activeTab === 'silkscreen' && <SilkscreenLogicTool appData={appData} database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />}
                {activeTab === 'dtf' && <DtfLogicTool appData={appData} database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />}
                {activeTab === 'shipping' && <ShippingLogicTool appData={appData} database={database as Database} setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>} />}
            </div>
        </div>
    );
};

export default CalculationLogicManager;