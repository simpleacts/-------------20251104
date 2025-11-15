import React from 'react';
import { DtfCalculationResult } from '../services/dtfService';

const formatCurrency = (value: number | undefined) => {
    if (typeof value !== 'number' || isNaN(value)) return '¥-';
    return `¥${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDuration = (hours: number | undefined): string => {
    if (typeof hours !== 'number' || isNaN(hours)) return '-';
    if (hours === 0) return '00:00:00';
    const totalSeconds = hours * 3600;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

interface DtfResultProps {
    calculationResult: DtfCalculationResult | null;
}

const DtfResult: React.FC<DtfResultProps> = ({ calculationResult }) => {
    if (!calculationResult) {
        return (
            <div className="text-center p-8 bg-base-200 dark:bg-base-dark-300 rounded-lg h-full flex items-center justify-center">
                <p className="text-gray-500">数値を入力して単価を計算してください。</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center p-6 bg-brand-primary/10 dark:bg-brand-primary/20 rounded-lg">
                <p className="text-lg font-bold">1個あたりの単価</p>
                <p className="text-5xl font-bold my-2 text-brand-primary dark:text-brand-secondary">
                    {formatCurrency(calculationResult.sellingPricePerItem)}
                </p>
                <p className="text-xs text-gray-500">※税抜価格</p>
            </div>
            
            <div className="text-sm space-y-2 bg-container-muted-bg dark:bg-container-muted-bg-dark p-4 rounded-lg">
                <h3 className="font-bold mb-2">原価詳細 (1個あたり)</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs p-2 bg-base-100 dark:bg-base-dark-200 rounded">
                    {Object.entries(calculationResult.detailsPerItem).map(([key, value]) => (
                        <div key={key} className="flex justify-between border-b border-dashed">
                            <span className="capitalize">{key}</span>
                            <span className="font-mono">{formatCurrency(value as number)}</span>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-x-4 mt-2 pt-2 border-t font-semibold">
                    <span>合計原価:</span>
                    <span className="text-right">{formatCurrency(calculationResult.costPerItem)}</span>
                </div>
            </div>
            
            <div className="text-sm space-y-2 bg-container-muted-bg dark:bg-container-muted-bg-dark p-4 rounded-lg">
                <h3 className="font-bold mb-2">生産情報 (全体)</h3>
                <div className="grid grid-cols-2 gap-x-4">
                    <div className="font-semibold">合計フィルム長:</div><div>{calculationResult.totalFilmLengthMeters.toFixed(2)} m</div>
                    <div className="font-semibold">合計印刷時間:</div><div>{formatDuration(calculationResult.printTimeHours)}</div>
                </div>
            </div>
        </div>
    );
};

export default DtfResult;
