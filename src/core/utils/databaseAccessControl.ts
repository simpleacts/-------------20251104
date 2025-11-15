/**
 * データベースアクセス制御ユーティリティ
 * ツールごとのテーブルアクセス権限と操作権限を管理
 */

import { Database, ToolDependency, Row } from '../../shared/types';
import { Page } from '../config/Routes';
import { trackDeletedItem } from './deletedItemsTracker';

export type DatabaseOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface ToolAccessControl {
    toolName: Page;
    tableName: string;
    allowedOperations: DatabaseOperation[];
    writeFields: string[];
}

/**
 * ツールのテーブルに対するアクセス権限を取得
 */
export const getToolAccessControl = (
    toolName: Page,
    tableName: string,
    database: Database | null
): ToolAccessControl | null => {
    if (!database?.tool_dependencies?.data) {
        return null;
    }

    const dependency = (database.tool_dependencies.data as ToolDependency[]).find(
        (dep) => dep.tool_name === toolName && dep.table_name === tableName
    );

    if (!dependency || !dependency.write_fields) {
        return null;
    }

    // allowed_operationsが未設定の場合は、すべての操作を許可（後方互換性）
    const allowedOpsStr = dependency.allowed_operations || '*';
    let allowedOperations: DatabaseOperation[];
    
    if (allowedOpsStr === '*' || allowedOpsStr === '') {
        allowedOperations = ['INSERT', 'UPDATE', 'DELETE'];
    } else {
        const ops = allowedOpsStr.split(',').map(op => op.trim().toUpperCase()) as DatabaseOperation[];
        allowedOperations = ops.filter(op => ['INSERT', 'UPDATE', 'DELETE'].includes(op)) as DatabaseOperation[];
    }

    const writeFields = dependency.write_fields === '*' 
        ? ['*'] 
        : dependency.write_fields.split(',').map(f => f.trim()).filter(Boolean);

    return {
        toolName,
        tableName,
        allowedOperations,
        writeFields,
    };
};

/**
 * 指定された操作が許可されているかチェック
 */
export const isOperationAllowed = (
    toolName: Page,
    tableName: string,
    operation: DatabaseOperation,
    database: Database | null
): boolean => {
    const accessControl = getToolAccessControl(toolName, tableName, database);
    if (!accessControl) {
        // アクセス制御が定義されていない場合は、デフォルトで許可（後方互換性）
        return true;
    }
    return accessControl.allowedOperations.includes(operation);
};

/**
 * データベース更新リクエストを送信
 * ツール名とアクセス制御を自動的に含める
 */
export const updateDatabase = async (
    toolName: Page,
    tableName: string,
    operations: Array<{
        type: DatabaseOperation;
        data?: any;
        where?: any;
    }>,
    database: Database | null
): Promise<{ success: boolean; error?: string }> => {
    // 各操作の権限をチェック
    for (const op of operations) {
        if (!isOperationAllowed(toolName, tableName, op.type, database)) {
            return {
                success: false,
                error: `ツール '${toolName}' はテーブル '${tableName}' に対して '${op.type}' 操作を実行する権限がありません。`,
            };
        }
    }

    try {
        const response = await fetch('/api/update-data.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tool_name: toolName,
                table: tableName,
                operations: operations,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update database');
        }

        // 削除操作が成功した場合、削除されたIDをトラッキング
        for (const op of operations) {
            if (op.type === 'DELETE' && op.where) {
                // where句から削除されたIDを取得してトラッキング
                // 一般的なPKフィールド名を試行
                const possibleKeys = ['id', 'productId', 'product_id', 'customerId', 'customer_id', 'quoteId', 'quote_id'];
                for (const key of possibleKeys) {
                    if (op.where[key] !== undefined) {
                        trackDeletedItem(tableName, op.where[key]);
                        break;
                    }
                }
                // カスタムキーも試行（where句の最初のキーをIDとして扱う）
                const firstKey = Object.keys(op.where)[0];
                if (firstKey && op.where[firstKey] !== undefined) {
                    trackDeletedItem(tableName, op.where[firstKey]);
                }
            }
        }

        return { success: true };
    } catch (error) {
        console.error('[updateDatabase] Failed to update database:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'データベースの更新に失敗しました。',
        };
    }
};

/**
 * ツールのデフォルト操作権限を取得
 * 設定ツールは通常UPDATEのみ、データ管理ツールはすべての操作を許可
 */
export const getDefaultAllowedOperations = (toolName: Page): DatabaseOperation[] => {
    // 設定系ツールは通常UPDATEのみ
    const settingsTools: Page[] = [
        'google-api-settings',
        'display-settings',
        'email-settings',
        'estimator-settings',
        'pdf-preview-settings',
        'backup-manager',
        'production-settings',
        'task-settings',
    ];

    if (settingsTools.includes(toolName)) {
        return ['UPDATE'];
    }

    // データ管理ツールはすべての操作を許可
    const dataManagementTools: Page[] = [
        'customermanagement',
        'product-management',
        'document',
        'order-management',
        'pricing-management',
        'user-management',
        'pdf-template-manager',
        'product-definition',
    ];

    if (dataManagementTools.includes(toolName)) {
        return ['INSERT', 'UPDATE', 'DELETE'];
    }

    // その他のツールはデフォルトですべての操作を許可
    return ['INSERT', 'UPDATE', 'DELETE'];
};

