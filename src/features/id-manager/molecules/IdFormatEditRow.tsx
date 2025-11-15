import React from 'react';
import { IdFormat } from '@shared/types';
import { TrashIcon } from '@components/atoms';

interface IdFormatEditRowProps {
    format: Partial<IdFormat>;
    onUpdate: (tableName: string, field: 'prefix' | 'padding' | 'is_manufacturer_dependent', value: string | number | boolean) => void;
    onDelete: (tableName: string) => void;
    TABLE_DISPLAY_NAMES: Record<string, string>;
}

const IdFormatEditRow: React.FC<IdFormatEditRowProps> = ({ format, onUpdate, onDelete, TABLE_DISPLAY_NAMES }) => {
    const isManufacturerDependent = format.is_manufacturer_dependent === true || 
                                   format.is_manufacturer_dependent === 1 ||
                                   String(format.is_manufacturer_dependent) === '1';
    
    return (
        <tr className="border-t border-base-300 dark:border-base-dark-300">
            <td className="p-2 font-medium">{TABLE_DISPLAY_NAMES[format.table_name!] || format.table_name}</td>
            <td className="p-1">
                <input
                    type="text"
                    value={format.prefix || ''}
                    onChange={(e) => onUpdate(format.table_name!, 'prefix', e.target.value)}
                    className="w-full max-w-xs p-1 border rounded bg-base-100 dark:bg-base-dark-200"
                    placeholder="例: cust_"
                />
            </td>
            <td className="p-1">
                <input
                    type="number"
                    min="0"
                    max="20"
                    value={format.padding || 0}
                    onChange={(e) => onUpdate(format.table_name!, 'padding', parseInt(e.target.value) || 0)}
                    className="w-24 p-1 border rounded bg-base-100 dark:bg-base-dark-200"
                    placeholder="例: 6"
                />
            </td>
            <td className="p-1">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isManufacturerDependent}
                        onChange={(e) => onUpdate(format.table_name!, 'is_manufacturer_dependent', e.target.checked)}
                        className="w-4 h-4"
                        title="IDにメーカーIDを含める（{prefix}_{manufacturer_id}_{番号}）"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">有効</span>
                </label>
            </td>
            <td className="p-2 text-right">
                <button onClick={() => onDelete(format.table_name!)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full" title="この設定を削除">
                    <TrashIcon className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
};

export default IdFormatEditRow;