import React, { useEffect, useMemo, useState } from 'react';
// FIX: Corrected import path for types.
import { AppData, CostDetails, Database, EstimatorState, OrderDetail, Row } from '@shared/types';
// FIX: Corrected import path for PrintableEstimate from '../PrintableEstimate' to '../../shared/pdf-preview/PrintableEstimate'.
import CustomerSearchModal from '../../customermanagement/modals/CustomerSearchModal';
import EditCustomerModal from '../../customermanagement/modals/EditCustomerModal';

interface QuoteIssuanceSectionProps {
    estimatorState: EstimatorState;
    setEstimatorState: React.Dispatch<React.SetStateAction<EstimatorState>>;
    costDetails: CostDetails;
    onSaveAndIssue?: () => void;
    database: Database;
    updatedItems: OrderDetail[];
    appData: AppData;
    setDatabase?: React.Dispatch<React.SetStateAction<Database | null>>;
    selectedTemplateId: string | null;
    onTemplateIdChange: (templateId: string | null) => void;
}

const QuoteIssuanceSection: React.FC<QuoteIssuanceSectionProps> = (props) => {
    const { estimatorState, setEstimatorState, database, updatedItems, appData, selectedTemplateId, onTemplateIdChange } = props;

    const [isCustomerSearchModalOpen, setIsCustomerSearchModalOpen] = useState(false);
    const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);

    const estimateTemplates = useMemo(() => {
        return database.pdf_templates?.data.filter(t => t.type === 'estimate') || [];
    }, [database.pdf_templates]);

    useEffect(() => {
        if (!selectedTemplateId && estimateTemplates.length > 0) {
            onTemplateIdChange(estimateTemplates[0].id as string);
        }
    }, [estimateTemplates, selectedTemplateId, onTemplateIdChange]);
    
    const totalQuantity = useMemo(() => estimatorState.processingGroups.flatMap(g => g.items).reduce((sum, item) => sum + item.quantity, 0), [estimatorState.processingGroups]);
    
    const customerInfoForComponents = useMemo(() => ({
        companyName: estimatorState.customerInfo.company_name as string || '',
        nameKanji: estimatorState.customerInfo.name_kanji as string || '',
        nameKana: estimatorState.customerInfo.name_kana as string || '',
        email: estimatorState.customerInfo.email as string || '',
        phone: estimatorState.customerInfo.phone as string || '',
        zipCode: estimatorState.customerInfo.zip_code as string || '',
        address1: estimatorState.customerInfo.address1 as string || '',
        address2: estimatorState.customerInfo.address2 as string || '',
        notes: estimatorState.customerInfo.notes as string || '',
        customer_group_id: estimatorState.customerInfo.customer_group_id as string || 'cgrp_00001',
        has_separate_shipping_address: !!estimatorState.customerInfo.has_separate_shipping_address,
        shipping_name: estimatorState.customerInfo.shipping_name as string || '',
        shipping_phone: estimatorState.customerInfo.shipping_phone as string || '',
        shipping_zip_code: estimatorState.customerInfo.shipping_zip_code as string || '',
        shipping_address1: estimatorState.customerInfo.shipping_address1 as string || '',
        shipping_address2: estimatorState.customerInfo.shipping_address2 as string || ''
    }), [estimatorState.customerInfo]);

    const handleSenderSelect = (customer: Row) => {
        setEstimatorState(prev => ({...prev, senderInfo: customer}));
        setIsCustomerSearchModalOpen(false);
    };

    const handleSaveNewSender = (newCustomer: Row) => {
        setEstimatorState(prev => ({...prev, senderInfo: newCustomer}));
        setIsEditCustomerModalOpen(false);
    };
    
    const handleResetSender = () => {
        setEstimatorState(prev => ({ ...prev, senderInfo: appData.companyInfo }));
    };

    const senderInfo = estimatorState.senderInfo;
    const isCustomSender = senderInfo && 'company_name' in senderInfo;

    // FIX: Calculate blocks and margins to pass to PrintableEstimate
    const { blocks, margins } = useMemo(() => {
        if (!selectedTemplateId) return { blocks: [], margins: { top: 20, right: 15, bottom: 20, left: 15 } };
        const template = estimateTemplates.find(t => t.id === selectedTemplateId);
        if (template?.config_json) {
            try {
                const config = JSON.parse(template.config_json as string);
                return {
                    blocks: config.blocks || [],
                    margins: config.margins || { top: 20, right: 15, bottom: 20, left: 15 }
                };
            } catch (e) {
                console.error("Failed to parse template config", e);
            }
        }
        return { blocks: [], margins: { top: 20, right: 15, bottom: 20, left: 15 } };
    }, [selectedTemplateId, estimateTemplates]);

    return (
        <>
            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md border border-base-200 dark:border-base-dark-300">
                <h2 className="text-xl font-bold mb-4">3. 内容確認と見積書発行</h2>
                
                <div className="mb-4">
                    <div className="block text-sm font-medium mb-1">送り主情報</div>
                    <div className="p-3 bg-base-100 dark:bg-base-dark-200 rounded-md text-sm" role="region" aria-label="送り主情報">
                        {senderInfo ? (
                            isCustomSender ? (
                                <>
                                    <p><strong>{(senderInfo as Row).company_name || (senderInfo as Row).name_kanji}</strong></p>
                                    <p className="text-xs text-muted dark:text-muted-dark">{(senderInfo as Row).address1}</p>
                                </>
                            ) : (
                                <>
                                    <p><strong>{(senderInfo as any).companyName} (自社)</strong></p>
                                    <p className="text-xs text-muted dark:text-muted-dark">{(senderInfo as any).address}</p>
                                </>
                            )
                        ) : <p>送り主情報が設定されていません。</p>}
                    </div>
                    <div className="flex gap-4 mt-2">
                        <button onClick={() => setIsCustomerSearchModalOpen(true)} className="text-sm text-link dark:text-link-dark hover:underline">既存の顧客から選択</button>
                        <button onClick={() => setIsEditCustomerModalOpen(true)} className="text-sm text-link dark:text-link-dark hover:underline">新規作成 / 編集</button>
                        {isCustomSender && (
                            <button onClick={handleResetSender} className="text-sm text-link dark:text-link-dark hover:underline">自社情報に戻す</button>
                        )}
                    </div>
                </div>

                <div className="flex items-end gap-4 border-t pt-4 mt-4">
                    <div className="flex-grow">
                        <label htmlFor="pdf-template-select" className="block text-sm font-medium mb-1">PDFテンプレート</label>
                        <select
                            id="pdf-template-select"
                            name="pdf_template_select"
                            value={selectedTemplateId || ''}
                            onChange={e => onTemplateIdChange(e.target.value || null)}
                            className="w-full bg-base-200 dark:bg-base-dark-300 border border-default rounded-md px-3 py-2 text-sm"
                        >
                            {estimateTemplates.map(template => (
                                <option key={template.id as string} value={template.id as string}>{template.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            
            {isCustomerSearchModalOpen && database.customers && (
                 <CustomerSearchModal 
                    isOpen={isCustomerSearchModalOpen}
                    onClose={() => setIsCustomerSearchModalOpen(false)}
                    onSelect={handleSenderSelect}
                    customers={database.customers.data}
                 />
            )}
            
            {isEditCustomerModalOpen && database.prefectures && database.customer_groups && (
                <EditCustomerModal
                    isOpen={isEditCustomerModalOpen}
                    onClose={() => setIsEditCustomerModalOpen(false)}
                    customerData={{ isNew: true }}
                    onSave={handleSaveNewSender}
                    prefectures={database.prefectures.data}
                    customerGroups={database.customer_groups.data}
                />
            )}
        </>
    );
};

export default QuoteIssuanceSection;