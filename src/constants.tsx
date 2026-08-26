
import React from 'react';
import { FaFileExcel, FaFilePdf, FaCloudUploadAlt, FaCheck } from 'react-icons/fa';

/**
 * API CONFIGURATION
 * Auto-detect: Gunakan localhost di development, Railway di production.
 * 
 * Jika ingin paksa ke localhost: ganti isLocalhost = true
 * Jika ingin paksa ke production: ganti isLocalhost = false
 */
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_CONFIG = { // Force HMR rebuild
  // Otomatis pilih backend berdasarkan environment
  BASE_URL: 'http://127.0.0.1:8001',
  // BASE_URL: isLocalhost
  //   ? 'http://localhost:8000'  // Development (CMD/local)
  //   : 'https://web-production-24c99.up.railway.app',  // Production (deployed)
  PROCESS_LABELS_ENDPOINT: '/process-labels',
};

export const ICONS = {
  EXCEL: <FaFileExcel className="w-8 h-8 text-green-600" />,
  PDF: <FaFilePdf className="w-8 h-8 text-red-600" />,
  UPLOAD: <FaCloudUploadAlt className="w-10 h-10 text-slate-400" />,
  CHECK: <FaCheck className="w-4 h-4" />
};
