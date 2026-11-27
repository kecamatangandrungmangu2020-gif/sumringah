'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Ticket,
  User,
  CreditCard,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  DoorOpen,
  Download,
  Printer,
  RotateCcw,
  Star,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Users,
  PlusCircle,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, addDoc, Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { BackgroundPattern } from '@/components/landing/BackgroundPattern';
import { NightModeSwitch } from '@/components/ui/NightModeSwitch';

const DEFAULT_PELAYANAN = [
  { id: 'layanan-a', kode: 'A', nama: 'Legalisasi Dokumen', deskripsi: 'Legalisasi berkas, surat keterangan, rekomendasi umum', loket_nama: 'Loket 1', estimasi_waktu: 15 },
  { id: 'layanan-b', kode: 'B', nama: 'Pelayanan Kependudukan', deskripsi: 'Penerbitan KK, KTP elektronik, Surat Pindah (SKPWNI), Akta', loket_nama: 'Loket 2', estimasi_waktu: 20 },
  { id: 'layanan-c', kode: 'C', nama: 'Perekaman KTP-el', deskripsi: 'Perekaman biometrik KTP pemula, rekam ulang, foto iris & sidik jari', loket_nama: 'Ruang Perekaman', estimasi_waktu: 20 },
];

export default function AntrianOnline() {
  const [instansiNama, setInstansiNama] = useState('Kecamatan Gandrungmangu');
  const [instansiAlamat, setInstansiAlamat] = useState('Jalan Pertiwi Nomor 01 Gandrungmangu, Cilacap');
  const [pelayananList, setPelayananList] = useState(DEFAULT_PELAYANAN);
  const [loadingData, setLoadingData] = useState(true);

  const [logoTambahan, setLogoTambahan] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          const raw = parsed.logoTambahanUrl || parsed.logoTambahanBase64;
          if (raw) return raw;
        }
      } catch {}
    }
    return '';
  });

  const [formData, setFormData] = useState({
    nik: '',
    nama: '',
    no_tlp: '',
    alamat: '',
    keperluanId: DEFAULT_PELAYANAN[0].id,
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const ticketCardRef = useRef(null);

  // Load Logos from /api/village-profile/ & Firestore settings/village
  useEffect(() => {
    fetch('/api/village-profile/?t=' + Date.now(), { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          if (data.logoTambahanUrl) setLogoTambahan(data.logoTambahanUrl);
        }
      })
      .catch(() => {});

    if (db) {
      const unsubVillage = onSnapshot(
        doc(db, 'settings', 'village'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (d.logoTambahanUrl) setLogoTambahan(d.logoTambahanUrl);
          }
        },
        () => {}
      );
      return () => unsubVillage();
    }
  }, []);

  // Load active ticket from localStorage on mount (today only)
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
      } catch {}
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
            if (list.length > 0) {
              setFormData((prev) => ({ ...prev, keperluanId: list[0].id }));
            }
          }
        }
      } catch {
        setFormData((prev) => ({ ...prev, keperluanId: DEFAULT_PELAYANAN[0].id }));
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'nik') {
      const cleanVal = value.replace(/\D/g, '').slice(0, 16);
      setFormData((prev) => ({ ...prev, nik: cleanVal }));
    } else if (name === 'no_tlp') {
      const cleanVal = value.replace(/[^\d+ -]/g, '').slice(0, 18);
      setFormData((prev) => ({ ...prev, no_tlp: cleanVal }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setFormError('');
  };

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

    const selectedLayanan =
      pelayananList.find((p) => p.id === formData.keperluanId) ||
      pelayananList[0] ||
      DEFAULT_PELAYANAN[0];
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
          const q = query(collection(db, 'antrian'), where('created_at', '>=', startOfDay));
          const antrianSnap = await getDocs(q);

          const todayQueues = antrianSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter(
              (item) =>
                item.pelayanan_id === selectedLayanan.id ||
                item.kode === selectedLayanan.kode ||
                item.pelayanan_nama === selectedLayanan.nama
            );

          if (todayQueues.length > 0) {
            const numbers = todayQueues.map((item) => item.nomor || 0);
            nextNumber = Math.max(...numbers, 0) + 1;
          }

          sisaAntrian = todayQueues.filter((item) => item.status === 'menunggu').length;
        } catch (queryErr) {
          console.warn('Gagal membaca antrian sebelumnya:', queryErr);
        }
      }

      const nomorLengkap = `${selectedLayanan.kode}-${nextNumber}`;
      const isKodeC =
        selectedLayanan.kode?.toUpperCase() === 'C' ||
        selectedLayanan.nama?.toLowerCase().includes('perekaman');
      const isKodeA =
        selectedLayanan.kode?.toUpperCase() === 'A' ||
        selectedLayanan.loket_nama?.toLowerCase().includes('loket a') ||
        selectedLayanan.loket_nama?.toLowerCase().includes('loket 1');

      const waktuFormatted = new Date().toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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
        loket: isKodeC || isKodeA ? null : selectedLayanan.loket_nama || null,
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
        created_at_str: new Date().toISOString(),
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

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error saat mengambil antrian:', err);
      setFormError('Terjadi kesalahan saat memproses antrian. Silakan coba kembali.');
    } finally {
      setSubmitting(false);
    }
  };

  // Unduh Tiket Gambar (Fallback Canvas Renderer — Sovereign Deep Emerald + Champagne Gold)
  const downloadWithCanvasFallback = (ticket) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = 640;
      const height = 900;
      canvas.width = width;
      canvas.height = height;

      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#041E17');
      grad.addColorStop(0.5, '#065F46');
      grad.addColorStop(1, '#041E17');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#C8A253';
      ctx.lineWidth = 6;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      ctx.fillStyle = '#C8A253';
      ctx.fillRect(30, 30, width - 60, 60);
      ctx.fillStyle = '#041E17';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TIKET ANTRIAN ONLINE', width / 2, 68);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(instansiNama.toUpperCase(), width / 2, 130);
      ctx.fillStyle = '#F5E9CC';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(instansiAlamat, width / 2, 155);

      ctx.strokeStyle = 'rgba(200, 162, 83, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 180);
      ctx.lineTo(width - 40, 180);
      ctx.stroke();

      ctx.fillStyle = '#E5C882';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('NOMOR ANTRIAN ANDA', width / 2, 220);

      ctx.fillStyle = '#FAF8F5';
      ctx.font = 'bold 88px system-ui, sans-serif';
      ctx.fillText(ticket.nomor_lengkap, width / 2, 312);

      ctx.fillStyle = '#E5C882';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(ticket.pelayanan_nama, width / 2, 360);

      if (ticket.loket) {
        ctx.fillStyle = '#F5E9CC';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText(`MENUJU: ${ticket.loket.toUpperCase()}`, width / 2, 395);
      }

      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(229, 200, 130, 0.45)';
      ctx.beginPath();
      ctx.moveTo(40, 430);
      ctx.lineTo(width - 40, 430);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(4, 30, 23, 0.55)';
      ctx.fillRect(45, 450, width - 90, 240);
      ctx.strokeStyle = 'rgba(200, 162, 83, 0.4)';
      ctx.strokeRect(45, 450, width - 90, 240);

      ctx.textAlign = 'left';
      const leftMargin = 65;
      let y = 490;

      const drawRow = (label, val, valColor = '#ffffff') => {
        ctx.font = '15px system-ui, sans-serif';
        ctx.fillStyle = '#E5C882';
        ctx.fillText(label, leftMargin, y);
        ctx.fillStyle = valColor;
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillText(`: ${val}`, leftMargin + 140, y);
        y += 38;
      };

      drawRow('Nama Pemohon', ticket.warga_nama);
      drawRow('NIK Pemohon', ticket.warga_nik);
      drawRow('No. Telepon/WA', ticket.warga_hp);
      const alamatCut =
        ticket.warga_alamat.length > 36
          ? ticket.warga_alamat.substring(0, 34) + '...'
          : ticket.warga_alamat;
      drawRow('Alamat', alamatCut);
      drawRow('Waktu Daftar', ticket.waktu_str, '#F5E9CC');

      ctx.textAlign = 'center';
      ctx.fillStyle = '#E5C882';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`Sisa Antrian Menunggu Sebelum Anda: ${ticket.sisa_antrian || 0} Orang`, width / 2, 730);

      ctx.fillStyle = '#F5E9CC';
      ctx.font = 'italic 13px system-ui, sans-serif';
      ctx.fillText('*Tunjukkan tiket digital ini saat tiba di loket pelayanan.', width / 2, 780);
      ctx.fillText('"SEMAngat memberIkan pelayanan NGgawe bungAH"', width / 2, 810);

      ctx.fillStyle = 'rgba(200, 162, 83, 0.45)';
      ctx.font = '11px monospace';
      ctx.fillText(`VERIFIKASI ID: ${ticket.id || 'ONLINE-VALID'}`, width / 2, 862);

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

  const handleDownloadImage = async () => {
    if (!ticketResult) return;
    setIsDownloading(true);
    try {
      if (ticketCardRef.current) {
        const { toPng } = await import('html-to-image');
        const dataUrl = await toPng(ticketCardRef.current, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: '#041E17',
          cacheBust: true,
          style: {
            transform: 'none',
            borderRadius: '24px',
          },
        });
        const link = document.createElement('a');
        link.download = `Tiket-Antrian-${ticketResult.nomor_lengkap}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        downloadWithCanvasFallback(ticketResult);
      }
    } catch {
      downloadWithCanvasFallback(ticketResult);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAmbilBaru = () => {
    if (confirm('Apakah Anda ingin mengambil antrian baru? Data tiket sebelumnya di layar ini akan digantikan.')) {
      setTicketResult(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('antrian_online_ticket');
      }
      setFormData({
        nik: '',
        nama: '',
        no_tlp: '',
        alamat: '',
        keperluanId: pelayananList[0]?.id || DEFAULT_PELAYANAN[0].id,
      });
      setFormError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectedLayananObj =
    pelayananList.find((p) => p.id === formData.keperluanId) ||
    pelayananList[0] ||
    DEFAULT_PELAYANAN[0];

  const nikValid = formData.nik.length === 16;

  return (
    <div className="relative min-h-screen bg-[#FAF8F5] dark:bg-[#05110E] text-[#041E17] dark:text-[#FAF8F5] flex flex-col transition-colors duration-300 overflow-x-clip">
      <BackgroundPattern />

      {/* Top Floating Porcelain Capsule Header */}
      <header className="sticky top-0 z-40 px-3 sm:px-6 pt-2.5 pb-1.5 print:hidden">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 h-13 sm:h-14 rounded-full bg-white/95 dark:bg-[#0A1F1A]/95 backdrop-blur-xl border border-[#E6E0D3] dark:border-[#C8A253]/20 shadow-[0_8px_24px_rgba(4,30,23,0.08)]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#065F46] hover:bg-[#041E17] text-white font-hero text-xs font-bold transition-all shadow-sm shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Beranda</span>
            </Link>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="font-hero font-extrabold text-sm text-[#041E17] dark:text-white leading-none truncate">
                Antrian Online Warga
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#065F46] dark:text-[#E5C882] mt-0.5">
                {instansiNama} • Layanan Digital
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/kunjungan-tamu/"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F3EFE6] hover:bg-[#C8A253] text-[#041E17] dark:bg-white/10 dark:text-[#E5C882] dark:hover:bg-[#C8A253] dark:hover:text-[#041E17] border border-[#C8A253]/30 font-hero text-[11px] font-bold transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Register Kunjungan</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#065F46]/10 dark:bg-[#C8A253]/15 border border-[#065F46]/20 dark:border-[#C8A253]/30 font-mono text-[10px] font-bold text-[#065F46] dark:text-[#E5C882]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
            <NightModeSwitch size="sm" />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-3 sm:px-6 py-3.5 sm:py-5 flex-1 space-y-4">
        {/* Sovereign Deep Emerald Compact Hero Banner */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-[24px] px-5 py-4 sm:px-7 sm:py-5 bg-gradient-to-br from-[#065F46] via-[#064E3B] to-[#041E17] text-white border border-[#C8A253]/30 shadow-[0_18px_45px_rgba(4,30,23,0.2)] print:hidden"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-3 bottom-0 w-28 h-32 opacity-[0.18] bg-no-repeat bg-contain bg-right-bottom"
            style={{ backgroundImage: "url('/images/tugu-gandrungmangu-silhouette.webp')" }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#C8A253] text-[#041E17] font-hero text-[10px] font-extrabold tracking-wide shadow-sm">
                <Sparkles className="w-3 h-3" />
                <span>&ldquo;SEMAngat memberIkan pelayanan NGgawe bungAH&rdquo;</span>
              </div>
              <h1 className="font-hero font-black text-2xl sm:text-3xl tracking-tight leading-tight">
                Ambil Nomor <span className="text-[#E5C882]">Antrian Online</span>
              </h1>
              <p className="font-hero text-xs sm:text-sm text-[#F5E9CC]/85 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#E5C882] shrink-0" />
                <span className="truncate">{instansiNama} — {instansiAlamat}</span>
              </p>
            </div>

            {logoTambahan && (
              <div className="hidden md:flex items-center justify-center px-4 py-2 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm shrink-0">
                <img
                  src={logoTambahan}
                  alt="Logo Instansi"
                  className="max-h-12 max-w-[160px] object-contain drop-shadow"
                />
              </div>
            )}
          </div>
        </motion.section>

        {/* Main 2-Column Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT (7 Cols): Ticket Result OR Form */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {ticketResult ? (
                <motion.div
                  key="ticket-view"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Status Bar */}
                  <div className="flex items-center justify-between gap-2 print:hidden">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white font-hero text-xs font-bold shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Antrian Berhasil Diambil
                    </span>
                    <button
                      type="button"
                      onClick={handleAmbilBaru}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F3EFE6] hover:bg-[#C8A253] text-[#041E17] dark:bg-white/10 dark:text-[#E5C882] border border-[#C8A253]/35 font-hero text-xs font-bold transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Ambil Antrian Baru
                    </button>
                  </div>

                  {/* Digital Boarding-Pass Ticket Card */}
                  <div
                    ref={ticketCardRef}
                    className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#041E17] via-[#064E3B] to-[#041E17] text-white border-2 border-[#C8A253]/70 p-5 sm:p-6 shadow-[0_24px_60px_rgba(4,30,23,0.35)]"
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute right-2 bottom-2 w-36 h-40 opacity-[0.14] bg-no-repeat bg-contain bg-right-bottom"
                      style={{ backgroundImage: "url('/images/tugu-gandrungmangu-silhouette.webp')" }}
                    />

                    {/* Ticket Top Header */}
                    <div className="relative z-10 flex items-center justify-between gap-3 pb-4 border-b border-white/15">
                      <div>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#E5C882]">
                          Pemerintah Kabupaten Cilacap
                        </p>
                        <h2 className="font-hero text-sm sm:text-base font-extrabold text-white">
                          {instansiNama.toUpperCase()}
                        </h2>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#C8A253] to-[#E5C882] text-[#041E17] font-mono text-[10.5px] font-black tracking-wider">
                        TIKET ONLINE
                      </span>
                    </div>

                    {/* Giant Queue Number */}
                    <div className="relative z-10 text-center py-5">
                      <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-[#F5E9CC]/80">
                        Nomor Antrian Anda
                      </span>
                      <div className="font-hero font-black text-6xl sm:text-7xl tracking-tight text-[#E5C882] my-2 drop-shadow-[0_6px_22px_rgba(200,162,83,0.4)]">
                        {ticketResult.nomor_lengkap}
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-[#E5C882]/45 text-[#F5E9CC] font-hero text-sm font-bold">
                        <Briefcase className="w-3.5 h-3.5 text-[#E5C882]" />
                        <span>{ticketResult.pelayanan_nama}</span>
                      </div>
                      {ticketResult.loket && (
                        <p className="mt-2 font-hero text-xs text-[#F5E9CC]/80">
                          Menuju: <strong className="text-[#E5C882]">{ticketResult.loket}</strong>
                        </p>
                      )}
                    </div>

                    {/* Perforated Divider */}
                    <div className="relative my-3 border-t-2 border-dashed border-[#C8A253]/40">
                      <span className="absolute -left-8 -top-3 w-6 h-6 rounded-full bg-[#FAF8F5] dark:bg-[#05110E]" />
                      <span className="absolute -right-8 -top-3 w-6 h-6 rounded-full bg-[#FAF8F5] dark:bg-[#05110E]" />
                    </div>

                    {/* Applicant Details */}
                    <div className="relative z-10 rounded-2xl bg-[#041E17]/60 border border-white/10 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="sm:col-span-2 pb-2 border-b border-white/10">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#E5C882] block">
                          Nama Pemohon
                        </span>
                        <strong className="font-hero text-sm text-white">{ticketResult.warga_nama}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#E5C882] block">
                          NIK KTP
                        </span>
                        <strong className="font-mono text-white">{ticketResult.warga_nik}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#E5C882] block">
                          No. Telepon / WA
                        </span>
                        <strong className="font-mono text-white">{ticketResult.warga_hp}</strong>
                      </div>
                      <div className="sm:col-span-2 pt-2 border-t border-white/10">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#E5C882] block">
                          Alamat
                        </span>
                        <span className="font-hero text-white/95">{ticketResult.warga_alamat}</span>
                      </div>
                    </div>

                    {/* Remaining Queue & Status */}
                    <div className="relative z-10 mt-3.5 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#C8A253]/15 border border-[#C8A253]/40">
                      <div>
                        <span className="font-mono text-[10px] uppercase text-[#F5E9CC]/80 block">
                          Sisa Antrian Menunggu
                        </span>
                        <strong className="font-hero text-base text-[#E5C882]">
                          {ticketResult.sisa_antrian || 0} Antrian
                        </strong>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#C8A253] text-[#041E17] font-mono text-[10.5px] font-black uppercase">
                        {ticketResult.status || 'MENUNGGU'}
                      </span>
                    </div>

                    {/* Timestamp Footer */}
                    <div className="relative z-10 mt-4 pt-3 border-t border-white/10 text-center space-y-1">
                      <p className="font-mono text-[10.5px] text-[#F5E9CC]/85 flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#E5C882]" />
                        <span>Daftar: {ticketResult.waktu_str}</span>
                      </p>
                      <p className="font-hero text-[11px] italic text-white/65">
                        Tunjukkan tiket nomor ini kepada petugas loket saat nomor dipanggil.
                      </p>
                    </div>
                  </div>

                  {/* Ticket Actions */}
                  <div className="space-y-2.5 print:hidden">
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      disabled={isDownloading}
                      className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-[#C8A253] via-[#D8B464] to-[#B8903D] hover:brightness-105 text-[#041E17] font-hero font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Menyiapkan Gambar Tiket...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download Gambar Nomor Antrian (PNG)</span>
                        </>
                      )}
                    </button>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="py-2.5 px-4 rounded-full bg-white dark:bg-[#0A1F1A] border border-[#E6E0D3] dark:border-[#C8A253]/25 hover:border-[#065F46] text-[#041E17] dark:text-white font-hero text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#065F46] dark:text-[#E5C882]" />
                        <span>Cetak Tiket</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAmbilBaru}
                        className="py-2.5 px-4 rounded-full bg-white dark:bg-[#0A1F1A] border border-[#E6E0D3] dark:border-[#C8A253]/25 hover:border-[#C8A253] text-[#041E17] dark:text-white font-hero text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[#C8A253]" />
                        <span>Ambil Baru</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form-view"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-[26px] bg-white/95 dark:bg-[#0A1F1A]/95 border border-[#E6E0D3] dark:border-[#C8A253]/25 p-5 sm:p-6 shadow-[0_14px_40px_rgba(4,30,23,0.08)] space-y-5"
                >
                  <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-[#E6E0D3] dark:border-white/10">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#C8A253]">
                        Formulir Resmi Pemohon
                      </span>
                      <h2 className="font-hero text-lg sm:text-xl font-extrabold text-[#041E17] dark:text-white leading-tight">
                        Pendaftaran Nomor Antrian
                      </h2>
                    </div>
                    <span className="h-10 w-10 rounded-2xl bg-[#F3EFE6] dark:bg-[#064E3B] text-[#065F46] dark:text-[#E5C882] flex items-center justify-center shrink-0">
                      <Ticket className="w-5 h-5" />
                    </span>
                  </div>

                  {formError && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-hero text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleAmbilAntrian} className="space-y-4">
                    {/* 1. Pilih Layanan Visual Cards */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-hero text-[11px] font-extrabold uppercase tracking-wider text-[#041E17] dark:text-slate-200 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-[#065F46] dark:text-[#E5C882]" />
                          <span>Pilih Keperluan Pelayanan</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B] text-[#065F46] dark:text-[#E5C882]">
                          Kode {selectedLayananObj?.kode || 'A'}
                        </span>
                      </div>

                      {loadingData ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {[1, 2, 3].map((n) => (
                            <div key={n} className="h-20 rounded-2xl bg-[#F3EFE6] dark:bg-white/10 animate-pulse" />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {pelayananList.map((p) => {
                            const active = formData.keperluanId === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, keperluanId: p.id }))}
                                className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                                  active
                                    ? 'bg-gradient-to-br from-[#065F46] to-[#041E17] text-white border-[#C8A253] shadow-md scale-[1.01]'
                                    : 'bg-[#FAF8F5] dark:bg-[#05110E] hover:border-[#065F46]/60 border-[#E6E0D3] dark:border-white/10 text-[#041E17] dark:text-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <span
                                    className={`h-7 w-7 rounded-lg font-mono text-xs font-black flex items-center justify-center ${
                                      active
                                        ? 'bg-[#C8A253] text-[#041E17]'
                                        : 'bg-[#F3EFE6] dark:bg-[#064E3B] text-[#065F46] dark:text-[#E5C882]'
                                    }`}
                                  >
                                    {p.kode}
                                  </span>
                                  <span className={`font-mono text-[9.5px] font-semibold ${active ? 'text-[#E5C882]' : 'text-slate-500 dark:text-slate-400'}`}>
                                    ~{p.estimasi_waktu || 15} mnt
                                  </span>
                                </div>
                                <div>
                                  <p className="font-hero text-xs font-extrabold leading-snug line-clamp-2">
                                    {p.nama}
                                  </p>
                                  <p className={`font-mono text-[9.5px] mt-0.5 truncate ${active ? 'text-[#F5E9CC]/80' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {p.loket_nama || 'Loket Pelayanan'}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 2. Identitas Pemohon Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      {/* NIK */}
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="font-hero text-[11px] font-extrabold uppercase tracking-wider text-[#041E17] dark:text-slate-200 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-[#065F46] dark:text-[#E5C882]" />
                            <span>NIK (16 Digit e-KTP / KK)</span>
                            <span className="text-rose-500">*</span>
                          </label>
                          <span
                            className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              nikValid
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-[#F3EFE6] text-slate-600 dark:bg-white/10 dark:text-slate-400'
                            }`}
                          >
                            {formData.nik.length} / 16 Digit
                          </span>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          name="nik"
                          placeholder="Contoh: 3301xxxxxxxxxxxx"
                          maxLength={16}
                          required
                          value={formData.nik}
                          onChange={handleChange}
                          autoComplete="off"
                          className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#05110E] border border-[#E6E0D3] dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 font-mono text-sm tracking-wider focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                        />
                      </div>

                      {/* Nama Lengkap */}
                      <div className="sm:col-span-2">
                        <label className="font-hero text-[11px] font-extrabold uppercase tracking-wider text-[#041E17] dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                          <User className="w-3.5 h-3.5 text-[#065F46] dark:text-[#E5C882]" />
                          <span>Nama Lengkap Pemohon</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="nama"
                          placeholder="Nama lengkap sesuai e-KTP"
                          required
                          value={formData.nama}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#05110E] border border-[#E6E0D3] dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                        />
                      </div>

                      {/* No. Telepon / WA */}
                      <div>
                        <label className="font-hero text-[11px] font-extrabold uppercase tracking-wider text-[#041E17] dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#065F46] dark:text-[#E5C882]" />
                          <span>No. Telepon / WA</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          name="no_tlp"
                          placeholder="08xx-xxxx-xxxx"
                          required
                          value={formData.no_tlp}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#05110E] border border-[#E6E0D3] dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                        />
                      </div>

                      {/* Alamat */}
                      <div>
                        <label className="font-hero text-[11px] font-extrabold uppercase tracking-wider text-[#041E17] dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#065F46] dark:text-[#E5C882]" />
                          <span>Alamat / Desa</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="alamat"
                          placeholder="RT 02/03 Desa Gandrungmangu"
                          required
                          value={formData.alamat}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#05110E] border border-[#E6E0D3] dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                        />
                      </div>
                    </div>

                    {/* Submit CTA */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 px-6 rounded-full neu-btn-primary font-hero font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Memproses Nomor Antrian...</span>
                        </>
                      ) : (
                        <>
                          <Ticket className="w-4 h-4 text-[#E5C882]" />
                          <span>Ambil Nomor Antrian Sekarang</span>
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT (5 Cols): Selected Service Info + 4-Step Guide + SiSukma */}
          <div className="lg:col-span-5 space-y-4 print:hidden">
            {/* Ringkasan Layanan Terpilih */}
            {selectedLayananObj && (
              <div className="card-Kecamatan p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#C8A253]">
                    Layanan Terpilih
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#065F46] text-white font-mono text-[10px] font-bold">
                    KODE {selectedLayananObj.kode}
                  </span>
                </div>
                <h3 className="font-hero text-base sm:text-lg font-extrabold text-[#041E17] dark:text-white leading-snug">
                  {selectedLayananObj.nama}
                </h3>
                <p className="font-hero text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedLayananObj.deskripsi || 'Pelayanan administrasi resmi Kecamatan Gandrungmangu.'}
                </p>
                <div className="pt-2.5 border-t border-[#E6E0D3] dark:border-white/10 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#065F46] dark:text-[#E5C882]">
                  <span className="inline-flex items-center gap-1.5">
                    <DoorOpen className="w-3.5 h-3.5" />
                    {selectedLayananObj.loket_nama || 'Loket Pelayanan'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Estimasi ~{selectedLayananObj.estimasi_waktu || 15} Menit
                  </span>
                </div>
              </div>
            )}

            {/* Panduan 4 Langkah */}
            <div className="rounded-[22px] bg-white/95 dark:bg-[#0A1F1A]/95 border border-[#E6E0D3] dark:border-[#C8A253]/20 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-[#065F46] dark:text-[#E5C882]">
                <ShieldCheck className="w-4 h-4" />
                <h3 className="font-hero text-xs font-extrabold uppercase tracking-wider">
                  Petunjuk Antrian Online
                </h3>
              </div>
              <ol className="space-y-2.5">
                {[
                  'Pilih jenis keperluan layanan (Legalisasi, Kependudukan, atau Perekaman KTP-el).',
                  'Isi 16 digit NIK, Nama Lengkap, No. WA aktif, dan Alamat sesuai e-KTP.',
                  'Klik Ambil Nomor Antrian lalu simpan tiket PNG ke galeri HP Anda.',
                  'Datang ke Kantor Kecamatan & tunjukkan tiket saat nomor dipanggil petugas.',
                ].map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="h-5 w-5 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B] text-[#065F46] dark:text-[#E5C882] font-mono text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* SiSukma Rating Card */}
            <a
              href="https://sisukma.cilacapkab.go.id/Home/pelayanan/4012001"
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-[22px] p-4 bg-gradient-to-r from-[#C8A253] via-[#D8B464] to-[#B8903D] text-[#041E17] shadow-md hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-10 w-10 rounded-xl bg-[#041E17] text-[#E5C882] flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 fill-[#E5C882]" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-hero text-xs sm:text-sm font-black leading-tight">
                      Bantu Nilai Pelayanan Kami
                    </p>
                    <p className="font-hero text-[11px] font-semibold text-[#041E17]/80 truncate">
                      Survei Kepuasan Masyarakat (SiSukma Cilacap)
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
