import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MobileMenuDrawer from './MobileMenuDrawer';

export default function MobileBottomNav({ drawerOpen: externalDrawerOpen, setDrawerOpen: externalSetDrawerOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);

  const drawerOpen = externalDrawerOpen !== undefined ? externalDrawerOpen : internalDrawerOpen;
  const setDrawerOpen = externalSetDrawerOpen || setInternalDrawerOpen;

  const currentPath = location.pathname;

  // Daftar rute yang masuk ke dalam kategori drawer "Menu Lainnya"
  const isDrawerRoute = [
    '/lppkp',
    '/hak-akses',
    '/master-ttd',
    '/master-user',
    '/master-print',
    '/master-wa',
    '/riwayat-import',
    '/download'
  ].includes(currentPath);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/',
      icon: 'fa-solid fa-chart-pie',
      isActive: currentPath === '/' && !drawerOpen
    },
    {
      id: 'import',
      label: 'Import',
      path: '/import',
      icon: 'fa-solid fa-cloud-arrow-up',
      isActive: currentPath === '/import' && !drawerOpen
    },
    {
      id: 'transaksi',
      label: 'Transaksi',
      path: '/transaksi',
      icon: 'fa-solid fa-cash-register',
      isActive: currentPath === '/transaksi' && !drawerOpen
    },
    {
      id: 'laporan',
      label: 'Laporan',
      path: '/laporan',
      icon: 'fa-solid fa-file-invoice-dollar',
      isActive: currentPath === '/laporan' && !drawerOpen
    },
    {
      id: 'menu',
      label: 'Menu',
      action: () => setDrawerOpen(true),
      icon: 'fa-solid fa-bars-staggered',
      isActive: drawerOpen || isDrawerRoute
    }
  ];

  const handleTabClick = (item) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      setDrawerOpen(false);
      navigate(item.path);
    }
  };

  return (
    <>
      <nav className="mobile-bottom-nav d-flex d-lg-none" aria-label="Navigasi Bawah HP">
        <div className="mobile-bottom-nav-inner">
          {navItems.map((item) => {
            return (
              <button
                key={item.id}
                type="button"
                className={`mobile-nav-item ${item.isActive ? 'active' : ''}`}
                onClick={() => handleTabClick(item)}
                aria-label={item.label}
              >
                {/* Curved Notch Effect Behind Active Item */}
                {item.isActive && <div className="mobile-nav-notch"></div>}

                {/* Circular Icon Container (Floating when active) */}
                <div className="mobile-nav-icon-container">
                  <i className={`${item.icon} mobile-nav-icon`}></i>
                </div>

                {/* Label Text */}
                <span className="mobile-nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Drawer untuk Menu Sekunder & Master */}
      <MobileMenuDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
