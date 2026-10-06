# Implementation Plan - Format Bundling Pro (1000% Identik Format Rak & ID + Penonjolan Kemasan Bundling)

## 📌 Ringkasan Permintaan User
1. **1000% Mirip Format Rak & ID**:
   - Format Bundling Pro adalah salinan format label dari **Format Rak & ID** (3 kolom: `Rak & ID`, `MSKU`, `Qty`).
   - **TIDAK PERLU** ada kotak atau teks "CEK KODE" di bawah tabel (dihapus total dari backend, pengaturan, dan preview).
2. **Pencocokan Database SKU Bundling**:
   - Data SKU pada resi label hanya dicocokkan dengan kolom **`SKU Bundle`** pada menu/tabel `Database SKU Bundling` (`sku_bundling`).
   - **TIDAK BOLEH** mencocokkan dengan kolom `SKU Satuan`.
3. **Penebalan & Penambahan Ukuran Font Kemasan (+2pt)**:
   - Jika SKU pada label ditemukan dan cocok di kolom `SKU Bundle`:
     - Bagian unit/kemasan bundling (seperti `1BOX`, `1DRUM`, `1PACK`, `1SLOP`, dsb.) akan:
       - **Dicetak Tebal (Bold)**: `<b>...</b>`
       - **Ukuran font bertambah +2pt** dari ukuran font kolom MSKU saat ini.
       - *Contoh*: Jika font kolom MSKU adalah `10.5pt`, maka teks `1BOX` pada SKU `MARKER-1BOX/WM-60/BLACK` bertambah +2pt menjadi `12.5pt` dan tebal:
         `MARKER-`<b style="font-size:12.5pt">1BOX</b>`/WM-60/BLACK`.
     - Sisa teks SKU lainnya tetap memakai ukuran font normal kolom MSKU.
   - Jika SKU tidak ada di Database SKU Bundling (atau tidak cocok dengan kolom `SKU Bundle`), teks SKU dicetak standar (tanpa penebalan / penambahan size).

---

## 🛠️ Rencana Perubahan Detail

### 1. Backend (`main.py`)
- **Penyesuaian Query Data SKU Bundling**:
  - Pada query Supabase ke tabel `sku_bundling`, siapkan set khusus `bundling_bundle_skus` yang **HANYA** menampung nilai dari kolom `sku_bundle` (uppercase & strip). Kolom `sku_satuan` diabaikan untuk pencocokan Bundling Pro.
- **Pembersihan Logika "CEK KODE"**:
  - Hapus fungsi pembantu `extract_bundling_pro_badge`.
  - Hapus baris pemisah (spacer row) dan baris kotak outline `[CEK KODE: ...]` di bawah tabel pada fungsi `generate_table_data_bundling_pro` dan `create_table_bundling_pro`.
- **Logika Formatting SKU Bundling Pro**:
  - Buat fungsi penyorotan kemasan SKU, misal `format_bundling_pro_sku(raw_sku, font_name, base_font_size, max_width, is_matched_bundle)`:
    - Jika `is_matched_bundle` bernilai `True`:
      - Deteksi token kemasan via regex: `(?<![a-zA-Z0-9])(\d*(?:BOX|DRUM|PACK|SLOP|SET|DZ|LUSIN|ROLL|BAG|BTL|TUBE|JAR|LBR))(?![a-zA-Z0-9])`.
      - Bungkus token yang cocok dengan tag `<font size="{base_font_size + 2.0:.1f}"><b>...</b></font>`.
    - Lakukan pemotongan baris (*line wrapping*) yang presisi ke dalam ReportLab `Paragraph`.
- **Kalkulasi Tinggi Halaman (`calc_items_for_rows_bundling_pro`)**:
  - Hapus penambahan tinggi untuk kotak badge cek kode (`extra_badge_h = 0`).
  - Hitung tinggi item secara akurat berdasarkan tinggi wrap dari Paragraph yang telah memuat font kemasan berukuran `+2pt`.

### 2. Frontend (`src/components/AdminLabelSettings.tsx`)
- **Kartu Pilihan Format**:
  - Perbarui deskripsi opsi `bundling_2` (Format Bundling Pro):
    *3 Kolom (Rak & ID · MSKU · Qty) 1000% identik Format Rak & ID. Kata kemasan (1BOX, 1DRUM, 1PACK, 1SLOP) otomatis Bold & +2pt jika cocok dengan kolom SKU Bundle di Database SKU Bundling.*
- **Tab Pengaturan Format Bundling Pro**:
  - Hapus section *"Fitur Kotak Cek Kode Bundling"* (toggle bingkai dan slider font cek kode).
  - Pertahankan pengaturan lebar kolom, jenis font, ketebalan border, dan warna header (sama persis dengan Format Rak & ID).
- **Live Preview (`BundlingProPreview`)**:
  - Hapus kotak outline `[CEK KODE: ...]` di bawah tabel preview.
  - Perbarui contoh SKU di live preview (misal: `MARKER-1BOX/WM-60/BLACK`, `LEM-1DRUM/GLUE-500`, `BOOK-1PACK/CLBK-3505`) untuk mendemonstrasikan teks kemasan `1BOX`, `1DRUM`, `1PACK` yang dicetak tebal dan lebih besar +2pt secara inline di kolom MSKU.

---

## 🧪 Rencana Verifikasi (Verification Plan)
1. **Unit Testing Backend (Python ReportLab)**:
   - Jalankan skrip scratch untuk menguji fungsi ReportLab Paragraph dengan berbagai SKU:
     - `MARKER-1BOX/WM-60/BLACK`
     - `LEM-1DRUM/GLUE-500`
     - `BOOK-1PACK/CLBK-3505`
     - `ROKOK-1SLOP/SAMPLE`
     - SKU non-bundling (tidak cocok)
   - Verifikasi bahwa teks kemasan tampil tebal dan +2pt, sedangkan teks lain tetap pada ukuran asli kolom MSKU.
2. **Verifikasi Output PDF Visual**:
   - Generate contoh PDF label 100mm (283pt) dengan tabel 3 kolom dan pastikan tabel 1000% identik dengan Format Rak & ID tanpa kotak CEK KODE.
3. **Verifikasi Frontend**:
   - Buka `http://localhost:5173/` dan periksa menu Pengaturan Label:
     - Kartu format Bundling Pro bersih tanpa menyebutkan Cek Kode.
     - Live preview menampilkan highlight bold & +2pt pada kata `1BOX` di kolom MSKU.
4. **Verifikasi Pencocokan Database**:
   - Pastikan SKU pada resi hanya dicocokkan dengan nilai di kolom `sku_bundle`, dan jika resi berisi nilai dari `sku_satuan`, efek +2pt & bold tidak akan diterapkan.
