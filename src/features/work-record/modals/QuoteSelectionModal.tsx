import React, { useState } from 'react';
import { Database, Row } from '@shared/types';

interface QuoteSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (quoteIds: string[]) => void;
    database: Partial<Database>;
    selectedIds: string[];
}

const QuoteSelectionModal: React.FC<QuoteSelectionModalProps> = ({ isOpen, onClose, onSave, database, selectedIds }) => {
    const [localSelected, setLocalSelected] = useState(new Set(selectedIds));
    if (!isOpen) return null;
    const quotes = (database.quotes?.data || []).filter(q => !['完了', '失注', 'キャンセル'].includes(q.quote_status as string));
    
    const handleToggle = (id: string) => {
        setLocalSelected(prev => {
            const newSet = new Set(prev);
            if(newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSave = () => {
        onSave(Array.from(localSelected));
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-container-bg dark:bg-container-bg-dark rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e=>e.stopPropagation()}>
                 <h3 className="p-4 font-bold text-lg border-b">関連案件を選択</h3>
                 <ul className="overflow-y-auto p-4 space-y-2">
                    {quotes.map(q => (
                        <li key={q.id}>
                            <label className="flex items-center gap-3 p-3 hover:bg-hover-bg dark:hover:bg-hover-bg-dark cursor-pointer border rounded-md">
                                <input
                                    type="checkbox"
                                    checked={localSelected.has(q.id as string)}
                                    onChange={() => handleToggle(q.id as string)}
                                    className="w-5 h-5"
                                />
                                <span>{q.quote_code as string} - {q.subject as string}</span>
                            </label>
                        </li>
                    ))}
                 </ul>
                 <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">キャンセル</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">決定</button>
                 </div>
            </div>
        </div>
    );
};

export default QuoteSelectionModal;