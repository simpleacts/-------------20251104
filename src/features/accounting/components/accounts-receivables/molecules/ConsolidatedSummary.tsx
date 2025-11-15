import React from 'react';

interface ConsolidatedSummaryProps {
    selectedCount: number;
    selectedTotal: number;
    onGenerate: () => void;
    canGenerate: boolean;
}

const ConsolidatedSummary: React.FC<ConsolidatedSummaryProps> = ({ selectedCount, selectedTotal, onGenerate, canGenerate }) => {
    return (
        <div className="mt-4 pt-4 border-t flex justify-end items-center gap-6">
            <div className="text-right">
                <p className="text-sm">選択した案件: {selectedCount}件</p>
                <p className="text-lg font-bold">合計金額: ¥{selectedTotal.toLocaleString()}</p>
            </div>
            <button 
                onClick={onGenerate} 
                disabled={!canGenerate} 
                className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-800 disabled:bg-gray-400"
            >
                請求書を発行
            </button>
        </div>
    );
};

export default ConsolidatedSummary;