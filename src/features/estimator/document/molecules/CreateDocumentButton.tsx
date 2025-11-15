import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon, ChevronDownIcon, Button } from '@components/atoms';

interface CreateDocumentButtonProps {
    onSelect: (type: 'estimate' | 'invoice' | 'delivery_slip' | 'receipt' | 'draft') => void;
}

const CreateDocumentButton: React.FC<CreateDocumentButtonProps> = ({ onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const options = [
        { type: 'estimate' as const, label: '見積' },
        { type: 'delivery_slip' as const, label: '納品' },
        { type: 'invoice' as const, label: '請求' },
        { type: 'receipt' as const, label: '領収' },
        { type: 'draft' as const, label: '下書き（新規作成）' },
    ];

    const handleSelect = (type: 'estimate' | 'invoice' | 'delivery_slip' | 'receipt' | 'draft') => {
        onSelect(type);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="primary"
                size="md"
                className="flex items-center gap-2 whitespace-nowrap"
            >
                <PlusIcon className="w-4 h-4" />
                新規作成
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 bg-base-100 dark:bg-base-dark-200 border border-default dark:border-default-dark rounded-lg shadow-lg min-w-[200px] overflow-hidden">
                    {options.map((option) => (
                        <button
                            key={option.type}
                            onClick={() => handleSelect(option.type)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-hover-bg dark:hover:bg-hover-bg-dark text-base-content dark:text-base-dark transition-colors"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CreateDocumentButton;

