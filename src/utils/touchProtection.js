/**
 * Utility untuk mematikan Pull-to-Refresh dan Swipe Kanan/Kiri (Gesture Back/Forward) di Layar HP
 * Memastikan navigasi murni melalui klik tombol/menu SI-KASIR tanpa reload ke loading screen.
 */

export function initTouchProtection() {
  if (typeof window === 'undefined') return;

  let startX = 0;
  let startY = 0;

  // Helper untuk cek apakah elemen atau parentnya bisa di-scroll secara horizontal (misal tabel data)
  const isHorizontallyScrollable = (element) => {
    let current = element;
    while (current && current !== document.body && current !== document.documentElement) {
      const style = window.getComputedStyle(current);
      const overflowX = style.overflowX;
      if (
        (overflowX === 'auto' || overflowX === 'scroll') &&
        current.scrollWidth > current.clientWidth
      ) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  };

  // Helper untuk cek apakah elemen atau parentnya sedang dalam posisi scroll > 0 (bukan di pucuk atas)
  const getScrollTopParent = (element) => {
    let current = element;
    while (current && current !== document.body && current !== document.documentElement) {
      if (current.scrollTop > 0) {
        return current.scrollTop;
      }
      current = current.parentElement;
    }
    return window.scrollY || document.documentElement.scrollTop || 0;
  };

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // 1. Matikan Pull-to-Refresh (Tarik layar ke bawah saat di paling atas)
    if (deltaY > 0 && absDeltaY > absDeltaX) {
      const scrollTop = getScrollTopParent(e.target);
      if (scrollTop <= 0) {
        // Sedang di posisi paling atas dan menarik layar ke bawah -> cegah pull-to-refresh browser
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }

    // 2. Matikan Swipe Kanan/Kiri (Gesture Back / Forward browser di HP)
    if (absDeltaX > absDeltaY && absDeltaX > 8) {
      // Jika swipe dimulai dari tepi layar (edge gesture <= 35px atau >= window.innerWidth - 35px)
      const isEdgeSwipe = startX <= 35 || startX >= (window.innerWidth - 35);
      
      // Jika gesture tepi layar ATAU target bukan elemen tabel/scroll horizontal
      if (isEdgeSwipe || !isHorizontallyScrollable(e.target)) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }
  };

  // Pasang listener dengan passive: false agar e.preventDefault() dapat bekerja dengan baik
  window.addEventListener('touchstart', handleTouchStart, { passive: true });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
}
