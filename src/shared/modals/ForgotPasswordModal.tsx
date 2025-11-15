import React, { useState } from 'react';
// FIX: Corrected type import path.
import { Row, Table } from '../types';
import { XMarkIcon, PaperAirplaneIcon, SpinnerIcon } from '../ui/atoms/icons';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    usersTable: Table;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose, usersTable }) => {
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    if (!isOpen) return null;

    const handleSendLink = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsLoading(true);

        setTimeout(() => {
            const trimmedUsername = username.trim();
            const userExists = usersTable.data.some(u => u.username === trimmedUsername);
            if (userExists) {
                setMessage({ type: 'success', text: `パスワード再設定用の手順を送信しました。(シミュレーション)` });
            } else {
                setMessage({ type: 'error', text: '入力されたユーザー名は登録されていません。' });
            }
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-default dark:border-default-dark">
                    <h2 className="text-xl font-bold">パスワードリセット</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <form onSubmit={handleSendLink}>
                    <main className="p-6 space-y-4">
                        <p className="text-sm text-muted dark:text-muted-dark">
                            登録済みのユーザー名を入力してください。パスワード再設定用の手順を送信します。（シミュレーション）
                        </p>
                        
                        {message && (
                            <p className={`text-sm p-2 rounded-md text-center ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'}`}>
                                {message.text}
                            </p>
                        )}
                        
                        <div>
                            <label htmlFor="reset-username" className="sr-only">ユーザー名</label>
                            <input
                                id="reset-username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="ユーザー名"
                                required
                                className="w-full bg-base-200 dark:bg-base-dark-300 border border-default dark:border-default-dark rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                            />
                        </div>
                    </main>
                    <footer className="flex justify-end gap-3 p-4 bg-base-200 dark:bg-base-dark-300/50">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark hover:opacity-90">
                            キャンセル
                        </button>
                        <button type="submit" disabled={isLoading || message?.type === 'success'} className="px-4 py-2 text-sm font-medium rounded-md bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark hover:opacity-90 flex items-center gap-2">
                            {isLoading ? <SpinnerIcon className="w-5 h-5"/> : <PaperAirplaneIcon className="w-5 h-5"/>}
                            {isLoading ? '送信中...' : 'リセット手順を送信'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default ForgotPasswordModal;