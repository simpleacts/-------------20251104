/**
 * ツールの表示名を取得する関数
 * 多言語対応
 */

import { Page } from './Routes';
import { useTranslation } from '../../shared/hooks/useTranslation';

/**
 * ツール名から翻訳キーを生成
 */
export function getToolTranslationKey(toolName: Page): string {
    return `tools.${toolName}`;
}

/**
 * ツールの表示名を取得するフック
 * @param toolName ツール名
 * @returns 表示名
 */
export function useToolDisplayName(toolName: Page): string {
    const { t } = useTranslation();
    const key = getToolTranslationKey(toolName);
    
    // フォールバック: ツール名から推測
    const fallback = toolName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    
    return t(key, fallback);
}

/**
 * すべてのツールの表示名を取得するフック
 * @returns ツール名と表示名の配列
 */
export function useAllToolDisplayNames(): { name: Page; displayName: string }[] {
    const { t } = useTranslation();
    
    const ALL_TOOLS: Page[] = [
        'hub', 'order-management', 'ai-task-management', 'production-scheduler',
        'customer-management', 'email-tool', 'estimator',
        'proofing', 'worksheet', 'accounts-receivable', 'accounts-payable',
        'work-record', 'cash-flow-analysis', 'task-analysis',
        'product-management', 'product-definition-tool', 'pricing-manager',
        'pricing-assistant', 'production-settings', 'task-settings', 'print-history',
        'ink-mixing', 'ink-series-management', 'ink-product-management',
        'color-library-manager', 'dtf-cost-calculator', 'data-io',
        'image-converter', 'image-batch-linker', 'pdf-template-manager',
        'pdf-item-group-manager', 'user-manager', 'permission-manager',
        'id-manager', 'google-api-settings', 'display-settings', 'email-settings',
        'estimator-settings', 'pdf-preview-settings', 'backup-manager',
        'system-logs', 'dev-management', 'dev-tools', 'dev-lock-manager',
        'app-manager', 'tool-exporter', 'tool-porting-manager', 'tool-guide',
        'tool-dependency-manager', 'calculation-logic-manager',
        'tool-dependency-scanner', 'unregistered-module-tool',
        'architecture-designer', 'php-info-viewer', 'system-diagnostics',
        'language-manager'
    ];
    
    return ALL_TOOLS.map(name => ({
        name,
        displayName: t(getToolTranslationKey(name), name)
    }));
}

