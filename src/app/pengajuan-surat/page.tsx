'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Home,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Loader2,
  Ticket,
  FilePlus2,
  ArrowLeft,
  UploadCloud,
  FileCheck,
  Download,
  Users,
  ExternalLink,
  Trash2,
  Check,
  Sparkles,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { uploadAttachmentsToDrive, searchSubmissionsByCitizen } from '@/lib/submissions';
import { LetterSubmission } from '@/lib/types';
import { getResidentByNik } from '@/lib/residents';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toPng } from 'html-to-image';

// --- Helper Functions ---
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || '';
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function PengajuanSuratContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'lacak' ? 'lacak' : 'ajukan';
  const [activeTab, setActiveTab] = useState<'ajukan' | 'lacak'>(initialTab);

  // Form State
  const [nama, setNama] = useState('');
  const [nik, setNik] = useState('');
  const [alamat, setAlamat] = useState('');
  const [maksudTujuan, setMaksudTujuan] = useState('');
  const [fileKK, setFileKK] = useState<File | null>(null);
  const [fileKTP, setFileKTP] = useState<File | null>(null);

  // File Previews
  const [previewKK, setPreviewKK] = useState<string | null>(null);
  const [previewKTP, setPreviewKTP] = useState<string | null>(null);

  // Autofill Indicator
  const [isSearchingResident, setIsSearchingResident] = useState(false);
  const [residentFound, setResidentFound] = useState(false);

  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Search / Lacak State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LetterSubmission[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Config Profile
  const [configData, setConfigData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache');
        if (cached) return JSON.parse(cached);
      } catch (e) { }
    }
    return null;
  });

  const { firestore } = useFirebase();
  const { toast } = useToast();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isDownloadingTicket, setIsDownloadingTicket] = useState(false);

  useEffect(() => {
    fetch('/api/village-profile')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setConfigData((prev: any) => ({ ...prev, ...data }));
          try {
            localStorage.setItem('village_profile_cache', JSON.stringify(data));
          } catch (e) { }
        }
      })
      .catch(() => { });
  }, []);

  // Autofill NIK Lookup (via API server-side untuk menghindari permission error)
  useEffect(() => {
    const cleanNik = nik.trim();
    if (cleanNik.length === 16 && !residentFound) {
      setIsSearchingResident(true);
      fetch(`/api/submissions?action=lookup_resident&nik=${cleanNik}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.resident) {
            const res = data.resident;
            const resName = res.fullName || res.nama || '';
            setNama(resName);
            const fullAddress = [
              res.address || res.alamat,
              res.rt ? `RT ${res.rt}` : '',
              res.rw ? `RW ${res.rw}` : '',
              res.dusun ? `Dusun ${res.dusun}` : '',
              res.kelurahan ? `Desa ${res.kelurahan}` : (res.desa ? `Desa ${res.desa}` : '')
            ].filter(Boolean).join(', ');
            setAlamat(fullAddress || res.address || res.alamat || '');
            setResidentFound(true);
            toast({
              title: "Data Warga Ditemukan",
              description: `Nama ${resName} otomatis diisikan ke formulir.`,
            });
          } else if (firestore) {
            getResidentByNik(firestore, cleanNik).then((r) => {
              if (r) {
                const resData = r as any;
                const rName = r.fullName || resData.nama || '';
                setNama(rName);
                setResidentFound(true);
              }
            }).catch(() => { });
          }
        })
        .catch(() => { })
        .finally(() => setIsSearchingResident(false));
    } else if (cleanNik.length < 16 && residentFound) {
      setResidentFound(false);
    }
  }, [nik, firestore, residentFound, toast]);

  // Handle File KK Select
  const handleFileKKChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Berkas Terlalu Besar",
        description: "Maksimal ukuran berkas KK adalah 10 MB.",
        variant: "destructive",
      });
      return;
    }

    setFileKK(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewKK(url);
    } else {
      setPreviewKK(null);
    }
  };

  // Handle File KTP Select
  const handleFileKTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Berkas Terlalu Besar",
        description: "Maksimal ukuran berkas KTP adalah 10 MB.",
        variant: "destructive",
      });
      return;
    }

    setFileKTP(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewKTP(url);
    } else {
      setPreviewKTP(null);
    }
  };

  // Reset Form
  const handleResetForm = () => {
    setNama('');
    setNik('');
    setAlamat('');
    setMaksudTujuan('');
    setFileKK(null);
    setFileKTP(null);
    setPreviewKK(null);
    setPreviewKTP(null);
    setResidentFound(false);
    setSubmittedTicket(null);
    setSubmittedData(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nama.trim()) {
      toast({ title: "Nama Wajib Diisi", description: "Silakan masukkan nama lengkap pemohon.", variant: "destructive" });
      return;
    }
    if (!nik.trim() || !/^\d{16}$/.test(nik.trim())) {
      toast({ title: "NIK Tidak Valid", description: "Nomor Induk Kependudukan (NIK) harus terdiri dari 16 digit angka.", variant: "destructive" });
      return;
    }
    if (!alamat.trim()) {
      toast({ title: "Alamat Wajib Diisi", description: "Silakan masukkan alamat lengkap pemohon.", variant: "destructive" });
      return;
    }
    if (!maksudTujuan.trim()) {
      toast({ title: "Maksud/Tujuan Wajib Diisi", description: "Silakan tuliskan maksud atau alasan penggantian KK.", variant: "destructive" });
      return;
    }
    if (!fileKK) {
      toast({ title: "Berkas KK Wajib Diunggah", description: "Silakan unggah foto/scan Kartu Keluarga lama atau surat keterangan kehilangan.", variant: "destructive" });
      return;
    }
    if (!fileKTP) {
      toast({ title: "Berkas KTP Wajib Diunggah", description: "Silakan unggah foto/scan e-KTP pemohon.", variant: "destructive" });
      return;
    }

    if (!firestore) {
      toast({ title: "Koneksi Database Bermasalah", description: "Gagal terhubung ke database. Coba beberapa saat lagi.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setSubmitStep('Mempersiapkan berkas lampiran KK & KTP...');

    try {
      // 1. Konversi berkas ke Base64
      const [base64KK, base64KTP] = await Promise.all([
        convertFileToBase64(fileKK),
        convertFileToBase64(fileKTP),
      ]);

      const cleanNik = nik.trim();
      const cleanNama = nama.trim();
      const safeName = cleanNama.replace(/[^a-zA-Z0-9]/g, '_');
      const timeStamp = Date.now();

      const filesPayload = [
        {
          fieldName: 'Upload KK',
          targetFileName: `KK_${cleanNik}_${safeName}_${timeStamp}`,
          mimeType: fileKK.type || 'image/jpeg',
          base64Data: base64KK,
        },
        {
          fieldName: 'Upload KTP',
          targetFileName: `KTP_${cleanNik}_${safeName}_${timeStamp}`,
          mimeType: fileKTP.type || 'image/jpeg',
          base64Data: base64KTP,
        },
      ];

      // 2. Kirim data dan berkas ke API server-side (bebas permission error & upload langsung ke Google Drive)
      setSubmitStep('Menyimpan berkas ke Google Drive dan mencatat ke sistem...');
      const resp = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: cleanNama,
          nik: cleanNik,
          alamat: alamat.trim(),
          maksudTujuan: maksudTujuan.trim(),
          files: filesPayload,
        }),
      });

      const result = await resp.json();
      if (!resp.ok || !result.success) {
        throw new Error(result.error || 'Gagal menyimpan pengajuan ke sistem.');
      }

      const newTicketNumber = result.ticketNumber;
      const driveFiles = result.driveFiles || [];

      setSubmittedTicket(newTicketNumber);
      setSubmittedData({
        ticketNumber: newTicketNumber,
        nama: cleanNama,
        nik: cleanNik,
        alamat: alamat.trim(),
        maksudTujuan: maksudTujuan.trim(),
        createdAt: new Date(),
        driveFilesCount: (driveFiles && driveFiles.length) || 2,
      });

      toast({
        title: "Pengajuan Berhasil Terkirim!",
        description: `Nomor tiket Anda: ${newTicketNumber}. Berkas berhasil disimpan di Google Drive.`,
      });
    } catch (err: any) {
      console.error("Gagal mengirim pengajuan:", err);
      toast({
        title: "Gagal Mengajukan Surat",
        description: err?.message || "Terjadi kesalahan saat memproses permohonan.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setSubmitStep('');
    }
  };

  // Canvas 2D Fallback Generator - 100% bebas SecurityError dan cross-origin stylesheet issue
  const downloadTicketWithCanvas2D = (ticketCode: string, data: any) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 640;
      const height = 860;
      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Card Outline Border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // Header Top Strip (Navy Gradient)
      const grad = ctx.createLinearGradient(0, 16, width, 16);
      grad.addColorStop(0, '#1e3a8a');
      grad.addColorStop(0.5, '#2563eb');
      grad.addColorStop(1, '#d97706');
      ctx.fillStyle = grad;
      ctx.fillRect(16, 16, width - 32, 12);

      // Header Text
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PEMERINTAH KABUPATEN CILACAP', width / 2, 60);

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('KECAMATAN GANDRUNGMANGU', width / 2, 88);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('Layanan Mandiri Permohonan Surat Online', width / 2, 108);

      // Divider Line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(36, 128);
      ctx.lineTo(width - 36, 128);
      ctx.stroke();

      // Title
      ctx.fillStyle = '#1e3a8a';
      ctx.font = '900 18px system-ui, -apple-system, sans-serif';
      ctx.fillText('BUKTI PENGAJUAN PENGGANTIAN KK', width / 2, 160);

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText('✓ Berkas KK & KTP Tersimpan di Google Drive', width / 2, 185);

      // Ticket Box
      const boxY = 210;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(40, boxY, width - 80, 120);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, boxY, width - 80, 120);

      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('KODE TIKET PELACAKAN RESMI', width / 2, boxY + 32);

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 36px monospace, sans-serif';
      ctx.fillText(ticketCode, width / 2, boxY + 75);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('Gunakan kode ini untuk mengecek status permohonan', width / 2, boxY + 102);

      // Info Table / Fields
      const startInfoY = 360;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(40, startInfoY, width - 80, 310);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(40, startInfoY, width - 80, 310);

      const drawRow = (label: string, val: string, yPos: number) => {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText(label.toUpperCase(), 60, yPos);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px system-ui, sans-serif';
        const displayVal = val && val.length > 55 ? val.substring(0, 52) + '...' : (val || '-');
        ctx.fillText(displayVal, 60, yPos + 18);
      };

      drawRow('Nama Lengkap Pemohon:', data?.nama || '-', startInfoY + 30);
      drawRow('NIK Pemohon:', maskNik(data?.nik) || '-', startInfoY + 80);
      drawRow('Alamat Pemohon:', data?.alamat || '-', startInfoY + 130);
      drawRow('Maksud / Tujuan Penggantian KK:', data?.maksudTujuan || '-', startInfoY + 180);
      drawRow('Status Permohonan:', 'DALAM ANTREAN VERIFIKASI ADMIN', startInfoY + 230);
      drawRow('Tanggal Pengajuan:', new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }), startInfoY + 280);

      // Footer Instructions
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText('Harap simpan tiket ini. Tunjukkan kode tiket saat mengambil dokumen fisik di Balai Kecamatan Gandrungmangu.', width / 2, 715);
      ctx.fillText(`Kecamatan Gandrungmangu, Kab. Cilacap • Terbit otomatis pada ${new Date().toLocaleDateString('id-ID')}`, width / 2, 735);

      // Trigger Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Tiket-Penggantian-KK-${ticketCode}.png`;
      link.href = dataUrl;
      link.click();

      toast({
        title: "Tiket Tersimpan",
        description: "Gambar tiket berhasil diunduh ke galeri Karyawan Anda.",
      });
    } catch (err) {
      console.error('Canvas fallback download error:', err);
      toast({
        title: "Gagal Mengunduh",
        description: "Silakan screenshot layar Anda untuk menyimpan tiket.",
        variant: "destructive",
      });
    }
  };

  // Download Ticket Card
  const handleDownloadTicketImage = async () => {
    if (!submittedTicket) return;
    setIsDownloadingTicket(true);

    try {
      await new Promise(r => setTimeout(r, 150));

      if (ticketRef.current) {
        try {
          const dataUrl = await toPng(ticketRef.current, {
            backgroundColor: '#ffffff',
            pixelRatio: 2,
            cacheBust: true,
            skipFonts: true,
            fontEmbedCSS: '',
          });
          const link = document.createElement('a');
          link.download = `Tiket-Penggantian-KK-${submittedTicket}.png`;
          link.href = dataUrl;
          link.click();
          toast({
            title: "Tiket Tersimpan",
            description: "Gambar tiket berhasil diunduh ke Karyawan Anda.",
          });
          return;
        } catch (innerErr) {
          console.warn('toPng skipped fonts error, switching to direct Canvas 2D fallback:', innerErr);
        }
      }

      // Direct Canvas 2D fallback (guaranteed to succeed without any CSS/Security issues)
      downloadTicketWithCanvas2D(submittedTicket, submittedData);
    } catch (e) {
      console.error("Gagal unduh gambar tiket:", e);
      downloadTicketWithCanvas2D(submittedTicket, submittedData);
    } finally {
      setIsDownloadingTicket(false);
    }
  };

  // Search Status Handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast({
        title: "Pencarian Kosong",
        description: "Silakan masukkan NIK 16 digit atau Kode Tiket pengajuan Anda.",
        variant: "destructive",
      });
      return;
    }

    if (!firestore) {
      toast({
        title: "Koneksi Bermasalah",
        description: "Gagal terhubung ke database. Coba beberapa saat lagi.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      // 1. Coba pencarian melalui API server-side (bebas permission error)
      const resp = await fetch(`/api/submissions?q=${encodeURIComponent(searchQuery.trim())}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.success && Array.isArray(data.data)) {
          setSearchResults(data.data);
          return;
        }
      }

      // 2. Fallback ke Firestore client jika tersedia
      if (firestore) {
        const results = await searchSubmissionsByCitizen(firestore, searchQuery);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error("Error searching status:", error);
      if (firestore) {
        try {
          const results = await searchSubmissionsByCitizen(firestore, searchQuery);
          setSearchResults(results);
          return;
        } catch (e) { }
      }
      toast({
        title: "Gagal Mencari",
        description: "Terjadi kesalahan saat memuat status permohonan.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Switch to lacak tab directly for a ticket
  const handleLacakThisTicket = (ticketNum: string) => {
    setSearchQuery(ticketNum);
    setActiveTab('lacak');
    setIsSearching(true);
    setHasSearched(true);
    fetch(`/api/submissions?q=${encodeURIComponent(ticketNum.trim())}`)
      .then(res => res.json())
      .then(data => {
        if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
          setSearchResults(data.data);
        } else if (firestore) {
          searchSubmissionsByCitizen(firestore, ticketNum).then(r => setSearchResults(r)).catch(() => { });
        }
      })
      .catch(() => {
        if (firestore) {
          searchSubmissionsByCitizen(firestore, ticketNum).then(r => setSearchResults(r)).catch(() => { });
        }
      })
      .finally(() => setIsSearching(false));
  };

  const maskNik = (nikStr?: string) => {
    if (!nikStr || nikStr.length < 8) return nikStr || '-';
    return nikStr.substring(0, 6) + '******' + nikStr.substring(nikStr.length - 4);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return '-';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* ── Navbar Publik ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 md:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center overflow-hidden relative shadow-md shadow-primary/20 shrink-0">
            {configData?.logoUrl || configData?.logoKecamatanUrl || configData?.logoBase64 ? (
              <Image src={configData.logoUrl || configData.logoKecamatanUrl || configData.logoBase64} alt="Logo" fill className="object-contain p-1" unoptimized />
            ) : (
              <Home className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black tracking-tighter uppercase text-slate-900 leading-none">
              KECAMATAN GANDRUNGMANGU
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              Layanan Pengajuan Mandiri Online
            </span>
          </div>
        </div>

        {/* Action Button: Kembali ke Beranda Layanan */}
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl font-bold border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-primary transition-all text-xs sm:text-sm">
            <Link href="/suratonline/">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="hidden xs:inline">Beranda Layanan</span>
              <span className="xs:hidden">Kembali</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-xl font-bold text-slate-500 hover:text-slate-900 text-xs hidden md:inline-flex">
            <Link href="/">
              Halaman Utama
            </Link>
          </Button>
        </div>
      </header>

      {/* ── Top Header Banner ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white py-10 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_50%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto space-y-3 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-amber-300 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4" />
            Formulir Resmi Pengajuan Pelayanan Surat Mandiri
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
            Pusat Pelayanan Surat <span className="text-amber-400">Kecamatan Gandrungmangu</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Lengkapi formulir permohonan secara mandiri dari mana saja. Berkas persyaratan Anda akan tersimpan aman di Google Drive untuk diverifikasi oleh petugas pelayanan.
          </p>
        </div>
      </div>

      {/* ── Main Container: Tab & Formulir ────────────────────────────── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 -mt-6 pb-20 z-20">
        <div className="rounded-3xl border border-slate-200/90 shadow-xl bg-white overflow-hidden text-slate-900">
          {/* Tab Switcher */}
          <div className="border-b border-slate-100 bg-slate-50/90 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-4 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setActiveTab('ajukan')}
                className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${activeTab === 'ajukan'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
              >
                <FileText className="w-4 h-4" />
                <span>Ajukan Surat Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lacak')}
                className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${activeTab === 'lacak'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
              >
                <Search className="w-4 h-4" />
                <span>Lacak Status Surat</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-8 md:p-10">
            {activeTab === 'ajukan' ? (
              <div className="space-y-8">
                {/* JIKA BERHASIL TERKIRIM: TAMPILKAN TIKET */}
                {submittedTicket && submittedData ? (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <div
                      ref={ticketRef}
                      className="bg-white rounded-3xl border-2 border-primary/20 p-6 sm:p-8 shadow-xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
                        Simpan di Google Drive
                      </div>

                      <div className="text-center space-y-3 pb-6 border-b border-slate-100">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                          <CheckCircle2 className="w-9 h-9" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          Pengajuan Penggantian KK Berhasil!
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                          Berkas KK dan KTP Anda berhasil disimpan ke Google Drive dan tercatat di sistem pelayanan Kecamatan Gandrungmangu.
                        </p>
                      </div>

                      {/* Ticket Highlight */}
                      <div className="my-6 bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl p-6 border border-blue-200/80 text-center space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                          KODE TIKET PELACAKAN RESMI
                        </span>
                        <div className="flex items-center justify-center gap-3">
                          <Ticket className="w-7 h-7 text-primary shrink-0" />
                          <span className="text-3xl sm:text-4xl font-mono font-black text-slate-900 tracking-wider">
                            {submittedTicket}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Gunakan kode tiket ini untuk memantau status persetujuan surat Anda di tab pelacakan.
                        </p>
                      </div>

                      {/* Summary Data */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 font-medium block">Nama Pemohon:</span>
                          <span className="font-bold text-slate-900 uppercase">{submittedData.nama}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">NIK Pemohon:</span>
                          <span className="font-mono font-bold text-slate-900">{maskNik(submittedData.nik)}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-slate-400 font-medium block">Alamat Pemohon:</span>
                          <span className="font-medium text-slate-800">{submittedData.alamat}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-slate-400 font-medium block">Maksud / Tujuan Penggantian KK:</span>
                          <span className="font-medium text-slate-800">{submittedData.maksudTujuan}</span>
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-2 pt-2 border-t border-slate-200/60 text-emerald-700 font-bold">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>2 Berkas Persyaratan (KK & KTP) Tersimpan di Google Drive</span>
                        </div>
                      </div>

                      {/* Catatan Prosedur */}
                      <div className="mt-5 p-4 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-amber-800">
                          <Clock className="w-4 h-4" />
                          Tahap Selanjutnya:
                        </p>
                        <p className="leading-relaxed text-[11px]">
                          Petugas pelayanan Kecamatan Gandrungmangu akan memverifikasi berkas Anda. Jika dokumen telah disetujui, Anda dapat mengambil Kartu Keluarga fisik di Kantor Balai Kecamatan Gandrungmangu pada hari kerja.
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={handleDownloadTicketImage}
                        disabled={isDownloadingTicket}
                        variant="outline"
                        className="flex-1 h-12 rounded-xl font-bold border-primary/30 text-primary hover:bg-primary/5 shadow-xs"
                      >
                        {isDownloadingTicket ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Memproses Gambar...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Simpan Bukti Tiket (Gambar)
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleLacakThisTicket(submittedTicket)}
                        className="flex-1 h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Lacak Status Pengajuan
                      </Button>
                      <Button
                        type="button"
                        onClick={handleResetForm}
                        variant="ghost"
                        className="h-12 rounded-xl font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      >
                        <FilePlus2 className="w-4 h-4 mr-2" />
                        Ajukan Kembali
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* KARTU BARU: 1. PENGAJUAN PENGGANTIAN KK & FORMULIR LENGKAP */
                  <div className="space-y-6">
                    {/* Kartu Utama */}
                    <Card className="rounded-3xl border border-slate-200 shadow-md hover:shadow-lg transition-all overflow-hidden">
                      <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500" />
                      <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start sm:items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0">
                              <Users className="w-7 h-7" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-200 text-[10px] font-black uppercase tracking-wider">
                                  Administrasi Kependudukan
                                </Badge>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Terhubung Google Drive
                                </span>
                              </div>
                              <CardTitle className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                1. Pengajuan Penggantian KK
                              </CardTitle>
                              <CardDescription className="text-xs sm:text-sm text-slate-500 mt-1">
                                Layanan permohonan penggantian Kartu Keluarga (KK) karena penambahan anggota keluarga baru, perubahan elemen data biodata, kartu keluarga rusak, atau kartu keluarga hilang.
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6 sm:p-8 space-y-6">
                        {/* Petunjuk Pengisian Singkat */}
                        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3 text-xs text-blue-900">
                          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold text-blue-950">Petunjuk Formulir Pengajuan KK:</p>
                            <p className="text-blue-900/80 leading-relaxed text-[11px]">
                              Isikan data Nama, NIK 16 digit, Alamat, serta Maksud/Tujuan pengajuan. Unggah foto/scan KK lama dan KTP pemohon. Semua berkas otomatis tersimpan di Google Drive kecamatan.
                            </p>
                          </div>
                        </div>

                        {/* FORMULIR ISIAN */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* 1. NIK */}
                            <div className="space-y-1.5 md:col-span-1">
                              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                                <span>NIK Pemohon <span className="text-rose-500">*</span></span>
                                {isSearchingResident && (
                                  <span className="text-[10px] text-blue-600 flex items-center gap-1 font-semibold">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Mencari data...
                                  </span>
                                )}
                                {residentFound && (
                                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Terverifikasi
                                  </span>
                                )}
                              </label>
                              <Input
                                type="text"
                                maxLength={16}
                                placeholder="Masukkan 16 digit NIK..."
                                value={nik}
                                onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                                disabled={isSubmitting}
                                className="h-12 rounded-xl text-sm font-mono border-slate-200 focus:border-primary shadow-xs"
                                required
                              />
                              <p className="text-[10px] text-slate-400">
                                Ketik 16 digit NIK sesuai KTP untuk pengecekan data otomatis.
                              </p>
                            </div>

                            {/* 2. Nama */}
                            <div className="space-y-1.5 md:col-span-1">
                              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                Nama Lengkap Pemohon <span className="text-rose-500">*</span>
                              </label>
                              <Input
                                type="text"
                                placeholder="Contoh: AHMAD YUSUF"
                                value={nama}
                                onChange={(e) => setNama(e.target.value.toUpperCase())}
                                disabled={isSubmitting}
                                className="h-12 rounded-xl text-sm uppercase border-slate-200 focus:border-primary shadow-xs"
                                required
                              />
                              <p className="text-[10px] text-slate-400">
                                Masukkan nama lengkap sesuai KTP / Kartu Keluarga.
                              </p>
                            </div>

                            {/* 3. Alamat */}
                            <div className="space-y-1.5 md:col-span-2">
                              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                Alamat Lengkap <span className="text-rose-500">*</span>
                              </label>
                              <Textarea
                                placeholder="Contoh: Dusun Cikawung RT 02 RW 04, Desa Cintaratu, Kec. Gandrungmangu"
                                value={alamat}
                                onChange={(e) => setAlamat(e.target.value)}
                                disabled={isSubmitting}
                                rows={2}
                                className="rounded-xl text-sm border-slate-200 focus:border-primary shadow-xs resize-none"
                                required
                              />
                              <p className="text-[10px] text-slate-400">
                                Tuliskan Dusun, RT, RW, dan Desa tempat tinggal Anda.
                              </p>
                            </div>

                            {/* 4. Maksud / Tujuan */}
                            <div className="space-y-1.5 md:col-span-2">
                              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                Maksud / Tujuan Penggantian KK <span className="text-rose-500">*</span>
                              </label>
                              <Textarea
                                placeholder="Jelaskan alasan penggantian KK, misal: Penambahan anggota keluarga (kelahiran anak) / Perubahan status perkawinan / KK lama rusak / KK hilang"
                                value={maksudTujuan}
                                onChange={(e) => setMaksudTujuan(e.target.value)}
                                disabled={isSubmitting}
                                rows={3}
                                className="rounded-xl text-sm border-slate-200 focus:border-primary shadow-xs resize-none"
                                required
                              />
                              <p className="text-[10px] text-slate-400">
                                Sebutkan rincian maksud atau perubahan data yang diajukan.
                              </p>
                            </div>
                          </div>

                          {/* SECTION UPLOAD BERKAS GOOGLE DRIVE */}
                          <div className="pt-4 border-t border-slate-100 space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                  <UploadCloud className="w-4 h-4 text-primary" />
                                  Unggah Berkas Persyaratan (Simpan ke Drive)
                                </h3>
                                <p className="text-xs text-slate-500">
                                  Format yang didukung: JPG, PNG, atau PDF. Maksimal 10 MB per berkas.
                                </p>
                              </div>
                              <Badge variant="outline" className="font-mono text-[10px] font-bold text-slate-500">
                                Wajib 2 Berkas
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* 5. Upload KK */}
                              <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                                  <span>Upload KK <span className="text-rose-500">*</span></span>
                                  {fileKK && (
                                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                      <FileCheck className="w-3.5 h-3.5" /> Terpilih
                                    </span>
                                  )}
                                </label>

                                <div className={`relative border-2 border-dashed rounded-2xl p-4 transition-all text-center ${fileKK
                                  ? 'border-emerald-300 bg-emerald-50/30'
                                  : 'border-slate-200 hover:border-primary/50 bg-slate-50/50'
                                  }`}>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    onChange={handleFileKKChange}
                                    disabled={isSubmitting}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                  />

                                  {fileKK ? (
                                    <div className="space-y-2 py-1">
                                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                                        <FileCheck className="w-5 h-5" />
                                      </div>
                                      <div className="text-xs font-bold text-emerald-800 line-clamp-1">
                                        {fileKK.name}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        {formatFileSize(fileKK.size)}
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={isSubmitting}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFileKK(null);
                                          setPreviewKK(null);
                                        }}
                                        className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 relative z-20"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus / Ganti
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5 py-4">
                                      <div className="w-10 h-10 rounded-full bg-white text-slate-400 flex items-center justify-center mx-auto shadow-xs">
                                        <UploadCloud className="w-5 h-5 text-primary" />
                                      </div>
                                      <p className="text-xs font-bold text-slate-800">
                                        Pilih Berkas Kartu Keluarga
                                      </p>
                                      <p className="text-[10px] text-slate-500">
                                        Foto/Scan KK lama atau Surat Keterangan Kehilangan
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 6. Upload KTP */}
                              <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                                  <span>Upload KTP <span className="text-rose-500">*</span></span>
                                  {fileKTP && (
                                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                      <FileCheck className="w-3.5 h-3.5" /> Terpilih
                                    </span>
                                  )}
                                </label>

                                <div className={`relative border-2 border-dashed rounded-2xl p-4 transition-all text-center ${fileKTP
                                  ? 'border-emerald-300 bg-emerald-50/30'
                                  : 'border-slate-200 hover:border-primary/50 bg-slate-50/50'
                                  }`}>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    onChange={handleFileKTPChange}
                                    disabled={isSubmitting}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                  />

                                  {fileKTP ? (
                                    <div className="space-y-2 py-1">
                                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                                        <FileCheck className="w-5 h-5" />
                                      </div>
                                      <div className="text-xs font-bold text-emerald-800 line-clamp-1">
                                        {fileKTP.name}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        {formatFileSize(fileKTP.size)}
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={isSubmitting}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFileKTP(null);
                                          setPreviewKTP(null);
                                        }}
                                        className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 relative z-20"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus / Ganti
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5 py-4">
                                      <div className="w-10 h-10 rounded-full bg-white text-slate-400 flex items-center justify-center mx-auto shadow-xs">
                                        <UploadCloud className="w-5 h-5 text-primary" />
                                      </div>
                                      <p className="text-xs font-bold text-slate-800">
                                        Pilih Berkas e-KTP Pemohon
                                      </p>
                                      <p className="text-[10px] text-slate-500">
                                        Foto/Scan KTP-el asli pemohon / kepala keluarga
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* SUBMIT BUTTON */}
                          <div className="pt-4">
                            <Button
                              type="submit"
                              disabled={isSubmitting}
                              className="w-full h-14 rounded-2xl font-black text-sm sm:text-base tracking-wide bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25 transition-all cursor-pointer"
                            >
                              {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  <span>{submitStep || 'Sedang memproses permohonan...'}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <FileText className="w-5 h-5" />
                                  <span>Kirim Pengajuan Penggantian KK</span>
                                </div>
                              )}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            ) : (
              /* Tab Lacak Status Surat */
              <div className="space-y-8 max-w-3xl mx-auto py-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Cek Status & Progres Surat Anda
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    Ketik 16 Digit NIK Pemohon atau Kode Tiket Pengajuan (contoh: <span className="font-mono font-bold text-slate-700">TKT-2026-XXXX</span>) untuk melihat status verifikasi terkini.
                  </p>
                </div>

                {/* Form Pencarian */}
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Ketik NIK Pemohon atau Kode Tiket..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-13 rounded-2xl text-sm border-slate-200 focus:border-primary shadow-xs"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSearching}
                    className="h-13 px-7 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-white shrink-0 shadow-lg shadow-primary/20"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mencari...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Lacak Surat
                      </>
                    )}
                  </Button>
                </form>

                {/* Hasil Pencarian */}
                {hasSearched && (
                  <div className="space-y-5 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Hasil Pencarian ({searchResults?.length || 0} Ditemukan)
                      </h3>
                      {searchResults && searchResults.length > 0 && (
                        <span className="text-xs text-slate-500 font-semibold">
                          Kata kunci: "{searchQuery}"
                        </span>
                      )}
                    </div>

                    {searchResults && searchResults.length > 0 ? (
                      <div className="space-y-4">
                        {searchResults.map((sub) => {
                          const isApproved = sub.status === 'APPROVED' || sub.status === 'COMPLETED' || sub.status === 'disetujui';
                          const isRejected = sub.status === 'REJECTED' || sub.status === 'ditolak';
                          const isPending = !isApproved && !isRejected;

                          return (
                            <Card key={sub.id} className="rounded-2xl border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                              <div className={`h-1.5 w-full ${isApproved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500'
                                }`} />
                              <CardContent className="p-5 sm:p-6 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-extrabold text-base sm:text-lg text-slate-900">
                                        {sub.letterType}
                                      </h4>
                                      <Badge variant="outline" className="font-mono text-xs font-bold bg-slate-50 text-slate-700">
                                        <Ticket className="w-3 h-3 mr-1" />
                                        {sub.ticketNumber || 'Tanpa Tiket'}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      Diajukan: {formatDate(sub.createdAt)}
                                    </p>
                                  </div>

                                  <div>
                                    {isApproved && (
                                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-bold px-3 py-1 text-xs gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        Disetujui Admin
                                      </Badge>
                                    )}
                                    {isPending && (
                                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-300 font-bold px-3 py-1 text-xs gap-1.5">
                                        <Clock className="w-4 h-4 text-amber-600" />
                                        Menunggu Verifikasi Admin
                                      </Badge>
                                    )}
                                    {isRejected && (
                                      <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border border-rose-300 font-bold px-3 py-1 text-xs gap-1.5">
                                        <XCircle className="w-4 h-4 text-rose-600" />
                                        Ditolak / Perlu Perbaikan
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Data Pemohon Ringkas */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  <div>
                                    <span className="text-slate-400 font-medium block">Nama Pemohon:</span>
                                    <span className="font-bold text-slate-800 uppercase">{sub.requesterName || sub.formData?.nama || sub.formData?.name || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 font-medium block">NIK Pemohon:</span>
                                    <span className="font-mono font-bold text-slate-800">{maskNik(sub.nik || sub.formData?.nik)}</span>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <span className="text-slate-400 font-medium block">Alamat:</span>
                                    <span className="font-medium text-slate-700">{(sub as any).alamat || sub.formData?.alamat || sub.formData?.address || '-'}</span>
                                  </div>
                                  {((sub as any).maksudTujuan || sub.formData?.maksudTujuan || sub.formData?.purpose) && (
                                    <div className="sm:col-span-2">
                                      <span className="text-slate-400 font-medium block">Maksud / Tujuan:</span>
                                      <span className="font-medium text-slate-700">{(sub as any).maksudTujuan || sub.formData?.maksudTujuan || sub.formData?.purpose}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-slate-400 font-medium block">Nomor Surat Resmi:</span>
                                    <span className={`font-mono font-bold ${sub.documentNumber && sub.documentNumber !== 'Belum Ada' ? 'text-primary' : 'text-slate-500'}`}>
                                      {sub.documentNumber || 'Belum Diterbitkan'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 font-medium block">Terakhir Diperbarui:</span>
                                    <span className="font-medium text-slate-700">{formatDate(sub.updatedAt)}</span>
                                  </div>
                                </div>

                                {/* Tautan Berkas Google Drive jika ada */}
                                {sub.driveFiles && sub.driveFiles.length > 0 && (
                                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1.5">
                                    <span className="text-[10px] font-black uppercase text-blue-700 block">
                                      Lampiran Berkas Google Drive:
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {sub.driveFiles.map((df: any, idx: number) => (
                                        <a
                                          key={idx}
                                          href={df.fileUrl || '#'}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-xs font-semibold text-blue-800 hover:text-blue-950 hover:border-blue-400 transition-colors"
                                        >
                                          <span>📄 {df.fieldName || df.fileName || `Berkas ${idx + 1}`}</span>
                                          <ExternalLink className="w-3 h-3 text-blue-500" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Kotak Status & Arahan */}
                                {isApproved && (
                                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 space-y-1.5">
                                    <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                      Surat Telah Siap Diambil!
                                    </p>
                                    <p className="leading-relaxed">
                                      Permohonan surat Anda telah selesai diverifikasi dan disetujui. Silakan datang ke <strong>Kantor Balai Kecamatan Gandrungmangu</strong> pada jam kerja (Senin - Jumat, 07:00 - 16:00 WIB) dengan menunjukkan <strong>Kode Tiket</strong> dan <strong>KTP Asli</strong> kepada petugas loket untuk pengambilan dokumen bertanda tangan resmi.
                                    </p>
                                  </div>
                                )}

                                {isPending && (
                                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
                                    <p className="font-bold flex items-center gap-1.5 text-amber-800">
                                      <Clock className="w-4 h-4 text-amber-600" />
                                      Sedang Dalam Antrean Verifikasi
                                    </p>
                                    <p className="leading-relaxed">
                                      Petugas Pelayanan Kecamatan sedang memeriksa keabsahan berkas KTP & KK yang Anda kirimkan. Harap pantau berkala halaman pelacakan ini.
                                    </p>
                                  </div>
                                )}

                                {isRejected && (
                                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 space-y-1.5">
                                    <p className="font-bold flex items-center gap-1.5 text-rose-800">
                                      <XCircle className="w-4 h-4 text-rose-600" />
                                      Permohonan Ditolak / Dibatalkan
                                    </p>
                                    <p className="leading-relaxed">
                                      {sub.notes
                                        ? `Catatan Petugas: "${sub.notes}"`
                                        : 'Data atau berkas persyaratan yang dilampirkan belum sesuai. Silakan hubungi Kantor Balai Kecamatan Gandrungmangu atau lakukan pengajuan ulang dengan data yang benar.'}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                        <h4 className="font-bold text-slate-700 text-sm">
                          Data Pengajuan Tidak Ditemukan
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                          Tidak ditemukan permohonan surat dengan kata kunci <strong>"{searchQuery}"</strong>. Pastikan NIK atau Kode Tiket sudah tepat.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Card Navigation */}
          <div className="border-t border-slate-100 bg-slate-50/60 p-4 text-center">
            <Link
              href="/suratonline/"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-primary transition-colors py-1"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Portal Layanan Mandiri
            </Link>
          </div>
        </div>
      </main>

      {/* ── Footer Publik ───────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 text-center text-xs text-slate-500 space-y-2 mt-auto">
        <p className="font-bold text-slate-800">
          Pemerintah Kecamatan Gandrungmangu &copy; {new Date().getFullYear()}
        </p>
        <p className="text-[11px] text-slate-400 max-w-md mx-auto">
          Kecamatan Gandrungmangu, Kabupaten Cilacap, Jawa Tengah. Melayani permohonan surat masyarakat dengan cepat, transparan, dan akuntabel.
        </p>
      </footer>
    </div>
  );
}

export default function PengajuanSuratPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PengajuanSuratContent />
    </Suspense>
  );
}
