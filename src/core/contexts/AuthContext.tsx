import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
// FIX: Corrected type import path to use `../components/types/index` instead of `../types/index`.
import { Row } from '../../shared/types';
import { useDatabase } from './DatabaseContext';

// FIX: Add 'id' property to CurrentUser interface.
interface CurrentUser extends Row {
  id: string;
  name: string;
  username: string;
  permissions: { [key: string]: any };
}

interface AuthContextType {
    currentUser: CurrentUser | null;
    login: (user: Row) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
        try {
            const storedUser = sessionStorage.getItem('currentUser');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (e) {
            return null;
        }
    });
    const { database } = useDatabase();

    const login = useCallback((user: Row) => {
        if (!database || !database.role_permissions) {
            console.error("Role permissions are not loaded, cannot log in.");
            return;
        }

        const rolePermission = database.role_permissions.data.find(p => p.role_id === user.role_id);
        let permissions: { [key: string]: any } = { can_view_all: true };
        if (rolePermission && typeof rolePermission.permissions === 'string') {
            try {
                permissions = JSON.parse(rolePermission.permissions);
            } catch (e) {
                console.error("Failed to parse permissions JSON for role:", user.role_id);
            }
        }
    
        const userWithPermissions = { ...user, permissions } as unknown as CurrentUser;
        setCurrentUser(userWithPermissions);
        sessionStorage.setItem('currentUser', JSON.stringify(userWithPermissions));
    }, [database]);

    const logout = useCallback(() => {
        if (window.confirm('ログアウトしますか？')) {
            setCurrentUser(null);
            sessionStorage.removeItem('currentUser');
            window.location.reload(); // Force a full app reload to clear all state and refetch data
        }
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};