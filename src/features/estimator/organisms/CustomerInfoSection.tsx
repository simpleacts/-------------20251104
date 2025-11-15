
import React, { useState } from 'react';
import { AppData, EstimatorState, Row } from '@shared/types';
import CustomerSearchModal from '@features/customermanagement/modals/CustomerSearchModal';
import EditCustomerModal from '@features/customermanagement/modals/EditCustomerModal';

interface CustomerInfoSectionProps {
    estimatorState: EstimatorState;
    setEstimatorState: React.Dispatch<React.SetStateAction<EstimatorState>>;
    customers: Row[];
    appData: AppData;
}

const CustomerInfoSection: React.FC<CustomerInfoSectionProps> = ({ estimatorState, setEstimatorState, customers, appData }) => {
    const [isCustomerSearchModalOpen, setIsCustomerSearchModalOpen] = useState(false);
    const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
    
    const handleCustomerSelect = (customer: Row) => { 
        setEstimatorState(prev => ({...prev, customerInfo: customer})); 
        setIsCustomerSearchModalOpen(false); 
    };

    const handleSaveCustomer = (updatedCustomer: Row) => { 
        setEstimatorState(prev => ({...prev, customerInfo: updatedCustomer})); 
        setIsEditCustomerModalOpen(false); 
    };
    
    return (
        <>
            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md border border-base-200 dark:border-base-dark-300">
                <h2 className="text-xl font-bold mb-4">2. お客様情報の入力</h2>
                <div className="flex gap-4">
                    <button onClick={() => setIsCustomerSearchModalOpen(true)} className="flex-1 text-sm bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark py-3 font-bold rounded-lg">+ 顧客を検索</button>
                    <button onClick={() => setIsEditCustomerModalOpen(true)} className="flex-1 text-sm bg-gray-600 hover:bg-gray-700 text-white py-3 font-bold rounded-lg">新規登録</button>
                </div>
                {estimatorState.customerInfo.id && <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 text-sm rounded-md"><p><strong>選択中:</strong> {estimatorState.customerInfo.company_name || estimatorState.customerInfo.name_kanji} (ID: {estimatorState.customerInfo.id})</p></div>}
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
        </>
    );
};

// FIX: Add missing default export.
export default CustomerInfoSection;