
import React from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Column } from '@shared/types';
import { XMarkIcon, ToggleSwitch } from '@components/atoms';

const FieldVisibilityModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
    schema: Column[];
    permissions: Record<string, any>;
    onPermissionsChange: (newPermissions: Record<string, any>) => void;
}> = ({ isOpen, onClose, tableName, schema, permissions, onPermissionsChange }) => {
    const { t } = useTranslation('user-manager');
    
    if (!isOpen) return null;

    const handleToggle = (fieldId: string) => {
        const newPermissions = JSON.parse(JSON.stringify(permissions));
        if (!newPermissions.field_visibility) {
            newPermissions.field_visibility = {};
        }
        if (!newPermissions.field_visibility[tableName]) {
            newPermissions.field_visibility[tableName] = {};
        }
        
        const currentVisibility = newPermissions.field_visibility[tableName][fieldId];
        // If undefined (not set), it's visible by default, so toggling should make it invisible (false).
        newPermissions.field_visibility[tableName][fieldId] = currentVisibility === false ? true : false;
        
        onPermissionsChange(newPermissions);
    };

    const isVisible = (fieldId: string) => {
        return permissions.field_visibility?.[tableName]?.[fieldId] !== false;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">{t('field_visibility.title', '項目表示設定')}: {t(`tables.${tableName}`, tableName)}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="overflow-y-auto p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {schema.map(column => (
                            <div key={column.id} className="flex items-center justify-between p-2 bg-base-200 dark:bg-base-dark-300 rounded">
                                <span className="text-sm truncate" title={column.name}>{column.name}</span>
                                <ToggleSwitch checked={isVisible(column.id)} onChange={() => handleToggle(column.id)} />
                            </div>
                        ))}
                    </div>
                </main>
                <footer className="p-4 bg-base-200 dark:bg-base-dark-300/50 border-t border-base-300 dark:border-base-dark-300 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-800">
                        {t('field_visibility.close', '閉じる')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default FieldVisibilityModal;
