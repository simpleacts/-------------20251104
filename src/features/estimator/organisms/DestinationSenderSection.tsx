import React, { useState } from 'react';
import { AppData, EstimatorState, Row } from '@shared/types';
import CustomerSearchModal from '@features/customermanagement/modals/CustomerSearchModal';
import EditCustomerModal from '@features/customermanagement/modals/EditCustomerModal';

interface DestinationSenderSectionProps {
    estimatorState: EstimatorState;
    setEstimatorState: React.Dispatch<React.SetStateAction<EstimatorState>>;
    customers: Row[];
    appData: AppData;
}

const DestinationSenderSection: React.FC<DestinationSenderSectionProps> = ({ 
    estimatorState, 
    setEstimatorState, 
    customers, 
    appData 
}) => {
    const [isCustomerSearchModalOpen, setIsCustomerSearchModalOpen] = useState(false);
    const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
    const [isSenderSearchModalOpen, setIsSenderSearchModalOpen] = useState(false);
    const [isEditSenderModalOpen, setIsEditSenderModalOpen] = useState(false);
    
    const handleCustomerSelect = (customer: Row) => { 
        setEstimatorState(prev => ({...prev, customerInfo: customer})); 
        setIsCustomerSearchModalOpen(false); 
    };

    const handleSaveCustomer = (updatedCustomer: Row) => { 
        setEstimatorState(prev => ({...prev, customerInfo: updatedCustomer})); 
        setIsEditCustomerModalOpen(false); 
    };

    const handleSenderSelect = (customer: Row) => {
        setEstimatorState(prev => ({...prev, senderInfo: customer}));
        setIsSenderSearchModalOpen(false);
    };

    const handleSaveNewSender = (newCustomer: Row) => {
        setEstimatorState(prev => ({...prev, senderInfo: newCustomer}));
        setIsEditSenderModalOpen(false);
    };
    
    const handleResetSender = () => {
        setEstimatorState(prev => ({ ...prev, senderInfo: appData.companyInfo }));
    };

    const senderInfo = estimatorState.senderInfo;
    const isCustomSender = senderInfo && 'company_name' in senderInfo;
    
    return (
        <>
            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md border border-base-200 dark:border-base-dark-300">
                <h2 className="text-xl font-bold mb-4">2. 宛先・送主</h2>
                
                {/* 宛先情報 */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">宛先情報</h3>
                    <div className="flex gap-4 mb-3">
                        <button 
                            onClick={() => setIsCustomerSearchModalOpen(true)} 
                            className="flex-1 text-sm bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark py-3 font-bold rounded-lg"
                        >
                            + 顧客を検索
                        </button>
                        <button 
                            onClick={() => setIsEditCustomerModalOpen(true)} 
                            className="flex-1 text-sm bg-gray-600 hover:bg-gray-700 text-white py-3 font-bold rounded-lg"
                        >
                            新規登録
                        </button>
                    </div>
                    {estimatorState.customerInfo.id && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 text-sm rounded-md">
                            <p><strong>選択中:</strong> {estimatorState.customerInfo.company_name || estimatorState.customerInfo.name_kanji} (ID: {estimatorState.customerInfo.id})</p>
                        </div>
                    )}
                </div>

                {/* 送り主情報 */}
                <div>
                    <h3 className="text-lg font-semibold mb-3">送り主情報</h3>
                    <div className="p-3 bg-base-100 dark:bg-base-dark-200 rounded-md text-sm mb-3" role="region" aria-label="送り主情報">
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
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setIsSenderSearchModalOpen(true)} 
                            className="text-sm text-link dark:text-link-dark hover:underline"
                        >
                            既存の顧客から選択
                        </button>
                        <button 
                            onClick={() => setIsEditSenderModalOpen(true)} 
                            className="text-sm text-link dark:text-link-dark hover:underline"
                        >
                            新規作成 / 編集
                        </button>
                        {isCustomSender && (
                            <button 
                                onClick={handleResetSender} 
                                className="text-sm text-link dark:text-link-dark hover:underline"
                            >
                                自社情報に戻す
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {isCustomerSearchModalOpen && <CustomerSearchModal isOpen={isCustomerSearchModalOpen} onClose={() => setIsCustomerSearchModalOpen(false)} onSelect={handleCustomerSelect} customers={customers} />}
            
            {isEditCustomerModalOpen && (
                <EditCustomerModal
                    isOpen={isEditCustomerModalOpen}
                    onClose={() => setIsEditCustomerModalOpen(false)}
                    customerData={estimatorState.customerInfo.id ? estimatorState.customerInfo : { isNew: true }}
                    onSave={handleSaveCustomer}
                    prefectures={appData.prefectures}
                    customerGroups={appData.customer_groups}
                />
            )}

            {isSenderSearchModalOpen && customers && (
                <CustomerSearchModal 
                    isOpen={isSenderSearchModalOpen}
                    onClose={() => setIsSenderSearchModalOpen(false)}
                    onSelect={handleSenderSelect}
                    customers={customers}
                />
            )}
            
            {isEditSenderModalOpen && appData.prefectures && appData.customer_groups && (
                <EditCustomerModal
                    isOpen={isEditSenderModalOpen}
                    onClose={() => setIsEditSenderModalOpen(false)}
                    customerData={{ isNew: true }}
                    onSave={handleSaveNewSender}
                    prefectures={appData.prefectures}
                    customerGroups={appData.customer_groups}
                />
            )}
        </>
    );
};

export default DestinationSenderSection;

