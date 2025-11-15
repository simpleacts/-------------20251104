

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, Row } from '@shared/types';
import GeminiApiSettings from '../organisms/GeminiApiSettings';
import GoogleWorkspaceSettings from '../organisms/GoogleWorkspaceSettings';
import ModelManagement from '../organisms/ModelManagement';
import { updateDatabase } from '@core/utils';

declare const gapi: any;

interface GoogleApiSettingsToolProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
    isGapiReady: boolean;
}

const GoogleApiSettingsTool: React.FC<GoogleApiSettingsToolProps> = ({ database, setDatabase, isGapiReady }) => {
    const { t } = useTranslation('google-api-settings');
    const [activeTab, setActiveTab] = useState('gemini');

    // Combined state for both tabs
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [apiKey, setApiKey] = useState('');
    const [clientId, setClientId] = useState('');
    const [rootFolderId, setRootFolderId] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [aiSettings, setAiSettings] = useState<Record<string, any>>({});
    
    const [initialState, setInitialState] = useState({});

    const updateAuthStatus = useCallback((signedIn: boolean) => {
        setIsSignedIn(signedIn);
        if (signedIn) {
            gapi.client.people.people.get({
                resourceName: 'people/me',
                personFields: 'emailAddresses,names',
            }).then((response: any) => {
                setUserProfile(response.result);
            });
        } else {
            setUserProfile(null);
        }
    }, []);

    useEffect(() => {
        if (isGapiReady) {
            const token = gapi.client.getToken();
            updateAuthStatus(token !== null);
        }
    }, [isGapiReady, updateAuthStatus]);
    
    useEffect(() => {
        const googleSettings = database.google_api_settings?.data || [];
        const googleSettingsMap = new Map(googleSettings.map(s => [s.key, s.value]));
        const aiSettingsTable = database.ai_settings?.data || [];
        const aiSettingsMap = new Map<string, any>(aiSettingsTable.map(s => [s.key as string, s.value]));

        const currentApiKey = (googleSettingsMap.get('API_KEY') as string) || '';
        const currentClientId = (googleSettingsMap.get('CLIENT_ID') as string) || '';
        const currentRootFolderId = (googleSettingsMap.get('ROOT_FOLDER_ID') as string) || '';
        const currentGeminiApiKey = (googleSettingsMap.get('GEMINI_API_KEY') as string) || '';
        
        // デバッグ: 初期化時の値をログに出力
        console.log('[GoogleApiSettings] Initializing settings:', {
            API_KEY_from_db: currentApiKey ? `${currentApiKey.substring(0, 10)}...` : '(empty)',
            GEMINI_API_KEY_from_db: currentGeminiApiKey ? `${currentGeminiApiKey.substring(0, 10)}...` : '(empty)',
            CLIENT_ID_from_db: currentClientId ? `${currentClientId.substring(0, 10)}...` : '(empty)',
        });
        
        setApiKey(currentApiKey);
        setClientId(currentClientId);
        setRootFolderId(currentRootFolderId);
        setGeminiApiKey(currentGeminiApiKey);

        const allAiKeys = [
            'AI_FEATURES_ENABLED', 'AI_ENABLED_TRIAGE_EMAIL', 'AI_ENABLED_GENERATE_REPLY',
            'AI_ENABLED_GENERATE_TEMPLATE', 'AI_ENABLED_DB_OPERATION', 'AI_ENABLED_PRODUCT_DESCRIPTION',
            'AI_ENABLED_ASSIGN_IMAGES', 'AI_ENABLED_FETCH_COLOR', 'AI_ENABLED_ANALYZE_LAYOUT',
            'AI_ENABLED_GENERATE_LAYOUT', 'AI_ENABLED_TRANSLATIONS', 'AI_ENABLED_ANALYZE_INVOICE',
            'AI_ENABLED_UPDATE_ID_FORMAT', 'AI_ENABLED_GENERATE_DEV_TASKS', 'AI_ENABLED_SUGGEST_MODULE_INFO',
            'AI_ENABLED_CLASSIFY_FILE', 'GEMINI_MODEL'
        ];
        const initialAiSettings: Record<string, any> = {};
        allAiKeys.forEach(key => {
            const value = aiSettingsMap.get(key);
            if (key === 'AI_FEATURES_ENABLED' || key.startsWith('AI_ENABLED')) {
                initialAiSettings[key] = value === 'true';
            } else {
                initialAiSettings[key] = value;
            }
        });
        setAiSettings(initialAiSettings);
        
        setInitialState({
            apiKey: currentApiKey,
            clientId: currentClientId,
            rootFolderId: currentRootFolderId,
            geminiApiKey: currentGeminiApiKey,
            aiSettings: initialAiSettings,
        });

    }, [database]);

    const handleAiSettingChange = (key: string, value: any) => {
        setAiSettings(prev => ({...prev, [key]: value}));
    };

    const handleSave = async () => {
        // デバッグ: 保存前の値をログに出力
        console.log('[GoogleApiSettings] Saving settings:', {
            apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : '(empty)',
            geminiApiKey: geminiApiKey ? `${geminiApiKey.substring(0, 10)}...` : '(empty)',
            clientId: clientId ? `${clientId.substring(0, 10)}...` : '(empty)',
            rootFolderId
        });
        
        // まずフロントエンドの状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            
            const updateOrCreate = (table: Row[], key: string, value: string) => {
                const settingIndex = table.findIndex((s: Row) => s.key === key);
                if (settingIndex > -1) {
                    table[settingIndex].value = value;
                    console.log(`[GoogleApiSettings] Updated ${key} = ${value ? `${value.substring(0, 10)}...` : '(empty)'}`);
                } else {
                    table.push({ key, value });
                    console.log(`[GoogleApiSettings] Created new entry for ${key} = ${value ? `${value.substring(0, 10)}...` : '(empty)'}`);
                }
            };
            
            const googleSettingsTable = newDb.google_api_settings.data;
            // Google Workspace API用（apiKey変数を使用）
            updateOrCreate(googleSettingsTable, 'API_KEY', apiKey);
            // Gemini API用（geminiApiKey変数を使用）
            updateOrCreate(googleSettingsTable, 'GEMINI_API_KEY', geminiApiKey);
            updateOrCreate(googleSettingsTable, 'CLIENT_ID', clientId);
            updateOrCreate(googleSettingsTable, 'ROOT_FOLDER_ID', rootFolderId);

            const aiSettingsTable = newDb.ai_settings.data;
            Object.entries(aiSettings).forEach(([key, value]) => {
                updateOrCreate(aiSettingsTable, key, String(value));
            });

            return newDb;
        });
        
        // サーバーに保存するための操作を準備
        const googleSettingsOperations: any[] = [];
        const aiSettingsOperations: any[] = [];
        
        const getSettingOperations = (table: string, key: string, value: string, existingData: Row[]) => {
            const existingRow = existingData.find((s: Row) => s.key === key);
            if (existingRow) {
                return {
                    type: 'UPDATE',
                    data: { value },
                    where: { key }
                };
            } else {
                return {
                    type: 'INSERT',
                    data: { key, value }
                };
            }
        };
        
        googleSettingsOperations.push(getSettingOperations('google_api_settings', 'API_KEY', apiKey, database.google_api_settings?.data || []));
        googleSettingsOperations.push(getSettingOperations('google_api_settings', 'GEMINI_API_KEY', geminiApiKey, database.google_api_settings?.data || []));
        googleSettingsOperations.push(getSettingOperations('google_api_settings', 'CLIENT_ID', clientId, database.google_api_settings?.data || []));
        googleSettingsOperations.push(getSettingOperations('google_api_settings', 'ROOT_FOLDER_ID', rootFolderId, database.google_api_settings?.data || []));
        
        Object.entries(aiSettings).forEach(([key, value]) => {
            aiSettingsOperations.push(getSettingOperations('ai_settings', key, String(value), database.ai_settings?.data || []));
        });
        
        // サーバーに保存
        try {
            if (googleSettingsOperations.length > 0) {
                const result = await updateDatabase(
                    'google-api-settings',
                    'google_api_settings',
                    googleSettingsOperations.map(op => ({
                        type: op.type as 'INSERT' | 'UPDATE',
                        data: op.data,
                        where: op.where
                    })),
                    database
                );
                
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save Google API settings');
                }
                console.log('[GoogleApiSettings] Successfully saved Google API settings to server');
            }
            
            if (aiSettingsOperations.length > 0) {
                const result = await updateDatabase(
                    'google-api-settings',
                    'ai_settings',
                    aiSettingsOperations.map(op => ({
                        type: op.type as 'INSERT' | 'UPDATE',
                        data: op.data,
                        where: op.where
                    })),
                    database
                );
                
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save AI settings');
                }
                console.log('[GoogleApiSettings] Successfully saved AI settings to server');
            }
            
            alert(t('google_api.save_success', '設定をサーバーに保存しました。'));
            setInitialState({ apiKey, clientId, rootFolderId, geminiApiKey, aiSettings });
        } catch (error) {
            console.error('[GoogleApiSettings] Failed to save to server:', error);
            alert(t('google_api.save_failed', '設定の保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const hasChanges = useMemo(() => {
        const currentState = { apiKey, clientId, rootFolderId, geminiApiKey, aiSettings };
        return JSON.stringify(currentState) !== JSON.stringify(initialState);
    }, [apiKey, clientId, rootFolderId, geminiApiKey, aiSettings, initialState]);

    const getTabClass = (tab: string) => `py-3 px-4 border-b-2 font-medium text-sm transition-colors focus:outline-none ${activeTab === tab ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`;

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('google_api.title', '連携設定')}</h1>
                    <p className="text-gray-500 mt-1">{t('google_api.description', 'Google WorkspaceやAI機能との連携設定を行います。')}</p>
                </div>
                {hasChanges && <button onClick={handleSave} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg">{t('google_api.save', '保存')}</button>}
            </header>

            <div className="border-b border-default mb-6">
                <nav className="-mb-px flex space-x-4">
                    <button onClick={() => setActiveTab('gemini')} className={getTabClass('gemini')}>{t('google_api.tab_gemini', 'Gemini API')}</button>
                    <button onClick={() => setActiveTab('model_management')} className={getTabClass('model_management')}>{t('google_api.tab_model_management', 'モデル管理')}</button>
                    <button onClick={() => setActiveTab('workspace')} className={getTabClass('workspace')}>{t('google_api.tab_workspace', 'Google Workspace')}</button>
                </nav>
            </div>

            {activeTab === 'gemini' ? (
                <GeminiApiSettings 
                    geminiApiKey={geminiApiKey}
                    setGeminiApiKey={setGeminiApiKey}
                    aiSettings={aiSettings}
                    onAiSettingChange={handleAiSettingChange}
                    geminiModels={database.gemini_models?.data || []}
                />
            ) : activeTab === 'model_management' ? (
                <ModelManagement
                    database={database}
                    setDatabase={setDatabase}
                />
            ) : (
                <GoogleWorkspaceSettings
                    isGapiReady={isGapiReady}
                    isSignedIn={isSignedIn}
                    userProfile={userProfile}
                    apiKey={apiKey}
                    setApiKey={setApiKey}
                    clientId={clientId}
                    setClientId={setClientId}
                    rootFolderId={rootFolderId}
                    setRootFolderId={setRootFolderId}
                />
            )}
        </div>
    );
};

export default GoogleApiSettingsTool;