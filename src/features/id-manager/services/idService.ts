import { Database, Row, IdFormat } from '@shared/types';

/**
 * IDを生成
 * @param tableName テーブル名
 * @param database データベース
 * @param manufacturerId メーカーID（メーカー依存テーブルの場合に必須）
 * @returns 生成されたID
 */
export const generateNewId = (tableName: string, database: Partial<Database>, manufacturerId?: string): string => {
    const idFormats = (database.id_formats?.data as IdFormat[]) || [];
    const format = idFormats.find(f => f.table_name === tableName);
    const table = database[tableName];
    const pk = table?.schema[0]?.name || 'id';
    const data = table?.data || [];

    if (format) {
        const prefix = format.prefix || '';
        const padding = format.padding || 0;
        
        // メーカー依存テーブルの場合はmanufacturer_idを含める
        // id_formatsテーブルのis_manufacturer_dependent設定を確認
        const isManufacturerDependent = format.is_manufacturer_dependent === true || 
                                        format.is_manufacturer_dependent === 1 ||
                                        String(format.is_manufacturer_dependent) === '1';
        
        if (isManufacturerDependent && manufacturerId) {
            // フォーマット: {prefix}_{manufacturer_id}_{番号}
            const manufacturerPrefix = `${prefix}${manufacturerId}_`;
            const numPadding = Math.max(1, padding - manufacturerPrefix.length);
            
            // 該当メーカーのデータのみをフィルタリング
            const manufacturerData = data.filter((row: Row) => {
                const rowId = String(row[pk]);
                return rowId.startsWith(manufacturerPrefix);
            });
            
            let maxNum = 0;
            manufacturerData.forEach((row: Row) => {
                const rowId = String(row[pk]);
                if (rowId.startsWith(manufacturerPrefix)) {
                    const numPart = rowId.substring(manufacturerPrefix.length);
                    const num = parseInt(numPart, 10);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            });
            
            const newNum = String(maxNum + 1).padStart(numPadding, '0');
            return `${manufacturerPrefix}${newNum}`;
        }
        
        // Date-based ID (e.g., quot_YYYYMMDD_XXXXX)
        if ((tableName === 'quotes' || tableName === 'bills') && padding > 8) {
            const today = new Date();
            const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            const dailyPrefix = `${prefix}${yyyymmdd}_`;
            const seqPadding = padding - dailyPrefix.length > 0 ? padding - dailyPrefix.length : 5;
            
            let maxSeq = 0;
            data.forEach((row: Row) => {
                const rowId = String(row[pk]);
                if (rowId.startsWith(dailyPrefix)) {
                    const seqPart = rowId.substring(dailyPrefix.length);
                    const seq = parseInt(seqPart, 10);
                    if (!isNaN(seq) && seq > maxSeq) {
                        maxSeq = seq;
                    }
                }
            });
            const newSeq = String(maxSeq + 1).padStart(seqPadding, '0');
            return `${dailyPrefix}${newSeq}`;
        }

        // Simple sequential ID
        let maxNum = 0;
        data.forEach((row: Row) => {
            const rowId = String(row[pk]);
            let numPart = rowId;
            if (prefix && rowId.startsWith(prefix)) {
                numPart = rowId.substring(prefix.length);
            }
            
            const num = parseInt(numPart, 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        });
        return `${prefix}${String(maxNum + 1).padStart(padding, '0')}`;
    }
    
    // Fallback for tables without a format defined
    return `${tableName.substring(0, 4)}_${Date.now()}`;
};
