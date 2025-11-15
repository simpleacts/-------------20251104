import React, { useState, useMemo } from 'react';
import { Database, Row } from '@shared/types';

export const useReceivables = (database: Database, setDatabase: React.Dispatch<React.SetStateAction<Database | null>>) => {
    const [monthFilter, setMonthFilter] = useState<string>('');
    const [paymentModalData, setPaymentModalData] = useState<{ quoteId: string, date: string } | null>(null);

    const receivables = useMemo(() => {
        const customerMap = new Map(database.customers.data.map(c => [c.id, c.company_name || c.name_kanji]));
        let quotes: Row[] = (database.quotes?.data || []).filter(q => 
            (q.quote_status === '納品完了' || q.quote_status === '請求書発行済' || q.quote_status === '完了')
        ).map(q => ({...q, customerName: customerMap.get(q.customer_id as string) || '不明な顧客'}));
        
        if (monthFilter) {
            quotes = quotes.filter(q => (q as any).billing_month === monthFilter);
        }
        
        return quotes.sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());

    }, [database.quotes, database.customers, monthFilter]);

    const handleStatusChange = (quoteId: string, newStatus: string, paymentDate?: string) => {
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const quoteIndex = newDb.quotes.data.findIndex((q: Row) => q.id === quoteId);
            if (quoteIndex > -1) {
                newDb.quotes.data[quoteIndex].payment_status = newStatus;
                if (newStatus === '入金済') {
                    newDb.quotes.data[quoteIndex].payment_date = paymentDate || new Date().toISOString().split('T')[0];
                } else {
                    newDb.quotes.data[quoteIndex].payment_date = null;
                }
            }
            return newDb;
        });
    };
    
    const handleLockToggle = (quoteId: string, isLocked: boolean) => {
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const quoteIndex = newDb.quotes.data.findIndex((q: Row) => q.id === quoteId);
            if (quoteIndex > -1) {
                newDb.quotes.data[quoteIndex].is_locked = isLocked;
            }
            return newDb;
        });
    };

    return {
        monthFilter,
        setMonthFilter,
        paymentModalData,
        setPaymentModalData,
        receivables,
        handleStatusChange,
        handleLockToggle,
    };
};