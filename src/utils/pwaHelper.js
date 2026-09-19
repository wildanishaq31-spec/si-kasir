import { useState, useEffect } from 'react';

/**
 * Cek apakah aplikasi sedang berjalan dalam mode PWA Standalone (Desktop App / Mobile App)
 */
export function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Cek apakah browser siap menampilkan prompt instalasi PWA
 */
export function isInstallPromptAvailable() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.deferredPWAInstallPrompt);
}

/**
 * Trigger prompt instalasi PWA bawaan browser
 * @returns {Promise<{ outcome: 'accepted' | 'dismissed' | 'unavailable' }>}
 */
export async function triggerPWAInstall() {
  if (typeof window === 'undefined' || !window.deferredPWAInstallPrompt) {
    return { outcome: 'unavailable' };
  }

  const promptEvent = window.deferredPWAInstallPrompt;
  try {
    promptEvent.prompt();
    const choiceResult = await promptEvent.userChoice;
    if (choiceResult.outcome === 'accepted') {
      window.deferredPWAInstallPrompt = null;
    }
    return choiceResult;
  } catch (err) {
    console.error('Error triggering PWA install:', err);
    return { outcome: 'unavailable', error: err.message };
  }
}

/**
 * React Hook untuk mendeteksi status instalasi PWA secara reaktif
 */
export function usePWAInstall() {
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneMode());
  const [canInstall, setCanInstall] = useState(() => isInstallPromptAvailable());
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleInstallable = () => {
      setCanInstall(true);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setIsStandalone(true);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);

    // Initial check
    if (isInstallPromptAvailable()) {
      setCanInstall(true);
    }
    if (isStandaloneMode()) {
      setIsStandalone(true);
    }

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const promptInstall = async () => {
    const res = await triggerPWAInstall();
    if (res.outcome === 'accepted') {
      setCanInstall(false);
      setIsInstalled(true);
    }
    return res;
  };

  return {
    isStandalone,
    canInstall,
    isInstalled,
    promptInstall
  };
}
