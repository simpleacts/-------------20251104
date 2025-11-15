// components/AdminApp.tsx

import React, { Suspense, useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { AppData, LockState, LockType } from '../types';
import { fetchData } from '../services/apiService';

// Lazy load components for better performance
const LoadingFallback = () => <div className="p-8 flex items-center justify-center h-full"><i className="fas fa-spinner fa-spin mr-2 text-2xl"></i>読み込み中...</div>;

const AdminDashboard = React.lazy(() => import('./AdminDashboard'));
const StaticPageEditor = React.lazy(() => import('./StaticPageEditor'));
const ThemeEditor = React.lazy(() => import('./ThemeEditor'));
const AssetManager = React.lazy(() => import('./AssetManager'));
const ThemeGenerator = React.lazy(() => import('./ThemeGenerator'));
const AiResearchAssistant = React.lazy(() => import('./AiResearchAssistant'));
const SalesStrategyOptimizer = React.lazy(() => import('./SalesStrategyOptimizer'));
const MarketingContentGenerator = React.lazy(() => import('./MarketingContentGenerator'));
const CustomerExperienceEnhancer = React.lazy(() => import('./CustomerExperienceEnhancer'));
const SiteAnalyzer = React.lazy(() => import('./SiteAnalyzer'));
const UiTextEditor = React.lazy(() => import('./UiTextEditor'));
const ArticleManager = React.lazy(() => import('./ArticleManager'));
const GalleryManager = React.lazy(() => import('./GalleryManager'));
const DeveloperTools = React.lazy(() => import('./DeveloperTools'));
const SystemLogViewer = React.lazy(() => import('./SystemLogViewer'));

const AdminLayout: React.FC<{ onLogout: () => void; children: React.ReactNode }> = ({ onLogout, children }) => {
    const location = useLocation();
    const navLinkClass = (path: string) => {
        const isActive = location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path));
        return `block px-4 py-2 text-sm rounded transition-colors ${isActive ? 'bg-secondary text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`;
    };

    return (
        <div className="flex h-screen bg-background font-sans">
            <aside className="w-64 bg-primary text-white flex-shrink-0 flex flex-col">
                <div className="p-4 border-b border-gray-700 flex items-center gap-3">
                    <i className="fas fa-tools text-xl"></i>
                    <div>
                        <h1 className="text-xl font-bold">捺染兄弟</h1>
                        <span className="text-sm text-gray-400">管理画面</span>
                    </div>
                </div>
                <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
                    <NavLink to="/admin" end className={navLinkClass('/admin')}>
                        <i className="fas fa-home w-6"></i>ダッシュボード
                    </NavLink>
                     <div className="pt-4">
                        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">コンテンツ管理</p>
                        <NavLink to="/admin/pages" className={navLinkClass('/admin/pages')}><i className="fas fa-file-alt w-6"></i>ページ編集</NavLink>
                        <NavLink to="/admin/articles" className={navLinkClass('/admin/articles')}><i className="fas fa-newspaper w-6"></i>記事管理</NavLink>
                        <NavLink to="/admin/gallery" className={navLinkClass('/admin/gallery')}><i className="fas fa-images w-6"></i>ギャラリー管理</NavLink>
                        <NavLink to="/admin/assets" className={navLinkClass('/admin/assets')}><i className="fas fa-photo-video w-6"></i>アセット管理</NavLink>
                    </div>
                    <div className="pt-4">
                        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">デザイン</p>
                        <NavLink to="/admin/theme-editor" className={navLinkClass('/admin/theme-editor')}><i className="fas fa-palette w-6"></i>テーマエディタ</NavLink>
                        <NavLink to="/admin/theme-generator" className={navLinkClass('/admin/theme-generator')}><i className="fas fa-magic w-6"></i>AI テーマ生成</NavLink>
                    </div>
                    <div className="pt-4">
                        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">AI ツール</p>
                        <NavLink to="/admin/ai-research" className={navLinkClass('/admin/ai-research')}><i className="fas fa-search-dollar w-6"></i>AIリサーチ</NavLink>
                        <NavLink to="/admin/sales-optimizer" className={navLinkClass('/admin/sales-optimizer')}><i className="fas fa-chart-line w-6"></i>販売戦略最適化</NavLink>
                        <NavLink to="/admin/cx-enhancer" className={navLinkClass('/admin/cx-enhancer')}><i className="fas fa-heart w-6"></i>顧客体験向上</NavLink>
                        <NavLink to="/admin/marketing-generator" className={navLinkClass('/admin/marketing-generator')}><i className="fas fa-bullhorn w-6"></i>マーケティングコンテンツ</NavLink>
                    </div>
                    <div className="pt-4">
                        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">分析</p>
                        <NavLink to="/admin/site-analyzer" className={navLinkClass('/admin/site-analyzer')}><i className="fas fa-chart-pie w-6"></i>サイト分析</NavLink>
                    </div>
                    <div className="pt-4">
                        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">システム・ツール</p>
                        <NavLink to="/admin/ui-text" className={navLinkClass('/admin/ui-text')}><i className="fas fa-language w-6"></i>UIテキスト編集</NavLink>
                        <NavLink to="/admin/devtools" className={navLinkClass('/admin/devtools')}><i className="fas fa-tools w-6"></i>開発ツール</NavLink>
                        <NavLink to="/admin/logs" className={navLinkClass('/admin/logs')}><i className="fas fa-shield-alt w-6"></i>システムログ</NavLink>
                    </div>
                </nav>
                <div className="p-4 border-t border-gray-700">
                     <a href="/" target="_blank" rel="noopener noreferrer" className="block w-full text-left text-gray-300 hover:bg-gray-700 hover:text-white font-semibold py-2 px-4 rounded mb-2">
                        <i className="fas fa-desktop w-6"></i>サイトを表示
                    </a>
                    <button onClick={onLogout} className="w-full text-left text-gray-300 hover:bg-accent hover:text-white font-semibold py-2 px-4 rounded">
                        <i className="fas fa-sign-out-alt w-6"></i>ログアウト
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                 <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background-subtle">
                    <Suspense fallback={<LoadingFallback />}>
                        {children}
                    </Suspense>
                 </main>
            </div>
        </div>
    );
};


