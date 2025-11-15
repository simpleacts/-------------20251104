import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, LockClosedIcon, SparklesIcon, SpinnerIcon, UserCircleIcon } from '../ui/atoms/icons';
// FIX: Corrected import path.
import { useAuth } from '../../core/contexts/AuthContext';
import { AppMode } from '../../core/types/appMode';
import { getPersistedAppMode, setStoredAppMode } from '../../core/utils/appMode';
import ForgotPasswordModal from '../modals/ForgotPasswordModal';
import { Table } from '../types';

interface LoginProps {
    usersTable: Table;
}

const Login: React.FC<LoginProps> = ({ usersTable }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [connectionMode, setConnectionMode] = useState<AppMode>(() => {
        // 保存済みモードを読み込む（存在しない場合はliveをデフォルト）
        return getPersistedAppMode() ?? 'live';
    });
    const { login } = useAuth();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        setTimeout(() => {
            if (!usersTable || !usersTable.data) {
                setError('ユーザー情報が読み込めませんでした。');
                setIsLoading(false);
                return;
            }

            const trimmedUsername = username.trim();
            const trimmedPassword = password.trim();

            const user = usersTable.data.find(u => u.username === trimmedUsername);

            if (user && user.password === trimmedPassword) {
                // 選択した接続モードを保存
                setStoredAppMode(connectionMode);
                login(user);
            } else {
                setError('ユーザー名またはパスワードが正しくありません。');
            }
            setIsLoading(false);
        }, 500);
    };

    return (
        <>
            <div className="flex items-center justify-center min-h-screen bg-base-200 dark:bg-base-dark">
                <div className="w-full max-w-md p-8 space-y-8 bg-base-100 dark:bg-base-dark-200 rounded-2xl shadow-lg">
                    <div className="text-center">
                        <SparklesIcon className="w-12 h-12 mx-auto text-brand-primary" />
                        <h1 className="mt-4 text-3xl font-bold text-base dark:text-base-dark">
                            AI データベースアシスタント
                        </h1>
                        <p className="mt-2 text-sm text-muted dark:text-muted-dark">
                            ログインしてください
                        </p>
                    </div>
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div className="relative">
                            <label htmlFor="username-input" className="sr-only">ユーザー名</label>
                            <UserCircleIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                id="username-input"
                                name="username"
                                type="text"
                                autoComplete="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="ユーザー名"
                                required
                                className="w-full pl-10 pr-3 py-2 bg-base-200 dark:bg-base-dark-300 border border-default dark:border-default-dark rounded-md text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor="password-input" className="sr-only">パスワード</label>
                            <LockClosedIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                id="password-input"
                                name="password"
                                type={isPasswordVisible ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="パスワード"
                                required
                                className="w-full pl-10 pr-10 py-2 bg-base-200 dark:bg-base-dark-300 border border-default dark:border-default-dark rounded-md text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-base p-1"
                              aria-label={isPasswordVisible ? "パスワードを隠す" : "パスワードを表示"}
                            >
                              {isPasswordVisible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>

                        <div>
                            <label htmlFor="connection-mode-select" className="block text-sm font-medium mb-2 text-base-content dark:text-base-dark-content">
                                接続モード
                            </label>
                            <select
                                id="connection-mode-select"
                                value={connectionMode}
                                onChange={(e) => setConnectionMode(e.target.value as AppMode)}
                                className="w-full bg-base-200 dark:bg-base-dark-300 border border-default dark:border-default-dark rounded-md p-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none text-base-content dark:text-base-dark-content"
                            >
                                <option value="live">API接続（ライブモード）</option>
                                <option value="csv-debug">CSVデバッグモード（読み取り専用）</option>
                                <option value="csv-writable">CSV書き込みモード（自動保存）</option>
                            </select>
                            <p className="mt-1 text-xs text-muted dark:text-muted-dark">
                                {connectionMode === 'live' 
                                    ? 'サーバー上のデータベースに接続します'
                                    : 'ローカルのCSVファイルを読み込みます（データベース更新前の確認に便利）'}
                            </p>
                        </div>
                        
                        {error && <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/30 p-2 rounded-md text-center">{error}</p>}

                        <div>
                            <button
                                type="submit"
                                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-button-primary dark:text-button-primary-dark bg-button-primary-bg dark:bg-button-primary-bg-dark hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary"
                                disabled={isLoading}
                            >
                                {isLoading ? <SpinnerIcon className="w-5 h-5" /> : 'ログイン'}
                            </button>
                        </div>

                        <div className="text-center text-sm">
                            <button
                                type="button"
                                onClick={() => setIsResetModalOpen(true)}
                                className="font-medium text-brand-primary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                パスワードをお忘れですか？
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {isResetModalOpen && (
                <ForgotPasswordModal
                    isOpen={isResetModalOpen}
                    onClose={() => setIsResetModalOpen(false)}
                    usersTable={usersTable}
                />
            )}
        </>
    );
};

export default Login;