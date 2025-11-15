import React from 'react';
import { Row, Database } from '../../shared/types';
// FIX: The Sidebar component has been moved to a new location.
import { ALL_TOOLS, Page } from './Routes';
import { COMMON_LANGUAGE_TABLE } from '../../shared/utils/languageUtils';
import { getToolTranslationKey } from './getToolDisplayName';

interface CurrentUser extends Row {
  id: string;
  name: string;
  username: string;
  permissions: { [key: string]: any };
}

const getIcon = (iconName: string | undefined | null) => {
    if (!iconName) return <i className="fa-solid fa-question-circle w-5 text-center"></i>;

    // List of known brand icons that require the `fa-brands` style prefix.
    const brandIcons = ['fa-google'];

    if (iconName.startsWith('fa-')) {
        // Determine if the icon is a brand icon to apply the correct style prefix.
        const iconStyle = brandIcons.includes(iconName) ? 'fa-brands' : 'fa-solid';
        return <i className={`${iconStyle} ${iconName} w-5 text-center`}></i>;
    }
    // Here you could add logic for other icon libraries if needed
    return <i className="fa-solid fa-puzzle-piece w-5 text-center"></i>;
};

const HARDCODED_GROUP_DEFINITIONS: Record<string, { icon: string, tools: string[] }> = {
    '主要機能': {
        icon: 'fa-star',
        tools: ['hub', 'order-management', 'ai-task-management', 'production-scheduler', 'customer-management', 'email-tool']
    },
    '見積・帳票': {
        icon: 'fa-file-invoice',
        tools: ['estimator', 'proofing', 'worksheet', 'document-management']
    },
    '会計': {
        icon: 'fa-calculator',
        tools: ['accounts-receivable', 'accounts-payable', 'cash-flow-analysis']
    },
    '分析・記録': {
        icon: 'fa-chart-line',
        tools: ['task-analysis', 'work-record']
    },
    'マスタ設定': {
        icon: 'fa-cogs',
        tools: ['product-management', 'product-definition-tool', 'inventory-management', 'pricing-manager', 'pricing-assistant', 'shipping-logic-tool']
    },
    '製造・印刷設定': {
        icon: 'fa-print',
        tools: ['production-settings', 'task-settings', 'print-history', 'ink-mixing', 'ink-series-management', 'ink-product-management', 'color-library-manager', 'dtf-cost-calculator', 'silkscreen-logic-tool', 'dtf-logic-tool']
    },
    'データ連携': {
        icon: 'fa-exchange-alt',
        tools: ['data-io', 'image-converter', 'image-batch-linker']
    },
    'システム管理': {
        icon: 'fa-shield-halved',
        tools: ['user-manager', 'permission-manager', 'id-manager', 'google-api-settings', 'email-settings', 'display-settings', 'estimator-settings', 'pdf-template-manager', 'pdf-item-group-manager', 'pdf-preview-settings', 'backup-manager', 'system-logs', 'language-manager', 'database-schema-manager']
    },
    '開発ツール': {
        icon: 'fa-code',
        tools: ['dev-management', 'dev-tools', 'dev-lock-manager', 'tool-porting-manager', 'tool-guide', 'tool-dependency-manager', 'calculation-logic-manager', 'tool-dependency-scanner', 'architecture-designer', 'php-info-viewer', 'system-diagnostics', 'module-list']
    }
};


