import React, { useState, useEffect } from 'react';
import { AdditionalOption } from '@shared/types';
import { XMarkIcon } from '@components/atoms';

interface AdditionalOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    options: AdditionalOption[];
    selectedOptionIds: string[];
    onSave: (newSelectedIds: string[]) => void;
}

const AdditionalOptionsModal: React.FC<AdditionalOptionsModalProps> = ({ isOpen, onClose, options, selectedOptionIds, onSave }) => {
    const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setLocalSelectedIds(new Set(selectedOptionIds));
        }
    }, [isOpen, selectedOptionIds]);

    if (!isOpen) return null;

    const handleToggle = (optionId: string) => {
        setLocalSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(optionId)) {
                newSet.delete(optionId);
            } else {
                newSet.add(optionId);
            }
            return newSet;
        });
    };

    const handleSave = () => {
        onSave(Array.from(localSelectedIds));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">追加オプションを選択</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main className="overflow-y-auto p-6 space-y-3">
                    {options.map(option => (
                        <label key={option.id} className="flex items-center p-3 bg-base-200 dark:bg-base-dark-300 rounded-md cursor-pointer hover:bg-base-300 dark:hover:bg-base-dark-200/50">
                            <input
                                type="checkbox"
                                checked={localSelectedIds.has(option.id)}
                                onChange={() => handleToggle(option.id)}
                                className="h-5 w-5 rounded border-gray-300 text-brand-secondary focus:ring-brand-secondary"
                            />
                            <div className="ml-3 text-sm">
                                <span className="font-medium text-base-content dark:text-base-dark-content">{option.name} (+¥{option.cost_per_item}/枚)</span>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">{option.description}</p>
                            </div>
                        </label>
                    ))}
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-base-300 hover:bg-gray-300 dark:bg-base-dark-300 dark:hover:bg-gray-600">キャンセル</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-800">保存</button>
                </footer>
            </div>
        </div>
    );
};

export default AdditionalOptionsModal;