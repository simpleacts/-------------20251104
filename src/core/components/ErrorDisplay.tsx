import React from 'react';
import { setStoredAppMode } from '../utils/appMode';

interface ErrorDisplayProps {
    error: string;
    onForceCsvDebugReload?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onForceCsvDebugReload }) => {
    const handleCsvDebugReload = () => {
        setStoredAppMode('csv-debug');
        window.location.reload();
    };
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-base-200 dark:bg-base-dark p-8">
            <div className="text-left bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 p-6 rounded-lg shadow-lg max-w-2xl">
                <h2 className="text-2xl font-bold mb-4">データベースの読み込みに失敗しました</h2>
                <p className="mb-4">
                    アプリケーションがデータベースから情報を取得できませんでした。以下の点をご確認ください。
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4 text-sm">
                    <li>
                        <strong>ファイル構造の確認:</strong><br />
                        サーバーのルートディレクトリに `api` と `templates` という2つのフォルダが正しく設置されていますか？
                    </li>
                    <li>
                        <strong>設定ファイルの確認:</strong><br />
                        `templates` フォルダの中に `server_config.csv` ファイルを設置し、その中に正しい `db_host`, `db_name`, `db_user`, `db_password` を記入しましたか？
                    </li>
                     <li>
                        <strong>APIスクリプトの確認:</strong><br />
                        `api` フォルダの中に必要なPHPファイル（例: `app-initialization-data.php`）が設置されていますか？
                    </li>
                    <li>
                        <strong>サーバー設定の確認:</strong><br />
                        ホスティングサービスで、データベースへのアクセスが許可されていますか？（IPアドレス制限など）
                    </li>
                    <li>
                        <strong>開発モードの確認:</strong><br />
                        開発環境で誤って「ライブモード」に切り替えていませんか？その場合は、下のボタンから「CSVデバッグモード」で再起動してください。
                    </li>
                </ul>
                <details className="bg-red-200/50 dark:bg-red-800/20 rounded-md">
                    <summary className="cursor-pointer p-2 text-sm font-semibold">技術的な詳細エラーを表示</summary>
                    <div className="p-2 border-t border-red-300 dark:border-red-700/50">
                        <pre className="whitespace-pre-wrap text-xs font-mono">{error}</pre>
                    </div>
                </details>
                <div className="mt-6 flex items-center justify-end gap-4">
                    <button
                        onClick={onForceCsvDebugReload || handleCsvDebugReload}
                        className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                        CSVデバッグモードで再起動
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                        再読み込み
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorDisplay;