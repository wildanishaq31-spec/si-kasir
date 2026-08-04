import Swal from 'sweetalert2';

/**
 * Konfigurasi SweetAlert2 Toast di Pojok Kanan Atas (top-end)
 * Menyediakan notifikasi melayang yang otomatis hilang dengan progress bar
 */
export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  customClass: {
    popup: 'colored-toast shadow-lg rounded-4 border-0'
  },
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

/**
 * Tampilkan Notifikasi Sukses di Pojok Kanan Atas
 * @param {string} title - Judul utama
 * @param {string} text - Pesan opsional
 */
export const showSuccessToast = (title, text = '') => {
  return Toast.fire({
    icon: 'success',
    title: title,
    text: text
  });
};

/**
 * Tampilkan Notifikasi Error di Pojok Kanan Atas
 * @param {string} title - Judul utama / pesan error
 * @param {string} text - Pesan opsional
 */
export const showErrorToast = (title, text = '') => {
  return Toast.fire({
    icon: 'error',
    title: title,
    text: text
  });
};

/**
 * Tampilkan Notifikasi Peringatan di Pojok Kanan Atas
 * @param {string} title - Judul utama
 * @param {string} text - Pesan opsional
 */
export const showWarningToast = (title, text = '') => {
  return Toast.fire({
    icon: 'warning',
    title: title,
    text: text
  });
};

/**
 * Tampilkan Notifikasi Informasi di Pojok Kanan Atas
 * @param {string} title - Judul utama
 * @param {string} text - Pesan opsional
 */
export const showInfoToast = (title, text = '') => {
  return Toast.fire({
    icon: 'info',
    title: title,
    text: text
  });
};
