import React from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';

interface SettingsPanelProps {
    fontFamily: string;
    onFontFamilyChange: (font: string) => void;
    initialZoomConfig: { pc: number; tablet: number; mobile: number; embedded: number };
    onZoomConfigChange: (device: 'pc' | 'tablet' | 'mobile' | 'embedded', value: number) => void;
    alignment: string;
    onAlignmentChange: (align: string) => void;
    modalWidthVw: number;
    onModalWidthChange: (width: number) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    fontFamily, onFontFamilyChange,
    initialZoomConfig, onZoomConfigChange,
    alignment, onAlignmentChange,
    modalWidthVw, onModalWidthChange
}) => {
    const { t } = useTranslation('pdf-template-manager');
    return (
        <div className="p-6 space-y-6 overflow-y-auto">
            <div>
                <h3 className="text-lg font-bold mb-2">{t('pdf_template.font_settings', 'フォント設定')}</h3>
                <label className="block text-sm font-medium mb-1">{t('pdf_template.font_family', 'フォントファミリー')}</label>
                <select
                    value={fontFamily}
                    onChange={e => onFontFamilyChange(e.target.value)}
                    className="w-full bg-base-200 dark:bg-base-dark-300 border border-base-300 dark:border-base-dark-300 rounded-md px-3 py-2 text-sm"
                >
                    <option value="font-sans">{t('pdf_template.font_gothic', 'ゴシック体 (標準)')}</option>
                    <option value="font-yuji-syuku">{t('pdf_template.font_mincho', '明朝体 (Yuji Syuku)')}</option>
                </select>
            </div>
            <div>
                <h3 className="text-lg font-bold mb-2">{t('pdf_template.zoom_settings', '初期ズーム設定')}</h3>
                <div className="grid grid-cols-2 gap-4">
                    {(['pc', 'tablet', 'mobile', 'embedded'] as const).map(device => (
                        <div key={device}>
                            <label htmlFor={`zoom-${device}`} className="text-sm capitalize">{device}</label>
                            <input id={`zoom-${device}`} type="number" value={initialZoomConfig[device]} onChange={e => onZoomConfigChange(device, parseInt(e.target.value, 10))} className="w-full p-1 border rounded" />
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <h3 className="text-lg font-bold mb-2">{t('pdf_template.alignment_settings', '配置設定')}</h3>
                <select value={alignment} onChange={e => onAlignmentChange(e.target.value)} className="w-full bg-base-200 dark:bg-base-dark-300 border border-base-300 dark:border-base-dark-300 rounded-md px-3 py-2 text-sm">
                    <option value="justify-center items-start">{t('pdf_template.align_center_top', '左右中央（上揃え）')}</option>
                    <option value="justify-center items-center">{t('pdf_template.align_center_center', '中央 (上下左右)')}</option>
                </select>
            </div>
            <div>
                <h3 className="text-lg font-bold mb-2">{t('pdf_template.preview_modal', 'プレビューモーダル設定')}</h3>
                <label className="text-sm">{t('pdf_template.modal_width', 'モーダル最大幅 (画面幅に対する%)')}</label>
                <input type="number" min="30" max="100" value={modalWidthVw} onChange={e => onModalWidthChange(parseInt(e.target.value,10))} className="w-full p-1 border rounded"/>
            </div>
        </div>
    );
};

export default SettingsPanel;
