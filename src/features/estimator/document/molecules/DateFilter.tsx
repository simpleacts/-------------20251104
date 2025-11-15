import React, { useState } from 'react';

interface DateFilterProps {
    dateStart: string;
    dateEnd: string;
    onDateStartChange: (date: string) => void;
    onDateEndChange: (date: string) => void;
    docType?: 'estimate' | 'invoice' | 'delivery_slip' | 'receipt' | 'all';
}

const DateFilter: React.FC<DateFilterProps> = ({
    dateStart,
    dateEnd,
    onDateStartChange,
    onDateEndChange,
    docType = 'all'
}) => {
    const [isOpen, setIsOpen] = useState(false);

    // 日付フィルターのラベルを取得
    const getDateLabel = () => {
        switch (docType) {
            case 'invoice':
                return '請求日';
            case 'delivery_slip':
                return '納品日';
            case 'receipt':
                return '領収日';
            default:
                return '作成日';
        }
    };

    const handleClear = () => {
        onDateStartChange('');
        onDateEndChange('');
    };

    const hasFilter = dateStart || dateEnd;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-md bg-base-200 dark:bg-base-dark-300 hover:bg-base-300 dark:hover:bg-base-dark-400 transition-colors ${
                    hasFilter ? 'border-brand-primary' : ''
                }`}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <span className="text-xs">{getDateLabel()}</span>
                {hasFilter && (
                    <span className="text-xs bg-brand-primary text-white px-1.5 py-0.5 rounded">
                        {dateStart && dateEnd ? `${dateStart} ～ ${dateEnd}` : dateStart || dateEnd}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 z-20 bg-base-100 dark:bg-base-dark-200 border border-default dark:border-default-dark rounded-lg shadow-lg p-4 min-w-[280px]">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-base-content dark:text-base-dark">日付で絞り込み</h3>
                            {hasFilter && (
                                <button
                                    onClick={handleClear}
                                    className="text-xs text-muted dark:text-muted-dark hover:text-base-content dark:hover:text-base-dark transition-colors"
                                >
                                    クリア
                                </button>
                            )}
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="date-filter-start" className="block text-xs text-muted dark:text-muted-dark mb-1">
                                    開始日
                                </label>
                                <input
                                    id="date-filter-start"
                                    name="date-filter-start"
                                    type="date"
                                    value={dateStart}
                                    onChange={(e) => onDateStartChange(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-default dark:border-default-dark rounded-md bg-base-100 dark:bg-base-dark-200 text-base-content dark:text-base-dark focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label htmlFor="date-filter-end" className="block text-xs text-muted dark:text-muted-dark mb-1">
                                    終了日
                                </label>
                                <input
                                    id="date-filter-end"
                                    name="date-filter-end"
                                    type="date"
                                    value={dateEnd}
                                    onChange={(e) => onDateEndChange(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-default dark:border-default-dark rounded-md bg-base-100 dark:bg-base-dark-200 text-base-content dark:text-base-dark focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="mt-3 w-full px-3 py-1.5 text-sm bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark rounded-md hover:opacity-90"
                        >
                            閉じる
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default DateFilter;

