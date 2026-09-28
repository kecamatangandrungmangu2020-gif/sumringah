"use client";

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, addDoc, Timestamp, doc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

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
  const [wargaForm, setWargaForm] = useState({ nama: '', alamat: '', hp: '' });
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

  // Keyboard shortcut listener (A, B, C)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedLayananForForm) return;
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT'
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const p = pelayanan.find(item => item.kode.toLowerCase() === key);
      if (p) {
        setSelectedLayananForForm(p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pelayanan, selectedLayananForForm]);

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
      <div id="kiosk-main-container" style={{
        backgroundImage: `linear-gradient(rgba(10, 15, 29, 0.82), rgba(10, 15, 29, 0.94)), url("${heroBg}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        color: '#ffffff',
        transition: 'background-image 0.5s ease-in-out'
      }}>
        <div className="container" style={{ maxWidth: '1150px' }}>

          {/* Top Glass Header Card */}
          <div className="text-center mb-4 position-relative p-4 p-md-5 rounded-4 shadow-2xl antrian-glass" style={{
            border: '2px solid rgba(251, 191, 36, 0.35)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            {/* Top Right Keluar Kiosk Button */}
            <Link
              href="/Antrian"
              className="btn btn-sm position-absolute top-0 end-0 m-3 rounded-pill px-3.5 py-1.5 fw-bold shadow-sm d-inline-flex align-items-center gap-1.5 text-white"
              style={{
                backdropFilter: 'blur(10px)',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontSize: '0.85rem'
              }}
            >
              <i className="bi bi-box-arrow-right text-warning"></i>
              <span>Kembali ke Portal</span>
            </Link>

            {/* Logos */}
            <div className="d-flex align-items-center justify-content-center mb-3">
              {logoTambahan ? (
                <img
                  src={logoTambahan}
                  alt="Logo Sistem Antrian"
                  style={{
                    maxWidth: '560px',
                    width: '100%',
                    height: 'auto',
                    maxHeight: '95px',
                    aspectRatio: '13 / 2',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.6))'
                  }}
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center gap-3 flex-wrap">
                  <img
                    src="/img/Logo.png"
                    alt="Logo Cilacap"
                    style={{ height: '78px', objectFit: 'contain', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))' }}
                  />
                  <img
                    src="/img/cilacap-bercahaya.png"
                    alt="Logo Cilacap Bercahaya"
                    style={{ height: '55px', objectFit: 'contain', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))' }}
                  />
                  <img
                    src="/img/logo-semringah.png"
                    alt="Logo Gandrung Mangu Semringah"
                    style={{ height: '78px', objectFit: 'contain', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))' }}
                  />
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
                  fontSize: '0.8rem',
                  letterSpacing: '0.3px',
                  border: '1px solid #fef08a'
                }}
              >
                <i className="bi bi-stars me-1"></i> "SEMAngat memberIkan pelayanan NGgawe bungAH"
              </span>
            </div>

            {/* Title & Subtitles */}
            <h1 className="fw-extrabold mb-1 text-white" style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              letterSpacing: '0.5px',
              textShadow: '0 4px 16px rgba(0,0,0,0.6)'
            }}>
              AMBIL NOMOR ANTRIAN
            </h1>
            <h3 className="text-info fw-bold mb-1" style={{ fontSize: '1.25rem' }}>
              {instansiNama}
            </h3>
            <p className="text-white-50 small mb-0">
              {instansiAlamat}
            </p>
          </div>

          {/* Success Notification */}
          {successMessage && (
            <div className="alert alert-success border-0 text-white p-3 mb-4 text-center rounded-4 shadow-lg fs-5 fw-bold d-flex align-items-center justify-content-center gap-2" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', border: '1px solid #6ee7b7' }}>
              <i className="bi bi-check-circle-fill"></i> {successMessage}
            </div>
          )}

          {/* 3 Service Cards */}
          <div className="row g-4 justify-content-center">
            {pelayanan.map((p, idx) => {
              const accentColor = p.kode === 'A' ? '#38bdf8' : p.kode === 'B' ? '#34d399' : p.kode === 'C' ? '#fbbf24' : '#818cf8';
              const glowClass = p.kode === 'A' ? 'glow-cyan' : p.kode === 'B' ? 'glow-emerald' : p.kode === 'C' ? 'glow-amber' : 'glow-indigo';
              return (
                <div className="col-12 col-md-4" key={p.id || p.kode}>
                  <div
                    onClick={() => setSelectedLayananForForm(p)}
                    className={`card text-decoration-none h-100 shadow-xl text-white antrian-glass antrian-glass-hover ${glowClass}`}
                    style={{
                      padding: '30px 24px',
                      cursor: 'pointer',
                      border: `1.5px solid rgba(255, 255, 255, 0.16)`
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span style={{
                        fontSize: '6.5rem',
                        fontWeight: 900,
                        color: accentColor,
                        lineHeight: 1,
                        letterSpacing: '-2px',
                        textShadow: `0 0 30px ${accentColor}40`,
                        userSelect: 'none'
                      }}>
                        {p.kode}
                      </span>
                      <span className="badge px-3 py-2 rounded-pill fs-6 shadow fw-bold" style={{ backgroundColor: `${accentColor}25`, color: accentColor, border: `1px solid ${accentColor}50` }}>
                        Estimasi: {p.estimasi_waktu || 15} mnt
                      </span>
                    </div>
                    <div>
                      <h2 className="fw-bold mb-2 text-white" style={{ fontSize: '1.6rem', lineHeight: 1.25 }}>
                        {p.nama}
                      </h2>
                      <p className="m-0 small fw-semibold" style={{ color: accentColor }}>
                        Tekan kartu ({p.kode}) atau sentuh layar.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Center Button: Kembali ke Portal Utama */}
          <div className="text-center mt-4">
            <Link
              href="/Antrian"
              className="btn btn-sm rounded-pill px-4 py-2 fw-bold shadow-lg d-inline-flex align-items-center gap-2 text-white"
              style={{
                backdropFilter: 'blur(10px)',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontSize: '0.9rem'
              }}
            >
              <i className="bi bi-arrow-left text-warning"></i> Kembali ke Portal Antrian
            </Link>
          </div>

        </div>
      </div>

      {/* Form Dialog for Citizen Info (Dark Frosted Glassmorphic Modal) */}
      {selectedLayananForForm && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center px-3" style={{ background: 'rgba(10, 15, 29, 0.75)', backdropFilter: 'blur(10px)', zIndex: 1050 }}>
          <div className="card text-white p-4 p-md-5 border-0 w-100 shadow-2xl" style={{ maxWidth: '560px', background: 'rgba(15, 23, 42, 0.94)', border: '1.5px solid rgba(255, 255, 255, 0.2)', borderRadius: '28px', boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}>
            <div className="text-center mb-4">
              <span className="badge px-3.5 py-1.5 rounded-pill mb-3 fs-6 fw-bold" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
                Kategori Layanan {selectedLayananForForm.kode}
              </span>
              <h2 className="fw-extrabold text-white">{selectedLayananForForm.nama}</h2>
              <p className="text-white-50 m-0 small">Silakan lengkapi data diri Anda sebelum mencetak tiket antrian.</p>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="mb-3">
                <label className="form-label text-white-50 fw-semibold small">Nama Lengkap</label>
                <input
                  type="text"
                  className="form-control text-white py-2.5 rounded-3"
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff' }}
                  placeholder="Masukkan nama lengkap"
                  required
                  value={wargaForm.nama}
                  onChange={e => setWargaForm({ ...wargaForm, nama: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-white-50 fw-semibold small">Alamat Rumah</label>
                <input
                  type="text"
                  className="form-control text-white py-2.5 rounded-3"
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff' }}
                  placeholder="Masukkan alamat lengkap (Desa / RT / RW)"
                  required
                  value={wargaForm.alamat}
                  onChange={e => setWargaForm({ ...wargaForm, alamat: e.target.value })}
                />
              </div>

              <div className="mb-4">
                <label className="form-label text-white-50 fw-semibold small">Nomor HP / WhatsApp</label>
                <input
                  type="tel"
                  className="form-control text-white py-2.5 rounded-3"
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff' }}
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
                    className="btn btn-outline-light w-100 py-2.5 rounded-pill fw-bold text-white-50"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.25)' }}
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
                    className="btn w-100 py-2.5 rounded-pill fw-bold text-dark shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', border: 'none' }}
                  >
                    {loading ? 'Memproses...' : 'Ambil & Cetak'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

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
            {ticketToPrint.loketNama &&
              ticketToPrint.kode?.toUpperCase() !== 'C' &&
              ticketToPrint.kode?.toUpperCase() !== 'A' &&
              !ticketToPrint.nomorLengkap?.toUpperCase()?.startsWith('C') &&
              !ticketToPrint.nomorLengkap?.toUpperCase()?.startsWith('A') &&
              !ticketToPrint.pelayananNama?.toLowerCase()?.includes('perekaman') &&
              !ticketToPrint.loketNama?.toLowerCase()?.includes('loket a') && (
                <div className="loket" style={{ fontSize: '13pt', fontWeight: 'bold', marginTop: '2mm', textTransform: 'uppercase', border: '1px dashed #000', padding: '1mm 0' }}>
                  MENUJU: {ticketToPrint.loketNama}
                </div>
              )}
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
        </div>
      )}

      {/* CSS Styles for 80mm POS Thermal Printer */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            min-height: auto !important;
          }
          #kiosk-main-container {
            display: none !important;
          }
          #printable-ticket {
            display: block !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 5mm 6mm !important;
            box-sizing: border-box !important;
            text-align: center !important;
            font-family: 'Courier New', Courier, monospace !important;
            background: #ffffff !important;
            color: #000000 !important;
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
            margin: 3mm 0 !important;
            line-height: 1 !important;
          }
          .ticket-body {
            margin: 4mm 0 !important;
          }
          .ticket-body .title {
            font-size: 10pt !important;
            font-weight: bold !important;
            margin: 0 0 2mm 0 !important;
            letter-spacing: 0.5px !important;
          }
          .ticket-body .nomor {
            font-size: 42pt !important;
            font-weight: bold !important;
            margin: 2mm 0 !important;
            line-height: 1 !important;
          }
          .ticket-body .layanan {
            font-size: 11pt !important;
            font-weight: bold !important;
            margin: 2mm 0 0 0 !important;
            text-transform: uppercase !important;
            line-height: 1.2 !important;
          }
          .sisa-antrian {
            font-size: 10pt !important;
            font-weight: bold !important;
            margin: 2mm 0 0 0 !important;
            line-height: 1.2 !important;
          }
          .ticket-footer {
            font-size: 8pt !important;
            line-height: 1.4 !important;
            margin-top: 3mm !important;
          }
          .ticket-footer .waktu {
            margin: 0 0 2mm 0 !important;
          }
          .ticket-footer .pesan {
            margin: 0 !important;
            font-weight: bold !important;
          }
          .ticket-footer .terimakasih {
            margin: 1mm 0 0 0 !important;
            font-style: italic !important;
          }
        }
      `}} />
    </>
  );
}
