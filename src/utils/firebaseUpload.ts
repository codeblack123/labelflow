import { ref, uploadBytesResumable, getDownloadURL, uploadString } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../firebaseClient';

export interface FirebaseUploadData {
    excelFile: File;
    pdfFiles: File[];
    resultPdfBase64: string;
    packingListContent: string | null;
    stats: any;
    pickerName: string;
}

export const saveUploadTesToFirebase = async (data: FirebaseUploadData) => {
    try {
        const timestamp = new Date().getTime();
        const folderName = `upload_tes/${timestamp}`;

        // 1. Upload Excel
        const excelRef = ref(storage, `${folderName}/excel_original/${data.excelFile.name}`);
        await uploadBytesResumable(excelRef, data.excelFile);
        const excelUrl = await getDownloadURL(excelRef);

        // 2. Upload Original PDFs
        const pdfUrls: string[] = [];
        for (const pdf of data.pdfFiles) {
            const pdfRef = ref(storage, `${folderName}/pdf_original/${pdf.name}`);
            await uploadBytesResumable(pdfRef, pdf);
            const pdfUrl = await getDownloadURL(pdfRef);
            pdfUrls.push(pdfUrl);
        }

        // 3. Upload Result PDF
        const resultPdfRef = ref(storage, `${folderName}/pdf_hasil/Labels_Custom_Gabungan.pdf`);
        // We get base64 string without data:application/pdf;base64, prefix from backend
        const base64Prefix = 'data:application/pdf;base64,';
        const fullBase64 = data.resultPdfBase64.startsWith(base64Prefix) ? data.resultPdfBase64 : base64Prefix + data.resultPdfBase64;
        await uploadString(resultPdfRef, fullBase64, 'data_url');
        const resultPdfUrl = await getDownloadURL(resultPdfRef);

        // 4. Upload Packing List if exists
        let packingListUrl = null;
        if (data.packingListContent) {
            const plRef = ref(storage, `${folderName}/packing_list/packing_list.csv`);
            await uploadString(plRef, data.packingListContent); // Assuming CSV/Text
            packingListUrl = await getDownloadURL(plRef);
        }

        // 5. Save Metadata to Firestore
        const metadataRef = collection(db, 'upload_tes_history');
        const docRef = await addDoc(metadataRef, {
            created_at: serverTimestamp(),
            picker_name: data.pickerName,
            excel_filename: data.excelFile.name,
            pdf_filenames: data.pdfFiles.map(f => f.name),
            excel_url: excelUrl,
            original_pdf_urls: pdfUrls,
            result_pdf_url: resultPdfUrl,
            packing_list_url: packingListUrl,
            stats: {
                total_excel_awb: data.stats.total_excel_awb || 0,
                matched_count: data.stats.matched_count || 0,
                unmatched_excel_count: data.stats.unmatched_excel_count || 0,
                unmatched_pdf_count: data.stats.unmatched_pdf_count || 0,
                matched_awbs: data.stats.matched_awbs || data.stats.matched_with_awb || [],
                unmatched_excel_awbs: data.stats.unmatched_excel_awbs || data.stats.unmatched_excel || [],
                unmatched_pdf_awbs: data.stats.unmatched_pdf_awbs || data.stats.unmatched_pdf || []
            }
        });

        console.log("Document written with ID: ", docRef.id);
        return true;
    } catch (e) {
        console.error("Error adding document: ", e);
        return false;
    }
};
