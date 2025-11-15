import React, { useMemo } from 'react';
import { ToolVisibility } from '@shared/types';
import { ToggleSwitch } from '@components/atoms';
import { useTranslation } from '@shared/hooks/useTranslation';

interface ToolVisibilityTableProps {
    tools: { name: string; displayName: string }[];
    visibilitySettings: ToolVisibility[];
    onVisibilityChange: (toolName: string, device: 'desktop' | 'tablet' | 'mobile', isVisible: boolean) => void;
    onToggleAllVisibility: (device: 'desktop' | 'tablet' | 'mobile', isVisible: boolean) => void;
}

const ToolVisibilityTable: React.FC<ToolVisibilityTableProps> = ({
    tools,
    visibilitySettings,
    onVisibilityChange,
    onToggleAllVisibility
}) => {
    const { t } = useTranslation('display-settings');
    const getVisibility = (toolName: string, device: 'desktop' | 'tablet' | 'mobile'): boolean => {
        const setting = visibilitySettings.find(v => v.tool_name === toolName && v.device_type === device);
        return setting ? setting.is_visible : true; // Default to visible if not set
    };
    
    const allVisibleDesktop = useMemo(() => tools.every(tool => getVisibility(tool.name, 'desktop')), [tools, visibilitySettings]);
    const allVisibleTablet = useMemo(() => tools.every(tool => getVisibility(tool.name, 'tablet')), [tools, visibilitySettings]);
    const allVisibleMobile = useMemo(() => tools.every(tool => getVisibility(tool.name, 'mobile')), [tools, visibilitySettings]);

    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-default">
                    <th className="p-2 text-left font-semibold">{t('tool_visibility.tool_name', 'ツール名')}</th>
                    <th className="p-2 text-center font-semibold">
                        <div className="flex flex-col items-center gap-1">
                            <span>{t('tool_visibility.desktop', 'デスクトップ')}</span>
                            <div className="flex items-center gap-1.5" title={t('tool_visibility.toggle_all_column', 'この列の表示/非表示をすべて切り替えます')}>
                                <span className="text-xs font-normal text-muted dark:text-muted-dark">{t('tool_visibility.toggle_all', '一括切替')}</span>
                                <ToggleSwitch checked={allVisibleDesktop} onChange={(c) => onToggleAllVisibility('desktop', c)} />
                            </div>
                        </div>
                    </th>
                    <th className="p-2 text-center font-semibold">
                        <div className="flex flex-col items-center gap-1">
                            <span>{t('tool_visibility.tablet', 'タブレット')}</span>
                            <div className="flex items-center gap-1.5" title={t('tool_visibility.toggle_all_column', 'この列の表示/非表示をすべて切り替えます')}>
                                <span className="text-xs font-normal text-muted dark:text-muted-dark">{t('tool_visibility.toggle_all', '一括切替')}</span>
                                <ToggleSwitch checked={allVisibleTablet} onChange={(c) => onToggleAllVisibility('tablet', c)} />
                            </div>
                        </div>
                    </th>
                    <th className="p-2 text-center font-semibold">
                        <div className="flex flex-col items-center gap-1">
                            <span>{t('tool_visibility.mobile', 'モバイル')}</span>
                            <div className="flex items-center gap-1.5" title={t('tool_visibility.toggle_all_column', 'この列の表示/非表示をすべて切り替えます')}>
                                <span className="text-xs font-normal text-muted dark:text-muted-dark">{t('tool_visibility.toggle_all', '一括切替')}</span>
                                <ToggleSwitch checked={allVisibleMobile} onChange={(c) => onToggleAllVisibility('mobile', c)} />
                            </div>
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody>
                {tools.sort((a,b) => a.displayName.localeCompare(b.displayName)).map(tool => (
                    <tr key={tool.name} className="border-b border-default hover:bg-base-200 dark:hover:bg-base-dark-300/50">
                        <td className="p-2">{tool.displayName}</td>
                        <td className="p-2 text-center"><ToggleSwitch checked={getVisibility(tool.name, 'desktop')} onChange={c => onVisibilityChange(tool.name, 'desktop', c)} /></td>
                        <td className="p-2 text-center"><ToggleSwitch checked={getVisibility(tool.name, 'tablet')} onChange={c => onVisibilityChange(tool.name, 'tablet', c)} /></td>
                        <td className="p-2 text-center"><ToggleSwitch checked={getVisibility(tool.name, 'mobile')} onChange={c => onVisibilityChange(tool.name, 'mobile', c)} /></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ToolVisibilityTable;