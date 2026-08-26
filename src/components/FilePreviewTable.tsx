
import React from 'react';
import { UploadedFile } from '../types';

interface FilePreviewTableProps {
  files: UploadedFile[];
}

const FilePreviewTable: React.FC<FilePreviewTableProps> = ({ files }) => {
  if (files.length === 0) return null;

  return (
    <div className="mt-6 bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-medium text-slate-800">Daftar PDF Terpilih</h3>
        <p className="text-xs text-slate-400">{files.length} file siap diproses</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2.5 font-medium">Nama File</th>
              <th className="px-4 py-2.5 font-medium">Ukuran</th>
              <th className="px-4 py-2.5 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {files.map((file) => (
              <tr key={file.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-2.5 text-xs text-slate-600 font-medium truncate max-w-xs">
                  {file.name}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </td>
                <td className="px-4 py-2.5 text-xs text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-600">
                    Siap
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FilePreviewTable;
