"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { collection, doc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

const formatHeroImage = (raw) => {
  if (!raw || typeof raw !== 'string') return '/hero-Kecamatan.jpg';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
    return raw;
  }
  return `data:image/jpeg;base64,${raw}`;
};

export default function Display() {
  const [settings, setSettings] = useState({
    instansi_nama: 'Kecamatan Gandrungmangu',
    instansi_alamat: 'Jl. Pertiwi Nomor 1',
    running_text: 'Selamat Datang di Kecamatan Gandrungmangu',
    bell_sound_volume: '0.8'
  });

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

  const [lokets, setLokets] = useState(['Loket 1', 'Loket 2', 'Loket 3', 'Loket 4']);
  const [activeCalls, setActiveCalls] = useState({});
  const [latestCalling, setLatestCalling] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  const lastProcessedCall = useRef(null);
  const maxProcessedPanggilAt = useRef(0);

  const [logoKecamatan, setLogoKecamatan] = useState('');
  const [logoTambahan, setLogoTambahan] = useState('/img/logo-tambahan.png');

  // Ambil background Foto Halaman Utama & Logo dari Pengaturan (/settings/ - settings/village)
  useEffect(() => {
    // 1. Fetch cepat dari API /api/village-profile/
    fetch('/api/village-profile/?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          const raw = data.heroPhotoUrl || data.heroPhotoBase64;
          if (raw) setHeroBg(formatHeroImage(raw));
          if (data.logoUrl || data.logoKecamatanUrl) setLogoKecamatan(data.logoUrl || data.logoKecamatanUrl);
          if (data.logoTambahanUrl) setLogoTambahan(data.logoTambahanUrl);
        }
      })
      .catch(() => { });

    // 2. Real-time snapshot dari Firestore settings/village
    if (db) {
      const unsubVillage = onSnapshot(doc(db, 'settings', 'village'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const raw = d.heroPhotoUrl || d.heroPhotoBase64;
          if (raw) setHeroBg(formatHeroImage(raw));
          if (d.logoUrl || d.logoKecamatanUrl) setLogoKecamatan(d.logoUrl || d.logoKecamatanUrl);
          if (d.logoTambahanUrl) setLogoTambahan(d.logoTambahanUrl);
        }
      }, (err) => {
        console.warn("Gagal memuat snapshot settings/village:", err);
      });
      return () => unsubVillage();
    }
  }, []);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearInterval(timer);
  }, []);

  // Lokets Snapshot
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'loket'), (snap) => {
      if (!snap.empty) {
        const list = [];
        snap.forEach(docSnap => {
          if (docSnap.data().nama) {
            list.push(docSnap.data().nama);
          }
        });
        list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        setLokets(list);
      }
    });
    return () => unsub();
  }, []);

  // Speak Queue Voice function
  const speakQueue = (nomorLengkap, loketText) => {
    const parts = nomorLengkap.split('-');
    const prefix = parts[0];
    const num = parseInt(parts[1] || '1', 10);
    const text = `Nomor antrian, ${prefix}, ${num}, silakan menuju ke, ${loketText}`;

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id-ID&client=tw-ob&q=${encodeURIComponent(text)}`;
    const ttsAudio = new Audio(url);
    ttsAudio.volume = 1.0;
    ttsAudio.play().catch(err => {
      console.error("Google TTS failed:", err);
      // Fallback lokal
      if (window.speechSynthesis) {
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = "id-ID";
        const voices = window.speechSynthesis.getVoices();
        const idVoices = voices.filter(v => v.lang.replace('_', '-').toLowerCase().includes('id'));
        let female = idVoices.find(v => {
          const n = v.name.toLowerCase();
          return n.includes('gadis') || n.includes('female') || n.includes('perempuan') || n.includes('google');
        });
        if (!female && idVoices.length > 1) female = idVoices[idVoices.length - 1];
        if (female) speech.voice = female;
        speech.rate = 0.85;
        window.speechSynthesis.speak(speech);
      }
    });
  };

  // Settings Snapshot
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'settings'), (snap) => {
      const s = { ...settings };
      snap.forEach(doc => { s[doc.id] = doc.data().value; });
      setSettings(s);
    });
    return () => unsub();
  }, []);

  // Queue Snapshot
  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startOfDay = Timestamp.fromDate(now);

    const q = query(
      collection(db, 'antrian'),
      where('created_at', '>=', startOfDay),
      orderBy('created_at', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const allQueues = [];
      snap.forEach(d => allQueues.push({ id: d.id, ...d.data() }));

      let latest = null;
      const activeMap = {};

      lokets.forEach(lok => {
        // Cari yang dipanggil
        let call = allQueues.find(q => q.loket === lok && q.status === 'dipanggil');
        // Jika tidak ada, cari yang selesai
        if (!call) {
          call = allQueues.find(q => q.loket === lok && q.status === 'selesai');
        }
        if (call) {
          activeMap[lok] = call;
        }
      });

      // Cari panggilan terbaru (dipanggil) yang ada panggil_at
      const calledQueues = allQueues.filter(q => q.status === 'dipanggil' && q.panggil_at);
      calledQueues.sort((a, b) => b.panggil_at.toMillis() - a.panggil_at.toMillis());

      if (calledQueues.length > 0) {
        latest = calledQueues[0];
      } else {
        // Fallback jika tidak ada yang sedang dipanggil
        const finishedQueues = allQueues.filter(q => (q.status === 'selesai' || q.status === 'lewat') && q.panggil_at);
        finishedQueues.sort((a, b) => b.panggil_at.toMillis() - a.panggil_at.toMillis());
        if (finishedQueues.length > 0) latest = finishedQueues[0];
      }

      setActiveCalls(activeMap);
      setLatestCalling(latest);

      // Trigger Voice
      if (latest && latest.status === 'dipanggil') {
        const panggilTime = latest.panggil_at.toMillis();
        const callSig = `${latest.id}-${panggilTime}-${latest.panggil_ulang}`;

        if (panggilTime > maxProcessedPanggilAt.current) {
          maxProcessedPanggilAt.current = panggilTime;
          lastProcessedCall.current = callSig;
          speakQueue(latest.nomor_lengkap, latest.loket);
        } else if (panggilTime === maxProcessedPanggilAt.current && lastProcessedCall.current !== callSig) {
          lastProcessedCall.current = callSig;
          speakQueue(latest.nomor_lengkap, latest.loket);
        }
      }
    });

    return () => unsub();
  }, [lokets]);

  return (
    <div style={{
      backgroundImage: `linear-gradient(rgba(10, 15, 29, 0.84), rgba(10, 15, 29, 0.94)), url("${heroBg}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 25px 95px 25px',
      boxSizing: 'border-box',
      color: '#ffffff',
      transition: 'background-image 0.5s ease-in-out'
    }}>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3 antrian-glass" style={{
        padding: '16px 30px',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.5)'
      }}>
        <div className="d-flex align-items-center gap-3">
          <Link href="/Antrian" className="btn btn-sm rounded-pill px-3 py-1.5 text-white d-inline-flex align-items-center gap-1.5 shadow-sm" style={{ backdropFilter: 'blur(8px)', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)' }} title="Kembali ke Portal Antrian">
            <i className="bi bi-arrow-left text-warning"></i>
            <span className="small d-none d-lg-inline fw-semibold">Portal</span>
          </Link>
          {(logoTambahan || "/img/logo-tambahan.png") && (
            <img src={logoTambahan || "/img/logo-tambahan.png"} alt="Logo Instansi" style={{ height: '54px', maxWidth: '340px', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))' }} />
          )}
          <div>
            <h2 className="fw-extrabold m-0 text-white" style={{ fontSize: '1.9rem', letterSpacing: '-0.3px', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{settings.instansi_nama}</h2>
            <p className="m-0 text-white-50 small fw-medium">{settings.instansi_alamat}</p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-4">
          <div className="text-end">
            <div className="fw-extrabold" style={{ fontSize: '2.8rem', color: '#fbbf24', lineHeight: 1.1, fontWeight: 900, textShadow: '0 0 25px rgba(251, 191, 36, 0.4), 0 2px 4px rgba(0,0,0,0.8)' }}>
              {mounted ? currentTime.toLocaleTimeString('id-ID', { hour12: false }) : '--.--.--'}
            </div>
            <div className="text-white-50 fw-semibold small mt-1">
              {mounted ? currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Memuat Tanggal...'}
            </div>
          </div>
        </div>
      </div>

      {/* 2 Main Sections Row */}
      <div className="row g-3 flex-grow-1">

        {/* Section 1 (Left Column): Layar Utama Panggilan Saat Ini */}
        <div className="col-lg-6 d-flex">
          <div className="w-100 rounded-4 p-4 d-flex flex-column align-items-center justify-content-between text-center shadow-2xl antrian-glass" style={{
            border: '2px solid rgba(251, 191, 36, 0.4)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}>
            <div className="w-100">
              <div className="d-inline-flex align-items-center gap-2 px-4 py-2 rounded-pill mb-2 shadow" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#0f172a' }}>
                <span className="spinner-grow spinner-grow-sm text-dark" role="status"></span>
                <span className="fw-extrabold text-uppercase tracking-wider" style={{ fontSize: '1.15rem' }}>
                  PANGGILAN SAAT INI
                </span>
              </div>
              <p className="text-white-50 fw-semibold small m-0 mt-1">Nomor Antrian Yang Sedang Dilayani</p>
            </div>

            <div className="my-auto py-2">
              <div className="fw-extrabold" style={{
                fontSize: 'clamp(9rem, 15vw, 14.5rem)',
                lineHeight: 0.88,
                fontWeight: 900,
                letterSpacing: '-4px',
                color: '#fbbf24',
                textShadow: '0 0 50px rgba(251, 191, 36, 0.5), 0 4px 15px rgba(0, 0, 0, 0.9)'
              }}>
                {latestCalling ? latestCalling.nomor_lengkap : '---'}
              </div>

              <div className="mt-3 py-2.5 px-5 rounded-4 d-inline-block shadow-lg antrian-glass" style={{
                border: '1.5px solid rgba(56, 189, 248, 0.45)',
                background: 'rgba(56, 189, 248, 0.08)'
              }}>
                <span className="text-white-50 fw-extrabold text-uppercase me-3" style={{ fontSize: '2.2rem', letterSpacing: '2px' }}>MENUJU</span>
                <span className="fw-extrabold" style={{ fontSize: '4.2rem', fontWeight: 900, lineHeight: 1, color: '#38bdf8', textShadow: '0 0 30px rgba(56, 189, 248, 0.5)' }}>
                  {latestCalling ? latestCalling.loket : '---'}
                </span>
              </div>

              {latestCalling && (
                <div className="mt-3">
                  <span className="badge text-white fs-5 px-4 py-2 rounded-pill shadow-lg fw-bold" style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255,255,255,0.25)' }}>
                    {latestCalling.pelayanan_nama || 'Pelayanan Umum'}
                  </span>
                </div>
              )}
            </div>

            <div className="w-100 pt-3 border-top border-white border-opacity-15">
              <small className="text-white-50 fw-semibold fs-6">
                <i className="bi bi-info-circle me-1 text-info"></i> Silakan segera menuju ke loket pelayanan yang tertera.
              </small>
            </div>
          </div>
        </div>

        {/* Section 2 (Right Column): Layar Antrian Berlangsung */}
        <div className="col-lg-6 d-flex">
          <div className="w-100 rounded-4 p-4 d-flex flex-column shadow-2xl antrian-glass" style={{
            border: '1.5px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
          }}>
            <div className="d-flex justify-content-between align-items-center border-bottom border-white border-opacity-15 pb-3 mb-3">
              <h3 className="fw-extrabold m-0 d-flex align-items-center gap-2 text-white" style={{ fontSize: '1.6rem', letterSpacing: '-0.3px' }}>
                <i className="bi bi-card-checklist text-info"></i> ANTRIAN BERLANGSUNG
              </h3>
              <span className="badge rounded-pill px-3 py-1.5 fs-6 fw-bold shadow-sm" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
                {lokets.length} Loket Pelayanan
              </span>
            </div>

            <div className="row g-3 flex-grow-1 align-content-start overflow-y-auto">
              {lokets.map(lok => {
                const active = activeCalls[lok];
                return (
                  <div className="col-12" key={lok}>
                    <div className="d-flex align-items-center justify-content-between p-3.5 rounded-4 shadow-sm" style={{
                      background: active ? 'rgba(52, 211, 153, 0.10)' : 'rgba(255, 255, 255, 0.04)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      borderTop: active ? '1.5px solid rgba(52, 211, 153, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
                      borderRight: active ? '1.5px solid rgba(52, 211, 153, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
                      borderBottom: active ? '1.5px solid rgba(52, 211, 153, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
                      borderLeft: `10px solid ${active ? '#10b981' : '#475569'}`,
                      transition: 'all 0.3s ease'
                    }}>
                      <div>
                        <h4 className="fw-bold m-0 text-white" style={{ fontSize: '1.75rem' }}>{lok}</h4>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          <span className="badge px-3 py-1 rounded-pill small fw-bold shadow-sm" style={{
                            background: active ? '#10b981' : 'rgba(255, 255, 255, 0.15)',
                            color: active ? '#ffffff' : '#94a3b8',
                            border: '1px solid rgba(255,255,255,0.2)'
                          }}>
                            {active ? 'MELAYANI' : 'KOSONG'}
                          </span>
                          {active && active.pelayanan_nama && (
                            <span className="text-white-50 small fw-semibold">
                              ({active.pelayanan_nama})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-end">
                        <div className="fw-extrabold" style={{
                          fontSize: '4.2rem',
                          lineHeight: 1,
                          fontWeight: 900,
                          color: active ? '#34d399' : '#64748b',
                          textShadow: active
                            ? '0 0 25px rgba(52, 211, 153, 0.4)'
                            : 'none'
                        }}>
                          {active ? active.nomor_lengkap : '---'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Running Text Marquee Footer */}
      <div style={{
        position: 'fixed', bottom: '18px', left: '25px', right: '25px',
        background: 'rgba(10, 15, 29, 0.88)', backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1.5px solid rgba(251, 191, 36, 0.35)', borderRadius: '18px',
        boxShadow: '0 10px 35px rgba(0, 0, 0, 0.6)', padding: '12px 0', zIndex: 1000, overflow: 'hidden'
      }}>
        <div style={{ whiteSpace: 'nowrap' }}>
          <p style={{ display: 'inline-block', paddingLeft: '100%', margin: 0, animation: 'scroll-text 28s linear infinite', fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24', textShadow: '0 0 20px rgba(251, 191, 36, 0.4)' }}>
            <i className="bi bi-megaphone-fill me-2 text-warning"></i>
            {settings.running_text}
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scroll-text {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-100%, 0); }
        }
      `}} />
    </div>
  );
}

