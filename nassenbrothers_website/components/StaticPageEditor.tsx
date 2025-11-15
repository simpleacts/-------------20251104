import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageData, ContentBlock, AppData } from '../types';
import { PageRenderer } from './ContentBlockRenderer';

interface StaticPageEditorProps {
    pageLocks: Record<string, boolean>;
}

const LoadingScreen: React.FC = () => (
    <div className="flex items-center justify-center h-full p-8">
        <i className="fas fa-spinner fa-spin text-2xl text-gray-500 mr-2"></i>
        コンテンツデータを読み込み中...
    </div>
);

const ErrorScreen: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
    <div className="p-8 text-red-600">
        <p>エラー: {message}</p>
        <button onClick={onRetry} className="mt-4 bg-primary text-white font-semibold py-2 px-4">再試行</button>
    </div>
);

const LockedOverlay: React.FC = () => (
    <div className="absolute inset-0 bg-gray-200/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-center p-4">
        <i className="fas fa-lock text-4xl text-gray-500 mb-4"></i>
        <h3 className="text-xl font-bold text-gray-700">機能はロックされています</h3>
        <p className="text-gray-600">このページの編集は現在ロックされています。</p>
        <p className="text-sm text-gray-500 mt-2">ロックを解除するには、開発ツールに移動してください。</p>
    </div>
);

