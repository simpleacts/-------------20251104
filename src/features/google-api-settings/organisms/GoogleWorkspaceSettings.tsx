import React from 'react';
import { signIn, signOut } from '../services/googleApiService';
import { SpinnerIcon } from '@components/atoms';

interface GoogleWorkspaceSettingsProps {
    isGapiReady: boolean;
    isSignedIn: boolean;
    userProfile: any;
    apiKey: string;
    setApiKey: (key: string) => void;
    clientId: string;
    setClientId: (id: string) => void;
    rootFolderId: string;
    setRootFolderId: (id: string) => void;
}

const GoogleWorkspaceSettings: React.FC<GoogleWorkspaceSettingsProps> = ({
    isGapiReady,
    isSignedIn,
    userProfile,
    apiKey,
    setApiKey,
    clientId,
    setClientId,
    rootFolderId,
    setRootFolderId,
}) => {
    if (!isGapiReady && (apiKey && clientId)) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <SpinnerIcon className="w-12 h-12 mx-auto text-brand-primary" />
                    <p className="mt-4 text-lg font-semibold">Google APIを初期化中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Google Workspace 連携</h2>
                {isSignedIn ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">連携済み</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {userProfile?.names?.[0]?.displayName || '...'} ({userProfile?.emailAddresses?.[0]?.value || '...'}) としてログイン中
                            </p>
                        </div>
                        <button onClick={signOut} className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg">
                            連携を解除
                        </button>
                    </div>
                ) : (
                     <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">未連携</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Google DriveやGmailと連携するにはログインが必要です。</p>
                        </div>
                        <div>
                            <button onClick={signIn} disabled={!apiKey || !clientId} className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                                Googleにログイン
                            </button>
                            {(!apiKey || !clientId) && (
                                <p className="text-xs text-gray-500 mt-2 text-right">APIキーとクライアントIDを保存すると有効になります。</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">API・フォルダ設定</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="api-key" className="block text-sm font-medium mb-1">
                            Workspace APIキー
                        </label>
                        <input
                            type="password"
                            id="api-key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded-md"
                            placeholder="Google Cloud Consoleから取得したAPIキー"
                        />
                    </div>
                    <div>
                        <label htmlFor="client-id" className="block text-sm font-medium mb-1">
                            Workspace クライアントID
                        </label>
                        <input
                            type="text"
                            id="client-id"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded-md"
                            placeholder="Google Cloud Consoleから取得したクライアントID"
                        />
                    </div>
                    <div>
                        <label htmlFor="root-folder-id" className="block text-sm font-medium mb-1">
                            アプリケーションルートフォルダID
                        </label>
                        <input
                            type="text"
                            id="root-folder-id"
                            value={rootFolderId}
                            onChange={(e) => setRootFolderId(e.target.value)}
                            className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded-md"
                            placeholder="Google DriveのフォルダURLの末尾にあるID"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            アプリケーション全体で使用するGoogle Driveのルートフォルダです。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoogleWorkspaceSettings;