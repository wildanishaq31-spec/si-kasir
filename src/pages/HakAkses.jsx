import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../services/firebase';
import { showSuccessToast, showErrorToast } from '../utils/toast';

const MENU_ACCESS_LIST = [
  {
    key: 'masterTtd',
    title: 'Pengaturan TTD',
    path: '/master-ttd',
    icon: 'fa-solid fa-signature',
    color: '#0d6efd',
    description: 'Kelola data tanda tangan dan pejabat untuk cetak laporan'
  },
  {
    key: 'masterUser',
    title: 'Master User',
    path: '/master-user',
    icon: 'fa-solid fa-users',
    color: '#6f42c1',
    description: 'Kelola data pengguna, role, dan akun aplikasi'
  },
  {
    key: 'masterPrint',
    title: 'Master Print',
    path: '/master-print',
    icon: 'fa-solid fa-print',
    color: '#0dcaf0',
    description: 'Kelola template master Excel untuk rekapitulasi data'
  },
  {
    key: 'masterWa',
    title: 'Pengaturan WA Blast',
    path: '/master-wa',
    icon: 'fa-brands fa-whatsapp',
    color: '#198754',
    description: 'Kelola template pesan singkat & pesan pengumuman WhatsApp'
  },
  {
    key: 'riwayatImport',
    title: 'Riwayat Import',
    path: '/riwayat-import',
    icon: 'fa-solid fa-clock-rotate-left',
    color: '#fb923c',
    description: 'Lihat daftar riwayat file RME yang pernah diimport'
  },
  {
    key: 'lapPendapatan',
    title: 'Laporan Pendapatan',
    path: '/laporan',
    icon: 'fa-solid fa-file-invoice-dollar',
    color: '#34d399',
    description: 'Akses halaman rekap Laporan Pendapatan'
  },
  {
    key: 'lppkp',
    title: 'LPPKP',
    path: '/lppkp',
    icon: 'fa-solid fa-file-contract',
    color: '#c084fc',
    description: 'Akses halaman rekap LPPKP'
  }
];

export default function HakAkses() {
  const { user, permissions, updatePermission, isAdmin } = useAuth();
  const [updatingKey, setUpdatingKey] = useState(null);
  const [activeRole, setActiveRole] = useState('Kasir');

  const handleTogglePermission = async (menu) => {
    if (!isAdmin) {
      showErrorToast('Akses Ditolak', 'Hanya Admin yang dapat mengubah hak akses!');
      return;
    }

    const currentStatus = Boolean(permissions[activeRole] && permissions[activeRole][menu.key]);
    const nextStatus = !currentStatus;

    setUpdatingKey(menu.key);
    const res = await updatePermission(activeRole, menu.key, nextStatus);
    setUpdatingKey(null);

    if (res.success) {
      await logAudit(
        user?.username,
        'HAK_AKSES',
        `Menu "${menu.title}" di-set ${nextStatus ? 'ON (Izinkan)' : 'OFF (Sembunyikan)'} untuk ${activeRole}`
      );
      showSuccessToast(
        'Hak Akses Diperbarui!',
        `Menu "${menu.title}" sekarang ${nextStatus ? 'DI-IZINKAN (ON)' : 'DISEMBUNYIKAN (OFF)'} untuk ${activeRole}.`
      );
    } else {
      showErrorToast('Gagal Perbarui', res.message || 'Terjadi kesalahan saat menyimpan hak akses.');
    }
  };

  return (
    <div>
      {/* Top Banner Card */}
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
              <i className="fa-solid fa-user-shield fs-3"></i>
            </div>
            <div>
              <h4 className="fw-bold m-0 text-white">Pengaturan Hak Akses {activeRole}</h4>
              <p className="m-0 text-white text-opacity-75 small">
                Aktifkan (ON) atau Nonaktifkan (OFF) akses menu berikut untuk pengguna ber-role <strong>{activeRole}</strong>
              </p>
            </div>
          </div>
          <div className="badge bg-white text-dark px-3 py-2 rounded-pill fw-semibold shadow-xs">
            <i className="fa-solid fa-shield-halved text-success me-1"></i> Khusus Admin
          </div>
        </div>
      </div>

      {/* Info Notice Alert */}
      <div className="alert alert-info border-0 rounded-4 shadow-xs mb-4 d-flex align-items-center p-3">
        <i className="fa-solid fa-circle-info fs-4 text-info me-3"></i>
        <div className="small text-secondary">
          <strong>Petunjuk Penggunaan:</strong> Jika toggle bernilai <strong>ON (Aktif)</strong>, maka pengguna dengan role <strong>{activeRole}</strong> dapat melihat dan mengakses menu tersebut di sidebar. Jika <strong>OFF (Nonaktif)</strong>, menu akan tersembunyi dan tidak dapat diakses oleh {activeRole}.
        </div>
      </div>

      {/* Role Selection Tabs */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button 
            className={`nav-link px-4 py-2 fw-semibold rounded-pill ${activeRole === 'Kasir' ? 'active shadow-sm' : 'bg-white text-muted border'}`}
            onClick={() => setActiveRole('Kasir')}
          >
            <i className="fa-solid fa-cash-register me-2"></i>Hak Akses Kasir
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link px-4 py-2 fw-semibold rounded-pill ${activeRole === 'Bendahara' ? 'active shadow-sm' : 'bg-white text-muted border'}`}
            onClick={() => setActiveRole('Bendahara')}
          >
            <i className="fa-solid fa-file-invoice-dollar me-2"></i>Hak Akses Bendahara
          </button>
        </li>
      </ul>

      {/* Main Permissions List Table */}
      <div className="card rounded-4 border-0 shadow-sm overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light border-bottom">
              <tr>
                <th className="ps-4 py-3 text-uppercase small fw-bold text-muted" style={{ width: '40%' }}>
                  NAMA MENU / MODUL
                </th>
                <th className="py-3 text-uppercase small fw-bold text-muted">DESKRIPSI & PATH</th>
                <th className="py-3 text-uppercase small fw-bold text-muted text-center" style={{ width: '200px' }}>
                  STATUS {activeRole.toUpperCase()}
                </th>
                <th className="pe-4 py-3 text-uppercase small fw-bold text-muted text-end" style={{ width: '140px' }}>
                  AKSES {activeRole.toUpperCase()}
                </th>
              </tr>
            </thead>
            <tbody>
              {MENU_ACCESS_LIST.map((menu) => {
                const isOn = Boolean(permissions[activeRole] && permissions[activeRole][menu.key]);
                const isUpdating = updatingKey === menu.key;

                return (
                  <tr key={menu.key}>
                    <td className="ps-4 py-3">
                      <div className="d-flex align-items-center">
                        <div
                          className="rounded-3 d-flex align-items-center justify-content-center me-3 shadow-xs"
                          style={{
                            width: '42px',
                            height: '42px',
                            backgroundColor: `${menu.color}15`,
                            color: menu.color
                          }}
                        >
                          <i className={`${menu.icon} fs-5`}></i>
                        </div>
                        <div>
                          <h6 className="fw-bold text-dark mb-0">{menu.title}</h6>
                          <span className="badge bg-light text-muted border font-monospace small" style={{ fontSize: '0.75rem' }}>
                            {menu.path}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-muted small">
                      {menu.description}
                    </td>
                    <td className="py-3 text-center">
                      {isOn ? (
                        <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 fw-semibold d-inline-flex align-items-center gap-1">
                          <i className="fa-solid fa-circle-check"></i> Akses Diizinkan
                        </span>
                      ) : (
                        <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-3 py-2 fw-normal d-inline-flex align-items-center gap-1">
                          <i className="fa-solid fa-lock"></i> Terkunci (Hanya Admin)
                        </span>
                      )}
                    </td>
                    <td className="pe-4 py-3 text-end">
                      <div className="form-check form-switch d-inline-block">
                        <input
                          className="form-check-input shadow-none"
                          type="checkbox"
                          role="switch"
                          id={`switch-${menu.key}`}
                          checked={isOn}
                          disabled={isUpdating || !isAdmin}
                          onChange={() => handleTogglePermission(menu)}
                          style={{
                            width: '2.8em',
                            height: '1.4em',
                            cursor: (isUpdating || !isAdmin) ? 'not-allowed' : 'pointer',
                            backgroundColor: isOn ? '#198754' : undefined,
                            borderColor: isOn ? '#198754' : undefined
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
