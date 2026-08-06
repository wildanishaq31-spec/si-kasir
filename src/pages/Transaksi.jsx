import React, { useState, useEffect } from 'react';
import { getFirebaseDataAsArray, deleteFirebaseItem, updateFirebaseItem, logAudit, formatDisplayDate } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { showSuccessToast, showErrorToast, showWarningToast } from '../utils/toast';
import { getConvertedLayananString } from '../utils/labHelper';

export default function Transaksi() {
  const [trxList, setTrxList] = useState([]);
  const [helperLabList, setHelperLabList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selection Checkbox State
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showBatchDateModal, setShowBatchDateModal] = useState(false);
  const [batchNewDate, setBatchNewDate] = useState('');

  // Single Item Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [newDate, setNewDate] = useState('');

  const { user, isAdmin } = useAuth();

  const loadTransaksi = async () => {
    setLoading(true);
    const [data, labHelpers] = await Promise.all([
      getFirebaseDataAsArray('Transaksi'),
      getFirebaseDataAsArray('Settings/HelperLabPaket')
    ]);
    setTrxList(data.reverse());
    setHelperLabList(labHelpers);
    setLoading(false);
  };

  useEffect(() => {
    loadTransaksi();
  }, []);

  // Single Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus transaksi ini?')) return;
    const itemToDelete = trxList.find(t => (t.TransaksiID === id || t._id === id));
    const res = await deleteFirebaseItem('Transaksi', id);
    if (res.success) {
      await logAudit(
        user?.username,
        'HAPUS_TRANSAKSI',
        `Menghapus transaksi pasien ${itemToDelete?.NamaPasien || id}`
      );
      showSuccessToast('Terhapus', 'Transaksi telah dihapus.');
      setSelectedIds(prev => prev.filter(x => x !== id));
      loadTransaksi();
    } else {
      showErrorToast('Gagal Hapus', res.message);
    }
  };

  // Batch Delete (Hapus Masal)
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedIds.length} transaksi terpilih? Data yang dihapus tidak dapat dikembalikan.`)) return;

    setBatchLoading(true);
    let successCount = 0;
    for (const id of selectedIds) {
      const res = await deleteFirebaseItem('Transaksi', id);
      if (res.success) successCount++;
    }
    setBatchLoading(false);

    await logAudit(
      user?.username,
      'HAPUS_TRANSAKSI_MASAL',
      `Menghapus ${successCount} data transaksi secara masal`
    );
    showSuccessToast('Berhasil Hapus Masal', `${successCount} transaksi telah berhasil dihapus.`);
    setSelectedIds([]);
    loadTransaksi();
  };

  // Single Update Date
  const handleUpdateDate = async () => {
    if (!newDate) {
      showWarningToast('Peringatan', 'Pilih tanggal baru terlebih dahulu!');
      return;
    }
    const res = await updateFirebaseItem('Transaksi', editData.TransaksiID || editData._id, { Tanggal: newDate });
    if (res.success) {
      await logAudit(
        user?.username,
        'EDIT_TRANSAKSI',
        `Mengubah tanggal transaksi ${editData.NamaPasien || 'Pasien'} dari ${editData.Tanggal} ke ${newDate}`
      );
      showSuccessToast('Berhasil', 'Tanggal transaksi berhasil diperbarui!');
      setShowEditModal(false);
      setEditData(null);
      setNewDate('');
      loadTransaksi();
    } else {
      showErrorToast('Gagal Edit Tanggal', res.message);
    }
  };

  // Batch Update Date (Edit Tanggal Masal)
  const handleBatchUpdateDate = async () => {
    if (!batchNewDate) {
      showWarningToast('Peringatan', 'Pilih tanggal baru terlebih dahulu!');
      return;
    }
    setBatchLoading(true);
    let successCount = 0;
    for (const id of selectedIds) {
      const res = await updateFirebaseItem('Transaksi', id, { Tanggal: batchNewDate });
      if (res.success) successCount++;
    }
    setBatchLoading(false);

    await logAudit(
      user?.username,
      'EDIT_TRANSAKSI_MASAL',
      `Mengubah tanggal ${successCount} transaksi secara masal menjadi ${batchNewDate}`
    );
    showSuccessToast('Berhasil Edit Masal', `Tanggal untuk ${successCount} transaksi berhasil diperbarui!`);
    setShowBatchDateModal(false);
    setBatchNewDate('');
    setSelectedIds([]);
    loadTransaksi();
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
  };

  const getSortTimestamp = (item) => {
    if (!item || !item.Tanggal) return 0;
    const tglStr = String(item.Tanggal).trim();
    const jamStr = String(item.Jam || '00:00:00').trim();

    let yyyy = '1970';
    let mm = '01';
    let dd = '01';

    const dmyMatch = tglStr.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
    if (dmyMatch) {
      dd = dmyMatch[1].padStart(2, '0');
      mm = dmyMatch[2].padStart(2, '0');
      yyyy = dmyMatch[3];
    } else {
      const ymdMatch = tglStr.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})$/);
      if (ymdMatch) {
        yyyy = ymdMatch[1];
        mm = ymdMatch[2].padStart(2, '0');
        dd = ymdMatch[3].padStart(2, '0');
      }
    }

    const isoStr = `${yyyy}-${mm}-${dd}T${jamStr.length === 5 ? jamStr + ':00' : jamStr}`;
    const ts = new Date(isoStr).getTime();
    return isNaN(ts) ? 0 : ts;
  };

  const filteredData = trxList
    .filter(item => {
      const filterDateDmy = filterDate ? filterDate.split('-').reverse().join('-') : '';
      const matchDate = filterDate ? (item.Tanggal === filterDate || item.Tanggal === filterDateDmy) : true;
      const q = searchQuery.toLowerCase();
      const matchSearch = searchQuery
        ? (item.NamaPasien || '').toLowerCase().includes(q) ||
          (item.NoTransaksi || '').toLowerCase().includes(q) ||
          (item.NoRM || '').toLowerCase().includes(q)
        : true;
      return matchDate && matchSearch;
    })
    .sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, searchQuery, itemsPerPage]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // Checkbox helpers
  const currentDataIds = currentData.map(item => item.TransaksiID || item._id);
  const isAllSelected = currentDataIds.length > 0 && currentDataIds.every(id => selectedIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !currentDataIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentDataIds])));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div>
      <div className="card rounded-4 border-0 mb-4 shadow-sm">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-md-3">
              <label className="small text-muted fw-semibold mb-1">Filter Tanggal</label>
              <input
                type="date"
                className="form-control"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="small text-muted fw-semibold mb-1">Cari Data Transaksi</label>
              <div className="input-group">
                <span className="input-group-text bg-light"><i className="fa-solid fa-search text-muted"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nama Pasien / No RM / No Transaksi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <label className="small mb-1 d-block">&nbsp;</label>
              <button
                className="btn btn-success shadow-sm w-100"
                onClick={() => { setFilterDate(''); setSearchQuery(''); }}
              >
                <i className="fa-solid fa-rotate-right me-1"></i> Reset Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Batch Action Panel */}
      {selectedIds.length > 0 && (
        <div className="bg-primary bg-opacity-10 border border-primary p-3 rounded-4 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2 shadow-sm animate__animated animate__fadeIn">
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary fs-6 px-3 py-2 rounded-pill">
              <i className="fa-solid fa-check-double me-1"></i> {selectedIds.length} Transaksi Terpilih
            </span>
            <span className="small text-dark fw-semibold d-none d-md-inline">Pilih tindakan masal untuk data terpilih:</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-warning shadow-sm rounded-pill fw-bold btn-sm px-3"
              onClick={() => {
                setBatchNewDate('');
                setShowBatchDateModal(true);
              }}
              disabled={batchLoading}
            >
              <i className="fa-solid fa-calendar-alt me-1"></i> Edit Tanggal Masal
            </button>
              <button
                className="btn btn-danger shadow-sm rounded-pill fw-bold btn-sm px-3"
                onClick={handleBatchDelete}
                disabled={batchLoading}
              >
                <i className="fa-solid fa-trash me-1"></i> Hapus Masal ({selectedIds.length})
              </button>
            <button
              className="btn btn-outline-secondary rounded-pill btn-sm ms-1"
              onClick={() => setSelectedIds([])}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="card rounded-4 border-0 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="thead-gradient">
              <tr>
                <th className="ps-4" style={{ width: '45px' }}>
                  <input
                    type="checkbox"
                    className="form-check-input shadow-none"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    title="Pilih Semua Halaman Ini"
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>No. Trx / RM</th>
                <th>Tanggal</th>
                <th>Pasien</th>
                <th>Layanan</th>
                <th className="text-end">Total Bayar</th>
                <th className="text-center pe-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">Loading data...</td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">Tidak ada transaksi ditemukan.</td>
                </tr>
              ) : (
                currentData.map((t, idx) => {
                  const itemID = t.TransaksiID || t._id;
                  const isChecked = selectedIds.includes(itemID);
                  return (
                    <tr key={itemID || idx} className={isChecked ? 'table-primary bg-opacity-10' : ''}>
                      <td className="ps-4">
                        <input
                          type="checkbox"
                          className="form-check-input shadow-none"
                          checked={isChecked}
                          onChange={() => handleToggleSelectRow(itemID)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ maxWidth: '240px' }}>
                        <div className="fw-bold text-break">{t.NoTransaksi || '-'}</div>
                        <div className="text-muted small">RM: {t.NoRM || '-'}</div>
                      </td>
                      <td className="fw-semibold">{formatDisplayDate(t.Tanggal)}</td>
                      <td>
                        <div className="fw-semibold">{t.NamaPasien || '-'}</div>
                        <div className="badge bg-secondary bg-opacity-10 text-secondary">{t.JenisPasien || 'Umum'}</div>
                      </td>
                      <td style={{ maxWidth: '200px' }} className="text-wrap text-break">
                        {(t.TindakanList && t.TindakanList.length > 0)
                          ? getConvertedLayananString(t.TindakanList, helperLabList)
                          : (t.NamaPelayanan || '-')}
                      </td>
                      <td className="text-end fw-bold text-success">{formatRupiah(t.TotalBayar)}</td>
                        <td className="text-center pe-4">
                          <button
                            className="btn btn-sm btn-outline-warning border-0 rounded-circle me-1"
                            onClick={() => {
                              setEditData(t);
                              setNewDate(t.Tanggal || '');
                              setShowEditModal(true);
                            }}
                            title="Edit Tanggal"
                          >
                            <i className="fa-solid fa-calendar-alt"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger border-0 rounded-circle"
                            onClick={() => handleDelete(itemID)}
                            title="Hapus"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!loading && filteredData.length > 0 && (
          <div className="card-footer bg-white border-0 py-3">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted">Tampilkan</span>
                <select 
                  className="form-select form-select-sm w-auto" 
                  value={itemsPerPage} 
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="small text-muted">entri dari {filteredData.length} data</span>
              </div>
              
              <nav aria-label="Page navigation">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
                      Previous
                    </button>
                  </li>
                  {[...Array(totalPages)].map((_, i) => {
                    if (
                      i + 1 === 1 || 
                      i + 1 === totalPages || 
                      (i + 1 >= currentPage - 1 && i + 1 <= currentPage + 1)
                    ) {
                      return (
                        <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                          <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                            {i + 1}
                          </button>
                        </li>
                      );
                    } else if (
                      i + 1 === currentPage - 2 || 
                      i + 1 === currentPage + 2
                    ) {
                      return <li key={i + 1} className="page-item disabled"><span className="page-link">...</span></li>;
                    }
                    return null;
                  })}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Modal Single Edit Tanggal */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-light border-0">
                <h5 className="modal-title fs-6 fw-bold">Edit Tanggal Transaksi</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="small text-muted fw-semibold mb-1">Nama Pasien</label>
                  <input type="text" className="form-control bg-light" value={editData?.NamaPasien || '-'} readOnly />
                </div>
                <div className="mb-3">
                  <label className="small text-muted fw-semibold mb-1">Pilih Tanggal Baru</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer border-0 bg-light">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowEditModal(false)}>Batal</button>
                <button type="button" className="btn btn-primary rounded-pill px-4" onClick={handleUpdateDate}>Simpan Perubahan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Batch Edit Tanggal */}
      {showBatchDateModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-light border-0">
                <h5 className="modal-title fs-6 fw-bold">
                  <i className="fa-solid fa-calendar-check text-warning me-2"></i>
                  Edit Tanggal Masal ({selectedIds.length} Transaksi)
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowBatchDateModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="alert alert-info p-3 small rounded-3 mb-3">
                  <i className="fa-solid fa-info-circle me-1"></i>
                  Anda akan mengubah tanggal untuk <strong>{selectedIds.length} transaksi</strong> sekaligus.
                </div>
                <div className="mb-3">
                  <label className="small text-muted fw-semibold mb-1">Pilih Tanggal Baru</label>
                  <input
                    type="date"
                    className="form-control"
                    value={batchNewDate}
                    onChange={(e) => setBatchNewDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer border-0 bg-light">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowBatchDateModal(false)}>Batal</button>
                <button
                  type="button"
                  className="btn btn-warning fw-bold rounded-pill px-4"
                  onClick={handleBatchUpdateDate}
                  disabled={batchLoading}
                >
                  {batchLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span> Memproses...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check me-1"></i> Update {selectedIds.length} Transaksi
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

