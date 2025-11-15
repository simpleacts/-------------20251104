import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface AssetManagerProps {
    isLocked: boolean;
}

// Define the structure for our site assets
interface SiteAssets {
    heroVideos: string[];
    logos: {
        main: string;
        favicon: string;
    };
}

const LoadingOverlay: React.FC = () => (
    <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
        <i className="fas fa-spinner fa-spin text-2xl text-primary"></i>
    </div>
);

const LockedOverlay: React.FC = () => (
    <div className="absolute inset-0 bg-gray-200/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-center p-4">
        <i className="fas fa-lock text-4xl text-gray-500 mb-4"></i>
        <h3 className="text-xl font-bold text-gray-700">機能はロックされています</h3>
        <p className="text-gray-600">この機能の編集は現在ロックされています。</p>
        <p className="text-sm text-gray-500 mt-2">ロックを解除するには、開発ツールに移動してください。</p>
    </div>
);


const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 shadow-md border rounded-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

// FIX: Changed named export to default export for React.lazy compatibility.
const AssetManager: React.FC<AssetManagerProps> = ({ isLocked }) => {
    const [activeTab, setActiveTab] = useState<'hero' | 'logos'>('hero');
    const [assets, setAssets] = useState<SiteAssets | null>(null);
    const [originalAssets, setOriginalAssets] = useState<SiteAssets | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const isDirty = useMemo(() => JSON.stringify(assets) !== JSON.stringify(originalAssets), [assets, originalAssets]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/templates/site_assets.json?cachebust=' + new Date().getTime());
            if (!response.ok) throw new Error('アセット情報の読み込みに失敗しました。');
            const data: SiteAssets = await response.json();
            setAssets(data);
            setOriginalAssets(JSON.parse(JSON.stringify(data))); // Deep copy for dirty checking
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラーです。');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpload = async (file: File, assetType: 'heroVideo' | 'mainLogo' | 'favicon', folder: string) => {
        setError(null);
        const formData = new FormData();
        formData.append('assetFile', file);
        formData.append('type', assetType);
        formData.append('folder', folder);

        try {
            const response = await fetch('/api/upload_asset.php', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'アップロードに失敗しました。');

            setAssets(prev => {
                if (!prev) return null;
                const newAssets = { ...prev };
                if (assetType === 'heroVideo') {
                    newAssets.heroVideos = [...newAssets.heroVideos, result.filePath];
                } else if (assetType === 'mainLogo') {
                    newAssets.logos.main = result.filePath;
                } else if (assetType === 'favicon') {
                    newAssets.logos.favicon = result.filePath;
                }
                return newAssets;
            });
            setSuccessMessage(`「${file.name}」がアップロードされました。変更を保存してください。`);
            setTimeout(() => setSuccessMessage(null), 4000);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'アップロード中にエラーが発生しました。');
            return false;
        }
    };

    const handleDelete = async (pathToDelete: string, assetType: 'heroVideo') => {
        if (!window.confirm(`ファイル「${pathToDelete}」をサーバーから完全に削除しますか？この操作は元に戻せません。`)) return;
        setError(null);
        try {
            const response = await fetch('/api/delete_asset.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: pathToDelete }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'ファイルの削除に失敗しました。');
            
            setAssets(prev => {
                if (!prev) return null;
                if (assetType === 'heroVideo') {
                    return { ...prev, heroVideos: prev.heroVideos.filter(p => p !== pathToDelete) };
                }
                return prev;
            });
            setSuccessMessage(`「${pathToDelete}」が削除されました。変更を保存してください。`);
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'ファイル削除中にエラーが発生しました。');
        }
    };
    
    const handleSaveChanges = async () => {
        if (!assets) return;
        setSaving(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const response = await fetch('/api/save_site_assets.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assets, null, 2),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || '設定の保存に失敗しました。');
            setOriginalAssets(JSON.parse(JSON.stringify(assets))); // Update original state
            setSuccessMessage('アセット設定が正常に保存されました。');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : '保存中にエラーが発生しました。');
        } finally {
            setSaving(false);
        }
    };

    const FileUploader: React.FC<{ assetType: 'heroVideo' | 'mainLogo' | 'favicon', folder: string, acceptedTypes: string, label: string }> = ({ assetType, folder, acceptedTypes, label }) => {
        const [uploading, setUploading] = useState(false);
        const fileInputRef = useRef<HTMLInputElement>(null);

        const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            await handleUpload(file, assetType, folder);
            setUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        };
        
        return (
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <div className="flex items-center">
                    <input type="file" ref={fileInputRef} accept={acceptedTypes} onChange={onFileChange} disabled={uploading} className="text-sm" />
                    {uploading && <i className="fas fa-spinner fa-spin ml-2"></i>}
                </div>
            </div>
        );
    };

    if (loading) return <div className="p-8"><LoadingOverlay /></div>;
    if (error && !successMessage) return <div className="m-4 p-3 bg-red-100 text-red-800 border border-red-200 rounded-md">{error}</div>;

    return (
        <div className="relative h-full">
            {isLocked && <LockedOverlay />}
            <div className="bg-white p-4 border-b sticky top-0 z-10">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h2 className="text-xl font-bold">アセット管理</h2>
                        <p className="text-sm text-gray-500">サイトの画像や動画を管理します。</p>
                    </div>
                     <button onClick={handleSaveChanges} disabled={saving || !isDirty} className="bg-secondary text-white font-bold py-2 px-6 rounded-md shadow-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed enabled:hover:bg-indigo-700">
                        {saving ? <><i className="fas fa-spinner fa-spin mr-2"></i>保存中...</> : '変更を保存'}
                    </button>
                </div>
            </div>
             {(successMessage || error) && (
                <div className="m-4 p-3 rounded-md animate-fade-in-up" style={{ backgroundColor: error ? '#fee2e2' : '#dcfce7', color: error ? '#991b1b' : '#166534', border: `1px solid ${error ? '#fecaca' : '#bbf7d0'}` }}>
                    {successMessage || error}
                </div>
            )}
            
            <div className="p-4">
                <div className="mb-4 border-b">
                    <nav className="flex space-x-4">
                         <button onClick={() => setActiveTab('hero')} className={`px-4 py-2 font-semibold text-sm ${activeTab === 'hero' ? 'border-b-2 border-secondary text-secondary' : 'text-gray-500 hover:text-gray-700'}`}>ヒーローセクション</button>
                         <button onClick={() => setActiveTab('logos')} className={`px-4 py-2 font-semibold text-sm ${activeTab === 'logos' ? 'border-b-2 border-secondary text-secondary' : 'text-gray-500 hover:text-gray-700'}`}>ロゴ・ファビコン</button>
                    </nav>
                </div>
                
                {activeTab === 'hero' && assets && (
                    <Section title="背景動画">
                        <FileUploader assetType="heroVideo" folder="videos" acceptedTypes="video/mp4" label="新しい動画をアップロード (MP4)" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {assets.heroVideos.map(videoPath => (
                                <div key={videoPath} className="border p-2 bg-gray-50 relative group">
                                    <video src={videoPath} className="w-full h-32 object-cover bg-black" muted playsInline />
                                    <p className="text-xs break-all mt-2">{videoPath.split('/').pop()}</p>
                                    <button onClick={() => handleDelete(videoPath, 'heroVideo')} className="absolute top-1 right-1 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="削除">
                                        <i className="fas fa-trash-alt text-xs"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}
                
                {activeTab === 'logos' && assets && (
                    <div className="space-y-6">
                        <Section title="ロゴ">
                            <div className="flex items-center gap-4">
                                <div className="w-32 h-32 bg-gray-100 p-2 flex items-center justify-center border">
                                    {assets.logos.main ? <img src={assets.logos.main} alt="Current Logo" className="max-w-full max-h-full object-contain" /> : <span className="text-xs text-gray-500">No Logo</span>}
                                </div>
                                <FileUploader assetType="mainLogo" folder="images/logos" acceptedTypes="image/png,image/svg+xml,image/jpeg" label="新しいロゴをアップロード" />
                            </div>
                        </Section>
                         <Section title="ファビコン">
                             <div className="flex items-center gap-4">
                                 <div className="w-16 h-16 bg-gray-100 p-1 flex items-center justify-center border">
                                    {assets.logos.favicon ? <img src={assets.logos.favicon} alt="Current Favicon" className="max-w-full max-h-full object-contain" /> : <span className="text-xs text-gray-500">No Icon</span>}
                                 </div>
                                 <FileUploader assetType="favicon" folder="images/logos" acceptedTypes="image/x-icon,image/png,image/svg+xml" label="新しいファビコンをアップロード" />
                            </div>
                         </Section>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssetManager;