import React, { useState, useEffect } from 'react';
import splashImg from '../assets/splash_loading.jpg';

export default function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Memulai Sistem SI-KASIR RME...');
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2200; // 2.2 detik untuk animasi loading yang mulus

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawPct = Math.min(Math.round((elapsed / duration) * 100), 100);

      setProgress(rawPct);

      if (rawPct < 30) {
        setStatusText('Memulai Sistem SI-KASIR RME...');
      } else if (rawPct < 65) {
        setStatusText('Memuat Konfigurasi & Basis Data...');
      } else if (rawPct < 95) {
        setStatusText('Menyiapkan Sesi & Antarmuka...');
      } else {
        setStatusText('Selesai! Membuka aplikasi...');
      }

      if (rawPct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            if (onFinish) onFinish();
          }, 400); // Waktu animasi fade-out
        }, 200);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#0a3d24',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? 'scale(1.02)' : 'scale(1)',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}
    >
      {/* Background Ambient Blur on Desktop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${splashImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(24px) brightness(0.4)',
          transform: 'scale(1.1)',
          zIndex: 1
        }}
      />

      {/* Main Poster Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '480px',
          height: '100%',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          backgroundColor: '#000'
        }}
      >
        {/* Splash Image */}
        <img
          src={splashImg}
          alt="SI-KASIR RME Puskesmas Cermee"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
        />

        {/* Bottom Dark Gradient for Text & Progress Bar Readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(5, 36, 20, 0.95) 0%, rgba(5, 36, 20, 0.75) 20%, rgba(5, 36, 20, 0.1) 45%, transparent 60%)',
            zIndex: 2,
            pointerEvents: 'none'
          }}
        />

        {/* Bottom Progress Bar & Percentage UI */}
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            width: '100%',
            padding: '24px 28px 36px 28px',
            textAlign: 'center'
          }}
        >
          {/* Progress Percentage & Status */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              color: '#ffffff',
              fontSize: '0.85rem'
            }}
          >
            <span
              style={{
                fontWeight: '600',
                letterSpacing: '0.3px',
                color: '#e2f5ea',
                textShadow: '0 2px 4px rgba(0,0,0,0.6)'
              }}
            >
              {statusText}
            </span>
            <span
              style={{
                fontWeight: '800',
                fontFamily: 'monospace',
                fontSize: '1rem',
                color: '#4ade80',
                textShadow: '0 0 10px rgba(74, 222, 128, 0.5)'
              }}
            >
              {progress}%
            </span>
          </div>

          {/* Progress Track */}
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(8px)',
              borderRadius: '999px',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
              position: 'relative'
            }}
          >
            {/* Progress Fill */}
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)',
                borderRadius: '999px',
                transition: 'width 0.05s linear',
                boxShadow: '0 0 12px rgba(52, 211, 153, 0.8)'
              }}
            />
          </div>

          <div
            style={{
              marginTop: '12px',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.72rem',
              fontWeight: '500',
              letterSpacing: '0.5px'
            }}
          >
            Puskesmas Cermee • Dinas Kesehatan Bondowoso
          </div>
        </div>
      </div>
    </div>
  );
}
