import React from 'react';
import GuideStep from '@components/molecules/GuideStep';

const FileNameConverterGuide: React.FC = () => (
    <div>
        <h3 className="text-2xl font-bold mb-4">ファイル名変換ツール</h3>
        <p className="mb-6 text-sm text-muted">カメラで撮影した写真など、命名規則がバラバラな大量の画像ファイル名（およびフォルダ構造）を、一括で整理・変換するためのツールです。</p>
         <div className="pl-4 border-l-4 border-base-200 dark:border-base-dark-300">
            <GuideStep number={1} title="ファイルのアップロード">
                <p>名前を変更したい画像ファイルや、画像を含むフォルダを画面上部の点線エリアにドラッグ＆ドロップするか、クリックして選択します。フォルダをアップロードすると、中のファイルが再帰的にすべて読み込まれます。</p>
            </GuideStep>
            <GuideStep number={2} title="変換ルールの作成・適用">
               <p>左側の「リネーム操作」パネルで、どのようなルールでファイル名を変更するかを設定します。ルールは複数追加でき、上から順番に適用されます。</p>
                <ul className="list-disc list-inside space-y-2 text-xs">
                    <li><strong className="font-semibold">置換:</strong> 特定の文字列を別の文字列に置き換えます。（例: 「IMG_」を削除する）正規表現も利用可能です。</li>
                    <li><strong className="font-semibold">接頭辞:</strong> ファイル名の先頭に指定した文字を追加します。（例: 「2024_」を追加）</li>
                    <li><strong className="font-semibold">接尾辞:</strong> ファイル名の末尾（拡張子の前）に文字を追加します。（例: 「_v2」を追加）</li>
                    <li><strong className="font-semibold">大/小文字:</strong> ファイル名をすべて大文字または小文字に統一します。</li>
                </ul>
                <p>作成したルールは、ドラッグ＆ドロップで順番を入れ替えることができます。また、よく使うルールの組み合わせは「プリセットとして保存」できます。</p>
            </GuideStep>
            <GuideStep number={3} title="プレビューで確認">
               <p>ルールを追加・変更すると、右側の「プレビュー」パネルに変換後のファイル名（パスを含む）がリアルタイムで表示されます。意図した通りに変更されているかを確認してください。</p>
            </GuideStep>
            <GuideStep number={4} title="ZIPダウンロード" isFinal>
               <p>プレビュー内容に問題がなければ、「ZIPダウンロード」ボタンをクリックします。変換後のファイル名とフォルダ構造で画像が格納されたZIPファイルがダウンロードされます。（元のファイル名は変更されません）</p>
            </GuideStep>
        </div>
    </div>
);

export default FileNameConverterGuide;
