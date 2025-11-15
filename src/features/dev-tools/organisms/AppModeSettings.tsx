import React from 'react';
import { AppMode } from '@core/types/appMode';
import { setStoredAppMode } from '@core/utils/appMode';
import { useTranslation } from '@shared/hooks/useTranslation';

// --- Atomic Design: Organisms ---

const AppModeSettings: React.FC<{
    appMode: AppMode;
    setAppMode: (mode: AppMode) => void;
}> = ({ appMode, setAppMode }) => {
    const { t } = useTranslation('dev-tools');
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMode = e.target.value as AppMode;

        if (newMode === 'live' && appMode !== 'live') {
            const confirmation = window.confirm(
                t('app_mode.switch_to_live_confirm', '「ライブモード」に切り替えますか？\n\nこれにより、サーバー上の本番データベースに接続します。\nローカル開発環境など、接続が許可されていない環境からはアクセスできず、画面が読み込めなくなる可能性があります。\n\nよろしいですか？')
            );

            if (!confirmation) {
                e.target.value = appMode;
                return;
            }
        }
        
        // localStorageに即座に保存してから、setAppModeを呼び出す（リロード前の保存を確実にする）
        setStoredAppMode(newMode);
        setAppMode(newMode);
        
        const modeLabels: Record<AppMode, string> = { 
            live: t('app_mode.live', 'ライブ'), 
            'csv-debug': t('app_mode.csv_debug', 'CSVデバッグ'),
            'csv-writable': t('app_mode.csv_writable', 'CSV書き込み')
        };
        alert(t('app_mode.switched', 'モードを「{mode}」に切り替えました。ページを再読み込みして変更を適用します。').replace('{mode}', modeLabels[newMode]));
        
        // 少し遅延させてからリロード（状態更新を確実にするため）
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };

    return (
        <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">{t('app_mode.title', '動作モード設定')}</h2>
            <div className="space-y-2">
                <div>
                        <label htmlFor="app-mode-select" className="block text-sm font-medium mb-1">
                        {t('app_mode.current_mode', '現在のモード:')} <span className="font-semibold px-2 py-1 rounded-full bg-yellow-200 text-yellow-800">
                            {appMode === 'live' ? t('app_mode.live', 'ライブ') : 
                             appMode === 'csv-writable' ? t('app_mode.csv_writable', 'CSV書き込み') : 
                             t('app_mode.csv_debug', 'CSVデバッグ')}
                        </span>
                    </label>
                    <select 
                        id="app-mode-select"
                        value={appMode}
                        onChange={handleChange}
                        className="w-full bg-input-bg dark:bg-input-bg-dark border border-default rounded-md p-2 text-sm focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                    >
                        <option value="live">{t('app_mode.live_mode_option', 'ライブモード (PHP API)')}</option>
                        <option value="csv-debug">{t('app_mode.csv_debug_mode_option', 'CSVデバッグモード (読み取り専用)')}</option>
                        <option value="csv-writable">{t('app_mode.csv_writable_mode_option', 'CSV書き込みモード (自動保存)')}</option>
                    </select>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 pt-2">
                    <strong>{t('app_mode.live', 'ライブ')}:</strong> {t('app_mode.live_description', 'サーバー上の実際のデータベースと通信します。本番環境での通常の動作モードです。')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    <strong>{t('app_mode.csv_debug', 'CSVデバッグ')}:</strong> {t('app_mode.csv_debug_description', 'プロジェクト内のCSVファイルを直接読み込みます。初期データの構築や確認に最適です。読み取り専用です。')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    <strong>{t('app_mode.csv_writable', 'CSV書き込み')}:</strong> {t('app_mode.csv_writable_description', 'プロジェクト内のCSVファイルを読み込み、データ変更時に自動的にCSVファイルに保存します。ローカル開発環境でのデータ編集に最適です。')}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold pt-2">
                    {t('app_mode.switch_warning', '注意: モードを切り替えると、アプリケーションが自動的に再読み込みされます。')}
                </p>
            </div>
        </div>
    );
};

export default AppModeSettings;
