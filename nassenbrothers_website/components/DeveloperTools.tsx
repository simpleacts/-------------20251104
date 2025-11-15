import React, { useState, useEffect, useMemo } from 'react';
import { AppData, LockState, LockType, PageData } from '../types';

interface DeveloperToolsProps {
    locks: LockState;
    appData: AppData;
    onUpdateLocks: (newLocks: LockState) => void;
}

const LockControl: React.FC<{
    id: string;
    label: string;
    description: string;
    currentLock: LockType;
    onChange: (newLock: LockType) => void;
    onPromote: () => void;
}> = ({ id, label, description, currentLock, onChange, onPromote }) => {
    const options: { value: LockType, label: string }[] = [
        { value: 'unlocked', label: '変更可' },
        { value: 'immutable', label: '変更不可' },
        { value: 'copy_and_edit', label: 'コピーして編集' },
    ];
    
    return (
        <div className="p-4 border rounded-lg bg-white">
            <div className="flex justify-between items-start">
                <div>
                    <label className="font-semibold text-gray-800">{label}</label>
                    {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
                </div>
                <div className="flex bg-gray-200 rounded-full p-0.5 text-xs font-semibold">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => onChange(opt.value)}
                            className={`px-3 py-1 rounded-full transition-colors ${currentLock === opt.value ? 'bg-white text-secondary shadow-sm' : 'text-gray-500 hover:bg-gray-300'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
            {currentLock === 'copy_and_edit' && (
                <div className="mt-3 pt-3 border-t text-right">
                    <button
                        onClick={onPromote}
                        className="text-xs bg-secondary text-white font-semibold py-1 px-3 rounded hover:bg-secondary/90 transition-colors flex items-center gap-2 ml-auto"
                        title="最新のコピーをオリジナルとして採用し、変更不可に設定する操作をAIに依頼します。"
                    >
                        <i className="fas fa-check-circle"></i>
                        このバージョンを適用してロック
                    </button>
                </div>
            )}
        </div>
    );
};


const DeveloperTools: React.FC<DeveloperToolsProps> = ({ locks, appData, onUpdateLocks }) => {
    const [currentMode, setCurrentMode] = useState(localStorage.getItem('devMode') || 'mock');
    const [showReloadMessage, setShowReloadMessage] = useState(false);
    const [localLocks, setLocalLocks] = useState<LockState>(locks);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isPagesExpanded, setIsPagesExpanded] = useState(false);

    useEffect(() => {
        setLocalLocks(locks);
    }, [locks]);
    
    const pages = useMemo(() => {
        // FIX: Added explicit type for 'page' to resolve property access on 'unknown' error.
        return Object.entries(appData.pagesContent).map(([key, page]: [string, PageData]) => ({
            key,
            title: page.meta_title.split('|')[0].trim()
        }));
    }, [appData.pagesContent]);


    const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMode = e.target.value;
        
        if (newMode === 'live' && currentMode === 'mock') {
            if (window.confirm('本当にライブモードに切り替えますか？ライブ環境への接続設定が正しく行われていない場合、アプリケーションが起動しなくなる可能性があります。')) {
                setCurrentMode(newMode);
                localStorage.setItem('devMode', newMode);
                setShowReloadMessage(true);
            }
        } else if (newMode !== currentMode) {
            setCurrentMode(newMode);
            localStorage.setItem('devMode', newMode);
            setShowReloadMessage(true);
        }
    };
    
    const handleLockChange = (key: keyof Omit<LockState, 'pages'> | `pages.${string}`, value: LockType) => {
        setLocalLocks(prev => {
            const newLocks = { ...prev };
            if (key.startsWith('pages.')) {
                const pageKey = key.substring(6);
                newLocks.pages = { ...newLocks.pages, [pageKey]: value };
            } else {
                // @ts-ignore
                newLocks[key] = value;
            }
            return newLocks;
        });
    };
    
    const handleToggleAllPages = (lockType: LockType) => {
        const newPageLocks = Object.keys(localLocks.pages).reduce((acc, key) => {
            acc[key] = lockType;
            return acc;
        }, {} as Record<string, LockType>);
        setLocalLocks(prev => ({ ...prev, pages: newPageLocks }));
    };

    const handleSaveLocks = () => {
        setSaveStatus('saving');
        onUpdateLocks(localLocks);
        setTimeout(() => setSaveStatus('saved'), 500);
        setTimeout(() => setSaveStatus('idle'), 2500);
    };
    
    const handlePromote = (label: string) => {
        alert(
            `「${label}」の最新コピーをオリジナルとして適用し、変更不可に設定します。\n\n` +
            `この操作をAIに実行させるには、次のプロンプトで「${label}のコピーを適用してロックしてください」のように指示してください。`
        );
    };

    return (
        <div>
            <div className="bg-white p-4 border-b sticky top-0 z-10">
                <h2 className="text-xl font-bold">開発ツール</h2>
            </div>
            <div className="p-6 space-y-6">
                <div className="bg-white p-6 shadow-md border rounded-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">動作モード切り替え</h3>
                    <p className="text-sm text-gray-600 mb-4">アプリケーションのデータソースを切り替えます。変更後はページのリロードが必要です。</p>
                    
                    <div className="space-y-2">
                        <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                            <input type="radio" name="devMode" value="mock" checked={currentMode === 'mock'} onChange={handleModeChange} className="h-4 w-4 text-secondary focus:ring-secondary"/>
                            <span className="ml-3">
                                <span className="font-semibold">モックモード (デフォルト)</span>
                                <p className="text-xs text-gray-500">ローカルのサンプルデータ(CSV)を使用して動作します。オフラインでの開発やUI確認に最適です。</p>
                            </span>
                        </label>
                        <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                            <input type="radio" name="devMode" value="live" checked={currentMode === 'live'} onChange={handleModeChange} className="h-4 w-4 text-secondary focus:ring-secondary"/>
                            <span className="ml-3">
                                <span className="font-semibold">ライブモード</span>
                                <p className="text-xs text-gray-500">サーバー上のデータベースと通信して動作します。実際のデータでテストを行う場合に使用します。</p>
                            </span>
                        </label>
                    </div>

                    {showReloadMessage && (
                        <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500 animate-fade-in-up">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            設定を反映するには、管理画面とフロントエンドの両方のページをリロードしてください。
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 shadow-md border rounded-lg">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                        <div>
                           <h3 className="text-lg font-bold text-gray-800">開発ロック管理</h3>
                           <p className="text-sm text-gray-600">AIによる意図しない変更を防ぐため、各機能の編集ルールを設定します。</p>
                        </div>
                         <button onClick={handleSaveLocks} disabled={saveStatus !== 'idle' || JSON.stringify(locks) === JSON.stringify(localLocks)} className="bg-secondary text-white font-bold py-2 px-6 rounded-md shadow-sm transition-colors disabled:bg-gray-400 enabled:hover:bg-indigo-700">
                           {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '保存完了' : '設定を保存'}
                        </button>
                    </div>
                    
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-md font-semibold text-gray-700 mb-2">コンテンツ</h4>
                            <div className="space-y-3">
                                <LockControl id="lock-content" label="記事 & ギャラリー管理" description="ブログ記事や制作実績の追加・編集・削除に関するルール" currentLock={localLocks.content} onChange={v => handleLockChange('content', v)} onPromote={() => handlePromote('記事 & ギャラリー')} />
                                <LockControl id="lock-uiText" label="UIテキスト" description="サイト内のボタン文言などの細かいテキスト編集に関するルール" currentLock={localLocks.uiText} onChange={v => handleLockChange('uiText', v)} onPromote={() => handlePromote('UIテキスト')} />
                            </div>
                        </div>
                         <div>
                            <h4 className="text-md font-semibold text-gray-700 mb-2">主要機能ページ</h4>
                             <div className="space-y-3">
                                <LockControl id="lock-home" label="トップページ" description="" currentLock={localLocks.homePage} onChange={v => handleLockChange('homePage', v)} onPromote={() => handlePromote('トップページ')} />
                                <LockControl id="lock-product" label="商品詳細ページ" description="" currentLock={localLocks.productDetailPage} onChange={v => handleLockChange('productDetailPage', v)} onPromote={() => handlePromote('商品詳細ページ')} />
                                <LockControl id="lock-estimator" label="見積もりページ" description="" currentLock={localLocks.estimatorPage} onChange={v => handleLockChange('estimatorPage', v)} onPromote={() => handlePromote('見積もりページ')} />
                                <LockControl id="lock-search" label="検索結果ページ" description="" currentLock={localLocks.searchResultsPage} onChange={v => handleLockChange('searchResultsPage', v)} onPromote={() => handlePromote('検索結果ページ')} />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-md font-semibold text-gray-700 mb-2">デザイン & アセット</h4>
                             <div className="space-y-3">
                                <LockControl id="lock-theme" label="テーマ & デザイン" description="サイトの配色やフォントなどの外観設定に関するルール" currentLock={localLocks.theme} onChange={v => handleLockChange('theme', v)} onPromote={() => handlePromote('テーマ & デザイン')} />
                                <LockControl id="lock-assets" label="アセット管理" description="ロゴや背景動画などのファイル管理機能に関するルール" currentLock={localLocks.assets} onChange={v => handleLockChange('assets', v)} onPromote={() => handlePromote('アセット管理')} />
                            </div>
                        </div>
                        <div>
                             <div className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50 cursor-pointer" onClick={() => setIsPagesExpanded(!isPagesExpanded)}>
                                <div className="font-semibold">静的ページ</div>
                                <div className="flex items-center gap-4">
                                    <i className={`fas fa-chevron-down transition-transform ${isPagesExpanded ? 'rotate-180' : ''}`}></i>
                                </div>
                            </div>
                            {isPagesExpanded && (
                                <div className="p-3 border-t bg-gray-50 space-y-2">
                                    {pages.map(page => (
                                        <LockControl
                                            key={page.key}
                                            id={`lock-page-${page.key}`}
                                            label={page.title}
                                            description=""
                                            currentLock={localLocks.pages[page.key] ?? 'unlocked'}
                                            onChange={v => handleLockChange(`pages.${page.key}`, v)}
                                            onPromote={() => handlePromote(page.title)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeveloperTools;