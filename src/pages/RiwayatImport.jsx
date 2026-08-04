import React, { useState, useEffect } from 'react';
import { getFirebaseDataAsArray } from '../services/firebase';

export default function RiwayatImport() {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      const data = await getFirebaseDataAsArray('RiwayatImport');
      setHistoryList(data.reverse());
      setLoading(false);
    }
    loadHistory();
  }, []);

  return (
    <div>
      <div className="mb-4">
        <h5 className="fw-bold text-dark mb-1">Riwayat Sinkronisasi & Import RME</h5>
        <p className="text-muted small mb-0">Log pengunggahan file Excel/CSV data transaksi pasien</p>
      </div>

      <div className="card rounded-4 border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small text-nowrap">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Import ID</th>
                <th>Waktu Import</th>
                <th>Nama File</th>
                <th className="text-center">Total Data</th>
                <th className="text-center text-success">Sukses</th>
                <th className="text-center text-danger">Gagal / Skip</th>
                <th className="pe-4">User</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">Memuat data riwayat...</td>
                </tr>
              ) : historyList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">Belum ada riwayat import.</td>
                </tr>
              ) : (
                historyList.map((item, idx) => (
                  <tr key={item.ImportID || item._id || idx}>
                    <td className="ps-4 fw-semibold text-primary">{item.ImportID || '-'}</td>
                    <td>{item.TanggalImport || '-'}</td>
                    <td className="fw-medium">{item.NamaFile || '-'}</td>
                    <td className="text-center">{item.JumlahData || 0}</td>
                    <td className="text-center text-success fw-bold">{item.Berhasil || 0}</td>
                    <td className="text-center text-danger fw-bold">{item.Gagal || 0}</td>
                    <td className="pe-4 text-muted">{item.UserID || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
