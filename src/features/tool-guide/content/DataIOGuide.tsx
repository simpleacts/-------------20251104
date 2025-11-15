import React from 'react';
import GuideStep from '@components/molecules/GuideStep';

const DataIOGuide: React.FC = () => (
    <div>
        <h3 className="text-2xl font-bold mb-4">データ入出力ツール</h3>
        <p className="mb-6 text-sm text-muted">このツールは、システム内外のデータを連携させるための機能を提供します。メーカーから提供される在庫CSVを取り込んだり、データベースのバックアップを作成したりできます。</p>
        
        <h4 className="text-lg font-bold mb-3">在庫CSVインポート</h4>
        <div className="pl-4 border-l-4 border-base-200 dark:border-base-dark-300">
            <GuideStep number={1} title="インポートの準備">
                <p>まず、インポートしたいCSVファイルを用意します。</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong className="font-semibold">ブランド指定 (任意):</strong> CSVファイル内にブランド情報が含まれていない場合、ここで指定したブランドの在庫として一括で登録できます。</li>
                    <li><strong className="font-semibold">文字コード選択:</strong> 通常、Windowsで作成されたCSVファイルは「Shift-JIS」です。ファイルが文字化けする場合は「UTF-8」を試してください。</li>
                </ul>
            </GuideStep>
            <GuideStep number={2} title="CSVファイルのアップロード">
               <p>「在庫リストCSVをアップロード」エリアにファイルをドラッグ＆ドロップするか、クリックしてファイルを選択します。</p>
            </GuideStep>
            <GuideStep number={3} title="項目のマッピング（対応付け）">
               <p>CSVファイルの列名（ヘッダー）と、システムが認識する項目を対応付けます。例えば、CSVの「品番」という列を、システムの「品番/商品コード」に割り当てます。</p>
               <p className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-xs rounded-md"><strong className="font-semibold">重要:</strong> <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">ブランド名</code>, <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">品番/商品コード</code>, <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">在庫数</code> は、インポートに必要な必須項目です。</p>
            </GuideStep>
             <GuideStep number={4} title="確認とインポート" isFinal>
               <p>マッピングが完了すると、取り込まれるデータのプレビューが表示されます。内容を確認し、問題がなければ「インポート実行」ボタンをクリックしてデータをシステムに反映させます。</p>
            </GuideStep>
        </div>
         <h4 className="text-lg font-bold my-3 pt-4 border-t">CSVエクスポート</h4>
         <p className="text-sm">システム内の各テーブルデータをCSVファイルとしてダウンロードします。データのバックアップや、表計算ソフトでの分析に利用できます。</p>
         <h4 className="text-lg font-bold my-3 pt-4 border-t">SQLエクスポート</h4>
         <p className="text-sm">データベースの構造とデータをSQLファイル形式でダウンロードします。サーバーの移行や、開発環境へのデータ複製など、専門的な用途に使用します。</p>
         <p className="p-2 bg-red-100 dark:bg-red-900/30 text-xs rounded-md mt-2"><strong className="font-semibold">注意:</strong> 「個別のテーブルを選択」してエクスポート・リストアを行うと、データの関連性が崩れてシステムが正常に動作しなくなる可能性があります。通常のバックアップには「データベース全体」を選択してください。</p>
    </div>
);

export default DataIOGuide;
