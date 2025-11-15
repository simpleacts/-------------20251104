import { useEffect } from 'react';
import { adjustColor, hexToRgb } from '@shared/utils/colorUtils';
import { Database, Row } from '@shared/types';


const useThemeManager = (settingsMap: Map<string, any>, database: Partial<Database> | null) => {
    useEffect(() => {
        const uiTheme = settingsMap.get('UI_THEME') || 'system';
        const reduceMotion = settingsMap.get('UI_REDUCE_MOTION') === true || settingsMap.get('UI_REDUCE_MOTION') === 'true';
        const borderRadius = settingsMap.get('UI_BORDER_RADIUS') || 'md';
        const animationSpeed = settingsMap.get('UI_ANIMATION_SPEED') || 'normal';
        
        const root = window.document.documentElement;
        const isDark = uiTheme === 'dark' || (uiTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        root.classList.toggle('dark', isDark);

        const body = window.document.body;
        
        // --- Font Family Logic ---
        const fontFamilySetting = settingsMap.get('UI_FONT_FAMILY') || 'sans';
        const googleFonts = (database?.google_fonts?.data as Row[]) || [];
        const rootEl = document.getElementById('root');
        
        const dynamicFontLink = document.getElementById('dynamic-google-font');
        if (dynamicFontLink) {
            dynamicFontLink.remove();
        }
        
        if (rootEl) {
            if (fontFamilySetting === 'sans') {
                rootEl.style.fontFamily = ''; // Revert to inheriting from body's font-sans class
            } else {
                const selectedFont = googleFonts.find(f => f.font_family === fontFamilySetting);
                if (selectedFont && selectedFont.import_url) {
                    const link = document.createElement('link');
                    link.id = 'dynamic-google-font';
                    link.rel = 'stylesheet';
                    link.href = selectedFont.import_url as string;
                    document.head.appendChild(link);
                    rootEl.style.fontFamily = fontFamilySetting;
                } else {
                    // Fallback if font not found in DB
                    rootEl.style.fontFamily = '';
                }
            }
        }
        
        body.dataset.borderRadius = borderRadius;
        body.dataset.animationSpeed = animationSpeed;
        
        body.classList.toggle('reduce-motion', reduceMotion);
        
        // 角丸をCSS変数として設定
        const borderRadiusMap: Record<string, string> = {
            'none': '0px',
            'sm': '0.125rem',
            'md': '0.375rem',
            'lg': '0.5rem',
            'xl': '0.75rem',
            '2xl': '1rem',
            '3xl': '1.5rem',
            'full': '9999px'
        };
        const borderRadiusValue = borderRadiusMap[borderRadius] || borderRadiusMap['md'];
        
        const keyToCssVarMap: Record<string, string> = {
            'UI_APP_BG_COLOR': '--color-app-bg', 'UI_APP_BG_COLOR_DARK': '--color-app-bg-dark',
            'UI_CONTAINER_BG_COLOR': '--color-container-bg', 'UI_CONTAINER_BG_COLOR_DARK': '--color-container-bg-dark',
            'UI_CONTAINER_MUTED_BG_COLOR': '--color-container-muted-bg', 'UI_CONTAINER_MUTED_BG_COLOR_DARK': '--color-container-muted-bg-dark',
            'UI_INPUT_BG_COLOR': '--color-input-bg', 'UI_INPUT_BG_COLOR_DARK': '--color-input-bg-dark',
            'UI_INPUT_FILTER_BG_COLOR': '--color-input-filter-bg', 'UI_INPUT_FILTER_BG_COLOR_DARK': '--color-input-filter-bg-dark',
            'UI_CARD_BG_COLOR': '--color-card-bg', 'UI_CARD_BG_COLOR_DARK': '--color-card-bg-dark',
            'UI_CARD_IMAGE_BG_COLOR': '--color-card-image-bg', 'UI_CARD_IMAGE_BG_COLOR_DARK': '--color-card-image-bg-dark',
            'UI_HOVER_BG_COLOR': '--color-hover-bg', 'UI_HOVER_BG_COLOR_DARK': '--color-hover-bg-dark',
            'UI_SELECTED_BG_COLOR': '--color-selected-bg', 'UI_SELECTED_BG_COLOR_DARK': '--color-selected-bg-dark',
            'UI_ACTION_DANGER_COLOR': '--color-action-danger', 'UI_ACTION_DANGER_COLOR_DARK': '--color-action-danger-dark',
            'UI_FONT_COLOR': '--color-text-base', 'UI_FONT_COLOR_DARK': '--color-text-base-dark',
            'UI_TEXT_MUTED_COLOR': '--color-text-muted', 'UI_TEXT_MUTED_COLOR_DARK': '--color-text-muted-dark',
            'UI_TEXT_LINK_COLOR': '--color-text-link', 'UI_TEXT_LINK_COLOR_DARK': '--color-text-link-dark',
            'UI_STATUS_SUCCESS_BG_COLOR': '--color-status-success-bg', 'UI_STATUS_SUCCESS_BG_COLOR_DARK': '--color-status-success-bg-dark',
            'UI_STATUS_SUCCESS_TEXT_COLOR': '--color-status-success-text', 'UI_STATUS_SUCCESS_TEXT_COLOR_DARK': '--color-status-success-text-dark',
            'UI_STATUS_INFO_BG_COLOR': '--color-status-info-bg', 'UI_STATUS_INFO_BG_COLOR_DARK': '--color-status-info-bg-dark',
            'UI_STATUS_INFO_TEXT_COLOR': '--color-status-info-text', 'UI_STATUS_INFO_TEXT_COLOR_DARK': '--color-status-info-text-dark',
            'UI_STATUS_WARNING_BG_COLOR': '--color-status-warning-bg', 'UI_STATUS_WARNING_BG_COLOR_DARK': '--color-status-warning-bg-dark',
            'UI_STATUS_WARNING_TEXT_COLOR': '--color-status-warning-text', 'UI_STATUS_WARNING_TEXT_COLOR_DARK': '--color-status-warning-text-dark',
            'UI_STATUS_DANGER_BG_COLOR': '--color-status-danger-bg', 'UI_STATUS_DANGER_BG_COLOR_DARK': '--color-status-danger-bg-dark',
            'UI_STATUS_DANGER_TEXT_COLOR': '--color-status-danger-text', 'UI_STATUS_DANGER_TEXT_COLOR_DARK': '--color-status-danger-text-dark',
            'UI_BUTTON_PRIMARY_BG_COLOR': '--color-button-primary-bg', 'UI_BUTTON_PRIMARY_BG_COLOR_DARK': '--color-button-primary-bg-dark',
            'UI_BUTTON_PRIMARY_TEXT_COLOR': '--color-button-primary-text', 'UI_BUTTON_PRIMARY_TEXT_COLOR_DARK': '--color-button-primary-text-dark',
            'UI_BUTTON_MUTED_BG_COLOR': '--color-button-muted-bg', 'UI_BUTTON_MUTED_BG_COLOR_DARK': '--color-button-muted-bg-dark',
            'UI_BUTTON_MUTED_TEXT_COLOR': '--color-button-muted-text', 'UI_BUTTON_MUTED_TEXT_COLOR_DARK': '--color-button-muted-text-dark',
            
            'UI_BORDER_COLOR': '--color-border-light', 'UI_BORDER_COLOR_DARK': '--color-border-dark',
            'UI_PDF_PREVIEW_BG_COLOR': '--color-pdf-preview-bg-light', 'UI_PDF_PREVIEW_BG_COLOR_DARK': '--color-pdf-preview-bg-dark',
            'UI_INNER_BLOCK_BG_COLOR': '--color-inner-block-bg-light', 'UI_INNER_BLOCK_BG_COLOR_DARK': '--color-inner-block-bg-dark',
            
            'UI_WORKSHEET_BG_COLOR': '--color-worksheet-bg-light', 'UI_WORKSHEET_BG_COLOR_DARK': '--color-worksheet-bg-dark',
            'UI_WORKSHEET_TEXT_COLOR': '--color-worksheet-text-light', 'UI_WORKSHEET_TEXT_COLOR_DARK': '--color-worksheet-text-dark',
            'UI_WORKSHEET_BORDER_COLOR': '--color-worksheet-border-light', 'UI_WORKSHEET_BORDER_COLOR_DARK': '--color-worksheet-border-dark',
            'UI_WORKSHEET_HEADER_BG_COLOR': '--color-worksheet-header-bg-light', 'UI_WORKSHEET_HEADER_BG_COLOR_DARK': '--color-worksheet-header-bg-dark',
            'UI_WORKSHEET_TOTAL_BG_COLOR': '--color-worksheet-total-bg-light', 'UI_WORKSHEET_TOTAL_BG_COLOR_DARK': '--color-worksheet-total-bg-dark',
        };

        let styleSheetContent = ':root {\n';
        
        // 角丸をCSS変数として追加
        styleSheetContent += `  --border-radius: ${borderRadiusValue};\n`;

        for (const [key, cssVar] of Object.entries(keyToCssVarMap)) {
            const value = settingsMap.get(key);
            if (value) {
                if (key.includes('SHADOW_COLOR')) {
                    const rgb = hexToRgb(value as string);
                    if(rgb) styleSheetContent += `  ${cssVar}: ${rgb};\n`;
                } else {
                    styleSheetContent += `  ${cssVar}: ${value};\n`;
                }
            }
        }
        
        const primaryBg = settingsMap.get('UI_BUTTON_PRIMARY_BG_COLOR');
        if(primaryBg) styleSheetContent += `  --color-action-primary-hover: ${adjustColor(primaryBg, -20)};\n`;
        const danger = settingsMap.get('UI_ACTION_DANGER_COLOR');
        if(danger) styleSheetContent += `  --color-action-danger-hover: ${adjustColor(danger, -20)};\n`;
        const primaryBgDark = settingsMap.get('UI_BUTTON_PRIMARY_BG_COLOR_DARK');
        if(primaryBgDark) styleSheetContent += `  --color-action-primary-hover-dark: ${adjustColor(primaryBgDark, 20)};\n`;
        const dangerDark = settingsMap.get('UI_ACTION_DANGER_COLOR_DARK');
        if(dangerDark) styleSheetContent += `  --color-action-danger-hover-dark: ${adjustColor(dangerDark, 20)};\n`;
        
        styleSheetContent += '}\n';

        const uiFontSizePc = parseFloat(String(settingsMap.get('UI_FONT_SIZE_PC'))) || 16;
        const uiFontSizeTablet = parseFloat(String(settingsMap.get('UI_FONT_SIZE_TABLET'))) || 16;
        const uiFontSizeMobile = parseFloat(String(settingsMap.get('UI_FONT_SIZE_MOBILE'))) || 14;

        styleSheetContent += `
          html { font-size: ${uiFontSizeMobile}px; }
          @media (min-width: 768px) { html { font-size: ${uiFontSizeTablet}px; } }
          @media (min-width: 1024px) { html { font-size: ${uiFontSizePc}px; } }
        `;
        
        const styleId = 'dynamic-app-styles';
        let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = styleSheetContent;

    }, [settingsMap, database]);
};

export default useThemeManager;