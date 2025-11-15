

import React from 'react';
import { Database } from '@shared/types';
import PrintableEstimate from '@shared/components/PrintableEstimate';
import { useConsolidatedInvoices } from '@features/accounting/hooks/useConsolidatedInvoices';
import ConsolidatedInvoiceFilters from '../molecules/ConsolidatedInvoiceFilters';
import ConsolidatedInvoiceTable from '../molecules/ConsolidatedInvoiceTable';
import ConsolidatedSummary from '../molecules/ConsolidatedSummary';

interface ConsolidatedInvoiceIssuanceProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
}

const ConsolidatedInvoiceIssuance: React.FC<ConsolidatedInvoiceIssuanceProps> = ({ database }) => {
    const {
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
    } = useConsolidatedInvoices(database);

    return (
      <>
        <div className="flex flex-col h-full bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">合算請求書発行</h2>
            <ConsolidatedInvoiceFilters
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                onCustomerChange={setSelectedCustomerId}
                startDate={startDate}
                onStartDateChange={setStartDate}
                endDate={endDate}
                onEndDateChange={setEndDate}
            />
            <div className="overflow-auto flex-grow">
                <ConsolidatedInvoiceTable
                    quotes={targetQuotes}
                    selectedQuoteIds={selectedQuoteIds}
                    onToggleQuote={handleToggleQuote}
                    onToggleSelectAll={handleToggleSelectAll}
                />
            </div>
            <ConsolidatedSummary
                selectedCount={selectedQuotes.length}
                selectedTotal={selectedTotal}
                onGenerate={handleGenerateInvoice}
                canGenerate={selectedQuotes.length > 0}
            />
        </div>
        {printableData && <PrintableEstimate {...printableData} />}
      </>
    );
};

export default ConsolidatedInvoiceIssuance;