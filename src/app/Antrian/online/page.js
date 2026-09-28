"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, addDoc, Timestamp, doc, onSnapshot } from 'firebase/firestore';

const DEFAULT_PELAYANAN = [
  { id: 'layanan-a', kode: 'A', nama: 'Legalisasi Dokumen', deskripsi: 'Legalisasi berkas, surat keterangan, rekomendasi umum', loket_nama: 'Loket 1', estimasi_waktu: 15 },
  { id: 'layanan-b', kode: 'B', nama: 'Pelayanan Kependudukan', deskripsi: 'Penerbitan KK, KTP elektronik, Surat Pindah (SKPWNI), Akta', loket_nama: 'Loket 2', estimasi_waktu: 20 },
  { id: 'layanan-c', kode: 'C', nama: 'Perekaman KTP-el', deskripsi: 'Perekaman biometrik KTP pemula, rekam ulang, foto iris & sidik jari', loket_nama: 'Ruang Perekaman', estimasi_waktu: 20 },
];

const formatHeroImage = (raw) => {
  if (!raw || typeof raw !== 'string') return '/hero-Kecamatan.jpg';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
    return raw;
  }
  return `data:image/jpeg;base64,${raw}`;
};

export default function AntrianOnline() {
  const [instansiNama, setInstansiNama] = useState('Kecamatan Gandrungmangu');
  const [instansiAlamat, setInstansiAlamat] = useState('Jalan Pertiwi Nomor 01 Gandrungmangu, Cilacap');
  const [pelayananList, setPelayananList] = useState(DEFAULT_PELAYANAN);
  const [loadingData, setLoadingData] = useState(true);

  // Dynamic Hero Photo from /settings/ (settings/village)
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
          const raw = parsed.logoTambahanUrl || parsed.logoTambahanBase64;
          if (raw) return raw;
        }
      } catch (e) { }
    }
    return '/img/logo-tambahan.png';
  });

  // Form State: NIK, Nama, No tlp, Alamat, Keperluan
  const [formData, setFormData] = useState({
    nik: '',
    nama: '',
    no_tlp: '',
    alamat: '',
    keperluanId: ''
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const ticketCardRef = useRef(null);

  // Load Hero Background & Logos from /settings/ (settings/village & /api/village-profile/)
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

  // Load active ticket from localStorage on mount (if available)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTicket = localStorage.getItem('antrian_online_ticket');
        if (savedTicket) {
          const parsed = JSON.parse(savedTicket);
          const ticketDate = new Date(parsed.created_at_str || parsed.waktu_str);
          const today = new Date();
          if (
            ticketDate.getDate() === today.getDate() &&
            ticketDate.getMonth() === today.getMonth() &&
            ticketDate.getFullYear() === today.getFullYear()
          ) {
            setTicketResult(parsed);
          } else {
            localStorage.removeItem('antrian_online_ticket');
          }
        }
      } catch (err) {
        console.warn('Error reading saved ticket:', err);
      }
    }
  }, []);

  // Fetch Settings & Pelayanan from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (db) {
          const settingsSnap = await getDocs(collection(db, 'settings'));
          settingsSnap.forEach((d) => {
            if (d.id === 'instansi_nama' && d.data().value) setInstansiNama(d.data().value);
            if (d.id === 'instansi_alamat' && d.data().value) setInstansiAlamat(d.data().value);
          });

          const pSnap = await getDocs(collection(db, 'pelayanan'));
          if (!pSnap.empty) {
            const list = [];
            pSnap.forEach((docItem) => {
              list.push({ id: docItem.id, ...docItem.data() });
            });
            list.sort((a, b) => (a.kode || '').localeCompare(b.kode || ''));
            setPelayananList(list);
            if (list.length > 0 && !formData.keperluanId) {
              setFormData(prev => ({ ...prev, keperluanId: list[0].id }));
            }
          } else {
            setFormData(prev => ({ ...prev, keperluanId: DEFAULT_PELAYANAN[0].id }));
          }
        }
      } catch (err) {
        console.warn('Error fetching antrian data:', err);
        setFormData(prev => ({ ...prev, keperluanId: DEFAULT_PELAYANAN[0].id }));
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'nik') {
      const cleanVal = value.replace(/\D/g, '').slice(0, 16);
      setFormData(prev => ({ ...prev, nik: cleanVal }));
    } else if (name === 'no_tlp') {
      const cleanVal = value.replace(/[^\d+ -]/g, '').slice(0, 18);
      setFormData(prev => ({ ...prev, no_tlp: cleanVal }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setFormError('');
  };

  // Submit Ambil Antrian
  const handleAmbilAntrian = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.nik.trim()) {
      setFormError('Nomor Induk Kependudukan (NIK) wajib diisi.');
      return;
    }
    if (formData.nik.trim().length !== 16) {
      setFormError('NIK harus berjumlah 16 digit sesuai e-KTP / KK.');
      return;
    }
    if (!formData.nama.trim()) {
      setFormError('Nama lengkap pemohon wajib diisi.');
      return;
    }
    if (!formData.no_tlp.trim()) {
      setFormError('Nomor Telepon / WhatsApp wajib diisi untuk konfirmasi antrian.');
      return;
    }
    if (!formData.alamat.trim()) {
      setFormError('Alamat lengkap pemohon wajib diisi.');
      return;
    }

    const selectedLayanan = pelayananList.find(p => p.id === formData.keperluanId) || pelayananList[0] || DEFAULT_PELAYANAN[0];
    if (!selectedLayanan) {
      setFormError('Silakan pilih jenis keperluan pelayanan.');
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const startOfDay = Timestamp.fromDate(now);

      let nextNumber = 1;
      let sisaAntrian = 0;

      if (db) {
        try {
          const q = query(
            collection(db, 'antrian'),
            where('created_at', '>=', startOfDay)
          );
          const antrianSnap = await getDocs(q);

          const todayQueues = antrianSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(item =>
              item.pelayanan_id === selectedLayanan.id ||
              item.kode === selectedLayanan.kode ||
              item.pelayanan_nama === selectedLayanan.nama
            );

          if (todayQueues.length > 0) {
            const numbers = todayQueues.map(item => item.nomor || 0);
            nextNumber = Math.max(...numbers, 0) + 1;
          }

          sisaAntrian = todayQueues.filter(item => item.status === 'menunggu').length;
        } catch (queryErr) {
          console.warn('Gagal membaca antrian sebelumnya:', queryErr);
        }
      }

      const nomorLengkap = `${selectedLayanan.kode}-${nextNumber}`;
      const isKodeC = selectedLayanan.kode?.toUpperCase() === 'C' || selectedLayanan.nama?.toLowerCase().includes('perekaman');
      const isKodeA = selectedLayanan.kode?.toUpperCase() === 'A' || selectedLayanan.loket_nama?.toLowerCase().includes('loket a') || selectedLayanan.loket_nama?.toLowerCase().includes('loket 1');

      const waktuFormatted = new Date().toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const ticketPayload = {
        nomor: nextNumber,
        nomor_lengkap: nomorLengkap,
        kode: selectedLayanan.kode,
        pelayanan_id: selectedLayanan.id || `pelayanan-${selectedLayanan.kode}`,
        pelayanan_nama: selectedLayanan.nama,
        keperluan: selectedLayanan.nama,
        status: 'menunggu',
        tipe: 'online',
        loket: (isKodeC || isKodeA) ? null : (selectedLayanan.loket_nama || null),
        panggil_at: null,
        panggil_ulang: 0,
        selesai_at: null,
        created_at: Timestamp.now(),
        warga_nik: formData.nik.trim(),
        warga_nama: formData.nama.trim(),
        warga_hp: formData.no_tlp.trim(),
        warga_alamat: formData.alamat.trim(),
        sisa_antrian: sisaAntrian,
        waktu_str: waktuFormatted,
        created_at_str: new Date().toISOString()
      };

      let savedId = `online-${Date.now()}`;
      if (db) {
        try {
          const docRef = await addDoc(collection(db, 'antrian'), ticketPayload);
          savedId = docRef.id;
        } catch (dbErr) {
          console.warn('Gagal menyimpan ke Firestore (tetap dibuat lokal):', dbErr);
        }
      }

      const completeTicket = { id: savedId, ...ticketPayload };
      setTicketResult(completeTicket);

      if (typeof window !== 'undefined') {
        localStorage.setItem('antrian_online_ticket', JSON.stringify(completeTicket));
      }

      window.scrollTo({ top: 100, behavior: 'smooth' });
    } catch (err) {
      console.error('Error saat mengambil antrian:', err);
      setFormError('Terjadi kesalahan saat memproses antrian. Silakan coba kembali.');
    } finally {
      setSubmitting(false);
    }
  };

  // Unduh Tiket Gambar (Fallback Canvas Renderer)
  const downloadWithCanvasFallback = (ticket) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = 640;
      const height = 900;
      canvas.width = width;
      canvas.height = height;

      // Background Navy Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0a0f1d');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Gold border
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 6;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // Header Banner
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(30, 30, width - 60, 60);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TIKET ANTRIAN ONLINE', width / 2, 68);

      // Instansi
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(instansiNama.toUpperCase(), width / 2, 130);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(instansiAlamat, width / 2, 155);

      // Divider Line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 180);
      ctx.lineTo(width - 40, 180);
      ctx.stroke();

      // Label Nomor Antrian
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('NOMOR ANTRIAN ANDA', width / 2, 220);

      // Nomor Antrian Besar
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 84px system-ui, sans-serif';
      ctx.fillText(ticket.nomor_lengkap, width / 2, 310);

      // Keperluan & Loket
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(ticket.pelayanan_nama, width / 2, 360);

      if (ticket.loket) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText(`MENUJU: ${ticket.loket.toUpperCase()}`, width / 2, 395);
      }

      // Perforated Divider (Dashed)
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(40, 430);
      ctx.lineTo(width - 40, 430);
      ctx.stroke();
      ctx.setLineDash([]);

      // Detail Data Pemohon Box
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(45, 450, width - 90, 240);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.strokeRect(45, 450, width - 90, 240);

      ctx.textAlign = 'left';
      ctx.font = '15px system-ui, sans-serif';

      const leftMargin = 65;
      let y = 490;

      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Nama Pemohon', leftMargin, y);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`: ${ticket.warga_nama}`, leftMargin + 140, y);

      y += 38;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('NIK Pemohon', leftMargin, y);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`: ${ticket.warga_nik}`, leftMargin + 140, y);

      y += 38;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('No. Telepon/WA', leftMargin, y);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`: ${ticket.warga_hp}`, leftMargin + 140, y);

      y += 38;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Alamat', leftMargin, y);
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px system-ui, sans-serif';
      const alamatCut = ticket.warga_alamat.length > 36 ? ticket.warga_alamat.substring(0, 34) + '...' : ticket.warga_alamat;
      ctx.fillText(`: ${alamatCut}`, leftMargin + 140, y);

      y += 38;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Waktu Daftar', leftMargin, y);
      ctx.fillStyle = '#fcd34d';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(`: ${ticket.waktu_str}`, leftMargin + 140, y);

      // Info Sisa Antrian
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`Sisa Antrian Menunggu Sebelum Anda: ${ticket.sisa_antrian || 0} Orang`, width / 2, 730);

      // Notice footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 13px system-ui, sans-serif';
      ctx.fillText('*Tunjukkan tiket digital ini saat tiba di loket pelayanan.', width / 2, 780);
      ctx.fillText('"SEMAngat memberIkan pelayanan NGgawe bungAH"', width / 2, 810);

      ctx.fillStyle = '#334155';
      ctx.fillRect(width / 2 - 140, 835, 280, 16);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.fillText(`VERIFIKASI ID: ${ticket.id || 'ONLINE-VALID'}`, width / 2, 870);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Tiket-Antrian-${ticket.nomor_lengkap}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Canvas fallback download error:', err);
      alert('Gagal mendownload tiket sebagai gambar. Silakan gunakan tangkapan layar (screenshot).');
    }
  };

  // Download Action Handler
  const handleDownloadImage = async () => {
    if (!ticketResult) return;
    setIsDownloading(true);

    try {
      if (ticketCardRef.current) {
        const { toPng } = await import('html-to-image');
        const dataUrl = await toPng(ticketCardRef.current, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: '#0a0f1d',
          cacheBust: true,
          style: {
            transform: 'none',
            borderRadius: '24px'
          }
        });

        const link = document.createElement('a');
        link.download = `Tiket-Antrian-${ticketResult.nomor_lengkap}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        downloadWithCanvasFallback(ticketResult);
      }
    } catch (err) {
      console.warn('html-to-image issue, switching to direct canvas drawing:', err);
      downloadWithCanvasFallback(ticketResult);
    } finally {
      setIsDownloading(false);
    }
  };

  // Reset form untuk ambil antrian baru
  const handleAmbilBaru = () => {
    if (confirm('Apakah Anda ingin mengambil antrian baru? Data tiket sebelumnya di layar ini akan digantikan.')) {
      setTicketResult(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('antrian_online_ticket');
      }
      setFormData(prev => ({
        ...prev,
        nik: '',
        nama: '',
        no_tlp: '',
        alamat: '',
        keperluanId: pelayananList[0]?.id || DEFAULT_PELAYANAN[0].id
      }));
      setFormError('');
      window.scrollTo({ top: 100, behavior: 'smooth' });
    }
  };

  const selectedLayananObj = pelayananList.find(p => p.id === formData.keperluanId) || pelayananList[0] || DEFAULT_PELAYANAN[0];

  return (
    <div
      style={{
        backgroundImage: `linear-gradient(rgba(10, 15, 29, 0.82), rgba(10, 15, 29, 0.94)), url('${heroBg}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        padding: '24px 14px 48px',
        color: '#ffffff',
        fontFamily: 'var(--font-outfit), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div className="container" style={{ maxWidth: '640px' }}>

        {/* Navigation Bar: HANYA Tombol Beranda Menuju ke Landing Page */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <Link
            href="/"
            className="btn btn-sm rounded-pill px-3.5 py-2 text-white d-inline-flex align-items-center gap-2 shadow-sm"
            style={{
              backdropFilter: 'blur(10px)',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all 0.25s ease'
            }}
          >
            <i className="bi bi-house-door-fill text-warning"></i>
            <span className="small fw-semibold">Beranda Utama</span>
          </Link>

          <span className="badge rounded-pill px-3 py-1.5 small fw-bold font-monospace" style={{ background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.35)', color: '#fbbf24' }}>
            <i className="bi bi-broadcast me-1"></i> SISTEM ONLINE
          </span>
        </div>

        {/* Header Branding Card */}
        <div
          className="text-center mb-4 p-4 rounded-4 shadow-lg position-relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(251, 191, 36, 0.06), rgba(10, 15, 29, 0.75))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '2px solid rgba(251, 191, 36, 0.45)',
            boxShadow: '0 20px 45px rgba(0,0,0,0.6)'
          }}
        >
          {/* Logo Instansi: Cukup Tampilkan Logo Tambahan dari /settings/ */}
          {logoTambahan && (
            <div className="d-flex align-items-center justify-content-center mb-3">
              <img
                src={logoTambahan}
                alt="Logo Instansi"
                style={{
                  maxHeight: '75px',
                  maxWidth: '92%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))'
                }}
              />
            </div>
          )}

          {/* Slogan Badge */}
          <div className="mb-2">
            <span
              className="badge px-3 py-1.5 rounded-pill fw-bold shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: '#0f172a',
                fontSize: '0.8rem',
                letterSpacing: '0.3px',
                border: '1px solid #fef08a'
              }}
            >
              <i className="bi bi-stars me-1"></i> "SEMAngat memberIkan pelayanan NGgawe bungAH"
            </span>
          </div>

          <h2 className="fw-black mb-1 text-white" style={{ fontSize: '1.85rem', letterSpacing: '-0.5px' }}>
            ANTRIAN ONLINE WARGA
          </h2>
          <h5 className="fw-bold mb-1" style={{ color: '#fbbf24' }}>
            {instansiNama}
          </h5>
          <p className="small text-white-50 m-0">{instansiAlamat}</p>
        </div>

        {/* ========================================================================= */}
        {/* TAMPILAN 1: HASIL NOMOR ANTRIAN SETELAH SUBMIT / TIKET AKTIF */}
        {/* ========================================================================= */}
        {ticketResult ? (
          <div>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <span className="badge bg-success bg-opacity-90 px-3 py-2 rounded-pill small fw-bold d-inline-flex align-items-center gap-1.5 shadow-sm">
                <i className="bi bi-check-circle-fill"></i> Antrian Berhasil Diambil
              </span>
              <button
                onClick={handleAmbilBaru}
                className="btn btn-sm btn-outline-warning rounded-pill px-3 py-1.5 text-warning fw-bold d-inline-flex align-items-center gap-1.5 shadow-sm"
                style={{ backdropFilter: 'blur(6px)', background: 'rgba(251, 191, 36, 0.1)' }}
              >
                <i className="bi bi-plus-circle"></i> Ambil Antrian Baru
              </button>
            </div>

            {/* Kartu Tiket Digital */}
            <div
              ref={ticketCardRef}
              className="rounded-4 shadow-2xl position-relative overflow-hidden p-4 mb-4"
              style={{
                background: 'linear-gradient(145deg, #0a0f1d 0%, #1e293b 50%, #0a0f1d 100%)',
                border: '2px solid #fbbf24',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 25px rgba(251, 191, 36, 0.25)',
                color: '#ffffff'
              }}
            >
              {/* Header Tiket */}
              <div className="d-flex align-items-center justify-content-between border-bottom border-white border-opacity-15 pb-3 mb-3">
                <div className="d-flex align-items-center gap-2.5">
                  {logoTambahan && (
                    <img src={logoTambahan} alt="Logo" style={{ maxHeight: '38px', maxWidth: '180px', objectFit: 'contain' }} />
                  )}
                  <div>
                    <div className="fw-bold small text-white" style={{ letterSpacing: '0.5px' }}>PEMERINTAH KABUPATEN CILACAP</div>
                    <div className="small fw-bold text-warning" style={{ fontSize: '0.8rem' }}>{instansiNama.toUpperCase()}</div>
                  </div>
                </div>
                <span
                  className="badge px-3 py-1.5 rounded-pill fw-bold font-monospace"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#0f172a', fontSize: '0.75rem' }}
                >
                  ONLINE
                </span>
              </div>

              {/* Label & Nomor Antrian Utama */}
              <div className="text-center py-2">
                <span className="small text-uppercase fw-bold text-white-50" style={{ letterSpacing: '2px', fontSize: '0.8rem' }}>
                  NOMOR ANTRIAN ANDA
                </span>

                <div
                  className="fw-black text-warning my-2"
                  style={{
                    fontSize: '4.8rem',
                    lineHeight: 1,
                    letterSpacing: '-1px',
                    textShadow: '0 4px 20px rgba(251, 191, 36, 0.45), 0 2px 4px rgba(0,0,0,0.9)'
                  }}
                >
                  {ticketResult.nomor_lengkap}
                </div>

                <div className="d-inline-block px-3.5 py-1.5 rounded-pill mb-2 shadow-sm" style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8' }}>
                  <span className="fw-bold" style={{ color: '#38bdf8', fontSize: '0.98rem' }}>
                    {ticketResult.pelayanan_nama}
                  </span>
                </div>

                {ticketResult.loket && (
                  <div className="small fw-bold text-white-50 mt-1">
                    Menuju: <span className="text-warning fw-bold">{ticketResult.loket}</span>
                  </div>
                )}
              </div>

              {/* Garis Perforasi / Tiket Notch */}
              <div className="position-relative my-3 py-1">
                <div style={{ borderTop: '2px dashed rgba(255, 255, 255, 0.25)' }}></div>
                <div
                  style={{
                    position: 'absolute',
                    left: '-28px',
                    top: '-11px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#070b14'
                  }}
                ></div>
                <div
                  style={{
                    position: 'absolute',
                    right: '-28px',
                    top: '-11px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#070b14'
                  }}
                ></div>
              </div>

              {/* Data Warga Pemohon */}
              <div
                className="p-3.5 rounded-3 mb-3"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="row g-2.5 small">
                  <div className="col-12 border-bottom border-white border-opacity-10 pb-2 mb-1">
                    <span className="text-white-50 d-block" style={{ fontSize: '0.72rem' }}>Nama Pemohon</span>
                    <strong className="text-white fs-6">{ticketResult.warga_nama}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-white-50 d-block" style={{ fontSize: '0.72rem' }}>NIK KTP</span>
                    <strong className="text-white font-monospace">{ticketResult.warga_nik}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-white-50 d-block" style={{ fontSize: '0.72rem' }}>No. Telepon / WA</span>
                    <strong className="text-white">{ticketResult.warga_hp}</strong>
                  </div>
                  <div className="col-12 pt-1 border-top border-white border-opacity-10">
                    <span className="text-white-50 d-block" style={{ fontSize: '0.72rem' }}>Alamat Pemohon</span>
                    <span className="text-white fw-semibold">{ticketResult.warga_alamat}</span>
                  </div>
                </div>
              </div>

              {/* Status & Estimasi Menunggu */}
              <div className="d-flex align-items-center justify-content-between p-2.5 rounded-3 mb-3" style={{ background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.35)' }}>
                <div className="small">
                  <span className="text-white-50 d-block" style={{ fontSize: '0.72rem' }}>Sisa Antrian Menunggu</span>
                  <span className="fw-bold text-warning fs-6">{ticketResult.sisa_antrian || 0} Antrian</span>
                </div>
                <div className="text-end small">
                  <span className="text-white-50 d-block" style={{ fontSize: '0.72rem' }}>Status Saat Ini</span>
                  <span className="badge bg-warning text-dark fw-bold text-uppercase px-2.5 py-1">
                    {ticketResult.status || 'MENUNGGU'}
                  </span>
                </div>
              </div>

              {/* Waktu & Footer Tiket */}
              <div className="text-center pt-1 border-top border-white border-opacity-15">
                <div className="small text-white-50 d-flex align-items-center justify-content-center gap-1.5 mb-1" style={{ fontSize: '0.76rem' }}>
                  <i className="bi bi-clock-history text-warning"></i>
                  <span>Daftar: {ticketResult.waktu_str}</span>
                </div>
                <div className="text-white-50 fst-italic" style={{ fontSize: '0.72rem' }}>
                  Tunjukkan tiket nomor ini kepada petugas loket saat nomor dipanggil.
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS: DOWNLOAD GAMBAR & CETAK */}
            <div className="d-flex flex-column gap-2 mb-4">
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isDownloading}
                className="btn w-100 py-3 fw-bold rounded-pill shadow-lg d-flex align-items-center justify-content-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: '#0f172a',
                  border: 'none',
                  fontSize: '1.05rem',
                  boxShadow: '0 8px 25px rgba(245, 158, 11, 0.45)'
                }}
              >
                {isDownloading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>Menyiapkan Gambar Tiket...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-download fs-5"></i>
                    <span>Download Gambar Nomor Antrian (PNG)</span>
                  </>
                )}
              </button>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-outline-light w-50 py-2.5 rounded-pill small fw-bold d-flex align-items-center justify-content-center gap-1.5"
                  style={{ backdropFilter: 'blur(5px)', background: 'rgba(255,255,255,0.06)' }}
                >
                  <i className="bi bi-printer"></i>
                  <span>Cetak Tiket</span>
                </button>
                <button
                  type="button"
                  onClick={handleAmbilBaru}
                  className="btn btn-outline-secondary w-50 py-2.5 rounded-pill small fw-bold text-white-50 hover-text-white d-flex align-items-center justify-content-center gap-1.5"
                  style={{ backdropFilter: 'blur(5px)', background: 'rgba(255,255,255,0.04)' }}
                >
                  <i className="bi bi-arrow-repeat"></i>
                  <span>Ambil Baru</span>
                </button>
              </div>

              {/* Tombol Bantu Nilai Kami (SiSukma) */}
              <div className="pt-1">
                <a
                  href="https://sisukma.cilacapkab.go.id/Home/pelayanan/4012001"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-warning w-100 py-2.5 rounded-pill small fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  style={{ backdropFilter: 'blur(8px)', background: 'rgba(251, 191, 36, 0.08)' }}
                >
                  <i className="bi bi-star-fill text-warning"></i>
                  <span>Bantu Nilai Kami (SiSukma Cilacap)</span>
                  <i className="bi bi-box-arrow-up-right small"></i>
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* TAMPILAN 2: FORM RESTRUKTUR INPUT WARGA (NIK, NAMA, NO TLP, ALAMAT, KEPERLUAN) */
          /* ========================================================================= */
          <div
            className="card text-white p-4 p-md-4 shadow-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(10, 15, 29, 0.95), rgba(26, 36, 56, 0.95))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '2px solid rgba(251, 191, 36, 0.45)',
              borderRadius: '24px',
              boxShadow: '0 20px 45px rgba(0,0,0,0.65)'
            }}
          >
            <div className="border-bottom border-white border-opacity-15 pb-3 mb-3">
              <h4 className="fw-bold m-0 text-warning d-flex align-items-center gap-2">
                <i className="bi bi-card-checklist"></i> Formulir Pengambilan Antrian
              </h4>
              <p className="text-white-50 small m-0 mt-1">
                Silakan isi data identitas Anda dan pilih keperluan pelayanan di bawah ini.
              </p>
            </div>

            {formError && (
              <div className="alert alert-danger bg-danger border-0 text-white p-3 mb-3 rounded-3 small fw-semibold d-flex align-items-center gap-2 shadow-sm">
                <i className="bi bi-exclamation-triangle-fill fs-5 shrink-0"></i>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAmbilAntrian}>
              <div className="row g-3">
                {/* 1. NIK */}
                <div className="col-12">
                  <label className="form-label small fw-bold text-white d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-person-vcard text-warning me-1.5"></i>
                      NIK (Nomor Induk Kependudukan) <span className="text-danger">*</span>
                    </span>
                    <span className="small text-white-50 font-monospace" style={{ fontSize: '0.75rem' }}>
                      {formData.nik.length} / 16 Digit
                    </span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="nik"
                    className="form-control bg-dark text-white border-secondary py-2.5 rounded-3 font-monospace"
                    style={{ background: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                    placeholder="Contoh: 3301xxxxxxxxxxxx"
                    maxLength={16}
                    required
                    value={formData.nik}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                  <div className="text-white-50 mt-1" style={{ fontSize: '0.72rem' }}>
                    Masukkan 16 digit NIK sesuai e-KTP atau Kartu Keluarga Anda.
                  </div>
                </div>

                {/* 2. Nama Lengkap */}
                <div className="col-12">
                  <label className="form-label small fw-bold text-white">
                    <i className="bi bi-person text-warning me-1.5"></i>
                    Nama Lengkap Pemohon <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="nama"
                    className="form-control bg-dark text-white border-secondary py-2.5 rounded-3"
                    style={{ background: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                    placeholder="Nama lengkap sesuai e-KTP"
                    required
                    value={formData.nama}
                    onChange={handleChange}
                  />
                </div>

                {/* 3. No Telepon / WhatsApp */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-white">
                    <i className="bi bi-telephone text-warning me-1.5"></i>
                    No. Telepon / WhatsApp <span className="text-danger">*</span>
                  </label>
                  <input
                    type="tel"
                    name="no_tlp"
                    className="form-control bg-dark text-white border-secondary py-2.5 rounded-3"
                    style={{ background: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                    placeholder="Contoh: 081234567890"
                    required
                    value={formData.no_tlp}
                    onChange={handleChange}
                  />
                  <div className="text-white-50 mt-1" style={{ fontSize: '0.72rem' }}>
                    Nomor aktif untuk konfirmasi antrian.
                  </div>
                </div>

                {/* 4. Alamat */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-white">
                    <i className="bi bi-geo-alt text-warning me-1.5"></i>
                    Alamat Pemohon <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="alamat"
                    className="form-control bg-dark text-white border-secondary py-2.5 rounded-3"
                    style={{ background: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                    placeholder="Contoh: RT 02/03 Desa Gandrungmangu"
                    required
                    value={formData.alamat}
                    onChange={handleChange}
                  />
                </div>

                {/* 5. Keperluan (Sistem Antrian) */}
                <div className="col-12">
                  <label className="form-label small fw-bold text-white d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-briefcase text-warning me-1.5"></i>
                      Keperluan Pelayanan <span className="text-danger">*</span>
                    </span>
                    <span className="badge bg-warning text-dark font-monospace" style={{ fontSize: '0.7rem' }}>
                      KATEGORI: {selectedLayananObj?.kode || 'A'}
                    </span>
                  </label>

                  {/* Dropdown Select Keperluan */}
                  <select
                    name="keperluanId"
                    value={formData.keperluanId}
                    onChange={handleChange}
                    className="form-select bg-dark text-white border-secondary py-2.5 rounded-3 mb-2"
                    style={{ background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255, 255, 255, 0.25)' }}
                    required
                  >
                    {pelayananList.map((p) => (
                      <option key={p.id} value={p.id} className="bg-dark text-white">
                        [{p.kode}] {p.nama} {p.loket_nama ? `(${p.loket_nama})` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Visual Category Card Preview */}
                  {selectedLayananObj && (
                    <div
                      className="p-3 rounded-3 mt-2"
                      style={{
                        background: 'rgba(251, 191, 36, 0.08)',
                        border: '1px solid rgba(251, 191, 36, 0.35)'
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <strong className="text-warning">
                          <i className="bi bi-info-circle me-1"></i> {selectedLayananObj.nama}
                        </strong>
                        <span className="badge bg-dark text-warning border border-warning font-monospace">
                          Kode {selectedLayananObj.kode}
                        </span>
                      </div>
                      <p className="small text-white-50 m-0 mb-1">
                        {selectedLayananObj.deskripsi || 'Pelayanan administrasi umum Kecamatan Gandrungmangu.'}
                      </p>
                      <div className="small text-white-50 d-flex gap-3 mt-1">
                        <span><i className="bi bi-door-open text-warning me-1"></i> {selectedLayananObj.loket_nama || 'Loket Pelayanan'}</span>
                        <span><i className="bi bi-stopwatch text-warning me-1"></i> Estimasi ~{selectedLayananObj.estimasi_waktu || 15} Menit</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="btn w-100 py-3 fw-bold rounded-pill shadow-lg mt-4 fs-5"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: '#0f172a',
                  border: 'none',
                  letterSpacing: '0.3px',
                  boxShadow: '0 10px 25px rgba(245, 158, 11, 0.45)'
                }}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Memproses Nomor Antrian...
                  </>
                ) : (
                  <>
                    <i className="bi bi-ticket-perforated-fill me-2"></i> Ambil Antrian Sekarang
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Info Petunjuk Pelayanan */}
        <div
          className="p-3.5 rounded-4 text-white-50 small shadow-sm"
          style={{
            background: 'rgba(10, 15, 29, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="d-flex align-items-center gap-2 mb-2 text-warning fw-bold">
            <i className="bi bi-lightbulb-fill"></i>
            <span>Petunjuk Mengambil Antrian Online</span>
          </div>
          <ol className="m-0 ps-3 space-y-1">
            <li>Cukup masukkan <strong>NIK</strong>, <strong>Nama Lengkap</strong>, <strong>No Telepon/WA</strong>, <strong>Alamat</strong>, dan pilih <strong>Keperluan</strong>.</li>
            <li>Klik tombol <strong>Ambil Antrian Sekarang</strong> untuk memperoleh nomor antrian resmi dari sistem.</li>
            <li>Setelah nomor antrian muncul, klik tombol <strong>Download Gambar Nomor Antrian</strong> untuk menyimpan tiket ke galeri HP Anda.</li>
            <li>Datanglah ke Kantor Kecamatan Gandrungmangu sesuai jam pelayanan dan tunjukkan tiket nomor antrian digital kepada petugas loket.</li>
          </ol>
        </div>

        {/* Banner Bantu Nilai Kami (SiSukma Cilacap) */}
        <div className="text-center mt-3">
          <a
            href="https://sisukma.cilacapkab.go.id/Home/pelayanan/4012001"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm rounded-pill px-4 py-2 text-warning d-inline-flex align-items-center gap-2 shadow-sm"
            style={{ backdropFilter: 'blur(10px)', background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.35)' }}
          >
            <i className="bi bi-star-fill text-warning"></i>
            <span className="fw-bold">Bantu Nilai Pelayanan Kami di SiSukma</span>
            <i className="bi bi-box-arrow-up-right small"></i>
          </a>
        </div>

        {/* Footer info */}
        <div className="text-center text-white-50 small mt-4">
          &copy; {new Date().getFullYear()} Sistem Antrian Online • {instansiNama}
        </div>
      </div>
    </div>
  );
}
