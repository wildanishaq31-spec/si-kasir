import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, query, limitToLast } from 'firebase/database';
import { db } from '../services/firebase';

function formatRelativeTime(isoString) {
  if (!isoString) return '-';
  const time = new Date(isoString).getTime();
  if (isNaN(time)) return isoString;
  const now = Date.now();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 30) return 'Baru saja';
  if (diffSec < 60) return `${diffSec} dtk lalu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hri lalu`;

  return new Date(isoString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getActionStyle(action) {
  const act = String(action || '').toUpperCase();
  if (act.includes('IMPORT')) {
    return { icon: 'fa-solid fa-cloud-arrow-up', color: '#10b981', bg: '#10b98115', label: 'Import Data' };
  }
  if (act.includes('EDIT') || act.includes('UPDATE')) {
    return { icon: 'fa-solid fa-pen-to-square', color: '#3b82f6', bg: '#3b82f615', label: 'Edit Data' };
  }
  if (act.includes('HAPUS') || act.includes('DELETE')) {
    return { icon: 'fa-solid fa-trash', color: '#ef4444', bg: '#ef444415', label: 'Hapus' };
  }
  if (act.includes('DOWNLOAD') || act.includes('EXCEL') || act.includes('EXPORT')) {
    return { icon: 'fa-solid fa-file-excel', color: '#16a34a', bg: '#16a34a15', label: 'Download' };
  }
  if (act.includes('PRINT') || act.includes('CETAK')) {
    return { icon: 'fa-solid fa-print', color: '#06b6d4', bg: '#06b6d415', label: 'Cetak' };
  }
  if (act.includes('LOGIN')) {
    return { icon: 'fa-solid fa-right-to-bracket', color: '#6366f1', bg: '#6366f115', label: 'Login' };
  }
  if (act.includes('AKSES') || act.includes('HAK')) {
    return { icon: 'fa-solid fa-user-shield', color: '#f59e0b', bg: '#f59e0b15', label: 'Hak Akses' };
  }
  return { icon: 'fa-solid fa-bell', color: '#6b7280', bg: '#6b728015', label: 'Sistem' };
}

export default function Topbar({ title, toggleSidebar }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [lastReadTime, setLastReadTime] = useState(() => {
    return Number(localStorage.getItem('si_kasir_last_read_time') || 0);
  });
  const [searchQuery, setSearchQuery] = useState('');

  const dropdownRef = useRef(null);

  // Real-time listener dari Firebase RTDB node AuditLog
  useEffect(() => {
    const logRef = query(ref(db, 'AuditLog'), limitToLast(30));
    const unsub = onValue(logRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const parsed = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
        setNotifications(parsed);
      } else {
        setNotifications([]);
      }
    });
    return () => unsub();
  }, []);

  // Tutup dropdown jika mengklik di luar area
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hitung jumlah notifikasi belum dibaca
  const unreadCount = notifications.filter(
    n => new Date(n.Timestamp).getTime() > lastReadTime
  ).length;

  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleMarkAllRead = () => {
    const now = Date.now();
    setLastReadTime(now);
    localStorage.setItem('si_kasir_last_read_time', String(now));
  };

  return (
    <header className="topbar position-relative">
      <div className="d-flex align-items-center gap-3">
        <button
          className="btn btn-light d-lg-none rounded-3 shadow-sm border-0"
          onClick={toggleSidebar}
        >
          <i className="fa-solid fa-bars text-dark"></i>
        </button>
        <h5 className="mb-0 fw-bold text-dark">{title}</h5>
      </div>

      <div className="d-flex align-items-center gap-3" ref={dropdownRef}>
        {/* Search Bar */}
        <div className="d-none d-md-flex align-items-center bg-light rounded-pill px-3 py-1.5 border shadow-sm">
          <i className="fa-solid fa-magnifying-glass text-muted small me-2"></i>
          <input
            type="text"
            className="border-0 bg-transparent form-control-sm shadow-none"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ outline: 'none', width: '160px' }}
          />
        </div>

        {/* Bell Button */}
        <div className="position-relative">
          <button
            type="button"
            className="btn btn-light rounded-circle position-relative border-0 shadow-sm d-flex align-items-center justify-content-center"
            style={{ width: '42px', height: '42px', transition: '0.2s all' }}
            onClick={handleToggleDropdown}
            title="Riwayat Notifikasi & Aktivitas"
          >
            <i className="fa-regular fa-bell fs-5 text-dark"></i>
            {unreadCount > 0 && (
              <span
                className="position-absolute bg-danger text-white rounded-circle fw-bold d-flex align-items-center justify-content-center border border-white"
                style={{
                  width: '18px',
                  height: '18px',
                  fontSize: '0.65rem',
                  top: '-2px',
                  right: '-2px'
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATION DROPDOWN PANEL */}
          {showDropdown && (
            <div
              className="card border-0 shadow-lg rounded-4 overflow-hidden position-absolute end-0 mt-2"
              style={{
                width: '360px',
                maxWidth: '90vw',
                zIndex: 1060,
                top: '100%',
                animation: 'fadeInPage 0.25s ease-out'
              }}
            >
              {/* Header */}
              <div className="p-3 bg-white border-bottom d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="fw-bold m-0 text-dark">Riwayat Notifikasi</h6>
                  <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                    {notifications.length} aktivitas tersimpan
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    className="btn btn-sm btn-light text-primary rounded-pill fw-semibold px-2 py-1"
                    style={{ fontSize: '0.75rem' }}
                    onClick={handleMarkAllRead}
                  >
                    <i className="fa-solid fa-check-double me-1"></i> Tandai Dibaca
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="overflow-auto" style={{ maxHeight: '380px' }}>
                {notifications.length === 0 ? (
                  <div className="text-center py-5 px-3">
                    <i className="fa-regular fa-bell-slash text-muted fs-2 mb-2 d-block"></i>
                    <p className="small text-muted mb-0">Belum ada riwayat aktivitas.</p>
                  </div>
                ) : (
                  notifications.map((item) => {
                    const isUnread = new Date(item.Timestamp).getTime() > lastReadTime;
                    const style = getActionStyle(item.Action);

                    return (
                      <div
                        key={item.id}
                        className={`p-3 border-bottom d-flex align-items-start gap-3 transition-all ${
                          isUnread ? 'bg-light bg-opacity-75' : 'bg-white'
                        }`}
                        style={{ cursor: 'default' }}
                      >
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 shadow-xs mt-1"
                          style={{
                            width: '38px',
                            height: '38px',
                            backgroundColor: style.bg,
                            color: style.color
                          }}
                        >
                          <i className={`${style.icon} fs-6`}></i>
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="fw-bold text-dark small text-truncate">
                              {item.Username || 'Pengguna'}
                            </span>
                            <span className="small text-muted font-monospace ms-2" style={{ fontSize: '0.7rem' }}>
                              {formatRelativeTime(item.Timestamp)}
                            </span>
                          </div>
                          <p className="mb-1 text-secondary small" style={{ fontSize: '0.82rem', lineHeight: '1.4' }}>
                            {item.Detail || item.Action}
                          </p>
                          <span
                            className="badge border font-monospace"
                            style={{
                              fontSize: '0.68rem',
                              backgroundColor: style.bg,
                              color: style.color,
                              borderColor: `${style.color}30`
                            }}
                          >
                            {style.label}
                          </span>
                        </div>
                        {isUnread && (
                          <span
                            className="bg-primary rounded-circle flex-shrink-0 mt-2"
                            style={{ width: '8px', height: '8px' }}
                          ></span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-2 bg-light text-center border-top">
                <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                  <i className="fa-solid fa-shield-halved me-1 text-success"></i>
                  Disinkronkan secara real-time dengan Firebase
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

