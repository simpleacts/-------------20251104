import React from 'react';
import { Row } from '@shared/types';
import { ToggleSwitch } from '@components/atoms';

export const AI_FUNCTION_DEFINITIONS = [
    { key: 'AI_ENABLED_TRIAGE_EMAIL', label: 'メール自動解析', description: '受信メールの内容をAIが解析し、要約やカテゴリ分類を自動で行います。' },
    { key: 'AI_ENABLED_GENERATE_REPLY', label: '返信文の自動生成', description: '簡単な指示を元に、顧客への返信メール文をAIが作成します。' },
    { key: 'AI_ENABLED_GENERATE_TEMPLATE', label: '定型文の自動生成', description: '指示内容に基づいて、メールの定型文をAIが作成します。' },
    { key: 'AI_ENABLED_DB_OPERATION', label: '自然言語でのDB操作', description: '（現在開発中）話し言葉でデータベースの操作を指示できます。' },
    { key: 'AI_ENABLED_PRODUCT_DESCRIPTION', label: '商品説明文の自動生成', description: '商品情報とWeb検索結果を元に、商品説明文をAIが作成します。' },
    { key: 'AI_ENABLED_ASSIGN_IMAGES', label: '商品画像の自動紐付け', description: 'ファイル名を元に、アップロードされた画像と商品をAIが自動で紐付けます。' },
    { key: 'AI_ENABLED_FETCH_COLOR', label: 'カラーライブラリの拡充', description: 'PANTONE®やDICのカラーコードから、色情報をAIが取得します。' },
    { key: 'AI_ENABLED_ANALYZE_LAYOUT', label: '帳票レイアウト解析', description: 'アップロードされた帳票画像をAIが解析し、レイアウトを自動で構成します。' },
    { key: 'AI_ENABLED_GENERATE_LAYOUT', label: '帳票レイアウト生成', description: '指示内容に基づいて、PDF帳票のレイアウトをAIが提案します。' },
    { key: 'AI_ENABLED_TRANSLATIONS', label: 'UIテキストの自動翻訳', description: '言語管理ツールで、日本語テキストを他言語へAIが自動翻訳します。' },
    { key: 'AI_ENABLED_ANALYZE_INVOICE', label: '請求書(支払)の自動解析', description: 'アップロードされた仕入先からの請求書をAIが解析し、支払情報を自動入力します。' },
    { key: 'AI_ENABLED_UPDATE_ID_FORMAT', label: 'IDフォーマットのAI設定', description: '自然言語での指示に基づき、IDの採番ルールをAIが設定します。' },
    { key: 'AI_ENABLED_GENERATE_DEV_TASKS', label: '開発タスクの自動生成', description: 'アイデアや要望から、実行すべき開発タスクをAIが提案します。' },
    { key: 'AI_ENABLED_SUGGEST_MODULE_INFO', label: 'モジュール情報の自動提案', description: 'ファイルパスから、モジュールの名称や役割をAIが推測します。' },
    { key: 'AI_ENABLED_CLASSIFY_FILE', label: 'ファイル分類の自動提案', description: 'ファイルの内容を元に、どのツールに属するかをAIが推測します。' },
    { key: 'AI_ENABLED_SYSTEM_DIAGNOSTICS', label: 'システム診断のAIアシスト', description: 'システム診断ツールでエラーが発生した際に、AIが原因と修正案を提案します。' }
];

interface GeminiApiSettingsProps {
    geminiApiKey: string;
    setGeminiApiKey: (key: string) => void;
    aiSettings: Record<string, any>;
    onAiSettingChange: (key: string, value: any) => void;
    geminiModels: Row[];
}

const GeminiApiSettings: React.FC<GeminiApiSettingsProps> = ({ geminiApiKey, setGeminiApiKey, aiSettings, onAiSettingChange, geminiModels }) => {
    const activeModels = geminiModels.filter(m => m.status === 'active' || m.status === 'preview');
    
    return (
        <div className="space-y-6">
            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Gemini API設定</h2>
                 <form onSubmit={(e) => e.preventDefault()}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="gemini-api-key" className="block text-sm font-medium mb-1">
                                Gemini APIキー
                            </label>
                            <input
                                type="password"
                                id="gemini-api-key"
                                value={geminiApiKey}
                                onChange={(e) => setGeminiApiKey(e.target.value)}
                                className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded-md"
                                placeholder="Google AI Studioから取得したAPIキー"
                                autoComplete="off"
                            />
                             <p className="text-xs text-gray-500 mt-1">
                                AI機能を使用するために必要です。APIキーはサーバー側に安全に保存され、ブラウザには保存されません（セキュリティ強化済み）。
                            </p>
                        </div>
                     <div>
                        <label htmlFor="gemini-model-select" className="block text-sm font-medium mb-1">
                            使用するGeminiモデル
                        </label>
                        <select
                            id="gemini-model-select"
                            value={aiSettings.GEMINI_MODEL || 'gemini-2.5-flash'}
                            onChange={(e) => onAiSettingChange('GEMINI_MODEL', e.target.value)}
                            className="w-full bg-base-200 dark:bg-base-dark-300 p-2 border rounded-md"
                        >
                            {activeModels.map(model => (
                                <option key={model.id} value={model.model_name}>{model.display_name} ({model.model_name})</option>
                            ))}
                        </select>
                             <p className="text-xs text-gray-500 mt-1">
                            アプリケーション全体で使用するAIモデルを選択します。「モデル管理」タブで選択肢を編集できます。
                        </p>
                    </div>
                    </div>
                </form>
            </div>

            <div className="bg-base-100 dark:bg-base-dark-200 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">AI機能の有効化設定</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md border-l-4 border-blue-500">
                        <label htmlFor="ai-features-enabled" className="font-semibold text-blue-800 dark:text-blue-200">すべてのAI機能を有効にする</label>
                        <ToggleSwitch checked={aiSettings['AI_FEATURES_ENABLED'] ?? true} onChange={(v) => onAiSettingChange('AI_FEATURES_ENABLED', v)} />
                    </div>
                    
                    <div className={`space-y-3 transition-opacity duration-300 ${aiSettings['AI_FEATURES_ENABLED'] ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        {AI_FUNCTION_DEFINITIONS.map(def => (
                            <div key={def.key} className="flex items-center justify-between p-3 border rounded-md">
                                <div>
                                    <h4 className="font-semibold text-sm">{def.label}</h4>
                                    <p className="text-xs text-gray-500">{def.description}</p>
                                </div>
                                <ToggleSwitch checked={aiSettings[def.key] ?? true} onChange={(v) => onAiSettingChange(def.key, v)} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeminiApiSettings;