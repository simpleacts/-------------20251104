/**
 * 見積作成専用API
 * 見積作成ツールに最適化されたデータ取得機能
 * 将来的に顧客向けWebアプリとして使用することを想定
 */

import { Database, Table } from '../../shared/types';

type EstimatorPhase = 'essential' | 'products' | 'customers';

interface EstimatorApiResponse {
    phase: EstimatorPhase;
    timestamp: string;
    data: Record<string, any[]>;
}

/**
 * 見積作成専用APIからデータを取得
 * @param phase 取得するデータフェーズ
 * @returns データベースオブジェクト
 */
export const fetchEstimatorData = async (phase: EstimatorPhase): Promise<Partial<Database>> => {
    try {
        const response = await fetch(`/api/estimator-data.php?phase=${phase}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('estimator-data.php not found (404). Falling back to standard API.');
            }
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error) {
                    throw new Error(`Estimator API Error: ${errorJson.error}`);
                }
            } catch (e) {
                throw new Error(`Estimator API failed: ${response.status} ${response.statusText}`);
            }
            throw new Error(`Estimator API failed: ${response.status} ${response.statusText}`);
        }
        
        const apiResponse: EstimatorApiResponse = await response.json();
        
        // APIレスポンスをDatabase形式に変換
        const database: Partial<Database> = {};
        
        if (!apiResponse.data || typeof apiResponse.data !== 'object') {
            return database;
        }
        
        for (const [tableName, tableData] of Object.entries(apiResponse.data)) {
            // APIレスポンスは {schema: [...], data: [...]} 形式で返される
            if (tableData && typeof tableData === 'object' && 'schema' in tableData && 'data' in tableData) {
                // 新しい形式: {schema: [...], data: [...]}
                const schema = tableData.schema || [];
                const data = tableData.data || [];
                
                database[tableName] = {
                    schema,
                    data: data as any[]
                } as Table;
            } else if (Array.isArray(tableData)) {
                // 後方互換性: 配列形式の場合（古いAPI形式）
                // スキーマを推測（簡単な実装）
                const schema = tableData.length > 0 && tableData[0] && typeof tableData[0] === 'object' && tableData[0] !== null
                    ? Object.keys(tableData[0]).map(key => ({
                        id: key,
                        name: key,
                        type: 'TEXT' as const
                    }))
                    : [];
                
                database[tableName] = {
                    schema,
                    data: tableData as any[]
                } as Table;
            }
        }
        
        console.log(`[estimator-api] Loaded ${phase} phase: ${Object.keys(database).length} tables`);
        
        return database;
        
    } catch (error) {
        console.error(`[estimator-api] Failed to fetch ${phase} phase:`, error);
        throw error;
    }
};

/**
 * 見積作成に必要なすべてのデータを段階的に取得
 * @returns データベースオブジェクト
 */
export const fetchAllEstimatorData = async (): Promise<Partial<Database>> => {
    const [essentialData, productData, customerData] = await Promise.all([
        fetchEstimatorData('essential'),
        fetchEstimatorData('products'),
        fetchEstimatorData('customers')
    ]);
    
    return {
        ...essentialData,
        ...productData,
        ...customerData
    };
};

