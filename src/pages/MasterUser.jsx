import React, { useState, useEffect } from 'react';
import { getFirebaseDataAsArray, saveUser, deleteUser, syncAllUsersToAuth } from '../services/firebase';
import { onValue, ref } from 'firebase/database';
import { db } from '../services/firebase';
import Swal from 'sweetalert2';
import { showSuccessToast, showErrorToast } from '../utils/toast';

export default function MasterUser() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    nama: '',
    username: '',
    password: '',
    role: 'Kasir',
    status: 'Aktif',
    existingPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);

  // Password validation states
  const hasLower = /[a-z]/.test(formData.password);
  const hasUpper = /[A-Z]/.test(formData.password);
  const hasNumber = /[0-9]/.test(formData.password);
  const hasLength = formData.password.length >= 8;
  
  const isPasswordValid = hasLower && hasUpper && hasNumber && hasLength;

  const handleSyncFirebase = async () => {
    setSyncing(true);
    const res = await syncAllUsersToAuth();
    setSyncing(false);

    if (res.success) {
      showSuccessToast(
        'Sinkronisasi Berhasil!',
        `Semua ${res.total} akun terverifikasi di Firebase Auth Console. (${res.syncedCount} baru terdaftar, ${res.existingCount} sudah aktif)`
      );
    } else {
      showErrorToast('Gagal Sinkronisasi', res.message);
    }
  };
  
  // For edit mode, if password is empty, it's valid (keeps old password)
  const canSubmit = formData.nama.trim() && formData.username.trim() && 
    (isEdit ? (formData.password === '' || isPasswordValid) : isPasswordValid);

  useEffect(() => {
    const usersRef = ref(db, 'Users');
    const unsub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.keys(data).map(key => ({
          ...data[key],
          _id: key
        }));
        setUsers(parsed);
      } else {
        setUsers([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setFormData({ id: '', nama: '', username: '', password: '', role: 'Kasir', status: 'Aktif', existingPassword: '' });
    setShowPassword(false);
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setIsEdit(true);
      setFormData({
        id: user.UserID,
        nama: user.Nama || '',
        username: user.Username || '',
        password: '',
        role: user.Role || 'Kasir',
        status: user.Status || 'Aktif',
        existingPassword: user.Password || ''
      });
    } else {
      setIsEdit(false);
      resetForm();
    }
    setShowModal(true);
  };

  const handleOpenPwdModal = (user) => {
    setSelectedUser(user);
    setFormData({
      id: user.UserID,
      nama: user.Nama || '',
      username: user.Username || '',
      password: '',
      role: user.Role || 'Kasir',
      status: user.Status || 'Aktif',
      existingPassword: user.Password || ''
    });
    setShowPwdModal(true);
  };

  const handleSavePwd = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) return;
    
    Swal.fire({ title: 'Menyimpan Password...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const res = await saveUser({ ...formData, isEdit: true });
    Swal.close();
    if (res.success) {
      showSuccessToast('Berhasil', 'Password berhasil diubah!');
      setShowPwdModal(false);
      resetForm();
    } else {
      showErrorToast('Gagal', res.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const res = await saveUser({ ...formData, isEdit });
    Swal.close();
    if (res.success) {
      showSuccessToast('Berhasil', 'Data user berhasil disimpan!');
      setShowModal(false);
    } else {
      showErrorToast('Gagal', res.message);
    }
  };

  const handleDelete = async (id, nama) => {
    const result = await Swal.fire({
      title: 'Hapus User?',
      text: `Apakah Anda yakin ingin menghapus user ${nama}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const res = await deleteUser(id);
      Swal.close();
      if (res.success) {
        showSuccessToast('Terhapus!', 'User telah dihapus.');
      } else {
        showErrorToast('Gagal Hapus', res.message);
      }
    }
  };

  const ChecklistItem = ({ isValid, text }) => (
    <div className="d-flex align-items-center mb-1" style={{ color: isValid ? '#16a34a' : '#9ca3af', transition: '0.2s color' }}>
      <i className={`fa-solid ${isValid ? 'fa-check' : 'fa-xmark'} me-2`} style={{ width: '16px' }}></i>
      <span style={{ fontSize: '0.85rem' }}>{text}</span>
    </div>
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold text-dark mb-1">Master User</h4>
          <p className="text-muted mb-0 small">Kelola data pengguna aplikasi & autentikasi</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-success shadow-sm"
            onClick={handleSyncFirebase}
            disabled={syncing}
            title="Daftarkan seluruh user ke Firebase Authentication Console"
          >
            {syncing ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Menyinkronkan...
              </>
            ) : (
              <>
                <i className="fa-solid fa-rotate me-2"></i> Sinkronkan ke Firebase Auth
              </>
            )}
          </button>
          <button className="btn btn-primary shadow-sm" onClick={() => handleOpenModal()}>
            <i className="fa-solid fa-plus me-2"></i> Tambah User
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="py-3">Username</th>
                  <th className="py-3">Role</th>
                  <th className="py-3">Status</th>
                  <th className="text-end px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-4">Memuat data...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-4">Tidak ada data user.</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u._id}>
                      <td className="px-4 py-3 fw-bold">{u.Nama}</td>
                      <td className="py-3 text-muted">{u.Username}</td>
                      <td className="py-3">
                        <span className={`badge ${u.Role === 'Admin' || u.Role === 'Super Admin' ? 'bg-primary' : 'bg-info'}`}>
                          {u.Role}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`badge ${u.Status === 'Aktif' ? 'bg-success' : 'bg-danger'}`}>
                          {u.Status}
                        </span>
                      </td>
                      <td className="text-end px-4 py-3">
                        <button className="btn btn-sm btn-light me-2" onClick={() => handleOpenModal(u)} title="Edit Profil">
                          <i className="fa-solid fa-pen text-primary"></i>
                        </button>
                        <button className="btn btn-sm btn-light me-2" onClick={() => handleOpenPwdModal(u)} title="Ganti Password">
                          <i className="fa-solid fa-key text-warning"></i>
                        </button>
                        <button className="btn btn-sm btn-light" onClick={() => handleDelete(u.UserID, u.Nama)} title="Hapus User">
                          <i className="fa-solid fa-trash text-danger"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                <div className="modal-header bg-light border-0 px-4 py-3">
                  <h5 className="modal-title fw-bold">{isEdit ? 'Edit User' : 'Tambah User Baru'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                
                <form onSubmit={handleSave}>
                  <div className="modal-body px-4 py-4">
                    
                    <div className="mb-3">
                      <label className="form-label fw-bold small text-muted mb-1">Nama Lengkap</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.nama} 
                        onChange={e => setFormData({...formData, nama: e.target.value})} 
                        required 
                        placeholder="Contoh: John Doe"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label fw-bold small text-muted mb-1">Username</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.username} 
                        onChange={e => setFormData({...formData, username: e.target.value})} 
                        required 
                        placeholder="Contoh: johndoe"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-bold small text-muted mb-1">
                        Password {isEdit && <span className="text-secondary fw-normal">(Kosongkan jika tidak ingin mengubah)</span>}
                      </label>
                      <div className="input-group">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          className="form-control" 
                          value={formData.password} 
                          onChange={e => setFormData({...formData, password: e.target.value})} 
                          placeholder="Masukkan password"
                          required={!isEdit}
                        />
                        <span 
                          className="input-group-text bg-white" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-muted`}></i>
                        </span>
                      </div>
                      
                      {/* Password Checklist UI */}
                      {(formData.password.length > 0 || !isEdit) && (
                        <div className="mt-3 p-3 bg-light rounded-3">
                          <ChecklistItem isValid={hasLower} text="At least one lowercase letter" />
                          <ChecklistItem isValid={hasLength} text="Minimum 8 characters" />
                          <ChecklistItem isValid={hasUpper} text="At least one uppercase letter" />
                          <ChecklistItem isValid={hasNumber} text="At least one number" />
                        </div>
                      )}
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-bold small text-muted mb-1">Role</label>
                        <select 
                          className="form-select" 
                          value={formData.role} 
                          onChange={e => setFormData({...formData, role: e.target.value})}
                        >
                          <option value="Kasir">Kasir</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold small text-muted mb-1">Status</label>
                        <select 
                          className="form-select" 
                          value={formData.status} 
                          onChange={e => setFormData({...formData, status: e.target.value})}
                        >
                          <option value="Aktif">Aktif</option>
                          <option value="Nonaktif">Nonaktif</option>
                        </select>
                      </div>
                    </div>

                  </div>
                  
                  <div className="modal-footer bg-light border-0 px-4 py-3">
                    <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Batal</button>
                    <button type="submit" className="btn btn-primary shadow-sm" disabled={!canSubmit}>
                      <i className="fa-solid fa-save me-1"></i> Simpan
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>
        </>
      )}

      {showPwdModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                <div className="modal-header bg-light border-0 px-4 py-3">
                  <h5 className="modal-title fw-bold">Ganti Password: {selectedUser?.Nama}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowPwdModal(false)}></button>
                </div>
                
                <form onSubmit={handleSavePwd}>
                  <div className="modal-body px-4 py-4">
                    <div className="mb-4">
                      <label className="form-label fw-bold small text-muted mb-1">Password Baru</label>
                      <div className="input-group">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          className="form-control" 
                          value={formData.password} 
                          onChange={e => setFormData({...formData, password: e.target.value})} 
                          placeholder="Masukkan password baru"
                          required
                        />
                        <span 
                          className="input-group-text bg-white" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-muted`}></i>
                        </span>
                      </div>
                      
                      {formData.password.length > 0 && (
                        <div className="mt-3 p-3 bg-light rounded-3">
                          <ChecklistItem isValid={hasLower} text="At least one lowercase letter" />
                          <ChecklistItem isValid={hasLength} text="Minimum 8 characters" />
                          <ChecklistItem isValid={hasUpper} text="At least one uppercase letter" />
                          <ChecklistItem isValid={hasNumber} text="At least one number" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="modal-footer bg-light border-0 px-4 py-3">
                    <button type="button" className="btn btn-light" onClick={() => setShowPwdModal(false)}>Batal</button>
                    <button type="submit" className="btn btn-primary shadow-sm" disabled={!isPasswordValid}>
                      <i className="fa-solid fa-save me-1"></i> Update Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
