import React from 'react';
import { GanttQuote } from '@features/order-management/types';

interface QuoteListPanelProps {
    quotes: GanttQuote[];
    onQuoteClick: (quote: GanttQuote) => void;
    height: number;
    headerHeight: number;
    rowHeight: number;
    sidePanelWidth: number;
}

const QuoteListPanel: React.FC<QuoteListPanelProps> = ({ quotes, onQuoteClick, height, headerHeight, rowHeight, sidePanelWidth }) => {
    return (
        <div className="flex-shrink-0 bg-base-200 dark:bg-base-dark-300 rounded-l-md" style={{ width: sidePanelWidth, minHeight: height }}>
            <div style={{ height: headerHeight }} className="flex items-center justify-center font-bold border-b border-r border-base-300 dark:border-base-dark-300">
                案件
            </div>
            {quotes.map(quote => (
                <div
                    key={quote.id as string}
                    style={{ height: rowHeight }}
                    className="flex flex-col justify-center p-2 border-r border-b border-base-300 dark:border-base-dark-300 text-xs cursor-pointer hover:bg-base-300 dark:hover:bg-base-dark-200 transition-colors virtual-scroll-row"
                    onClick={() => onQuoteClick(quote)}
                    title={`${quote.quote_code}\n${quote.customer?.company_name || quote.customer?.name_kanji}\n${quote.subject}`}
                >
                    <p className="font-bold truncate">{quote.quote_code}</p>
                    <p className="text-gray-600 dark:text-gray-400 truncate">{quote.customer?.company_name || quote.customer?.name_kanji}</p>
                    <p className="text-gray-500 dark:text-gray-500 text-[10px] truncate">{quote.subject}</p>
                </div>
            ))}
        </div>
    );
};

export default QuoteListPanel;