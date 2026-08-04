import React, { createContext, useContext, useState, useEffect } from 'react';
import { onValue, ref, set } from 'firebase/database';
import { db, logoutFirebaseUser } from '../services/firebase';

const AuthContext = createContext(null);

const DEFAULT_PERMISSIONS = {
  masterTtd: false,
  masterUser: false,
  masterPrint: false,
  masterWa: false,
  riwayatImport: false,
  lapPendapatan: false,
  lppkp: false
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('si_kasir_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Cek jika sesi sudah kadaluarsa
        if (parsed.expireAt && Date.now() > parsed.expireAt) {
          localStorage.removeItem('si_kasir_user');
          localStorage.setItem('si_kasir_session_expired', 'true');
          return null;
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [permissions, setPermissions] = useState({
    Kasir: DEFAULT_PERMISSIONS,
    Bendahara: DEFAULT_PERMISSIONS
  });

  // Real-time listener untuk Settings/HakAksesRole dari Firebase RTDB
  useEffect(() => {
    const hakAksesRef = ref(db, 'Settings/HakAksesRole');
    const unsub = onValue(hakAksesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setPermissions({
          Kasir: { ...DEFAULT_PERMISSIONS, ...(data.Kasir || {}) },
          Bendahara: { ...DEFAULT_PERMISSIONS, ...(data.Bendahara || {}) }
        });
      } else {
        setPermissions({
          Kasir: DEFAULT_PERMISSIONS,
          Bendahara: DEFAULT_PERMISSIONS
        });
      }
    });
    return () => unsub();
  }, []);

  // Auto logout jika expired saat aplikasi sedang dibuka
  useEffect(() => {
    if (user && user.expireAt) {
      const timeUntilExpiry = user.expireAt - Date.now();
      if (timeUntilExpiry > 0) {
        const maxTimeout = 2147483647;
        const delay = Math.min(timeUntilExpiry, maxTimeout);
        const timer = setTimeout(() => {
          localStorage.setItem('si_kasir_session_expired', 'true');
          logout();
          window.location.reload();
        }, delay);
        return () => clearTimeout(timer);
      } else {
        localStorage.setItem('si_kasir_session_expired', 'true');
        logout();
      }
    }
  }, [user]);

  const login = (userData, rememberMe = false) => {
    const expiresIn = rememberMe ? 604800000 : 43200000;
    const expireAt = Date.now() + expiresIn;
    
    const userWithExpiry = { ...userData, expireAt };
    setUser(userWithExpiry);
    localStorage.setItem('si_kasir_user', JSON.stringify(userWithExpiry));
  };

  const logout = async () => {
    await logoutFirebaseUser();
    setUser(null);
    localStorage.removeItem('si_kasir_user');
  };

  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin';

  /**
   * Cek apakah user berhak mengakses menu tertentu.
   * Admin selalu mendapat izin (true).
   * Kasir dan Bendahara bergantung pada toggle ON/OFF di permissions.
   */
  const hasPermission = (menuKey) => {
    if (!user) return false;
    if (isAdmin) return true;
    const role = user.role;
    if (!permissions[role]) return false;
    return Boolean(permissions[role][menuKey]);
  };

  /**
   * Update status toggle Hak Akses di Firebase RTDB berdasarkan role
   */
  const updatePermission = async (role, menuKey, value) => {
    try {
      await set(ref(db, `Settings/HakAksesRole/${role}/${menuKey}`), value);
      return { success: true };
    } catch (err) {
      console.error('Update permission error:', err);
      return { success: false, message: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin,
        permissions,
        hasPermission,
        updatePermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

