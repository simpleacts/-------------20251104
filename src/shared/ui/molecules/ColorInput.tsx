import React from 'react';
import { Input } from '../atoms/Input';

interface ColorInputProps {
    label: string;
    description?: string;
    value: string;
    onChange: (value: string) => void;
}

const ColorInput: React.FC<ColorInputProps> = ({ label, description, value, onChange }) => {
    const inputId = React.useMemo(() => `color-input-${label.replace(/\s+/g, '-').toLowerCase()}`, [label]);
    const colorInputId = `${inputId}-color`;
    
    return (
        <div>
            <label htmlFor={inputId} className="block text-sm font-medium mb-1">{label}</label>
            {description && <p className="text-xs text-muted dark:text-muted-dark mb-1">{description}</p>}
            <div className="flex items-center gap-2">
                <input 
                  id={colorInputId}
                  name={colorInputId}
                  type="color" 
                  value={value || '#ffffff'} 
                  onChange={e => onChange(e.target.value)} 
                  className="w-10 h-10 p-0 border-none rounded bg-transparent cursor-pointer"
                  style={{'WebkitAppearance': 'none', 'MozAppearance': 'none', appearance: 'none'}}
                  aria-label={`${label}の色を選択`}
                />
                <Input 
                  id={inputId}
                  name={inputId}
                  type="text" 
                  value={value || ''} 
                  onChange={e => onChange(e.target.value)} 
                  placeholder="#ffffff"
                />
            </div>
        </div>
    );
};

export { ColorInput };