const AdminLogin: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // This is a simple placeholder password. In a real application, use a proper auth system.
        if (password === 'admin') { 
            onLogin();
        } else {
            setError('パスワードが違います。');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-surface p-8 rounded-lg shadow-lg w-full max-w-sm">
                <h1 className="text-2xl font-bold text-center mb-6">管理画面ログイン</h1>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border border-border-default rounded-md focus:ring-secondary focus:border-secondary" required />
                    </div>
                    {error && <p className="text-sm text-accent">{error}</p>}
                    <button type="submit" className="w-full bg-primary text-white font-bold py-2 px-4 rounded-md hover:bg-primary/90 transition-colors">ログイン</button>
                </div>
            </form>
        </div>
    );
};


const AdminApp: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = React.useState(sessionStorage.getItem('isAdminAuthenticated') === 'true');
    const [appData, setAppData] = useState<AppData | null>(null);
    const [locks, setLocks] = useState<LockState | null>(null);

    useEffect(() => {
        fetchData()
            .then(data => setAppData(data))
            .catch(err => console.error("Failed to fetch app data for admin", err));
    }, []);

    useEffect(() => {
        if (!appData) return;

        const savedLocksJSON = localStorage.getItem('featureLocks');
        
        const defaultLocks: LockState = {
            theme: 'unlocked',
            content: 'unlocked',
            assets: 'unlocked',
            uiText: 'unlocked',
            homePage: 'unlocked',
            productDetailPage: 'unlocked',
            estimatorPage: 'unlocked',
            searchResultsPage: 'unlocked',
            pages: {},
        };

        let initialLocks: LockState;

        if (savedLocksJSON) {
            const savedLocks = JSON.parse(savedLocksJSON);
            initialLocks = { ...defaultLocks, ...savedLocks };

            // Migration logic for old boolean values
            (Object.keys(defaultLocks) as Array<keyof LockState>).forEach(key => {
                if (key !== 'pages' && typeof savedLocks[key] === 'boolean') {
                    // @ts-ignore
                    initialLocks[key] = savedLocks[key] ? 'immutable' : 'unlocked';
                }
            });
            
            const newPageLocks: Record<string, LockType> = {};
            Object.keys(appData.pagesContent).forEach(pageKey => {
                 if (typeof savedLocks.pages?.[pageKey] === 'boolean') {
                    newPageLocks[pageKey] = savedLocks.pages[pageKey] ? 'immutable' : 'unlocked';
                 } else {
                    newPageLocks[pageKey] = savedLocks.pages?.[pageKey] || 'unlocked';
                 }
            });
            initialLocks.pages = newPageLocks;

        } else {
            const initialPageLocks = Object.keys(appData.pagesContent).reduce((acc, key) => {
                acc[key] = 'unlocked';
                return acc;
            }, {} as Record<string, LockType>);
            
            initialLocks = { ...defaultLocks, pages: initialPageLocks };
        }
        setLocks(initialLocks);

    }, [appData]);

    const handleUpdateLocks = (newLocks: LockState) => {
        setLocks(newLocks);
        localStorage.setItem('featureLocks', JSON.stringify(newLocks));
    };

    const handleLogin = () => {
        sessionStorage.setItem('isAdminAuthenticated', 'true');
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('isAdminAuthenticated');
        setIsAuthenticated(false);
    };

    if (!isAuthenticated) {
        return <AdminLogin onLogin={handleLogin} />;
    }

    if (!locks || !appData) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <LoadingFallback />
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <AdminLayout onLogout={handleLogout}>
                <Routes>
                    <Route index element={<AdminDashboard />} />
                    <Route path="pages" element={<StaticPageEditor pageLocks={Object.entries(locks.pages).reduce((acc, [key, val]) => ({ ...acc, [key]: val !== 'unlocked' }), {})} />} />
                    <Route path="articles" element={<ArticleManager isLocked={locks.content !== 'unlocked'} />} />
                    <Route path="gallery" element={<GalleryManager isLocked={locks.content !== 'unlocked'} />} />
                    <Route path="assets" element={<AssetManager isLocked={locks.assets !== 'unlocked'} />} />
                    <Route path="theme-editor" element={<ThemeEditor isLocked={locks.theme !== 'unlocked'} />} />
                    <Route path="theme-generator" element={<ThemeGenerator isLocked={locks.theme !== 'unlocked'} />} />
                    <Route path="ai-research" element={<AiResearchAssistant />} />
                    <Route path="sales-optimizer" element={<SalesStrategyOptimizer />} />
                    <Route path="cx-enhancer" element={<CustomerExperienceEnhancer />} />
                    <Route path="marketing-generator" element={<MarketingContentGenerator />} />
                    <Route path="site-analyzer" element={<SiteAnalyzer />} />
                    <Route path="ui-text" element={<UiTextEditor isLocked={locks.uiText !== 'unlocked'} />} />
                    <Route path="devtools" element={<DeveloperTools locks={locks} appData={appData} onUpdateLocks={handleUpdateLocks} />} />
                    <Route path="logs" element={<SystemLogViewer />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
            </AdminLayout>
        </ErrorBoundary>
    );
};

export default AdminApp;
