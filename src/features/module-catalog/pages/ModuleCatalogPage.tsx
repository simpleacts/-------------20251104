import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { Database, Row } from '@shared/types';
import { useTranslation } from '@shared/hooks/useTranslation';
import { SpinnerIcon, ChevronDownIcon } from '@components/atoms';
import { PageHeader } from '@components/molecules';

const ModuleCatalogTool: React.FC = () => {
    const { t } = useTranslation('module-catalog');
    const { database, setDatabase } = useDatabase();
    const [isLoading, setIsLoading] = useState(true);
    
    const MODULE_TABLES = useMemo(() => [
        { key: 'modules_core', name: t('module_catalog.category_core', 'コアモジュール') },
        { key: 'modules_page_tool', name: t('module_catalog.category_page_tool', 'ページ・ツール') },
        { key: 'modules_service', name: t('module_catalog.category_service', 'サービス') },
        { key: 'modules_ui_organisms', name: t('module_catalog.category_ui_organisms', 'UI - Organisms') },
        { key: 'modules_ui_molecules', name: t('module_catalog.category_ui_molecules', 'UI - Molecules') },
        { key: 'modules_ui_atoms', name: t('module_catalog.category_ui_atoms', 'UI - Atoms') },
        { key: 'modules_ui_modals', name: t('module_catalog.category_ui_modals', 'UI - Modals') },
        { key: 'modules_other', name: t('module_catalog.category_other', 'その他') },
    ], [t]);
    
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['modules_core', 'modules_page_tool', 'modules_service', 'modules_ui_organisms', 'modules_ui_molecules', 'modules_ui_atoms', 'modules_ui_modals', 'modules_other']));

    useEffect(() => {
        const loadModuleData = async () => {
            if (!database) return;
            setIsLoading(true);
            const tableKeys = MODULE_TABLES.map(t => t.key);
            const missingTables = tableKeys.filter(key => !database[key]);
            
            if (missingTables.length > 0) {
                try {
                    const fetchedData = await fetchTables(missingTables, { toolName: 'module-list' });
                    setDatabase(prev => ({ ...(prev || {}), ...fetchedData }));
                } catch (e) {
                    console.error("Failed to fetch module tables:", e);
                }
            }
            setIsLoading(false);
        };
        loadModuleData();
    }, [database, setDatabase]);

    const moduleGroups = useMemo(() => {
        if (!database) return [];
        return MODULE_TABLES.map(tableInfo => ({
            ...tableInfo,
            modules: (database[tableInfo.key]?.data as Row[] || []).sort((a, b) => (a.fileName || '').localeCompare(b.fileName || ''))
        })).filter(group => group.modules.length > 0);
    }, [database, MODULE_TABLES]);

    const toggleCategory = (key: string) => {
        setOpenCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title={t('module_catalog.title', 'モジュールカタログ')}
                description={t('module_catalog.description', 'アプリケーションを構成する全モジュールの一覧です。')}
            />
            {isLoading ? (
                <div className="flex-grow flex items-center justify-center">
                    <SpinnerIcon className="w-12 h-12 text-brand-primary" />
                </div>
            ) : (
                <div className="flex-grow overflow-y-auto mt-4 space-y-6">
                    {moduleGroups.map(group => (
                        <div key={group.key} className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
                            <h2
                                onClick={() => toggleCategory(group.key)}
                                className="text-xl font-bold mb-4 flex justify-between items-center cursor-pointer"
                            >
                                <span>{group.name} ({group.modules.length})</span>
                                <ChevronDownIcon className={`w-6 h-6 transition-transform ${openCategories.has(group.key) ? 'rotate-180' : ''}`} />
                            </h2>
                            {openCategories.has(group.key) && (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-base-200 dark:bg-base-dark-300">
                                            <tr>
                                                <th className="p-2 text-left w-1/3">{t('module_catalog.file_path', 'ファイルパス')}</th>
                                                <th className="p-2 text-left">{t('module_catalog.japanese_name', '日本語名')}</th>
                                                <th className="p-2 text-left">{t('module_catalog.type', 'タイプ')}</th>
                                                <th className="p-2 text-left w-1/3">{t('module_catalog.description_header', '説明')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.modules.map(module => (
                                                <tr key={module.id} className="border-t border-base-300 dark:border-base-dark-300">
                                                    <td className="p-2 font-mono">{module.fileName}</td>
                                                    <td className="p-2 font-semibold">{module.japaneseName}</td>
                                                    <td className="p-2 font-mono text-xs">{module.type}</td>
                                                    <td className="p-2">{module.description}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ModuleCatalogTool;