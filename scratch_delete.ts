const handleUserDelete = async (record: HistoryRecord) => {
        const confirmDelete = window.confirm(
            `Hapus riwayat "${record.excel_filename}"?\n\nData dan file terkait akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
        );

        if (!confirmDelete) return;

        setDeleteLoading(true);
        try {
            const dbMode = localStorage.getItem('db_mode') || 'cloud';

            if (dbMode === 'cloud') {
                try {
                    // Import Firebase modules dynamically
                    const { doc, deleteDoc, getDoc } = await import('firebase/firestore');
                    const { ref, deleteObject } = await import('firebase/storage');
                    const { db, storage } = await import('../firebaseClient');
                    
                    // Fetch the document first to get the URLs
                    const docRef = doc(db, 'upload_tes_history', record.id);
                    const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        
                        // Helper to safely delete a file from Storage
                        const deleteFileSafely = async (url: string) => {
                            if (!url) return;
                            try {
                                const fileRef = ref(storage, url);
                                await deleteObject(fileRef);
                            } catch (err) {
                                console.warn('Failed to delete file from Storage:', err);
                            }
                        };

                        // Delete associated files
                        if (data.excel_url) await deleteFileSafely(data.excel_url);
                        if (data.result_pdf_url) await deleteFileSafely(data.result_pdf_url);
                        if (data.packing_list_url) await deleteFileSafely(data.packing_list_url);
                        if (data.original_pdf_urls && Array.isArray(data.original_pdf_urls)) {
                            for (const url of data.original_pdf_urls) {
                                await deleteFileSafely(url);
                            }
                        }
                    }
                    
                    // Delete the Firestore document
                    await deleteDoc(docRef);
                    
                    // Cleanup local IndexedDB just in case
                    try {
                        await deleteHistoryFromLocal(record.id);
                        if (record.excel_filename) {
                            await deleteProcessedItemsByExcelFile(record.excel_filename);
                        }
                    } catch (localErr) {
                        console.warn('[LOCAL] Deletion from IndexedDB failed:', localErr);
                    }

                    alert('✅ Riwayat berhasil dihapus (Cloud).');
                    setSelectedRecord(null);
                    setRefreshTrigger(t => t + 1);
                    return; // Exit early since we handled cloud deletion
                } catch (cloudErr: any) {
                    console.error('Error deleting cloud record:', cloudErr);
                    alert(`❌ Gagal menghapus record cloud: ${cloudErr.message || 'Unknown error'}`);
                    return;
                }
            }

            await axios.delete(`${API_CONFIG.BASE_URL}/history/${record.id}?username=${encodeURIComponent(user?.username || '')}`);

            try {
                await deleteHistoryFromLocal(record.id);
                if (record.excel_filename) {
                    await deleteProcessedItemsByExcelFile(record.excel_filename);
                }
            } catch (localErr) {
                console.warn('[LOCAL] Deletion from IndexedDB failed:', localErr);
            }

            alert('✅ Riwayat berhasil dihapus.');
            setSelectedRecord(null);
            setRefreshTrigger(t => t + 1);
        } catch (error: any) {
            console.error('Error deleting record:', error);
            const msg = error.response?.data?.detail || 'Gagal menghapus record.';
            alert(`❌ ${msg}`);
        } finally {
            setDeleteLoading(false);
        }
    };
