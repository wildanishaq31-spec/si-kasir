import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo_cermee.jpg';

export default function Sidebar({ isOpen, toggleSidebar, isCollapsed, toggleCollapse }) {
  const { user, logout, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (isOpen) {
      toggleSidebar();
    }
  };

  const canSeeMasterTtd = hasPermission('masterTtd');
  const canSeeMasterUser = hasPermission('masterUser');
  const canSeeMasterPrint = hasPermission('masterPrint');
  const canSeeMasterWa = hasPermission('masterWa');
  const canSeeRiwayatImport = hasPermission('riwayatImport');

  const showSettingsSection = isAdmin || canSeeMasterTtd || canSeeMasterUser || canSeeMasterPrint || canSeeMasterWa || canSeeRiwayatImport;

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={toggleSidebar}
      ></div>

      <nav className={`sidebar shadow-lg ${isOpen ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Toggle Collapse Button (< >) */}
        <button
          type="button"
          className="sidebar-toggle-btn d-none d-lg-flex align-items-center justify-content-center border-0 shadow-sm"
          onClick={toggleCollapse}
          title={isCollapsed ? "Buka Sidebar (Expand)" : "Tutup Sidebar (Collapse)"}
        >
          <i className={`fa-solid ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
        </button>

        {/* Brand Section */}
        <div className="sidebar-brand">
          <div className="brand-icon flex-shrink-0" style={{ overflow: 'hidden', padding: 0 }}>
            <img src={logoImg} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
          </div>
          <div className="brand-title-wrapper overflow-hidden">
            <div className="fs-5 fw-bold tracking-tight text-white lh-1 text-truncate">SI-KASIR RME</div>
            <div className="small text-white text-opacity-75 fw-medium mt-1 text-truncate" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
              Version 1.0.0
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Menu */}
        <div className="overflow-auto flex-grow-1" style={{ scrollbarWidth: 'none' }}>
          <div className="menu-section">
            <span className="menu-section-text">Main Menu</span>
          </div>

          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item-custom ${isActive ? 'active' : ''}`}
            onClick={handleNavClick}
            title={isCollapsed ? "Dashboard" : undefined}
          >
            <i className="fa-solid fa-chart-pie flex-shrink-0" style={{ color: '#38bdf8' }}></i>
            <span className="nav-item-text">Dashboard</span>
          </NavLink>

          <NavLink
            to="/import"
            className={({ isActive }) => `nav-item-custom ${isActive ? 'active' : ''}`}
            onClick={handleNavClick}
            title={isCollapsed ? "Import Data" : undefined}
          >
            <i className="fa-solid fa-cloud-arrow-up flex-shrink-0" style={{ color: '#4ade80' }}></i>
            <span className="nav-item-text">Import Data</span>
          </NavLink>

          <NavLink
            to="/transaksi"
            className={({ isActive }) => `nav-item-custom ${isActive ? 'active' : ''}`}
            onClick={handleNavClick}
            title={isCollapsed ? "Transaksi" : undefined}
          >
            <i className="fa-solid fa-cash-register flex-shrink-0" style={{ color: '#fbbf24' }}></i>
            <span className="nav-item-text">Transaksi</span>
          </NavLink>

          <div className="menu-section">
            <span className="menu-section-text">Reporting</span>
          </div>

          <NavLink
            to="/laporan"
            className={({ isActive }) => `nav-item-custom ${isActive ? 'active' : ''}`}
            onClick={handleNavClick}
            title={isCollapsed ? "Lap. Pendapatan" : undefined}
          >
            <i className="fa-solid fa-file-invoice-dollar flex-shrink-0" style={{ color: '#34d399' }}></i>
            <span className="nav-item-text">Lap. Pendapatan</span>
          </NavLink>

          <NavLink
            to="/lppkp"
            className={({ isActive }) => `nav-item-custom ${isActive ? 'active' : ''}`}
            onClick={handleNavClick}
            title={isCollapsed ? "LPPKP" : undefined}
          >
            <i className="fa-solid fa-file-contract flex-shrink-0" style={{ color: '#c084fc' }}></i>
            <span className="nav-item-text">LPPKP</span>
          </NavLink>

          {showSettingsSection && (
            <div>
              <div className="menu-section">
                <span className="menu-section-text">Settings & Master</span>
              </div>

              {isAdmin && (
                <NavLink
                  to="/hak-akses"
                  className={({ isActive }) => `nav-item-custom ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                  title={isCollapsed ? "Hak Akses" : undefined}
                >
                  <i className="fa-solid fa-user-shield flex-shrink-0" style={{ color: '#facc15' }}></i>
                  <span className="nav-item-text">Hak Akses</span>
                </NavLink>
              )}

              {canSeeMasterTtd && (
                <NavLink
                  to="/master-ttd"
                  className={({ isActive }) => `nav-item-custom ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                  title={isCollapsed ? "Pengaturan TTD" : undefined}
                >
                  <i className="fa-solid fa-signature flex-shrink-0" style={{ color: '#60a5fa' }}></i>
                  <span className="nav-item-text">Pengaturan TTD</span>
                </NavLink>
              )}

              {canSeeMasterUser && (
                <NavLink
                  to="/master-user"
                  className={({ isActive }) => `nav-item-custom ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                  title={isCollapsed ? "Master User" : undefined}
                >
                  <i className="fa-solid fa-users flex-shrink-0" style={{ color: '#a78bfa' }}></i>
                  <span className="nav-item-text">Master User</span>
                </NavLink>
              )}

              {canSeeMasterPrint && (
                <NavLink
                  to="/master-print"
                  className={({ isActive }) => `nav-item-custom ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                  title={isCollapsed ? "Master Print" : undefined}
                >
                  <i className="fa-solid fa-print flex-shrink-0" style={{ color: '#38bdf8' }}></i>
                  <span className="nav-item-text">Master Print</span>
                </NavLink>
              )}

              {canSeeMasterWa && (
                <NavLink
                  to="/master-wa"
                  className={({ isActive }) => `nav-item-custom ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                  title={isCollapsed ? "Pengaturan WA Blast" : undefined}
                >
                  <i className="fa-brands fa-whatsapp flex-shrink-0" style={{ color: '#25d366' }}></i>
                  <span className="nav-item-text">Pengaturan WA Blast</span>
                </NavLink>
              )}

              {canSeeRiwayatImport && (
                <NavLink
                  to="/riwayat-import"
                  className={({ isActive }) => `nav-item-custom ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                  title={isCollapsed ? "Riwayat Import" : undefined}
                >
                  <i className="fa-solid fa-clock-rotate-left flex-shrink-0" style={{ color: '#fb923c' }}></i>
                  <span className="nav-item-text">Riwayat Import</span>
                </NavLink>
              )}
            </div>
          )}
        </div>

        {/* User Profile Widget */}
        <div className="sidebar-user" onClick={handleLogout} title={isCollapsed ? `Logout (${user?.fullname})` : "Klik untuk keluar"}>
          <div className="avatar-circle flex-shrink-0">
            {user?.fullname ? user.fullname.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="sidebar-user-text overflow-hidden" style={{ lineHeight: 1.3, flexGrow: 1 }}>
            <div className="fw-bold text-truncate" style={{ color: 'var(--sidebar-active-text)' }}>{user?.fullname || 'User'}</div>
            <div className="small fw-bold" style={{ fontSize: '0.75rem', color: 'var(--sidebar-text)' }}>
              {user?.role || 'Guest'}
            </div>
          </div>
          <i className="fa-solid fa-arrow-right-from-bracket sidebar-user-logout-icon flex-shrink-0" style={{ color: 'var(--sidebar-active-text)' }}></i>
        </div>
      </nav>
    </>
  );
}

