/**
 * 削除されたアイテムのIDを追跡するグローバルトラッカー
 * テーブル名とIDのペアを保存し、データ読み込み時に除外する
 */

// テーブル名 -> 削除されたIDのセット
const deletedItemsMap = new Map<string, Set<string>>();

/**
 * 削除されたアイテムIDを記録する
 * @param tableName テーブル名
 * @param itemId 削除されたアイテムのID（文字列に変換）
 */
export function trackDeletedItem(tableName: string, itemId: string | number): void {
    if (!deletedItemsMap.has(tableName)) {
        deletedItemsMap.set(tableName, new Set());
    }
    deletedItemsMap.get(tableName)!.add(String(itemId));
}

/**
 * 削除されたアイテムIDを取得する
 * @param tableName テーブル名
 * @returns 削除されたIDのセット（存在しない場合は空のセット）
 */
export function getDeletedItems(tableName: string): Set<string> {
    return deletedItemsMap.get(tableName) || new Set();
}

/**
 * すべてのテーブルの削除されたIDを取得する
 * @returns テーブル名 -> 削除されたIDのセットのマップ
 */
export function getAllDeletedItems(): Map<string, Set<string>> {
    return new Map(deletedItemsMap);
}

/**
 * 特定のテーブルの削除されたIDをクリアする
 * @param tableName テーブル名
 */
export function clearDeletedItems(tableName: string): void {
    deletedItemsMap.delete(tableName);
}

/**
 * すべての削除されたIDをクリアする
 */
export function clearAllDeletedItems(): void {
    deletedItemsMap.clear();
}

/**
 * テーブルデータから削除されたIDを除外する
 * @param tableName テーブル名
 * @param data データ配列
 * @param primaryKeyField プライマリキーのフィールド名（デフォルト: 'id'）
 * @returns フィルタリングされたデータ配列
 */
export function filterDeletedItems<T extends Record<string, any>>(
    tableName: string,
    data: T[],
    primaryKeyField: string = 'id'
): T[] {
    const deletedIds = getDeletedItems(tableName);
    if (deletedIds.size === 0) {
        return data;
    }
    
    return data.filter(row => {
        const id = row[primaryKeyField];
        return id !== undefined && id !== null && !deletedIds.has(String(id));
    });
}

