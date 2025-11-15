import React from 'react';
import GuideStep from '@components/molecules/GuideStep';

const ToolDependencyManagerGuide: React.FC = () => (
    <div>
        <h3 className="text-2xl font-bold mb-4">ツール依存性管理</h3>
        <p className="mb-6 text-sm text-muted">このツールは、アプリケーション内の各ツールが、どのデータベーステーブルを読み込み（Read）または書き込み（Write）しているか、という依存関係を定義し、視覚化するためのものです。</p>
        <p className="p-2 bg-blue-100 dark:bg-blue-900/30 text-xs rounded-md mb-4"><strong className="font-semibold">目的:</strong> アプリケーション全体のデータフローを明確にし、テーブル構造の変更がどのツールに影響を与えるかを即座に把握できるようにします。これにより、メンテナンス性や開発効率が向上します。</p>
        
        <h4 className="text-lg font-bold mb-3">使い方</h4>
        <div className="pl-4 border-l-4 border-base-200 dark:border-base-dark-300">
            <GuideStep number={1} title="ツールとテーブルの特定">
                <p>上部のヘッダー行から依存関係を定義したいツール（例：「見積作成ツール」）の列を探し、左側の列からそのツールが利用するテーブル（例：「quotes」）の行を探します。</p>
            </GuideStep>
            <GuideStep number={2} title="依存関係をチェック">
               <p>ツールとテーブルが交差するセルで、依存関係に応じたチェックを入れます。</p>
                <ul className="list-disc list-inside space-y-2 text-xs mt-2">
                    <li><strong className="font-semibold text-blue-600">Read (読み込み):</strong> ツールがテーブルからデータを読み込むだけの場合、上の青いチェックボックスをオンにします。</li>
                    <li><strong className="font-semibold text-red-600">Write (書き込み):</strong> ツールがテーブルにデータを書き込む・更新する場合、下にある赤いチェックボックスをオンにします。</li>
                </ul>
                <p className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-xs rounded-md mt-2">データを書き込むには通常読み込みも伴うため、Writeをチェックすると自動的にReadもチェックされます。</p>
            </GuideStep>
            <GuideStep number={3} title="すべてのツールで繰り返す">
               <p>この作業を、アプリケーション内のすべてのツールと、それが関連するすべてのテーブルに対して行います。</p>
            </GuideStep>
            <GuideStep number={4} title="設定を出力" isFinal>
               <p>すべてのマッピングが完了したら、右上の「設定を出力」ボタンをクリックします。ブラウザの開発者コンソールに、設定内容がJSON形式で出力されます。</p>
               <p className="text-xs">このJSONデータは、今後の開発やドキュメント作成、影響範囲の調査などに利用できます。</p>
            </GuideStep>
        </div>
    </div>
);

export default ToolDependencyManagerGuide;
