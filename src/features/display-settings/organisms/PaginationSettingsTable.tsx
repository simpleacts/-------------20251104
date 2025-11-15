

import React, { useState } from 'react';
import { Row } from '@shared/types';
import { useCategorizedTables } from '@shared/hooks/useCategorizedTables';
import { ToggleSwitch, Button } from '@components/atoms';

interface PaginationSettingsTableProps {
    allTables: string[];
    settingsMap: Map<string, Row>;
    handleUpdate: (tableName: string, updates: Partial<Row>) => void;
    handleToggleAll: (checked: boolean) => void;
    handleBulkUpdate: (field: 'items_per_page_pc' | 'items_per_page_tablet' | 'items_per_page_mobile', value: number) => void;
    allEnabled: boolean;
}

const PaginationSettingsTable: React.FC<PaginationSettingsTableProps> = ({ allTables, settingsMap, handleUpdate, handleToggleAll, handleBulkUpdate, allEnabled }) => {
    // FIX: Retrieve `TABLE_DISPLAY_NAMES` from the `useCategorizedTables` hook.
    const { TABLE_DISPLAY_NAMES } = useCategorizedTables();

    const [bulkValues, setBulkValues] = useState({
        pc: 30,
        tablet: 30,
        mobile: 30
    });

    return (
        <div className="overflow-auto">
            {/* 一括操作バー */}
            <div className="mb-4 p-3 bg-base-200 dark:bg-base-dark-300 rounded-lg flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">すべて選択:</span>
                    <ToggleSwitch
                        checked={allEnabled}
                        onChange={handleToggleAll}
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">一括変更:</span>
                    <div className="flex items-center gap-2">
                        <label htmlFor="bulk-pc" className="text-xs">PC:</label>
                        <input
                            id="bulk-pc"
                            type="number"
                            value={bulkValues.pc}
                            onChange={e => setBulkValues(prev => ({ ...prev, pc: parseInt(e.target.value, 10) || 30 }))}
                            className="w-20 p-1 border rounded text-center bg-input-bg dark:bg-input-bg-dark text-sm"
                        />
                        <Button 
                            onClick={() => handleBulkUpdate('items_per_page_pc', bulkValues.pc)}
                            className="text-xs px-2 py-1"
                        >
                            適用
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="bulk-tablet" className="text-xs">タブレット:</label>
                        <input
                            id="bulk-tablet"
                            type="number"
                            value={bulkValues.tablet}
                            onChange={e => setBulkValues(prev => ({ ...prev, tablet: parseInt(e.target.value, 10) || 30 }))}
                            className="w-20 p-1 border rounded text-center bg-input-bg dark:bg-input-bg-dark text-sm"
                        />
                        <Button 
                            onClick={() => handleBulkUpdate('items_per_page_tablet', bulkValues.tablet)}
                            className="text-xs px-2 py-1"
                        >
                            適用
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="bulk-mobile" className="text-xs">モバイル:</label>
                        <input
                            id="bulk-mobile"
                            type="number"
                            value={bulkValues.mobile}
                            onChange={e => setBulkValues(prev => ({ ...prev, mobile: parseInt(e.target.value, 10) || 30 }))}
                            className="w-20 p-1 border rounded text-center bg-input-bg dark:bg-input-bg-dark text-sm"
                        />
                        <Button 
                            onClick={() => handleBulkUpdate('items_per_page_mobile', bulkValues.mobile)}
                            className="text-xs px-2 py-1"
                        >
                            適用
                        </Button>
                    </div>
                </div>
            </div>

            <table className="min-w-full text-sm">
                <thead className="bg-base-200 dark:bg-base-dark-300">
                    <tr>
                        <th className="p-2 text-left">対象テーブル</th>
                        <th className="p-2 text-center">有効</th>
                        <th className="p-2 text-center">PC (件/ページ)</th>
                        <th className="p-2 text-center">タブレット (件/ページ)</th>
                        <th className="p-2 text-center">モバイル (件/ページ)</th>
                    </tr>
                </thead>
                <tbody>
                    {allTables.map(tableName => {
                        const configFromMap = settingsMap.get(tableName);
                        const config = configFromMap || {
                            target: tableName, enabled: true,
                            items_per_page_pc: 30, items_per_page_tablet: 30, items_per_page_mobile: 30
                        };
                        
                        
                        return (
                            <tr key={tableName} className="border-t border-default dark:border-default-dark hover:bg-base-200 dark:hover:bg-base-dark-300/50">
                                <td className="p-2 font-semibold">{TABLE_DISPLAY_NAMES[tableName] || tableName}</td>
                                <td className="p-2 text-center">
                                    <ToggleSwitch
                                        checked={!!config.enabled}
                                        onChange={checked => handleUpdate(tableName, { enabled: checked })}
                                    />
                                </td>
                                <td className="p-2">
                                    <input
                                        type="number"
                                        value={config.items_per_page_pc}
                                        onChange={e => handleUpdate(tableName, { items_per_page_pc: parseInt(e.target.value, 10) || 30 })}
                                        className="w-24 p-1 border rounded text-center bg-input-bg dark:bg-input-bg-dark"
                                    />
                                </td>
                                <td className="p-2">
                                    <input
                                        type="number"
                                        value={config.items_per_page_tablet}
                                        onChange={e => handleUpdate(tableName, { items_per_page_tablet: parseInt(e.target.value, 10) || 30 })}
                                        className="w-24 p-1 border rounded text-center bg-input-bg dark:bg-input-bg-dark"
                                    />
                                </td>
                                <td className="p-2">
                                    <input
                                        type="number"
                                        value={config.items_per_page_mobile}
                                        onChange={e => handleUpdate(tableName, { items_per_page_mobile: parseInt(e.target.value, 10) || 30 })}
                                        className="w-24 p-1 border rounded text-center bg-input-bg dark:bg-input-bg-dark"
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default PaginationSettingsTable;