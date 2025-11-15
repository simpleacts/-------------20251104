import { PlusIcon } from '@components/atoms';
import { fetchTables } from '@core/data/db.live';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, Row } from '@shared/types';
import React, { useEffect, useRef, useState } from 'react';
import { usePricingManager } from '../hooks/usePricingManager';
import { PricingSchedulePdfModal } from '../modals/PricingSchedulePdfModal';
import ScheduleEditModal from '../modals/ScheduleEditModal';
import PricingTable from '../organisms/PricingTable';

interface PricingManagerProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
    currentUser: Row;
}

const PricingManager: React.FC<PricingManagerProps> = ({ database, setDatabase, currentUser }) => {
    const { t } = useTranslation('pricing-management');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loadedTablesRef = useRef<Set<string>>(new Set());

    // データ読み込み処理
    useEffect(() => {
        const loadData = async () => {
            if (!database) {
                setIsLoading(true);
                return;
            }
            
            const requiredTables = [
                'print_pricing_schedules',
                'print_pricing_tiers',
                'users',
                'roles'
            ];
            
            // 既に読み込み済みのテーブルはスキップ
            const missingTables = requiredTables.filter(t => {
                if (loadedTablesRef.current.has(t)) return false;
                if (database[t]) {
                    loadedTablesRef.current.add(t);
                    return false;
                }
                return true;
            });
            
            if (missingTables.length === 0) {
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            setError(null);
            try {
                missingTables.forEach(t => loadedTablesRef.current.add(t));
                const data = await fetchTables(missingTables, { toolName: 'pricing-manager' });
                setDatabase(prev => ({...(prev || {}), ...data}));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました。');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []); // 初回のみ実行
    
    const {
        isModalOpen,
        selectedScheduleId,
        duplicatingScheduleId,
        orderedSchedules,
        draggingId,
        printingSchedule,
        usersMap,
        isAdmin,
        setPrintingSchedule,
        handleOpenModal,
        handleDuplicate,
        handleDelete,
        handleSave,
        handleDragStart,
        handleDragOver,
        handleDrop,
        handleDragEnd,
        closeModal,
    } = usePricingManager(database, setDatabase, currentUser);


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">データを読み込み中...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 mb-4">エラーが発生しました</p>
                    <p className="text-gray-600 dark:text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('pricing.title', 'プリント単価表管理')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('pricing.description', '単価マトリクスをプリント単価表として管理します。')}</p>
                </div>
                <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                    <PlusIcon className="w-5 h-5" /> {t('pricing.create_new', '新規単価表を作成')}
                </button>
            </header>

            <div className="flex-grow overflow-auto bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
                <PricingTable
                    orderedSchedules={orderedSchedules}
                    isAdmin={isAdmin}
                    usersMap={usersMap}
                    draggingId={draggingId}
                    onPrint={setPrintingSchedule}
                    onEdit={handleOpenModal}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                />
            </div>

            {isModalOpen && (
                <ScheduleEditModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSave}
                    scheduleId={selectedScheduleId}
                    duplicateFromScheduleId={duplicatingScheduleId}
                    database={database}
                    currentUser={currentUser}
                />
            )}

            {printingSchedule && (
                <PricingSchedulePdfModal
                    isOpen={!!printingSchedule}
                    onClose={() => setPrintingSchedule(null)}
                    schedule={printingSchedule}
                    tiers={(database?.print_pricing_tiers?.data || []).filter(t => t.schedule_id === printingSchedule.id)}
                />
            )}
        </div>
    );
};

export default PricingManager;