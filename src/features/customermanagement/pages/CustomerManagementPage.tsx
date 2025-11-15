import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { fetchTables } from '@core/data/db.live';
import { updateDatabase } from '@core/utils';
import useAppSettings from '@features/display-settings/hooks/useAppSettings';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, Row, Table } from '@shared/types';
import { SpinnerIcon } from '@components/atoms';
import { PageHeader } from '@components/molecules';
import DataTable from '@components/organisms/DataTable';
import CustomerDetailsModal from '../modals/CustomerDetailsModal';
import EditCustomerModal from '../modals/EditCustomerModal';
import CustomerGrid from '../organisms/CustomerGrid';
import CustomerToolbar from '../organisms/CustomerToolbar';

const CustomerManagementTool: React.FC = () => {
    const { t } = useTranslation('customermanagement');
    const { database, setDatabase } = useDatabase();
    const { currentPage } = useNavigation();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<Row | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [groupFilter, setGroupFilter] = useState('all');
    const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState<Row | null>(null);
    const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Row | null>(null);

    useEffect(() => {
        const userStr = sessionStorage.getItem('currentUser');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }

        const loadData = async () => {
            if (!database) {
                setIsLoading(true);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const requiredTables = ['customers', 'customer_groups', 'quotes', 'pagination_settings', 'prefectures'];
                const missingTables = requiredTables.filter(t => !database[t]);
                if (missingTables.length > 0) {
                    const data = await fetchTables(missingTables, { toolName: 'customer-management' });
                    setDatabase(prev => ({ ...prev, ...data }));
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : t('customer.load_failed', 'データの読み込みに失敗しました。'));
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [database, setDatabase]);

    // useAppSettingsからページネーション設定を取得（一貫性のため）
    const { getPaginationConfigFor } = useAppSettings();
    const paginationConfig = useMemo(() => {
        return getPaginationConfigFor('customers');
    }, [getPaginationConfigFor]);
    
    const [pageNumber, setPageNumber] = useState(1);

    const customerGroups = useMemo(() => {
        if (!database?.customer_groups?.data) return [{ id: 'all', name: t('customer.all_groups', 'すべて') }];
        return [{ id: 'all', name: t('customer.all_groups', 'すべて') }, ...database.customer_groups.data];
    }, [database?.customer_groups, t]);
    
    const enrichedCustomers: Row[] = useMemo(() => {
        if (!database?.customers?.data || !database?.customer_groups?.data) return [];
        const customers = database.customers.data;
        const groupsMap = new Map(database.customer_groups.data.map(g => [g.id, g.name]));
        return customers.map((c: Row) => ({ ...c, groupName: groupsMap.get(c.customer_group_id as string) || t('customer.default_group', '一般') }));
    }, [database?.customers, database?.customer_groups, t]);
    
    const filteredCustomers = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        
        return enrichedCustomers.filter(customer => {
            const matchesGroup = groupFilter === 'all' || customer.customer_group_id === groupFilter;
            const matchesSearch = searchTerm === '' ||
                String(customer.id).toLowerCase().includes(lowerSearchTerm) ||
                String(customer.company_name || '').toLowerCase().includes(lowerSearchTerm) ||
                String(customer.name_kanji || '').toLowerCase().includes(lowerSearchTerm) ||
                String(customer.phone || '').toLowerCase().includes(lowerSearchTerm) ||
                String(customer.email || '').toLowerCase().includes(lowerSearchTerm);

            return matchesGroup && matchesSearch;
        });
    }, [enrichedCustomers, searchTerm, groupFilter]);

    const paginatedCustomers = useMemo(() => {
        if (!paginationConfig.enabled) return filteredCustomers;
        const startIndex = (pageNumber - 1) * paginationConfig.itemsPerPage;
        return filteredCustomers.slice(startIndex, startIndex + paginationConfig.itemsPerPage);
    }, [filteredCustomers, pageNumber, paginationConfig]);

    const totalPages = useMemo(() => {
        if (!paginationConfig.enabled) return 1;
        return Math.ceil(filteredCustomers.length / paginationConfig.itemsPerPage);
    }, [filteredCustomers, paginationConfig]);
    
    useEffect(() => { setPageNumber(1); }, [searchTerm, groupFilter, viewMode]);
    
    const updateBothDatabases = useCallback((updater: (db: Partial<Database> | null) => Partial<Database> | null) => {
        setDatabase(updater);
    }, [setDatabase]);

    const handleOpenEdit = (e: React.MouseEvent, customer: Row | null) => {
        e.stopPropagation();
        setSelectedCustomerForEdit(customer || { isNew: true });
    };

    const handleSaveCustomer = async (updatedData: Row) => {
        const now = new Date().toISOString();
        const isNew = updatedData.isNew;
        const customerId = isNew ? `cust_${Date.now()}` : updatedData.id;
        
        // notesフィールドを除外（customersテーブルに存在しない）
        const { notes, ...dataWithoutNotes } = updatedData;
        
        // まずローカル状態を更新
        updateBothDatabases(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const customersTable = newDb.customers as Table;
    
            if (isNew) {
                delete dataWithoutNotes.isNew;
                customersTable.data.push({
                    ...dataWithoutNotes,
                    id: customerId,
                    created_at: now,
                    updated_at: now,
                });
            } else {
                const index = customersTable.data.findIndex((c: Row) => c.id === customerId);
                if (index !== -1) {
                    customersTable.data[index] = { 
                        ...customersTable.data[index],
                        ...dataWithoutNotes, 
                        updated_at: now 
                    };
                }
            }
            return newDb;
        });

        // サーバーに保存
        try {
            const operation = isNew 
                ? [{ type: 'INSERT' as const, data: { ...dataWithoutNotes, id: customerId, created_at: now, updated_at: now } }]
                : [{ type: 'UPDATE' as const, data: { ...dataWithoutNotes, updated_at: now }, where: { id: customerId } }];
            
            const result = await updateDatabase(currentPage, 'customers', operation, database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to save customer to server');
            }
        } catch (error) {
            console.error('[CustomerManagement] Failed to save customer to server:', error);
            alert(t('customer.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }

        setSelectedCustomerForEdit(null);
        if(selectedCustomerForDetails && selectedCustomerForDetails.id === customerId) {
            setSelectedCustomerForDetails({ ...updatedData, id: customerId }); // Refresh details view
        }
    };

    const handleDeleteCustomer = async (e: React.MouseEvent, customerId: string) => {
        e.stopPropagation();
        if (window.confirm(t('customer.delete_confirm', '顧客ID「{id}」を削除しますか？この操作は元に戻せません。').replace('{id}', customerId))) {
            // まずローカル状態から削除
            updateBothDatabases(db => {
                if (!db) return null;
                const newDb = JSON.parse(JSON.stringify(db));
                newDb.customers.data = newDb.customers.data.filter((c: Row) => c.id !== customerId);
                return newDb;
            });

            // サーバーから削除
            try {
                const result = await updateDatabase(
                    currentPage,
                    'customers',
                    [{ type: 'DELETE' as const, where: { id: customerId } }],
                    database
                );
                if (!result.success) {
                    throw new Error(result.error || 'Failed to delete customer from server');
                }
            } catch (error) {
                console.error('[CustomerManagement] Failed to delete customer from server:', error);
                alert(t('customer.delete_failed', 'サーバーからの削除に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
            }
        }
    };
    
    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><SpinnerIcon className="w-12 h-12 text-brand-primary" /></div>;
    }
    if (error) {
        return <div className="text-red-600 p-4">{error}</div>;
    }
    if (!database || !currentUser || !database.customers) {
        return <div className="text-gray-500 p-4">{t('customer.load_failed', 'データの読み込みに失敗しました。')}</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title={t('customer.title', '取引先管理')}
                description={t('customer.description', '顧客・仕入先情報を一元管理し、案件履歴を確認します。')}
            />

            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md overflow-hidden flex flex-col">
                <CustomerToolbar
                    customerGroups={customerGroups}
                    groupFilter={groupFilter}
                    setGroupFilter={setGroupFilter}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    onAddNew={(e) => handleOpenEdit(e, null)}
                />
                <div className="overflow-auto flex-grow">
                   {viewMode === 'grid' ? (
                       <CustomerGrid
                            customers={paginatedCustomers}
                            totalItems={filteredCustomers.length}
                            onSelect={setSelectedCustomerForDetails}
                            onEdit={handleOpenEdit}
                            onDelete={handleDeleteCustomer}
                            currentPage={pageNumber}
                            totalPages={totalPages}
                            onPageChange={setPageNumber}
                            paginationEnabled={paginationConfig.enabled}
                        />
                   ) : (
                       <DataTable
                           schema={database.customers.schema}
                           data={filteredCustomers}
                           tableName="customers"
                           onUpdateRow={() => {}} // Handled by modals
                           onDeleteRow={(rowIndex) => {
                                const customer = filteredCustomers[rowIndex];
                                if (customer) {
                                    const dummyEvent = { stopPropagation: () => {} } as React.MouseEvent;
                                    handleDeleteCustomer(dummyEvent, customer.id as string);
                                }
                           }}
                           skipDeleteConfirm={false}
                           onOpenEditModal={(rowIndex) => {
                                const customer = filteredCustomers[rowIndex];
                                setSelectedCustomerForEdit(customer);
                           }}
                           permissions={(currentUser as any).permissions}
                           paginationConfig={paginationConfig}
                           customerGroups={database.customer_groups.data}
                       />
                   )}
                </div>
            </div>

            {selectedCustomerForDetails && (
                <CustomerDetailsModal
                    isOpen={!!selectedCustomerForDetails}
                    onClose={() => setSelectedCustomerForDetails(null)}
                    customer={selectedCustomerForDetails}
                    database={database as Database}
                    onEdit={(customer) => {
                        setSelectedCustomerForDetails(null);
                        setSelectedCustomerForEdit(customer);
                    }}
                />
            )}

            {selectedCustomerForEdit && database.prefectures && database.customer_groups && (
                <EditCustomerModal
                    isOpen={!!selectedCustomerForEdit}
                    onClose={() => setSelectedCustomerForEdit(null)}
                    customerData={selectedCustomerForEdit}
                    onSave={handleSaveCustomer}
                    prefectures={database.prefectures.data}
                    customerGroups={database.customer_groups.data}
                />
            )}
        </div>
    );
};

export default CustomerManagementTool;