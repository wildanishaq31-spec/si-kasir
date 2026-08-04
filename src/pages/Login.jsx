import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, isFirebaseAuthConfigured } from '../services/firebase';
import logoCermee from '../assets/logo_cermee.jpg';
import Swal from 'sweetalert2';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const isAuthConfigured = isFirebaseAuthConfigured();

  // Cek jika pengguna diarahkan karena sesi login kadaluarsa
  useEffect(() => {
    const isExpired = localStorage.getItem('si_kasir_session_expired');
    if (isExpired === 'true') {
      localStorage.removeItem('si_kasir_session_expired');
      Swal.fire({
        title: 'Sesi Berakhir',
        text: 'Sesi login Anda telah habis masa berlakunya. Silakan login ulang.',
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#6366f1',
        customClass: {
          popup: 'rounded-4 p-4 shadow-lg border-0',
          title: 'fw-bold text-dark fs-4 mb-2',
          htmlContainer: 'text-secondary mb-3',
          confirmButton: 'px-4 py-2 rounded-3 fw-semibold'
        }
      });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await loginUser(username, password);
    setLoading(false);

    if (res.success) {
      login(res.user, rememberMe);
      navigate('/');
    } else {
      setError(res.message || 'Login gagal!');
    }
  };

  return (
    <div 
      className="login-wrapper" 
      style={{ 
        background: 'linear-gradient(135deg, rgba(24, 152, 92, 0.85) 0%, rgba(17, 120, 73, 0.95) 100%), url("https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80") center/cover no-repeat',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="card border-0 shadow-lg" 
        style={{ 
          width: '100%', 
          maxWidth: '850px', 
          borderRadius: '16px', 
          background: 'rgba(244, 247, 242, 0.95)',
          backdropFilter: 'blur(10px)',
          overflow: 'hidden'
        }}
      >
        <div className="row g-0">
          {/* LEFT COLUMN */}
          <div className="col-md-6 d-none d-md-flex flex-column align-items-center justify-content-center p-5" style={{ borderRight: '1px solid rgba(0,0,0,0.1)' }}>
            
            <div className="bg-white rounded-circle d-flex align-items-center justify-content-center mb-4" style={{ width: '180px', height: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', opacity: 0, animation: 'fadeInPage 0.8s ease-out 0.1s forwards' }}>
              <img src={logoCermee} alt="Logo Puskesmas" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
            </div>

            <div style={{ opacity: 0, animation: 'fadeInPage 0.8s ease-out 0.2s forwards' }} className="text-center">
              <h3 className="fw-bold text-dark mb-1">SI-KASIR <span style={{ color: '#18985c' }}>RME</span></h3>
              <p className="text-muted small mb-3">Puskesmas Management System</p>
            </div>
            
            <div className="text-center px-4 mb-4" style={{ opacity: 0, animation: 'fadeInPage 0.8s ease-out 0.3s forwards' }}>
              <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                Sistem informasi terpadu untuk pencatatan transaksi kasir, manajemen pasien, dan pelaporan LPPKP di lingkungan UPTD Puskesmas Cermee.
              </p>
            </div>

            <div className="d-flex justify-content-center gap-4 w-100 px-4 mt-2">
              <div className="text-center" style={{ opacity: 0, animation: 'fadeInPage 0.8s ease-out 0.5s forwards' }}>
                <div className="bg-white shadow-sm rounded-circle d-flex align-items-center justify-content-center mb-2 mx-auto" style={{ width: '45px', height: '45px', color: '#18985c' }}>
                  <i className="fa-solid fa-bolt"></i>
                </div>
                <span className="small text-muted fw-medium" style={{ fontSize: '0.75rem' }}>Cepat</span>
              </div>
              <div className="text-center" style={{ opacity: 0, animation: 'fadeInPage 0.8s ease-out 0.5s forwards' }}>
                <div className="bg-white shadow-sm rounded-circle d-flex align-items-center justify-content-center mb-2 mx-auto" style={{ width: '45px', height: '45px', color: '#18985c' }}>
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <span className="small text-muted fw-medium" style={{ fontSize: '0.75rem' }}>Akurat</span>
              </div>
              <div className="text-center" style={{ opacity: 0, animation: 'fadeInPage 0.8s ease-out 0.5s forwards' }}>
                <div className="bg-white shadow-sm rounded-circle d-flex align-items-center justify-content-center mb-2 mx-auto" style={{ width: '45px', height: '45px', color: '#18985c' }}>
                  <i className="fa-solid fa-chart-line"></i>
                </div>
                <span className="small text-muted fw-medium" style={{ fontSize: '0.75rem' }}>Terpadu</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="col-md-6 p-4 p-md-5 d-flex flex-column justify-content-center">
            
            <div className="mb-4" style={{ opacity: 0, animation: 'fadeInPage 0.8s ease-out 0.2s forwards' }}>
              <h3 className="fw-bold text-dark mb-1">Welcome to <span style={{ color: '#18985c' }}>Login</span></h3>
              <p className="text-muted small mb-0">Silakan masukkan akun Anda</p>
            </div>

            {!isAuthConfigured && (
              <div className="alert alert-warning p-3 small rounded-3 mb-3">
                <i className="fa-solid fa-triangle-exclamation me-2"></i>
                <strong>Firebase Web API Key Belum Diisi:</strong>
                <br />
                Harap masukkan <code>VITE_FIREBASE_API_KEY</code> di file <code>.env</code>. Dapatkan nilai ini dari Firebase Console → Project Settings → General → Web Apps.
              </div>
            )}

            {error && (
              <div className="alert alert-danger p-2 small text-center rounded-3 mb-3">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="mb-3" style={{ opacity: 0, animation: 'fadeInPage 0.8s ease-out 0.3s forwards' }}>
                <div className="input-group input-group-lg bg-white rounded-3 overflow-hidden shadow-sm border border-light">
                  <span className="input-group-text bg-transparent border-0 text-muted px-3"><i className="fa-regular fa-user" style={{ fontSize: '1rem' }}></i></span>
                  <input
                    type="text"
                    className="form-control border-0 ps-0 fs-6 shadow-none"
                    placeholder="Masukkan username..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{ fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              <div className="mb-4" style={{ opacity: 0, animation: 'fadeInPage 0.8s ease-out 0.4s forwards' }}>
                <div className="input-group input-group-lg bg-white rounded-3 overflow-hidden shadow-sm border border-light">
                  <span className="input-group-text bg-transparent border-0 text-muted px-3"><i className="fa-solid fa-lock" style={{ fontSize: '1rem' }}></i></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control border-0 ps-0 fs-6 shadow-none"
                    placeholder="Masukkan password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ fontSize: '0.95rem' }}
                  />
                  <span 
                    className="input-group-text bg-transparent border-0 text-muted px-3"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={showPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} style={{ fontSize: '1rem' }}></i>
                  </span>
                </div>
              </div>

              <div className="mb-4 d-flex justify-content-between align-items-center" style={{ opacity: 0, animation: 'fadeInPage 0.8s ease-out 0.5s forwards' }}>
                <div className="form-check">
                  <input 
                    className="form-check-input shadow-none" 
                    type="checkbox" 
                    id="rememberMe" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label className="form-check-label text-muted small" htmlFor="rememberMe" style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Remember Me
                  </label>
                </div>
              </div>

              <div style={{ opacity: 0, animation: 'fadeInPage 0.8s ease-out 0.6s forwards' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn w-100 btn-lg rounded-3 fw-bold shadow-sm d-flex justify-content-center align-items-center"
                  style={{ background: '#18985c', color: '#fff', fontSize: '1rem', padding: '12px' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      Sign In <i className="fa-solid fa-arrow-right ms-2"></i>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Session Validity Notice Box */}
            <div
              className="mt-4 p-3 rounded-4 border-0 d-flex align-items-center justify-content-center text-center shadow-xs"
              style={{
                backgroundColor: '#eefbf3',
                color: '#117849',
                fontSize: '0.85rem',
                opacity: 0,
                animation: 'fadeInPage 0.8s ease-out 0.7s forwards'
              }}
            >
              <i className="fa-regular fa-circle-check fs-5 me-2 flex-shrink-0" style={{ color: '#10b981' }}></i>
              <span>
                Sesi Anda valid <strong>12 Jam</strong> (atau 7 Hari jika "Remember Me" dicentang).
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
