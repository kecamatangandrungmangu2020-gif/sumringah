"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const formatHeroImage = (raw) => {
  if (!raw || typeof raw !== 'string') return '/hero-Kecamatan.jpg';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
    return raw;
  }
  return `data:image/jpeg;base64,${raw}`;
};

export default function Home() {
  const [heroBg, setHeroBg] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          const raw = parsed.heroPhotoUrl || parsed.heroPhotoBase64;
          if (raw) return formatHeroImage(raw);
        }
      } catch (e) {}
    }
    return '/hero-Kecamatan.jpg';
  });

  const [logoTambahan, setLogoTambahan] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.logoTambahanUrl) return parsed.logoTambahanUrl;
        }
      } catch (e) {}
    }
    return '';
  });

  // Ambil Foto Halaman Utama & Logo Tambahan dari Pengaturan (/settings/ - settings/village)
  useEffect(() => {
    // 1. Fetch cepat dari API
    fetch('/api/village-profile/?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data) {
          const raw = data.heroPhotoUrl || data.heroPhotoBase64;
          if (raw) setHeroBg(formatHeroImage(raw));
          if (data.logoTambahanUrl) setLogoTambahan(data.logoTambahanUrl);
        }
      })
      .catch(() => {});

    // 2. Real-time snapshot dari Firestore
    if (db) {
      const unsub = onSnapshot(doc(db, 'settings', 'village'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const raw = d.heroPhotoUrl || d.heroPhotoBase64;
          if (raw) setHeroBg(formatHeroImage(raw));
          if (d.logoTambahanUrl) setLogoTambahan(d.logoTambahanUrl);
        }
      }, (err) => console.warn('Snapshot error:', err));
      return () => unsub();
    }
  }, []);

  return (
    <div
      style={{
        backgroundImage: `linear-gradient(rgba(10, 15, 29, 0.84), rgba(10, 15, 29, 0.94)), url('${heroBg}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '30px 16px 50px',
        color: '#ffffff',
        position: 'relative'
      }}
    >
      {/* Top Bar: Navigasi ke Beranda Utama & Status Portal */}
      <div className="container mb-4" style={{ maxWidth: '1100px' }}>
        <div className="d-flex justify-content-between align-items-center">
          <Link
            href="/"
            className="btn btn-sm rounded-pill px-3.5 py-2 text-white d-inline-flex align-items-center gap-2 shadow-sm"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              transition: 'all 0.25s ease'
            }}
          >
            <i className="bi bi-house-door-fill text-warning"></i>
            <span className="small fw-semibold">Beranda Utama</span>
          </Link>

          <span
            className="badge rounded-pill px-3 py-1.5 small fw-bold font-monospace d-inline-flex align-items-center gap-1.5"
            style={{
              background: 'rgba(251, 191, 36, 0.15)',
              border: '1px solid rgba(251, 191, 36, 0.35)',
              color: '#fbbf24'
            }}
          >
            <span className="spinner-grow spinner-grow-sm text-warning" style={{ width: '8px', height: '8px' }}></span>
            PORTAL SISTEM ANTRIAN
          </span>
        </div>
      </div>

      <div className="container text-center my-auto" style={{ maxWidth: '1100px' }}>
        {/* Header Branding Card */}
        <div
          className="text-center mb-5 p-4 p-md-5 rounded-4 shadow-2xl position-relative overflow-hidden antrian-glass"
          style={{
            border: '2px solid rgba(251, 191, 36, 0.35)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}
        >
          {/* Logo Instansi */}
          <div className="d-flex align-items-center justify-content-center mb-3">
            {logoTambahan ? (
              <img
                src={logoTambahan}
                alt="Logo Sistem Antrian"
                style={{
                  maxWidth: '680px',
                  width: '100%',
                  height: 'auto',
                  maxHeight: '105px',
                  aspectRatio: '13 / 2',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.6))'
                }}
              />
            ) : (
              <div className="d-flex align-items-center justify-content-center gap-4 flex-wrap">
                <img src="/img/Logo.png" alt="Logo Cilacap" style={{ height: '80px', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }} />
                <div style={{ width: '2px', height: '50px', background: 'rgba(255,255,255,0.25)' }}></div>
                <img src="/img/cilacap-bercahaya.png" alt="Logo Cilacap Bercahaya" style={{ height: '70px', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }} />
                <div style={{ width: '2px', height: '50px', background: 'rgba(255,255,255,0.25)' }}></div>
                <img src="/img/logo-semringah.png" alt="Logo Gandrung Mangu Semringah" style={{ height: '85px', objectFit: 'contain', filter: 'drop-shadow(0 4px 15px rgba(251,191,36,0.3))' }} />
              </div>
            )}
          </div>

          {/* Slogan Badge */}
          <div className="mb-3">
            <span
              className="badge px-3.5 py-1.5 rounded-pill fw-bold shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: '#0f172a',
                fontSize: '0.825rem',
                letterSpacing: '0.4px',
                border: '1px solid #fef08a'
              }}
            >
              <i className="bi bi-stars me-1"></i> "SEMAngat memberIkan pelayanan NGgawe bungAH"
            </span>
          </div>

          <h1
            className="fw-extrabold text-white mb-2"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              letterSpacing: '-0.5px',
              textShadow: '0 4px 16px rgba(0,0,0,0.6)'
            }}
          >
            Portal Sistem Antrian Terpadu
          </h1>
          <p
            className="m-0 text-white-50 mx-auto"
            style={{ maxWidth: '650px', fontSize: '0.95rem' }}
          >
            Pusat manajemen dan operasional loket antrian pelayanan terintegrasi real-time cloud Kecamatan Gandrungmangu.
          </p>
        </div>

        {/* 4 Main Operational Cards (Masuk Akun Warga Dibuang) */}
        <div className="row justify-content-center g-3 g-md-4">

          {/* 1. Kiosk Antrian */}
          <div className="col-12 col-sm-6 col-lg-3">
            <Link
              href="/Antrian/kiosk"
              className="h-100 text-decoration-none p-4 d-flex flex-column justify-content-between text-white antrian-glass antrian-glass-hover glow-cyan"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '22px',
                color: '#ffffff'
              }}
            >
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span
                    className="badge rounded-pill px-2.5 py-1 text-[10px] fw-bold uppercase"
                    style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                  >
                    LAYAR SENTUH
                  </span>
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center"
                    style={{ width: '42px', height: '42px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                  >
                    <i className="bi bi-ticket-detailed-fill fs-4" style={{ color: '#38bdf8' }}></i>
                  </div>
                </div>

                <h4 className="fw-bold mb-2 text-white" style={{ fontSize: '1.25rem' }}>Kiosk Antrian</h4>
                <p className="small m-0 leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                  Layar sentuh cetak nomor tiket antrian fisik untuk warga di lokasi.
                </p>
              </div>

              <div className="pt-4 border-top border-white border-opacity-10 d-flex align-items-center justify-content-between mt-3">
                <span className="small fw-bold" style={{ color: '#38bdf8' }}>Buka Layar Kiosk</span>
                <i className="bi bi-arrow-right fs-6" style={{ color: '#38bdf8' }}></i>
              </div>
            </Link>
          </div>

          {/* 2. Layar Display TV */}
          <div className="col-12 col-sm-6 col-lg-3">
            <Link
              href="/Antrian/display"
              className="h-100 text-decoration-none p-4 d-flex flex-column justify-content-between text-white antrian-glass antrian-glass-hover glow-indigo"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '22px',
                color: '#ffffff'
              }}
            >
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span
                    className="badge rounded-pill px-2.5 py-1 text-[10px] fw-bold uppercase"
                    style={{ background: 'rgba(129, 140, 248, 0.15)', color: '#818cf8', border: '1px solid rgba(129, 140, 248, 0.3)' }}
                  >
                    RUANG TUNGGU
                  </span>
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center"
                    style={{ width: '42px', height: '42px', background: 'rgba(129, 140, 248, 0.15)', border: '1px solid rgba(129, 140, 248, 0.3)' }}
                  >
                    <i className="bi bi-tv-fill fs-4" style={{ color: '#818cf8' }}></i>
                  </div>
                </div>

                <h4 className="fw-bold mb-2 text-white" style={{ fontSize: '1.25rem' }}>Layar Display</h4>
                <p className="small m-0 leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                  Layar monitor TV pemanggilan nomor antrian ruang tunggu otomatis.
                </p>
              </div>

              <div className="pt-4 border-top border-white border-opacity-10 d-flex align-items-center justify-content-between mt-3">
                <span className="small fw-bold" style={{ color: '#818cf8' }}>Buka Layar TV</span>
                <i className="bi bi-arrow-right fs-6" style={{ color: '#818cf8' }}></i>
              </div>
            </Link>
          </div>

          {/* 3. Konsol Loket Operator */}
          <div className="col-12 col-sm-6 col-lg-3">
            <Link
              href="/Antrian/operator"
              className="h-100 text-decoration-none p-4 d-flex flex-column justify-content-between text-white antrian-glass antrian-glass-hover glow-emerald"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '22px',
                color: '#ffffff'
              }}
            >
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span
                    className="badge rounded-pill px-2.5 py-1 text-[10px] fw-bold uppercase"
                    style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' }}
                  >
                    PETUGAS LOKET
                  </span>
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center"
                    style={{ width: '42px', height: '42px', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)' }}
                  >
                    <i className="bi bi-headset fs-4" style={{ color: '#34d399' }}></i>
                  </div>
                </div>

                <h4 className="fw-bold mb-2 text-white" style={{ fontSize: '1.25rem' }}>Konsol Loket</h4>
                <p className="small m-0 leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                  Panel pemanggil antrian dan pelayanan warga bagi petugas loket.
                </p>
              </div>

              <div className="pt-4 border-top border-white border-opacity-10 d-flex align-items-center justify-content-between mt-3">
                <span className="small fw-bold" style={{ color: '#34d399' }}>Masuk Panel Loket</span>
                <i className="bi bi-arrow-right fs-6" style={{ color: '#34d399' }}></i>
              </div>
            </Link>
          </div>

          {/* 4. Pengaturan Sistem */}
          <div className="col-12 col-sm-6 col-lg-3">
            <Link
              href="/Antrian/pengaturan"
              className="h-100 text-decoration-none p-4 d-flex flex-column justify-content-between text-white antrian-glass antrian-glass-hover glow-amber"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '22px',
                color: '#ffffff'
              }}
            >
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span
                    className="badge rounded-pill px-2.5 py-1 text-[10px] fw-bold uppercase"
                    style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}
                  >
                    ADMINISTRASI
                  </span>
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center"
                    style={{ width: '42px', height: '42px', background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)' }}
                  >
                    <i className="bi bi-gear-wide-connected fs-4" style={{ color: '#fbbf24' }}></i>
                  </div>
                </div>

                <h4 className="fw-bold mb-2 text-white" style={{ fontSize: '1.25rem' }}>Pengaturan</h4>
                <p className="small m-0 leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                  Kelola kategori layanan, loket, histori, audio, dan operator antrian.
                </p>
              </div>

              <div className="pt-4 border-top border-white border-opacity-10 d-flex align-items-center justify-content-between mt-3">
                <span className="small fw-bold" style={{ color: '#fbbf24' }}>Buka Pengaturan</span>
                <i className="bi bi-arrow-right fs-6" style={{ color: '#fbbf24' }}></i>
              </div>
            </Link>
          </div>

        </div>

        {/* Footer Info */}
        <div className="mt-5 pt-3 d-flex flex-wrap items-center justify-content-center gap-3 text-white-50 small">
          <span>&copy; {new Date().getFullYear()} Sistem Antrian Terpadu Kecamatan Gandrungmangu.</span>
          <span className="d-none d-sm-inline">&bull;</span>
          <a
            href="https://sisukma.cilacapkab.go.id/Home/pelayanan/4012001"
            target="_blank"
            rel="noreferrer"
            className="text-warning text-decoration-none fw-semibold hover:underline d-inline-flex align-items-center gap-1"
          >
            <i className="bi bi-star-fill text-warning"></i> Bantu Nilai Kami di Sisukma
          </a>
        </div>
      </div>
    </div>
  );
}
