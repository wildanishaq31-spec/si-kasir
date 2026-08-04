import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, set, push, remove } from 'firebase/database';
import { db } from '../services/firebase';
import { uploadTemplateFile, deleteTemplateFile, isSupabaseConfigured } from '../services/supabase';
import { showSuccessToast, showErrorToast, showWarningToast } from '../utils/toast';

export default function MasterPrint() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);

  // Modal Add / Edit Metadata states
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    JudulDokumen: '',
    Kategori: 'Laporan Pendapatan',
    Deskripsi: '',
    TipeFile: 'Excel (.XLSX)',
    Status: 'Siap Digunakan'
  });

  // Upload Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);       // Objek File asli
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const dbRef = ref(db, 'MasterPrint');
      const snapshot = await get(dbRef);

      if (snapshot.exists()) {
        const dataObj = snapshot.val();
        const arr = Object.keys(dataObj).map(id => ({ id, ...dataObj[id] }));
        setTemplates(arr);
      } else {
        setTemplates([]);
      }
    } catch (err) {
      console.error('Fetch MasterPrint error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      JudulDokumen: '',
      Kategori: 'Laporan Pendapatan',
      Deskripsi: '',
      TipeFile: 'Excel (.XLSX)',
      Status: 'Siap Digunakan'
    });
    setShowFormModal(true);
  };

  const handleOpenEditMetadata = (tpl) => {
    setIsEditing(true);
    setEditId(tpl.id);
    setFormData({
      JudulDokumen: tpl.JudulDokumen || '',
      Kategori: tpl.Kategori || 'Laporan Pendapatan',
      Deskripsi: tpl.Deskripsi || '',
      TipeFile: tpl.TipeFile || 'Excel (.XLSX)',
      Status: tpl.Status || 'Siap Digunakan'
    });
    setShowFormModal(true);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!formData.JudulDokumen) return;

    try {
      if (isEditing && editId) {
        const itemRef = ref(db, `MasterPrint/${editId}`);
        const existing = templates.find(t => t.id === editId) || {};
        await set(itemRef, {
          ...existing,
          ...formData,
          TemplateID: editId,
          TanggalUpdated: new Date().toISOString()
        });
        showSuccessToast('Berhasil', 'Detail master template berhasil diperbarui!');
      } else {
        const newRef = push(ref(db, 'MasterPrint'));
        const item = {
          TemplateID: newRef.key,
          ...formData,
          TanggalCreated: new Date().toISOString()
        };
        await set(newRef, item);
        showSuccessToast('Berhasil', 'Master template baru berhasil ditambahkan!');
      }
      setShowFormModal(false);
      fetchTemplates();
    } catch (err) {
      showErrorToast('Gagal Simpan', err.message);
    }
  };

  const handleDelete = async (id, judul) => {
    if (!window.confirm(`Yakin ingin menghapus master template "${judul}"?`)) return;
    try {
      // Hapus file dari Supabase Storage juga
      await deleteTemplateFile(id);
      await remove(ref(db, `MasterPrint/${id}`));
      showSuccessToast('Terhapus', `Master template "${judul}" berhasil dihapus.`);
      fetchTemplates();
    } catch (err) {
      showErrorToast('Gagal Hapus', err.message);
    }
  };

  const handleOpenUploadModal = (tpl) => {
    setSelectedTemplate(tpl);
    setUploadedFile(null);
    setUploadedFileName(tpl.NamaFileTemplate || '');
    setShowUploadModal(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadedFileName(file.name);
  };

  const handleProcessUpload = async (e) => {
    e.preventDefault();
    if (!uploadedFileName || !selectedTemplate) return;

    setUploading(true);
    try {
      let fileUrl = selectedTemplate.FileURL || '';

      // Jika ada file baru dipilih, upload ke Supabase
      if (uploadedFile) {
        if (!isSupabaseConfigured()) {
          showWarningToast('Supabase Belum Siap', 'Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env');
          setUploading(false);
          return;
        }
        const result = await uploadTemplateFile(uploadedFile, selectedTemplate.id);
        if (!result.success) throw new Error(result.error);
        fileUrl = result.url;
      }

      // Simpan URL (bukan Base64) ke Firebase RTDB
      const itemRef = ref(db, `MasterPrint/${selectedTemplate.id}`);
      await set(itemRef, {
        ...selectedTemplate,
        NamaFileTemplate: uploadedFileName,
        FileURL: fileUrl,
        FileContentBase64: '',  // Kosongkan Base64 lama
        Status: 'Siap Digunakan',
        TanggalUpload: new Date().toISOString()
      });

      showSuccessToast('Upload Berhasil', `File template "${uploadedFileName}" berhasil disimpan ke Supabase Storage!`);
      setShowUploadModal(false);
      fetchTemplates();
    } catch (err) {
      showErrorToast('Gagal Upload', err.message);
    }
    setUploading(false);
  };

  return (
    <div>
      {/* Top Blue Hero Card Header matching screenshot */}
      <div
        className="card rounded-4 border-0 mb-4 shadow-sm text-white"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <div className="card-body p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="d-flex align-items-center">
            <div
              className="d-flex align-items-center justify-content-center bg-white rounded-3 shadow-sm me-3"
              style={{ width: '52px', height: '52px', color: '#18985c' }}
            >
              <i className="fa-solid fa-print fs-3"></i>
            </div>
            <div>
              <h4 className="fw-bold m-0 text-white">Master Template Dokumen</h4>
              <p className="m-0 text-white text-opacity-75 small">
                Kelola template master dokumen untuk mencetak rekapitulasi data
              </p>
            </div>
          </div>
          <button
            className="btn btn-outline-light rounded-pill px-4 fw-semibold border-2 d-flex align-items-center gap-2"
            onClick={handleOpenAddModal}
          >
            <i className="fa-solid fa-circle-plus"></i> Tambah Master
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`alert alert-${statusMsg.type} p-3 rounded-3 mb-4 d-flex justify-content-between align-items-center shadow-sm`}>
          <div><i className="fa-solid fa-circle-check me-2"></i>{statusMsg.text}</div>
          <button className="btn-close" onClick={() => setStatusMsg(null)}></button>
        </div>
      )}

      {/* Main Master Templates Table matching screenshot */}
      <div className="card rounded-4 border-0 shadow-sm overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 text-nowrap">
            <thead className="table-light border-bottom">
              <tr>
                <th className="ps-4 py-3 text-uppercase small fw-bold text-muted" style={{ width: '45%' }}>
                  JUDUL DOKUMEN
                </th>
                <th className="py-3 text-uppercase small fw-bold text-muted">TIPE FILE</th>
                <th className="py-3 text-uppercase small fw-bold text-muted">STATUS</th>
                <th className="pe-4 py-3 text-uppercase small fw-bold text-muted text-center" style={{ width: '130px' }}>
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                    Memuat data master template...
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-5 text-muted">
                    Belum ada master template dokumen. Klik tombol <strong>+ Tambah Master</strong> di atas untuk membuat.
                  </td>
                </tr>
              ) : (
                templates.map((tpl) => (
                  <tr key={tpl.id}>
                    <td className="ps-4 py-3">
                      <div className="fw-bold text-dark fs-6 mb-0">{tpl.JudulDokumen}</div>
                      <small className="text-muted">{tpl.Kategori || tpl.Deskripsi || 'Lainnya'}</small>
                      {tpl.NamaFileTemplate && (
                        <div className="small text-primary fw-semibold mt-1">
                          <i className="fa-solid fa-paperclip me-1"></i> {tpl.NamaFileTemplate}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="text-success fw-bold small d-inline-flex align-items-center gap-1">
                        <i className="fa-solid fa-file-excel me-1"></i> {tpl.TipeFile || 'Excel (.XLSX)'}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 fw-normal d-inline-flex align-items-center gap-1">
                        <i className="fa-solid fa-check small"></i> {tpl.Status || 'Siap Digunakan'}
                      </span>
                    </td>
                    <td className="pe-4 text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          className="btn btn-sm btn-light text-primary rounded-3 shadow-xs border"
                          onClick={() => handleOpenEditMetadata(tpl)}
                          title="Edit Detail Master Template"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-light text-info rounded-3 shadow-xs border"
                          onClick={() => handleOpenUploadModal(tpl)}
                          title="Upload File Template Excel (.xlsx)"
                        >
                          <i className="fa-solid fa-cloud-arrow-up"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-light text-danger rounded-3 shadow-xs border"
                          onClick={() => handleDelete(tpl.id, tpl.JudulDokumen)}
                          title="Hapus Master"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Add / Edit Metadata */}
      {showFormModal && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">
                  {isEditing ? 'Edit Detail Master Template' : 'Tambah Master Template Baru'}
                </h5>
                <button className="btn-close" onClick={() => setShowFormModal(false)}></button>
              </div>
              <form onSubmit={handleSaveForm}>
                <div className="modal-body py-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Judul Dokumen</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: MASTER LAPORAN PENDAPATAN"
                      value={formData.JudulDokumen}
                      onChange={(e) => setFormData({ ...formData, JudulDokumen: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Kategori Dokumen</label>
                    <select
                      className="form-select"
                      value={formData.Kategori}
                      onChange={(e) => setFormData({ ...formData, Kategori: e.target.value })}
                    >
                      <option value="Laporan Pendapatan">Laporan Pendapatan</option>
                      <option value="Data Kesakitan">Data Kesakitan</option>
                      <option value="LPLPO">LPLPO</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Deskripsi Singkat</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: Template rekapitulasi data pendapatan kasir"
                      value={formData.Deskripsi}
                      onChange={(e) => setFormData({ ...formData, Deskripsi: e.target.value })}
                    />
                  </div>
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted">Tipe File</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={formData.TipeFile}
                        readOnly
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted">Status</label>
                      <select
                        className="form-select"
                        value={formData.Status}
                        onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
                      >
                        <option value="Siap Digunakan">Siap Digunakan</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowFormModal(false)}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4">
                    Simpan Master
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload File Template */}
      {showUploadModal && selectedTemplate && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">
                  Upload Template Excel untuk {selectedTemplate.JudulDokumen}
                </h5>
                <button className="btn-close" onClick={() => setShowUploadModal(false)}></button>
              </div>
              <form onSubmit={handleProcessUpload}>
                <div className="modal-body py-4">
                  <p className="text-muted small mb-3">
                    Upload file master Excel (.xlsx) dari komputer. File akan disimpan di <strong>Supabase Storage</strong>.
                  </p>

                  {/* Info status Supabase */}
                  {!isSupabaseConfigured() && (
                    <div className="alert alert-warning py-2 small mb-3">
                      <i className="fa-solid fa-triangle-exclamation me-2"></i>
                      Supabase belum dikonfigurasi. Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di file <code>.env</code>.
                    </div>
                  )}

                  {/* File yang sudah ada sebelumnya */}
                  {selectedTemplate.FileURL && !uploadedFile && (
                    <div className="alert alert-info py-2 small mb-3">
                      <i className="fa-solid fa-circle-info me-2"></i>
                      File aktif: <strong>{selectedTemplate.NamaFileTemplate}</strong>.
                      Pilih file baru di bawah untuk menggantinya.
                    </div>
                  )}

                  <div className="border border-dashed rounded-3 p-4 text-center bg-light">
                    <i className={`fa-solid fa-file-excel fa-3x mb-2 ${uploadedFile ? 'text-success' : 'text-secondary'}`}></i>
                    <div className="fw-semibold text-dark mb-1">
                      {uploadedFile ? uploadedFile.name : (selectedTemplate.NamaFileTemplate || 'Pilih File Template .xlsx')}
                    </div>
                    {uploadedFile && (
                      <div className="text-muted small">{(uploadedFile.size / 1024).toFixed(1)} KB</div>
                    )}
                    <input
                      type="file"
                      id="uploadTemplateInput"
                      accept=".xlsx, .xls"
                      className="d-none"
                      onChange={handleFileSelect}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary rounded-pill px-3 mt-2"
                      onClick={() => document.getElementById('uploadTemplateInput').click()}
                    >
                      <i className="fa-solid fa-folder-open me-1"></i> Pilih File
                    </button>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowUploadModal(false)} disabled={uploading}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={!uploadedFileName || uploading}>
                    {uploading ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Mengupload...</>
                    ) : (
                      <><i className="fa-solid fa-cloud-arrow-up me-2"></i>Upload ke Supabase</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
