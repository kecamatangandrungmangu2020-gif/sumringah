"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, addDoc, Timestamp, doc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { KunjunganTamuPortal } from '@/components/kunjungan-tamu/KunjunganTamuPortal';

const DEFAULT_PELAYANAN = [
  { id: 'layanan-a', kode: 'A', nama: 'Legalisasi', estimasi_waktu: 15, loket_nama: 'Loket 1' },
  { id: 'layanan-b', kode: 'B', nama: 'Kependudukan', estimasi_waktu: 20, loket_nama: 'Loket 2' },
  { id: 'layanan-c', kode: 'C', nama: 'Perekaman', estimasi_waktu: 20, loket_nama: 'Ruang Perekaman' },
];

const formatHeroImage = (raw) => {
  if (!raw || typeof raw !== 'string') return '/hero-Kecamatan.jpg';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
    return raw;
  }
  return `data:image/jpeg;base64,${raw}`;
};

export default function Kiosk() {
  const [pelayanan, setPelayanan] = useState(DEFAULT_PELAYANAN);
  const [instansiNama, setInstansiNama] = useState('Kecamatan Gandrungmangu');
  const [instansiAlamat, setInstansiAlamat] = useState('Jalan Pertiwi Nomor 01 Gandrungmangu, Cilacap');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [ticketToPrint, setTicketToPrint] = useState(null);
  const [selectedLayananForForm, setSelectedLayananForForm] = useState(null);
  const [showRegisterKunjungan, setShowRegisterKunjungan] = useState(false);
  const [wargaForm, setWargaForm] = useState({ nama: '', alamat: '', hp: '' });
  const [currentTime, setCurrentTime] = useState(null);
  const [heroBg, setHeroBg] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          const raw = parsed.heroPhotoUrl || parsed.heroPhotoBase64;
          if (raw) return formatHeroImage(raw);
        }
      } catch (e) { }
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
      } catch (e) { }
    }
    return '';
  });

  useEffect(() => {
    fetch('/api/village-profile/?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          const raw = data.heroPhotoUrl || data.heroPhotoBase64;
          if (raw) setHeroBg(formatHeroImage(raw));
          if (data.logoTambahanUrl) setLogoTambahan(data.logoTambahanUrl);
        }
      })
      .catch(() => { });

    if (db) {
      const unsub = onSnapshot(doc(db, 'settings', 'village'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const raw = d.heroPhotoUrl || d.heroPhotoBase64;
          if (raw) setHeroBg(formatHeroImage(raw));
          if (d.logoTambahanUrl) setLogoTambahan(d.logoTambahanUrl);
        }
      }, () => { });
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (ticketToPrint) {
      const timer = setTimeout(() => {
        window.print();
        setTicketToPrint(null);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [ticketToPrint]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ambil pengaturan
        const settingsRef = collection(db, 'settings');
        const settingsSnap = await getDocs(settingsRef);
        settingsSnap.forEach((doc) => {
          if (doc.id === 'instansi_nama' && doc.data().value) setInstansiNama(doc.data().value);
          if (doc.id === 'instansi_alamat' && doc.data().value) setInstansiAlamat(doc.data().value);
        });

        // Ambil layanan
        const pRef = collection(db, 'pelayanan');
        const pSnap = await getDocs(pRef);
        const data = [];
        pSnap.forEach(doc => {
          data.push({ id: doc.id, ...doc.data() });
        });
        if (data.length > 0) {
          data.sort((a, b) => (a.kode || '').localeCompare(b.kode || ''));
          setPelayanan(data);
        }
      } catch (err) {
        console.warn('Gagal memuat data dari Firestore, menggunakan konfigurasi default:', err);
      }
    };

    fetchData();
  }, []);

  // Live clock
  useEffect(() => {
    setCurrentTime(new Date());
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Keyboard shortcut listener (A, B, C, dan R untuk Register Kunjungan)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedLayananForForm || showRegisterKunjungan) return;
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT'
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'r') {
        setShowRegisterKunjungan(true);
        return;
      }
      const p = pelayanan.find(item => item.kode.toLowerCase() === key);
      if (p) {
        setSelectedLayananForForm(p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pelayanan, selectedLayananForForm, showRegisterKunjungan]);

  const handleAmbilAntrian = async (layanan, dataWarga) => {
    setLoading(true);
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const startOfDay = Timestamp.fromDate(now);

      let nextNumber = 1;
      let sisaAntrian = 1;

      try {
        const q = query(
          collection(db, 'antrian'),
          where('created_at', '>=', startOfDay)
        );
        const antrianSnap = await getDocs(q);

        const todayLayananQueues = antrianSnap.docs
          .map(doc => doc.data())
          .filter(item => item.pelayanan_id === layanan.id || item.pelayanan_nama === layanan.nama);

        if (todayLayananQueues.length > 0) {
          const numbers = todayLayananQueues.map(item => item.nomor || 0);
          nextNumber = Math.max(...numbers) + 1;
        }

        sisaAntrian = todayLayananQueues.filter(item => item.status === 'menunggu').length + 1;
      } catch (countErr) {
        console.warn('Gagal membaca antrian sebelumnya:', countErr);
      }

      const nomorLengkap = `${layanan.kode}-${nextNumber}`;
      const isKodeC = layanan.kode?.toUpperCase() === 'C' || layanan.nama?.toLowerCase().includes('perekaman');
      const isKodeA = layanan.kode?.toUpperCase() === 'A' || layanan.loket_nama?.toLowerCase().includes('loket a') || layanan.loket_nama?.toLowerCase().includes('loket 1');

      try {
        await addDoc(collection(db, 'antrian'), {
          nomor: nextNumber,
          nomor_lengkap: nomorLengkap,
          pelayanan_id: layanan.id || layanan.kode,
          pelayanan_nama: layanan.nama,
          status: 'menunggu',
          loket: isKodeC ? null : (layanan.loket_nama || null),
          panggil_at: null,
          panggil_ulang: 0,
          selesai_at: null,
          created_at: Timestamp.now(),
          warga_nama: dataWarga.nama,
          warga_alamat: dataWarga.alamat,
          warga_hp: dataWarga.hp
        });
      } catch (insertErr) {
        console.warn('Gagal menyimpan ke Firestore, tiket tetap dicetak secara offline:', insertErr);
      }

      setTicketToPrint({
        instansiNama,
        instansiAlamat,
        nomorLengkap,
        pelayananNama: layanan.nama,
        loketNama: (isKodeC || isKodeA) ? '' : (layanan.loket_nama || ''),
        kode: layanan.kode,
        waktu: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
        sisaAntrian: sisaAntrian
      });

      setSuccessMessage(`Berhasil mengambil nomor: ${nomorLengkap}`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error(err);
      alert('Gagal mengambil antrian, silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!wargaForm.nama || !wargaForm.alamat || !wargaForm.hp) {
      alert('Harap lengkapi semua data diri.');
      return;
    }
    await handleAmbilAntrian(selectedLayananForForm, wargaForm);
    setSelectedLayananForForm(null);
    setWargaForm({ nama: '', alamat: '', hp: '' });
  };

  return (
    <>
      <div
        id="kiosk-main-container"
        className="kiosk-screen-root"
        style={{
          background: 'linear-gradient(155deg, #FAF8F5 0%, #F3EFE6 52%, #EFE9DC 100%)',
          height: '100vh',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '14px 20px',
          boxSizing: 'border-box',
          color: '#041E17',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Ambient Blue-White Glow + Subtle Light Pendopo Silhouette */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            backgroundImage: 'radial-gradient(circle at 12% 14%, rgba(6, 95, 70, 0.12), transparent 45%), radial-gradient(circle at 88% 86%, rgba(200, 162, 83, 0.14), transparent 45%)'
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            opacity: 0.13,
            backgroundImage: "url('/images/gandrungmangu-pendopo-silhouette-light.webp')",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center bottom',
            backgroundSize: 'cover'
          }}
        />

        <div
          className="mx-auto w-100 d-flex flex-column"
          style={{
            maxWidth: '1220px',
            flex: '1 1 0%',
            minHeight: 0,
            gap: '12px',
            position: 'relative',
            zIndex: 10
          }}
        >
          {/* ── 1. COMPACT EXECUTIVE HEADER BAR (PORCELAIN WHITE + OCEAN BLUE) ── */}
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="d-flex justify-content-between align-items-center gap-3 flex-wrap"
            style={{
              flexShrink: 0,
              padding: '12px 20px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(6, 95, 70, 0.16)',
              boxShadow: '0 10px 30px rgba(4, 30, 23, 0.07)'
            }}
          >
            {/* Kiri: Tombol Portal + Logo + Judul */}
            <div className="d-flex align-items-center gap-3 min-w-0">
              <Link
                href="/Antrian/"
                className="btn btn-sm rounded-pill px-3 py-1.5 text-white d-inline-flex align-items-center gap-1.5 text-decoration-none font-hero shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #065F46, #041E17)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(6, 95, 70, 0.22)',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                <i className="bi bi-arrow-left"></i>
                <span className="d-none d-sm-inline">Portal</span>
              </Link>

              {logoTambahan ? (
                <img
                  src={logoTambahan}
                  alt="Logo Sistem Antrian"
                  style={{
                    height: '44px',
                    maxWidth: '210px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 6px rgba(4, 30, 23, 0.14))'
                  }}
                />
              ) : (
                <img
                  src="/img/Logo.png"
                  alt="Logo Cilacap"
                  style={{ height: '42px', objectFit: 'contain' }}
                />
              )}

              <div className="min-w-0">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h1
                    className="fw-extrabold m-0 font-hero text-truncate"
                    style={{
                      fontSize: 'clamp(1.25rem, 2vw, 1.9rem)',
                      fontWeight: 900,
                      letterSpacing: '-0.02em',
                      color: '#041E17',
                      lineHeight: 1.15
                    }}
                  >
                    AMBIL NOMOR ANTRIAN &amp; REGISTER
                  </h1>
                  <span
                    className="d-none d-lg-inline-flex align-items-center gap-1 px-2.5 py-0.5 rounded-pill font-mono"
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      background: '#F3EFE6',
                      border: '1px solid rgba(6, 95, 70, 0.24)',
                      color: '#065F46'
                    }}
                  >
                    SEMRINGAH
                  </span>
                </div>
                <p className="m-0 text-truncate font-hero" style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                  {instansiNama} • {instansiAlamat}
                </p>
              </div>
            </div>

            {/* Kanan: Jam Digital Ringkas */}
            <div
              className="text-end px-3 py-1.5 rounded-4 shrink-0 d-none d-md-block"
              style={{
                background: 'linear-gradient(135deg, #065F46, #041E17)',
                color: '#ffffff',
                boxShadow: '0 6px 16px rgba(6, 95, 70, 0.22)'
              }}
            >
              <div className="font-mono fw-black" style={{ fontSize: '1.2rem', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
                {currentTime ? currentTime.toLocaleTimeString('id-ID', { hour12: false }) : '--.--.--'}{' '}
                <span style={{ fontSize: '0.68rem', color: '#F5E9CC' }}>WIB</span>
              </div>
              <div className="font-mono text-uppercase" style={{ fontSize: '0.65rem', color: 'rgba(245, 233, 204,0.88)', letterSpacing: '0.06em' }}>
                {currentTime ? currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''}
              </div>
            </div>
          </motion.div>

          {/* Success Notification */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-white px-4 py-2.5 text-center rounded-4 shadow-lg fw-bold d-flex align-items-center justify-content-center gap-2 font-hero"
                style={{
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, #065F46, #059669)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  fontSize: '0.95rem'
                }}
              >
                <i className="bi bi-check-circle-fill"></i> {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── 2. 3 KARTU LAYANAN ANTRIAN PATEN (PUTIH + AKSEN BIRU OCEAN) ── */}
          <div
            className="kiosk-cards-grid"
            style={{
              flex: '1 1 56%',
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '14px'
            }}
          >
            {pelayanan.map((p, idx) => {
              const badgeBg = idx === 0 ? '#065F46' : idx === 1 ? '#047857' : '#041E17';
              return (
                <motion.button
                  key={p.id || p.kode}
                  type="button"
                  onClick={() => setSelectedLayananForForm(p)}
                  initial={{ opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ y: -6, scale: 1.015 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24, delay: idx * 0.06 }}
                  className="text-start position-relative overflow-hidden d-flex flex-column justify-content-between h-100"
                  style={{
                    padding: '22px 22px 18px',
                    borderRadius: '22px',
                    cursor: 'pointer',
                    background: '#ffffff',
                    border: '1.5px solid rgba(6, 95, 70, 0.18)',
                    boxShadow: '0 12px 30px rgba(4, 30, 23, 0.08)',
                    color: '#041E17'
                  }}
                >
                  {/* Top Blue Accent Strip */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '6px',
                      background: `linear-gradient(90deg, ${badgeBg}, #E5C882)`
                    }}
                  />

                  <div className="d-flex justify-content-between align-items-start gap-2 w-100">
                    <span
                      className="font-hero fw-black"
                      style={{
                        fontSize: 'clamp(5.2rem, 8vw, 7.6rem)',
                        fontWeight: 900,
                        color: badgeBg,
                        lineHeight: 0.88,
                        letterSpacing: '-0.04em',
                        userSelect: 'none'
                      }}
                    >
                      {p.kode}
                    </span>
                    <span
                      className="badge rounded-pill font-mono fw-bold px-3.5 py-2"
                      style={{
                        background: '#F3EFE6',
                        color: '#065F46',
                        border: '1.5px solid rgba(6, 95, 70, 0.25)',
                        fontSize: '0.88rem'
                      }}
                    >
                      Estimasi {p.estimasi_waktu || 15} mnt
                    </span>
                  </div>

                  <div className="my-auto pt-3">
                    <div className="font-mono text-uppercase fw-bold" style={{ fontSize: '0.85rem', letterSpacing: '0.14em', color: '#065F46' }}>
                      Layanan Antrian • {p.loket_nama || `Loket ${idx + 1}`}
                    </div>
                    <h2
                      className="font-hero fw-black m-0 mt-1.5"
                      style={{
                        fontSize: 'clamp(1.85rem, 2.75vw, 2.65rem)',
                        fontWeight: 900,
                        lineHeight: 1.12,
                        letterSpacing: '-0.02em',
                        color: '#041E17'
                      }}
                    >
                      {p.nama}
                    </h2>
                  </div>

                  <div
                    className="d-flex align-items-center justify-content-between pt-3 mt-2 w-100"
                    style={{ borderTop: '1.5px solid rgba(6, 95, 70, 0.14)' }}
                  >
                    <span className="font-hero fw-bold" style={{ fontSize: '0.95rem', color: '#334155' }}>
                      Tekan ({p.kode}) atau sentuh
                    </span>
                    <span
                      className="d-inline-flex align-items-center gap-1.5 px-3.5 py-1.5 rounded-pill font-hero fw-bold text-white"
                      style={{
                        background: badgeBg,
                        fontSize: '0.9rem'
                      }}
                    >
                      Ambil <i className="bi bi-arrow-up-right"></i>
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* ── 3. KARTU PALING BAWAH: REGISTER KUNJUNGAN (FUNGSI /kunjungan-tamu/) ── */}
          <motion.button
            type="button"
            onClick={() => setShowRegisterKunjungan(true)}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ y: -4, scale: 1.008 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.2 }}
            className="w-100 text-start position-relative overflow-hidden d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3"
            style={{
              flex: '0 0 auto',
              minHeight: '118px',
              padding: '18px 26px',
              borderRadius: '22px',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #065F46 0%, #064E3B 52%, #041E17 100%)',
              border: '2px solid rgba(255, 255, 255, 0.85)',
              boxShadow: '0 16px 38px rgba(6, 95, 70, 0.28)',
              color: '#ffffff'
            }}
          >
            {/* Subtle Semringah Watermark */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: '14px',
                bottom: '-8px',
                width: '160px',
                height: '130px',
                opacity: 0.13,
                pointerEvents: 'none',
                backgroundImage: "url('/images/gandrungmangu-semringah-silhouette.webp')",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right bottom',
                backgroundSize: 'contain'
              }}
            />

            <div className="d-flex align-items-center gap-3.5 position-relative" style={{ zIndex: 2 }}>
              <div
                className="d-flex align-items-center justify-content-center shrink-0"
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '18px',
                  background: 'rgba(255, 255, 255, 0.16)',
                  border: '1.5px solid rgba(255, 255, 255, 0.35)',
                  boxShadow: '0 8px 20px rgba(4, 30, 23, 0.25)'
                }}
              >
                <i className="bi bi-journal-check text-white" style={{ fontSize: '1.85rem' }}></i>
              </div>

              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                  <span
                    className="badge rounded-pill font-mono fw-bold px-3 py-1"
                    style={{
                      background: '#ffffff',
                      color: '#065F46',
                      fontSize: '0.78rem',
                      letterSpacing: '0.1em'
                    }}
                  >
                    FRONT OFFICE • NON-PATEN
                  </span>
                  <span className="font-mono d-none d-sm-inline fw-semibold" style={{ fontSize: '0.8rem', color: '#F5E9CC' }}>
                    Pintasan Keyboard: (R)
                  </span>
                </div>
                <h2
                  className="font-hero fw-black m-0 text-white"
                  style={{ fontSize: 'clamp(1.65rem, 2.5vw, 2.3rem)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.12 }}
                >
                  Register Kunjungan
                </h2>
                <p className="m-0 mt-1 font-hero fw-medium" style={{ fontSize: '0.96rem', color: 'rgba(245, 233, 204, 0.94)' }}>
                  Tamu Dinas, Pengajuan Proposal, Penyerahan SPJ/Berkas, Pengiriman Barang &amp; Pengaduan + Cetak Tanda Terima
                </p>
              </div>
            </div>

            <div className="position-relative shrink-0" style={{ zIndex: 2 }}>
              <span
                className="d-inline-flex align-items-center gap-2 px-4 py-3 rounded-pill font-hero fw-black shadow"
                style={{
                  background: '#ffffff',
                  color: '#041E17',
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  letterSpacing: '0.03em'
                }}
              >
                <span>Buka Formulir</span>
                <i className="bi bi-arrow-right-circle-fill" style={{ color: '#065F46', fontSize: '1.2rem' }}></i>
              </span>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Modal Register Kunjungan (Langsung Memuat Fitur Lengkap /kunjungan-tamu/) */}
      <AnimatePresence>
        {showRegisterKunjungan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-2 p-md-3"
            style={{
              background: 'rgba(4, 30, 23, 0.72)',
              backdropFilter: 'blur(10px)',
              zIndex: 1060
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="w-100 shadow-2xl overflow-hidden"
              style={{
                maxWidth: '1080px',
                maxHeight: '94vh',
                borderRadius: '26px',
                background: '#FAF8F5',
                border: '2px solid rgba(255, 255, 255, 0.85)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ overflowY: 'auto', flex: '1 1 auto' }}>
                <KunjunganTamuPortal
                  initialChannel="kiosk"
                  embedded
                  onClose={() => setShowRegisterKunjungan(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Dialog for Citizen Info (Clean Blue & White Modal) */}
      <AnimatePresence>
        {selectedLayananForForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center px-3"
            style={{ background: 'rgba(4, 30, 23, 0.65)', backdropFilter: 'blur(10px)', zIndex: 1050 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="card p-4 p-md-5 border-0 w-100 shadow-2xl"
              style={{
                maxWidth: '540px',
                background: '#ffffff',
                border: '1.5px solid rgba(6, 95, 70, 0.22)',
                borderRadius: '26px',
                boxShadow: '0 25px 60px rgba(4, 30, 23, 0.28)',
                color: '#041E17'
              }}
            >
              <div className="text-center mb-4">
                <span
                  className="badge px-3.5 py-1.5 rounded-pill mb-2.5 fw-bold font-mono"
                  style={{
                    background: '#F3EFE6',
                    color: '#065F46',
                    border: '1px solid rgba(6, 95, 70, 0.25)',
                    fontSize: '0.78rem'
                  }}
                >
                  KATEGORI LAYANAN {selectedLayananForForm.kode}
                </span>
                <h2 className="fw-extrabold font-hero m-0" style={{ color: '#041E17' }}>{selectedLayananForForm.nama}</h2>
                <p className="m-0 mt-1 small" style={{ color: '#64748b' }}>Silakan lengkapi data diri Anda sebelum mencetak tiket antrian.</p>
              </div>

              <form onSubmit={handleSubmitForm}>
                <div className="mb-3">
                  <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Nama Lengkap</label>
                  <input
                    type="text"
                    className="form-control py-2.5 rounded-3"
                    style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', color: '#041E17' }}
                    placeholder="Masukkan nama lengkap"
                    required
                    value={wargaForm.nama}
                    onChange={e => setWargaForm({ ...wargaForm, nama: e.target.value })}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Alamat Rumah</label>
                  <input
                    type="text"
                    className="form-control py-2.5 rounded-3"
                    style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', color: '#041E17' }}
                    placeholder="Masukkan alamat lengkap (Desa / RT / RW)"
                    required
                    value={wargaForm.alamat}
                    onChange={e => setWargaForm({ ...wargaForm, alamat: e.target.value })}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold small font-hero" style={{ color: '#041E17' }}>Nomor HP / WhatsApp</label>
                  <input
                    type="tel"
                    className="form-control py-2.5 rounded-3"
                    style={{ background: '#FAF8F5', border: '1.5px solid rgba(6, 95, 70, 0.22)', color: '#041E17' }}
                    placeholder="Contoh: 0812xxxxxxxx"
                    required
                    value={wargaForm.hp}
                    onChange={e => setWargaForm({ ...wargaForm, hp: e.target.value })}
                  />
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <button
                      type="button"
                      className="btn w-100 py-2.5 rounded-pill fw-bold font-hero"
                      style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                      onClick={() => {
                        setSelectedLayananForForm(null);
                        setWargaForm({ nama: '', alamat: '', hp: '' });
                      }}
                    >
                      Batal
                    </button>
                  </div>
                  <div className="col-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn w-100 py-2.5 rounded-pill fw-bold text-white shadow font-hero"
                      style={{ background: 'linear-gradient(135deg, #065F46, #041E17)', border: 'none' }}
                    >
                      {loading ? 'Memproses...' : 'Ambil & Cetak'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden print-only ticket */}
      {ticketToPrint && (
        <div id="printable-ticket" className="d-none d-print-block">
          <div className="ticket-header">
            <h4 className="instansi-nama">{ticketToPrint.instansiNama}</h4>
            <p className="instansi-alamat">{ticketToPrint.instansiAlamat}</p>
            <div className="divider">--------------------------------</div>
          </div>
          <div className="ticket-body">
            <div className="title">NOMOR ANTRIAN</div>
            <div className="nomor">{ticketToPrint.nomorLengkap}</div>
            <div className="layanan">{ticketToPrint.pelayananNama}</div>
            <div className="sisa-antrian">
              Sisa Antrian Menunggu Saat Ini: {ticketToPrint.sisaAntrian}
            </div>
            <div className="divider">--------------------------------</div>
          </div>
          <div className="ticket-footer">
            <div className="waktu">{ticketToPrint.waktu}</div>
            <div className="pesan">Silakan tunggu nomor Anda dipanggil.</div>
            <div className="terimakasih">Terima Kasih</div>
          </div>
          {/* Stopper pembatas akhir struk thermal */}
          <div className="ticket-stopper"></div>
        </div>
      )}

      {/* CSS Styles for Responsive Single-Screen Kiosk & 80mm POS Thermal Printer */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 991px) {
          .kiosk-screen-root {
            height: auto !important;
            max-height: none !important;
            min-height: 100vh !important;
            overflow-y: auto !important;
          }
          .kiosk-cards-grid {
            grid-template-columns: 1fr !important;
            flex: none !important;
          }
        }

        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          *, *::before, *::after {
            background-image: none !important;
            box-shadow: none !important;
            filter: none !important;
            backdrop-filter: none !important;
            text-shadow: none !important;
          }
          html, body {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          /* Reset parent layout containers from Next.js root layout */
          body > div,
          main,
          .antrian-system {
            min-height: 0 !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            position: static !important;
            display: block !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
          }
          /* Hide all non-printable elements */
          #kiosk-main-container,
          [aria-hidden="true"],
          .fixed,
          nav,
          header,
          footer,
          aside,
          svg,
          .toaster,
          [data-sonner-toaster] {
            display: none !important;
          }
          #printable-ticket {
            display: block !important;
            visibility: visible !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 4mm 5mm 2mm 5mm !important;
            box-sizing: border-box !important;
            text-align: center !important;
            font-family: 'Courier New', Courier, monospace !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            break-after: avoid !important;
            height: auto !important;
            min-height: 0 !important;
          }
          .instansi-nama {
            font-size: 11pt !important;
            font-weight: bold !important;
            margin: 0 0 1mm 0 !important;
            text-transform: uppercase !important;
            line-height: 1.2 !important;
          }
          .instansi-alamat {
            font-size: 8pt !important;
            margin: 0 !important;
            line-height: 1.3 !important;
            color: #000000 !important;
          }
          .divider {
            font-size: 10pt !important;
            margin: 2mm 0 !important;
            line-height: 1 !important;
          }
          .ticket-body {
            margin: 2mm 0 !important;
          }
          .ticket-body .title {
            font-size: 10pt !important;
            font-weight: bold !important;
            margin: 0 0 1mm 0 !important;
            letter-spacing: 0.5px !important;
          }
          .ticket-body .nomor {
            font-size: 40pt !important;
            font-weight: bold !important;
            margin: 1.5mm 0 !important;
            line-height: 1 !important;
          }
          .ticket-body .layanan {
            font-size: 11pt !important;
            font-weight: bold !important;
            margin: 1.5mm 0 0 0 !important;
            text-transform: uppercase !important;
            line-height: 1.2 !important;
          }
          .sisa-antrian {
            font-size: 9.5pt !important;
            font-weight: bold !important;
            margin: 1.5mm 0 0 0 !important;
            line-height: 1.2 !important;
          }
          .ticket-footer {
            font-size: 8pt !important;
            line-height: 1.3 !important;
            margin-top: 2mm !important;
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
          }
          .ticket-footer .waktu {
            margin: 0 0 1.5mm 0 !important;
          }
          .ticket-footer .pesan {
            margin: 0 !important;
            font-weight: bold !important;
          }
          .ticket-footer .terimakasih {
            margin: 1mm 0 0 0 !important;
            font-style: italic !important;
          }
          .ticket-stopper {
            height: 1px !important;
            margin: 0 !important;
            padding: 0 !important;
            clear: both !important;
          }
        }
      `}} />
    </>
  );
}
