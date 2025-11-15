import { useState, useMemo } from 'react';
import { Database, Row, OrderDetail, ProcessingGroup, GroupCost, CostDetails, CustomerInfo } from '@shared/types';

export const useConsolidatedInvoices = (database: Database) => {
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedQuoteIds, setSelectedQuoteIds] = useState<Set<string>>(new Set());
    const [printableData, setPrintableData] = useState<any>(null);

    const customers = useMemo(() => database.customers?.data || [], [database.customers]);

    const targetQuotes = useMemo(() => {
        if (!selectedCustomerId || !startDate || !endDate) return [];
        
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return (database.quotes?.data || []).filter(q => {
            const shippingDate = q.shipping_date ? new Date(q.shipping_date as string) : null;
            return (
                String(q.customer_id) === selectedCustomerId &&
                (q.quote_status === '納品完了' || q.quote_status === '請求書発行済') &&
                shippingDate &&
                shippingDate >= start &&
                shippingDate <= end
            );
        });
    }, [database.quotes, selectedCustomerId, startDate, endDate]);

    const { selectedTotal, selectedQuotes } = useMemo(() => {
        const quotes = targetQuotes.filter(q => selectedQuoteIds.has(q.id as string));
        const total = quotes.reduce((sum, q) => sum + (q.total_cost_in_tax as number || 0), 0);
        return { selectedTotal: total, selectedQuotes: quotes };
    }, [targetQuotes, selectedQuoteIds]);

    const handleToggleQuote = (quoteId: string) => {
        setSelectedQuoteIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(quoteId)) {
                newSet.delete(quoteId);
            } else {
                newSet.add(quoteId);
            }
            return newSet;
        });
    };
    
    const handleToggleSelectAll = () => {
        if (selectedQuoteIds.size === targetQuotes.length) {
            setSelectedQuoteIds(new Set());
        } else {
            setSelectedQuoteIds(new Set(targetQuotes.map(q => q.id as string)));
        }
    };

    const handleGenerateInvoice = () => {
        if (selectedQuotes.length === 0) {
            alert('請求する案件を選択してください。');
            return;
        }

        const customer = customers.find(c => String(c.id) === selectedCustomerId);
        if (!customer) return;

        const totalExTax = selectedQuotes.reduce((sum, q) => sum + (q.total_cost_ex_tax as number || 0), 0);
        const totalShipping = selectedQuotes.reduce((sum, q) => sum + (q.shipping_cost as number || 0), 0);
        const totalTax = selectedQuotes.reduce((sum, q) => sum + (q.tax as number || 0), 0);

        const processingGroups: ProcessingGroup[] = selectedQuotes.map(quote => {
            const items: OrderDetail[] = database.quote_items.data
                .filter(item => String(item.quote_id) === String(quote.id))
                .map((item: Row): OrderDetail => ({
                    productId: item.product_id as string,
                    productName: item.product_name as string,
                    color: item.color as string,
                    size: item.size as string,
                    quantity: item.quantity as number,
                    unitPrice: item.unit_price as number,
                    spareQuantity: item.spare_quantity as number | undefined
                }));
            return {
                id: String(quote.id),
                name: `${quote.quote_code} (${new Date(quote.shipping_date as string || quote.updated_at as string).toLocaleDateString()}) - ${quote.subject}`,
                items: items,
                printDesigns: [],
                selectedOptions: [],
            };
        });

        const groupCosts: GroupCost[] = selectedQuotes.map(quote => ({
            groupId: String(quote.id),
            groupName: `${quote.quote_code} (${new Date(quote.shipping_date as string || quote.updated_at as string).toLocaleDateString()}) - ${quote.subject}`,
            tshirtCost: (quote.total_cost_in_tax || 0) as number, 
            silkscreenPrintCost: 0, dtfPrintCost: 0, setupCost: 0, quantity: 0, additionalOptionsCost: 0,
            customItemsCost: 0,
            productDiscount: 0,
            sampleItemsCost: 0,
            printCostDetail: { base: 0, byItem: 0, bySize: 0, byInk: 0, byLocation: 0, byPlateType: 0 },
            additionalOptionsCostDetail: {}
        }));
        
        const cost: CostDetails = {
            totalCost: totalExTax + totalShipping,
            shippingCost: totalShipping,
            tax: totalTax,
            totalCostWithTax: selectedTotal,
            costPerShirt: 0,
            tshirtCost: selectedTotal,
            setupCost: 0,
            printCost: 0,
            additionalOptionsCost: 0,
            totalCustomItemsCost: 0,
            totalProductDiscount: 0,
            totalSampleItemsCost: 0,
            printCostDetail: { base: 0, byDtf: 0, byItem: 0, bySize: 0, byInk: 0, byLocation: 0, byPlateType: 0 },
            setupCostDetail: {},
            additionalOptionsCostDetail: {},
            groupCosts,
        };
        
        const invoiceData = {
            templateId: 'tpl_consolidated_invoice',
            templates: database.pdf_templates.data,
            database: database,
            documentType: 'invoice' as 'invoice',
            orderDetails: selectedQuotes.flatMap(q => database.quote_items.data.filter(item => String(item.quote_id) === String(q.id))),
            processingGroups,
            cost,
            totalQuantity: 0,
            customerInfo: customer as CustomerInfo,
            estimateId: `INV-CON-${Date.now()}`,
            companyInfo: (database.company_info.data as Row[]).reduce((acc, c) => {
                const keyMap: Record<string, string> = {'COMPANY_NAME':'companyName','COMPANY_ZIP':'zip','COMPANY_ADDRESS':'address','COMPANY_TEL':'tel','COMPANY_FAX':'fax','BANK_NAME':'bankName','BANK_BRANCH_NAME':'bankBranchName','BANK_ACCOUNT_TYPE':'bankAccountType','BANK_ACCOUNT_NUMBER':'bankAccountNumber','BANK_ACCOUNT_HOLDER':'bankAccountHolder','INVOICE_ISSUER_NUMBER':'invoiceIssuerNumber'};
                const mappedKey = keyMap[c.key as string];
                if(mappedKey) (acc as any)[mappedKey] = c.value;
                return acc;
            }, {} as any),
            onClose: () => setPrintableData(null),
        };

        setPrintableData(invoiceData);
    };

    return {
        customers,
        selectedCustomerId,
        setSelectedCustomerId,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        targetQuotes,
        selectedQuoteIds,
        handleToggleQuote,
        handleToggleSelectAll,
        selectedTotal,
        selectedQuotes,
        handleGenerateInvoice,
        printableData,
    };
};