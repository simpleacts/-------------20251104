import React, { useEffect, useMemo, useState } from 'react';
import { Database, ToolMigration } from '@shared/types';
import { DownloadIcon, SpinnerIcon, XMarkIcon } from '@components/atoms';
import { downloadFile, getFolderLink, listFiles } from '@features/google-api-settings/services/googleApiService';

// --- DownloadTab (from old ToolExporter.tsx) ---
interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
}

const DownloadTab: React.FC<{ database: Database; isGapiReady: boolean; }> = ({ database, isGapiReady }) => {
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
    
    const settingsMap = useMemo(() => new Map((database.google_api_settings?.data || []).map(s => [s.key, s.value])), [database.google_api_settings]);
    const FOLDER_ID = useMemo(() => settingsMap.get('ROOT_FOLDER_ID'), [settingsMap]);
    
    useEffect(() => {
        const fetchFiles = async () => {
            if (!isGapiReady) {
                setError('Google APIの準備ができていません。Google連携設定を確認してください。');
                return;
            }
            if (!FOLDER_ID) {
                setError('Google DriveのアプリケーションルートフォルダIDが設定されていません。');
                return;
            }

            setIsLoading(true);
            setError(null);
            try {
                const fileList = await listFiles(FOLDER_ID as string);
                setFiles(fileList || []);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'ファイルの取得に失敗しました。';
                setError(message);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFiles();
    }, [isGapiReady, FOLDER_ID]);
    
    const handleDownload = async (file: DriveFile) => {
        setDownloadingFileId(file.id);
        try {
            const blob = await downloadFile(file.id);
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'ダウンロードに失敗しました。';
            setError(message);
            console.error(err);
        } finally {
            setDownloadingFileId(null);
        }
    };

    return (
        <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
            {error && <p className="mb-4 text-sm text-red-500 bg-red-100 dark:bg-red-900/30 p-3 rounded-md">{error}</p>}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">利用可能なツール</h2>
                {FOLDER_ID && <a href={getFolderLink(FOLDER_ID as string)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Driveフォルダを開く</a>}
            </div>
            {isLoading ? (
                <div className="flex justify-center items-center py-10">
                    <SpinnerIcon className="w-8 h-8 text-brand-primary" />
                    <span className="ml-3">ファイル一覧を取得中...</span>
                </div>
            ) : files.length > 0 ? (
                <ul className="space-y-2">
                    {files.filter(f => f.mimeType === 'application/zip').map(file => (
                        <li key={file.id} className="flex items-center justify-between p-3 bg-base-200 dark:bg-base-dark-300 rounded-md">
                            <div className="flex items-center gap-3">
                                <i className="fa-solid fa-file-zipper text-xl text-gray-500"></i>
                                <span className="font-semibold">{file.name}</span>
                            </div>
                            <button
                                onClick={() => handleDownload(file)}
                                disabled={downloadingFileId === file.id}
                                className="flex items-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-semibold py-1.5 px-3 rounded-lg text-sm disabled:bg-gray-400"
                            >
                                {downloadingFileId === file.id ? <SpinnerIcon className="w-4 h-4" /> : <DownloadIcon className="w-4 h-4" />}
                                {downloadingFileId === file.id ? '...' : 'ダウンロード'}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-gray-500 py-10">
                    ダウンロード可能なツールが見つかりません。<br/>
                    Google連携設定で指定されたフォルダに、ZIPファイルをアップロードしてください。
                </p>
            )}
        </div>
    );
};


// --- PortingTab (from old ToolPortingManager.tsx) ---
const MIGRATABLE_TOOLS = [
    {
        tool_name: 'estimator',
        display_name: '見積作成ツール',
        version: '1.0.0',
        description: '商品選択、プリント設定、価格計算、PDF出力機能を含む総合的な見積作成ツール。',
    },
];

const MigrationRecordModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (destination: string, notes: string) => void;
    tool: typeof MIGRATABLE_TOOLS[0];
}> = ({ isOpen, onClose, onSave, tool }) => {
    const [destinationApp, setDestinationApp] = useState('');
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        if (!destinationApp.trim()) {
            alert('移行先アプリケーション名は必須です。');
            return;
        }
        onSave(destinationApp, notes);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">移植を記録: {tool.display_name}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="p-6 space-y-4">
                    <p className="text-sm">バージョン <strong>{tool.version}</strong> の移植を記録します。</p>
                    <div>
                        <label htmlFor="destination-app" className="block text-sm font-medium mb-1">移植先アプリケーション名 <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            id="destination-app"
                            value={destinationApp}
                            onChange={(e) => setDestinationApp(e.target.value)}
                            className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded-md"
                            placeholder="例: 捺染兄弟ECサイト"
                        />
                    </div>
                    <div>
                        <label htmlFor="migration-notes" className="block text-sm font-medium mb-1">メモ (任意)</label>
                        <textarea
                            id="migration-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded-md"
                            placeholder="移植に関する特記事項など"
                        />
                    </div>
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-base-300 hover:bg-gray-300">キャンセル</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-800">記録を保存</button>
                </footer>
            </div>
        </div>
    );
};

const PortingTab: React.FC<{ database: Database; setDatabase: React.Dispatch<React.SetStateAction<Database | null>>; }> = ({ database, setDatabase }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTool, setSelectedTool] = useState<(typeof MIGRATABLE_TOOLS)[0] | null>(null);

    const migrationHistory = useMemo(() => {
        return (database.tool_migrations?.data as ToolMigration[] || [])
            .sort((a, b) => new Date(b.migration_date).getTime() - new Date(a.migration_date).getTime());
    }, [database.tool_migrations]);

    const handleOpenModal = (tool: typeof MIGRATABLE_TOOLS[0]) => {
        setSelectedTool(tool);
        setIsModalOpen(true);
    };

    const handleSaveMigration = (destinationApp: string, notes: string) => {
        if (!selectedTool) return;
        
        const newMigrationRecord: ToolMigration = {
            id: `mig_${Date.now()}`,
            tool_name: selectedTool.tool_name,
            display_name: selectedTool.display_name,
            version: selectedTool.version,
            description: selectedTool.description,
            destination_app: destinationApp,
            migration_date: new Date().toISOString(),
            notes: notes,
        };

        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            if (!newDb.tool_migrations) {
                newDb.tool_migrations = { schema: [], data: [] };
            }
            newDb.tool_migrations.data.push(newMigrationRecord);
            return newDb;
        });

        setIsModalOpen(false);
        setSelectedTool(null);
    };

    return (
        <div className="space-y-6">
            <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">移植可能なツール</h2>
                <div className="space-y-4">
                    {MIGRATABLE_TOOLS.map(tool => (
                        <div key={tool.tool_name} className="p-4 border border-base-300 dark:border-base-dark-300 rounded-lg flex items-start gap-4">
                            <i className="fa-solid fa-calculator text-2xl text-brand-secondary mt-1"></i>
                            <div className="flex-grow">
                                <h3 className="font-bold">{tool.display_name} <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{tool.version}</span></h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tool.description}</p>
                            </div>
                            <button
                                onClick={() => handleOpenModal(tool)}
                                className="flex-shrink-0 flex items-center gap-2 bg-brand-secondary hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                            >
                                <i className="fa-solid fa-upload"></i>
                                移植を記録する
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md flex flex-col">
                <h2 className="text-xl font-bold mb-4">移植履歴</h2>
                <div className="overflow-auto flex-grow">
                    <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-base-200 dark:bg-base-dark-300">
                            <tr>
                                <th className="p-2 text-left">ツール名</th>
                                <th className="p-2 text-left">バージョン</th>
                                <th className="p-2 text-left">移植先</th>
                                <th className="p-2 text-left">移植日</th>
                                <th className="p-2 text-left">メモ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {migrationHistory.map(log => (
                                <tr key={log.id} className="border-t border-base-200 dark:border-base-dark-300">
                                    <td className="p-2 font-semibold">{log.display_name}</td>
                                    <td className="p-2 font-mono text-xs">{log.version}</td>
                                    <td className="p-2">{log.destination_app}</td>
                                    <td className="p-2">{new Date(log.migration_date).toLocaleString('ja-JP')}</td>
                                    <td className="p-2 text-gray-600 dark:text-gray-400 truncate max-w-xs" title={log.notes}>{log.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {migrationHistory.length === 0 && (
                        <p className="text-center text-gray-500 py-8">まだ移植履歴がありません。</p>
                    )}
                </div>
            </div>

            {isModalOpen && selectedTool && (
                <MigrationRecordModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveMigration}
                    tool={selectedTool}
                />
            )}
        </div>
    );
};


// --- Main Combined Component ---
const ToolExporter: React.FC<{ database: Database; setDatabase: React.Dispatch<React.SetStateAction<Database | null>>; isGapiReady: boolean; }> = ({ database, setDatabase, isGapiReady }) => {
    const [activeTab, setActiveTab] = useState('download');
    
    const getTabClass = (tabName: 'download' | 'porting') => `py-3 px-4 border-b-2 font-medium text-sm ${activeTab === tabName ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`;

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">ツールエクスポート</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Google Driveからのツールダウンロードと、他アプリへの移植履歴を管理します。</p>
            </header>

             <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-4">
                    <button onClick={() => setActiveTab('download')} className={getTabClass('download')}>ツールダウンロード</button>
                    <button onClick={() => setActiveTab('porting')} className={getTabClass('porting')}>移植管理</button>
                </nav>
            </div>
            
            <main className="flex-grow">
                {activeTab === 'download' && <DownloadTab database={database} isGapiReady={isGapiReady} />}
                {activeTab === 'porting' && <PortingTab database={database} setDatabase={setDatabase} />}
            </main>
        </div>
    );
};

export default ToolExporter;