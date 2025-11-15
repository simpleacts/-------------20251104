import React from 'react';
import { Column, Row } from '../../types';
import { CheckIcon, XMarkIcon } from '../atoms/icons';
import StatusBadge from './StatusBadge';

interface DisplayCellProps {
    value: any;
    type: Column['type'];
    tableName?: string;
    columnName?: string;
    contextData?: { [key: string]: Row[] };
}

const DisplayCell: React.FC<DisplayCellProps> = ({ value, type, tableName, columnName, contextData }) => {
    if (value === null || value === undefined) {
        return <span className="text-muted italic">NULL</span>;
    }
    if (type === 'BOOLEAN') {
        return value ? 
            <CheckIcon className="w-5 h-5 text-green-500" title="はい" /> : 
            <XMarkIcon className="w-5 h-5 text-red-500" title="いいえ" />;
    }

    if (tableName === 'customers' && columnName === 'customer_group_id' && contextData?.customerGroups) {
        const group = contextData.customerGroups.find(g => g.id === value);
        if (group) {
            return <StatusBadge status={group.name as string} />;
        }
        return <span className="text-muted italic">不明({value})</span>;
    }
    
    if (tableName === 'customers' && columnName === 'status') {
        const statusMap: Record<string, string> = {
            active: 'アクティブ', inactive: '休眠', suspended: '取引停止'
        };
        return <StatusBadge status={String(value)} labels={statusMap} />;
    }

    if (tableName === 'quotes' && columnName === 'shipping_carrier_id' && contextData?.shippingCarriers) {
        if (!value) return <span className="text-muted italic">未設定</span>;
        const carrier = contextData.shippingCarriers.find(c => c.id === value);
        return carrier ? <span>{carrier.name}</span> : <span className="text-red-500 italic">不明({value})</span>;
    }
    
    if (tableName === 'quotes' && columnName === 'quote_type') {
        if (!value) return <span className="text-muted italic">未分類</span>;
        return <StatusBadge status={String(value)} />;
    }

    const strValue = String(value);
    if (strValue.length > 100) {
        return <span title={strValue}>{strValue.substring(0, 100)}...</span>;
    }

    return <span>{strValue}</span>;
};

export default DisplayCell;