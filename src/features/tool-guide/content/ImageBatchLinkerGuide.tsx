import React from 'react';
import GuideStep from '@components/molecules/GuideStep';

const ImageBatchLinkerGuide: React.FC = () => (
     <div>
        <h3 className="text-2xl font-bold mb-4">商品画像一括紐付けツール</h3>
        <p className="mb-4 text-sm text-muted">大量の商品画像とシステムに登録されている商品を、ファイル名の命名規則に基づいて自動で紐付けるためのツールです。</p>
         <p className="p-2 bg-blue-100 dark:bg-blue-900/30 text-xs rounded-md"><strong className="font-semibold">命名規則:</strong> ファイル名は <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">品番_任意の文字列.拡張子</code> の形式である必要があります。例えば、品番「500101」の商品の画像は <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">500101_front.jpg</code> や <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">500101_white_back.png</code> のようにします。</p>
         <div className="pl-4 border-l-4 border-base-200 dark:border-base-dark-300 mt-4">
            <GuideStep number={1} title="画像のアップロード">
                <p>上記の命名規則に従った画像ファイル、またはそれらを含むフォルダをアップロードします。</p>
            </GuideStep>
            <GuideStep number={2} title="プレビューで確認">
               <p>アップロードが完了すると、プレビュー画面に結果が表示されます。</p>
               <ul className="list-disc list-inside space-y-1 text-xs">
                   <li><strong className="font-semibold text-green-700 dark:text-green-400">紐付け成功:</strong> ファイル名の品番と一致する商品が見つかったものです。現在の画像と、新しく紐付けられる画像が表示されます。</li>
                   <li><strong className="font-semibold text-red-600 dark:text-red-400">品番が見つからないファイル:</strong> ファイル名の品番に一致する商品がシステムに登録されていないものです。これらの画像は紐付けられません。</li>
               </ul>
            </GuideStep>
            <GuideStep number={3} title="変更を保存" isFinal>
               <p>プレビュー内容を確認し、問題がなければ「変更を保存」ボタンをクリックします。</p>
               <p>「紐付け成功」と表示された商品のメイン画像が、新しい画像に一括で更新されます。</p>
            </GuideStep>
        </div>
    </div>
);

export default ImageBatchLinkerGuide;
