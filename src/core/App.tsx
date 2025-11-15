import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { CanvasState, Table } from '../shared/types';
import Login from '../shared/components/Login';
import ErrorBoundary from './components/ErrorBoundary';
import { SpinnerIcon, IconProvider } from '../shared/ui/atoms/icons';
import ErrorDisplay from './components/ErrorDisplay';
import AppLayout from './components/AppLayout';
import useAppDataInitialization from './hooks/useAppDataInitialization';
import useGoogleApi from './hooks/useGoogleApi';
import useAppSettings from '../features/display-settings/hooks/useAppSettings';
import { useAuth } from './contexts/AuthContext';
import { getToolGroups } from './config/toolGroups';
import { SettingsProvider } from './contexts/SettingsContext';
import { initializeGeminiService } from '../shared/services/geminiService';
const App: React.FC = () => {
    const { currentUser } = useAuth();
    const { database, setDatabase, error, appMode, setAppMode, isLoadingData, prefetchTables } = useAppDataInitialization();
    const { isGapiReady } = useGoogleApi();
    const { 
        commandPaletteEnabled, 
        isCommandPaletteOpen, 
        setIsCommandPaletteOpen,
        getPaginationConfigFor,
        handleLiveUpdate,
        handleClearLiveUpdate,
        tooltipEnabled,
        tooltipDelay
    } = useAppSettings();
        
    const [proofingCanvases, setProofingCanvases] = useState<CanvasState[]>([]);
    
    // getToolGroupsで実際に使用される部分だけを依存配列に含めることで、不要な再計算を防ぐ
    // データの内容が変わったかどうかを判定するためのキーを作成
    const toolGroupsDependencyKey = useMemo(() => {
        if (!currentUser?.permissions || !database?.modules_core?.data) {
            return JSON.stringify({ hasUser: !!currentUser, hasPermissions: !!currentUser?.permissions, hasModulesCore: !!database?.modules_core?.data });
        }
        const modulesCoreData = database.modules_core.data;
        const languageTable = database['language_settings_common'] as { data: any[] } | undefined;
        const languageData = languageTable?.data || [];
        // データの内容を表すキーを作成（配列の長さと主要な識別子を使用）
        const modulesCoreKey = Array.isArray(modulesCoreData) 
            ? `${modulesCoreData.length}:${modulesCoreData.map((m: any) => m.page || m.japaneseName || '').join(',')}`
            : '';
        const languageKey = Array.isArray(languageData)
            ? `${languageData.length}:${languageData.map((l: any) => l.key || '').join(',')}`
            : '';
        const permissionsKey = JSON.stringify(currentUser.permissions);
        return `${modulesCoreKey}|${languageKey}|${permissionsKey}`;
    }, [
        currentUser?.permissions,
        database?.modules_core?.data,
        database?.['language_settings_common']
    ]);
    
    // toolGroupsDependencyKeyが変わったときだけ再計算（currentUserとdatabaseはクロージャーで参照）
    const toolGroups = useMemo(() => getToolGroups(currentUser, database), [toolGroupsDependencyKey]);

    const settingsContextValue = useMemo(() => ({
        tooltipEnabled,
        tooltipDelay,
    }), [tooltipEnabled, tooltipDelay]);

    // Track previous AI settings to avoid unnecessary re-initializations
    const prevAiSettingsRef = React.useRef<string>('');
    
    useEffect(() => {
        if (database && database.google_api_settings && database.ai_settings) {
            // ai_settingsテーブルが存在し、データ配列も存在することを確認
            const aiSettingsData = database.ai_settings.data;
            if (!Array.isArray(aiSettingsData)) {
                console.warn('ai_settings table data is not an array');
                return;
            }
            
            // FIX: Add explicit type to new Map to avoid type inference issues.
            const aiSettingsMap = new Map<string, string>(aiSettingsData.map(s => [s.key as string, String(s.value)]));
            
            // Create a string representation of settings to compare
            const settingsKey = JSON.stringify(Array.from(aiSettingsMap.entries()).sort());
            
            // Only initialize if settings have changed
            if (prevAiSettingsRef.current === settingsKey) {
                return; // Settings unchanged, skip re-initialization
            }
            
            prevAiSettingsRef.current = settingsKey;
            
            // プロキシ経由の実装では、APIキーはサーバー側で管理されるため、フロントエンドでは設定のみを初期化
            initializeGeminiService('', aiSettingsMap); // APIキーは不要（プロキシ経由でサーバー側から取得）
            
            if (aiSettingsMap.get('AI_FEATURES_ENABLED') === 'true') {
                console.log("Gemini Service Initialized (プロキシ経由).");
            } else {
                console.log("Gemini Service is disabled by settings.");
            }
        }
    }, [database]);

    if (error) {
        return <ErrorDisplay error={error} />;
    }

    if (isLoadingData || !database || !database.icons) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-base-200 dark:bg-base-dark">
                <div className="text-center">
                    <SpinnerIcon className="w-12 h-12 mx-auto text-brand-primary" />
                    <p className="mt-4 text-lg font-semibold">データを準備中... ({appMode}モード)</p>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <IconProvider>
                {!currentUser ? (
                    <Login usersTable={database.users as Table} />
                ) : (
                    <SettingsProvider value={settingsContextValue}>
                        <AppLayout
                            appMode={appMode}
                            setAppMode={setAppMode}
                            database={database}
                            setDatabase={setDatabase}
                            currentUser={currentUser}
                            toolGroups={toolGroups}
                            prefetchTables={prefetchTables}
                            commandPaletteEnabled={commandPaletteEnabled}
                            isCommandPaletteOpen={isCommandPaletteOpen}
                            setIsCommandPaletteOpen={setIsCommandPaletteOpen}
                            proofingCanvases={proofingCanvases}
                            setProofingCanvases={setProofingCanvases}
                            getPaginationConfigFor={getPaginationConfigFor}
                            isGapiReady={isGapiReady}
                            handleLiveUpdate={handleLiveUpdate}
                            handleClearLiveUpdate={handleClearLiveUpdate}
                        />
                    </SettingsProvider>
                )}
            </IconProvider>
        </ErrorBoundary>
    );
};

export default App;