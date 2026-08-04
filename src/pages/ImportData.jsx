import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveImportPayload, logAudit, parseTanggalExcel, formatDisplayDate } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { showSuccessToast, showErrorToast, showWarningToast } from '../utils/toast';

export default function ImportData() {
  const [parsedData, setParsedData] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileSummaries, setFileSummaries] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [importType, setImportType] = useState('Tindakan'); // 'Tindakan' or 'Laboratorium'

  const { user } = useAuth();

  // Parsing 1 File ke Array Visit Record
  const parseSingleFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const wsname = workbook.SheetNames[0];
          const ws = workbook.Sheets[wsname];
          const rows2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

          if (!rows2D || rows2D.length === 0) {
            resolve({ fileName: file.name, visits: [], error: 'File kosong atau tidak dapat dibaca' });
            return;
          }

          // Scan header row
          let startRowIdx = -1;
          for (let i = 0; i < rows2D.length; i++) {
            const rowStr = rows2D[i].map(c => String(c).toUpperCase()).join(' ');
            if (
              rowStr.includes('NAMA PASIEN') ||
              (rowStr.includes('TANGGAL') && rowStr.includes('WAKTU')) ||
              (rowStr.includes('JENIS KELAMIN') && rowStr.includes('ALAMAT'))
            ) {
              startRowIdx = i;
              break;
            }
          }

          if (startRowIdx === -1) {
            resolve({ fileName: file.name, visits: [], error: 'Header tabel (NAMA PASIEN/WAKTU) tidak ditemukan' });
            return;
          }

          const rowA = rows2D[startRowIdx] || [];
          const rowB = rows2D[startRowIdx + 1] || [];
          const maxCols = Math.max(rowA.length, rowB.length);

          let dataStartRowIdx = startRowIdx + 1;
          const rowBStr = rowB.map(c => String(c).toUpperCase()).join(' ');
          if (
            rowBStr.includes('TINDAKAN') ||
            rowBStr.includes('TARIF') ||
            rowBStr.includes('STATUS') ||
            rowBStr.includes('JUMLAH BIAYA') ||
            rowBStr.includes('JASA')
          ) {
            dataStartRowIdx = startRowIdx + 2;
          }

          const combinedHeader = [];
          for (let c = 0; c < maxCols; c++) {
            const valA = String(rowA[c] || '').trim();
            const valB = dataStartRowIdx === startRowIdx + 2 ? String(rowB[c] || '').trim() : '';
            const combined = (valA + ' ' + valB).trim();
            combinedHeader.push(combined);
          }

          const patientVisitsMap = new Map();
          let currentVisitKey = null;

          for (let i = dataStartRowIdx; i < rows2D.length; i++) {
            const r = rows2D[i];
            const rowObj = {};

            combinedHeader.forEach((colName, cIdx) => {
              if (colName) {
                rowObj[colName] = r[cIdx] !== undefined ? String(r[cIdx]).trim() : '';
              }
            });

            const getVal = (...keys) => {
              // 1. Prioritaskan Exact Match (Misal "LABORATORIUM" presisi, bukan "LABORATORIUM ID")
              for (const k of keys) {
                const exactKey = Object.keys(rowObj).find(x => x.trim().toUpperCase() === k.toUpperCase());
                if (exactKey && rowObj[exactKey] !== undefined && rowObj[exactKey] !== null) {
                  const val = String(rowObj[exactKey]).trim();
                  if (val && val !== '-') return val;
                }
              }
              // 2. Partial Match Fallback (Abaikan kolom bernakhiran "ID" atau "CODE" jika tidak diminta)
              for (const k of keys) {
                const matchedKey = Object.keys(rowObj).find(x => {
                  const upperKey = x.toUpperCase().trim();
                  const targetKey = k.toUpperCase().trim();
                  if (!targetKey.includes('ID') && upperKey.endsWith(' ID')) return false;
                  if (!targetKey.includes('CODE') && upperKey.endsWith(' CODE')) return false;
                  return upperKey.includes(targetKey);
                });
                if (matchedKey && rowObj[matchedKey] !== undefined && rowObj[matchedKey] !== null) {
                  const val = String(rowObj[matchedKey]).trim();
                  if (val && val !== '-') return val;
                }
              }
              return '';
            };

            const fullRowStr = Object.values(rowObj).join(' ').toLowerCase();
            if (fullRowStr.includes('total keseluruhan') || fullRowStr.includes('total biaya')) {
              break;
            }

            const nama = getVal('NAMA PASIEN', 'PASIEN');
            const rawTindakan = getVal('LABORATORIUM', 'LAB', 'TINDAKAN', 'PELAYANAN', 'PEMERIKSAAN');
            const totalStr = getVal('TOTAL', 'TARIF');
            const totalNum = Number(totalStr.replace(/[^0-9.-]+/g, '')) || 0;
            const tindakan = rawTindakan || (totalNum > 0 ? (importType === 'Laboratorium' ? 'Pemeriksaan Lab' : 'Pelayanan') : '');
            const noVal = getVal('NO');
            const tanggal = parseTanggalExcel(getVal('TANGGAL'));
            const waktu = getVal('WAKTU', 'JAM');

            if (!tindakan && !totalNum && !nama) continue;

            if (nama && nama !== '-') {
              const visitKey = `${tanggal}_${waktu}_${nama}`;
              currentVisitKey = visitKey;

              if (!patientVisitsMap.has(visitKey)) {
                patientVisitsMap.set(visitKey, {
                  NO: noVal,
                  TANGGAL: tanggal,
                  WAKTU: waktu,
                  'NAMA PASIEN': nama,
                  'JENIS KELAMIN': getVal('JENIS KELAMIN', 'JK'),
                  ALAMAT: getVal('ALAMAT'),
                  UMUR: getVal('UMUR'),
                  'POLI/RUANGAN': getVal('POLI/RUANGAN', 'POLI'),
                  ASURANSI: getVal('ASURANSI', 'PENJAMIN') || 'Umum',
                  'NO ASURANSI': getVal('NO ASURANSI'),
                  'TENAGA MEDIS': getVal('TENAGA MEDIS', 'DOKTER'),
                  ASISTEN: getVal('ASISTEN'),
                  TINDAKAN_LIST: [],
                  TOTAL_BIAYA: 0,
                  STATUS: getVal('STATUS') || '-'
                });
              }
            }

            if (currentVisitKey && patientVisitsMap.has(currentVisitKey)) {
              const visit = patientVisitsMap.get(currentVisitKey);
              if (tindakan) {
                visit.TINDAKAN_LIST.push({ nama: tindakan, biaya: totalNum });
                visit.TOTAL_BIAYA += totalNum;
              }
            }
          }

          const visits = Array.from(patientVisitsMap.values()).map(visit => ({
            NO: visit.NO,
            TANGGAL: visit.TANGGAL,
            WAKTU: visit.WAKTU,
            'NAMA PASIEN': visit['NAMA PASIEN'],
            'JENIS KELAMIN': visit['JENIS KELAMIN'],
            ALAMAT: visit.ALAMAT,
            UMUR: visit.UMUR,
            'POLI/RUANGAN': visit['POLI/RUANGAN'],
            ASURANSI: visit.ASURANSI,
            'NO ASURANSI': visit['NO ASURANSI'],
            'TENAGA MEDIS': visit['TENAGA MEDIS'],
            ASISTEN: visit.ASISTEN,
            TINDAKAN: visit.TINDAKAN_LIST.map(t => t.nama).join(' + '),
            TINDAKAN_LIST: visit.TINDAKAN_LIST,
            TARIF: visit.TOTAL_BIAYA,
            TOTAL: visit.TOTAL_BIAYA,
            STATUS: visit.STATUS
          }));

          resolve({ fileName: file.name, visits });
        } catch (err) {
          resolve({ fileName: file.name, visits: [], error: err.message });
        }
      };
      reader.readAsBinaryString(file);
    });
  };

  // Proses Semua File (Multiple Files Processing)
  const processMultipleFiles = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    setStatusMsg(null);
    setLoading(true);

    const results = await Promise.all(filesList.map(parseSingleFile));
    setLoading(false);

    const masterMap = new Map();
    const summaries = [];
    let validFilesCount = 0;

    results.forEach(res => {
      if (res.visits && res.visits.length > 0) {
        validFilesCount++;
        let fileTotal = 0;

        res.visits.forEach(visit => {
          const key = `${visit.TANGGAL}_${visit.WAKTU}_${visit['NAMA PASIEN']}`;
          if (!masterMap.has(key)) {
            masterMap.set(key, { ...visit });
          } else {
            // Gabungkan rincian tindakan jika ada pasien yang sama di file berbeda
            const existing = masterMap.get(key);
            visit.TINDAKAN_LIST.forEach(t => {
              existing.TINDAKAN_LIST.push(t);
              existing.TOTAL += t.biaya;
              existing.TARIF += t.biaya;
            });
            existing.TINDAKAN = existing.TINDAKAN_LIST.map(t => t.nama).join(' + ');
          }
          fileTotal += (Number(visit.TOTAL) || 0);
        });

        summaries.push({
          name: res.fileName,
          count: res.visits.length,
          total: fileTotal
        });
      } else {
        showWarningToast('Gagal Membaca File', `File "${res.fileName}" ${res.error || 'tidak berisi data valid'}.`);
      }
    });

    const combinedVisits = Array.from(masterMap.values());
    if (combinedVisits.length === 0) {
      showErrorToast('Upload Gagal', 'Tidak ada data pasien valid yang ditemukan dari file yang diupload.');
      setParsedData([]);
      setSelectedFiles([]);
      setFileSummaries([]);
      return;
    }

    setSelectedFiles(filesList);
    setFileSummaries(summaries);
    setParsedData(combinedVisits);

    showSuccessToast(
      'File Berhasil Dimuat!',
      `${validFilesCount} file dibaca. Total ${combinedVisits.length} kunjungan pasien siap diimport.`
    );
  };

  // Drag & Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(f =>
      f.name.match(/\.(xlsx|xls|csv)$/i)
    );

    if (droppedFiles.length === 0) {
      showErrorToast('Format Tidak Sesuai', 'Harap jatuhkan file berformat .xlsx, .xls, atau .csv');
      return;
    }

    processMultipleFiles(droppedFiles);
  };

  const handleRemoveFile = (index) => {
    const updatedFiles = selectedFiles.filter((_, idx) => idx !== index);
    if (updatedFiles.length === 0) {
      setSelectedFiles([]);
      setFileSummaries([]);
      setParsedData([]);
    } else {
      processMultipleFiles(updatedFiles);
    }
  };

  const handleProcessImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    setStatusMsg(null);

    const batchName = selectedFiles.length === 1
      ? selectedFiles[0].name
      : `Batch Import (${selectedFiles.length} File) - ${new Date().toLocaleDateString('id-ID')}`;

    const res = await saveImportPayload(batchName, parsedData, user?.username, importType);
    setLoading(false);

    if (res.success) {
      const msgText = `Sukses: ${res.berhasil} pasien tersimpan, Gagal/Duplikat: ${res.gagal} baris.`;
      setStatusMsg({
        type: 'success',
        text: `Import Berhasil! ${msgText}`
      });
      showSuccessToast('Import Berhasil!', msgText);
      
      await logAudit(
        user?.username,
        'IMPORT_DATA',
        `Berhasil import ${selectedFiles.length} file (${res.berhasil} data pasien tersimpan)`
      );

      setParsedData([]);
      setSelectedFiles([]);
      setFileSummaries([]);
    } else {
      setStatusMsg({ type: 'danger', text: 'Gagal melakukan import: ' + res.message });
      showErrorToast('Gagal Import', res.message);
    }
  };

  const formatRupiah = (val) => {
    const num = Number(String(val || '0').replace(/[^0-9.-]+/g, '')) || 0;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  return (
    <div>
      <div className="card rounded-4 border-0 mb-4 shadow-sm">
        <div className="card-body p-4 p-md-5 text-center">
          <div
            className="icon-box icon-box-primary shadow-sm mx-auto mb-4"
            style={{ width: '64px', height: '64px', fontSize: '2rem' }}
          >
            <i className="fa-solid fa-cloud-arrow-up"></i>
          </div>
          <h4 className="fw-bold text-dark mb-2">Upload Data RME Online</h4>
          <p className="text-muted mx-auto mb-4" style={{ maxWidth: '650px' }}>
            Upload satu atau beberapa file Excel/CSV hasil export dari sistem RME Online. Anda dapat <strong>drag & drop</strong> file langsung ke area di bawah atau mengklik untuk memilih <strong>multiple file</strong> sekaligus.
          </p>

          {/* Import Type Selector */}
          <div className="d-flex justify-content-center gap-4 mb-4 bg-light p-3 rounded-pill mx-auto" style={{ maxWidth: '400px' }}>
            <div className="form-check form-check-inline m-0">
              <input 
                className="form-check-input" 
                type="radio" 
                name="importType" 
                id="typeTindakan" 
                value="Tindakan" 
                checked={importType === 'Tindakan'} 
                onChange={(e) => setImportType(e.target.value)}
              />
              <label className="form-check-label fw-semibold" htmlFor="typeTindakan" style={{ cursor: 'pointer' }}>File Tindakan</label>
            </div>
            <div className="form-check form-check-inline m-0">
              <input 
                className="form-check-input" 
                type="radio" 
                name="importType" 
                id="typeLaboratorium" 
                value="Laboratorium" 
                checked={importType === 'Laboratorium'} 
                onChange={(e) => setImportType(e.target.value)}
              />
              <label className="form-check-label fw-semibold" htmlFor="typeLaboratorium" style={{ cursor: 'pointer' }}>File Laboratorium</label>
            </div>
          </div>

          {statusMsg && (
            <div className={`alert alert-${statusMsg.type} p-3 rounded-3 max-w-md mx-auto mb-4`}>
              {statusMsg.text}
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
            onClick={() => document.getElementById('fileImportInput').click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-3">
              <i className={`fa-solid ${isDragging ? 'fa-file-circle-plus fa-bounce' : 'fa-file-excel'} fa-3x text-primary`}></i>
            </div>
            <h6 className="fw-bold text-dark mb-1">
              {isDragging
                ? 'Lepaskan file di sini...'
                : selectedFiles.length > 0
                ? `${selectedFiles.length} File Terpilih (Klik untuk mengganti/menambah)`
                : 'Tarik & Jatuhkan (Drag & Drop) File ke Sini'}
            </h6>
            <p className="text-muted small mb-2">atau klik di sini untuk pilih <strong>Multiple File Excel / CSV</strong></p>
            <span className="badge bg-light text-secondary border font-monospace">
              Mendukung format .xlsx, .xls, .csv
            </span>
            <input
              type="file"
              id="fileImportInput"
              accept=".xlsx, .xls, .csv"
              multiple
              className="d-none"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processMultipleFiles(Array.from(e.target.files));
                }
              }}
            />
          </div>

          {/* Selected Files Badges List */}
          {fileSummaries.length > 0 && (
            <div className="mt-4 max-w-xl mx-auto text-start">
              <label className="fw-semibold text-muted small mb-2">Daftar File Terbaca ({fileSummaries.length} File):</label>
              <div className="d-flex flex-wrap gap-2">
                {fileSummaries.map((f, idx) => (
                  <div
                    key={idx}
                    className="badge bg-white border text-dark p-2 rounded-3 shadow-xs d-flex align-items-center gap-2"
                    style={{ fontSize: '0.82rem', fontWeight: 'normal' }}
                  >
                    <i className="fa-solid fa-file-excel text-success"></i>
                    <div>
                      <strong className="text-truncate d-inline-block" style={{ maxWidth: '180px' }}>{f.name}</strong>
                      <span className="text-muted ms-1">({f.count} data)</span>
                    </div>
                    <button
                      type="button"
                      className="btn-close ms-1"
                      style={{ fontSize: '0.65rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(idx);
                      }}
                      title="Hapus file ini"
                    ></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {parsedData.length > 0 && (
        <div className="card rounded-4 border-0 shadow-sm">
          <div className="card-header bg-white border-bottom-0 pt-4 pb-0 d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h6 className="fw-bold m-0 text-dark">
                <i className="fa-solid fa-table me-2 text-primary"></i> Preview Hasil Penggabungan Data ({parsedData.length} Kunjungan Pasien)
              </h6>
              <small className="text-muted">Rincian tindakan per pasien dari seluruh file telah digabungkan secara otomatis.</small>
            </div>
            <button
              className="btn btn-primary shadow-sm px-4 rounded-pill fw-bold"
              onClick={handleProcessImport}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span> Processing...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check me-2"></i> Proses Import Ke Firebase
                </>
              )}
            </button>
          </div>

          <div className="card-body">
            <div className="table-responsive rounded-3 border" style={{ maxHeight: '420px' }}>
              <table className="table table-hover m-0 text-nowrap small align-middle">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">No.</th>
                    <th>Tanggal & Waktu</th>
                    <th>Nama Pasien</th>
                    <th>Poli / Ruangan</th>
                    <th>Tenaga Medis</th>
                    <th>Rincian Tindakan / Pelayanan</th>
                    <th>Asuransi</th>
                    <th className="text-end pe-3">Total Biaya</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row, rIdx) => {
                    const asuransi = row['ASURANSI'] || 'Umum';
                    const isUmum = asuransi.toLowerCase().includes('umum');
                    const tindakanList = row['TINDAKAN_LIST'] || [];
                    return (
                      <tr key={rIdx} className={!isUmum ? 'table-warning bg-opacity-10' : ''}>
                        <td className="ps-3 text-muted fw-semibold">{rIdx + 1}</td>
                        <td>
                          <div className="fw-semibold">{formatDisplayDate(row['TANGGAL'])}</div>
                          <div className="text-muted small">{row['WAKTU'] || '-'}</div>
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{row['NAMA PASIEN'] || '-'}</div>
                          <div className="text-muted small">{row['JENIS KELAMIN'] || '-'} • {row['UMUR'] || '-'}</div>
                        </td>
                        <td>{row['POLI/RUANGAN'] || '-'}</td>
                        <td>{row['TENAGA MEDIS'] || '-'}</td>
                        <td>
                          {tindakanList.length > 0 ? (
                            tindakanList.map((t, idx) => (
                              <div key={idx} className="small">
                                <i className="fa-solid fa-angle-right me-1 text-primary"></i>
                                {t.nama} <span className="text-muted">({formatRupiah(t.biaya)})</span>
                              </div>
                            ))
                          ) : (
                            <div>{row['TINDAKAN'] || '-'}</div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${isUmum ? 'bg-success bg-opacity-10 text-success' : 'bg-warning text-dark'}`}>
                            {asuransi}
                          </span>
                        </td>
                        <td className="text-end pe-3 fw-bold text-primary fs-6">
                          {formatRupiah(row['TOTAL'])}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
              <small className="text-muted">
                <i className="fa-solid fa-circle-info text-info me-1"></i>
                Total Pendapatan Pasien Umum: <strong>{formatRupiah(parsedData.reduce((acc, curr) => acc + (Number(curr.TOTAL) || 0), 0))}</strong>
              </small>
              <small className="text-muted fw-semibold">
                Total Pasien Tergabung: {parsedData.length} Orang
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

