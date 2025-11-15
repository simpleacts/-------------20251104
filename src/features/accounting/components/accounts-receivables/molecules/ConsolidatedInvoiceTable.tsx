import React from 'react';
import { Row } from '@shared/types';

interface ConsolidatedInvoiceTableProps {
    quotes: Row[];
    selectedQuoteIds: Set<string>;
    onToggleQuote: (quoteId: string) => void;
    onToggleSelectAll: () => void;
}

const ConsolidatedInvoiceTable: React.FC<ConsolidatedInvoiceTableProps> = ({ quotes, selectedQuoteIds, onToggleQuote, onToggleSelectAll }) => {
    return (
        <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-base-200 dark:bg-base-dark-300">
                <tr>
                    <th className="p-2 w-10">
                        <input 
                            type="checkbox" 
                            onChange={onToggleSelectAll} 
                            checked={quotes.length > 0 && selectedQuoteIds.size === quotes.length} 
                        />
                    </th>
                    <th className="p-2 text-left">案件コード</th>
                    <th className="p-2 text-left">件名</th>
                    <th className="p-2 text-left">納品日</th>
                    <th className="p-2 text-right">金額 (税込)</th>
                </tr>
            </thead>
            <tbody>
                {quotes.map(quote => (
                    <tr key={quote.id as string} className="border-t border-base-200 dark:border-base-dark-300">
                        <td className="p-2 text-center">
                            <input 
                                type="checkbox" 
                                checked={selectedQuoteIds.has(quote.id as string)} 
                                onChange={() => onToggleQuote(quote.id as string)} 
                            />
                        </td>
                        <td className="p-2 font-mono">{quote.quote_code}</td>
                        <td className="p-2 truncate max-w-xs">{quote.subject}</td>
                        <td className="p-2">{quote.shipping_date ? new Date(quote.shipping_date as string).toLocaleDateString() : 'N/A'}</td>
                        <td className="p-2 text-right font-semibold">¥{(quote.total_cost_in_tax as number || 0).toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ConsolidatedInvoiceTable;