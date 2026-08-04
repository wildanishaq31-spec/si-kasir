# SI-KASIR - Aplikasi Kasir Puskesmas RME

Sistem Informasi Kasir & Manajemen Pendapatan Puskesmas berbasis Web yang terintegrasi dengan Firebase Realtime Database.

## 🚀 Fitur Utama
- **Dashboard Analytics**: Ringkasan transaksi harian, grafik statistik pendapatan, dan indikator aktivitas import.
- **Import Data Transaksi**: Modul upload & auto-parsing file Excel/CSV data transaksi pasien umum.
- **Manajemen Transaksi**: Tabel transaksi real-time, pencarian cepat, filter status, dan opsi hapus data.
- **Laporan Pendapatan**: Laporan rekapitulasi keuangan per periode dengan opsi cetak / ekspor.
- **Master Data**: Kelola data Poli/Unit, Dokter, dan Jenis Pelayanan.
- **Riwayat Import**: Catatan log riwayat pengunggahan berkas transaksi.

## 🛠️ Tech Stack
- **Frontend**: React.js + Vite
- **UI Framework**: Bootstrap 5 + FontAwesome Icons
- **Backend & Database**: Firebase Realtime Database & Firebase Authentication
- **Excel Parser**: SheetJS (XLSX)

## 📦 Instalasi & Pengoperasian Lokal

1. **Clone repository ini**:
   ```bash
   git clone https://github.com/username/SI-KASIR.git
   cd SI-KASIR
   ```

2. **Install Dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```

4. **Build untuk Produksi**:
   ```bash
   npm run build
   ```

## 🌐 Konfigurasi Firebase (.env)
Buat file `.env` di root project:
```env
VITE_FIREBASE_DATABASE_URL=https://aplikasi-si-kasir-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=aplikasi-si-kasir
```
