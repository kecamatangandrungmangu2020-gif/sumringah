'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileSpreadsheet,
  FileText,
  Mail,
  MessageSquareWarning,
  Package,
  Printer,
  Search,
  Send,
  Star,
  Upload,
  UserCheck,
  Users,
  Clock,
  Loader2,
  AlertCircle,
  Check,
  Building2,
} from 'lucide-react';
import {
  AttachmentMeta,
  CATEGORY_META,
  DAFTAR_DESA_GANDRUNGMANGU,
  InputChannel,
  KunjunganCategory,
  KunjunganTamuRecord,
  STATUS_META,
  TARGET_SECTION_OPTIONS,
  VISITOR_STATUS_OPTIONS,
  VisitorStatusType,
} from '@/types/kunjungan-tamu';
import { printKunjunganReceipt } from './PrintReceipt';

const CATEGORY_ICONS: Record<KunjunganCategory, React.ElementType> = {
  KUNJUNGAN_TAMU: Users,
  PENGAJUAN_PROPOSAL: ClipboardList,
  PENYERAHAN_SPJ_BERKAS: FileSpreadsheet,
  SURAT_KETERANGAN_NON_PATEN: Mail,
  PENGIRIMAN_BARANG: Package,
  PENGADUAN: MessageSquareWarning,
};

function formatRupiahInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return 'Rp ' + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function KunjunganTamuPortal({
  initialChannel = 'mandiri_hp',
  embedded = false,
  onClose,
}: {
  initialChannel?: InputChannel;
  embedded?: boolean;
  onClose?: () => void;
}) {
  const [activeMode, setActiveMode] = useState<'form' | 'track'>('form');
  const [inputChannel, setInputChannel] = useState<InputChannel>(initialChannel);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Bagian 1: Identitas Pengunjung
  const [visitorStatus, setVisitorStatus] = useState<VisitorStatusType>('warga_umum');
  const [nama, setNama] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [asalDesa, setAsalDesa] = useState<string>(DAFTAR_DESA_GANDRUNGMANGU[3]);
  const [asalManual, setAsalManual] = useState('');

  // Bagian 2: Kategori
  const [category, setCategory] = useState<KunjunganCategory>('KUNJUNGAN_TAMU');

  // Bagian 3: Detail Dinamis
  const [targetSection, setTargetSection] = useState<string>(CATEGORY_META.KUNJUNGAN_TAMU.defaultSection);
  const [details, setDetails] = useState<Record<string, any>>({
    jenis_pertemuan: 'Konsultasi / Koordinasi',
    jumlah_orang: 1,
    bentuk_penyerahan: 'Fisik',
    jumlah_koli: 1,
  });
  const [attachment, setAttachment] = useState<AttachmentMeta | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submit & Receipt state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submittedRecord, setSubmittedRecord] = useState<KunjunganTamuRecord | null>(null);
  const [copiedTicket, setCopiedTicket] = useState(false);

  // Track status state
  const [trackQuery, setTrackQuery] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [trackResults, setTrackResults] = useState<KunjunganTamuRecord[]>([]);
  const [ratingSavingId, setRatingSavingId] = useState<string | null>(null);

  const selectedMeta = CATEGORY_META[category];

  const updateDetail = (key: string, val: any) => {
    setDetails((prev) => ({ ...prev, [key]: val }));
  };

  const handleSelectCategory = (cat: KunjunganCategory) => {
    setCategory(cat);
    setTargetSection(CATEGORY_META[cat].defaultSection);
    setFormError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      setFormError('Ukuran file lampiran maksimal 1,5 MB agar cepat diproses.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type,
        dataUrl: String(reader.result || ''),
      });
      setFormError('');
    };
    reader.readAsDataURL(file);
  };

  const validateStep1 = (): boolean => {
    if (!nama.trim()) {
      setFormError('Nama lengkap wajib diisi.');
      return false;
    }
    if (whatsapp.replace(/\D/g, '').length < 9) {
      setFormError('Nomor WhatsApp aktif wajib diisi dengan benar.');
      return false;
    }
    if (asalDesa === 'INSTANSI_LUAR' && !asalManual.trim()) {
      setFormError('Silakan ketik nama instansi / perusahaan / wilayah asal Anda.');
      return false;
    }
    setFormError('');
    return true;
  };

  const validateStep3 = (): boolean => {
    if (category === 'KUNJUNGAN_TAMU' && !details.topik?.trim()) {
      setFormError('Maksud / topik pertemuan wajib diisi.');
      return false;
    }
    if (category === 'PENGAJUAN_PROPOSAL') {
      if (!details.nomor_proposal?.trim() || !details.tanggal_proposal || !details.judul_proposal?.trim()) {
        setFormError('Nomor proposal, tanggal proposal, dan judul/perihal proposal wajib diisi.');
        return false;
      }
    }
    if (category === 'PENYERAHAN_SPJ_BERKAS') {
      if (!details.nomor_pengantar?.trim()) {
        setFormError('Nomor surat pengantar / berkas wajib diisi.');
        return false;
      }
    }
    if (category === 'SURAT_KETERANGAN_NON_PATEN') {
      if (!details.nomor_surat?.trim() || !details.tanggal_surat || !details.perihal_surat?.trim()) {
        setFormError('Nomor surat, tanggal surat, dan perihal surat wajib diisi.');
        return false;
      }
    }
    if (category === 'PENGIRIMAN_BARANG') {
      if (!details.jenis_barang?.trim()) {
        setFormError('Jenis barang / paket wajib dipilih atau diisi.');
        return false;
      }
    }
    if (category === 'PENGADUAN') {
      if (!details.lokasi_kejadian?.trim() || !details.uraian_pengaduan?.trim()) {
        setFormError('Lokasi kejadian dan uraian pengaduan wajib diisi.');
        return false;
      }
    }
    setFormError('');
    return true;
  };

  const buildCleanDetails = (): Record<string, any> => {
    switch (category) {
      case 'KUNJUNGAN_TAMU':
        return {
          jenis_pertemuan: details.jenis_pertemuan || 'Konsultasi / Koordinasi',
          jumlah_orang: Number(details.jumlah_orang) || 1,
          topik: details.topik?.trim() || '',
        };
      case 'PENGAJUAN_PROPOSAL':
        return {
          jenis_proposal: details.jenis_proposal || 'Bantuan Hibah / Bansos',
          nomor_proposal: details.nomor_proposal?.trim() || '',
          tanggal_proposal: details.tanggal_proposal || '',
          judul_proposal: details.judul_proposal?.trim() || '',
          estimasi_nominal: details.estimasi_nominal || '',
          bentuk_penyerahan: details.bentuk_penyerahan || 'Fisik',
        };
      case 'PENYERAHAN_SPJ_BERKAS':
        return {
          jenis_berkas: details.jenis_berkas || 'SPJ Keuangan Desa',
          nomor_pengantar: details.nomor_pengantar?.trim() || '',
          periode: details.periode?.trim() || '',
          keterangan_kelengkapan: details.keterangan_kelengkapan?.trim() || '',
        };
      case 'SURAT_KETERANGAN_NON_PATEN':
        return {
          jenis_dokumen: details.jenis_dokumen || 'Surat Undangan',
          nomor_surat: details.nomor_surat?.trim() || '',
          tanggal_surat: details.tanggal_surat || '',
          perihal_surat: details.perihal_surat?.trim() || '',
        };
      case 'PENGIRIMAN_BARANG':
        return {
          nama_ekspedisi: details.nama_ekspedisi?.trim() || '',
          jenis_barang: details.jenis_barang || 'Barang Pengadaan / ATK',
          jumlah_koli: Number(details.jumlah_koli) || 1,
          catatan_paket: details.catatan_paket?.trim() || '',
        };
      case 'PENGADUAN':
        return {
          kategori_aduan: details.kategori_aduan || 'Infrastruktur & Lingkungan',
          lokasi_kejadian: details.lokasi_kejadian?.trim() || '',
          uraian_pengaduan: details.uraian_pengaduan?.trim() || '',
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep3()) return;

    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/kunjungan-tamu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_channel: inputChannel,
          visitor: {
            status: visitorStatus,
            nama: nama.trim(),
            whatsapp: whatsapp.trim(),
            asal_desa_instansi: asalDesa,
            asal_manual: asalDesa === 'INSTANSI_LUAR' ? asalManual.trim() : '',
          },
          category,
          target_section: targetSection,
          details: buildCleanDetails(),
          attachment,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSubmittedRecord(json.data);
      } else {
        setFormError(json.message || 'Gagal mencatat kunjungan tamu.');
      }
    } catch {
      setFormError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedRecord(null);
    setStep(1);
    setNama('');
    setWhatsapp('');
    setAsalManual('');
    setDetails({
      jenis_pertemuan: 'Konsultasi / Koordinasi',
      jumlah_orang: 1,
      bentuk_penyerahan: 'Fisik',
      jumlah_koli: 1,
    });
    setAttachment(null);
    setFormError('');
  };

  const handleCopyTicket = (ticketId: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ticketId);
      setCopiedTicket(true);
      setTimeout(() => setCopiedTicket(false), 2000);
    }
  };

  const handleTrackSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const q = (overrideQuery ?? trackQuery).trim();
    if (!q) {
      setTrackError('Masukkan Kode Tiket (TMI-...) atau Nomor WhatsApp Anda.');
      return;
    }
    setTrackLoading(true);
    setTrackError('');
    try {
      const isTicket = q.toUpperCase().startsWith('TMI-');
      const param = isTicket
        ? `ticket=${encodeURIComponent(q.toUpperCase())}`
        : `whatsapp=${encodeURIComponent(q)}`;
      const res = await fetch(`/api/kunjungan-tamu?${param}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTrackResults(json.data);
        if (json.data.length === 0) {
          setTrackError('Tiket tidak ditemukan. Pastikan kode tiket atau nomor WhatsApp sesuai.');
        }
      } else {
        setTrackError(json.message || 'Gagal melacak tiket.');
      }
    } catch {
      setTrackError('Kesalahan jaringan saat melacak tiket.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleSubmitRating = async (recordId: string, stars: number) => {
    setRatingSavingId(recordId);
    try {
      const res = await fetch('/api/kunjungan-tamu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId, skm_rating: stars }),
      });
      const json = await res.json();
      if (json.success) {
        setTrackResults((prev) =>
          prev.map((item) => (item.id === recordId ? { ...item, skm_rating: stars } : item))
        );
      }
    } finally {
      setRatingSavingId(null);
    }
  };

  return (
    <div className={`${embedded ? 'min-h-0 pb-8' : 'min-h-screen pb-16'} bg-[#F3F7F9] dark:bg-[#070b10] text-[#061E2B] dark:text-slate-100`}>
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c1622]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {embedded && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-full bg-[#EBF5F8] hover:bg-[#0E7490] text-[#0E7490] hover:text-white dark:bg-white/10 dark:text-cyan-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Kembali ke Kiosk"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/"
                className="h-9 w-9 rounded-full bg-[#EBF5F8] hover:bg-[#0E7490] text-[#0E7490] hover:text-white dark:bg-white/10 dark:text-cyan-300 flex items-center justify-center transition-colors"
                title="Kembali ke Beranda"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
            <div>
              <h1 className="font-hero font-extrabold text-sm sm:text-base text-[#061E2B] dark:text-white leading-none">
                {embedded ? 'Register Kunjungan' : 'Kunjungan Tamu & Front Office'}
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#0E7490] dark:text-cyan-300 mt-0.5">
                Kecamatan Gandrungmangu • Non-PATEN
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {embedded && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#061E2B] hover:bg-[#0E7490] text-white font-hero text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Kembali ke Kiosk</span>
              </button>
            ) : (
              <Link
                href="/Antrian/"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F3F7F9] hover:bg-[#EBF5F8] dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 font-hero text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Building2 className="h-3.5 w-3.5 text-[#0E7490] dark:text-cyan-300" />
                <span>Rekap di /Antrian</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 space-y-6">
        {/* Hero Banner Ringkas + Mode Switcher */}
        <div className="rounded-[26px] bg-gradient-to-br from-[#061E2B] via-[#0a4658] to-[#0E7490] text-white p-5 sm:p-7 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#f4c430]">
                Satu Pintu Front Office (Di Luar Layanan PATEN)
              </span>
              <h2 className="font-hero font-bold text-xl sm:text-2xl lg:text-[26px] tracking-tight">
                Registrasi Tamu, Proposal, SPJ, Barang &amp; Pengaduan
              </h2>
              <p className="font-hero text-xs sm:text-sm text-cyan-100/85">
                Seluruh kunjungan dan serah terima dokumen dicatat otomatis dengan kode tiket resmi dan dapat dipantau real-time.
              </p>
            </div>

            {/* Tab Utama: Form Baru vs Lacak Status */}
            <div className="inline-flex p-1 rounded-full bg-[#061E2B]/65 border border-white/15 self-start md:self-center shrink-0">
              <button
                type="button"
                onClick={() => setActiveMode('form')}
                className={`px-4 py-2 rounded-full font-hero text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'form'
                    ? 'bg-white text-[#061E2B] shadow-sm'
                    : 'text-cyan-100 hover:text-white'
                }`}
              >
                Isi Formulir
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('track')}
                className={`px-4 py-2 rounded-full font-hero text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeMode === 'track'
                    ? 'bg-[#f4c430] text-[#061E2B] shadow-sm'
                    : 'text-cyan-100 hover:text-white'
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                <span>Lacak Tiket</span>
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════ MODE 1: FORMULIR DINAMIS STEPPER ═══════════════════ */}
        {activeMode === 'form' && (
          <>
            {submittedRecord ? (
              /* BUKTI TANDA TERIMA INSTAN */
              <div className="rounded-[26px] bg-white dark:bg-[#0c1622] border border-slate-200/80 dark:border-white/10 p-6 sm:p-10 shadow-lg text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>

                <div className="space-y-1.5">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#0E7490] dark:text-cyan-400">
                    Registrasi Berhasil Tercatat
                  </span>
                  <h3 className="font-hero text-2xl sm:text-3xl font-extrabold text-[#061E2B] dark:text-white">
                    Bukti Tanda Terima Kunjungan
                  </h3>
                  <p className="font-hero text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Simpan atau cetak kode tiket berikut sebagai bukti resmi serah terima dokumen, proposal, SPJ, barang, maupun kunjungan Anda.
                  </p>
                </div>

                <div className="mx-auto max-w-md rounded-2xl bg-[#EBF5F8] dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 p-5 space-y-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#0E7490] dark:text-cyan-300">
                    Kode Tiket / Nomor Resi
                  </span>
                  <div className="font-mono text-2xl sm:text-3xl font-extrabold tracking-wider text-[#061E2B] dark:text-white">
                    {submittedRecord.ticket_id}
                  </div>
                  <div className="text-xs font-hero text-slate-600 dark:text-slate-300 pt-1">
                    <strong>{submittedRecord.visitor.nama}</strong> • {CATEGORY_META[submittedRecord.category].shortLabel} →{' '}
                    <span className="text-[#0E7490] dark:text-cyan-300 font-semibold">
                      {submittedRecord.target_section}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => printKunjunganReceipt(submittedRecord, 'resi')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full neu-btn-primary font-hero text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Cetak Tanda Terima</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyTicket(submittedRecord.ticket_id)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#F3F7F9] hover:bg-[#EBF5F8] dark:bg-white/10 text-[#061E2B] dark:text-white border border-slate-200 dark:border-white/15 font-hero text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    {copiedTicket ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedTicket ? 'Tersalin!' : 'Salin Kode Tiket'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTrackQuery(submittedRecord.ticket_id);
                      setActiveMode('track');
                      handleTrackSearch(undefined, submittedRecord.ticket_id);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#061E2B] hover:bg-[#0E7490] text-white font-hero text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <Search className="h-4 w-4" />
                    <span>Lacak Status</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200/80 dark:border-white/10">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="font-hero text-xs font-bold text-[#0E7490] dark:text-cyan-300 hover:underline cursor-pointer"
                  >
                    + Catat Kunjungan Tamu Baru
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-[26px] bg-white dark:bg-[#0c1622] border border-slate-200/80 dark:border-white/10 p-5 sm:p-8 shadow-sm space-y-6">
                {/* Baris Mode Input & Stepper Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
                  {/* Stepper 1 - 2 - 3 */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {[
                      { num: 1 as const, label: 'Identitas' },
                      { num: 2 as const, label: 'Kategori' },
                      { num: 3 as const, label: 'Detail & Kirim' },
                    ].map((s, idx) => {
                      const active = step === s.num;
                      const done = step > s.num;
                      return (
                        <React.Fragment key={s.num}>
                          <button
                            type="button"
                            onClick={() => {
                              if (s.num < step || (s.num === 2 && validateStep1())) setStep(s.num);
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <span
                              className={`h-7 w-7 rounded-full font-mono text-xs font-bold flex items-center justify-center transition-all ${
                                active
                                  ? 'bg-[#0E7490] text-white shadow-md'
                                  : done
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {done ? <Check className="h-3.5 w-3.5" /> : s.num}
                            </span>
                            <span
                              className={`font-hero text-xs font-bold ${
                                active
                                  ? 'text-[#061E2B] dark:text-white'
                                  : 'text-slate-400 dark:text-slate-500 hidden xs:inline'
                              }`}
                            >
                              {s.label}
                            </span>
                          </button>
                          {idx < 2 && <span className="h-[1px] w-4 sm:w-8 bg-slate-200 dark:bg-white/15" />}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Mode Pengisian Switch */}
                  <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[#F3F7F9] dark:bg-white/5 border border-slate-200/80 dark:border-white/10 self-start">
                    <button
                      type="button"
                      onClick={() => setInputChannel('mandiri_hp')}
                      className={`px-3 py-1 rounded-full font-hero text-[11px] font-bold transition-all cursor-pointer ${
                        inputChannel !== 'front_office'
                          ? 'bg-[#061E2B] dark:bg-[#0E7490] text-white'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Mandiri Tamu
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputChannel('front_office')}
                      className={`px-3 py-1 rounded-full font-hero text-[11px] font-bold transition-all cursor-pointer ${
                        inputChannel === 'front_office'
                          ? 'bg-[#061E2B] dark:bg-[#0E7490] text-white'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Input Petugas FO
                    </button>
                  </div>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* ─── STEP 1: IDENTITAS PENGUNJUNG / PENGIRIM ─── */}
                  {step === 1 && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="font-hero font-bold text-lg text-[#061E2B] dark:text-white">
                          1. Identitas Pengunjung / Pengirim
                        </h3>
                        <p className="font-hero text-xs text-slate-500 dark:text-slate-400">
                          Lengkapi identitas diri untuk penerbitan nomor tiket/resi resmi Front Office.
                        </p>
                      </div>

                      <div>
                        <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#061E2B] dark:text-slate-200 mb-2">
                          Status / Asal Pengunjung <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {VISITOR_STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setVisitorStatus(opt.value)}
                              className={`p-3 rounded-xl border text-left font-hero text-xs font-semibold transition-all cursor-pointer flex items-center gap-2.5 ${
                                visitorStatus === opt.value
                                  ? 'bg-[#EBF5F8] dark:bg-cyan-950/60 border-[#0E7490] text-[#061E2B] dark:text-cyan-200 shadow-xs'
                                  : 'bg-[#F8FAFC] dark:bg-white/[0.03] border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[#0E7490]/40'
                              }`}
                            >
                              <UserCheck
                                className={`h-4 w-4 shrink-0 ${
                                  visitorStatus === opt.value ? 'text-[#0E7490] dark:text-cyan-300' : 'text-slate-400'
                                }`}
                              />
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#061E2B] dark:text-slate-200 mb-1.5">
                            Nama Lengkap <span className="text-rose-500">*</span>
                          </label>
                          <input
                            value={nama}
                            onChange={(e) => setNama(e.target.value)}
                            placeholder="Nama lengkap sesuai identitas"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm focus:outline-none focus:border-[#0E7490] focus:bg-white dark:focus:bg-[#0c1622]"
                          />
                        </div>

                        <div>
                          <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#061E2B] dark:text-slate-200 mb-1.5">
                            Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
                          </label>
                          <input
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            type="tel"
                            placeholder="Contoh: 081234567890"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm focus:outline-none focus:border-[#0E7490] focus:bg-white dark:focus:bg-[#0c1622]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#061E2B] dark:text-slate-200 mb-1.5">
                          Asal Desa / Instansi / Perusahaan <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={asalDesa}
                          onChange={(e) => setAsalDesa(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-[#0c1622] border border-slate-200/90 dark:border-white/15 text-sm focus:outline-none focus:border-[#0E7490]"
                        >
                          {DAFTAR_DESA_GANDRUNGMANGU.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                          <option value="INSTANSI_LUAR">Instansi / Perusahaan / Luar Wilayah (Input Manual)</option>
                        </select>
                      </div>

                      {asalDesa === 'INSTANSI_LUAR' && (
                        <div>
                          <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#061E2B] dark:text-slate-200 mb-1.5">
                            Nama Instansi / Perusahaan / Alamat Luar Wilayah <span className="text-rose-500">*</span>
                          </label>
                          <input
                            value={asalManual}
                            onChange={(e) => setAsalManual(e.target.value)}
                            placeholder="Contoh: Dinas Kesehatan Kab. Cilacap / JNE / PT ..."
                            className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm focus:outline-none focus:border-[#0E7490] focus:bg-white dark:focus:bg-[#0c1622]"
                          />
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (validateStep1()) setStep(2);
                          }}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full neu-btn-primary font-hero text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          <span>Lanjut: Pilih Keperluan</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ─── STEP 2: PILIH KATEGORI KEPERLUAN ─── */}
                  {step === 2 && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="font-hero font-bold text-lg text-[#061E2B] dark:text-white">
                          2. Pilih Kategori Keperluan (Non-PATEN)
                        </h3>
                        <p className="font-hero text-xs text-slate-500 dark:text-slate-400">
                          Kolom isian pada langkah berikutnya akan menyesuaikan secara otomatis dengan kategori yang dipilih.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {(Object.keys(CATEGORY_META) as KunjunganCategory[]).map((catKey) => {
                          const meta = CATEGORY_META[catKey];
                          const Icon = CATEGORY_ICONS[catKey];
                          const isSelected = category === catKey;

                          return (
                            <button
                              key={catKey}
                              type="button"
                              onClick={() => handleSelectCategory(catKey)}
                              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                                isSelected
                                  ? 'bg-[#EBF5F8] dark:bg-cyan-950/50 border-[#0E7490] ring-2 ring-[#0E7490]/20'
                                  : 'bg-[#F8FAFC] dark:bg-white/[0.03] border-slate-200/80 dark:border-white/10 hover:border-[#0E7490]/45'
                              }`}
                            >
                              <div
                                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-[#0E7490] text-white'
                                    : 'bg-white dark:bg-white/10 text-[#0E7490] dark:text-cyan-300 border border-slate-200/80 dark:border-white/10'
                                }`}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-hero font-bold text-sm text-[#061E2B] dark:text-white">
                                    {meta.label}
                                  </h4>
                                </div>
                                <p className="font-hero text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                  {meta.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-hero text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          <span>Kembali</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full neu-btn-primary font-hero text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          <span>Lanjut: Detail Keperluan</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ─── STEP 3: DETAIL DINAMIS & KONFIRMASI ─── */}
                  {step === 3 && (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-white/10">
                        <div>
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400">
                            Detail Kategori Terpilih
                          </span>
                          <h3 className="font-hero font-bold text-lg text-[#061E2B] dark:text-white">
                            {selectedMeta.label}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="font-hero text-xs font-bold text-[#0E7490] dark:text-cyan-300 hover:underline cursor-pointer"
                        >
                          Ganti Kategori
                        </button>
                      </div>

                      {/* Tujuan Pejabat / Seksi */}
                      <div>
                        <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#061E2B] dark:text-slate-200 mb-1.5">
                          Tujuan Pejabat / Seksi / Penerima <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={targetSection}
                          onChange={(e) => setTargetSection(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-[#0c1622] border border-slate-200/90 dark:border-white/15 text-sm focus:outline-none focus:border-[#0E7490]"
                        >
                          {TARGET_SECTION_OPTIONS.map((sec) => (
                            <option key={sec} value={sec}>
                              {sec}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* CONDITIONAL FIELDS PER KATEGORI */}
                      {category === 'KUNJUNGAN_TAMU' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Jenis Pertemuan
                              </label>
                              <select
                                value={details.jenis_pertemuan || 'Konsultasi / Koordinasi'}
                                onChange={(e) => updateDetail('jenis_pertemuan', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-[#0c1622] border border-slate-200/90 dark:border-white/15 text-sm"
                              >
                                <option>Konsultasi / Koordinasi</option>
                                <option>Tamu Kedinasan</option>
                                <option>Audiensi Rombongan</option>
                                <option>Kunjungan Kerja</option>
                              </select>
                            </div>
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Jumlah Orang / Rombongan
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={details.jumlah_orang ?? 1}
                                onChange={(e) => updateDetail('jumlah_orang', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                              Maksud / Topik Pertemuan <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                              rows={3}
                              value={details.topik || ''}
                              onChange={(e) => updateDetail('topik', e.target.value)}
                              placeholder="Uraikan secara singkat maksud kunjungan atau topik yang akan dibahas..."
                              className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {category === 'PENGAJUAN_PROPOSAL' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Jenis Proposal
                              </label>
                              <select
                                value={details.jenis_proposal || 'Bantuan Hibah / Bansos'}
                                onChange={(e) => updateDetail('jenis_proposal', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-[#0c1622] border border-slate-200/90 dark:border-white/15 text-sm"
                              >
                                <option>Bantuan Hibah / Bansos</option>
                                <option>Kegiatan Kepemudaan / Olahraga / Seni</option>
                                <option>Infrastruktur / Sarpras</option>
                                <option>Lainnya</option>
                              </select>
                            </div>
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Bentuk Penyerahan
                              </label>
                              <select
                                value={details.bentuk_penyerahan || 'Fisik'}
                                onChange={(e) => updateDetail('bentuk_penyerahan', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-[#0c1622] border border-slate-200/90 dark:border-white/15 text-sm"
                              >
                                <option>Fisik</option>
                                <option>Softcopy</option>
                                <option>Fisik + Softcopy</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Nomor Proposal <span className="text-rose-500">*</span>
                              </label>
                              <input
                                value={details.nomor_proposal || ''}
                                onChange={(e) => updateDetail('nomor_proposal', e.target.value)}
                                placeholder="001/PROP/2026"
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Tanggal Proposal <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="date"
                                value={details.tanggal_proposal || ''}
                                onChange={(e) => updateDetail('tanggal_proposal', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Estimasi Nominal (Opsional)
                              </label>
                              <input
                                value={details.estimasi_nominal || ''}
                                onChange={(e) => updateDetail('estimasi_nominal', formatRupiahInput(e.target.value))}
                                placeholder="Rp 10.000.000"
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                              Judul / Perihal Proposal <span className="text-rose-500">*</span>
                            </label>
                            <input
                              value={details.judul_proposal || ''}
                              onChange={(e) => updateDetail('judul_proposal', e.target.value)}
                              placeholder="Contoh: Proposal Permohonan Bantuan Sarana Olahraga Karang Taruna"
                              className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {category === 'PENYERAHAN_SPJ_BERKAS' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Jenis Berkas / Laporan
                              </label>
                              <select
                                value={details.jenis_berkas || 'SPJ Keuangan Desa'}
                                onChange={(e) => updateDetail('jenis_berkas', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-[#0c1622] border border-slate-200/90 dark:border-white/15 text-sm"
                              >
                                <option>SPJ Keuangan Desa</option>
                                <option>Laporan Bulanan / Triwulan</option>
                                <option>Dokumen Perencanaan (APBDes / RKPDes)</option>
                                <option>Berkas Monev / Administrasi Lainnya</option>
                              </select>
                            </div>
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Periode / Tahun Anggaran
                              </label>
                              <input
                                value={details.periode || ''}
                                onChange={(e) => updateDetail('periode', e.target.value)}
                                placeholder="Contoh: Tahap II 2026 / Triwulan III"
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                              Nomor Surat Pengantar / Berkas <span className="text-rose-500">*</span>
                            </label>
                            <input
                              value={details.nomor_pengantar || ''}
                              onChange={(e) => updateDetail('nomor_pengantar', e.target.value)}
                              placeholder="Contoh: 140/045/SPJ/2026"
                              className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                              Keterangan Kelengkapan Berkas
                            </label>
                            <textarea
                              rows={3}
                              value={details.keterangan_kelengkapan || ''}
                              onChange={(e) => updateDetail('keterangan_kelengkapan', e.target.value)}
                              placeholder="Contoh: 2 bundel SPJ ADD + 1 flashdisk lampiran foto..."
                              className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {category === 'SURAT_KETERANGAN_NON_PATEN' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Jenis Dokumen
                              </label>
                              <select
                                value={details.jenis_dokumen || 'Surat Undangan'}
                                onChange={(e) => updateDetail('jenis_dokumen', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-[#0c1622] border border-slate-200/90 dark:border-white/15 text-sm"
                              >
                                <option>Surat Undangan</option>
                                <option>Surat Pemberitahuan / Edaran</option>
                                <option>Surat Keterangan Antar-Instansi / Desa</option>
                                <option>Surat Tugas / Lainnya</option>
                              </select>
                            </div>
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Nomor Surat <span className="text-rose-500">*</span>
                              </label>
                              <input
                                value={details.nomor_surat || ''}
                                onChange={(e) => updateDetail('nomor_surat', e.target.value)}
                                placeholder="005/123/2026"
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Tanggal Surat <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="date"
                                value={details.tanggal_surat || ''}
                                onChange={(e) => updateDetail('tanggal_surat', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                              Perihal Surat <span className="text-rose-500">*</span>
                            </label>
                            <input
                              value={details.perihal_surat || ''}
                              onChange={(e) => updateDetail('perihal_surat', e.target.value)}
                              placeholder="Contoh: Undangan Musyawarah Perencanaan Pembangunan Desa"
                              className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {category === 'PENGIRIMAN_BARANG' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Nama Ekspedisi / Pengirim
                              </label>
                              <input
                                value={details.nama_ekspedisi || ''}
                                onChange={(e) => updateDetail('nama_ekspedisi', e.target.value)}
                                placeholder="JNE / Pos / CV Rekanan"
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Jenis Barang / Paket <span className="text-rose-500">*</span>
                              </label>
                              <select
                                value={details.jenis_barang || 'Barang Pengadaan / ATK'}
                                onChange={(e) => updateDetail('jenis_barang', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-[#0c1622] border border-slate-200/90 dark:border-white/15 text-sm"
                              >
                                <option>Barang Pengadaan / ATK</option>
                                <option>Logistik / Bantuan</option>
                                <option>Dokumen Rahasia / Paket Umum</option>
                                <option>Lainnya</option>
                              </select>
                            </div>
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Jumlah Koli / Paket
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={details.jumlah_koli ?? 1}
                                onChange={(e) => updateDetail('jumlah_koli', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                              Catatan Kondisi / Keterangan Paket (Opsional)
                            </label>
                            <input
                              value={details.catatan_paket || ''}
                              onChange={(e) => updateDetail('catatan_paket', e.target.value)}
                              placeholder="Contoh: Diterima dalam kondisi tersegel baik"
                              className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {category === 'PENGADUAN' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Kategori Aduan
                              </label>
                              <select
                                value={details.kategori_aduan || 'Infrastruktur & Lingkungan'}
                                onChange={(e) => updateDetail('kategori_aduan', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-[#0c1622] border border-slate-200/90 dark:border-white/15 text-sm"
                              >
                                <option>Infrastruktur &amp; Lingkungan</option>
                                <option>Sosial &amp; Kemasyarakatan</option>
                                <option>Ketenteraman &amp; Ketertiban</option>
                                <option>Pelayanan / Lainnya</option>
                              </select>
                            </div>
                            <div>
                              <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                Lokasi Kejadian / Objek <span className="text-rose-500">*</span>
                              </label>
                              <input
                                value={details.lokasi_kejadian || ''}
                                onChange={(e) => updateDetail('lokasi_kejadian', e.target.value)}
                                placeholder="Contoh: Dusun Krajan RT 02 RW 04 Desa..."
                                className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block font-hero text-[11px] font-bold uppercase tracking-wider mb-1.5">
                              Uraian Pengaduan / Aspirasi <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                              rows={4}
                              value={details.uraian_pengaduan || ''}
                              onChange={(e) => updateDetail('uraian_pengaduan', e.target.value)}
                              placeholder="Jelaskan kronologi, permasalahan, atau aspirasi Anda secara lengkap..."
                              className="w-full px-4 py-2.5 rounded-xl bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* Lampiran Opsional (Foto / Kamera / PDF) */}
                      <div className="p-4 rounded-2xl bg-[#F3F7F9] dark:bg-white/[0.03] border border-dashed border-slate-300 dark:border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="font-hero text-xs font-bold text-[#061E2B] dark:text-white flex items-center gap-1.5">
                            <Upload className="h-3.5 w-3.5 text-[#0E7490] dark:text-cyan-300" />
                            Lampiran Foto / Scan Dokumen (Opsional)
                          </span>
                          <p className="font-hero text-[11px] text-slate-500 dark:text-slate-400">
                            Mendukung foto kamera, JPG, PNG, atau PDF (maks. 1,5 MB).
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 font-hero text-xs font-bold text-[#0E7490] dark:text-cyan-300 hover:bg-[#EBF5F8] cursor-pointer"
                          >
                            {attachment ? 'Ganti File' : 'Pilih / Ambil Foto'}
                          </button>
                          {attachment && (
                            <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-300 max-w-[140px] truncate">
                              {attachment.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tombol Aksi Submit */}
                      <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-hero text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          <span>Kembali</span>
                        </button>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex items-center gap-2 px-7 py-3 rounded-full neu-btn-primary font-hero text-xs font-bold uppercase tracking-wider disabled:opacity-60 cursor-pointer"
                        >
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          <span>{submitting ? 'Menyimpan...' : 'Kirim & Terbitkan Tiket'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════ MODE 2: LACAK STATUS TIKET ═══════════════════ */}
        {activeMode === 'track' && (
          <div className="rounded-[26px] bg-white dark:bg-[#0c1622] border border-slate-200/80 dark:border-white/10 p-5 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="font-hero font-bold text-lg text-[#061E2B] dark:text-white">
                Lacak Progres &amp; Riwayat Disposisi Tiket
              </h3>
              <p className="font-hero text-xs text-slate-500 dark:text-slate-400">
                Masukkan Kode Tiket (misal <code className="font-mono font-bold text-[#0E7490]">TMI-20261124-001</code>) atau Nomor WhatsApp yang digunakan saat mendaftar.
              </p>
            </div>

            <form onSubmit={(e) => handleTrackSearch(e)} className="flex flex-col sm:flex-row gap-2.5">
              <input
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder="Ketik Kode Tiket (TMI-...) atau No. WhatsApp..."
                className="flex-1 px-4 py-3 rounded-full bg-[#F3F7F9] dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/15 text-sm focus:outline-none focus:border-[#0E7490]"
              />
              <button
                type="submit"
                disabled={trackLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full neu-btn-primary font-hero text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60"
              >
                {trackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>Lacak Tiket</span>
              </button>
            </form>

            {trackError && (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{trackError}</span>
              </div>
            )}

            {trackResults.length > 0 && (
              <div className="space-y-4">
                {trackResults.map((item) => {
                  const cat = CATEGORY_META[item.category];
                  const st = STATUS_META[item.status];
                  return (
                    <div
                      key={item.id || item.ticket_id}
                      className="rounded-2xl bg-[#F3F7F9] dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-extrabold text-[#0E7490] dark:text-cyan-300">
                              {item.ticket_id}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.lightBadge}`}>
                              {st.label}
                            </span>
                          </div>
                          <h4 className="font-hero font-bold text-base text-[#061E2B] dark:text-white mt-1">
                            {cat.label}
                          </h4>
                          <p className="font-hero text-xs text-slate-600 dark:text-slate-300">
                            {item.visitor.nama} • Tujuan: <strong>{item.target_section}</strong>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => printKunjunganReceipt(item, 'resi')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 font-hero text-xs font-bold text-[#061E2B] dark:text-white cursor-pointer"
                        >
                          <Printer className="h-3.5 w-3.5 text-[#0E7490] dark:text-cyan-300" />
                          <span>Cetak Resi</span>
                        </button>
                      </div>

                      {/* Timeline Tracking Logs */}
                      <div className="space-y-3">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Timeline Riwayat Progres
                        </span>
                        <div className="space-y-2.5 pl-3 border-l-2 border-[#0E7490]/40">
                          {(item.tracking_logs || []).map((log, i) => (
                            <div key={i} className="relative pl-3">
                              <span className="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#0E7490] ring-4 ring-[#F3F7F9] dark:ring-[#0c1622]" />
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="font-mono font-bold text-[#0E7490] dark:text-cyan-300">
                                  {STATUS_META[log.status]?.label || log.status}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(log.timestamp).toLocaleString('id-ID')}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="font-hero font-semibold text-slate-600 dark:text-slate-300">
                                  {log.actor}
                                </span>
                              </div>
                              <p className="font-hero text-xs text-[#061E2B] dark:text-slate-200 mt-0.5">
                                {log.note}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Rating Kepuasan SKM */}
                      {item.id && (
                        <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                          <span className="font-hero text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {item.skm_rating
                              ? `Terima kasih atas penilaian Anda (${item.skm_rating}/5)`
                              : 'Bantu nilai pelayanan Front Office kami:'}
                          </span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                disabled={ratingSavingId === item.id}
                                onClick={() => handleSubmitRating(item.id!, star)}
                                className="p-1 cursor-pointer transition-transform hover:scale-110"
                                title={`Beri ${star} bintang`}
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    (item.skm_rating || 0) >= star
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-slate-300 dark:text-slate-600'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
