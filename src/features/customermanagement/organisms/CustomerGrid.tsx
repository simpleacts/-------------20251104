import React from 'react';
import { Row } from '@shared/types';
import { Pagination } from '@components/molecules';
import CustomerCard from '../molecules/CustomerCard';

interface CustomerGridProps {
    customers: Row[];
    totalItems: number;
    onSelect: (customer: Row) => void;
    onEdit: (e: React.MouseEvent, customer: Row) => void;
    onDelete: (e: React.MouseEvent, customerId: string) => void;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    paginationEnabled: boolean;
}

const CustomerGrid: React.FC<CustomerGridProps> = ({
    customers,
    totalItems,
    onSelect,
    onEdit,
    onDelete,
    currentPage,
    totalPages,
    onPageChange,
    paginationEnabled,
}) => {
    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {customers.map(customer => (
                    <CustomerCard
                        key={customer.id as string}
                        customer={customer}
                        onSelect={() => onSelect(customer)}
                        onEdit={(e) => onEdit(e, customer)}
                        onDelete={(e) => onDelete(e, customer.id as string)}
                    />
                ))}
            </div>
            {paginationEnabled && totalPages > 1 && (
                <div className="mt-6">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={onPageChange}
                        totalItems={totalItems}
                    />
                </div>
            )}
        </>
    );
};

export default CustomerGrid;