const StaticPageEditor: React.FC<StaticPageEditorProps> = ({ pageLocks }) => {
    const [pages, setPages] = useState<Record<string, PageData> | null>(null);
    const [originalPages, setOriginalPages] = useState<Record<string, PageData> | null>(null);
    const [appData, setAppData] = useState<Partial<AppData> | null>(null);
    const [activePageKey, setActivePageKey] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    
    const isCurrentPageLocked = useMemo(() => {
        if (!activePageKey) return false;
        return pageLocks[activePageKey] ?? false;
    }, [activePageKey, pageLocks]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch('/api/app-data.php?cachebust=' + new Date().getTime());
            if (!response.ok) throw new Error(`アプリデータの読み込みに失敗しました: ${response.statusText}`);
            const data: AppData = await response.json();

            const pageContent = data.pagesContent;
            setPages(pageContent);
            setOriginalPages(JSON.parse(JSON.stringify(pageContent)));
            setAppData(data);

            const pageKeys = Object.keys(pageContent);
            if(pageKeys.length > 0) {
                setActivePageKey(pageKeys[0]);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'データ読み込みエラー');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const activePageData = pages && activePageKey ? pages[activePageKey] : null;
    const isDirty = useMemo(() => JSON.stringify(pages) !== JSON.stringify(originalPages), [pages, originalPages]);

    const handleSaveChanges = async () => {
        if (!pages) return;
        setSaving(true);
        setSaveStatus('idle');
        try {
            const response = await fetch('/api/save_pages_content.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pages, null, 2),
            });
            const resData = await response.json();
            if (!response.ok || !resData.success) throw new Error(resData.message || '保存に失敗しました');
            setOriginalPages(JSON.parse(JSON.stringify(pages)));
            setSaveStatus('success');
        } catch(e) {
            setError(e instanceof Error ? e.message : '不明なエラーです。');
            setSaveStatus('error');
        } finally {
            setSaving(false);
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };
    
    const updateBlock = (blockId: string, newContent: Partial<ContentBlock>) => {
        if (!pages || !activePageKey) return;
        const newPages = { ...pages };
        const page = newPages[activePageKey];
        page.blocks = page.blocks.map(b => b.id === blockId ? { ...b, ...newContent } : b);
        setPages(newPages);
    };

    const addBlock = (type: ContentBlock['type']) => {
        if (!pages || !activePageKey) return;
        const newBlock: ContentBlock = { id: `block_${Date.now()}`, type, content: '新しいコンテンツ' };
        if (type === 'ul' || type === 'ol') {
            newBlock.items = ['リストアイテム1'];
            delete newBlock.content;
        } else if (type === 'section-break'){
            delete newBlock.content;
        }
        const newPages = { ...pages };
        newPages[activePageKey].blocks.push(newBlock);
        setPages(newPages);
    };

    const removeBlock = (blockId: string) => {
        if (!pages || !activePageKey) return;
        if (!window.confirm('このブロックを削除しますか？')) return;
        const newPages = { ...pages };
        newPages[activePageKey].blocks = newPages[activePageKey].blocks.filter(b => b.id !== blockId);
        setPages(newPages);
    };
    
    const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
        if (!pages || !activePageKey) return;
        const blocks = [...pages[activePageKey].blocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= blocks.length) return;

        const [movedItem] = blocks.splice(index, 1);
        blocks.splice(targetIndex, 0, movedItem);

        const newPages = { ...pages };
        newPages[activePageKey].blocks = blocks;
        setPages(newPages);
    };


    const renderEditorBlock = (block: ContentBlock) => {
        const commonProps = {
            id: block.id,
            value: block.content || '',
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateBlock(block.id, { content: e.target.value }),
            className: "w-full p-2 border border-border-default shadow-sm focus:ring-secondary focus:border-secondary"
        };
        switch (block.type) {
            case 'h1': return <input {...commonProps} className={`${commonProps.className} text-2xl font-bold`} />;
            case 'h2': return <input {...commonProps} className={`${commonProps.className} text-xl font-bold`} />;
            case 'h3': return <input {...commonProps} className={`${commonProps.className} text-lg font-bold`} />;
            case 'p': return <textarea {...commonProps} rows={3} />;
            case 'section-break': return <div className="text-center text-xs text-gray-400 py-2 my-2 border-t border-b">--- 区切り線 ---</div>;
            default: return <div className="text-xs p-2 bg-gray-200 text-gray-500">このブロックタイプは直接編集できません。</div>;
        }
    };

    if (loading) return <LoadingScreen />;
    if (error) return <ErrorScreen message={error} onRetry={fetchData} />;

    return (
        <div className="flex h-[calc(100vh-theme(height.16))] bg-background-subtle font-sans relative">
             {isCurrentPageLocked && <LockedOverlay />}
            {/* Control Panel */}
            <div className="w-1/3 flex flex-col h-full border-r bg-surface">
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold">ページエディタ</h2>
                    <button onClick={handleSaveChanges} disabled={saving || !isDirty} className="bg-secondary text-white font-bold py-2 px-6 shadow-sm transition-colors disabled:bg-gray-400 enabled:hover:bg-indigo-700">
                        {saving ? '保存中...' : '変更を保存'}
                    </button>
                </div>
                {saveStatus === 'success' && <div className="m-2 p-2 bg-green-100 text-green-800 border border-green-200 text-sm animate-fade-in-up">正常に保存されました。</div>}
                {saveStatus === 'error' && <div className="m-2 p-2 bg-red-100 text-red-800 border border-red-200 text-sm animate-fade-in-up">{error}</div>}

                <div className="p-4 border-b">
                     <label htmlFor="page-select" className="text-sm font-medium">編集するページ:</label>
                    <select id="page-select" value={activePageKey} onChange={e => setActivePageKey(e.target.value)} className="w-full mt-1 p-2 border">
                        {pages && Object.keys(pages).map(key => <option key={key} value={key}>{pages[key].meta_title.split('|')[0].trim()}</option>)}
                    </select>
                </div>
                <div className="flex-grow overflow-y-auto p-4">
                    {activePageData && (
                        <div className="space-y-4">
                            {activePageData.blocks.map((block, index) => (
                                <div key={block.id} className="p-3 bg-background border rounded-md relative group">
                                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                                        <button onClick={() => handleMoveBlock(index, 'up')} disabled={index === 0} className="disabled:opacity-20"><i className="fas fa-chevron-up"></i></button>
                                        <button onClick={() => handleMoveBlock(index, 'down')} disabled={index === activePageData.blocks.length - 1} className="disabled:opacity-20"><i className="fas fa-chevron-down"></i></button>
                                    </div>
                                    <div className="flex justify-between items-start ml-4">
                                        <div className="flex-grow relative">
                                            {renderEditorBlock(block)}
                                        </div>
                                        <button onClick={() => removeBlock(block.id)} className="text-gray-400 hover:text-red-500 ml-2 p-1"><i className="fas fa-trash"></i></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                 <div className="p-4 border-t">
                    <p className="text-sm font-semibold mb-2">新しいブロックを追加</p>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => addBlock('h2')} className="text-xs bg-gray-200 px-3 py-1 rounded">H2見出し</button>
                        <button onClick={() => addBlock('p')} className="text-xs bg-gray-200 px-3 py-1 rounded">段落</button>
                        <button onClick={() => addBlock('section-break')} className="text-xs bg-gray-200 px-3 py-1 rounded">区切り線</button>
                    </div>
                </div>
            </div>
            {/* Preview Panel */}
            <div className="w-2/3 h-full overflow-y-auto bg-white">
                <div className="p-4 bg-gray-800 text-white text-sm text-center sticky top-0">プレビュー</div>
                <div className="p-8">
                    {activePageData && appData && <PageRenderer pageData={activePageData} appData={appData as AppData} />}
                </div>
            </div>
        </div>
    );
};

export default StaticPageEditor;
