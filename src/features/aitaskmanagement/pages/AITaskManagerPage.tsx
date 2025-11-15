import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { EnrichedTask, QuoteTask, Row, TaskMaster, ValidationIssue } from '@shared/types';
import { CheckIcon, XMarkIcon } from '@components/atoms';
import { useWorkTimer as useSharedWorkTimer } from '@features/work-record/hooks/useWorkTimer';
import WorkTimerManager from '@features/work-record/organisms/WorkTimerManager';
import AIReplyAssistant from '../organisms/AIReplyAssistant';
import AITriageView from '../organisms/AITriageView';
import TaskList from '../organisms/TaskList';


const ValidationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    issues: ValidationIssue[];
}> = ({ isOpen, onClose, issues }) => {
    const { t } = useTranslation('ai-task-management');
    if (!isOpen) return null;
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    return (
         <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
             <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                 <header className="flex justify-between items-center p-4 border-b">
                     <h2 className="text-xl font-bold">{t('ai_task.validation_modal_title', 'データ整合性チェック結果')}</h2>
                     <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XMarkIcon className="w-6 h-6"/></button>
                 </header>
                 <main className="p-6 overflow-y-auto">
                    {issues.length === 0 ? (
                         <div className="text-center p-8">
                             <CheckIcon className="w-12 h-12 mx-auto text-green-500"/>
                             <p className="mt-4 font-semibold text-lg">{t('ai_task.no_issues', '問題は見つかりませんでした。')}</p>
                             <p className="text-sm text-gray-500">{t('ai_task.integrity_ok', 'タスクと案件の整合性は正常です。')}</p>
                         </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-lg text-red-600 mb-2">{t('ai_task.errors', 'エラー')} ({t('ai_task.items', '{count}件').replace('{count}', String(errorCount))})</h3>
                                <ul className="space-y-2 text-sm">
                                    {issues.filter(i => i.type === 'error').map((issue, index) => (
                                        <li key={`err-${index}`} className="p-2 bg-red-50 dark:bg-red-900/20 rounded"><strong>{issue.quoteCode}:</strong> {issue.taskName} - {issue.message}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-yellow-600 mb-2">{t('ai_task.warnings', '警告')} ({t('ai_task.items', '{count}件').replace('{count}', String(warningCount))})</h3>
                                <ul className="space-y-2 text-sm">
                                    {issues.filter(i => i.type === 'warning').map((issue, index) => (
                                        <li key={`warn-${index}`} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded"><strong>{issue.quoteCode}:</strong> {issue.taskName} - {issue.message}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                 </main>
             </div>
         </div>
    );
};


const AITaskManager: React.FC = () => {
    const { t } = useTranslation('ai-task-management');
    const { database, setDatabase } = useDatabase();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
    const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
    const { activeSessions, startSession, stopSession } = useSharedWorkTimer();

    useEffect(() => {
        const taskIdFromSession = sessionStorage.getItem('selectedAITaskId');
        if (taskIdFromSession) {
            setSelectedTaskId(taskIdFromSession);
            sessionStorage.removeItem('selectedAITaskId');
        }
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!database) {
                setIsLoading(true);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const requiredTables = ['quote_tasks', 'quotes', 'customers', 'emails', 'task_master', 'email_accounts', 'email_attachments', 'work_sessions', 'work_session_quotes', 'users'];
                const missingTables = requiredTables.filter(t => !database[t]);
                if (missingTables.length > 0) {
                    const data = await fetchTables(missingTables, { toolName: 'ai-task-management' });
                    setDatabase(prev => ({...(prev || {}), ...data}));
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : t('ai_task.load_failed', 'タスクデータの読み込みに失敗しました。'));
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [database, setDatabase]);


    const enrichedTasks: EnrichedTask[] = useMemo(() => {
        if (!database) return [];
        const tasks = (database.quote_tasks?.data as QuoteTask[]) || [];
        // FIX: Add explicit type parameters to new Map() to avoid type inference issues.
        const quotesMap = new Map<string, Row>((database.quotes?.data as Row[] || []).map(q => [q.id as string, q]));
        // FIX: Add explicit type parameters to new Map() to avoid type inference issues.
        const customersMap = new Map<string, Row>((database.customers?.data as Row[] || []).map(c => [c.id as string, c]));
        // FIX: Add explicit type parameters to new Map() to avoid type inference issues.
        const taskMasterMap = new Map<string, TaskMaster>((database.task_master?.data as TaskMaster[] || []).map(t => [t.id as string, t]));

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

    const selectedTask = useMemo(() => {
        return enrichedTasks.find(t => t.id === selectedTaskId) || null;
    }, [selectedTaskId, enrichedTasks]);
    
    const handleRunValidation = () => {
        if (!database) return;
    
        const issues: ValidationIssue[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
    
        const quotesMap = new Map((database.quotes?.data || []).map(q => [q.id, q]));
        const taskMasterMap = new Map((database.task_master?.data as TaskMaster[] || []).map(t => [t.id, t]));
    
        (database.quote_tasks?.data as QuoteTask[] || []).forEach(task => {
            if (task.status === 'completed' || task.status === 'skipped') {
                return;
            }
    
            const quote = quotesMap.get(task.quote_id);
            const taskMaster = taskMasterMap.get(task.task_master_id);
            const taskName = taskMaster?.name || 'Unknown Task';
            const quoteCode = (quote as Row)?.quote_code || 'N/A';
    
            if (task.due_date) {
                const dueDate = new Date(task.due_date);
                if (dueDate < today) {
                    issues.push({
                        type: 'error',
                        message: t('ai_task.due_date_passed', 'タスク期日が過ぎています (期日: {due_date})').replace('{due_date}', task.due_date),
                        quoteId: task.quote_id,
                        quoteCode,
                        taskId: task.id,
                        taskName,
                    });
                }
            }
    
            if (quote) {
                if (task.due_date && !(quote as Row).estimated_delivery_date) {
                    issues.push({
                        type: 'warning',
                        message: t('ai_task.due_date_no_delivery', 'タスクに期日がありますが、案件の希望納品日が設定されていません。'),
                        quoteId: task.quote_id,
                        quoteCode,
                        taskId: task.id,
                        taskName,
                    });
                }
    
                if (task.due_date && (quote as Row).estimated_delivery_date) {
                    const dueDate = new Date(task.due_date);
                    const deliveryDate = new Date((quote as Row).estimated_delivery_date as string);
                    if (dueDate > deliveryDate) {
                        issues.push({
                            type: 'error',
                            message: t('ai_task.due_date_exceeds_delivery', 'タスク期日 ({task_due}) が案件の希望納品日 ({delivery_date}) を超えています。')
                                .replace('{task_due}', task.due_date)
                                .replace('{delivery_date}', (quote as Row).estimated_delivery_date as string),
                            quoteId: task.quote_id,
                            quoteCode,
                            taskId: task.id,
                            taskName,
                        });
                    }
                }
            }
        });
    
        setValidationIssues(issues);
        setIsValidationModalOpen(true);
    };

    return (
        <>
            <div className="grid grid-cols-12 gap-4 h-full">
                <div className="col-span-4 bg-base-100 dark:bg-base-dark-200 rounded-lg flex flex-col overflow-hidden border">
                    <TaskList
                        tasks={enrichedTasks}
                        onSelectTask={setSelectedTaskId}
                        selectedTaskId={selectedTaskId}
                        onRunValidation={handleRunValidation}
                        activeSessions={activeSessions}
                        onStartTimer={startSession}
                        onStopTimer={stopSession}
                    />
                </div>
                <div className="col-span-4 flex flex-col gap-4">
                    <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg p-4 border flex-grow h-1/2 overflow-auto">
                        <WorkTimerManager showUnsavedLogs={true} />
                    </div>
                    <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg p-4 border flex-grow h-1/2 overflow-auto">
                       <AITriageView selectedItem={selectedTask} />
                    </div>
                </div>

                <div className="col-span-4 bg-base-100 dark:bg-base-dark-200 rounded-lg p-4 flex flex-col border">
                    <AIReplyAssistant selectedItem={selectedTask} />
                </div>
            </div>

            <ValidationModal
                isOpen={isValidationModalOpen}
                onClose={() => setIsValidationModalOpen(false)}
                issues={validationIssues}
            />
        </>
    );
};
export default AITaskManager;