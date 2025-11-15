import React from 'react';
import { PencilIcon, PencilSquareIcon, DuplicateIcon, TrashIcon } from '../atoms/icons';

interface GeneralTableActionsProps {
  onEdit: () => void;
  onDuplicate?: () => void;
  onDelete: () => void;
  editIconType?: 'pencil' | 'pencil-square';
}

export const GeneralTableActions: React.FC<GeneralTableActionsProps> = ({ onEdit, onDuplicate, onDelete, editIconType = 'pencil' }) => {
   const EditIcon = editIconType === 'pencil' ? PencilIcon : PencilSquareIcon;
   const editIconSize = editIconType === 'pencil' ? 'w-4 h-4' : 'w-5 h-5';
   return (
    <div className="flex items-center gap-1">
      <button onClick={onEdit} className="p-1 text-blue-600 hover:text-blue-800" title="編集">
          <EditIcon className={editIconSize}/>
      </button>
      {onDuplicate && (
        <button onClick={onDuplicate} className="p-1 text-gray-500 hover:text-gray-700" title="複製">
          <DuplicateIcon className="w-4 h-4"/>
        </button>
      )}
      <button onClick={onDelete} className="p-1 text-red-500 hover:text-red-700" title="削除">
          <TrashIcon className="w-4 h-4"/>
      </button>
    </div>
   );
}
