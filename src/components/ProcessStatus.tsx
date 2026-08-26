
import React from 'react';
import { ProcessStatus } from '../types';

interface ProcessStatusProps {
  status: ProcessStatus;
  progress: number;
  error?: string;
}

const ProcessStatusView: React.FC<ProcessStatusProps> = ({ status, progress, error }) => {
  if (status === ProcessStatus.IDLE) return null;

  const isCompleted = status === ProcessStatus.COMPLETED;
  const isError = status === ProcessStatus.ERROR;

  return (
    <div className="mt-8 p-6 bg-white rounded-xl shadow-md border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-slate-700">
          {status === ProcessStatus.UPLOADING && 'Mengunggah file...'}
          {status === ProcessStatus.PROCESSING && 'Sedang menyesuaikan resi...'}
          {status === ProcessStatus.COMPLETED && 'Proses Selesai!'}
          {status === ProcessStatus.ERROR && 'Terjadi Kesalahan'}
        </span>
        <span className="text-sm font-bold text-blue-600">{progress}%</span>
      </div>
      
      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out rounded-full ${isError ? 'bg-red-500' : 'bg-blue-600'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {isError && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
          {error || 'Gagal memproses file. Pastikan format file sesuai.'}
        </p>
      )}

      {status === ProcessStatus.PROCESSING && (
        <p className="mt-2 text-xs text-slate-500 italic">
          Jangan tutup halaman ini sampai proses selesai.
        </p>
      )}
    </div>
  );
};

export default ProcessStatusView;
