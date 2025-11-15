import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../atoms/icons';

export interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    startIndex: number;
    endIndex: number;
    itemsPerPage: number;
    onFirstPage: () => void;
    onPrevPage: () => void;
    onNextPage: () => void;
    onLastPage: () => void;
    onPageChange: (page: number) => void;
}

export interface PaginatedListContainerProps {
    /** 表示するデータ配列 */
    data: any[];
    /** 子要素（リストコンテンツ） */
    children: (paginatedData: any[]) => React.ReactNode;
    /** ページネーション設定 */
    paginationConfig: {
        enabled: boolean;
        itemsPerPage: number;
    };
    /** ヘッダーコンテンツ（オプション）ページネーション情報を受け取れる */
    header?: React.ReactNode | ((paginationInfo: PaginationInfo) => React.ReactNode);
    /** フッターコンテンツ（オプション）ページネーション情報を受け取れる */
    footer?: React.ReactNode | ((paginationInfo: PaginationInfo) => React.ReactNode);
    /** ページネーションコントロールの表示位置 */
    paginationPosition?: 'header' | 'footer' | 'both' | 'none';
    /** カスタムクラス名 */
    className?: string;
    /** データ変更時のコールバック（ページネーションのリセット用） */
    onDataChange?: () => void;
}

/**
 * ページネーション付きリスト表示コンテナ
 * ヘッダーとフッターにページネーションコントロールを表示
 */
