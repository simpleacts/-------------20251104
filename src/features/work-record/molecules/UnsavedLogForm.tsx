
import React from 'react';
import { Row } from '@shared/types';
import { LogFormData } from '../types';
import { Textarea, Button, XMarkIcon } from '@components/atoms';

interface UnsavedLogFormProps {
    log: { logId: string; name: string; duration: number };
    formData: LogFormData;
    quotesMap: Map<string, Row>;
    onChange: (field: keyof LogFormData, value: any) => void;
    onSave: () => void;
    onDelete: () => void;
    onLinkQuote: () => void;
}

const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const UnsavedLogForm: React.FC<UnsavedLogFormProps> = ({ log, formData, quotesMap, onChange, onSave, onDelete, onLinkQuote }) => {
    return (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-bold">{log.name}</h3>
            <p className="text-sm">時間: {formatDuration(log.duration)}</p>
            <Textarea 
                value={formData.notes} 
                onChange={e => onChange('notes', e.target.value)} 
                placeholder="作業メモ..." 
                rows={2} 
                className="w-full mt-2 text-xs"
            />
            <div className="text-xs space-y-1 mt-2">
                <p className="font-semibold">関連案件:</p>
                {formData.selectedQuoteIds.map(qid => (
                    <div key={qid} className="flex items-center justify-between bg-base-100 dark:bg-base-dark-200 p-1 rounded">
                        <span>{quotesMap.get(qid)?.quote_code}</span>
                        <Button variant="ghost" size="sm" onClick={() => onChange('selectedQuoteIds', formData.selectedQuoteIds.filter(id => id !== qid))}>
                            <XMarkIcon className="w-3 h-3 text-red-500" />
                        </Button>
                    </div>
                ))}
                <button onClick={onLinkQuote} className="text-blue-600 text-xs">+ 案件を紐付け</button>
            </div>
            <div className="text-xs mt-2">
                 <label className="flex items-center gap-1">
                    <input type="checkbox" checked={formData.isCreatingNewQuote} onChange={e => onChange('isCreatingNewQuote', e.target.checked)}/> 
                    新規案件として登録
                </label>
                  {formData.isCreatingNewQuote && <input type="text" value={formData.newQuoteSubject} onChange={e => onChange('newQuoteSubject', e.target.value)} placeholder="新規案件の件名" className="w-full mt-1 p-1 border rounded bg-base-100 dark:bg-base-dark-200 text-xs"/>}
            </div>
            <div className="flex justify-end gap-2 mt-2">
                <Button variant="danger" size="sm" onClick={onDelete}>破棄</Button>
                <Button variant="primary" size="sm" onClick={onSave}>保存</Button>
            </div>
        </div>
    );
};

export default UnsavedLogForm;
