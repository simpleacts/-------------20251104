import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { Row } from '@shared/types';
import useThemeManager from './useThemeManager';

function useAppSettings() {
    const { database } = useDatabase();
    const [liveSettings, setLiveSettings] = useState<Record<string, any> | null>(null);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // pagination_settingsの読み込みは必要なページで明示的に行う
    // ここでは読み込まない（自動読み込みを削除）

    const handleLiveUpdate = useCallback((newSettings: Record<string, any>) => {
        setLiveSettings(newSettings);
    }, []);
    
    const handleClearLiveUpdate = useCallback(() => {
        setLiveSettings(null);
    }, []);

    const effectiveSettingsMap = useMemo(() => {
        const allSettingsData = [
            ...(database?.settings?.data || []),
            ...(database?.color_settings?.data || []),
            ...(database?.layout_settings?.data || []),
            ...(database?.behavior_settings?.data || [])
        ];
        const baseSettings = new Map(allSettingsData.map(s => [s.key, s.value]));
        if (liveSettings) {
            for (const key in liveSettings) {
                if (Object.prototype.hasOwnProperty.call(liveSettings, key)) {
                    baseSettings.set(key, liveSettings[key]);
                }
            }
        }
        return baseSettings;
    }, [database?.settings, database?.color_settings, database?.layout_settings, database?.behavior_settings, liveSettings]);

    useThemeManager(effectiveSettingsMap, database);

    useEffect(() => {
        const commandPaletteEnabled = effectiveSettingsMap.get('UI_COMMAND_PALETTE_ENABLED') === 'true' || effectiveSettingsMap.get('UI_COMMAND_PALETTE_ENABLED') === true;
        if (!commandPaletteEnabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [effectiveSettingsMap]);

    const paginationSettingsMap = useMemo(() => {
        if (!database?.pagination_settings) {
            return new Map<string, Row>();
        }
        const data = database.pagination_settings.data || [];
        return new Map(data.map(s => [s.target, s]));
    }, [database?.pagination_settings]);

    const getPaginationConfigFor = useCallback((target: string) => {
        const setting = paginationSettingsMap.get(target) as Row | undefined;

        if (!setting || !setting.enabled) {
            return { enabled: false, itemsPerPage: 30 };
        }
        
        let itemsPerPage = setting.items_per_page_pc as number;
        if (windowWidth < 768) { // mobile
            itemsPerPage = setting.items_per_page_mobile as number;
        } else if (windowWidth < 1024) { // tablet
            itemsPerPage = setting.items_per_page_tablet as number;
        }
        
        // 数値が無効な場合はデフォルト値を使用
        if (typeof itemsPerPage !== 'number' || isNaN(itemsPerPage) || itemsPerPage <= 0) {
            itemsPerPage = 30;
        }
        
        return { enabled: true, itemsPerPage };
    }, [paginationSettingsMap, windowWidth]);
    
    const commandPaletteEnabled = effectiveSettingsMap.get('UI_COMMAND_PALETTE_ENABLED') === true || effectiveSettingsMap.get('UI_COMMAND_PALETTE_ENABLED') === 'true';
    
    const tooltipEnabled = effectiveSettingsMap.get('UI_TOOLTIP_ENABLED') === true || effectiveSettingsMap.get('UI_TOOLTIP_ENABLED') === 'true';
    const tooltipDelay = Number(effectiveSettingsMap.get('UI_TOOLTIP_DELAY') || 300);


    return {
        commandPaletteEnabled,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        getPaginationConfigFor,
        handleLiveUpdate,
        handleClearLiveUpdate,
        tooltipEnabled,
        tooltipDelay
    };
}

export default useAppSettings;