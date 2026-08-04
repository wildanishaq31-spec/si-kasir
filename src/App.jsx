import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ImportData from './pages/ImportData';
import Transaksi from './pages/Transaksi';
import LaporanPendapatan from './pages/LaporanPendapatan';
import LPPKP from './pages/LPPKP';
import MasterTtd from './pages/MasterTtd';
import MasterUser from './pages/MasterUser';
import MasterPrint from './pages/MasterPrint';
import MasterWaBlast from './pages/MasterWaBlast';
import RiwayatImport from './pages/RiwayatImport';
import HakAkses from './pages/HakAkses';

function PermissionGate({ menuKey, children }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(menuKey)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('si_kasir_sidebar_collapsed') === 'true';
  });

  const location = useLocation();

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('si_kasir_sidebar_collapsed', String(next));
      return next;
    });
  };

  const getPageTitle = (path) => {
    switch (path) {
      case '/': return 'Dashboard Analytics';
      case '/import': return 'Import Data RME';
      case '/transaksi': return 'Daftar Transaksi';
      case '/laporan': return 'Laporan Pendapatan';
      case '/lppkp':   return 'LPPKP — Laporan Pemungutan & Penyetoran';
      case '/hak-akses': return 'Pengaturan Hak Akses Kasir';
      case '/master-ttd': return 'Pengaturan TTD';
      case '/master-user': return 'Master User';
      case '/master-print': return 'Master Template Dokumen';
      case '/master-wa': return 'Pengaturan WA Blast';
      case '/riwayat-import': return 'Riwayat Import';
      default: return 'Kasir Puskesmas RME';
    }
  };

  return (
    <div className="app-wrapper">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
      />
      <main className="main-content">
        <Topbar title={getPageTitle(location.pathname)} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div className="content-area page-transition-wrapper" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/import" element={<ImportData />} />
            <Route path="/transaksi" element={<Transaksi />} />
            <Route path="/laporan" element={<LaporanPendapatan />} />
            <Route path="/lppkp"   element={<LPPKP />} />
            
            {/* Protected Master & Settings Routes */}
            <Route
              path="/hak-akses"
              element={
                <PermissionGate menuKey="hakAkses">
                  <HakAkses />
                </PermissionGate>
              }
            />
            <Route
              path="/master-ttd"
              element={
                <PermissionGate menuKey="masterTtd">
                  <MasterTtd />
                </PermissionGate>
              }
            />
            <Route
              path="/master-user"
              element={
                <PermissionGate menuKey="masterUser">
                  <MasterUser />
                </PermissionGate>
              }
            />
            <Route
              path="/master-print"
              element={
                <PermissionGate menuKey="masterPrint">
                  <MasterPrint />
                </PermissionGate>
              }
            />
            <Route
              path="/master-wa"
              element={
                <PermissionGate menuKey="masterWa">
                  <MasterWaBlast />
                </PermissionGate>
              }
            />
            <Route
              path="/riwayat-import"
              element={
                <PermissionGate menuKey="riwayatImport">
                  <RiwayatImport />
                </PermissionGate>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
