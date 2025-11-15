import React, { useState } from 'react';
import { CanvasState, Database, Row, Table } from '../../shared/types';
import { Sidebar } from './Sidebar';
// FIX: The Page type has been moved to Routes.tsx to break a circular dependency.
import CommandPalette from '../../shared/components/CommandPalette';
import { Bars2Icon } from '../../shared/ui/atoms/icons';
import { Routes, getRequiredTablesForPage } from '../config/Routes';
import { useNavigation } from '../contexts/NavigationContext';

import { AppMode } from '../types/appMode';

interface AppLayoutProps {
    appMode: AppMode;
    setAppMode: (mode: AppMode) => void;
    database: Partial<Database>;
    currentUser: Row;
    toolGroups: any[];
    prefetchTables: (tables: string[], source: string) => Promise<void>;
    commandPaletteEnabled: boolean;
    isCommandPaletteOpen: boolean;
    setIsCommandPaletteOpen: (isOpen: boolean) => void;
    proofingCanvases: CanvasState[];
    setProofingCanvases: React.Dispatch<React.SetStateAction<CanvasState[]>>;
    getPaginationConfigFor: (target: string) => { enabled: boolean; itemsPerPage: number; };
    isGapiReady: boolean;
    handleLiveUpdate: (newSettings: Record<string, any>) => void;
    handleClearLiveUpdate: () => void;
    // FIX: Add `setDatabase` to props to pass it down to the `Routes` component.
    setDatabase: React.Dispatch<React.SetStateAction<Partial<Database> | null>>;
}

const AppLayout: React.FC<AppLayoutProps> = ({
    appMode,
    setAppMode,
    database,
    currentUser,
    toolGroups,
    prefetchTables,
    commandPaletteEnabled,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setDatabase,
    ...routesProps
}) => {
    const { navigate } = useNavigation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <>
            <div className={`flex flex-col h-screen bg-app-bg dark:bg-app-bg-dark text-base-content dark:text-base-dark-content font-sans`}>
                {appMode === 'live' && (
                    <div className="flex-shrink-0 bg-red-600 text-white text-center text-xs font-bold p-1 z-50">
                        LIVE MODE - サーバー上の本番データベースに接続中です。操作は元に戻せません。
                    </div>
                )}
                {appMode === 'csv-debug' && (
                    <div className="flex-shrink-0 bg-yellow-500 text-yellow-900 text-center text-xs font-bold p-1 z-50">
                        CSV DEBUG MODE - ローカルのCSVファイルを読み込んでいます。この画面での変更は保存されません。
                    </div>
                )}
                {appMode === 'csv-writable' && (
                    <div className="flex-shrink-0 bg-green-500 text-green-900 text-center text-xs font-bold p-1 z-50">
                        CSV WRITABLE MODE - ローカルのCSVファイルを読み込み、変更時に自動保存します。
                    </div>
                )}
                
                <div className="flex flex-1 overflow-hidden">
                    <Sidebar
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        settings={database.settings as Table}
                        permissions={currentUser.permissions as {[key: string]: any}}
                        toolGroups={toolGroups}
                        prefetchTables={prefetchTables}
                        getRequiredTablesForPage={getRequiredTablesForPage}
                    />
                     {isSidebarOpen && (
                        <div 
                            onClick={() => setIsSidebarOpen(false)} 
                            className="fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity"
                            aria-hidden="true"
                        />
                    )}
                    <div className="flex-1 flex flex-col overflow-hidden">
                         <header className="lg:hidden flex-shrink-0 flex items-center justify-between p-4 bg-container-bg dark:bg-container-bg-dark shadow z-20 h-16">
                            <div className="flex items-center">
                                 <button 
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="p-2 text-base-content dark:text-base-dark-content"
                                    aria-label="サイドバーを開く"
                                >
                                    <Bars2Icon className="w-6 h-6" />
                                </button>
                                <h1 className="text-lg font-bold ml-4 text-base-content dark:text-base-dark-content">
                                    AI DBアシスタント
                                </h1>
                            </div>
                            <div className="text-sm font-semibold">{currentUser.name}</div>
                        </header>
                        <main className="flex-1 flex flex-col p-6 overflow-auto">
                           {/* FIX: Pass missing appMode and setAppMode props to the Routes component. */}
                           <Routes {...routesProps} database={database} setDatabase={setDatabase} appMode={appMode} setAppMode={setAppMode} />
                        </main>
                    </div>
                </div>
            </div>
            {commandPaletteEnabled && database && (
                <CommandPalette
                    isOpen={isCommandPaletteOpen}
                    onClose={() => setIsCommandPaletteOpen(false)}
                    toolGroups={toolGroups}
                />
            )}
        </>
    );
};

export default AppLayout;