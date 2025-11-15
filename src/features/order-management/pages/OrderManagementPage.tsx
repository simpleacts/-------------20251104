import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, QuoteTask, Row, TaskMaster } from '@shared/types';
import { EnrichedQuote } from '../types';
import { Page } from '@core/config/Routes';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { fetchTables } from '@core/data/db.live';
import { updateDatabase, updateDatabaseWithNewData } from '@core/utils';
import { isManufacturerDependentTable } from '@core/config/tableNames';
import { SpinnerIcon } from '@components/atoms';
import DataTable from '@components/organisms/DataTable';
import TaskAssignmentModal from '@features/task-settings/modals/TaskAssignmentModal';
import EditQuoteModal from '../modals/EditQuoteModal';
import OrderDetailsModal from '../modals/OrderDetailsModal';

import CompletionFlowTool from '../organisms/CompletionFlowTool';
import ProductionFlowTool from '../organisms/ProductionFlowTool';
import SalesFlowTool from '../organisms/SalesFlowTool';

interface OrderManagementToolProps {
    onNavigate: (page: Page, table?: string) => void;
}

type KanbanView = 'sales' | 'production' | 'completion';
type ActiveView = 'kanban' | 'history';

const OrderManagementTool: React.FC<OrderManagementToolProps> = ({ onNavigate }) => {
    const { t } = useTranslation('order-management');
    const { database, setDatabase, logDataAccess } = useDatabase();
    const { currentPage } = useNavigation();
    const [localDatabase, setLocalDatabase] = useState<Partial<Database> | null>(database);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [detailsQuote, setDetailsQuote] = useState<EnrichedQuote | null>(null);
    const [editingQuote, setEditingQuote] = useState<Row | null>(null);
    const [currentKanbanView, setCurrentKanbanView] = useState<KanbanView>('production');
    const [isTaskAssignmentModalOpen, setIsTaskAssignmentModalOpen] = useState(false);
    const [assignmentData, setAssignmentData] = useState<{ quote: EnrichedQuote; initialTaskIds: Set<string> } | null>(null);
    const [activeView, setActiveView] = useState<ActiveView>('kanban');
    const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());
    const [draggedQuote, setDraggedQuote] = useState<EnrichedQuote | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollAnimationRef = useRef<number | null>(null);
    const scrollSpeedRef = useRef<number>(0);

    const scrollLoop = useCallback(() => {
        if (scrollSpeedRef.current !== 0 && scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft += scrollSpeedRef.current;
            scrollAnimationRef.current = requestAnimationFrame(scrollLoop);
        } else {
            if (scrollAnimationRef.current) {
                cancelAnimationFrame(scrollAnimationRef.current);
                scrollAnimationRef.current = null;
            }
        }
    }, []);

    const stopScrolling = useCallback(() => {
        scrollSpeedRef.current = 0;
        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = null;
        }
    }, []);

    const handleDragOverContainer = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const rect = container.getBoundingClientRect();
        const clientX = e.clientX;
        
        const SCROLL_AREA_WIDTH = 150;
        const MAX_SPEED = 20;

        let newSpeed = 0;

        if (clientX < rect.left + SCROLL_AREA_WIDTH) {
            const distanceFromEdge = Math.max(0, clientX - rect.left);
            const speedFactor = 1 - (distanceFromEdge / SCROLL_AREA_WIDTH);
            newSpeed = -MAX_SPEED * Math.pow(speedFactor, 2);
        } else if (clientX > rect.right - SCROLL_AREA_WIDTH) {
            const distanceFromEdge = Math.max(0, rect.right - clientX);
            const speedFactor = 1 - (distanceFromEdge / SCROLL_AREA_WIDTH);
            newSpeed = MAX_SPEED * Math.pow(speedFactor, 2);
        }
        
        scrollSpeedRef.current = newSpeed;

        if (newSpeed !== 0 && !scrollAnimationRef.current) {
            scrollAnimationRef.current = requestAnimationFrame(scrollLoop);
        }
    }, [scrollLoop]);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            const requiredTables = [
                'quotes', 'customers', 'quote_items', 'quote_tasks', 'task_master', 'quote_designs', 
                'quote_history', 'quote_status_master', 'payment_status_master', 'production_status_master', 
                'shipping_status_master', 'data_confirmation_status_master', 'shipping_carriers', 'google_api_settings',
                'stock', 'brands', 'print_locations',
                // 注意: products_master, product_detailsは削除済み（stockテーブルから取得） 
                'customer_groups', 'print_history', 'print_history_positions', 'print_history_images',
                'company_info', 'pdf_templates', 'pdf_item_display_configs'
            ];
            logDataAccess('order-management', requiredTables);
            
            try {
                const missingTables = requiredTables.filter(t => !database?.[t]);
                if (missingTables.length > 0) {
                    const data = await fetchTables(missingTables, { toolName: 'order-management' });
                    setDatabase(prev => updateDatabaseWithNewData(prev, data));
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : t('order.load_failed', 'データの読み込みに失敗しました。'));
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
      setLocalDatabase(database);
    }, [database]);

    const areTablesReady = useMemo(() => {
        if (!localDatabase) return false;
        const requiredTables = ['quotes', 'customers', 'quote_items', 'quote_tasks', 'task_master', 'quote_status_master', 'production_status_master', 'data_confirmation_status_master'];
        return requiredTables.every(t => localDatabase[t]);
    }, [localDatabase]);

    const VIEWS = useMemo(() => {
        if (!areTablesReady || !localDatabase?.quote_status_master || !localDatabase?.production_status_master || !localDatabase?.data_confirmation_status_master) {
            return [];
        }
        const sortMaster = (a: Row, b: Row) => (a.sort_order as number) - (b.sort_order as number);

        const quoteStatuses = [...(localDatabase.quote_status_master.data as Row[])].sort(sortMaster);
        const prodStatuses = [...(localDatabase.production_status_master.data as Row[])].sort(sortMaster);
        const dataConfirmStatuses = [...(localDatabase.data_confirmation_status_master.data as Row[])].sort(sortMaster);

        const hardcodedSalesOrder = [
            t('order.status_inquiry', '問い合わせ／下書き'),
            t('order.status_estimate', '見積提出'),
            t('order.status_confirmation', '確認依頼中'),
            t('order.status_revision', '要修正'),
            t('order.status_ordered', '受注'),
            t('order.status_invoiced', '請求書発行'),
            t('order.status_paid', '入金確認済・受注確定')
        ];
        
        const dynamicSalesStatuses = new Set([
            ...quoteStatuses.filter(s => [t('order.status_inquiry', '問い合わせ／下書き'), t('order.status_estimate', '見積提出'), t('order.status_ordered', '受注'), t('order.status_invoiced', '請求書発行')].includes(s.value as string)).map(s => s.value as string),
            ...dataConfirmStatuses.filter(s => [t('order.status_confirmation', '確認依頼中'), t('order.status_revision', '要修正')].includes(s.value as string)).map(s => s.value as string),
            t('order.status_paid', '入金確認済・受注確定')
        ]);

        const salesColumns = hardcodedSalesOrder.filter(c => dynamicSalesStatuses.has(c));

        const productionColumns = prodStatuses
            .filter(s => s.value !== t('order.status_shipped', '発送済'))
            .map(s => s.value as string);

        const completionColumns = [
            ...prodStatuses.filter(s => s.value === t('order.status_shipped', '発送済')).map(s => s.value as string),
            ...quoteStatuses.filter(s => [t('order.status_delivered', '納品完了'), t('order.status_completed', '完了')].includes(s.value as string)).map(s => s.value as string)
        ].flat();
        
        return [
            { id: 'sales' as KanbanView, label: t('order.flow_sales', '商談フロー'), columns: salesColumns },
            { id: 'production' as KanbanView, label: t('order.flow_production', '製作フロー'), columns: productionColumns },
            { id: 'completion' as KanbanView, label: t('order.flow_completion', '完了・経理フロー'), columns: completionColumns },
        ];
    }, [localDatabase, areTablesReady, t]);
    
    const taskMasterMap = useMemo(() => new Map((localDatabase?.task_master?.data as TaskMaster[] || []).map(t => [t.id, t])), [localDatabase?.task_master]);

    const enrichedQuotes: EnrichedQuote[] = useMemo(() => {
        if (!areTablesReady || !localDatabase || !localDatabase.quotes || !localDatabase.customers || !localDatabase.quote_items || !localDatabase.quote_tasks) return [];
        
        const customerMap = new Map(localDatabase.customers.data.map(c => [c.id, c]));
        const itemsMap = (localDatabase.quote_items.data || []).reduce((acc, item) => {
            const quoteId = item.quote_id as string;
            if (!acc[quoteId]) acc[quoteId] = [];
            acc[quoteId].push(item);
            return acc;
        }, {} as Record<string, Row[]>);
         const tasksMap = (localDatabase.quote_tasks.data || []).reduce((acc, task) => {
            const quoteId = task.quote_id as string;
            if (!acc[quoteId]) acc[quoteId] = [];
            acc[quoteId].push(task);
            return acc;
        }, {} as Record<string, Row[]>);

        return (localDatabase.quotes.data || [])
            .filter(
                quote =>
                    ![t('order.status_lost', '失注'), t('order.status_cancelled', 'キャンセル')].includes(
                        String(quote.quote_status).trim()
                    )
            )
            .map((quote): EnrichedQuote => ({
                // Spread all fields of quote (should match base structure)
                ...quote,
                customer: customerMap.get(quote.customer_id as string) || null,
                items: itemsMap[quote.id as string] || [],
                tasks: (tasksMap[quote.id as string] as QuoteTask[]) || [],
                proofingImage: null,
                product: null,
                id: String(quote.id),
            }))
            .sort(
                (a, b) =>
                    new Date(String(a.ordered_at) || String(a.created_at)).getTime() -
                    new Date(String(b.ordered_at) || String(b.created_at)).getTime()
            );
    }, [
        areTablesReady,
        localDatabase?.quotes?.data,
        localDatabase?.customers?.data,
        localDatabase?.quote_items?.data,
        localDatabase?.quote_tasks?.data,
    ]);
    
    const kanbanQuotes = useMemo(() => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        return enrichedQuotes.filter(quote => {
            if (String(quote.quote_status).trim() === t('order.status_completed', '完了')) {
                const updatedAt = new Date(quote.updated_at as string);
                return updatedAt >= oneWeekAgo;
            }
            return true;
        });
    }, [enrichedQuotes, t]);

    const historyQuotes = useMemo(() => {
        return enrichedQuotes
            .filter(quote => String(quote.quote_status).trim() === t('order.status_completed', '完了'))
            .sort((a, b) => new Date(b.updated_at as string).getTime() - new Date(a.updated_at as string).getTime());
    }, [enrichedQuotes, t]);
    
    const salesStatuses = VIEWS.find(v => v.id === 'sales')?.columns || [];
    const productionStatuses = VIEWS.find(v => v.id === 'production')?.columns || [];
    const completionStatuses = VIEWS.find(v => v.id === 'completion')?.columns || [];

    const getColumnForQuote = useCallback((quote: EnrichedQuote) => {
        const quote_status = String(quote.quote_status || '').trim();
        const production_status = String(quote.production_status || '').trim();
        const data_confirmation_status = String(quote.data_confirmation_status || '').trim();
        
        // Priority 1: Data confirmation statuses in sales flow
        if ([t('order.status_confirmation', '確認依頼中'), t('order.status_revision', '要修正')].includes(data_confirmation_status)) {
            return data_confirmation_status;
        }

        // Priority 2: Virtual combined sales status
        if ([t('order.status_payment_confirmed', '入金確認済'), t('order.status_order_confirmed', '受注確定')].includes(quote_status)) {
            return t('order.status_paid', '入金確認済・受注確定');
        }
        
        // Priority 3: Completion flow statuses (from both production and quote status)
        if (completionStatuses.includes(production_status)) {
            return production_status;
        }
        if (completionStatuses.includes(quote_status)) {
            return quote_status;
        }

        // Priority 4: Production flow statuses
        if (productionStatuses.includes(production_status)) {
            return production_status;
        }
        
        // Priority 5: Other sales flow statuses
        if (salesStatuses.includes(quote_status)) {
            return quote_status;
        }
        
        // Fallback
        return salesStatuses[0] || t('order.status_inquiry', '問い合わせ／下書き');
    }, [salesStatuses, productionStatuses, completionStatuses, t]);

    const handleDragStart = (e: React.DragEvent, quote: EnrichedQuote) => {
        e.dataTransfer.setData('quoteId', quote.id as string);
        setDraggedQuote(quote);
    };

    const handleDragEnd = () => {
        setDraggedQuote(null);
        stopScrolling();
    };
    
    const updateDatabases = useCallback((updater: (db: Partial<Database> | null) => Partial<Database> | null) => {
        setDatabase(updater);
        setLocalDatabase(updater as any);
    }, [setDatabase]);


    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        stopScrolling();
        const quoteId = e.dataTransfer.getData('quoteId');
        if (!quoteId || !draggedQuote) return;

        let statusFieldToUpdate: keyof Row | null = null;
        let finalStatus = newStatus;

            if (newStatus === t('order.status_paid', '入金確認済・受注確定')) {
            statusFieldToUpdate = 'quote_status';
            finalStatus = t('order.status_payment_confirmed', '入金確認済'); // Default to one of the two
        } else if (salesStatuses.includes(newStatus)) {
             statusFieldToUpdate = 'quote_status';
        } else if (productionStatuses.includes(newStatus)) {
             statusFieldToUpdate = 'production_status';
        } else if (completionStatuses.includes(newStatus)) {
            if (newStatus === t('order.status_shipped', '発送済')) {
                 statusFieldToUpdate = 'production_status';
            } else {
                 statusFieldToUpdate = 'quote_status';
            }
        } else if ([t('order.status_confirmation', '確認依頼中'), t('order.status_revision', '要修正')].includes(newStatus)) {
            statusFieldToUpdate = 'data_confirmation_status';
        }
        
        if (statusFieldToUpdate) {
            // まずローカル状態を更新
            const updater = (db: Partial<Database> | null): Partial<Database> | null => {
                if (!db) return null;
                const newDb = JSON.parse(JSON.stringify(db));
                const quoteIndex = newDb.quotes.data.findIndex((q:Row) => q.id === quoteId);
                if (quoteIndex > -1) {
                    newDb.quotes.data[quoteIndex][statusFieldToUpdate!] = finalStatus;
                    newDb.quotes.data[quoteIndex].updated_at = new Date().toISOString();
                }
                return newDb;
            };
            updateDatabases(updater);

            // サーバーに保存
            try {
                if (!database) return;
                const quote = (database.quotes?.data || []).find((q: Row) => q.id === quoteId);
                if (!quote) return;

                const updatedQuote = { ...quote, [statusFieldToUpdate!]: finalStatus, updated_at: new Date().toISOString() };
                const operation = [{
                    type: 'UPDATE' as const,
                    data: updatedQuote,
                    where: { id: quoteId }
                }];
                const result = await updateDatabase(currentPage, 'quotes', operation, database);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to update quote status to server');
                }
            } catch (error) {
                console.error('[OrderManagement] Failed to update status to server:', error);
                alert(t('order.update_failed', 'サーバーへの更新に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
            }
        }
    };
    
    const handleModalDatabaseUpdate = useCallback((updater: React.SetStateAction<Partial<Database> | null>) => {
        updateDatabases(updater as any);
    }, [updateDatabases]);

    const toggleColumnExpansion = (columnName: string) => {
        setExpandedColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(columnName)) {
                newSet.delete(columnName);
            } else {
                newSet.add(columnName);
            }
            return newSet;
        });
    };

    const handleDuplicateAndNavigate = (quoteToDuplicate: EnrichedQuote) => {
        const designs = localDatabase?.quote_designs?.data.filter(d => d.quote_id === quoteToDuplicate.id) || [];
        
        const dataForEstimator = {
            customerInfo: quoteToDuplicate.customer,
            processingGroups: [{
                id: `group_${Date.now()}`,
                name: '加工グループ1',
                items: quoteToDuplicate.items,
                printDesigns: designs,
                selectedOptions: [], // Options are not duplicated for simplicity
            }],
            originalEstimateId: quoteToDuplicate.id
        };

        sessionStorage.setItem('quoteToDuplicate', JSON.stringify(dataForEstimator));
        onNavigate('estimator');
    };

    const handleDeleteQuote = useCallback((quoteId: string) => {
        const quoteToDelete = enrichedQuotes.find(q => q.id === quoteId);
        if (!quoteToDelete) return;
    
        if (window.confirm(t('order.delete_confirm', '案件「{code}」を削除しますか？関連するすべてのデータ（明細、デザイン、履歴、タスク）も削除されます。この操作は元に戻せません。').replace('{code}', quoteToDelete.quote_code || ''))) {
            const updater = (db: Partial<Database> | null): Partial<Database> | null => {
                if (!db) return null;
                const newDb = JSON.parse(JSON.stringify(db));
                newDb.quotes.data = newDb.quotes.data.filter((q: Row) => q.id !== quoteId);
                newDb.quote_items.data = newDb.quote_items.data.filter((i: Row) => i.quote_id !== quoteId);
                newDb.quote_designs.data = newDb.quote_designs.data.filter((d: Row) => d.quote_id !== quoteId);
                newDb.quote_history.data = newDb.quote_history.data.filter((h: Row) => h.quote_id !== quoteId);
                if (newDb.quote_tasks) {
                    newDb.quote_tasks.data = newDb.quote_tasks.data.filter((t: Row) => t.quote_id !== quoteId);
                }
                return newDb;
            };
            updateDatabases(updater);
        }
    }, [enrichedQuotes, updateDatabases]);

    const handleOpenTaskAssignmentModal = useCallback((quote: EnrichedQuote) => {
        // FIX: Explicitly set the type of the Set to string.
        const initialTaskIds = new Set<string>(quote.tasks.map(t => t.task_master_id as string));
        setAssignmentData({ quote, initialTaskIds });
        setIsTaskAssignmentModalOpen(true);
    }, []);

    const handleSaveTasks = useCallback(async (quoteId: string, taskIds: string[]) => {
        // まずローカル状態を更新
        updateDatabases(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            
            // Remove old tasks for this quote
            newDb.quote_tasks.data = newDb.quote_tasks.data.filter((t: QuoteTask) => t.quote_id !== quoteId);

            // Add new tasks
            taskIds.forEach(taskId => {
                const newTask: QuoteTask = {
                    id: `qt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    quote_id: quoteId,
                    task_master_id: taskId,
                    status: 'pending',
                    completed_at: null,
                    due_date: null,
                    assignee_id: null,
                };
                newDb.quote_tasks.data.push(newTask);
            });
            return newDb;
        });

        // サーバーに保存
        try {
            if (!database) return;
            
            // 既存のタスクを削除
            const existingTasks = (database.quote_tasks?.data || []).filter((t: Row) => t.quote_id === quoteId);
            if (existingTasks.length > 0) {
                const deleteOperations = existingTasks.map((t: Row) => ({
                    type: 'DELETE' as const,
                    where: { id: t.id }
                }));
                await updateDatabase(currentPage, 'quote_tasks', deleteOperations, database);
            }

            // 新しいタスクを追加
            const newTasks = taskIds.map(taskId => ({
                id: `qt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                quote_id: quoteId,
                task_master_id: taskId,
                status: 'pending',
                completed_at: null,
                due_date: null,
                assignee_id: null,
            }));
            if (newTasks.length > 0) {
                const insertOperations = newTasks.map(task => ({
                    type: 'INSERT' as const,
                    data: task
                }));
                await updateDatabase(currentPage, 'quote_tasks', insertOperations, database);
            }
        } catch (error) {
            console.error('[OrderManagement] Failed to save tasks to server:', error);
            alert(t('order.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }

        setIsTaskAssignmentModalOpen(false);
    }, [updateDatabases, database, currentPage, t]);
    
    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <SpinnerIcon className="w-12 h-12 mx-auto text-brand-primary" />
                    <p className="mt-4 text-lg font-semibold">{t('order.loading', '業務管理データを読み込み中...')}</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return <div className="text-red-600 p-4">{error}</div>;
    }

    if (!areTablesReady || !localDatabase) {
        return <div className="text-gray-500 p-4">{t('order.table_not_ready', '必要なテーブルデータの読み込みが完了していません。')}</div>;
    }

    const flowProps = {
        kanbanQuotes,
        database: localDatabase,
        onDetailsClick: setDetailsQuote,
        onDragStart: handleDragStart,
        onDragEnd: handleDragEnd,
        onDrop: handleDrop,
        expandedColumns,
        toggleColumnExpansion,
        taskMasterMap,
        getColumnForQuote
    };

    return (
        <>
            <div className="flex flex-col h-full">
                <header className="mb-4 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">{t('order.title', '業務管理')}</h1>
                        <div className="flex items-center gap-2">
                             <div className="flex items-center p-1 bg-base-200 dark:bg-base-dark-300 rounded-lg">
                                <button onClick={() => setActiveView('kanban')} className={`px-3 py-1.5 text-sm font-semibold rounded-md ${activeView === 'kanban' ? 'bg-container-bg dark:bg-container-bg-dark shadow' : ''}`}>{t('order.view_kanban', 'カンバン')}</button>
                                <button onClick={() => setActiveView('history')} className={`px-3 py-1.5 text-sm font-semibold rounded-md ${activeView === 'history' ? 'bg-container-bg dark:bg-container-bg-dark shadow' : ''}`}>{t('order.view_history', '完了履歴')}</button>
                             </div>
                        </div>
                    </div>
                </header>

                {activeView === 'kanban' ? (
                    <div className="flex-grow flex flex-col min-h-0 bg-container-bg dark:bg-container-bg-dark p-4 rounded-lg shadow-md">
                        <div className="flex-shrink-0 border-b border-default mb-2">
                            <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                                {VIEWS.map(view => (
                                    <button
                                        key={view.id}
                                        onClick={() => setCurrentKanbanView(view.id)}
                                        className={`${currentKanbanView === view.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted hover:text-base-content'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                                    >
                                        {view.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                        {/* FIX: Pass calculated columns to child components. */}
                        <div className="flex-grow flex overflow-x-auto gap-4 pt-2" ref={scrollContainerRef} onDragOver={handleDragOverContainer}>
                            {currentKanbanView === 'sales' && <SalesFlowTool {...flowProps} columns={salesStatuses} />}
                            {currentKanbanView === 'production' && <ProductionFlowTool {...flowProps} columns={productionStatuses} />}
                            {currentKanbanView === 'completion' && <CompletionFlowTool {...flowProps} columns={completionStatuses} />}
                        </div>
                    </div>
                ) : (
                     <div className="flex-grow bg-container-bg dark:bg-container-bg-dark p-4 rounded-lg shadow-md overflow-hidden">
                        <DataTable
                           schema={localDatabase.quotes?.schema || []}
                           data={historyQuotes}
                           tableName="quotes"
                           onUpdateRow={() => {}} 
                           onDeleteRow={(rowIndex) => {
                               const quoteToDelete = historyQuotes[rowIndex];
                               if (quoteToDelete) {
                                   handleDeleteQuote(quoteToDelete.id as string);
                               }
                           }}
                           skipDeleteConfirm={true}
                           permissions={{}}
                           customerGroups={localDatabase.customer_groups?.data}
                        />
                     </div>
                )}
            </div>
            
            {detailsQuote && (
                <OrderDetailsModal
                    quote={detailsQuote}
                    database={localDatabase}
                    onClose={() => setDetailsQuote(null)}
                    onEdit={(quote) => {
                        setDetailsQuote(null);
                        setEditingQuote(quote);
                    }}
                    onDuplicate={handleDuplicateAndNavigate}
                    setDatabase={handleModalDatabaseUpdate as any}
                    onOpenTaskAssignment={handleOpenTaskAssignmentModal}
                />
            )}
            {editingQuote && (
                <EditQuoteModal
                    isOpen={!!editingQuote}
                    onClose={() => setEditingQuote(null)}
                    quoteData={editingQuote}
                    onSave={async (updatedData: Row, isNew: boolean) => {
                        const quoteId = isNew ? `quote_${Date.now()}` : updatedData.id as string;
                        
                        // まずローカル状態を更新
                        updateDatabases(db => {
                            if (!db) return null;
                            const newDb = JSON.parse(JSON.stringify(db));
                            const quoteIndex = newDb.quotes.data.findIndex((q: Row) => q.id === quoteId);
                            if (quoteIndex > -1) {
                                newDb.quotes.data[quoteIndex] = { ...newDb.quotes.data[quoteIndex], ...updatedData, id: quoteId };
                            } else {
                                newDb.quotes.data.push({ ...updatedData, id: quoteId });
                            }
                            return newDb;
                        });

                        // サーバーに保存
                        try {
                            if (!database) return;
                            const operation = isNew
                                ? [{ type: 'INSERT' as const, data: { ...updatedData, id: quoteId } }]
                                : [{ type: 'UPDATE' as const, data: updatedData, where: { id: quoteId } }];
                            
                            const result = await updateDatabase(currentPage, 'quotes', operation, database);
                            if (!result.success) {
                                throw new Error(result.error || 'Failed to save quote to server');
                            }
                            setEditingQuote(null);
                        } catch (error) {
                            console.error('[OrderManagement] Failed to save quote to server:', error);
                            alert(t('order.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
                        }
                    }}
                    customers={localDatabase.customers?.data || []}
                    schema={localDatabase.quotes?.schema || []}
                    statusOptions={{
                        quote_status: localDatabase.quote_status_master?.data.map(r => r.value as string) || [],
                        production_status: localDatabase.production_status_master?.data.map(r => r.value as string) || [],
                        payment_status: localDatabase.payment_status_master?.data.map(r => r.value as string) || [],
                        shipping_status: localDatabase.shipping_status_master?.data.map(r => r.value as string) || [],
                        data_confirmation_status: localDatabase.data_confirmation_status_master?.data.map(r => r.value as string) || [],
                    }}
                    shippingCarriers={localDatabase.shipping_carriers?.data || []}
                />
            )}
            {isTaskAssignmentModalOpen && assignmentData && (
                <TaskAssignmentModal
                    isOpen={isTaskAssignmentModalOpen}
                    onClose={() => setIsTaskAssignmentModalOpen(false)}
                    onSave={handleSaveTasks}
                    allTasks={localDatabase?.task_master?.data as TaskMaster[] || []}
                    initialSelectedTaskIds={assignmentData.initialTaskIds}
                    quoteId={assignmentData.quote.id as string}
                    quoteCode={assignmentData.quote.quote_code as string}
                />
            )}
        </>
    );
};

export default OrderManagementTool;