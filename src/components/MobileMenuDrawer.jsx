import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MobileMenuDrawer({ isOpen, onClose }) {
  const { user, logout, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login');
  };

  const handleItemClick = () => {
    onClose();
  };

  const canSeeMasterTtd = hasPermission('masterTtd');
  const canSeeMasterUser = hasPermission('masterUser');
  const canSeeMasterPrint = hasPermission('masterPrint');
  const canSeeMasterWa = hasPermission('masterWa');
  const canSeeRiwayatImport = hasPermission('riwayatImport');
  const canSeeLppkp = hasPermission('lppkp');

  const showMasterSection = isAdmin || canSeeMasterTtd || canSeeMasterUser || canSeeMasterPrint || canSeeMasterWa || canSeeRiwayatImport;

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div 
        className="mobile-drawer-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Pull Handle */}
        <div className="mobile-drawer-handle-bar">
          <div className="mobile-drawer-handle"></div>
        </div>

        {/* Header with User Info */}
        <div className="mobile-drawer-header d-flex align-items-center justify-content-between px-4 pb-3 border-bottom">
          <div className="d-flex align-items-center gap-3">
            <div className="mobile-drawer-avatar">
              {user?.fullname ? user.fullname.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h6 className="fw-bold text-dark mb-0 fs-6 text-truncate" style={{ maxWidth: '180px' }}>
                {user?.fullname || 'Pengguna'}
              </h6>
              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0" style={{ fontSize: '0.72rem' }}>
                {user?.role || 'Kasir'}
              </span>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-sm btn-light rounded-circle p-2 text-muted"
            onClick={onClose}
            aria-label="Tutup Menu"
          >
            <i className="fa-solid fa-xmark fs-6"></i>
          </button>
        </div>

        {/* Scrollable Drawer Content */}
        <div className="mobile-drawer-body px-3 py-3 overflow-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {/* Section: Pelaporan */}
          {canSeeLppkp && (
            <div className="mb-3">
              <div className="text-muted small fw-bold text-uppercase px-2 mb-2" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                Pelaporan Khusus
              </div>
              <NavLink
                to="/lppkp"
                className={({ isActive }) => `mobile-drawer-item ${isActive ? 'active' : ''}`}
                onClick={handleItemClick}
              >
                <div className="mobile-drawer-icon" style={{ backgroundColor: '#f3e8ff', color: '#a855f7' }}>
                  <i className="fa-solid fa-file-contract"></i>
                </div>
                <div className="flex-grow-1">
                  <div className="fw-semibold text-dark fs-6">LPPKP</div>
                  <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Laporan Pemungutan & Penyetoran Kas</div>
                </div>
                <i className="fa-solid fa-chevron-right text-muted small opacity-50"></i>
              </NavLink>
            </div>
          )}

          {/* Section: Master & Pengaturan */}
          {showMasterSection && (
            <div className="mb-3">
              <div className="text-muted small fw-bold text-uppercase px-2 mb-2" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                Pengaturan & Master Data
              </div>

              {isAdmin && (
                <NavLink
                  to="/hak-akses"
                  className={({ isActive }) => `mobile-drawer-item ${isActive ? 'active' : ''}`}
                  onClick={handleItemClick}
                >
                  <div className="mobile-drawer-icon" style={{ backgroundColor: '#fef9c3', color: '#ca8a04' }}>
                    <i className="fa-solid fa-user-shield"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold text-dark fs-6">Hak Akses Role</div>
                    <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Kelola izin akses Kasir & Bendahara</div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-muted small opacity-50"></i>
                </NavLink>
              )}

              {canSeeMasterTtd && (
                <NavLink
                  to="/master-ttd"
                  className={({ isActive }) => `mobile-drawer-item ${isActive ? 'active' : ''}`}
                  onClick={handleItemClick}
                >
                  <div className="mobile-drawer-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                    <i className="fa-solid fa-signature"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold text-dark fs-6">Pengaturan TTD</div>
                    <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Pejabat & tanda tangan dokumen</div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-muted small opacity-50"></i>
                </NavLink>
              )}

              {canSeeMasterUser && (
                <NavLink
                  to="/master-user"
                  className={({ isActive }) => `mobile-drawer-item ${isActive ? 'active' : ''}`}
                  onClick={handleItemClick}
                >
                  <div className="mobile-drawer-icon" style={{ backgroundColor: '#ede9fe', color: '#7c3aed' }}>
                    <i className="fa-solid fa-users"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold text-dark fs-6">Master User</div>
                    <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Daftar pengguna & reset password</div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-muted small opacity-50"></i>
                </NavLink>
              )}

              {canSeeMasterPrint && (
                <NavLink
                  to="/master-print"
                  className={({ isActive }) => `mobile-drawer-item ${isActive ? 'active' : ''}`}
                  onClick={handleItemClick}
                >
                  <div className="mobile-drawer-icon" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                    <i className="fa-solid fa-print"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold text-dark fs-6">Master Print</div>
                    <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Pengaturan template & margin cetak</div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-muted small opacity-50"></i>
                </NavLink>
              )}

              {canSeeMasterWa && (
                <NavLink
                  to="/master-wa"
                  className={({ isActive }) => `mobile-drawer-item ${isActive ? 'active' : ''}`}
                  onClick={handleItemClick}
                >
                  <div className="mobile-drawer-icon" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                    <i className="fa-brands fa-whatsapp"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold text-dark fs-6">Pengaturan WA Blast</div>
                    <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Nomor penerima rekap harian</div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-muted small opacity-50"></i>
                </NavLink>
              )}

              {canSeeRiwayatImport && (
                <NavLink
                  to="/riwayat-import"
                  className={({ isActive }) => `mobile-drawer-item ${isActive ? 'active' : ''}`}
                  onClick={handleItemClick}
                >
                  <div className="mobile-drawer-icon" style={{ backgroundColor: '#ffedd5', color: '#ea580c' }}>
                    <i className="fa-solid fa-clock-rotate-left"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold text-dark fs-6">Riwayat Import</div>
                    <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Log import & pembersihan data</div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-muted small opacity-50"></i>
                </NavLink>
              )}
            </div>
          )}

          {/* Section: Info Aplikasi PWA */}
          <div className="mb-3">
            <div className="text-muted small fw-bold text-uppercase px-2 mb-2" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
              Aplikasi
            </div>
            <NavLink
              to="/download"
              className={({ isActive }) => `mobile-drawer-item ${isActive ? 'active' : ''}`}
              onClick={handleItemClick}
            >
              <div className="mobile-drawer-icon" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                <i className="fa-solid fa-cloud-arrow-down"></i>
              </div>
              <div className="flex-grow-1">
                <div className="fw-semibold text-dark fs-6">Download / Pasang Aplikasi</div>
                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Instal SI-KASIR ke layar utama HP/PC</div>
              </div>
              <i className="fa-solid fa-chevron-right text-muted small opacity-50"></i>
            </NavLink>
          </div>
        </div>

        {/* Footer with Logout */}
        <div className="p-3 border-top bg-light">
          <button
            type="button"
            className="btn btn-outline-danger w-100 rounded-3 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
            onClick={handleLogout}
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Keluar dari Akun (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
