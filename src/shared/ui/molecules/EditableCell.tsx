import React from 'react';
import { Column } from '../../types';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Checkbox } from '../atoms/Checkbox';

interface EditableCellProps {
    value: string | number | boolean | null;
    type: Column['type'];
    onChange: (newValue: string | number | boolean) => void;
    options?: { value: string; label: string }[];
}

const EditableCell: React.FC<EditableCellProps> = ({ value, type, onChange, options }) => {
    if (options) {
        return (
            <Select
                value={String(value || '')}
                onChange={(e) => onChange(e.target.value)}
                className="h-8 text-sm"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </Select>
        );
    }

    if (type === 'BOOLEAN') {
        return (
            <div className="flex items-center justify-center">
                <Checkbox
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                />
            </div>
        );
    }

    const inputType = type === 'NUMBER' ? 'number' : 'text';
    return (
        <Input
            type={inputType}
            value={value === null ? '' : String(value)}
            onChange={(e) => onChange(type === 'NUMBER' ? parseFloat(e.target.value) || 0 : e.target.value)}
            className="h-8 text-sm"
        />
    );
};

export default EditableCell;
