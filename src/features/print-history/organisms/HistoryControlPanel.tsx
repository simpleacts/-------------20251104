import React from 'react';
import { Row } from '@shared/types';
import { MagnifyingGlassIcon, PlusIcon } from '@components/atoms';

interface HistoryControlPanelProps {
    selectedQuote: Row | null;
    onSelectQuoteClick: () => void;
    onAddNewClick: () => void;
}

const HistoryControlPanel: React.FC<HistoryControlPanelProps> = ({ selectedQuote, onSelectQuoteClick, onAddNewClick }) => {
    return (
        <div>
            <button onClick={onSelectQuoteClick} className="w-full flex items-center justify-center gap-2 bg-brand-secondary hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                <MagnifyingGlassIcon className="w-4 h-4" />
                {selectedQuote ? '案件を切り替え' : '案件を選択'}
            </button>
            {selectedQuote && (
                <div className="text-xs p-2 mt-2 bg-base-200 dark:bg-base-dark-300 rounded-md space-y-1">
                    <p><strong>見積コード:</strong> {selectedQuote.quote_code}</p>
                    <p><strong>顧客ID:</strong> {selectedQuote.customer_id}</p>
                    <button onClick={onAddNewClick} className="w-full mt-2 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                        <PlusIcon className="w-4 h-4" /> 新規履歴を登録
                    </button>
                </div>
            )}
        </div>
    );
};

export default HistoryControlPanel;
