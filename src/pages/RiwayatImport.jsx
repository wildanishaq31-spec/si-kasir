import React, { useState, useEffect } from 'react';
import { getFirebaseDataAsArray, deleteImportBatch } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import ScanDuplicateModal from '../components/ScanDuplicateModal';
import Swal from 'sweetalert2';

export default function RiwayatImport() {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanModal, setShowScanModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getFirebaseDataAsArray('RiwayatImport');
      // Sort terbaru di paling atas
      const sorted = [...data].sort((a, b) => {
        const timeA = a.TanggalImport ? new Date(a.TanggalImport.replace(' ', 'T')).getTime() : 0;
        const timeB = b.TanggalImport ? new Date(b.TanggalImport.replace(' ', 'T')).getTime() : 0;
        return timeB - timeA;
      });
      setHistoryList(sorted);
    } catch (err) {
      console.error('Error loading import history:', err);
      showErrorToast('Gagal Memuat', 'Tidak dapat mengambil riwayat import');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);



  const handleDelete = async (item) => {
    const importId = item.ImportID || item._id;
    const fileName = item.NamaFile || 'File Tanpa Nama';
    const totalSukses = item.Berhasil || 0;

    const result = await Swal.fire({
      title: 'Hapus Riwayat & Data Import?',
      html: `
        <div class="text-start small">
          <p class="mb-2">Anda akan menghapus log import:</p>
          <ul class="mb-3 text-secondary">
            <li><strong>ID:</strong> <code class="text-primary">${importId}</code></li>
            <li><strong>Nama File:</strong> ${fileName}</li>
            <li><strong>Waktu:</strong> ${item.TanggalImport || '-'}</li>
            <li><strong>User Pengunggah:</strong> ${item.UserID || '-'}</li>
          </ul>
          <div class="alert alert-danger py-2 px-3 mb-0 rounded-3 d-flex align-items-center gap-2">
            <i class="fa-solid fa-triangle-exclamation fs-5 text-danger flex-shrink-0"></i>
            <div>
              <strong>Pencegahan Duplikasi:</strong><br/>
              Semua transaksi (<strong>${totalSukses} data</strong>) dari batch import ini akan otomatis dihapus dari database.
            </div>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fa-solid fa-trash-can me-1"></i> Ya, Hapus Data',
      cancelButtonText: 'Batal',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: 'Menghapus Data...',
        text: 'Sedang menghapus riwayat import dan data transaksi terkait dari sistem...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const res = await deleteImportBatch(
        importId,
        fileName,
        user?.username || user?.nama || 'SYSTEM'
      );

      Swal.close();

      if (res.success) {
        showSuccessToast(
          'Berhasil Dihapus!',
          `Riwayat import dan ${res.deletedTrxCount || 0} data transaksi terkait telah dihapus.`
        );
        loadHistory();
      } else {
        showErrorToast('Gagal Menghapus', res.message || 'Terjadi kesalahan sistem.');
      }
    }
  };

  // Filter berdasarkan pencarian
  const filteredList = historyList.filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.ImportID && item.ImportID.toLowerCase().includes(term)) ||
      (item.NamaFile && item.NamaFile.toLowerCase().includes(term)) ||
      (item.TanggalImport && item.TanggalImport.toLowerCase().includes(term)) ||
      (item.UserID && item.UserID.toLowerCase().includes(term))
    );
  });

  // Statistik Ringkas
  const totalImports = historyList.length;
  const totalSuksesAll = historyList.reduce((acc, curr) => acc + (Number(curr.Berhasil) || 0), 0);

  return (
    <div className="container-fluid px-0 pb-4">
      {/* Header & Filter */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-success"></i>
            Riwayat Sinkronisasi & Import RME
          </h5>
          <p className="text-muted small mb-0">Log pengunggahan file Excel/CSV data transaksi pasien serta manajemen rollback duplikasi</p>
        </div>
        <div className="d-flex align-items-center gap-2 w-100 w-md-auto">
          <div className="input-group input-group-sm" style={{ minWidth: '240px' }}>
            <span className="input-group-text bg-white border-end-0 text-muted">
              <i className="fa-solid fa-magnifying-glass"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Cari ID, File, User..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="btn btn-outline-secondary border-start-0" type="button" onClick={() => setSearchTerm('')}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
          <button 
            className="btn btn-sm btn-outline-success d-flex align-items-center gap-1 shadow-sm text-nowrap" 
            onClick={() => setShowScanModal(true)}
            disabled={loading}
            title="Scan dan tinjau transaksi duplikat sebelum dibersihkan"
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span className="d-none d-sm-inline">Scan Duplikasi</span>
          </button>
          <button 
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 shadow-sm text-nowrap" 
            onClick={loadHistory}
            disabled={loading}
            title="Muat Ulang Riwayat"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i>
            <span className="d-none d-sm-inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Mini Stats Card */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-3 bg-primary bg-opacity-10 text-primary p-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                <i className="fa-solid fa-file-import fs-5"></i>
              </div>
              <div>
                <div className="text-muted small fw-medium">Total Sesi Import</div>
                <div className="fs-5 fw-bold text-dark">{totalImports} Kali</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-3 bg-success bg-opacity-10 text-success p-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                <i className="fa-solid fa-check-double fs-5"></i>
              </div>
              <div>
                <div className="text-muted small fw-medium">Total Data Masuk</div>
                <div className="fs-5 fw-bold text-success">{totalSuksesAll.toLocaleString('id-ID')} Transaksi</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-light">
            <div className="d-flex align-items-center gap-2 text-muted small">
              <i className="fa-solid fa-circle-info text-info fs-5 flex-shrink-0"></i>
              <span>Gunakan tombol <strong>Hapus</strong> untuk membatalkan file import jika terjadi unggahan ganda antara admin & kasir.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Riwayat */}
      <div className="card rounded-4 border-0 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small text-nowrap">
            <thead className="table-light text-secondary">
              <tr>
                <th className="ps-4 py-3">Import ID</th>
                <th className="py-3">Waktu Import</th>
                <th className="py-3">Nama File</th>
                <th className="py-3 text-center">Total Baris</th>
                <th className="py-3 text-center text-success">Sukses</th>
                <th className="py-3 text-center text-danger">Gagal / Skip</th>
                <th className="py-3">User</th>
                <th className="py-3 pe-4 text-center" style={{ width: '100px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Memuat data riwayat import...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <i className="fa-regular fa-folder-open fs-3 d-block mb-2 text-secondary opacity-50"></i>
                    {searchTerm ? 'Tidak ditemukan riwayat import yang sesuai dengan pencarian.' : 'Belum ada riwayat import.'}
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.ImportID || item._id || idx}>
                    <td className="ps-4">
                      <span className="badge bg-light text-primary border font-monospace px-2 py-1">
                        {item.ImportID || '-'}
                      </span>
                    </td>
                    <td className="text-secondary">{item.TanggalImport || '-'}</td>
                    <td className="fw-medium text-dark">
                      <i className="fa-solid fa-file-excel text-success me-2"></i>
                      {item.NamaFile || '-'}
                    </td>
                    <td className="text-center fw-medium">{item.JumlahData || 0}</td>
                    <td className="text-center">
                      <span className="badge bg-success-subtle text-success fw-bold px-2 py-1 rounded-pill">
                        {item.Berhasil || 0}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`badge ${Number(item.Gagal) > 0 ? 'bg-danger-subtle text-danger' : 'bg-light text-muted'} fw-semibold px-2 py-1 rounded-pill`}>
                        {item.Gagal || 0}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                        <i className="fa-solid fa-user me-1"></i>
                        {item.UserID || '-'}
                      </span>
                    </td>
                    <td className="pe-4 text-center">
                      <button 
                        className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 rounded-pill px-3 py-1 shadow-sm"
                        onClick={() => handleDelete(item)}
                        title="Hapus riwayat dan batalkan data transaksi import ini"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Scan & Pratinjau Duplikasi */}
      <ScanDuplicateModal
        show={showScanModal}
        onClose={() => setShowScanModal(false)}
        onSuccess={loadHistory}
        username={user?.username}
      />
    </div>
  );
}
