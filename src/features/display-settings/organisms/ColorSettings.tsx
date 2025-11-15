import React from 'react';
import { ColorInput, SettingsCard } from '@components/molecules';
import { adjustColor } from '@shared/utils/colorUtils';

const settingGroups = [
  { title: '基本', settings: [{ key: 'UI_APP_BG_COLOR', label: 'アプリ背景' }, { key: 'UI_CONTAINER_BG_COLOR', label: 'コンテナ背景' }, { key: 'UI_CONTAINER_MUTED_BG_COLOR', label: 'コンテナ(淡)' }, { key: 'UI_FONT_COLOR', label: '基本フォント' }, { key: 'UI_TEXT_MUTED_COLOR', label: '補助フォント' }, { key: 'UI_TEXT_LINK_COLOR', label: 'リンク' }, { key: 'UI_BORDER_COLOR', label: '境界線' }, { key: 'UI_SHADOW_COLOR', label: '影' }] },
  { title: 'コンポーネント', settings: [{ key: 'UI_INPUT_BG_COLOR', label: '入力欄背景' }, { key: 'UI_INPUT_FILTER_BG_COLOR', label: 'フィルター入力背景' }, { key: 'UI_CARD_BG_COLOR', label: 'カード背景' }, { key: 'UI_CARD_IMAGE_BG_COLOR', label: 'カード画像背景' }, { key: 'UI_HOVER_BG_COLOR', label: 'ホバー背景' }, { key: 'UI_SELECTED_BG_COLOR', label: '選択中背景' }, { key: 'UI_INNER_BLOCK_BG_COLOR', label: '内側ブロック背景' }] },
  { title: 'ボタン', settings: [{ key: 'UI_BUTTON_PRIMARY_BG_COLOR', label: 'プライマリ(背景)' }, { key: 'UI_BUTTON_PRIMARY_TEXT_COLOR', label: 'プライマリ(文字)' }, { key: 'UI_BUTTON_MUTED_BG_COLOR', label: 'ミュート(背景)' }, { key: 'UI_BUTTON_MUTED_TEXT_COLOR', label: 'ミュート(文字)' }, { key: 'UI_ACTION_DANGER_COLOR', label: '危険アクション' }] },
  { title: 'ステータス', settings: [{ key: 'UI_STATUS_SUCCESS_BG_COLOR', label: '成功(背景)' }, { key: 'UI_STATUS_SUCCESS_TEXT_COLOR', label: '成功(文字)' }, { key: 'UI_STATUS_INFO_BG_COLOR', label: '情報(背景)' }, { key: 'UI_STATUS_INFO_TEXT_COLOR', label: '情報(文字)' }, { key: 'UI_STATUS_WARNING_BG_COLOR', label: '警告(背景)' }, { key: 'UI_STATUS_WARNING_TEXT_COLOR', label: '警告(文字)' }, { key: 'UI_STATUS_DANGER_BG_COLOR', label: '危険(背景)' }, { key: 'UI_STATUS_DANGER_TEXT_COLOR', label: '危険(文字)' }] },
  { title: '帳票', settings: [{ key: 'UI_PDF_PREVIEW_BG_COLOR', label: 'PDFプレビュー背景' }, { key: 'UI_WORKSHEET_BG_COLOR', label: '用紙 背景' }, { key: 'UI_WORKSHEET_TEXT_COLOR', label: '用紙 文字' }, { key: 'UI_WORKSHEET_BORDER_COLOR', label: '用紙 罫線' }, { key: 'UI_WORKSHEET_HEADER_BG_COLOR', label: '用紙 ヘッダー背景' }, { key: 'UI_WORKSHEET_TOTAL_BG_COLOR', label: '用紙 合計欄背景' }] }
];

interface ColorSettingsProps {
    settings: Record<string, any>;
    handleSettingChange: (key: string, value: any) => void;
}

const ColorSettings: React.FC<ColorSettingsProps> = ({ settings, handleSettingChange }) => {
    
    const handleBrandColorChange = (newColor: string) => {
        handleSettingChange('UI_BRAND_COLOR', newColor);
        handleSettingChange('UI_BUTTON_PRIMARY_BG_COLOR', newColor);
        handleSettingChange('UI_TEXT_LINK_COLOR', newColor);
    
        const darkVariant = adjustColor(newColor, 80); 
        handleSettingChange('UI_BUTTON_PRIMARY_BG_COLOR_DARK', darkVariant);
        handleSettingChange('UI_TEXT_LINK_COLOR_DARK', darkVariant);
    };
    
    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-1 space-y-6">
                 <SettingsCard title="ブランドカラー">
                    <ColorInput
                        label="ブランドカラー"
                        description="ボタンやリンクなど、UIの主要なアクセントカラーを決定します。"
                        value={settings['UI_BRAND_COLOR'] || ''}
                        onChange={handleBrandColorChange}
                    />
                </SettingsCard>
                <SettingsCard title="プレビュー">
                    <div className="p-4 bg-app-bg border border-default rounded-lg">
                        <h4 className="text-sm font-semibold mb-2 text-base">ライトモード</h4>
                        <span className="px-3 py-1 text-sm rounded bg-button-primary-bg text-button-primary cursor-default">ボタン</span>
                        <span className="text-sm text-link ml-2 cursor-default">リンク</span>
                    </div>
                     <div className="p-4 bg-app-bg-dark border border-default rounded-lg">
                        <h4 className="text-sm font-semibold mb-2 text-base-dark">ダークモード</h4>
                        <span className="px-3 py-1 text-sm rounded bg-button-primary-bg-dark text-button-primary-dark cursor-default">ボタン</span>
                        <span className="text-sm text-link-dark ml-2 cursor-default">リンク</span>
                    </div>
                </SettingsCard>
            </div>
            <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div>
                    <h2 className="text-xl font-bold mb-4">ライトモード</h2>
                    {settingGroups.map(group => (
                        <SettingsCard key={group.title} title={group.title} className="mb-6">
                            {group.settings.map(item => (
                                <ColorInput
                                    key={item.key}
                                    label={item.label}
                                    value={settings[item.key] || ''}
                                    onChange={value => handleSettingChange(item.key, value)}
                                />
                            ))}
                        </SettingsCard>
                    ))}
                </div>
                <div>
                    <h2 className="text-xl font-bold mb-4">ダークモード</h2>
                    {settingGroups.map(group => (
                        <SettingsCard key={group.title} title={group.title} className="mb-6">
                            {group.settings.map(item => {
                                const darkKey = `${item.key}_DARK`;
                                return (
                                    <ColorInput
                                        key={darkKey}
                                        label={item.label}
                                        value={settings[darkKey] || ''}
                                        onChange={value => handleSettingChange(darkKey, value)}
                                    />
                                );
                            })}
                        </SettingsCard>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ColorSettings;