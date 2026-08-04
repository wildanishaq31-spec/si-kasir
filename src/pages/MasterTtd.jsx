import React, { useState, useEffect } from 'react';
import { getFirebaseDataAsArray, saveMasterItem } from '../services/firebase';
import { showSuccessToast, showErrorToast } from '../utils/toast';

const DEFAULT_JABATAN = [
  { keyword: 'pembantu', label: 'Bendahara Penerimaan Pembantu UPTD Puskesmas Cermee' },
  { keyword: 'loket', label: 'Petugas Loket' },
  { keyword: 'kepala', label: 'plt.Kepala UPTD Puskesmas Cermee' },
  { keyword: 'dinas', label: 'Bendahara Penerimaan Dinas Kesehatan' }
];

export default function MasterTtd() {
  const [ttdList, setTtdList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: '', jabatan: '', nama: '', nip: '' });

  const loadData = async () => {
    setLoading(true);
    const data = await getFirebaseDataAsArray('MasterTtd');
    
    const mergedList = DEFAULT_JABATAN.map(def => {
      const found = data.find(item => item.Jabatan?.toLowerCase().includes(def.keyword.toLowerCase()));
      if (found) {
        return {
          id: found.TtdID || found._id,
          jabatan: def.label, // use the fixed exact label for display
          dbJabatan: found.Jabatan, // Keep original to not break anything
          nama: found.Nama || '-',
          nip: found.Nip || '-'
        };
      } else {
        return {
          id: '',
          jabatan: def.label,
          dbJabatan: def.label,
          nama: '-',
          nip: '-'
        };
      }
    });

    setTtdList(mergedList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (item) => {
    setFormData({ 
      id: item.id, 
      jabatan: item.jabatan, // using the fixed label for display
      dbJabatan: item.dbJabatan, // the string to actually save so it matches keywords
      nama: item.nama !== '-' ? item.nama : '', 
      nip: item.nip !== '-' ? item.nip : ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { 
      TtdID: formData.id,
      Jabatan: formData.dbJabatan, // Important: save it with the original text or fixed text so keyword matching works
      Nama: formData.nama,
      Nip: formData.nip
    };
    
    // if id is empty, saveMasterItem will generate a new one
    const res = await saveMasterItem('MasterTtd', payload);
    if (res.success) {
      showSuccessToast('Berhasil', 'Data TTD berhasil disimpan!');
      setShowModal(false);
      loadData();
    } else {
      showErrorToast('Gagal', res.message);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold text-dark mb-1">Pengaturan TTD</h5>
          <p className="text-muted small mb-0">Kelola data tanda tangan untuk cetak laporan</p>
        </div>
      </div>

      <div className="card rounded-4 border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">No.</th>
                <th>Jabatan</th>
                <th>Nama Lengkap</th>
                <th>NIP / Keterangan</th>
                <th className="text-center pe-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">Memuat data...</td>
                </tr>
              ) : (
                ttdList.map((item, idx) => (
                  <tr key={idx}>
                    <td className="ps-4 fw-semibold text-muted">{idx + 1}</td>
                    <td className="fw-medium">{item.jabatan}</td>
                    <td>
                      {item.nama === '-' ? (
                        <span className="badge bg-warning text-dark">Belum Diatur</span>
                      ) : (
                        <span className="fw-bold text-dark">{item.nama}</span>
                      )}
                    </td>
                    <td className="text-muted">{item.nip}</td>
                    <td className="text-center pe-4">
                      <button className="btn btn-sm btn-light border-0" onClick={() => handleOpenEdit(item)}>
                        <i className="fa-solid fa-pen text-secondary"></i> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
                <h5 className="modal-title fw-bold text-dark">
                  Edit Data TTD
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Jabatan</label>
                    <input
                      type="text"
                      className="form-control form-control-lg bg-light border-0"
                      value={formData.jabatan}
                      disabled
                    />
                    <div className="form-text" style={{ fontSize: '0.75rem' }}>*Jabatan sudah paten, tidak dapat diubah.</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Nama Lengkap *</label>
                    <input
                      type="text"
                      className="form-control form-control-lg bg-light border-0"
                      value={formData.nama}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      required
                      placeholder="Contoh: drg.Lesa Lolita,M.MKes"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-semibold text-muted">NIP / Keterangan Tambahan</label>
                    <input
                      type="text"
                      className="form-control form-control-lg bg-light border-0"
                      value={formData.nip}
                      onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                      placeholder="Contoh: NIP. 19700518 200604 2 003"
                    />
                  </div>

                  <div className="d-flex gap-2 justify-content-end">
                    <button type="button" className="btn btn-light rounded-pill px-4 fw-medium" onClick={() => setShowModal(false)}>Batal</button>
                    <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">Simpan</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
