import React, { useState, useMemo, useEffect } from 'react';
import { Row, Table, ToolVisibility } from '../../shared/types';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { MagnifyingGlassIcon, XMarkIcon, ChevronDownIcon } from '../../shared/ui/atoms/icons';
import MemoryMonitor from '../../shared/ui/molecules/MemoryMonitor';
import { useDevice } from '../../shared/hooks/useDevice';
import { useDatabase } from '../contexts/DatabaseContext';
import { getRequiredTablesForPage, Page, ALL_TOOLS } from '../config/Routes';

// Re-export Page type for use in other components
export type { Page };
export { ALL_TOOLS };

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Table;
    permissions: { [key: string]: any };
    toolGroups: any[];
    prefetchTables: (tables: string[], source: string) => Promise<void>;
    getRequiredTablesForPage: (page: Page, table?: string) => string[];
}

export const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    settings,
    permissions,
    toolGroups,
    prefetchTables,
    getRequiredTablesForPage
}) => {
    const { database } = useDatabase();
    const { navigate, currentPage, selectedTable } = useNavigation();
    const { currentUser, logout } = useAuth();
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['ナビゲーション', '主要機能', '受注管理']));
    const device = useDevice();

    const visibilitySettings = (database?.tool_visibility_settings?.data as ToolVisibility[]) || [];
    
    const visibilityMap = useMemo(() => {
        const map = new Map<string, boolean>();
        visibilitySettings
            .filter(setting => setting.device_type === device)
            .forEach(setting => {
                map.set(setting.tool_name, setting.is_visible);
            });
        return map;
    }, [visibilitySettings, device]);
    
    const visibleToolGroups = useMemo(() => {
        // すべてのツールを表示する（設定があっても表示する）
        // 設定が存在しない場合は true（表示）をデフォルトとする
        return toolGroups.map(group => ({
            ...group,
            tools: group.tools.filter((tool: any) => {
                const visibility = visibilityMap.get(tool.page);
                // 設定が存在しない場合は表示、設定が存在する場合はその設定値を使用
                // ただし、すべて表示にするため、常に true を返す
                return true; // すべてのツールを表示
            })
        })).filter(group => group.tools.length > 0);
    }, [toolGroups, visibilityMap]);
    
    const handleNavigation = (page: Page, table?: string) => {
        // 先読みを無効化: ツールを開いたときに必要なデータは各ツールページで読み込む
        // const requiredTables = getRequiredTablesForPage(page, table, database);
        // prefetchTables(requiredTables, page);
        navigate(page, table);
        onClose();
    };

    // 先読みを無効化: マウスオーバー時の先読みを削除
    // const handlePrefetch = (page: Page, table?: string) => {
    //     const requiredTables = getRequiredTablesForPage(page, table, database);
    //     prefetchTables(requiredTables, page);
    // };

    const toggleTheme = () => {
        const root = window.document.documentElement;
        root.classList.toggle('dark');
        // This is a temporary visual toggle. The actual theme is managed by useThemeManager.
    };

    const toggleCategory = (category: string) => {
        setOpenCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    const renderTools = (tools: any[]) => {
        return tools.map((tool: any) => {
            if (tool.permission === false) return null;
            const isActive = currentPage === tool.page;
            return (
                <li key={tool.page}>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleNavigation(tool.page); }}
                       className={`flex items-center gap-3 p-2 rounded-md transition-colors ${isActive ? 'bg-brand-secondary/20 text-brand-primary font-semibold' : 'hover:bg-hover-bg dark:hover:bg-hover-bg-dark'}`}>
                        {tool.icon}
                        <span>{tool.label}</span>
                    </a>
                </li>
            );
        });
    };
    
    return (
        <aside className={`fixed top-0 left-0 h-full bg-container-bg dark:bg-container-bg-dark w-72 flex-col border-r border-default dark:border-default-dark transform transition-transform duration-300 ease-in-out z-40 lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex`}>
            <header className="p-4 flex-shrink-0 flex items-center justify-between border-b border-default dark:border-default-dark h-16">
                <div className="flex items-center gap-2">
                    <i className="fa-solid fa-print text-xl text-brand-primary"></i>
                    <h1 className="font-bold text-lg">バックオフィス</h1>
                </div>
                <button onClick={onClose} className="lg:hidden p-1 text-muted dark:text-muted-dark" aria-label="サイドバーを閉じる" title="サイドバーを閉じる"><XMarkIcon className="w-6 h-6"/></button>
            </header>
            
            <nav className="flex-1 overflow-y-auto p-4 space-y-4">
                {visibleToolGroups.map(group => (
                    <div key={group.name}>
                        <h2 onClick={() => toggleCategory(group.name)} className="flex justify-between items-center px-2 py-1 font-bold text-muted dark:text-muted-dark uppercase tracking-wider cursor-pointer">
                           <span>{group.name}</span>
                           <ChevronDownIcon className={`w-4 h-4 transition-transform ${openCategories.has(group.name) ? 'rotate-180' : ''}`} />
                        </h2>
                        {openCategories.has(group.name) && <ul className="mt-2 space-y-1">{renderTools(group.tools)}</ul>}
                    </div>
                ))}
            </nav>

            <footer className="p-4 border-t border-default dark:border-default-dark flex-shrink-0">
                <MemoryMonitor />
                <div className="text-center text-xs text-muted dark:text-muted-dark mt-2">
                    <p>Jo ver.1.0.0</p>
                </div>
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm">
                        <p className="font-semibold">{currentUser?.name}</p>
                        <p className="text-xs text-muted dark:text-muted-dark">{currentUser?.username}</p>
                    </div>
                    <button onClick={logout} className="text-sm font-semibold text-muted dark:text-muted-dark hover:text-red-500">ログアウト</button>
                </div>
            </footer>
        </aside>
    );
};