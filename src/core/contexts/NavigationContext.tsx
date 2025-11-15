import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
// FIX: The Page type has been moved to a new location.
import { Page } from '../config/Routes';

interface NavigationContextType {
    currentPage: Page;
    selectedTable: string;
    navigate: (page: Page, table?: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentPage, setCurrentPage] = useState<Page>('hub');
    const [selectedTable, setSelectedTable] = useState('quotes');

    const navigate = useCallback((page: Page, table?: string) => {
        setCurrentPage(page);
        if (table) {
            setSelectedTable(table);
        }
    }, []);

    return (
        <NavigationContext.Provider value={{ currentPage, selectedTable, navigate }}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = (): NavigationContextType => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};