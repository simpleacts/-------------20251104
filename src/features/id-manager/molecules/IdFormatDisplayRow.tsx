import React from 'react';
import { IdFormat } from '@shared/types';
import IdFormatPreview from '../atoms/IdFormatPreview';

interface IdFormatDisplayRowProps {
    format: Partial<IdFormat>;
    TABLE_DISPLAY_NAMES: Record<string, string>;
}

const IdFormatDisplayRow: React.FC<IdFormatDisplayRowProps> = ({ format, TABLE_DISPLAY_NAMES }) => {
    const isManufacturerDependent = format.is_manufacturer_dependent === true || 
                                   format.is_manufacturer_dependent === 1 ||
                                   String(format.is_manufacturer_dependent) === '1';
    
    return (
        <tr className="border-t border-base-300 dark:border-base-dark-300">
            <td className="p-2 font-medium">{TABLE_DISPLAY_NAMES[format.table_name!] || format.table_name}</td>
            <td className="p-2 font-mono">{format.prefix}</td>
            <td className="p-2">{format.padding}</td>
            <td className="p-2">
                {isManufacturerDependent ? (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        有効
                    </span>
                ) : (
                    <span className="text-xs text-gray-400">-</span>
                )}
            </td>
            <td className="p-2"><IdFormatPreview format={format} /></td>
        </tr>
    );
};

export default IdFormatDisplayRow;