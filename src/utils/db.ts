export const DB_NAME = 'ShippingLabelDB';
export const STORE_NAME = 'files';
export const ITEMS_STORE = 'processed_items';
export const HISTORY_STORE = 'history';
export const DB_VERSION = 2; // Upgraded to 2

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('[DB] Error opening database:', (event.target as any).error);
            reject('Error opening database');
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Version 1: Files Store
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }

            // Version 2: Processed Items & History
            if (!db.objectStoreNames.contains(ITEMS_STORE)) {
                const itemsStore = db.createObjectStore(ITEMS_STORE, { keyPath: 'id', autoIncrement: true });
                itemsStore.createIndex('order_id', 'order_id', { unique: false });
                itemsStore.createIndex('awb', 'awb', { unique: false });
                itemsStore.createIndex('date_processed', 'date_processed', { unique: false });
                itemsStore.createIndex('excel_filename', 'excel_filename', { unique: false });
            } else {
                // Ensure index exists if store already exists (for version upgrades or safety)
                const transaction = db.transaction([ITEMS_STORE], 'readwrite');
                const store = transaction.objectStore(ITEMS_STORE);
                if (!store.indexNames.contains('excel_filename')) {
                    store.createIndex('excel_filename', 'excel_filename', { unique: false });
                }
            }

            if (!db.objectStoreNames.contains(HISTORY_STORE)) {
                const historyStore = db.createObjectStore(HISTORY_STORE, { keyPath: 'id', autoIncrement: true });
                historyStore.createIndex('created_at', 'created_at', { unique: false });
            }
        };
    });
};

// --- FILE STORAGE (Existing) ---

export const saveFileToDB = async (key: string, file: File): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(file, key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject('Error saving file');
    });
};

export const getFileFromDB = async (key: string): Promise<File | undefined> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Error getting file');
    });
};

export const deleteFileFromDB = async (key: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject('Error deleting file');
    });
};

// --- PROCESSED ITEMS (Offline Cache) ---

export const saveProcessedItemsToLocal = async (items: any[]): Promise<void> => {
    if (!items || items.length === 0) return;
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([ITEMS_STORE], 'readwrite');
        const store = transaction.objectStore(ITEMS_STORE);

        // Use a loop to put items. 
        // Note: put() is async, but inside a transaction it should be fine. 
        // For strict reliability, we could use Promise.all, but simple iteration is usually fine for IDB transactions.
        let errorOccurred = false;

        items.forEach(item => {
            try {
                // Ensure item fits the schema roughly suitable for local storage
                store.put(item);
            } catch (e) {
                console.error('[DB] Error saving item locally:', e);
                errorOccurred = true;
            }
        });

        transaction.oncomplete = () => {
            if (!errorOccurred) resolve();
            else resolve(); // Resolve anyway, best effort
        };

        transaction.onerror = () => reject(transaction.error);
    });
};

export const getProcessedItemsByOrderIds = async (orderIds: string[]): Promise<any[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([ITEMS_STORE], 'readonly');
        const store = transaction.objectStore(ITEMS_STORE);
        const index = store.index('order_id');

        const results: any[] = [];
        let completed = 0;

        if (orderIds.length === 0) {
            resolve([]);
            return;
        }

        orderIds.forEach(id => {
            const request = index.getAll(id); // getAll in case multiple entries exist (though unlikely for same order_id usually)

            request.onsuccess = () => {
                if (request.result && request.result.length > 0) {
                    results.push(...request.result);
                }
                completed++;
                if (completed === orderIds.length) {
                    resolve(results);
                }
            };

            request.onerror = () => {
                completed++; // Count as done even if error, to avoid hanging
                if (completed === orderIds.length) {
                    resolve(results);
                }
            };
        });
    });
};

// --- HISTORY (Offline Cache) ---

export const saveHistoryToLocal = async (historyRecord: any): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([HISTORY_STORE], 'readwrite');
        const store = transaction.objectStore(HISTORY_STORE);
        // Add created_at if missing, needed for indexing
        if (!historyRecord.created_at) {
            historyRecord.created_at = new Date().toISOString();
        }

        const request = store.put(historyRecord);

        request.onsuccess = () => resolve();
        request.onerror = () => reject('Error saving history locally');
    });
};
export const deleteHistoryFromLocal = async (id: number | string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([HISTORY_STORE], 'readwrite');
        const store = transaction.objectStore(HISTORY_STORE);
        // IDB keys are typed. If the store uses auto-incrementing numbers, we must pass a number.
        const idToUse = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
        const request = store.delete(idToUse);

        request.onsuccess = () => resolve();
        request.onerror = () => reject('Error deleting history locally');
    });
};

export const deleteProcessedItemsByExcelFile = async (filename: string): Promise<void> => {
    if (!filename) return;
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([ITEMS_STORE], 'readwrite');
        const store = transaction.objectStore(ITEMS_STORE);
        const index = store.index('excel_filename');
        const request = index.openCursor(IDBKeyRange.only(filename));

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            } else {
                resolve();
            }
        };
        request.onerror = () => reject('Error deleting processed items locally');
    });
};

export const deleteHistoryByExcelFile = async (filename: string): Promise<void> => {
    if (!filename) return;
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([HISTORY_STORE], 'readwrite');
        const store = transaction.objectStore(HISTORY_STORE);
        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                if (cursor.value.excel_filename === filename) {
                    cursor.delete();
                }
                cursor.continue();
            } else {
                resolve();
            }
        };
        request.onerror = () => reject('Error deleting history locally by excel_filename');
    });
};
