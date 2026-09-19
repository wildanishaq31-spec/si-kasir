import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePWAInstall } from '../utils/pwaHelper';
import { showSuccessToast, showInfoToast } from '../utils/toast';
import Swal from 'sweetalert2';

import logoCermee from '../assets/logo_cermee.jpg';
import logoBondowoso from '../assets/logo_bondowoso.jpg';

export default function DownloadApp() {
  const navigate = useNavigate();
  const { isStandalone, canInstall, promptInstall } = usePWAInstall();
  const [activeTab, setActiveTab] = useState('chrome');
  const [installing, setInstalling] = useState(false);

  const handleInstallClick = async () => {
    if (isStandalone) {
      navigate('/login');
      return;
    }

    setInstalling(true);
    try {
      const res = await promptInstall();
      if (res.outcome === 'accepted') {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Diinstal!',
          html: `
            <div class="text-center">
              <p class="mb-2">Aplikasi <b>SI-KASIR RME</b> telah berhasil terpasang di perangkat Anda.</p>
              <p class="text-muted small mb-0">Ikon aplikasi sekarang sudah muncul di Desktop / Home Screen.</p>
            </div>
          `,
          confirmButtonColor: '#198754',
          confirmButtonText: 'Buka Aplikasi Sekarang'
        }).then(() => {
          navigate('/login');
        });
      } else if (res.outcome === 'dismissed') {
        showInfoToast('Instalasi Dibatalkan', 'Anda dapat mencoba menginstal kembali kapan saja.');
      } else {
        // Jika prompt browser belum siap atau di platform seperti iOS
        const guideEl = document.getElementById('panduan-instalasi');
        if (guideEl) {
          guideEl.scrollIntoView({ behavior: 'smooth' });
        }
        Swal.fire({
          icon: 'info',
          title: 'Panduan Instalasi',
          html: `
            <div class="text-start small">
              <p>Untuk menginstal secara manual di browser Anda:</p>
              <ol class="ps-3 mb-0 text-secondary">
                <li>Klik ikon <b>Instal</b> <i class="fa-solid fa-download mx-1 text-success"></i> di ujung kanan kolom alamat browser (URL bar).</li>
                <li>Atau klik menu titik tiga <b>(⋮)</b> di pojok kanan atas browser ➔ Pilih <b>"Instal SI-KASIR"</b> / <b>"Tambahkan ke Layar Utama"</b>.</li>
              </ol>
            </div>
          `,
          confirmButtonColor: '#198754',
          confirmButtonText: 'Saya Mengerti'
        });
      }
    } catch (err) {
      console.error('Install error:', err);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light d-flex flex-column justify-content-between" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* Top Navbar */}
      <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm py-3 px-4">
        <div className="container d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <img src={logoBondowoso} alt="Logo Bondowoso" style={{ height: '42px', width: 'auto' }} />
            <img src={logoCermee} alt="Logo Puskesmas Cermee" style={{ height: '42px', width: 'auto' }} />
            <div className="border-start ps-3 d-none d-sm-block">
              <h6 className="fw-bold text-dark mb-0 fs-6">SI-KASIR RME</h6>
              <small className="text-success fw-semibold">Puskesmas Cermee Bondowoso</small>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button 
              className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold shadow-sm"
              onClick={() => navigate('/login')}
            >
              <i className="fa-solid fa-right-to-bracket me-1"></i> Buka Versi Web
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container py-5 my-auto">
        <div className="row justify-content-center align-items-center g-5">
          
          {/* Kolom Kiri: Hero Call to Action */}
          <div className="col-lg-6 text-center text-lg-start">
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 bg-success bg-opacity-10 text-success rounded-pill small fw-bold mb-3">
              <i className="fa-solid fa-circle-check"></i>
              <span>Progressive Web App (PWA) Resmi</span>
            </div>
            
            <h1 className="fw-extrabold text-dark display-5 mb-3" style={{ lineHeight: '1.2' }}>
              Instal Aplikasi <span className="text-success">SI-KASIR</span> Langsung di Perangkat Anda
            </h1>
            
            <p className="text-muted lead fs-6 mb-4">
              Tidak perlu lagi membuka browser dan mengetik alamat URL. Instal aplikasi kasir resmi Puskesmas Cermee langsung ke Desktop PC/Laptop atau Smartphone Anda dengan satu klik.
            </p>

            {/* Install Action Card */}
            <div className="card border-0 shadow-lg rounded-4 p-4 mb-4 bg-white">
              <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-4 bg-success text-white p-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '60px', height: '60px' }}>
                    <i className="fa-solid fa-cash-register fs-3"></i>
                  </div>
                  <div className="text-start">
                    <h6 className="fw-bold text-dark mb-1">SI-KASIR RME Desktop & Mobile</h6>
                    <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                      Versi 1.0.0 • Siap Diinstal
                    </span>
                  </div>
                </div>

                {isStandalone ? (
                  <button 
                    className="btn btn-primary btn-lg rounded-pill px-4 shadow-sm w-100 w-sm-auto fw-bold"
                    onClick={() => navigate('/login')}
                  >
                    <i className="fa-solid fa-arrow-right-to-bracket me-2"></i> Buka Aplikasi
                  </button>
                ) : (
                  <button 
                    className="btn btn-success btn-lg rounded-pill px-4 shadow-sm w-100 w-sm-auto fw-bold d-flex align-items-center justify-content-center gap-2"
                    onClick={handleInstallClick}
                    disabled={installing}
                    style={{ minWidth: '200px' }}
                  >
                    {installing ? (
                      <>
                        <div className="spinner-border spinner-border-sm" role="status"></div>
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-download fs-5"></i>
                        <span>Instal Sekarang</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="d-flex align-items-center gap-4 mt-3 pt-3 border-top text-muted small">
                <div className="d-flex align-items-center gap-1">
                  <i className="fa-solid fa-bolt text-warning"></i> Akses Instan
                </div>
                <div className="d-flex align-items-center gap-1">
                  <i className="fa-solid fa-shield-halved text-success"></i> Aman & Terenkripsi
                </div>
                <div className="d-flex align-items-center gap-1">
                  <i className="fa-solid fa-rotate text-info"></i> Auto-Update
                </div>
              </div>
            </div>

            <div className="text-muted small">
              <i className="fa-solid fa-circle-info text-primary me-1"></i>
              Mendukung semua perangkat: <strong>Windows, macOS, Android, dan iOS</strong>.
            </div>
          </div>

          {/* Kolom Kanan: Keunggulan Aplikasi */}
          <div className="col-lg-6">
            <div className="row g-3">
              <div className="col-sm-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white hover-shadow transition">
                  <div className="rounded-3 bg-primary bg-opacity-10 text-primary p-3 mb-3 d-inline-flex" style={{ width: '48px', height: '48px' }}>
                    <i className="fa-solid fa-desktop fs-5 mx-auto my-auto"></i>
                  </div>
                  <h6 className="fw-bold text-dark mb-2">Tampil Layar Penuh</h6>
                  <p className="text-muted small mb-0">
                    Bekerja tanpa gangguan baris tab atau kolom URL browser, tampilan bersih layaknya aplikasi software native.
                  </p>
                </div>
              </div>

              <div className="col-sm-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white hover-shadow transition">
                  <div className="rounded-3 bg-success bg-opacity-10 text-success p-3 mb-3 d-inline-flex" style={{ width: '48px', height: '48px' }}>
                    <i className="fa-solid fa-gauge-high fs-5 mx-auto my-auto"></i>
                  </div>
                  <h6 className="fw-bold text-dark mb-2">Ringan & Super Cepat</h6>
                  <p className="text-muted small mb-0">
                    Ukuran instalasi sangat kecil (&lt; 2 MB). Tidak membebani memori laptop atau ruang penyimpanan smartphone.
                  </p>
                </div>
              </div>

              <div className="col-sm-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white hover-shadow transition">
                  <div className="rounded-3 bg-warning bg-opacity-10 text-warning p-3 mb-3 d-inline-flex" style={{ width: '48px', height: '48px' }}>
                    <i className="fa-solid fa-arrows-rotate fs-5 mx-auto my-auto"></i>
                  </div>
                  <h6 className="fw-bold text-dark mb-2">Pembaruan Otomatis</h6>
                  <p className="text-muted small mb-0">
                    Setiap ada perbaikan atau fitur baru, aplikasi langsung diperbarui otomatis tanpa harus install ulang file.
                  </p>
                </div>
              </div>

              <div className="col-sm-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white hover-shadow transition">
                  <div className="rounded-3 bg-info bg-opacity-10 text-info p-3 mb-3 d-inline-flex" style={{ width: '48px', height: '48px' }}>
                    <i className="fa-solid fa-database fs-5 mx-auto my-auto"></i>
                  </div>
                  <h6 className="fw-bold text-dark mb-2">Realtime Firebase Sync</h6>
                  <p className="text-muted small mb-0">
                    Seluruh transaksi, import file, dan cetak laporan langsung tersinkronisasi secara langsung ke cloud database.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Section Panduan Instalasi Manual */}
      <div className="bg-white py-5 border-top" id="panduan-instalasi">
        <div className="container">
          <div className="text-center max-w-700 mx-auto mb-5">
            <h4 className="fw-bold text-dark mb-2">Panduan Instalasi Manual Per Browser</h4>
            <p className="text-muted small mb-0">
              Jika tombol di atas tidak otomatis memunculkan pop-up, ikuti langkah mudah sesuai browser yang Anda gunakan:
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="d-flex justify-content-center mb-4">
            <div className="nav nav-pills bg-light p-1 rounded-pill shadow-sm" role="tablist">
              <button 
                className={`nav-link rounded-pill px-4 py-2 small fw-bold ${activeTab === 'chrome' ? 'active bg-success text-white' : 'text-secondary'}`}
                onClick={() => setActiveTab('chrome')}
              >
                <i className="fa-brands fa-chrome me-2"></i> Chrome (PC)
              </button>
              <button 
                className={`nav-link rounded-pill px-4 py-2 small fw-bold ${activeTab === 'edge' ? 'active bg-success text-white' : 'text-secondary'}`}
                onClick={() => setActiveTab('edge')}
              >
                <i className="fa-brands fa-edge me-2"></i> Edge (PC)
              </button>
              <button 
                className={`nav-link rounded-pill px-4 py-2 small fw-bold ${activeTab === 'android' ? 'active bg-success text-white' : 'text-secondary'}`}
                onClick={() => setActiveTab('android')}
              >
                <i className="fa-brands fa-android me-2"></i> Android
              </button>
              <button 
                className={`nav-link rounded-pill px-4 py-2 small fw-bold ${activeTab === 'ios' ? 'active bg-success text-white' : 'text-secondary'}`}
                onClick={() => setActiveTab('ios')}
              >
                <i className="fa-brands fa-apple me-2"></i> iPhone / iPad
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-light">
                {activeTab === 'chrome' && (
                  <div>
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <i className="fa-brands fa-chrome text-success fs-5"></i>
                      Cara Instal di Google Chrome (Windows / Mac)
                    </h6>
                    <ol className="list-group list-group-numbered list-group-flush bg-transparent">
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Buka link <strong>https://si-kasir.pkmcermee.my.id</strong> di browser Chrome.
                      </li>
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Lihat ke ujung kanan kolom alamat web (URL bar), klik ikon <strong>Instal Aplikasi</strong> <i className="fa-solid fa-download text-success mx-1"></i>.
                      </li>
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Atau klik tombol menu titik tiga <strong>(⋮)</strong> di pojok kanan atas Chrome ➔ Pilih <strong>"Simpan dan Bagikan"</strong> ➔ <strong>"Instal SI-KASIR RME"</strong>.
                      </li>
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Klik <strong>"Instal"</strong> pada pop-up konfirmasi. Aplikasi siap dibuka dari Desktop!
                      </li>
                    </ol>
                  </div>
                )}

                {activeTab === 'edge' && (
                  <div>
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <i className="fa-brands fa-edge text-primary fs-5"></i>
                      Cara Instal di Microsoft Edge (Windows PC / Laptop)
                    </h6>
                    <ol className="list-group list-group-numbered list-group-flush bg-transparent">
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Buka link <strong>https://si-kasir.pkmcermee.my.id</strong> di browser Microsoft Edge.
                      </li>
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Klik ikon <strong>Aplikasi Tersedia</strong> <i className="fa-solid fa-cubes text-primary mx-1"></i> di sebelah kanan kolom URL.
                      </li>
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Klik tombol <strong>"Instal"</strong>.
                      </li>
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Centang opsi <em>"Sematkan ke taskbar"</em> dan <em>"Buat Pintasan Desktop"</em> agar mudah diakses.
                      </li>
                    </ol>
                  </div>
                )}

                {activeTab === 'android' && (
                  <div>
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <i className="fa-brands fa-android text-success fs-5"></i>
                      Cara Instal di Smartphone Android (Chrome)
                    </h6>
                    <ol className="list-group list-group-numbered list-group-flush bg-transparent">
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Buka link <strong>https://si-kasir.pkmcermee.my.id</strong> di browser Chrome HP.
                      </li>
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Tekan menu titik tiga <strong>(⋮)</strong> di pojok kanan atas browser.
                      </li>
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Instal Aplikasi"</strong>.
                      </li>
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Ikon SI-KASIR akan langsung muncul di daftar aplikasi smartphone Anda.
                      </li>
                    </ol>
                  </div>
                )}

                {activeTab === 'ios' && (
                  <div>
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <i className="fa-brands fa-apple text-dark fs-5"></i>
                      Cara Instal di iPhone / iPad (Safari)
                    </h6>
                    <ol className="list-group list-group-numbered list-group-flush bg-transparent">
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Buka link <strong>https://si-kasir.pkmcermee.my.id</strong> di browser <strong>Safari</strong>.
                      </li>
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Tekan tombol <strong>Bagikan / Share</strong> <i className="fa-solid fa-arrow-up-from-bracket text-primary mx-1"></i> di bilah bawah layar.
                      </li>
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Gulir ke bawah dan pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
                      </li>
                      <li className="list-group-item bg-transparent px-0 py-2 border-0">
                        Tekan <strong>"Tambah"</strong> di pojok kanan atas.
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-top py-4 text-center text-muted small">
        <div className="container">
          <div className="mb-2">
            <strong>SI-KASIR RME</strong> &copy; {new Date().getFullYear()} Puskesmas Cermee — Dinas Kesehatan Kabupaten Bondowoso
          </div>
          <div className="text-secondary opacity-75">
            Sistem Informasi Kasir & Pelaporan Rekonsiliasi Keuangan Daerah
          </div>
        </div>
      </footer>

    </div>
  );
}
