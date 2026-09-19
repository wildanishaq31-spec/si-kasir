---
title: "SI-KASIR PKM CERMEE — Master Obsidian Context & Dokumentasi Sistem"
date: "2026-09-19"
updated: "2026-09-19"
tags:
  - puskesmas
  - si-kasir
  - rme
  - pwa
  - react
  - firebase
  - documentation
aliases:
  - SI-KASIR Master Context
  - Dokumentasi SI-KASIR
author: "Agung / SI-KASIR Team"
status: "Active / Production"
---

# 🏥 SI-KASIR PKM CERMEE — Master Documentation & Obsidian Context

> [!abstract] Ringkasan Sistem
> **SI-KASIR PKM CERMEE** adalah sistem informasi kasir & pencatatan penerimaan retribusi pelayanan kesehatan Puskesmas Cermee berbasis Web & Progressive Web App (PWA). Aplikasi ini mengintegrasikan data RME (Rekam Medis Elektronik / e-Puskesmas), pembukuan transaksi kasir, cetak kuitansi/biling, laporan LPPKP & Pendapatan, serta WhatsApp blast.

---

## 📌 Metadata & Tautan Penting

| Parameter | Keterangan / Link |
| :--- | :--- |
| **Domain Utama** | [https://si-kasir.pkmcermee.my.id](https://si-kasir.pkmcermee.my.id) |
| **Halaman Download PWA** | [https://si-kasir.pkmcermee.my.id/download](https://si-kasir.pkmcermee.my.id/download) |
| **Repository GitHub** | `wildanishaq31-spec/si-kasir` (Branch: `main`) |
| **Database** | Firebase Realtime Database (`asia-southeast1`) |
| **Tech Stack** | React 18, Vite, Bootstrap 5.3, FontAwesome 6, Chart.js, SheetJS (XLSX) |

---

## 🏗️ Arsitektur & Struktur Direktori

```text
SI-KASIR/
├── docs/                        # Dokumentasi & Log Obsidian
│   ├── SI_KASIR_OBSIDIAN_MASTER_CONTEXT.md
│   └── LOG_SESI_CHAT_OBSIDIAN_2026-09-19.md
├── public/
│   ├── favicon.svg              # Logo Kasir Utama
│   ├── splash_loading.jpg       # Banner Loading Splash Puskesmas Cermee
│   ├── manifest.webmanifest     # Konfigurasi Standalone PWA
│   ├── sw.js                    # Service Worker Cache & Offline Handling
│   └── icons/                   # Icon PWA (192, 512, maskable, apple)
├── src/
│   ├── components/              # Komponen Reusable
│   │   ├── Sidebar.jsx          # Menu Navigasi Samping
│   │   ├── Topbar.jsx           # Header & Profile
│   │   ├── SplashScreen.jsx     # Loading 0-100% Khusus PWA HP
│   │   ├── ScanDuplicateModal.jsx # Preview & Pembersih Duplikasi Transaksi
│   │   └── ProtectedRoute.jsx
│   ├── context/
│   │   └── AuthContext.jsx      # Autentikasi & Hak Akses Dinamis
│   ├── pages/                   # Halaman / Views
│   │   ├── Dashboard.jsx        # Analytics Pendapatan & Grafik
│   │   ├── ImportData.jsx       # Parser Excel RME & Verifikasi Billing
│   │   ├── Transaksi.jsx        # Kasir, Cetak Kuitansi, Bayar/Batal
│   │   ├── RiwayatImport.jsx    # Log Batch Import & Fitur Rollback/Hapus
│   │   ├── LaporanPendapatan.jsx# Rekapitulasi Shift/Harian/Bulanan
│   │   ├── LPPKP.jsx            # Laporan Pemungutan & Penyetoran Kas
│   │   ├── DownloadApp.jsx      # Halaman Publik Download & Pasang PWA
│   │   ├── HakAkses.jsx         # Manajemen Hak Akses Menu Kasir
│   │   ├── MasterTtd.jsx        # Pengaturan TTD Bendahara/Kepala PKM
│   │   ├── MasterUser.jsx       # Manajemen Akun Kasir & Admin
│   │   ├── MasterPrint.jsx      # Konfigurasi Ukuran Kertas & Thermal
│   │   ├── MasterWaBlast.jsx    # Integrasi API WhatsApp Notification
│   │   └── Login.jsx            # Halaman Masuk Akun
│   ├── services/
│   │   ├── firebase.js          # CRUD & Realtime Listeners Firebase
│   │   └── supabaseClient.js    # Secondary Client (Opsional)
│   ├── utils/
│   │   ├── pwaHelper.js         # Deteksi PWA Standalone vs Desktop
│   │   └── formatters.js        # Format Rupiah & Tanggal Indonesia
│   ├── App.jsx                  # Routing Utama & Splash Controller
│   └── main.jsx                 # Entry Point React
```

---

## 🔑 Fitur Utama Sistem

### 1. Multi-Device Intelligent Detection (Desktop vs PWA Mobile)
* **Desktop Browser (Chrome/Edge/Firefox PC)**:
  * Langsung membuka aplikasi secara instan tanpa loading screen splash.
  * Workflow kasir cepat tanpa delay.
* **PWA Android (Aplikasi Layar Utama Smartphone)**:
  * Berjalan dalam mode *Standalone* (layar penuh tanpa URL bar).
  * Menampilkan **Splash Loading Screen 0% ➔ 100%** dengan branding Puskesmas Cermee saat pertama kali dibuka.
  * Menggunakan icon kasir resmi `favicon.svg` beresolusi tinggi.

### 2. Import RME & Fitur Pencegahan Duplikasi Data
* **Batch Import Tagging**: Setiap kali file Excel/RME diimport, record transaksi ditandai dengan `importId`.
* **Rollback / Hapus Batch Import**:
  * Pada halaman `Riwayat Import`, tombol **Hapus** memungkinkan administrator membatalkan file import.
  * Transaksi yang berasal dari file tersebut otomatis dihapus, dan item laboratorium/tindakan yang dimerge dikembalikan ke tarif awal secara otomatis.
* **Scan & Bersihkan Duplikasi (Interactive Deduplication)**:
  * Tombol **Scan Duplikat** memeriksa seluruh transaksi yang memiliki entri berulang pada pasien yang sama.
  * Menampilkan modal interaktif dengan perbandingan harga **Sebelum vs Sesudah** sebelum eksekusi pembersihan.

### 3. Halaman Download PWA (`/download`)
* Halaman publik responsif untuk menginstal aplikasi PWA di HP Android, iPhone/iPad, dan Desktop PC.
* Dilengkapi panduan instalasi visual dan tombol 1-Click Install.

### 4. Manajemen Kasir & Keuangan
* Cetak Kuitansi / Nota Pasien (Format Thermal & A4).
* Laporan LPPKP (Laporan Pemungutan dan Penyetoran Kas ke Kasda).
* Laporan Pendapatan per Petugas, per Poli/Unit, dan per Golongan Tarif (Umum, BPJS, Gratis, dll.).
* WhatsApp Blast notifikasi rincian pembayaran ke pasien.

---

## 📊 Struktur Database Firebase (Realtime Database)

| Path Firebase | Deskripsi Data |
| :--- | :--- |
| `/Transaksi/{id}` | Data detail transaksi kunjungan pasien, tindakan, tarif, status bayar, `importId`. |
| `/RiwayatImport/{importId}` | Log riwayat file yang diunggah (nama file, total data, waktu, uploader). |
| `/Users/{uid}` | Data akun pengguna, role (admin/kasir), status aktif. |
| `/HakAkses/{role}` | Matriks perizinan menu untuk setiap level pengguna. |
| `/Pengaturan/TTD` | Data nama, NIP, dan jabatan pejabat penandatangan dokumen. |
| `/Pengaturan/Print` | Pengaturan ukuran kertas kuitansi, margin, dan header nota. |
| `/Pengaturan/WA` | Endpoint API gateway & token WhatsApp Blast. |

---

## 🛠️ Panduan Operasional & Perintah Cepat

```bash
# Menjalankan local development server
npm run dev

# Membangun bundle produksi
npm run build

# Preview hasil build produksi
npm run preview
```

---

> [!tip] Catatan Pemeliharaan
> Seluruh perubahan kode dikelola di repository GitHub `wildanishaq31-spec/si-kasir` dan otomatis dideploy ke Vercel saat push ke branch `main`.
