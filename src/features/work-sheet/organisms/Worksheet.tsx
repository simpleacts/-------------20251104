
import React from 'react';
import { CanvasState, CompanyInfoData } from '@shared/types';
import { QuoteData } from '@features/order-management/types';
// FIX: Corrected import path for PdfRenderer component after it was moved.
import PdfRenderer from '../../pdf-template-manager/organisms/PdfRenderer';

const Worksheet: React.FC<{ data: QuoteData, selectedCanvases: CanvasState[], notes: string, companyInfo?: CompanyInfoData }> = (props) => {
    // This component now acts as a simple wrapper that prepares data for the unified PdfRenderer.
    // The actual layout is now defined in pdf_templates.csv under `tpl_worksheet_standard`.
    
    // In the new architecture, the WorksheetGenerator will call PdfRenderer directly
    // or through PrintableEstimate. This component is kept for structural integrity
    // but its direct layout rendering responsibility is removed to ensure consistency.

    const renderData = {
        blocks: [], // These would be loaded from the worksheet template
        margins: { top: 15, right: 15, bottom: 15, left: 15 },
        database: {} as any, // This would need to be passed down if used directly
        documentType: 'worksheet' as 'worksheet',
        orderDetails: props.data.items,
        cost: {
            // Cost is not typically shown in detail on a worksheet
            totalCost: 0,
            shippingCost: 0,
            tax: 0,
            totalCostWithTax: 0,
            costPerShirt: 0,
            tshirtCost: 0,
            setupCost: 0,
            printCost: 0,
            additionalOptionsCost: 0,
            printCostDetail: {} as any,
            setupCostDetail: {},
            additionalOptionsCostDetail: {},
        },
        totalQuantity: props.data.totals.grandTotal,
        customerInfo: props.data.customer as any,
        companyInfo: props.companyInfo,
        estimateId: props.data.quote.quote_code,
        processingGroups: [{
            id: String(props.data.quote.id),
            name: String(props.data.product.name),
            items: props.data.items,
            printDesigns: props.selectedCanvases.map(c => c.layers).flat() as any, // Simplified
        }],
        notes: props.notes,
        selectedCanvases: props.selectedCanvases
    };

    return (
        <div className="bg-worksheet-bg text-worksheet-text shadow-lg mx-auto mb-4 printable-worksheet" style={{ width: '210mm', minHeight: '297mm' }}>
           {/* The unified PdfRenderer would be used here to render the content based on a template.
               Since WorksheetGenerator now handles this directly, this component becomes a placeholder.
               If it were to be used, it would look something like this:
               <PdfRenderer {...renderData} />
            */}
             <div className="p-8 text-center text-gray-400">
                This component is now rendered by PdfRenderer for consistency.
             </div>
        </div>
    );
};

export default Worksheet;