export const getToolGroups = (currentUser: CurrentUser | null, database: Partial<Database> | null) => {
    // Return early if data is not ready, without logging a warning for expected initial states.
    if (!currentUser || !currentUser.permissions) {
        if (currentUser && !currentUser.permissions) { // Only warn if user exists but permissions are missing
            console.warn('[getToolGroups] currentUser or permissions is missing:', { currentUser: true, hasPermissions: false });
        }
        return [];
    }
    // Check if modules_core is missing - only warn if database has other tables loaded (meaning data loading is complete)
    // If database is empty or only has a few tables, it's likely still loading, so don't warn
    if (!database?.modules_core?.data) {
        const hasOtherTables = database && Object.keys(database).length > 2; // More than just database object properties
        if (hasOtherTables) {
            // Data loading seems complete but modules_core is missing - this is unexpected
            console.warn('[getToolGroups] modules_core data is missing:', { 
                hasDatabase: !!database, 
                hasModulesCore: !!database?.modules_core, 
                hasData: !!database?.modules_core?.data,
                databaseKeys: database ? Object.keys(database).slice(0, 20) : [],
                modulesCoreSchema: database?.modules_core?.schema
            });
        }
        // Silently return empty array during initial load
        return [];
    }
    
    // Debug: Log modules_core data loading status
    const modulesCoreData = database.modules_core.data;
    if (!Array.isArray(modulesCoreData) || modulesCoreData.length === 0) {
        console.warn('[getToolGroups] modules_core data is empty or not an array:', {
            isArray: Array.isArray(modulesCoreData),
            length: Array.isArray(modulesCoreData) ? modulesCoreData.length : 'N/A',
            data: modulesCoreData
        });
        return [];
    }
    
    console.log('[getToolGroups] modules_core loaded successfully:', {
        totalRows: modulesCoreData.length,
        groups: modulesCoreData.filter((m: any) => m.type === 'group').length,
        tools: modulesCoreData.filter((m: any) => m.type !== 'group' && m.page).length
    });

    const permissions = currentUser.permissions;
    const canUseDataDriven = database.modules_core?.schema?.some(col => col.name === 'group_name');

    console.log('[getToolGroups] Using data-driven approach:', canUseDataDriven, {
        hasSchema: !!database.modules_core?.schema,
        schemaColumns: database.modules_core?.schema?.map(col => col.name) || [],
        hasGroupNameColumn: canUseDataDriven
    });

    if (canUseDataDriven) {
        // --- Data-driven approach ---
        const groupDefinitions = (database.modules_core.data as any[])
            .filter(core => core.type === 'group' && core.japaneseName)
            .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
        
        console.log('[getToolGroups] Group definitions:', groupDefinitions.length, groupDefinitions.map((g: any) => g.japaneseName));

        // 言語設定から翻訳を取得
        const languageTable = database[COMMON_LANGUAGE_TABLE] as { data: Row[] } | undefined;
        const translations = new Map<string, string>();
        if (languageTable?.data) {
            languageTable.data.forEach((row: Row) => {
                const key = row.key as string;
                if (key && key.startsWith('tools.')) {
                    const value = row.ja as string;
                    if (value) {
                        translations.set(key, value);
                    }
                }
            });
        }
        
        const allTools = (database.modules_core.data as any[])
            .filter(core => core.type !== 'group' && core.page);
        
        const allVisibleTools = allTools
            .filter(core => {
                // can_view_allがtrueの場合は、全てのツールを表示
                if (permissions.can_view_all === true) {
                    return true;
                }
                const permissionKey = `can_access_tool_${core.page}`;
                const hasPermission = permissions[permissionKey];
                // 権限が明示的にfalseでない場合は許可（undefinedの場合はデフォルトで許可）
                return hasPermission !== false;
            })
            .map(core => {
                // 翻訳キーを生成
                const translationKey = getToolTranslationKey(core.page);
                // 翻訳を取得（フォールバック: japaneseName）
                const label = translations.get(translationKey) || core.japaneseName || core.fileName;
                
                return {
                    page: core.page,
                    label,
                    icon: getIcon(core.icon_name),
                    groupName: core.group_name || 'その他',
                    sort_order: core.sort_order || 999,
                    permission: true,
                };
            });

        const toolsByGroup: Record<string, any[]> = {};
        allVisibleTools.forEach(tool => {
            const groupName = tool.groupName;
            if (!toolsByGroup[groupName]) {
                toolsByGroup[groupName] = [];
            }
            toolsByGroup[groupName].push(tool);
        });

        const finalToolGroups = groupDefinitions
            .map(groupDef => {
                const groupName = groupDef.japaneseName;
                const toolsInGroup = toolsByGroup[groupName];

                if (!toolsInGroup || toolsInGroup.length === 0) return null;

                toolsInGroup.sort((a, b) => a.sort_order - b.sort_order);
                delete toolsByGroup[groupName];

                return {
                    name: groupName,
                    icon: getIcon(groupDef.icon_name),
                    tools: toolsInGroup,
                };
            })
            .filter((g): g is NonNullable<typeof g> => g !== null);

        const otherTools = Object.values(toolsByGroup).flat().sort((a, b) => a.sort_order - b.sort_order);

        if (otherTools.length > 0) {
            finalToolGroups.push({
                name: 'その他',
                icon: getIcon('fa-ellipsis'),
                tools: otherTools,
            });
        }
        return finalToolGroups;

    } else {
        // --- Fallback to hardcoded structure ---
        // 言語設定から翻訳を取得
        const languageTable = database[COMMON_LANGUAGE_TABLE] as { data: Row[] } | undefined;
        const translations = new Map<string, string>();
        if (languageTable?.data) {
            languageTable.data.forEach((row: Row) => {
                const key = row.key as string;
                if (key && key.startsWith('tools.')) {
                    const value = row.ja as string;
                    if (value) {
                        translations.set(key, value);
                    }
                }
            });
        }
        
        const allToolsMap = new Map((database.modules_core.data as any[])
            .filter(core => core.type !== 'group' && core.page)
            .map(t => {
                const translationKey = getToolTranslationKey(t.page);
                const label = translations.get(translationKey) || t.japaneseName || t.fileName;
                return [t.page, {
                    page: t.page,
                    label,
                }];
            }));
        
        // ALL_TOOLSからフォールバック情報を追加
        ALL_TOOLS.forEach(tool => {
            if (!allToolsMap.has(tool.name)) {
                const translationKey = getToolTranslationKey(tool.name);
                const label = translations.get(translationKey) || tool.displayName;
                allToolsMap.set(tool.name, {
                    page: tool.name,
                    label,
                });
            }
        });
        
        const assignedTools = new Set<string>();

        const finalToolGroups = Object.entries(HARDCODED_GROUP_DEFINITIONS).map(([groupName, groupDef]) => {
            const tools = groupDef.tools
                .map(toolName => {
                    // can_view_allがtrueの場合は、全てのツールを表示
                    const hasAccess = permissions.can_view_all === true || 
                                     permissions[`can_access_tool_${toolName}`] !== false;
                    if (hasAccess) {
                        assignedTools.add(toolName);
                        let toolInfo = allToolsMap.get(toolName);
                        // allToolsMapに存在しない場合は、ALL_TOOLSから直接取得
                        if (!toolInfo) {
                            const toolFromAllTools = ALL_TOOLS.find(t => t.name === toolName);
                            if (toolFromAllTools) {
                                const translationKey = getToolTranslationKey(toolName);
                                const label = translations.get(translationKey) || toolFromAllTools.displayName;
                                toolInfo = {
                                    page: toolName,
                                    label,
                                };
                            }
                        }
                        return toolInfo ? { ...toolInfo, icon: getIcon(null) } : null;
                    }
                    return null;
                })
                .filter((t): t is NonNullable<typeof t> => t !== null);

            if (tools.length === 0) return null;

            return {
                name: groupName,
                icon: getIcon(groupDef.icon),
                tools,
            };
        }).filter((g): g is NonNullable<typeof g> => g !== null);

        const otherTools = (database.modules_core.data as any[])
            .filter(tool => {
                if (!tool.page || assignedTools.has(tool.page)) return false;
                // can_view_allがtrueの場合は、全てのツールを表示
                return permissions.can_view_all === true || 
                       permissions[`can_access_tool_${tool.page}`] !== false;
            })
            .map(tool => {
                const translationKey = getToolTranslationKey(tool.page);
                const label = translations.get(translationKey) || tool.japaneseName || tool.fileName;
                return {
                    page: tool.page,
                    label,
                    icon: getIcon(null),
                };
            });

        if (otherTools.length > 0) {
            finalToolGroups.push({
                name: 'その他',
                icon: getIcon('fa-ellipsis'),
                tools: otherTools,
            });
        }

        return finalToolGroups;
    }
};