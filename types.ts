export interface UploadedFile {
    id: string;
    name: string;
    size: number;
    file: File;
}

export enum ProcessStatus {
    IDLE = 'idle',
    UPLOADING = 'uploading',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    ERROR = 'error'
}

export interface HistoryItem {
    id: string;
    created_at: string;
    file_name: string;
    pdf_count: number;
    status: 'completed' | 'failed' | 'processing';
    download_url?: string;
}
