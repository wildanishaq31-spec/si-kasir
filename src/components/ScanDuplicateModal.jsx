import React, { useState, useEffect } from 'react';
import { scanDuplicateTransactions, applyDeduplicateFixes } from '../services/firebase';
import { showSuccessToast, showErrorToast } from '../utils/toast';

export default function ScanDuplicateModal({ show, onClose, onSuccess, username }) {
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await scanDuplicateTransactions();
      setScanResult(res);
    } catch (err) {
      console.error('Scan error:', err);
      showErrorToast('Gagal Memindai', err.message || 'Terjadi kesalahan saat memindai.');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (show) {
      runScan();
    } else {
      setScanResult(null);
    }
  }, [show]);

  const handleApplyFixes = async () => {
    if (!scanResult || !scanResult.issues || scanResult.issues.length === 0) return;
    setCleaning(true);
    try {
      const res = await applyDeduplicateFixes(scanResult.issues, username || 'SYSTEM');
      if (res.success) {
        showSuccessToast(
          'Pembersihan Berhasil!',
          `Berhasil membersihkan dan memperbarui ${res.fixedCount || 0} data transaksi.`
        );
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showErrorToast('Gagal Membersihkan', res.message);
      }
    } catch (err) {
      console.error('Apply fix error:', err);
      showErrorToast('Error', err.message || 'Gagal menerapkan pembersihan.');
    } finally {
      setCleaning(false);
    }
  };

  const formatRupiah = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  if (!show) return null;

  const issues = scanResult?.issues || [];
  const totalScanned = scanResult?.totalScanned || 0;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} tabIndex="-1">
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          
          {/* Header */}
          <div className="modal-header bg-light border-0 py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle bg-success bg-opacity-10 text-success p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                <i className="fa-solid fa-wand-magic-sparkles fs-6"></i>
              </div>
              <div>
                <h6 className="modal-title fw-bold text-dark mb-0">Scan & Pratinjau Duplikasi Transaksi</h6>
                <small className="text-muted">Pindai dan perbaiki duplikasi tindakan/laboratorium sebelum dieksekusi</small>
              </div>
            </div>
            <button type="button" className="btn-close" onClick={onClose} disabled={cleaning}></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            {scanning ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                <h6 className="fw-bold text-dark">Sedang Memindai Database...</h6>
                <p className="text-muted small mb-0">Memeriksa seluruh rincian transaksi dan mendeteksi tindakan/lab ganda.</p>
              </div>
            ) : scanResult ? (
              <div>
                {/* Summary Cards */}
                <div className="row g-3 mb-3">
                  <div className="col-sm-6">
                    <div className="card border-0 bg-light rounded-3 p-3">
                      <div className="text-muted small fw-medium">Total Transaksi Dipindai</div>
                      <div className="fs-5 fw-bold text-dark">{totalScanned} Data</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className={`card border-0 rounded-3 p-3 ${issues.length > 0 ? 'bg-danger bg-opacity-10 text-danger' : 'bg-success bg-opacity-10 text-success'}`}>
                      <div className="small fw-medium">Duplikasi Ditemukan</div>
                      <div className="fs-5 fw-bold">{issues.length} Transaksi</div>
                    </div>
                  </div>
                </div>

                {issues.length === 0 ? (
                  <div className="alert alert-success border-0 rounded-4 p-4 text-center mb-0">
                    <i className="fa-solid fa-circle-check fs-1 text-success mb-3 d-block"></i>
                    <h6 className="fw-bold text-dark mb-1">Semua Data Sudah Bersih & Rapi!</h6>
                    <p className="text-muted small mb-0">
                      Tidak ditemukan adanya data tindakan atau laboratorium yang terduplikasi pada database transaksi.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="alert alert-warning border-0 rounded-3 small py-2 px-3 mb-3 d-flex align-items-center gap-2">
                      <i className="fa-solid fa-triangle-exclamation fs-5 text-warning flex-shrink-0"></i>
                      <div>
                        Ditemukan <strong>{issues.length} transaksi</strong> dengan tindakan/lab ganda. Tinjau rincian perubahan total di bawah ini sebelum mengeksekusi pembersihan.
                      </div>
                    </div>

                    {/* Table of Issues */}
                    <div className="card border rounded-3 overflow-hidden">
                      <div className="table-responsive" style={{ maxHeight: '340px' }}>
                        <table className="table table-hover align-middle mb-0 small">
                          <thead className="table-light text-secondary sticky-top">
                            <tr>
                              <th className="ps-3 py-2">No. TRX / Pasien</th>
                              <th className="py-2">Tanggal</th>
                              <th className="py-2">Duplikat Terdeteksi</th>
                              <th className="py-2 text-end">Perubahan Total</th>
                              <th className="pe-3 py-2">Layanan Baru</th>
                            </tr>
                          </thead>
                          <tbody>
                            {issues.map((item, idx) => (
                              <tr key={item.trxKey || idx}>
                                <td className="ps-3">
                                  <div className="fw-bold text-dark">{item.namaPasien}</div>
                                  <div className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                                    {item.noTransaksi}
                                  </div>
                                </td>
                                <td className="text-secondary">{item.tanggal}</td>
                                <td>
                                  {item.duplicateDetails && item.duplicateDetails.length > 0 ? (
                                    item.duplicateDetails.map((dup, dIdx) => (
                                      <span key={dIdx} className="badge bg-danger-subtle text-danger border border-danger-subtle me-1 mb-1">
                                        <i className="fa-solid fa-copy me-1"></i>
                                        {dup.nama} ({formatRupiah(dup.biaya)})
                                      </span>
                                    ))
                                  ) : (
                                    <span className="badge bg-warning-subtle text-warning">Total Tidak Sinkron</span>
                                  )}
                                </td>
                                <td className="text-end text-nowrap">
                                  <div className="text-danger text-decoration-line-through small">
                                    {formatRupiah(item.currentTotal)}
                                  </div>
                                  <div className="text-success fw-bold fs-6">
                                    <i className="fa-solid fa-arrow-down me-1" style={{ fontSize: '0.75rem' }}></i>
                                    {formatRupiah(item.newTotal)}
                                  </div>
                                </td>
                                <td className="pe-3">
                                  <span className="badge bg-light text-dark border">
                                    {item.newLayanan || '-'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="modal-footer bg-light border-0 py-2 px-4 d-flex justify-content-between">
            <button 
              type="button" 
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={runScan}
              disabled={scanning || cleaning}
            >
              <i className={`fa-solid fa-arrows-rotate ${scanning ? 'fa-spin' : ''}`}></i>
              <span>Pindai Ulang</span>
            </button>
            <div className="d-flex align-items-center gap-2">
              <button 
                type="button" 
                className="btn btn-sm btn-light border px-3" 
                onClick={onClose}
                disabled={cleaning}
              >
                {issues.length === 0 ? 'Tutup' : 'Batal'}
              </button>
              {issues.length > 0 && (
                <button 
                  type="button" 
                  className="btn btn-sm btn-success d-flex align-items-center gap-2 px-3 shadow-sm"
                  onClick={handleApplyFixes}
                  disabled={cleaning || scanning}
                >
                  {cleaning ? (
                    <>
                      <div className="spinner-border spinner-border-sm" role="status"></div>
                      <span>Membersihkan...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-broom"></i>
                      <span>Eksekusi Bersihkan ({issues.length} Transaksi)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
