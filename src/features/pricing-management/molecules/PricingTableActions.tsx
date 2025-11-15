import React from 'react';
import { PencilIcon, DuplicateIcon, TrashIcon, PrinterIcon } from '@components/atoms';

interface PricingTableActionsProps {
  onPrint: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const PricingTableActions: React.FC<PricingTableActionsProps> = ({ onPrint, onEdit, onDuplicate, onDelete }) => {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onPrint} className="p-1 text-gray-500 hover:text-gray-700" title="PDFでエクスポート"><PrinterIcon className="w-5 h-5"/></button>
      <button onClick={onEdit} className="p-1 text-blue-600 hover:text-blue-800" title="編集"><PencilIcon className="w-5 h-5" /></button>
      <button onClick={onDuplicate} className="p-1 text-green-600 hover:text-green-800" title="複製"><DuplicateIcon className="w-5 h-5" /></button>
      <button onClick={onDelete} className="p-1 text-red-500 hover:text-red-700" title="削除"><TrashIcon className="w-5 h-5" /></button>
    </div>
  );
};