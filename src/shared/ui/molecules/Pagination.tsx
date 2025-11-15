import React from 'react';
import { Button } from '../atoms/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '../atoms/icons';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 text-sm">
       {totalItems !== undefined && (
          <div className="text-muted dark:text-muted-dark">
              {totalItems}件の結果
          </div>
       )}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          disabled={currentPage === 1}
          aria-label="前のページへ"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          <span>前へ</span>
        </Button>
        <div className="font-semibold px-2">
          <span>{currentPage}</span>
          <span className="mx-1">/</span>
          <span>{totalPages}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          aria-label="次のページへ"
        >
          <span>次へ</span>
          <ChevronRightIcon className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};