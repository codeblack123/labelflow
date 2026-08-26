# Implementasi Fitur Hapus Permanen Khusus User (Maksimal 60 Menit)

Tujuan dari rencana ini adalah membuat fitur "Hapus Permanen" di menu Riwayat yang hanya muncul untuk user yang memproses data tersebut, dan tombol tersebut hanya tersedia selama 60 menit terhitung dari waktu proses (berdasarkan server). Keamanan akan dijaga murni di backend (API) sehingga tidak bisa di-*hack* hanya dengan *inspect element*.

> [!IMPORTANT]
> **Tindakan Manual Diperlukan:** Agar sistem bisa mengenali siapa yang memproses sebuah data, kita wajib menambahkan satu kolom baru yaitu `username` ke dalam tabel `label_process_history` di database Supabase Anda. Anda bisa menambahkannya dengan mudah melalui menu SQL Editor di Supabase.

## Proposed Changes

### 1. Perubahan Skema Database (Supabase)
Karena Supabase Anda hanya bisa diakses oleh Anda, Anda perlu menjalankan perintah SQL ini di Supabase SQL Editor:
```sql
ALTER TABLE label_process_history ADD COLUMN username text;
```
*(Kolom ini berfungsi untuk menyimpan nama user yang memproses pesanan tersebut)*

### 2. Frontend (`src/App.tsx`)
#### [MODIFY] [App.tsx](file:///c:/Users/jgilb/OneDrive/Dokumen/bolt%20new/8_shipping-label-customizer/shipping-label-customizer%209%20new%2023/shipping-label-customizer%209%20new%2023/src/App.tsx)
- Pada fungsi `saveToHistory`, saya akan menambahkan variabel `username: user?.username || 'unknown'` ke dalam *payload* yang dikirim ke Supabase. Dengan ini, setiap kali proses upload massal/single berhasil, Supabase akan mencatat siapa pelakunya.

### 3. Frontend (`src/components/OrderHistory.tsx`)
#### [MODIFY] [OrderHistory.tsx](file:///c:/Users/jgilb/OneDrive/Dokumen/bolt%20new/8_shipping-label-customizer/shipping-label-customizer%209%20new%2023/shipping-label-customizer%209%20new%2023/src/components/OrderHistory.tsx)
- Menambahkan logika pengecekan waktu: Membandingkan waktu `created_at` milik data dengan waktu saat ini.
- Menampilkan tombol **"Hapus Data (Sisa waktu: XX menit)"** murni HANYA JIKA:
  1. `record.username` sama dengan user yang sedang login (`user.username`).
  2. Selisih waktu belum lewat dari 60 menit.
- Jika lewat 60 menit, tombol akan hilang otomatis.
- Mengirim parameter `username` ke API saat tombol Hapus diklik.

### 4. Backend (`main.py`)
#### [MODIFY] [main.py](file:///c:/Users/jgilb/OneDrive/Dokumen/bolt%20new/8_shipping-label-customizer/shipping-label-customizer%209%20new%2023/shipping-label-customizer%209%20new%2023/main.py)
- Memodifikasi *endpoint* `DELETE /history/{record_id}` agar menerima parameter `username`.
- **Validasi Keamanan Ekstra (Anti Hack Inspect Element)**: Saat *request* Hapus diterima, server Python akan mengecek ke Supabase:
  1. Apakah `username` yang meminta hapus SAMA dengan `username` pembuat data? (Jika beda, tolak dengan error 403 Forbidden).
  2. Apakah waktu sekarang (di server) masih dalam rentang 60 menit dari waktu pembuatan data? (Jika sudah kadaluarsa, tolak dengan error 403 Forbidden).
- Dengan sistem validasi ganda di backend ini, meskipun seseorang memakai Inspect Element untuk memunculkan paksa tombol hapusnya, sistem server akan langsung menolaknya.

## Verification Plan
1. Anda perlu menjalankan SQL query untuk menambah kolom `username`.
2. Kita akan mencoba memproses 1 file Excel baru sebagai "User A".
3. Di menu riwayat, User A akan melihat tombol hapus dengan hitung mundur 60 menit.
4. Kita akan mencoba *login* sebagai "User B" dan memastikan tombol hapus tersebut tidak muncul pada riwayat milik User A.
5. Saya akan mencoba memaksa hapus via API untuk mensimulasikan percobaan *hacking* dan memastikan server benar-benar menolak perintahnya.

Silakan berikan persetujuan Anda, dan tolong konfirmasi jika Anda sudah menjalankan perintah SQL penambahan kolom tersebut di Supabase Anda!
