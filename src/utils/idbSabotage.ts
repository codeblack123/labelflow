// Helper functions to manage IndexedDB specifically for the sabotage/accuracy test feature

const DB_NAME = 'SabotageVaultDB';
const STORE_NAME = 'pdf_vault';

// Open or create the database
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2); // upgraded version for new schema
        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = (event: any) => resolve(event.target.result);
        request.onerror = (event: any) => reject(event.target.error);
    });
};

// Save PDF and Excel Blob to local vault
export const saveSabotageFiles = async (pdfBlob: Blob, originalPdfName: string, prefix: string, excelBlob: Blob, excelName: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const record = {
            id: 'sabotaged_files', // We only ever keep ONE set of files at a time
            blob: pdfBlob, // legacy name for compatibility if needed
            pdfBlob: pdfBlob,
            originalName: originalPdfName,
            prefix,
            excelBlob: excelBlob,
            excelName: excelName,
            savedAt: new Date().toISOString()
        };
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Retrieve PDF and Excel Blob from local vault
export const getSabotageFiles = async (): Promise<{ pdfBlob: Blob, originalPdfName: string, prefix: string, excelBlob?: Blob, excelName?: string } | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        // Try getting the new ID first
        let request = store.get('sabotaged_files');
        request.onsuccess = (event: any) => {
            if (event.target.result) {
                resolve({
                    pdfBlob: event.target.result.pdfBlob || event.target.result.blob,
                    originalPdfName: event.target.result.originalName,
                    prefix: event.target.result.prefix,
                    excelBlob: event.target.result.excelBlob,
                    excelName: event.target.result.excelName
                });
            } else {
                // Fallback to legacy ID
                const legacyRequest = store.get('sabotaged_pdf');
                legacyRequest.onsuccess = (legacyEvent: any) => {
                    if (legacyEvent.target.result) {
                        resolve({
                            pdfBlob: legacyEvent.target.result.blob,
                            originalPdfName: legacyEvent.target.result.originalName,
                            prefix: legacyEvent.target.result.prefix
                        });
                    } else {
                        resolve(null);
                    }
                };
                legacyRequest.onerror = () => reject(legacyRequest.error);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

// Clear the vault
export const clearSabotageVault = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete('sabotaged_files');
        store.delete('sabotaged_pdf'); // delete legacy too
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
