
import React, { useState, useRef, DragEvent, useEffect } from 'react';
import { ICONS } from '../constants';

interface FileDropzoneProps {
  label: string;
  accept: string;
  multiple?: boolean;
  onFilesSelected: (files: FileList | null) => void;
  selectedFileCount: number;
  icon: React.ReactNode;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({
  label,
  accept,
  multiple = false,
  onFilesSelected,
  selectedFileCount,
  icon
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `file-upload-${label.replace(/\s+/g, '-').toLowerCase()}`;

  // Reset input when selectedFileCount goes to 0
  useEffect(() => {
    if (selectedFileCount === 0 && inputRef.current) {
      inputRef.current.value = '';
    }
  }, [selectedFileCount]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilesSelected(e.target.files);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const acceptTypes = accept.split(',').map(t => t.trim().toLowerCase());
      const filteredFiles = Array.from(files).filter(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const mime = file.type.toLowerCase();
        return acceptTypes.some(t => t === ext || t === mime || (t.includes('*') && mime.startsWith(t.replace('*', ''))));
      });

      if (filteredFiles.length > 0) {
        const dt = new DataTransfer();
        filteredFiles.forEach(file => dt.items.add(file));
        onFilesSelected(dt.files);
      }
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center w-full h-32 md:h-48 border-2 border-dashed rounded-lg md:rounded-xl cursor-pointer 
          transition-all duration-200 group touch-manipulation
          ${isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.02]'
            : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-blue-400'}
        `}
      >
        <div className="flex flex-col items-center justify-center pt-3 pb-4 md:pt-5 md:pb-6">
          <div className={`mb-2 md:mb-3 transition-transform duration-200 ${isDragging ? 'scale-125' : 'group-hover:scale-110'}`}>
            {icon}
          </div>
          <p className="mb-1 md:mb-2 text-xs md:text-sm text-slate-700 font-semibold px-2 text-center">{label}</p>
          <p className="text-[10px] md:text-xs text-slate-500 px-2 text-center">
            {isDragging ? '📁 Lepaskan file di sini!' : 'Drag & drop atau klik untuk pilih'}
          </p>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
        />
      </div>

      <div className="h-10 mt-2 md:mt-3">
        {selectedFileCount > 0 && (
          <div className="flex items-center h-full text-xs md:text-sm font-medium text-blue-600 bg-blue-50 px-3 rounded-lg border border-blue-100 w-full">
            <span className="mr-2">
              {ICONS.CHECK}
            </span>
            {selectedFileCount} file terpilih
          </div>
        )}
      </div>
    </div>
  );
};

export default FileDropzone;
