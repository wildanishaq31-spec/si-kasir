import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ref, get, set } from 'firebase/database';
import { db, getFirebaseDataAsArray, deleteFirebaseItem } from '../services/firebase';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { parseIdList } from '../utils/labHelper';

export default function MasterWaBlast() {
  const [activeTab, setActiveTab] = useState('template'); // 'template', 'helper', or 'helperLab'

  // --- TEMPLATE WA STATES ---
  const [template, setTemplate] = useState('');
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // --- HELPER WA (SINGKATAN TINDAKAN) STATES ---
  const [helperList, setHelperList] = useState([]);
  const [loadingHelper, setLoadingHelper] = useState(true);
  const [showHelperModal, setShowHelperModal] = useState(false);
  const [helperForm, setHelperForm] = useState({ id: '', jenisTindakan: '', singkatan: '', isEdit: false });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- HELPER KONVERSI LAB STATES ---
  const [helperLabList, setHelperLabList] = useState([]);
  const [loadingHelperLab, setLoadingHelperLab] = useState(true);
  const [showHelperLabModal, setShowHelperLabModal] = useState(false);
  const [helperLabForm, setHelperLabForm] = useState({
    id: '',
    namaPaket: '',
    tipe: 'Paket', // 'Paket' or 'Standalone'
    labIds: '',
    labNames: '',
    deskripsi: '',
    isEdit: false
  });

  const [currentPageLab, setCurrentPageLab] = useState(1);
  const [itemsPerPageLab, setItemsPerPageLab] = useState(10);

  useEffect(() => {
    loadTemplate();
    loadHelperList();
    loadHelperLabList();
  }, []);

  // ================= TEMPLATE LOGIC =================
  const loadTemplate = async () => {
    setLoadingTemplate(true);
    try {
      const templateRef = ref(db, 'Settings/WaBlastTemplate');
      const snapshot = await get(templateRef);
      if (snapshot.exists() && snapshot.val().text) {
        setTemplate(snapshot.val().text || '');
      } else {
        setTemplate('📢 PENGUMUMAN\n\nBerikut daftar pasien/pendapatan:\n\n[DAFTAR_NAMA]\n\nTerima kasih.');
      }
    } catch (err) {
      console.error('Error loading WA template:', err);
    }
    setLoadingTemplate(false);
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const templateRef = ref(db, 'Settings/WaBlastTemplate');
      await set(templateRef, { text: template });
      showSuccessToast('Berhasil', 'Template WA Blast berhasil disimpan!');
    } catch (err) {
      console.error('Error saving WA template:', err);
      showErrorToast('Gagal', 'Gagal menyimpan template: ' + err.message);
    }
    setSavingTemplate(false);
  };

  // ================= HELPER SINGKATAN TINDAKAN LOGIC =================
  const loadHelperList = async () => {
    setLoadingHelper(true);
    const data = await getFirebaseDataAsArray('Settings/HelperWaBlast');
    setHelperList(data);
    setLoadingHelper(false);
  };

  const handleOpenAddHelper = () => {
    setHelperForm({ id: '', jenisTindakan: '', singkatan: '', isEdit: false });
    setShowHelperModal(true);
  };

  const handleOpenEditHelper = (item) => {
    setHelperForm({ 
      id: item._id, 
      jenisTindakan: item.jenisTindakan || '', 
      singkatan: item.singkatan || '', 
      isEdit: true 
    });
    setShowHelperModal(true);
  };

  const handleDeleteHelper = async (id) => {
    if (!window.confirm('Hapus singkatan tindakan ini?')) return;
    const res = await deleteFirebaseItem('Settings/HelperWaBlast', id);
    if (res.success) {
      showSuccessToast('Terhapus', 'Singkatan tindakan telah dihapus.');
      loadHelperList();
    } else {
      showErrorToast('Gagal', res.message);
    }
  };

  const handleSubmitHelper = async (e) => {
    e.preventDefault();
    try {
      const id = (helperForm.isEdit && helperForm.id) ? helperForm.id : `HELP-${Date.now()}`;
      const itemRef = ref(db, `Settings/HelperWaBlast/${id}`);
      await set(itemRef, {
        _id: id,
        jenisTindakan: helperForm.jenisTindakan,
        singkatan: helperForm.singkatan
      });
      showSuccessToast('Berhasil', helperForm.isEdit ? 'Singkatan berhasil diperbarui!' : 'Singkatan baru berhasil ditambahkan!');
      setShowHelperModal(false);
      loadHelperList();
    } catch (err) {
      showErrorToast('Gagal', err.message);
    }
  };

  // ================= HELPER KONVERSI ID LAB LOGIC =================
  const loadHelperLabList = async () => {
    setLoadingHelperLab(true);
    const data = await getFirebaseDataAsArray('Settings/HelperLabPaket');
    setHelperLabList(data);
    setLoadingHelperLab(false);
  };

  const handleOpenAddHelperLab = () => {
    setHelperLabForm({
      id: '',
      namaPaket: '',
      tipe: 'Paket',
      labIds: '',
      labNames: '',
      deskripsi: '',
      isEdit: false
    });
    setShowHelperLabModal(true);
  };

  const handleOpenEditHelperLab = (item) => {
    const idsStr = Array.isArray(item.labIds) ? item.labIds.join(', ') : (item.labIds || '');
    const namesStr = Array.isArray(item.labNames) ? item.labNames.join(', ') : (item.labNames || '');
    setHelperLabForm({
      id: item._id,
      namaPaket: item.namaPaket || '',
      tipe: item.tipe || 'Paket',
      labIds: idsStr,
      labNames: namesStr,
      deskripsi: item.deskripsi || '',
      isEdit: true
    });
    setShowHelperLabModal(true);
  };

  const handleDeleteHelperLab = async (id) => {
    if (!window.confirm('Hapus paket konversi laboratorium ini?')) return;
    const res = await deleteFirebaseItem('Settings/HelperLabPaket', id);
    if (res.success) {
      showSuccessToast('Terhapus', 'Paket konversi laboratorium telah dihapus.');
      loadHelperLabList();
    } else {
      showErrorToast('Gagal', res.message);
    }
  };

  const handleSubmitHelperLab = async (e) => {
    e.preventDefault();
    try {
      const id = (helperLabForm.isEdit && helperLabForm.id) ? helperLabForm.id : `LABPAKET-${Date.now()}`;
      const itemRef = ref(db, `Settings/HelperLabPaket/${id}`);

      const cleanedIds = parseIdList(helperLabForm.labIds);
      const cleanedNames = parseIdList(helperLabForm.labNames);

      await set(itemRef, {
        _id: id,
        namaPaket: helperLabForm.namaPaket.trim(),
        tipe: helperLabForm.tipe,
        labIds: cleanedIds,
        labNames: cleanedNames,
        deskripsi: helperLabForm.deskripsi.trim()
      });

      showSuccessToast(
        'Berhasil',
        helperLabForm.isEdit ? 'Paket laboratorium berhasil diperbarui!' : 'Paket laboratorium baru berhasil ditambahkan!'
      );
      setShowHelperLabModal(false);
      loadHelperLabList();
    } catch (err) {
      showErrorToast('Gagal', err.message);
    }
  };

  // Pagination Logic - Helper Action
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = helperList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(helperList.length / itemsPerPage);

  // Pagination Logic - Helper Lab
  const indexOfLastItemLab = currentPageLab * itemsPerPageLab;
  const indexOfFirstItemLab = indexOfLastItemLab - itemsPerPageLab;
  const currentItemsLab = helperLabList.slice(indexOfFirstItemLab, indexOfLastItemLab);
  const totalPagesLab = Math.ceil(helperLabList.length / itemsPerPageLab);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#2c3e50' }}>Pengaturan & Helper Sistem</h4>
          <p className="text-secondary mb-0">Atur template WA Blast, singkatan jenis tindakan, dan konversi ID Laboratorium.</p>
        </div>
      </div>

      {/* TABS HEADER */}
      <ul className="nav nav-pills mb-4 border-bottom pb-3">
        <li className="nav-item">
          <button 
            className={`nav-link fw-bold px-4 rounded-pill me-2 ${activeTab === 'template' ? 'active shadow-sm' : 'text-secondary bg-light'}`}
            onClick={() => setActiveTab('template')}
            style={activeTab === 'template' ? { background: '#00b09b', color: 'white' } : {}}
          >
            <i className="fa-solid fa-file-lines me-2"></i> Template WA Blast
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-bold px-4 rounded-pill me-2 ${activeTab === 'helper' ? 'active shadow-sm' : 'text-secondary bg-light'}`}
            onClick={() => setActiveTab('helper')}
            style={activeTab === 'helper' ? { background: '#00b09b', color: 'white' } : {}}
          >
            <i className="fa-solid fa-wand-magic-sparkles me-2"></i> Helper Singkatan Tindakan
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-bold px-4 rounded-pill ${activeTab === 'helperLab' ? 'active shadow-sm' : 'text-secondary bg-light'}`}
            onClick={() => setActiveTab('helperLab')}
            style={activeTab === 'helperLab' ? { background: '#00b09b', color: 'white' } : {}}
          >
            <i className="fa-solid fa-flask-vial me-2"></i> Helper Konversi ID Laboratorium
          </button>
        </li>
      </ul>

      {/* TAB CONTENT: TEMPLATE */}
      {activeTab === 'template' && (
        <div className="card shadow-sm border-0" style={{ borderRadius: '15px', animation: 'fadeIn 0.3s' }}>
          <div className="card-body p-4">
            <h5 className="fw-bold mb-3 d-flex align-items-center" style={{ color: '#00b09b' }}>
              <i className="fa-brands fa-whatsapp me-2 fs-4"></i> Template Teks WA
            </h5>
            
            <div className="alert alert-info border-0 bg-opacity-10 bg-info mb-4" style={{ borderRadius: '10px' }}>
              <i className="fa-solid fa-circle-info me-2"></i>
              Gunakan parameter <strong>[DAFTAR_NAMA]</strong> untuk menampilkan daftar pasien, <strong>[TANGGAL]</strong> untuk tanggal laporan, dan <strong>[TOTAL]</strong> untuk total pendapatan.
            </div>

            {loadingTemplate ? (
              <div className="text-center py-4">
                <div className="spinner-border text-success" role="status"></div>
                <div className="mt-2 text-secondary">Memuat template...</div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <textarea
                    className="form-control bg-light"
                    rows="12"
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    style={{ borderRadius: '10px', resize: 'vertical' }}
                    placeholder="Ketikkan template pesan WhatsApp di sini..."
                  ></textarea>
                </div>

                <button 
                  className="btn w-100 fw-bold shadow-sm" 
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate}
                  style={{ 
                    background: 'linear-gradient(135deg, #11998e, #38ef7d)', 
                    color: 'white', 
                    borderRadius: '10px',
                    padding: '12px'
                  }}
                >
                  {savingTemplate ? (
                    <><i className="fa-solid fa-spinner fa-spin me-2"></i>Menyimpan...</>
                  ) : (
                    <><i className="fa-solid fa-floppy-disk me-2"></i>Simpan Template WA</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: HELPER WA */}
      {activeTab === 'helper' && (
        <div className="card shadow-sm border-0" style={{ borderRadius: '15px', animation: 'fadeIn 0.3s' }}>
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0 d-flex align-items-center" style={{ color: '#00b09b' }}>
                <i className="fa-solid fa-list me-2 fs-4"></i> Daftar Singkatan Tindakan
              </h5>
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center">
                  <span className="text-secondary small me-2 fw-semibold">Tampilkan:</span>
                  <select 
                    className="form-select form-select-sm rounded-pill px-3 shadow-sm" 
                    style={{ width: '80px' }}
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <button className="btn btn-primary rounded-pill shadow-sm px-4 fw-bold" onClick={handleOpenAddHelper}>
                  <i className="fa-solid fa-plus me-1"></i> Tambah Singkatan
                </button>
              </div>
            </div>

            <div className="alert alert-warning border-0 bg-opacity-10 bg-warning mb-4" style={{ borderRadius: '10px' }}>
              <i className="fa-solid fa-circle-info me-2"></i>
              Data di sini digunakan untuk mengubah nama <strong>Jenis Tindakan</strong> yang panjang menjadi teks yang disingkat pada saat melakukan pratinjau pesan WA Blast.
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4" style={{ width: '60px' }}>No</th>
                    <th>Teks Asli (Jenis Tindakan)</th>
                    <th style={{ width: '250px' }}>Teks Singkatan</th>
                    <th className="text-center pe-4" style={{ width: '120px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHelper ? (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm me-2"></div>Memuat data...
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-muted">Belum ada data singkatan.</td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={item._id || idx}>
                        <td className="ps-4 fw-semibold text-muted">{indexOfFirstItem + idx + 1}</td>
                        <td className="fw-medium">
                           <span className="badge bg-light text-dark border p-2 text-wrap text-start" style={{ lineHeight: '1.4' }}>
                             {item.jenisTindakan}
                           </span>
                        </td>
                        <td>
                           <span className="badge bg-primary bg-opacity-10 text-primary border border-primary px-3 py-2">
                             {item.singkatan}
                           </span>
                        </td>
                        <td className="text-center pe-4">
                          <button className="btn btn-sm btn-light border-0 me-2" onClick={() => handleOpenEditHelper(item)} title="Edit">
                            <i className="fa-solid fa-pen text-secondary"></i>
                          </button>
                          <button className="btn btn-sm btn-light border-0" onClick={() => handleDeleteHelper(item._id)} title="Hapus">
                            <i className="fa-solid fa-trash text-danger"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            {!loadingHelper && helperList.length > 0 && (
              <div className="d-flex justify-content-between align-items-center mt-4">
                <div className="small text-muted fw-semibold">
                  Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, helperList.length)} dari total {helperList.length} data
                </div>
                <nav>
                  <ul className="pagination pagination-sm mb-0 shadow-sm rounded-pill overflow-hidden">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link px-3" onClick={() => setCurrentPage(currentPage - 1)}>
                        <i className="fa-solid fa-chevron-left"></i>
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                        <button className="page-link fw-bold px-3" onClick={() => setCurrentPage(i + 1)}>
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link px-3" onClick={() => setCurrentPage(currentPage + 1)}>
                        <i className="fa-solid fa-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: HELPER KONVERSI LAB */}
      {activeTab === 'helperLab' && (
        <div className="card shadow-sm border-0" style={{ borderRadius: '15px', animation: 'fadeIn 0.3s' }}>
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0 d-flex align-items-center" style={{ color: '#00b09b' }}>
                <i className="fa-solid fa-flask-vial me-2 fs-4"></i> Aturan Konversi Paket Laboratorium
              </h5>
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center">
                  <span className="text-secondary small me-2 fw-semibold">Tampilkan:</span>
                  <select 
                    className="form-select form-select-sm rounded-pill px-3 shadow-sm" 
                    style={{ width: '80px' }}
                    value={itemsPerPageLab}
                    onChange={(e) => { setItemsPerPageLab(Number(e.target.value)); setCurrentPageLab(1); }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <button className="btn btn-success rounded-pill shadow-sm px-4 fw-bold" onClick={handleOpenAddHelperLab}>
                  <i className="fa-solid fa-plus me-1"></i> Tambah Paket Lab
                </button>
              </div>
            </div>

            <div className="alert alert-success border-0 bg-opacity-10 bg-success mb-4" style={{ borderRadius: '10px' }}>
              <i className="fa-solid fa-circle-info me-2"></i>
              Helper ini otomatis meringkas <strong>Laboratorium ID / Item Pemeriksaan</strong> dari file RME menjadi <strong>Paket Laboratorium</strong> (seperti <strong>DL</strong>, <strong>UL</strong>, atau item Standalone) di menu Transaksi, Laporan Pendapatan, dan WA Blast.
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4" style={{ width: '60px' }}>No</th>
                    <th style={{ width: '180px' }}>Nama Paket</th>
                    <th style={{ width: '120px' }}>Tipe</th>
                    <th>Daftar Laboratorium ID / Match</th>
                    <th>Deskripsi</th>
                    <th className="text-center pe-4" style={{ width: '120px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHelperLab ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm me-2"></div>Memuat aturan konversi lab...
                      </td>
                    </tr>
                  ) : currentItemsLab.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">Belum ada aturan konversi paket laboratorium.</td>
                    </tr>
                  ) : (
                    currentItemsLab.map((item, idx) => {
                      const ids = Array.isArray(item.labIds) ? item.labIds : parseIdList(item.labIds);
                      return (
                        <tr key={item._id || idx}>
                          <td className="ps-4 fw-semibold text-muted">{indexOfFirstItemLab + idx + 1}</td>
                          <td>
                            <span className="badge bg-success bg-opacity-10 text-success border border-success px-3 py-2 fs-6">
                              {item.namaPaket}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${item.tipe === 'Standalone' ? 'bg-secondary' : 'bg-info text-dark'}`}>
                              {item.tipe || 'Paket'}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '350px' }}>
                              {ids.length > 0 ? (
                                ids.map((idVal, i) => (
                                  <span key={i} className="badge bg-light text-dark border font-monospace">
                                    {idVal}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted small italic">(Tidak ada ID khusus)</span>
                              )}
                            </div>
                          </td>
                          <td className="small text-muted">{item.deskripsi || '-'}</td>
                          <td className="text-center pe-4">
                            <button className="btn btn-sm btn-light border-0 me-2" onClick={() => handleOpenEditHelperLab(item)} title="Edit">
                              <i className="fa-solid fa-pen text-secondary"></i>
                            </button>
                            <button className="btn btn-sm btn-light border-0" onClick={() => handleDeleteHelperLab(item._id)} title="Hapus">
                              <i className="fa-solid fa-trash text-danger"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS LAB */}
            {!loadingHelperLab && helperLabList.length > 0 && (
              <div className="d-flex justify-content-between align-items-center mt-4">
                <div className="small text-muted fw-semibold">
                  Menampilkan {indexOfFirstItemLab + 1} - {Math.min(indexOfLastItemLab, helperLabList.length)} dari total {helperLabList.length} data
                </div>
                <nav>
                  <ul className="pagination pagination-sm mb-0 shadow-sm rounded-pill overflow-hidden">
                    <li className={`page-item ${currentPageLab === 1 ? 'disabled' : ''}`}>
                      <button className="page-link px-3" onClick={() => setCurrentPageLab(currentPageLab - 1)}>
                        <i className="fa-solid fa-chevron-left"></i>
                      </button>
                    </li>
                    {Array.from({ length: totalPagesLab }, (_, i) => (
                      <li key={i + 1} className={`page-item ${currentPageLab === i + 1 ? 'active' : ''}`}>
                        <button className="page-link fw-bold px-3" onClick={() => setCurrentPageLab(i + 1)}>
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPageLab === totalPagesLab ? 'disabled' : ''}`}>
                      <button className="page-link px-3" onClick={() => setCurrentPageLab(currentPageLab + 1)}>
                        <i className="fa-solid fa-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL FORM HELPER SINGKATAN TINDAKAN */}
      {showHelperModal && createPortal(
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
                <h5 className="modal-title fw-bold text-dark">
                  {helperForm.isEdit ? 'Edit Singkatan Tindakan' : 'Tambah Singkatan Baru'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowHelperModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleSubmitHelper}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Teks Asli (Jenis Tindakan) *</label>
                    <textarea
                      className="form-control bg-light border-0"
                      rows="3"
                      value={helperForm.jenisTindakan}
                      onChange={(e) => setHelperForm({ ...helperForm, jenisTindakan: e.target.value })}
                      required
                      placeholder="Contoh: PEMERIKSAAN UMUM/ GIGI/ KIA ( RAWAT JALAN )"
                    ></textarea>
                    <small className="text-secondary mt-1 d-block">Ketik persis seperti yang tampil di Laporan Pendapatan.</small>
                  </div>
                  <div className="mb-4">
                    <label className="form-label small fw-semibold text-muted">Singkatan *</label>
                    <input
                      type="text"
                      className="form-control form-control-lg bg-light border-0"
                      value={helperForm.singkatan}
                      onChange={(e) => setHelperForm({ ...helperForm, singkatan: e.target.value })}
                      required
                      placeholder="Contoh: Ret"
                    />
                  </div>
                  <div className="d-flex gap-2 justify-content-end">
                    <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowHelperModal(false)}>
                      Batal
                    </button>
                    <button type="submit" className="btn btn-primary rounded-pill px-4 shadow-sm">
                      <i className="fa-solid fa-save me-1"></i> Simpan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL FORM HELPER KONVERSI LAB */}
      {showHelperLabModal && createPortal(
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center">
                  <i className="fa-solid fa-flask-vial text-success me-2"></i>
                  {helperLabForm.isEdit ? 'Edit Paket Laboratorium' : 'Tambah Paket Laboratorium Baru'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowHelperLabModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleSubmitHelperLab}>
                  <div className="row g-3 mb-3">
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold text-muted">Nama Paket Laboratorium *</label>
                      <input
                        type="text"
                        className="form-control form-control-lg bg-light border-0 fw-bold text-success"
                        value={helperLabForm.namaPaket}
                        onChange={(e) => setHelperLabForm({ ...helperLabForm, namaPaket: e.target.value })}
                        required
                        placeholder="Contoh: DL, UL, HbA1c"
                      />
                      <small className="text-muted">Nama ringkas yang akan tampil di Transaksi & WA Blast.</small>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Tipe Pemeriksaan *</label>
                      <select
                        className="form-select form-select-lg bg-light border-0 fw-semibold"
                        value={helperLabForm.tipe}
                        onChange={(e) => setHelperLabForm({ ...helperLabForm, tipe: e.target.value })}
                      >
                        <option value="Paket">Paket (Multi-Item)</option>
                        <option value="Standalone">Standalone (Sendiri)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Daftar Laboratorium ID *</label>
                    <textarea
                      className="form-control bg-light border-0 font-monospace"
                      rows="3"
                      value={helperLabForm.labIds}
                      onChange={(e) => setHelperLabForm({ ...helperLabForm, labIds: e.target.value })}
                      placeholder="Masukkan Laboratorium ID, pisahkan dengan koma atau baris baru. Contoh: BPJS006, BPJS007, BPJS008, BPJS009, BPJS010, BPJS011, 20250066, 20260053"
                    ></textarea>
                    <small className="text-secondary mt-1 d-block">
                      <i className="fa-solid fa-circle-info me-1"></i>
                      Setiap ID di atas yang terbaca pada hasil export e-Puskesmas akan dikelompokkan ke dalam paket <strong>{helperLabForm.namaPaket || 'ini'}</strong>.
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Daftar Nama Item Pemeriksaan Lab (Opsional Fallback)</label>
                    <textarea
                      className="form-control bg-light border-0"
                      rows="2"
                      value={helperLabForm.labNames}
                      onChange={(e) => setHelperLabForm({ ...helperLabForm, labNames: e.target.value })}
                      placeholder="Contoh: HEMATOLOGI, HEMOGLOBIN, LEUKOSIT, TROMBOSIT"
                    ></textarea>
                    <small className="text-muted">Gunakan jika file Excel tidak memiliki kolom ID tetapi memiliki nama item lab.</small>
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-semibold text-muted">Deskripsi / Catatan Rincian (Opsional)</label>
                    <input
                      type="text"
                      className="form-control bg-light border-0"
                      value={helperLabForm.deskripsi}
                      onChange={(e) => setHelperLabForm({ ...helperLabForm, deskripsi: e.target.value })}
                      placeholder="Contoh: Hitung sel darah, Hemoglobin, Leukosit, Trombosit, Hematokrit, Eritrosit, LED"
                    />
                  </div>

                  <div className="d-flex gap-2 justify-content-end">
                    <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowHelperLabModal(false)}>
                      Batal
                    </button>
                    <button type="submit" className="btn btn-success rounded-pill px-4 shadow-sm fw-bold">
                      <i className="fa-solid fa-save me-1"></i> Simpan Paket
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ADD CSS ANIMATION FOR TABS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
