import React, { useState } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { SpinnerIcon, ExclamationTriangleIcon, TrashIcon } from '@components/atoms';

// --- Atomic Design: Organisms ---

const CacheManagement: React.FC = () => {
    const { t } = useTranslation('dev-tools');
    const [isClearing, setIsClearing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClearCache = async () => {
        if (window.confirm(
            t('cache.clear_confirm', 'アプリケーションのキャッシュ（localStorage）をすべて削除します。\nこれにより、次回読み込み時にサーバーまたはCSVから最新のデータが再取得されます。\n\nよろしいですか？')
        )) {
            setIsClearing(true);
            setError(null);
            try {
                localStorage.clear(); // Clears appMode, etc.
                
                // Show a success message and reload.
                alert(t('cache.cleared', 'キャッシュをクリアしました。アプリケーションを再読み込みします。'));
                window.location.reload();

            } catch (err) {
                const message = err instanceof Error ? err.message : t('cache.clear_failed', 'キャッシュのクリアに失敗しました。');
                setError(message);
                setIsClearing(false);
            }
        }
    };

    return (
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg shadow-md border border-red-200 dark:border-red-800">
            <h2 className="text-xl font-bold mb-4 text-red-800 dark:text-red-200 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-6 h-6" />
                {t('cache.title', 'キャッシュ管理 (危険な操作)')}
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                {t('cache.description', 'アプリケーションの動作がおかしい場合や、データの変更が反映されない場合に、ブラウザに保存されているキャッシュを強制的に削除します。')}
            </p>
            {error && <p className="text-sm text-red-600 bg-red-200 p-2 rounded-md mb-4">{error}</p>}
            <button
                onClick={handleClearCache}
                disabled={isClearing}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
            >
                {isClearing ? <SpinnerIcon className="w-5 h-5"/> : <TrashIcon className="w-5 h-5" />}
                {isClearing ? t('cache.clearing', 'クリア中...') : t('cache.clear_button', 'キャッシュをクリアして再読み込み')}
            </button>
        </div>
    );
};

export default CacheManagement;
