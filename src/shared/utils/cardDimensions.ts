/**
 * 統一されたカード幅計算ロジック
 * スクロールバーを考慮して、全体の幅100%を使用し、カード幅の合計が全体の98%に収まるように計算
 */

export interface CardDimensions {
    cardWidth: number;
    cardHeight: number;
    columnCount: number;
    gap: number;
    totalCardsWidth: number; // カード幅の合計（98%）
}

/**
 * レスポンシブ対応: 画面サイズに応じたカードサイズを計算
 * 全体の幅100%を使用し、カード幅の合計が全体の98%に収まるように計算
 * 縦スクロールバーが表示される場合を考慮して、スクロールバーの幅（17px）を差し引く
 * 
 * @param containerWidth コンテナの幅（100%）
 * @param hasVerticalScroll 縦スクロールが発生するかどうか（デフォルト: false）
 * @returns カードの寸法情報
 */
export const getCardDimensions = (containerWidth: number, hasVerticalScroll: boolean = false): CardDimensions => {
    // スクロールバーの幅（全デバイス共通で17pxを使用）
    // モバイル、タブレット、PCすべてで同じ値を使用
    const scrollbarWidth = hasVerticalScroll ? 17 : 0;
    // スクロールバーを考慮した実効幅から、カード幅の合計が98%に収まるように計算
    const effectiveWidth = containerWidth - scrollbarWidth;
    const totalCardsWidth = effectiveWidth * 0.98;
    
    // 画面幅に応じた最小カード幅（レスポンシブ）
    // 実効幅ではなく元の幅で判定（レスポンシブブレークポイントは元の幅基準）
    const getMinWidth = () => {
        if (containerWidth < 640) return 140; // モバイル: 2列
        if (containerWidth < 768) return 160; // タブレット小: 3列
        if (containerWidth < 1024) return 180; // タブレット: 4列
        if (containerWidth < 1280) return 200; // デスクトップ小: 5列
        return 220; // デスクトップ: 6列以上
    };
    
    const minWidth = getMinWidth();
    const gap = 16; // ギャップを調整
    
    // カラム数を計算（totalCardsWidth（98%）を基準に）
    const columnCount = Math.max(1, Math.floor((totalCardsWidth - gap) / (minWidth + gap)));
    
    // カード幅を正確に計算（ギャップを考慮して98%の幅内に収める）
    const cardAvailableWidth = totalCardsWidth - (gap * (columnCount + 1));
    const cardWidth = Math.max(minWidth, cardAvailableWidth / columnCount);
    
    // カードの高さも動的に調整（アスペクト比を維持）
    const aspectRatio = 1.2; // 幅:高さ = 1:1.2
    const cardHeight = Math.max(280, Math.min(400, cardWidth * aspectRatio));
    
    return {
        cardWidth: Math.min(cardWidth, totalCardsWidth / columnCount - gap), // 98%の幅を超えないように保証
        cardHeight,
        columnCount,
        gap,
        totalCardsWidth // カード幅の合計（98%）
    };
};

