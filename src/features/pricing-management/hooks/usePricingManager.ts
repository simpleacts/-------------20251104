import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, Row } from '@shared/types';

type DbOperation = { tableName: string; type: 'INSERT' | 'UPDATE' | 'DELETE'; data?: Row; where?: Partial<Row> };

export const usePricingManager = (database: Database, setDatabase: React.Dispatch<React.SetStateAction<Database | null>>, currentUser: Row) => {
    const { t } = useTranslation('pricing-management');
    const { currentPage } = useNavigation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
    const [duplicatingScheduleId, setDuplicatingScheduleId] = useState<string | null>(null);
    const [orderedSchedules, setOrderedSchedules] = useState<Row[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [printingSchedule, setPrintingSchedule] = useState<Row | null>(null);

    // FIX: Explicitly set the types for the Map to `string, string`.
    const usersMap = useMemo(() => {
        if (!database?.users?.data) return new Map<string, string>();
        return new Map<string, string>(database.users.data.map(u => [u.id as string, u.name as string]));
    }, [database?.users?.data]);
    
    const isAdmin = useMemo(() => {
        if (!currentUser || !database?.roles?.data) return false;
        const adminRole = database.roles.data.find(r => r.name === t('pricing.assistant.admin_role', '管理者'));
        return adminRole && currentUser.role_id === adminRole.id;
    }, [currentUser, database?.roles?.data, t]);

    useEffect(() => {
        if (!database?.print_pricing_schedules?.data) {
            setOrderedSchedules([]);
            return;
        }
        const schedules = database.print_pricing_schedules.data;
        const visibleSchedules = isAdmin
            ? schedules
            : schedules.filter(s => !s.owner_user_id || s.owner_user_id === currentUser.id);

        // FIX: Add explicit types to sort function parameters to avoid `unknown` type errors.
        const sorted = [...visibleSchedules].sort((a: Row, b: Row) => {
            const sortOrderA = a.sort_order ?? Infinity;
            const sortOrderB = b.sort_order ?? Infinity;
            if (sortOrderA !== sortOrderB) return sortOrderA - sortOrderB;

            const ownerNameA = a.owner_user_id ? usersMap.get(a.owner_user_id as string) ?? 'Z' : 'A';
            const ownerNameB = b.owner_user_id ? usersMap.get(b.owner_user_id as string) ?? 'Z' : 'A';
            if (ownerNameA !== ownerNameB) return ownerNameA.localeCompare(ownerNameB);
            
            return String(a.name).localeCompare(String(b.name));
        });
        setOrderedSchedules(sorted);
    }, [database?.print_pricing_schedules?.data, currentUser.id, isAdmin, usersMap]);

    const executeDbOperations = useCallback(async (operations: DbOperation[]) => {
        // まずローカル状態を更新
        setDatabase(prevDb => {
            if (!prevDb) return null;
            const newDb = JSON.parse(JSON.stringify(prevDb));

            operations.forEach(op => {
                const table = newDb[op.tableName];
                if (!table) return;

                switch (op.type) {
                    case 'INSERT':
                        if (op.data) table.data.push(op.data);
                        break;
                    case 'UPDATE':
                        if (op.data && op.where) {
                            const index = table.data.findIndex((r: Row) => Object.keys(op.where!).every(k => r[k] === op.where![k]));
                            if (index !== -1) table.data[index] = { ...table.data[index], ...op.data };
                        }
                        break;
                    case 'DELETE':
                         if (op.where) {
                            table.data = table.data.filter((r: Row) => !Object.keys(op.where!).every(k => r[k] === op.where![k]));
                         }
                        break;
                }
            });
            return newDb;
        });

        // サーバーに保存
        try {
            // テーブルごとに操作をグループ化
            const operationsByTable = new Map<string, Array<{ type: 'INSERT' | 'UPDATE' | 'DELETE'; data?: Row; where?: Partial<Row> }>>();
            
            operations.forEach(op => {
                if (!operationsByTable.has(op.tableName)) {
                    operationsByTable.set(op.tableName, []);
                }
                operationsByTable.get(op.tableName)!.push({
                    type: op.type,
                    data: op.data,
                    where: op.where
                });
            });

            // 各テーブルに対してサーバー更新を実行
            for (const [tableName, tableOps] of operationsByTable) {
                const serverOperations = tableOps.map(op => ({
                    type: op.type as 'INSERT' | 'UPDATE' | 'DELETE',
                    ...(op.data && { data: op.data }),
                    ...(op.where && { where: op.where })
                }));

                const result = await updateDatabase(currentPage, tableName, serverOperations, database);
                if (!result.success) {
                    throw new Error(result.error || `Failed to update ${tableName} to server`);
                }
            }
        } catch (error) {
            console.error('[usePricingManager] Failed to update to server:', error);
            alert(t('pricing.update_failed', 'サーバーへの更新に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
    }, [setDatabase, currentPage, database, t]);

    const handleOpenModal = useCallback((scheduleId: string | null) => {
        setSelectedScheduleId(scheduleId);
        setDuplicatingScheduleId(null);
        setIsModalOpen(true);
    }, []);

    const handleDuplicate = useCallback((scheduleId: string) => {
        setSelectedScheduleId(null);
        setDuplicatingScheduleId(scheduleId);
        setIsModalOpen(true);
    }, []);

    const handleDelete = useCallback((scheduleId: string, scheduleName: string) => {
        if (window.confirm(t('pricing.delete_confirm', '単価表「{name}」を削除しますか？\n関連する単価階層もすべて削除されます。この操作は元に戻せません。').replace('{name}', scheduleName))) {
            const operations: DbOperation[] = [
                { tableName: 'print_pricing_schedules', type: 'DELETE', where: { id: scheduleId } }
            ];
            const tiersToDelete = (database?.print_pricing_tiers?.data || []).filter(t => t.schedule_id === scheduleId);
            tiersToDelete.forEach(tier => {
                operations.push({ tableName: 'print_pricing_tiers', type: 'DELETE', where: { id: tier.id } });
            });
            executeDbOperations(operations);
        }
    }, [database?.print_pricing_tiers?.data, executeDbOperations, t]);

    const handleSave = useCallback((scheduleData: Row, tiersData: Row[]) => {
        const operations: DbOperation[] = [];
        const isNew = !scheduleData.id;
        const scheduleId = isNew ? `ppsc_${Date.now()}` : scheduleData.id;

        if (isNew) {
            const schedules = database?.print_pricing_schedules?.data || [];
            const maxSortOrder = Math.max(0, ...schedules.map(s => s.sort_order || 0));
            operations.push({
                tableName: 'print_pricing_schedules',
                type: 'INSERT',
                data: { ...scheduleData, id: scheduleId, sort_order: maxSortOrder + 10 }
            });
        } else {
            operations.push({
                tableName: 'print_pricing_schedules',
                type: 'UPDATE',
                data: scheduleData,
                where: { id: scheduleId }
            });
        }

        const existingTiers = (database?.print_pricing_tiers?.data || []).filter(t => t.schedule_id === scheduleId);
        existingTiers.forEach(et => {
            if (!tiersData.some(nt => nt.id === et.id)) {
                operations.push({ tableName: 'print_pricing_tiers', type: 'DELETE', where: { id: et.id } });
            }
        });

        tiersData.forEach(tier => {
            if (tier.id) {
                operations.push({ tableName: 'print_pricing_tiers', type: 'UPDATE', data: tier, where: { id: tier.id } });
            } else {
                operations.push({ tableName: 'print_pricing_tiers', type: 'INSERT', data: { ...tier, id: `pptr_${Date.now()}_${Math.random()}`, schedule_id: scheduleId } });
            }
        });
        
        executeDbOperations(operations);
        setIsModalOpen(false);
    }, [database?.print_pricing_schedules?.data, database?.print_pricing_tiers?.data, executeDbOperations]);

    const handleDragStart = useCallback((e: React.DragEvent<HTMLTableRowElement>, scheduleId: string) => {
        setDraggingId(scheduleId);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLTableRowElement>) => e.preventDefault(), []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
        e.preventDefault();
        if (draggingId === null || draggingId === targetId) return;

        const dragIndex = orderedSchedules.findIndex(s => s.id === draggingId);
        const targetIndex = orderedSchedules.findIndex(s => s.id === targetId);
        if (dragIndex === -1 || targetIndex === -1) return;

        const newSchedules = [...orderedSchedules];
        const [draggedItem] = newSchedules.splice(dragIndex, 1);
        newSchedules.splice(targetIndex, 0, draggedItem);
        
        setOrderedSchedules(newSchedules);

        const operations = newSchedules.map((schedule, index) => ({
            tableName: 'print_pricing_schedules',
            type: 'UPDATE' as const,
            data: { sort_order: (index + 1) * 10 },
            where: { id: schedule.id }
        }));
        executeDbOperations(operations);
    }, [draggingId, orderedSchedules, executeDbOperations]);

    const handleDragEnd = useCallback(() => setDraggingId(null), []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setSelectedScheduleId(null);
        setDuplicatingScheduleId(null);
    }, []);

    return {
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
    };
};