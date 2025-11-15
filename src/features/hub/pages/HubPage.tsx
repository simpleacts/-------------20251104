import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigation } from '@core/contexts/NavigationContext';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { useTranslation } from '@shared/hooks/useTranslation';
import { EnrichedTask, QuoteTask, Row, TaskMaster } from '@shared/types';
import { SpinnerIcon } from '@components/atoms';
import TaskList from '@features/aitaskmanagement/organisms/TaskList';
import WorkTimerManager from '@features/work-record/organisms/WorkTimerManager';

interface ToolCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    inProgressText?: string;
}

const ToolCard: React.FC<ToolCardProps> = React.memo(({ title, description, icon, onClick, disabled, inProgressText }) => {
    const disabledClasses = "opacity-50 cursor-not-allowed";
    const enabledClasses = "hover:shadow-xl hover:-translate-y-1 transition-all duration-300";

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`group relative p-6 bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-lg text-left w-full ${disabled ? disabledClasses : enabledClasses}`}
        >
            <div className={`text-3xl mb-4 ${disabled ? 'text-gray-400' : 'text-brand-primary'}`}>{icon}</div>
            <h3 className="text-lg font-bold mb-2">{title}</h3>
            <p className="text-sm text-muted dark:text-muted-dark">{description}</p>
            {disabled && inProgressText && <span className="absolute top-2 right-2 text-xs font-bold bg-gray-500 text-white px-2 py-1 rounded-full">{inProgressText}</span>}
        </button>
    );
});


const HubPage: React.FC = () => {
    const { navigate } = useNavigation();
    const { database, setDatabase } = useDatabase();
    const { t } = useTranslation('hub');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!database) {
                setIsLoading(true);
                return;
            }
            setIsLoading(true);
            try {
                const requiredTables = ['quote_tasks', 'quotes', 'customers', 'task_master'];
                const missingTables = requiredTables.filter(t => !database[t]);
                if (missingTables.length > 0) {
                    const data = await fetchTables(missingTables, { toolName: 'hub' });
                    setDatabase(prev => ({...(prev || {}), ...data}));
                }
            } catch (err) {
                console.error("Failed to load task data for hub:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [database]);

    const enrichedTasks: EnrichedTask[] = useMemo(() => {
        if (!database) return [];
        const tasks = (database.quote_tasks?.data as QuoteTask[]) || [];
        const quotesMap = new Map((database.quotes?.data as Row[] || []).map(q => [q.id, q]));
        const customersMap = new Map((database.customers?.data as Row[] || []).map(c => [c.id, c]));
        const taskMasterMap = new Map((database.task_master?.data as TaskMaster[] || []).map(t => [t.id, t]));

        return tasks.map(task => {
            const quote = quotesMap.get(task.quote_id);
            const customer = quote ? customersMap.get(quote.customer_id) : null;
            const taskMaster = taskMasterMap.get(task.task_master_id);

            return {
                ...task,
                customerName: customer?.company_name || customer?.name_kanji || null,
                quoteCode: quote?.quote_code || null,
                taskName: taskMaster?.name || null,
                taskCategory: taskMaster?.category || null,
                quoteSubject: quote?.subject || null,
            };
        });
    }, [database]);

    const handleTimerContainerClick = () => {
        navigate('work-record');
    };
    
    const handleTaskSelect = (taskId: string) => {
        sessionStorage.setItem('selectedAITaskId', taskId);
        navigate('ai-task-management');
    };

    const handleNavigateEstimator = useCallback(() => navigate('estimator'), [navigate]);
    const handleNavigateProofing = useCallback(() => navigate('proofing'), [navigate]);
    const handleNavigateWorksheet = useCallback(() => navigate('worksheet'), [navigate]);

    return (
        <div className="p-4 md:p-8">
            <header className="mb-10">
                <h1 className="text-4xl font-bold">{t('hub.title', 'ダッシュボード')}</h1>
                <p className="text-muted dark:text-muted-dark mt-2">{t('hub.description', '各ツールへアクセスできます。')}</p>
            </header>

            <div className="space-y-12">
                <section>
                    <h2 className="text-2xl font-bold mb-4 border-b pb-2">
                        <i className="fa-solid fa-bolt mr-3 text-yellow-500"></i>
                        {t('hub.current_activity', '現在のアクティビティ')}
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <WorkTimerManager
                            showActiveTimers={true}
                            showControls={false}
                            showRecorder={false}
                            containerAsLink={true}
                            onContainerClick={handleTimerContainerClick}
                        />
                        <div 
                            className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-md hover:shadow-lg transition-all text-left flex flex-col"
                        >
                            <div className="flex justify-between items-center p-4 flex-shrink-0">
                                <h2 className="text-xl font-bold">{t('hub.ai_task_list', 'AIタスク一覧')}</h2>
                                <span className="text-xs text-muted dark:text-muted-dark">{t('hub.click_for_details', 'クリックして詳細表示')}</span>
                            </div>
                            <div className="flex-grow min-h-0 border-t border-default dark:border-default-dark">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-full"><SpinnerIcon className="w-8 h-8"/></div>
                                ) : (
                                    <TaskList 
                                        tasks={enrichedTasks}
                                        selectedTaskId={null}
                                        onSelectTask={handleTaskSelect}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 border-b pb-2">
                        <i className="fa-solid fa-print mr-3 text-brand-secondary"></i>
                        {t('hub.print_business', 'プリント事業')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ToolCard
                            title={t('hub.estimator', '見積作成')}
                            description={t('hub.estimator_description', 'シルクスクリーンやDTFプリントなど、加工を含む詳細な見積を作成します。')}
                            icon={<i className="fa-solid fa-calculator"></i>}
                            onClick={handleNavigateEstimator}
                        />
                         <ToolCard
                            title={t('hub.proofing', '仕上がりイメージ作成')}
                            description={t('hub.proofing_description', 'お客様への提出用の仕上がりイメージを作成・管理します。')}
                            icon={<i className="fa-solid fa-wand-magic-sparkles"></i>}
                            onClick={handleNavigateProofing}
                        />
                        <ToolCard
                            title={t('hub.worksheet', '指示書メーカー')}
                            description={t('hub.worksheet_description', '印刷現場向けの作業指示書やお客様への確認書を生成します。')}
                            icon={<i className="fa-solid fa-clipboard-list"></i>}
                            onClick={handleNavigateWorksheet}
                        />
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4 border-b pb-2">
                        <i className="fa-solid fa-shopping-cart mr-3 text-gray-400"></i>
                        {t('hub.product_sales', '商品販売事業')}
                    </h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ToolCard
                            title={t('hub.product_sales_estimator', '商品販売 見積作成')}
                            description={t('hub.product_sales_estimator_description', 'DTF関連機材や無地Tシャツなど、物品販売用のシンプルな見積を作成します。')}
                            icon={<i className="fa-solid fa-cash-register"></i>}
                            disabled
                            inProgressText={t('hub.in_progress', '作成中')}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
};

export default HubPage;