const PaginatedListContainer: React.FC<PaginatedListContainerProps> = ({
    data,
    children,
    paginationConfig,
    header,
    footer,
    paginationPosition = 'both',
    className = '',
    onDataChange
}) => {
    const { enabled: isPaginationEnabled, itemsPerPage } = paginationConfig;
    const [currentPage, setCurrentPage] = useState(1);

    // データが変更されたらページをリセット
    // onDataChangeが指定されている場合はそれを使用、そうでない場合はデータの長さが変更されたらリセット
    useEffect(() => {
        if (onDataChange) {
            setCurrentPage(1);
        } else {
            // データの長さが変更された場合（メーカー切り替えなど）はページをリセット
            setCurrentPage(1);
        }
    }, [data.length, onDataChange]);

    // ページネーション計算
    const paginationCalc = useMemo(() => {
        if (!isPaginationEnabled || data.length === 0) {
            return {
                totalPages: 1,
                totalItems: data.length,
                startIndex: 0,
                endIndex: data.length,
                paginatedData: data
            };
        }

        const totalPages = Math.ceil(data.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, data.length);
        const paginatedData = data.slice(startIndex, endIndex);

        return {
            totalPages,
            totalItems: data.length,
            startIndex: startIndex + 1, // 1ベースのインデックス
            endIndex,
            paginatedData
        };
    }, [data, currentPage, itemsPerPage, isPaginationEnabled]);

    // ページ変更ハンドラ
    const handleFirstPage = useCallback(() => {
        setCurrentPage(1);
    }, []);

    const handlePrevPage = useCallback(() => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    }, []);

    const handleNextPage = useCallback(() => {
        setCurrentPage(prev => Math.min(paginationCalc.totalPages, prev + 1));
    }, [paginationCalc.totalPages]);

    const handleLastPage = useCallback(() => {
        setCurrentPage(paginationCalc.totalPages);
    }, [paginationCalc.totalPages]);

    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    // ページネーション情報オブジェクト
    const paginationInfo: PaginationInfo = useMemo(() => ({
        currentPage,
        totalPages: paginationCalc.totalPages,
        totalItems: paginationCalc.totalItems,
        startIndex: paginationCalc.startIndex,
        endIndex: paginationCalc.endIndex,
        itemsPerPage,
        onFirstPage: handleFirstPage,
        onPrevPage: handlePrevPage,
        onNextPage: handleNextPage,
        onLastPage: handleLastPage,
        onPageChange: handlePageChange,
    }), [currentPage, paginationCalc.totalPages, paginationCalc.totalItems, paginationCalc.startIndex, paginationCalc.endIndex, itemsPerPage, handleFirstPage, handlePrevPage, handleNextPage, handleLastPage, handlePageChange]);

    // ページネーションコントロール
    const PaginationControls = ({ position }: { position: 'header' | 'footer' }) => {
        if (!isPaginationEnabled || paginationCalc.totalPages <= 1) {
            return null;
        }

        return (
            <div className={`flex items-center justify-between gap-4 px-4 py-1 bg-gray-500 dark:bg-gray-600 border-b border-gray-400 dark:border-gray-500 ${position === 'footer' ? 'border-t' : ''}`}>
                <div className="flex items-center gap-2 text-sm text-white whitespace-nowrap">
                    <span>
                        {paginationCalc.startIndex} - {paginationCalc.endIndex} / {paginationCalc.totalItems}件
                    </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        type="button"
                        onClick={handleFirstPage}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[2.5rem] text-white"
                        title="最初のページへ"
                    >
                        <ChevronLeftIcon className="w-4 h-4 text-white" />
                        <ChevronLeftIcon className="w-4 h-4 -ml-2.5 text-white" />
                    </button>
                    <button
                        type="button"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[2rem] text-white"
                        title="前のページへ"
                    >
                        <ChevronLeftIcon className="w-4 h-4 text-white" />
                    </button>
                    <span className="px-3 py-1 text-sm font-medium text-white whitespace-nowrap">
                        {currentPage} / {paginationCalc.totalPages}
                    </span>
                    <button
                        type="button"
                        onClick={handleNextPage}
                        disabled={currentPage >= paginationCalc.totalPages}
                        className="p-1.5 rounded bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[2rem] text-white"
                        title="次のページへ"
                    >
                        <ChevronRightIcon className="w-4 h-4 text-white" />
                    </button>
                    <button
                        type="button"
                        onClick={handleLastPage}
                        disabled={currentPage >= paginationCalc.totalPages}
                        className="p-1.5 rounded bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[2.5rem] text-white"
                        title="最後のページへ"
                    >
                        <ChevronRightIcon className="w-4 h-4 text-white" />
                        <ChevronRightIcon className="w-4 h-4 -ml-2.5 text-white" />
                    </button>
                </div>
            </div>
        );
    };

    // ヘッダーのレンダリング
    const renderHeader = () => {
        if (!header && paginationPosition !== 'header' && paginationPosition !== 'both') {
            return null;
        }
        
        const showPagination = (paginationPosition === 'header' || paginationPosition === 'both') && 
                               isPaginationEnabled && 
                               paginationCalc.totalPages > 1;
        
        if (!header && !showPagination) {
            return null;
        }

        return (
            <div className="flex-shrink-0">
                {header && (
                    <div className="px-4 py-2">
                        {typeof header === 'function' ? header(paginationInfo) : header}
                    </div>
                )}
                {showPagination && <PaginationControls position="header" />}
            </div>
        );
    };

    // フッターのレンダリング
    const renderFooter = () => {
        if (!footer && paginationPosition !== 'footer' && paginationPosition !== 'both') {
            return null;
        }
        
        const showPagination = (paginationPosition === 'footer' || paginationPosition === 'both') && 
                               isPaginationEnabled && 
                               paginationCalc.totalPages > 1;
        
        if (!footer && !showPagination) {
            return null;
        }

        return (
            <div className="flex-shrink-0">
                {showPagination && <PaginationControls position="footer" />}
                {footer && (
                    <div className="px-4 py-2">
                        {typeof footer === 'function' ? footer(paginationInfo) : footer}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {renderHeader()}

            {/* リストコンテンツ */}
            <div className="flex-1 overflow-auto min-h-0">
                {children(paginationCalc.paginatedData)}
            </div>

            {renderFooter()}
        </div>
    );
};

export default PaginatedListContainer;

