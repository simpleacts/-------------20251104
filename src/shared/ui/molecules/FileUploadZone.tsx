import React, { useState, useCallback } from 'react';
import { UploadIcon } from '../atoms/icons';

interface FileUploadZoneProps {
  onFileSelect: (files: FileList) => void;
  acceptedFileTypes?: string;
  isMultiple?: boolean;
  isLoading?: boolean;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onFileSelect, acceptedFileTypes = '*', isMultiple = false, isLoading = false }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const inputId = `file-upload-zone-${React.useId()}`;

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFileSelect(e.target.files);
      e.target.value = ''; // Reset input to allow re-uploading the same file
    }
  };

  return (
    <div 
      onDrop={handleDrop}
      onDragOver={handleDragEnter}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDraggingOver ? 'border-brand-primary bg-blue-50 dark:bg-blue-900/20' : 'border-base-300 dark:border-base-dark-300'}`}
    >
      <label htmlFor={inputId} className="cursor-pointer">
        <UploadIcon className="w-10 h-10 mx-auto text-gray-400 mb-2"/>
        <p className="text-sm text-gray-500">ここにファイルをドラッグ＆ドロップするか、クリックして選択</p>
        <input 
          id={inputId} 
          type="file" 
          multiple={isMultiple} 
          accept={acceptedFileTypes} 
          className="hidden" 
          onChange={handleChange}
          disabled={isLoading}
        />
      </label>
    </div>
  );
};

export default FileUploadZone;