import React, { useId } from 'react';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';

interface EditableFieldProps {
    value: any;
    onChange: (value: any) => void;
    type?: 'number' | 'text';
    className?: string,
    disabled?: boolean;
    isLargeText?: boolean;
    id?: string;
    name?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({ value, onChange, type = 'text', className, disabled = false, isLargeText = false, id, name }) => {
    // Generate unique id using React's useId hook
    const generatedId = useId();
    const fieldId = id || (name ? `editable-field-${name}-${generatedId}` : generatedId);
    const fieldName = name || fieldId;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (type === 'number') {
            onChange(e.target.value === '' ? '' : Number(e.target.value));
        } else {
            onChange(e.target.value);
        }
    };
    
    if (isLargeText) {
        return (
            <Textarea
                id={fieldId}
                name={fieldName}
                value={value ?? ''}
                onChange={handleChange}
                className={className}
                disabled={disabled}
            />
        );
    }
    
    return (
        <Input
            id={fieldId}
            name={fieldName}
            type={type}
            value={value ?? ''}
            onChange={handleChange}
            className={className}
            disabled={disabled}
            step={type === 'number' ? '0.01' : undefined}
        />
    );
};

export default EditableField;
