

import React, { useMemo, useState } from 'react';
import { Database } from '@shared/types';
import { Bill } from '@features/accounting/types';

interface CashFlowSummaryProps {
    database: Partial<Database>;
}

const formatCurrency = (value: number) => `¥${value.toLocaleString()}`;

const CashFlowSummary: React.FC<CashFlowSummaryProps> = ({ database }) => {
    const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().substring(0, 7));

    const monthlyData = useMemo(() => {
        const payables = { total: 0, paid: 0, unpaid: 0 };
        const receivables = { total: 0, paid: 0, unpaid: 0 };

        (database.bills?.data as Bill[] || []).forEach(bill => {
            if (bill.billing_month === selectedMonth) {
                const amount = bill.total_amount || 0;
                payables.total += amount;
                if (bill.status === 'paid') {
                    payables.paid += amount;
                } else {
                    payables.unpaid += amount;
                }
            }
        });
        
        (database.quotes?.data || []).forEach(quote => {
            if ((quote.billing_month === selectedMonth || (quote.ordered_at as string)?.substring(0, 7) === selectedMonth) && (quote.quote_status === '納品完了' || quote.quote_status === '請求書発行済' || quote.quote_status === '完了')) {
                const amount = (quote.total_cost_in_tax as number) || 0;
                receivables.total += amount;
                if (quote.payment_status === '入金済') {
                    receivables.paid += amount;
                } else {
                    receivables.unpaid += amount;
                }
            }
        });
        
        const netFlow = receivables.paid - payables.paid;

        return { payables, receivables, netFlow };

    }, [database, selectedMonth]);
    
    const maxVal = Math.max(1, ...[monthlyData.payables.total, monthlyData.receivables.total]);
    const getWidthPercent = (value: number) => (maxVal > 0 ? (value / maxVal) * 100 : 0);

    return (
        <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">資金繰りサマリー</h2>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="p-2 border rounded-md bg-base-200 dark:bg-base-dark-300"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Payables Card */}
                <div className="p-4 border rounded-lg">
                    <h3 className="font-bold text-lg mb-2">月次 買掛金 (支払)</h3>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(monthlyData.payables.total)}</p>
                    <div className="text-sm mt-4 space-y-1">
                        <div className="flex justify-between"><span>支払済</span><span className="font-semibold">{formatCurrency(monthlyData.payables.paid)}</span></div>
                        <div className="flex justify-between"><span>未払</span><span className="font-semibold">{formatCurrency(monthlyData.payables.unpaid)}</span></div>
                    </div>
                </div>

                {/* Receivables Card */}
                <div className="p-4 border rounded-lg">
                    <h3 className="font-bold text-lg mb-2">月次 売掛金 (入金)</h3>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyData.receivables.total)}</p>
                     <div className="text-sm mt-4 space-y-1">
                        <div className="flex justify-between"><span>入金済</span><span className="font-semibold">{formatCurrency(monthlyData.receivables.paid)}</span></div>
                        <div className="flex justify-between"><span>未入金</span><span className="font-semibold">{formatCurrency(monthlyData.receivables.unpaid)}</span></div>
                    </div>
                </div>

                {/* Net Flow Card */}
                 <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <h3 className="font-bold text-lg mb-2">月次 実質キャッシュフロー</h3>
                    <p className={`text-2xl font-bold ${monthlyData.netFlow >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>
                        {formatCurrency(monthlyData.netFlow)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">（入金済の売掛金 - 支払済の買掛金）</p>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-bold mb-4">月次収支バランス</h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1 text-sm">
                            <span className="font-semibold text-red-600">支払総額</span>
                            <span className="font-bold">{formatCurrency(monthlyData.payables.total)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6 dark:bg-gray-700">
                            <div className="bg-red-500 h-6 rounded-full transition-all duration-500" style={{ width: `${getWidthPercent(monthlyData.payables.total)}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1 text-sm">
                            <span className="font-semibold text-green-600">入金総額</span>
                            <span className="font-bold">{formatCurrency(monthlyData.receivables.total)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6 dark:bg-gray-700">
                            <div className="bg-green-500 h-6 rounded-full transition-all duration-500" style={{ width: `${getWidthPercent(monthlyData.receivables.total)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashFlowSummary;