import React, { useMemo } from 'react';
import { SettingsCard } from '@components/molecules';
import { Database, Row } from '@shared/types';
import { Select } from '@components/atoms';

interface LayoutSettingsProps {
    settings: Record<string, any>;
    handleSettingChange: (key: string, value: any) => void;
    database: Partial<Database> | null;
}

const LayoutSettings: React.FC<LayoutSettingsProps> = ({ settings, handleSettingChange, database }) => {
    const googleFonts = useMemo(() => (database?.google_fonts?.data as Row[]) || [], [database]);

    const getButtonClasses = (isActive: boolean) => 
        `flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            isActive 
                ? 'bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark shadow' 
                : 'bg-button-muted-bg text-button-muted dark:bg-button-muted-bg-dark dark:text-button-muted-dark hover:opacity-80'
        }`;

    const radiusOptions = [{label: 'なし', value: 'none'}, {label: '小', value: 'sm'}, {label: '中', value: 'md'}, {label: '大', value: 'lg'}];

    const fontSizeOptions = [
        { label: '最小 (12px)', value: 12 },
        { label: '小 (14px)', value: 14 },
        { label: '標準 (16px)', value: 16 },
        { label: '大 (18px)', value: 18 },
        { label: '最大 (20px)', value: 20 },
    ];

    return (
        <SettingsCard title="レイアウトとフォント">
            <div className="max-w-md mx-auto space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2">配色テーマ</label>
                    <div className="flex items-center gap-2 p-1 bg-container-muted-bg dark:bg-container-muted-bg-dark rounded-lg">
                        <button onClick={() => handleSettingChange('UI_THEME', 'light')} className={getButtonClasses(settings.UI_THEME === 'light')}>ライト</button>
                        <button onClick={() => handleSettingChange('UI_THEME', 'dark')} className={getButtonClasses(settings.UI_THEME === 'dark')}>ダーク</button>
                        <button onClick={() => handleSettingChange('UI_THEME', 'system')} className={getButtonClasses(settings.UI_THEME === 'system' || !settings.UI_THEME)}>システム</button>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-2">フォントファミリー</label>
                    <Select
                        value={settings.UI_FONT_FAMILY || 'sans'}
                        onChange={e => handleSettingChange('UI_FONT_FAMILY', e.target.value)}
                        className="w-full"
                    >
                        <optgroup label="標準フォント">
                            <option value="sans">ゴシック体 (システム標準)</option>
                        </optgroup>
                        <optgroup label="Google Fonts">
                            {googleFonts.map(font => (
                                <option key={font.id as string} value={font.font_family as string}>{font.font_name as string}</option>
                            ))}
                        </optgroup>
                    </Select>
                </div>
                
                 <div>
                    <label className="block text-sm font-medium mb-2">角丸の大きさ</label>
                    <div className="flex items-center gap-2 p-1 bg-container-muted-bg dark:bg-container-muted-bg-dark rounded-lg">
                        {radiusOptions.map(opt => (
                            <button key={opt.value} onClick={() => handleSettingChange('UI_BORDER_RADIUS', opt.value)} className={getButtonClasses(settings.UI_BORDER_RADIUS === opt.value)}>{opt.label}</button>
                        ))}
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium mb-2">基本フォントサイズ</label>
                    <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-base-100 dark:bg-base-dark-200">
                        <div>
                            <label htmlFor="fs-pc" className="text-xs">PC (1024px以上)</label>
                            <select id="fs-pc" value={settings.UI_FONT_SIZE_PC || 16} onChange={e => handleSettingChange('UI_FONT_SIZE_PC', e.target.value)} className="w-full p-2 border rounded bg-input-bg dark:bg-input-bg-dark">
                                {fontSizeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="fs-tablet" className="text-xs">タブレット (768px以上)</label>
                             <select id="fs-tablet" value={settings.UI_FONT_SIZE_TABLET || 16} onChange={e => handleSettingChange('UI_FONT_SIZE_TABLET', e.target.value)} className="w-full p-2 border rounded bg-input-bg dark:bg-input-bg-dark">
                                {fontSizeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="fs-mobile" className="text-xs">モバイル (768px未満)</label>
                            <select id="fs-mobile" value={settings.UI_FONT_SIZE_MOBILE || 14} onChange={e => handleSettingChange('UI_FONT_SIZE_MOBILE', e.target.value)} className="w-full p-2 border rounded bg-input-bg dark:bg-input-bg-dark">
                                {fontSizeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </SettingsCard>
    );
};

export default LayoutSettings;