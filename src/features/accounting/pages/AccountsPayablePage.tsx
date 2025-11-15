

import React, { useMemo, useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, Row } from '@shared/types';
import AddBillModal from '../components/accounts-payable/modals/AddBillModal';
import AccountsPayableList from '../components/accounts-payable/organisms/AccountsPayableList';

interface AccountsPayableToolProps {
    database: Partial<Database>;
    setDatabase: React.Dispatch<React.SetStateAction<Partial<Database> | null>>;
}

const AccountsPayableTool: React.FC<AccountsPayableToolProps> = ({ database, setDatabase }) => {
    const { t } = useTranslation('accounting');
    const [isAddBillModalOpen, setIsAddBillModalOpen] = useState(false);

    const vendors = useMemo(() => database.customers?.data.filter(c => c.is_vendor) || [], [database.customers]);
    
    const handleSaveBill = (data: { bill: Partial<Row>; newVendor?: { name: string } }) => {
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            
            let customerId = data.bill.customer_id;

            if (data.newVendor) {
                const newCustomerId = `cust_${Date.now()}`;
                const newCustomer: Row = {
                    id: newCustomerId,
                    company_name: data.newVendor.name,
                    name_kanji: data.newVendor.name,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    is_vendor: true,
                    status: 'active',
                    customer_group_id: db.customer_groups?.data[0]?.id || null
                };
                newDb.customers.data.push(newCustomer);
                customerId = newCustomerId;
            }

            const newBill = {
                ...data.bill,
                id: `bill_${Date.now()}`,
                customer_id: customerId,
            };
            newDb.bills.data.push(newBill);
            return newDb;
        });
        setIsAddBillModalOpen(false);
    };

    return (
      <>
        <div className="flex flex-col h-full">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">{t('accounting.payable.title', '買掛管理 (支払)')}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('accounting.payable.description', '仕入先への支払と状況を管理します。')}</p>
            </header>
            <div className="flex-grow min-h-0">
                <AccountsPayableList database={database} setDatabase={setDatabase} onAddBill={() => setIsAddBillModalOpen(true)} />
            </div>
        </div>
        <AddBillModal
            isOpen={isAddBillModalOpen}
            onClose={() => setIsAddBillModalOpen(false)}
            onSave={handleSaveBill}
            vendors={vendors}
        />
      </>
    );
};

export default AccountsPayableTool;