import React, { useEffect, useMemo, useState } from 'react';
import { getToolTranslationKey } from '@core/config/getToolDisplayName';
import { ALL_TOOLS, Page } from '@core/config/Routes';
import { useNavigation } from '@core/contexts/NavigationContext';
import { updateDatabase } from '@core/utils';
import { useCategorizedTables } from '@shared/hooks/useCategorizedTables';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, Row } from '@shared/types';
import { PencilSquareIcon, SpinnerIcon } from '@components/atoms';
import FieldVisibilityModal from '../modals/FieldVisibilityModal';

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; }> = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
    </label>
);

const PermissionManager: React.FC<{ database: Database; setDatabase: React.Dispatch<React.SetStateAction<Database | null>> }> = ({ database, setDatabase }) => {
    const { currentPage } = useNavigation();
    const { t } = useTranslation('user-manager');
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<Record<string, any>>({});
    const [initialPermissions, setInitialPermissions] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
    const [editingTable, setEditingTable] = useState<string>('');
    const { allTableNames, categorizedTables, TABLE_DISPLAY_NAMES } = useCategorizedTables();
    
    // ツール名の翻訳を取得
    const toolDisplayNames = useMemo(() => {
        const map = new Map<Page, string>();
        ALL_TOOLS.forEach(tool => {
            const key = getToolTranslationKey(tool.name);
            map.set(tool.name, t(key, tool.displayName));
        });
        return map;
    }, [t]);

    const roles = database.roles.data;

    const { tablePermissions, toolPermissions } = useMemo(() => {
        const tablePerms: Record<string, string[]> = {};
        allTableNames.forEach(table => {
            tablePerms[table] = [
                `can_view_table_${table}`, `can_edit_table_${table}`,
                `can_add_table_${table}`, `can_delete_table_${table}`,
            ];
        });
        const toolPerms: string[] = ALL_TOOLS.map(tool => `can_access_tool_${tool.name}`);
        return { tablePermissions: tablePerms, toolPermissions: toolPerms };
    }, [allTableNames]);

    useEffect(() => {
        if (roles.length > 0 && selectedRoleId === null) {
            setSelectedRoleId(roles[0].id as string);
        }
    }, [roles, selectedRoleId]);

    useEffect(() => {
        if (selectedRoleId === null) return;

        const rolePermission = database.role_permissions.data.find(p => p.role_id === selectedRoleId);
        let currentPerms: Record<string, any> = {};
        if (rolePermission && typeof rolePermission.permissions === 'string') {
            try {
                currentPerms = JSON.parse(rolePermission.permissions);
            } catch (e) {
                console.error("Failed to parse permissions JSON", e);
            }
        }
        
        const allKeys = [...Object.values(tablePermissions).flat(), ...toolPermissions];
        const fullPerms: Record<string, any> = { ...currentPerms };
        allKeys.forEach(key => {
            if (typeof fullPerms[key] === 'undefined') {
                fullPerms[key] = false;
            }
        });

        setPermissions(fullPerms);
        setInitialPermissions(fullPerms);
    }, [selectedRoleId, database.role_permissions.data, tablePermissions, toolPermissions]);

    const handleToggle = (key: string) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleToggleAllTools = () => {
        const allEnabled = toolPermissions.every(key => permissions[key]);
        const newPermissions = { ...permissions };
        toolPermissions.forEach(key => {
            newPermissions[key] = !allEnabled;
        });
        setPermissions(newPermissions);
    };

    const handleToggleAllTablePermissions = (permIndex: number) => {
        const allTableNames = Object.keys(tablePermissions);
        const allEnabled = allTableNames.every(tableName => {
            const permKey = tablePermissions[tableName]?.[permIndex];
            return permKey ? permissions[permKey] : true; // Default to true if perm key is somehow missing
        });

        const newPermissions = { ...permissions };
        allTableNames.forEach(tableName => {
            const permKey = tablePermissions[tableName]?.[permIndex];
            if (permKey) {
                 newPermissions[permKey] = !allEnabled;
            }
        });
        setPermissions(newPermissions);
    };

    const openFieldModal = (tableName: string) => {
        setEditingTable(tableName);
        setIsFieldModalOpen(true);
    };
    
    const handleSave = async () => {
        if (selectedRoleId === null) return;
        setIsLoading(true);

        const newPermissionsJson = JSON.stringify(permissions);
        
        // まずローカル状態を更新
        setDatabase(prevDb => {
            if (!prevDb) return null;
            const newDb = JSON.parse(JSON.stringify(prevDb));
            const permissionsTable = newDb.role_permissions;
            const existingRowIndex = permissionsTable.data.findIndex((p: Row) => p.role_id === selectedRoleId);
            
            if (existingRowIndex !== -1) {
                permissionsTable.data[existingRowIndex].permissions = newPermissionsJson;
            } else {
                permissionsTable.data.push({ role_id: selectedRoleId, permissions: newPermissionsJson });
            }
            return newDb;
        });

        // サーバーに保存
        try {
            const existing = database.role_permissions.data.find((p: Row) => p.role_id === selectedRoleId);
            const operation = existing
                ? [{ type: 'UPDATE' as const, data: { permissions: newPermissionsJson }, where: { role_id: selectedRoleId } }]
                : [{ type: 'INSERT' as const, data: { role_id: selectedRoleId, permissions: newPermissionsJson } }];
            
            const result = await updateDatabase(currentPage, 'role_permissions', operation, database);
            if (!result.success) {
                throw new Error(result.error || 'Failed to save permissions to server');
            }
            alert(t('permissions.saved', '権限設定を保存しました。'));
            setInitialPermissions(permissions);
        } catch (error) {
            console.error('[PermissionManager] Failed to save to server:', error);
            alert(t('permissions.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsLoading(false);
        }
    };

    const hasChanges = useMemo(() => JSON.stringify(permissions) !== JSON.stringify(initialPermissions), [permissions, initialPermissions]);
    const allToolsEnabled = useMemo(() => toolPermissions.length > 0 && toolPermissions.every(key => permissions[key]), [permissions, toolPermissions]);
    const allViewEnabled = useMemo(() => Object.keys(tablePermissions).length > 0 && Object.keys(tablePermissions).every(tableName => permissions[tablePermissions[tableName][0]]), [permissions, tablePermissions]);
    const allEditEnabled = useMemo(() => Object.keys(tablePermissions).length > 0 && Object.keys(tablePermissions).every(tableName => permissions[tablePermissions[tableName][1]]), [permissions, tablePermissions]);
    const allAddEnabled = useMemo(() => Object.keys(tablePermissions).length > 0 && Object.keys(tablePermissions).every(tableName => permissions[tablePermissions[tableName][2]]), [permissions, tablePermissions]);
    const allDeleteEnabled = useMemo(() => Object.keys(tablePermissions).length > 0 && Object.keys(tablePermissions).every(tableName => permissions[tablePermissions[tableName][3]]), [permissions, tablePermissions]);


    return (
        <>
            <div className="flex flex-col h-full">
                <header className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">{t('permissions.title', '権限管理ツール')}</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('permissions.description', 'ロールごとの機能アクセスとデータ操作権限を設定します。')}</p>
                    </div>
                </header>

                <div className="flex-grow flex flex-col bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
                    <div className="flex-shrink-0 flex items-center gap-4 mb-4 pb-4 border-b border-base-300 dark:border-base-dark-300">
                        <label htmlFor="role-select" className="font-semibold">{t('permissions.select_role', 'ロールを選択:')}</label>
                        <select id="role-select" name="role-select" value={selectedRoleId || ''} onChange={e => setSelectedRoleId(e.target.value)} className="p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark">
                            {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                        </select>
                    </div>

                    <div className="flex-grow overflow-y-auto pr-2">
                        <section className="mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-bold">{t('permissions.tool_access', 'ツールアクセス権限')}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium">{t('permissions.toggle_all', 'すべて切り替え')}</span>
                                    <ToggleSwitch checked={allToolsEnabled} onChange={handleToggleAllTools} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {ALL_TOOLS.map(tool => (
                                    <div key={tool.name} className="flex items-center justify-between p-2 bg-base-200 dark:bg-base-dark-300 rounded">
                                        <span className="text-sm">{toolDisplayNames.get(tool.name) || tool.displayName}</span>
                                        <ToggleSwitch checked={permissions[`can_access_tool_${tool.name}`] || false} onChange={() => handleToggle(`can_access_tool_${tool.name}`)} />
                                    </div>
                                ))}
                            </div>
                        </section>
                        
                        <section>
                            <h3 className="text-lg font-bold mb-3">{t('permissions.table_access', 'データテーブル権限')}</h3>
                            <table className="min-w-full text-sm">
                                <thead className="sticky top-0 bg-base-200 dark:bg-base-dark-300 z-10">
                                    <tr>
                                        <th className="p-2 text-left">{t('permissions.table_name', 'テーブル名')}</th>
                                        <th className="p-2 text-center">
                                            <div className="flex flex-col items-center">
                                                {t('permissions.view', '表示/閲覧')}
                                                <ToggleSwitch checked={allViewEnabled} onChange={() => handleToggleAllTablePermissions(0)} />
                                            </div>
                                        </th>
                                        <th className="p-2 text-center">
                                            <div className="flex flex-col items-center">
                                                {t('permissions.edit', '編集')}
                                                <ToggleSwitch checked={allEditEnabled} onChange={() => handleToggleAllTablePermissions(1)} />
                                            </div>
                                        </th>
                                        <th className="p-2 text-center">
                                            <div className="flex flex-col items-center">
                                                {t('permissions.add', '追加')}
                                                <ToggleSwitch checked={allAddEnabled} onChange={() => handleToggleAllTablePermissions(2)} />
                                            </div>
                                        </th>
                                        <th className="p-2 text-center">
                                            <div className="flex flex-col items-center">
                                                {t('permissions.delete', '削除')}
                                                <ToggleSwitch checked={allDeleteEnabled} onChange={() => handleToggleAllTablePermissions(3)} />
                                            </div>
                                        </th>
                                        <th className="p-2 text-center">{t('permissions.field_settings', '項目設定')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(categorizedTables || []).map(({ category, tables }) => (
                                        <React.Fragment key={category}>
                                            <tr className="bg-base-200 dark:bg-base-dark-300">
                                                <td colSpan={6} className="p-2 font-bold text-base-content dark:text-base-dark-content">
                                                    {t(`categories.${category}`, category)}
                                                </td>
                                            </tr>
                                            {tables.map(tableName => (
                                                <tr key={tableName} className="border-t border-base-300 dark:border-base-dark-300">
                                                    <td className="p-2 font-medium">{t(`tables.${tableName}`, TABLE_DISPLAY_NAMES[tableName] || tableName)}</td>
                                                    <td className="p-2 text-center"><ToggleSwitch checked={permissions[tablePermissions[tableName][0]] || false} onChange={() => handleToggle(tablePermissions[tableName][0])} /></td>
                                                    <td className="p-2 text-center"><ToggleSwitch checked={permissions[tablePermissions[tableName][1]] || false} onChange={() => handleToggle(tablePermissions[tableName][1])} /></td>
                                                    <td className="p-2 text-center"><ToggleSwitch checked={permissions[tablePermissions[tableName][2]] || false} onChange={() => handleToggle(tablePermissions[tableName][2])} /></td>
                                                    <td className="p-2 text-center"><ToggleSwitch checked={permissions[tablePermissions[tableName][3]] || false} onChange={() => handleToggle(tablePermissions[tableName][3])} /></td>
                                                    <td className="p-2 text-center">
                                                        <button onClick={() => openFieldModal(tableName)} className="p-1 text-gray-500 hover:text-blue-600">
                                                            <PencilSquareIcon className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    </div>
                     <div className="flex-shrink-0 flex justify-end items-center gap-4 mt-4 pt-4 border-t border-base-300 dark:border-base-dark-300">
                        {hasChanges && <span className="text-sm text-yellow-600 animate-pulse">{t('permissions.unsaved_changes', '未保存の変更があります')}</span>}
                        <button onClick={handleSave} disabled={isLoading || !hasChanges} className="px-6 py-2 text-sm font-bold rounded-md bg-brand-primary text-white hover:bg-blue-800 disabled:bg-gray-400 flex items-center justify-center gap-2">
                            {isLoading ? <SpinnerIcon className="w-5 h-5"/> : t('permissions.save_changes', '変更を保存')}
                        </button>
                    </div>
                </div>
            </div>

            {isFieldModalOpen && editingTable && (
                <FieldVisibilityModal
                    isOpen={isFieldModalOpen}
                    onClose={() => setIsFieldModalOpen(false)}
                    tableName={editingTable}
                    schema={database[editingTable]?.schema || []}
                    permissions={permissions}
                    onPermissionsChange={setPermissions}
                />
            )}
        </>
    );
};

export default PermissionManager;