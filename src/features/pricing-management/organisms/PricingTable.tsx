import React from 'react';
import { Row } from '@shared/types';
import { Bars2Icon } from '@components/atoms';
import { PricingTableActions } from '../molecules/PricingTableActions';

interface PricingTableProps {
    orderedSchedules: Row[];
    isAdmin: boolean;
    usersMap: Map<any, string>;
    draggingId: string | null;
    onPrint: (schedule: Row) => void;
    onEdit: (scheduleId: string | null) => void;
    onDuplicate: (scheduleId: string) => void;
    onDelete: (scheduleId: string, scheduleName: string) => void;
    onDragStart: (e: React.DragEvent<HTMLTableRowElement>, scheduleId: string) => void;
    onDragOver: (e: React.DragEvent<HTMLTableRowElement>) => void;
    onDrop: (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => void;
    onDragEnd: () => void;
}

const PricingTable: React.FC<PricingTableProps> = ({
    orderedSchedules,
    isAdmin,
    usersMap,
    draggingId,
    onPrint,
    onEdit,
    onDuplicate,
    onDelete,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}) => {
    return (
        <table className="min-w-full divide-y divide-base-300 dark:divide-base-dark-300">
            <thead className="bg-base-200 dark:bg-base-dark-300">
                <tr>
                    {isAdmin && <th className="w-12"></th>}
                    <th className="px-4 py-2 text-left text-sm font-semibold">操作</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">単価表名</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">担当ユーザー</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-base-300 dark:divide-base-dark-300">
                {orderedSchedules.map(schedule => (
                    <tr
                        key={schedule.id}
                        draggable={isAdmin}
                        onDragStart={isAdmin ? (e) => onDragStart(e, schedule.id as string) : undefined}
                        onDragOver={isAdmin ? onDragOver : undefined}
                        onDrop={isAdmin ? (e) => onDrop(e, schedule.id as string) : undefined}
                        onDragEnd={isAdmin ? onDragEnd : undefined}
                        className={`transition-opacity ${isAdmin ? 'cursor-grab' : ''} ${draggingId === schedule.id ? 'opacity-30' : 'opacity-100'}`}
                    >
                        {isAdmin && (
                            <td className="px-2 py-3 text-center text-gray-400">
                                <Bars2Icon className="w-5 h-5" />
                            </td>
                        )}
                        <td className="px-4 py-3 text-left">
                            <PricingTableActions
                                onPrint={() => onPrint(schedule)}
                                onEdit={() => onEdit(schedule.id as string)}
                                onDuplicate={() => onDuplicate(schedule.id as string)}
                                onDelete={() => onDelete(schedule.id as string, schedule.name as string)}
                            />
                        </td>
                        <td className="px-4 py-3 font-medium">{schedule.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {schedule.owner_user_id ? usersMap.get(schedule.owner_user_id) || `ID: ${schedule.owner_user_id}` : '共用'}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default PricingTable;
