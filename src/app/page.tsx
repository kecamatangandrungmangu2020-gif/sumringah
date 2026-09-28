'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FileText,
  Ticket,
  Calendar,
  Layers,
  Globe,
  MapPin,
  ExternalLink,
  User,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Search,
  Mail,
  Phone,
  Clock,
  Building2,
  Info,
  CheckCircle2,
  CheckCircle,
  Share2,
  RefreshCw,
  Loader2,
  Paperclip,
  FileCheck,
  Newspaper,
  BookOpen,
  PenSquare,
  ChevronDown,
  Landmark,
  Compass,
  MessageSquare,
  AlertCircle,
  Star,
  Send,
  Camera
} from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

import { useFirebase, useUser } from '@/firebase';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { callAppsScript } from '@/app/agenda/actions';
import { GOOGLE_CONFIG } from '@/lib/google-config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  InformasiVectorBackground,
  AgendaVectorBackground,
  WilayahVectorGrid,
  PengaduanVectorBackground,
  FooterVectorDecorations,
} from '@/components/landing/VectorDecorations';

interface CalendarEvent {
  id: string;
  summary: string;
  location?: string;
  htmlLink?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  description?: string;
  attachments?: Array<{
    title?: string;
    fileUrl?: string;
    mimeType?: string;
    iconLink?: string;
  }>;
}

interface AgendaDayInfo {
  offset: number;
  label: string;
  shortLabel: string;
  dateKey: string;
  fullDate: string;
  shortDate: string;
  dayName: string;
  items: CalendarEvent[];
  loading: boolean;
}

interface InformasiItem {
  id: string;
  title: string;
  category: string;
  date: string;
  imageUrl?: string;
  excerpt?: string;
  content?: string;
  isFeatured?: boolean;
  status: 'published' | 'draft';
  author?: string;
}

interface DesaItem {
  id: string;
  name: string;
  slug: string;
  kepalaDesa?: string;
  alamat?: string;
  kontak?: string;
  deskripsi?: string;
  imageUrl?: string;
  imagePublicId?: string;
  websiteUrl?: string;
  pelayananUrl?: string;
  updatedAt?: any;
}

interface WilayahData {
  title: string;
  subtitle?: string;
  description: string;
  secondaryDescription?: string;
  mapImageUrl?: string;
  mapImagePublicId?: string;
  bgImageUrl?: string;
  mapButtonText?: string;
  mapLinkUrl?: string;
  luasWilayah?: string;
  jumlahDesa?: string;
  pusatPemerintahan?: string;
  batasUtara?: string;
  batasSelatan?: string;
  batasBarat?: string;
  batasTimur?: string;
}

const DEFAULT_WILAYAH_CONFIG: WilayahData = {
  title: 'Wilayah Gandrungmangu',
  subtitle: 'Geospasial & Kewilayahan',
  description:
    'Kecamatan Gandrungmangu membentang strategis di bagian barat Kabupaten Cilacap, menaungi 14 Desa dengan potensi agraris yang subur, sentra perekonomian rakyat, dan kerukunan warga yang kokoh.',
  secondaryDescription:
    'Melalui integrasi data interaktif SOLID (Sistem Olah Laporan Informasi & Data Desa), Anda dapat mengeksplorasi informasi desa, potensi desa, jaringan jalan, serta data geospasial kewilayahan secara transparan dan mudah diakses.',
  mapImageUrl: '',
  bgImageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop',
  mapButtonText: 'Jelajahi Data Wilayah',
  mapLinkUrl: 'https://solid.gandrungmangu.id/',
  luasWilayah: '64,37 km²',
  jumlahDesa: '14 Desa',
  pusatPemerintahan: 'Kantor Kecamatan Gandrungmangu',
  batasUtara: 'Kecamatan Karangpucung & Sidareja',
  batasSelatan: 'Kecamatan Bantarsari & Kawunganten',
  batasBarat: 'Kecamatan Cipari & Sidareja',
  batasTimur: 'Kecamatan Bantarsari',
};

// ─── KOMPONEN FORM PENGADUAN & INFORMASI ──────────────────────────────────────
function PengaduanForm() {
  const [jenis, setJenis] = useState<'pengaduan' | 'informasi'>('pengaduan');
  const [form, setForm] = useState({ nama: '', nik: '', nohp: '', email: '', subjek: '', isi: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.nohp.trim() || !form.subjek.trim() || !form.isi.trim()) {
      setError('Nama, No. HP, Subjek, dan Isi wajib diisi.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/pengaduan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, jenis }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setForm({ nama: '', nik: '', nohp: '', email: '', subjek: '', isi: '' });
      } else {
        setError(json.message || 'Gagal mengirim. Silakan coba lagi.');
      }
    } catch (err) {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xl p-10 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-black text-slate-900">
          {jenis === 'informasi' ? 'Permintaan Terkirim!' : 'Pengaduan Terkirim!'}
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed max-w-sm mx-auto">
          Terima kasih. Tim kami akan segera menindaklanjuti dan menghubungi Anda melalui WhatsApp atau email yang diberikan.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors shadow-md"
        >
          Kirim Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white/90 border border-slate-200/90 shadow-xl p-6 sm:p-8 space-y-5 backdrop-blur-md">
      {/* Tab Pilih Jenis */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200/70">
        {[
          { value: 'pengaduan' as const, label: '🚨 Pengaduan' },
          { value: 'informasi' as const, label: '💡 Permintaan Informasi' },
        ].map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setJenis(tab.value)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${jenis === tab.value
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nama & NIK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              name="nama"
              value={form.nama}
              onChange={handleChange}
              required
              placeholder="Nama lengkap Anda"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
              NIK (Opsional)
            </label>
            <input
              name="nik"
              value={form.nik}
              onChange={handleChange}
              maxLength={16}
              placeholder="16 digit NIK (opsional)"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* No HP & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
              No. HP/WhatsApp <span className="text-rose-500">*</span>
            </label>
            <input
              name="nohp"
              value={form.nohp}
              onChange={handleChange}
              required
              type="tel"
              placeholder="08xx-xxxx-xxxx"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
              Email (Opsional)
            </label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              placeholder="email@contoh.com"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Subjek */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
            Subjek / Judul <span className="text-rose-500">*</span>
          </label>
          <input
            name="subjek"
            value={form.subjek}
            onChange={handleChange}
            required
            placeholder={jenis === 'informasi' ? 'Contoh: Permintaan data jumlah penduduk 2024' : 'Contoh: Jalan rusak di Dusun Wetan RT 02'}
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
          />
        </div>

        {/* Isi */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
            {jenis === 'informasi' ? 'Detail Informasi yang Diminta' : 'Uraian Pengaduan'} <span className="text-rose-500">*</span>
          </label>
          <textarea
            name="isi"
            value={form.isi}
            onChange={handleChange}
            required
            rows={4}
            placeholder={jenis === 'informasi'
              ? 'Jelaskan informasi apa yang Anda butuhkan secara rinci...'
              : 'Jelaskan masalah yang terjadi secara rinci (lokasi, waktu, kronologi)...'}
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all resize-none leading-relaxed shadow-sm"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:opacity-60 text-white font-black text-sm transition-all duration-200 hover:scale-[1.02] shadow-xl hover:shadow-rose-500/25"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitting ? 'Mengirim...' : jenis === 'informasi' ? 'Kirim Permintaan' : 'Kirim Pengaduan'}
          </button>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Data Anda dilindungi dan hanya digunakan untuk keperluan pelayanan.
          </p>
        </div>
      </form>
    </div>
  );
}

export default function HomePage() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const [mounted, setMounted] = useState(false);
  const [configData, setConfigData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache');
        if (cached) return JSON.parse(cached);
      } catch (e) { }
    }
    return null;
  });

  // State untuk Data Wilayah Gandrungmangu
  const [wilayahData, setWilayahData] = useState<WilayahData>(DEFAULT_WILAYAH_CONFIG);

  // State untuk Agenda Hari H, H+1, H+2, H+3
  const [selectedDayTab, setSelectedDayTab] = useState<number>(0);
  const [selectedDetailEvent, setSelectedDetailEvent] = useState<CalendarEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRefreshingAgenda, setIsRefreshingAgenda] = useState(false);

  // State untuk Informasi Terkini (Firestore)
  const [newsList, setNewsList] = useState<InformasiItem[]>([]);
  const [selectedNewsDetail, setSelectedNewsDetail] = useState<InformasiItem | null>(null);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

  // State untuk 14 Desa
  const [desaList, setDesaList] = useState<DesaItem[]>([]);
  const [isDesaDropdownOpen, setIsDesaDropdownOpen] = useState(false);
  const desaDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedDesaShowcase, setSelectedDesaShowcase] = useState<DesaItem | null>(null);
  const [isDesaModalOpen, setIsDesaModalOpen] = useState(false);

  // Menutup dropdown Desa ketika klik di luar area agar tidak hilang-muncul
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (desaDropdownRef.current && !desaDropdownRef.current.contains(event.target as Node)) {
        setIsDesaDropdownOpen(false);
      }
    }
    if (isDesaDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDesaDropdownOpen]);

  const [agendaDays, setAgendaDays] = useState<AgendaDayInfo[]>(() => {
    const base = new Date();
    return [0, 1, 2, 3].map((offset) => {
      const d = addDays(base, offset);
      return {
        offset,
        label: offset === 0 ? 'Hari Ini (Hari H)' : offset === 1 ? 'Besok (H+1)' : offset === 2 ? 'Lusa (H+2)' : 'H+3',
        shortLabel: offset === 0 ? 'Hari H' : `H+${offset}`,
        dateKey: format(d, 'yyyy-MM-dd'),
        fullDate: format(d, 'EEEE, dd MMMM yyyy', { locale: localeID }),
        shortDate: format(d, 'dd MMM', { locale: localeID }),
        dayName: format(d, 'EEEE', { locale: localeID }),
        items: [],
        loading: true,
      };
    });
  });

  useEffect(() => {
    setMounted(true);
    fetch('/api/village-profile/?t=' + Date.now(), { cache: 'no-store' })
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

    fetch('/api/informasi?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.items)) {
          setNewsList(data.items);
        }
      })
      .catch(() => { });

    fetch('/api/desa?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.items)) {
          setDesaList(data.items);
        }
      })
      .catch(() => { });

    fetch('/api/wilayah?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(resData => {
        if (resData && resData.success && resData.data) {
          setWilayahData(prev => ({ ...prev, ...resData.data }));
        }
      })
      .catch(() => { });
  }, []);

  // Sinkronisasi realtime langsung dari Firestore document settings/village
  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(doc(firestore, "settings", "village"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setConfigData((prev: any) => ({ ...prev, ...d }));
      }
    }, () => { });
    return () => unsub();
  }, [firestore]);

  // Sinkronisasi realtime langsung dari Firestore document settings/wilayah
  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(doc(firestore, "settings", "wilayah"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setWilayahData(prev => ({ ...prev, ...d }));
      }
    }, () => { });
    return () => unsub();
  }, [firestore]);

  // Sinkronisasi realtime Berita / Informasi Terkini (jika Firestore aktif)
  useEffect(() => {
    if (!firestore) return;
    try {
      const q = query(collection(firestore, 'informasi'), where('status', '==', 'published'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const items: InformasiItem[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data() } as InformasiItem);
          });
          items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setNewsList(items);
        },
        () => {
          // Tangani silent error jika izin akses dibatasi di cloud
        }
      );
      return () => unsub();
    } catch { }
  }, [firestore]);

  // Fetch data Google Calendar untuk 4 hari: Hari H, H+1, H+2, H+3
  const fetchAgendaForDays = async () => {
    setIsRefreshingAgenda(true);
    const base = new Date();
    const calendarId = GOOGLE_CONFIG.calendarId || 'primary';

    const dayConfigs = [0, 1, 2, 3].map((offset) => {
      const d = addDays(base, offset);
      return {
        offset,
        label: offset === 0 ? 'Hari Ini (Hari H)' : offset === 1 ? 'Besok (H+1)' : offset === 2 ? 'Lusa (H+2)' : 'H+3',
        shortLabel: offset === 0 ? 'Hari H' : `H+${offset}`,
        dateKey: format(d, 'yyyy-MM-dd'),
        fullDate: format(d, 'EEEE, dd MMMM yyyy', { locale: localeID }),
        shortDate: format(d, 'dd MMM', { locale: localeID }),
        dayName: format(d, 'EEEE', { locale: localeID }),
      };
    });

    try {
      const results = await Promise.all(
        dayConfigs.map(async (cfg) => {
          try {
            const res = await callAppsScript({
              action: 'getCalendar',
              calendarId,
              date: cfg.dateKey,
            });
            return {
              ...cfg,
              items: res && res.success && Array.isArray(res.items) ? (res.items as CalendarEvent[]) : [],
              loading: false,
            };
          } catch (e) {
            console.warn(`Gagal memuat agenda tanggal ${cfg.dateKey}:`, e);
            return {
              ...cfg,
              items: [],
              loading: false,
            };
          }
        })
      );
      setAgendaDays(results);
    } catch (err) {
      console.error('Error fetching calendar days:', err);
    } finally {
      setIsRefreshingAgenda(false);
    }
  };

  useEffect(() => {
    fetchAgendaForDays();
  }, []);

  const getFormattedHeroImage = (data: any) => {
    const raw = data?.heroPhotoUrl || data?.heroPhotoBase64 || data?.heroImageUrl || data?.heroImageBase64;
    if (!raw || typeof raw !== 'string') return '/hero-Kecamatan.jpg';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
      return raw;
    }
    return `data:image/jpeg;base64,${raw}`;
  };

  const getFormattedLogo = (data: any) => {
    const raw = data?.logoBase64 || data?.logoUrl;
    if (!raw || typeof raw !== 'string') return '';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
      return raw;
    }
    return `data:image/png;base64,${raw}`;
  };

  const heroImage = getFormattedHeroImage(configData);
  const logoImage = getFormattedLogo(configData);

  // Helper fungsi pengolah data acara agenda
  const formatTimeRange = (start?: { dateTime?: string }, end?: { dateTime?: string }) => {
    if (!start?.dateTime) return 'Waktu Belum Diatur';
    try {
      const s = parseISO(start.dateTime);
      const sStr = format(s, 'HH:mm');
      if (end?.dateTime) {
        const e = parseISO(end.dateTime);
        const eStr = format(e, 'HH:mm');
        return `${sStr} - ${eStr} WIB`;
      }
      return `${sStr} WIB - Selesai`;
    } catch {
      return 'Waktu Belum Diatur';
    }
  };

  const getEventType = (desc?: string) => {
    if (!desc) return 'Umum';
    if (desc.includes('JENIS: Internal') || desc.toLowerCase().includes('internal')) return 'Internal';
    if (desc.includes('JENIS: Eksternal') || desc.toLowerCase().includes('eksternal')) return 'Eksternal';
    return 'Umum';
  };

  const getEventDisposition = (desc?: string) => {
    if (!desc) return null;
    const match1 = desc.match(/^DISPOSISI:\s*(.+)$/im);
    if (match1 && match1[1]) {
      const val = match1[1].trim();
      if (val && !val.toLowerCase().includes('belum') && val !== '-' && val !== 'undefined') return val;
    }
    const match2 = desc.match(/📍\s*Disposisi:\s*(.+)$/im);
    if (match2 && match2[1]) {
      const val = match2[1].trim();
      if (val && !val.toLowerCase().includes('belum') && val !== '-' && val !== 'undefined') return val;
    }
    return null;
  };

  const getCleanDescription = (desc?: string) => {
    if (!desc) return '';
    let clean = desc.split('--- NOTULENSI ---')[0];
    clean = clean.replace(/^DISPOSISI:\s*.+$/im, '').replace(/📍\s*Disposisi:\s*.+$/im, '');
    return clean.trim();
  };

  const getNotulensi = (desc?: string) => {
    if (!desc) return '';
    const parts = desc.split('--- NOTULENSI ---');
    return parts.length > 1 ? parts[1].trim() : '';
  };

  const formatNewsDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      if (dateStr.length === 10) {
        return format(parseISO(dateStr), 'dd MMMM yyyy', { locale: localeID });
      }
      return format(new Date(dateStr), 'dd MMMM yyyy', { locale: localeID });
    } catch {
      return dateStr;
    }
  };

  // Hanya gunakan berita riil dari input admin (Firestore / API)
  const featuredNews = newsList.find(n => n.isFeatured) || newsList[0] || null;
  const secondaryNews = featuredNews ? newsList.filter(n => n.id !== featuredNews.id).slice(0, 3) : [];

  const activeDay = agendaDays[selectedDayTab] || agendaDays[0];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-900 relative">

      {/* ── 1. HEADER / NAVBAR ELEGAN (TRANSPARAN DI ATAS HERO) ─────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-50 w-full px-4 sm:px-8 py-5 flex items-center justify-between text-white">
        {/* Identitas Logo & Nama Daerah */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden relative shadow-lg group-hover:bg-white/20 transition-all shrink-0">
            {logoImage ? (
              <Image src={logoImage} alt="Logo" fill className="object-contain p-1" unoptimized />
            ) : (
              <Building2 className="h-6 w-6 text-amber-300" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold tracking-tight uppercase leading-none text-white drop-shadow-sm">
              Kecamatan Gandrungmangu
            </span>
            <span className="text-[10px] tracking-wider text-sky-100/80 uppercase font-medium mt-1">
              Kabupaten Cilacap
            </span>
          </div>
        </Link>

        {/* Menu Navigasi Tengah */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-widest text-white/90">
          <Link href="#layanan" className="hover:text-amber-300 transition-colors">
            Pelayanan
          </Link>
          <Link href="#informasi" className="hover:text-amber-300 transition-colors">
            Informasi
          </Link>
          <Link href="/input/" className="hover:text-amber-300 transition-colors">
            Kegiatan
          </Link>

          {/* Menu Dropdown "Desa" dengan Sub-menu 14 Desa (Transparan & Stabil Klik) */}
          <div className="relative" ref={desaDropdownRef}>
            <button
              type="button"
              onClick={() => setIsDesaDropdownOpen(!isDesaDropdownOpen)}
              className="hover:text-amber-300 transition-colors flex items-center gap-1.5 font-semibold uppercase tracking-widest text-xs py-1.5 focus:outline-none select-none"
            >
              <span className={isDesaDropdownOpen ? 'text-amber-300' : ''}>Desa</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isDesaDropdownOpen ? 'rotate-180 text-amber-300' : 'text-white/70'
                  }`}
              />
            </button>

            {/* Sub-menu Dropdown 14 Desa 2 Kolom (Transparan Frosted Glass) */}
            {isDesaDropdownOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[440px] bg-slate-950/70 backdrop-blur-2xl border border-white/20 rounded-2xl p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.75)] z-50 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10">
                <div className="px-3 py-2 mb-2.5 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between text-[11px] text-amber-300 font-bold uppercase tracking-wider backdrop-blur-sm">
                  <span className="flex items-center gap-2">
                    <Landmark className="w-3.5 h-3.5 text-amber-400" />
                    14 Desa di Gandrungmangu
                  </span>
                  <span className="text-[9px] text-slate-300 font-normal">Pilih desa</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {desaList.map((desa, idx) => (
                    <Link
                      key={desa.id}
                      href={`/${desa.slug || desa.id}/`}
                      onClick={() => setIsDesaDropdownOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-left bg-white/[0.04] hover:bg-white/15 border border-transparent hover:border-white/20 transition-all group backdrop-blur-sm"
                    >
                      <span className="w-5 h-5 rounded-md bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[10px] font-black flex items-center justify-center shrink-0 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-white/95 font-semibold group-hover:text-amber-300 truncate transition-colors">
                        {desa.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link href="#agenda" className="hover:text-amber-300 transition-colors">
            Agenda
          </Link>
          <Link href="#wilayah" className="hover:text-amber-300 transition-colors">
            Wilayah
          </Link>
          <a
            href="https://gandrungmangu.cilacapkab.go.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-300 transition-colors flex items-center gap-1"
          >
            Website Resmi <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
        </nav>

        {/* Ikon Profil Admin (Gambar Orang) - Akses ke /admin/ */}
        <div className="flex items-center">
          <Link
            href={user ? "/admin/" : "/login/"}
            className="relative flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/25 hover:bg-black/40 backdrop-blur-md border border-white/30 hover:border-amber-400 text-white transition-all duration-300 shadow-md hover:scale-105 shrink-0"
            title={user ? "Buka Dashboard Admin (/admin/)" : "Login Admin"}
          >
            <User className="h-5 w-5 text-amber-200" />
            {user && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            )}
          </Link>
        </div>
      </header>

      {/* ── 2. HERO SECTION DENGAN GAYA EDITORIAL LEYCHERT & OMBAK EMAS ──────────────── */}
      <section className="relative w-full min-h-[580px] sm:min-h-[640px] md:min-h-[700px] flex flex-col justify-between overflow-hidden pt-28 sm:pt-36 pb-0">
        {/* Foto Lanskap Alam & Suasana Golden Hour */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {heroImage ? (
            <Image
              src={heroImage}
              alt="Bentang Alam Gandrungmangu"
              fill
              priority
              className="object-cover object-center brightness-95 scale-100"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-blue-900 via-sky-800 to-amber-900" />
          )}
          {/* Overlay Natural Warm Vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-slate-950/60 to-slate-950/90" />
          <div className="absolute inset-0 bg-radial from-transparent via-slate-950/20 to-black/60" />
        </div>

        {/* Konten Hero Tengah */}
        <div className="relative z-10 container mx-auto px-4 text-center my-auto flex flex-col items-center">

          {/* Badge Pemerintah Kecamatan yang Modern & Elegan */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-md border border-amber-400/30 text-amber-300 text-[11px] sm:text-xs font-bold tracking-[0.25em] uppercase mb-3 sm:mb-4 shadow-lg">
            <Landmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Pemerintah Kecamatan</span>
          </div>

          {/* Judul Besar 2 Baris: Modern Upright + Warm Smiling Editorial */}
          <h1 className="select-none mb-2 sm:mb-3 flex flex-col items-center justify-center leading-[1.05] sm:leading-[1.08]">
            {/* Baris 1: Gandrungmangu (Tegak, Kokoh, Modern Sans) */}
            <span className="font-heading font-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[80px] text-white tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
              Gandrungmangu
            </span>

            {/* Baris 2: Semringah (Hangat, Luwes, Berseri-seri, Bergradasi Emas & Senyuman) */}
            <span className="relative inline-flex flex-col items-center mt-1 sm:mt-2">
              <span className="relative inline-flex items-center justify-center">
                <span className="font-editorial italic font-extrabold text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[94px] text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-yellow-400 tracking-tight drop-shadow-[0_4px_24px_rgba(245,158,11,0.5)] animate-semringah-radiance">
                  Semringah
                </span>

                {/* Kilau Binar Senyum Riang di Sudut Atas */}
                <span className="absolute -top-1 sm:-top-2 -right-5 sm:-right-7 animate-sparkle-twinkle text-yellow-300 pointer-events-none">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                  </svg>
                </span>
                <span className="absolute -bottom-1 -left-4 sm:-left-6 animate-sparkle-twinkle-delay text-amber-300 pointer-events-none opacity-80">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                  </svg>
                </span>
              </span>

              {/* Lengkungan Garis Senyuman (Smile Arc) Presisi & Proporsional */}
              <span className="w-44 sm:w-64 md:w-80 lg:w-96 h-4 sm:h-6 relative -mt-0.5 sm:-mt-1 flex items-center justify-center pointer-events-none">
                <svg
                  viewBox="0 0 320 38"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full animate-smile-bloom overflow-visible"
                >
                  <defs>
                    <linearGradient id="smileGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.75" />
                      <stop offset="25%" stopColor="#FDE047" />
                      <stop offset="50%" stopColor="#FFFFFF" />
                      <stop offset="75%" stopColor="#FDE047" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.75" />
                    </linearGradient>
                    <filter id="smileGlow" x="-20%" y="-20%" width="140%" height="160%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Garis Senyum Utama yang Melengkung Manis ke Atas */}
                  <path
                    d="M 16 6 Q 160 32 304 6"
                    stroke="url(#smileGradient)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    filter="url(#smileGlow)"
                  />

                  {/* Titik Lesung Pipit Kiri & Kanan (Smiling Cheeks) */}
                  <circle cx="16" cy="6" r="3" fill="#FDE047" />
                  <circle cx="304" cy="6" r="3" fill="#FDE047" />
                </svg>
              </span>
            </span>
          </h1>

          {/* Subtitle Elegan dalam Kapsul Kaca (Frosted Glass Container) */}
          <div className="mt-4 sm:mt-5 inline-flex items-center justify-center max-w-2xl mx-auto px-5 py-2.5 rounded-2xl bg-slate-950/50 backdrop-blur-md border border-white/15 shadow-xl">
            <p className="text-xs sm:text-sm md:text-base text-slate-100 font-medium tracking-normal leading-relaxed text-center">
              Pelayanan Digital Kecamatan Gandrungmangu: Hadir dengan <span className="font-bold text-amber-300">SEMRINGAH</span> ("SEMAngat membeRIkan pelayanan NGgawe bungAH")
            </p>
          </div>

          {/* Mini Quick Utility Buttons (Layanan Antrian, Bantu Nilai Kami, Email, Telepon) */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 sm:pt-5">
            <Link
              href="/Antrian/online/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl hover:shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 border border-amber-300/50"
              title="Cari Layanan & Tiket Antrian Online"
            >
              <Search className="h-4 w-4 text-slate-950" />
              <span>Ambil Antrian Online</span>
            </Link>
            <a
              href="https://sisukma.cilacapkab.go.id/Home/pelayanan/4012001"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-amber-300 font-extrabold text-xs sm:text-sm shadow-xl backdrop-blur-md border border-white/20 hover:border-amber-400/50 transition-all hover:scale-105 active:scale-95 group"
              title="Survei Kepuasan Masyarakat (SiSukma) - Bantu Nilai Kami"
            >
              <Star className="h-4 w-4 text-amber-400 fill-amber-400/80 group-hover:scale-110 transition-transform" />
              <span>Bantu Nilai Kami</span>
              <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
            <a
              href="mailto:gandrungmangu@cilacapkab.go.id"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shadow-md backdrop-blur-md border border-white/20 hover:text-amber-300 hover:scale-105 transition-all"
              title="Kirim Email Resmi"
            >
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
            </a>
            <a
              href="tel:0282123456"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shadow-md backdrop-blur-md border border-white/20 hover:text-amber-300 hover:scale-105 transition-all"
              title="Hubungi Kantor Kecamatan"
            >
              <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
            </a>
          </div>
        </div>

        {/* ── Lengkungan Ombak Ganda Berwarna Emas & Putih (Double Wave Divider) ── */}
        <div className="relative z-10 w-full overflow-hidden leading-none mt-12 sm:mt-16">
          <svg
            className="w-full h-16 sm:h-24 md:h-32 text-[#FAF9F5]"
            viewBox="0 0 1440 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            {/* Wave 1: Emas/Sand Padi (Warm Amber Subtle Layer) */}
            <path
              d="M0,60 C320,140 460,20 800,90 C1120,160 1280,40 1440,80 L1440,180 L0,180 Z"
              fill="#F59E0B"
              fillOpacity="0.45"
            />
            {/* Wave 2: Emas Padi Solid Lembut */}
            <path
              d="M0,90 C360,160 520,40 880,110 C1200,180 1340,70 1440,105 L1440,180 L0,180 Z"
              fill="#FBBF24"
              fillOpacity="0.6"
            />
            {/* Wave 3: Putih/Krem Bersih sebagai Dasar Konten Utama */}
            <path
              d="M0,115 C340,175 600,65 960,130 C1240,180 1360,110 1440,130 L1440,180 L0,180 Z"
              fill="#FAF9F5"
            />
          </svg>
        </div>
      </section>

      {/* ── KONTEN UTAMA: LAYANAN & INFORMASI TERKINI (SEAMLESS WHITE WAVE VECTOR) ── */}
      <div className="relative">
        {/* Latar Belakang Vektor Gelombang Putih/Perak Menyatu Sempurna dari Bawah Hero ke Informasi */}
        <InformasiVectorBackground />

        {/* ── 3. 5 KARTU IKON LINGKARAN MELAYANG (CIRCULAR QUICK ACTION BADGES) ───────── */}
        <section id="layanan" className="relative z-20 -mt-8 sm:-mt-12 md:-mt-16 container mx-auto px-4 max-w-6xl">
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-4 md:gap-5 justify-items-center">

          {/* 1. Tiket Antrian Online */}
          <Link
            href="/Antrian/online/"
            className="group flex flex-col items-center text-center space-y-3 w-full max-w-[170px]"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-2 border-amber-200/80 shadow-md group-hover:shadow-xl group-hover:border-amber-400 group-hover:-translate-y-1.5 transition-all duration-300 flex items-center justify-center p-4">
              <Ticket className="w-9 h-9 sm:w-10 sm:h-10 text-amber-600 stroke-[1.5]" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-amber-700 transition-colors tracking-tight">
              Tiket Antrian
            </span>
          </Link>

          {/* 2. Layanan Surat / Dokumen */}
          <Link
            href="/pengajuan-surat/"
            className="group flex flex-col items-center text-center space-y-3 w-full max-w-[170px]"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-2 border-rose-200/80 shadow-md group-hover:shadow-xl group-hover:border-rose-400 group-hover:-translate-y-1.5 transition-all duration-300 flex items-center justify-center p-4">
              <FileText className="w-9 h-9 sm:w-10 sm:h-10 text-rose-600 stroke-[1.5]" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-rose-700 transition-colors tracking-tight">
              Layanan Surat
            </span>
          </Link>

          {/* 3. Agenda Kegiatan */}
          <Link
            href="#agenda"
            className="group flex flex-col items-center text-center space-y-3 w-full max-w-[170px]"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-2 border-sky-200/80 shadow-md group-hover:shadow-xl group-hover:border-sky-400 group-hover:-translate-y-1.5 transition-all duration-300 flex items-center justify-center p-4">
              <Calendar className="w-9 h-9 sm:w-10 sm:h-10 text-sky-600 stroke-[1.5]" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-sky-700 transition-colors tracking-tight">
              Agenda Acara
            </span>
          </Link>

          {/* 4. Laporan Kegiatan Publik */}
          <Link
            href="/input/"
            className="group flex flex-col items-center text-center space-y-3 w-full max-w-[170px]"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-2 border-purple-200/80 shadow-md group-hover:shadow-xl group-hover:border-purple-400 group-hover:-translate-y-1.5 transition-all duration-300 flex items-center justify-center p-4">
              <Camera className="w-9 h-9 sm:w-10 sm:h-10 text-purple-600 stroke-[1.5]" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-purple-700 transition-colors tracking-tight">
              Laporan Kegiatan
            </span>
          </Link>

          {/* 5. Data Kewilayahan SOLID */}
          <a
            href="https://solid.gandrungmangu.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center text-center space-y-3 w-full max-w-[170px]"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-2 border-emerald-200/80 shadow-md group-hover:shadow-xl group-hover:border-emerald-400 group-hover:-translate-y-1.5 transition-all duration-300 flex items-center justify-center p-4">
              <Layers className="w-9 h-9 sm:w-10 sm:h-10 text-emerald-600 stroke-[1.5]" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight flex items-center gap-1 justify-center">
              Data Wilayah <ExternalLink className="w-3 h-3 opacity-60" />
            </span>
          </a>

          {/* 6. Website Resmi Kecamatan */}
          <a
            href="https://gandrungmangu.cilacapkab.go.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center text-center space-y-3 w-full max-w-[170px]"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-2 border-indigo-200/80 shadow-md group-hover:shadow-xl group-hover:border-indigo-400 group-hover:-translate-y-1.5 transition-all duration-300 flex items-center justify-center p-4">
              <Globe className="w-9 h-9 sm:w-10 sm:h-10 text-indigo-600 stroke-[1.5]" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors tracking-tight flex items-center gap-1 justify-center">
              Website Resmi <ExternalLink className="w-3 h-3 opacity-60" />
            </span>
          </a>

        </div>
      </section>

      {/* ── 4. SECTION 1: "INFORMASI TERKINI" (ACTUALITÉS) ─────────────────────────── */}
      <section id="informasi" className="relative z-10 pt-8 pb-16 sm:pb-24">
        <div className="relative z-10 container mx-auto px-4 max-w-6xl">
          {/* Header Section dengan Judul Serif Miring & Tombol Aksi */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black uppercase tracking-wider mb-2">
                <Newspaper className="w-3.5 h-3.5 text-rose-600" />
                Kabar & Publikasi Resmi
              </div>
              <h2 className="font-editorial italic font-extrabold text-3xl sm:text-4xl md:text-5xl text-slate-900 tracking-tight">
                Informasi Terkini
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <Link
                  href="/pelayanan/informasi"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                  title="Kelola Redaksi Berita di Admin"
                >
                  <PenSquare className="w-3.5 h-3.5" />
                  <span>Kelola Berita</span>
                </Link>
              )}
              <a
                href="https://gandrungmangu.cilacapkab.go.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md"
              >
                Semua Informasi
              </a>
            </div>
          </div>

          {/* Grid Konten Informasi Terkini (Hanya Data Riil Admin, bila belum ada kosongkan) */}
          {!featuredNews ? (
            <div className="p-12 sm:p-16 rounded-3xl bg-white border-2 border-dashed border-slate-200 text-center space-y-3 max-w-lg mx-auto shadow-sm">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Newspaper className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                Belum Ada Informasi Terkini
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                Publikasi dan berita resmi dari admin akan ditampilkan di sini setelah ditambahkan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Kolom Kiri: Kartu Berita Utama Besar */}
              <div
                onClick={() => {
                  setSelectedNewsDetail(featuredNews);
                  setIsNewsModalOpen(true);
                }}
                className="lg:col-span-6 bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 group transition-all duration-300 hover:shadow-xl hover:border-amber-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    {featuredNews.imageUrl ? (
                      <Image
                        src={featuredNews.imageUrl}
                        alt={featuredNews.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-rose-900 via-amber-900 to-slate-900 text-white/50 p-6 text-center">
                        <Newspaper className="w-16 h-16 opacity-40 mb-2" />
                        <span className="text-xs uppercase tracking-widest text-amber-200/80 font-bold">Informasi Gandrungmangu</span>
                      </div>
                    )}
                    {/* Badge Tanggal Merah/Terracotta Menempel pada Foto */}
                    <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
                      <div className="px-3.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-bold tracking-wide shadow-md">
                        {formatNewsDate(featuredNews.date)}
                      </div>
                      {featuredNews.category && (
                        <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-200 text-[10px] font-bold tracking-wider uppercase border border-white/20">
                          {featuredNews.category}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 sm:p-7 space-y-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-rose-600 transition-colors leading-snug">
                      {featuredNews.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-normal line-clamp-3">
                      {featuredNews.excerpt || featuredNews.content}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-0">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider group-hover:translate-x-1 transition-transform"
                  >
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">
                      ▶
                    </span>
                    <span>Baca Selengkapnya</span>
                  </button>
                </div>
              </div>

              {/* Kolom Kanan: Rincian Berita Lainnya (Hanya jika ada berita riil dari admin, bila belum ada kosongkan saja) */}
              {secondaryNews.length > 0 && (
                <div className="lg:col-span-6 space-y-6">
                  {secondaryNews.map((news, idx) => (
                    <div
                      key={news.id || idx}
                      onClick={() => {
                        setSelectedNewsDetail(news);
                        setIsNewsModalOpen(true);
                      }}
                      className={`pb-6 space-y-2 group cursor-pointer ${idx !== secondaryNews.length - 1 ? 'border-b border-slate-200/80' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="inline-block px-3 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold tracking-wider">
                          {formatNewsDate(news.date)}
                        </div>
                        {news.category && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            {news.category}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-rose-600 transition-colors leading-snug">
                        {news.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                        {news.excerpt || news.content}
                      </p>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold text-xs uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                          <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[8px]">
                            ▶
                          </span>
                          <span>Baca Selengkapnya</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      </div>

      {/* ── 5. SECTION 2: "AGENDA KEGIATAN" SESUAI /AGENDA/ (HARI H, H+1, H+2, H+3) ── */}
      <section id="agenda" className="relative py-16 sm:py-24 bg-white/70 border-t border-b border-slate-200/60 overflow-hidden">
        {/* Sentuhan Vektor Ritme Kalender & Garis Aliran Waktu */}
        <AgendaVectorBackground />

        <div className="relative z-10 container mx-auto px-4 max-w-6xl">
          {/* Header Section dengan Judul Serif Miring + Deskripsi + Aksi */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Kalender Resmi Kedinasan & Kemasyarakatan
              </div>
              <h2 className="font-editorial italic font-extrabold text-3xl sm:text-4xl md:text-5xl text-slate-900 tracking-tight">
                Agenda Kegiatan
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Jadwal agenda kegiatan dinas, disposisi pejabat kewilayahan di lingkungan Kecamatan Gandrungmangu
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchAgendaForDays}
                disabled={isRefreshingAgenda}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all shadow-sm disabled:opacity-60"
                title="Sinkronisasi Ulang Kalender Google"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isRefreshingAgenda ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>
            </div>
          </div>

          {/* ── 4 TABS HARI: HARI H, H+1, H+2, H+3 ──────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-8">
            {agendaDays.map((day, idx) => {
              const isActive = selectedDayTab === idx;
              return (
                <button
                  key={day.offset}
                  onClick={() => setSelectedDayTab(idx)}
                  className={`relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all text-left flex flex-col justify-between overflow-hidden group ${isActive
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20 scale-[1.02]'
                    : 'bg-white/80 hover:bg-white border-slate-200/90 text-slate-700 hover:border-amber-400 hover:shadow-md'
                    }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isActive
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-amber-100 group-hover:text-amber-900'
                        }`}
                    >
                      {day.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${isActive ? 'text-amber-300' : 'text-slate-400'
                        }`}
                    >
                      {day.dayName}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-1">
                    <span
                      className={`text-xl sm:text-2xl font-black tracking-tight ${isActive ? 'text-white' : 'text-slate-900'
                        }`}
                    >
                      {day.shortDate}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${isActive ? 'text-sky-200' : 'text-slate-500'
                        }`}
                    >
                      {day.loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        `${day.items.length} Acara`
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── RINCIAN DAFTAR AGENDA PADA HARI TERPILIH ───────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Agenda {activeDay.fullDate}
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {activeDay.items.length} Agenda Terjadwal
              </span>
            </div>

            {/* Status Loading */}
            {activeDay.loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm animate-pulse space-y-4">
                    <div className="h-5 bg-slate-100 rounded-full w-1/3" />
                    <div className="h-6 bg-slate-100 rounded-xl w-3/4" />
                    <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
                    <div className="h-10 bg-slate-100 rounded-2xl w-full pt-4" />
                  </div>
                ))}
              </div>
            ) : activeDay.items.length > 0 ? (
              /* Grid Kartu Rincian Agenda */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeDay.items.map((event) => {
                  const timeStr = formatTimeRange(event.start, event.end);
                  const type = getEventType(event.description);
                  const disp = getEventDisposition(event.description);
                  const isInternal = type === 'Internal';
                  const isExternal = type === 'Eksternal';

                  return (
                    <div
                      key={event.id}
                      className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group hover:border-amber-400/60"
                    >
                      <div className="space-y-3.5">
                        {/* Top Bar: Waktu + Badge Jenis */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/60">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{timeStr}</span>
                          </div>
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${isInternal
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : isExternal
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}
                          >
                            {type}
                          </span>
                        </div>

                        {/* Disposisi (Jika Ada) */}
                        {disp && (
                          <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium leading-tight">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-[9px] uppercase tracking-wide block text-emerald-800">
                                Disposisi:
                              </span>
                              <span className="line-clamp-2">{disp}</span>
                            </div>
                          </div>
                        )}

                        {/* Judul Kegiatan */}
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-amber-800 transition-colors leading-snug line-clamp-2">
                          {event.summary}
                        </h4>

                        {/* Lokasi */}
                        <div className="flex items-start gap-2 text-xs text-slate-500 font-medium">
                          <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{event.location || 'Lokasi belum diatur'}</span>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* State Ketika Tidak Ada Acara */
              <div className="p-10 sm:p-14 rounded-3xl bg-white border-2 border-dashed border-slate-200 text-center space-y-4 max-w-xl mx-auto shadow-sm">
                <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <Calendar className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-800">
                    Tidak Ada Jadwal Agenda
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                    Belum ada agenda kedinasan atau acara kemasyarakatan yang dijadwalkan pada {activeDay.fullDate}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 6. SECTION 3: "WILAYAH GANDRUNGMANGU" (LE TERRITOIRE / PETA WILAYAH) ──────── */}
      <section id="wilayah" className="relative w-full py-20 sm:py-28 overflow-hidden text-white">
        {/* Sentuhan Vektor Radar Geodetik, Koordinat & Kontur Geospasial SOLID */}
        <WilayahVectorGrid />
        {/* Foto Bentang Alam Lebar dengan Overlay Atmosferik */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src={wilayahData.bgImageUrl || "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop"}
            alt={wilayahData.title || "Wilayah Gandrungmangu"}
            fill
            className="object-cover object-center brightness-50"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-blue-950/70 to-slate-950/80" />
        </div>

        <div className="relative z-10 container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

            {/* Sisi Kiri: Judul Serif Miring + Teks + Tombol Terracotta */}
            <div className="lg:col-span-6 space-y-6">
              {wilayahData.subtitle && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-300 text-[11px] font-bold tracking-widest uppercase">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>{wilayahData.subtitle}</span>
                </div>
              )}

              <h2 className="font-editorial italic font-extrabold text-4xl sm:text-5xl md:text-6xl text-white tracking-tight leading-tight">
                {wilayahData.title || 'Wilayah Gandrungmangu'}
              </h2>

              <div className="space-y-4 text-sm sm:text-base text-slate-200/90 leading-relaxed font-light whitespace-pre-line">
                <p>
                  {wilayahData.description}
                </p>
                {wilayahData.secondaryDescription && (
                  <p>
                    {wilayahData.secondaryDescription}
                  </p>
                )}
              </div>

              {wilayahData.mapLinkUrl && (
                <div className="pt-2">
                  <a
                    href={wilayahData.mapLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 shadow-xl hover:scale-105"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>{wilayahData.mapButtonText || 'Jelajahi Data Wilayah'}</span>
                    <ExternalLink className="w-4 h-4 opacity-75" />
                  </a>
                </div>
              )}
            </div>

            {/* Sisi Kanan: Visual Peta Wilayah (Cloudinary atau Siluet Poligon) */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-full max-w-[460px] rounded-3xl bg-blue-950/75 border border-white/20 backdrop-blur-xl p-6 flex flex-col justify-between shadow-2xl overflow-hidden group">

                {/* Tampilan Gambar Peta Cloudinary jika ada */}
                {wilayahData.mapImageUrl ? (
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-white border border-white/30 group-hover:scale-[1.02] transition-transform duration-500 shadow-2xl flex items-center justify-center">
                    <Image
                      src={wilayahData.mapImageUrl}
                      alt={wilayahData.title || 'Peta Wilayah Gandrungmangu'}
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  </div>
                ) : (
                  /* Fallback SVG Siluet Poligon Wilayah Gandrungmangu */
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-white border border-white/30 flex items-center justify-center p-6 shadow-2xl group-hover:scale-[1.02] transition-transform duration-500">
                    <svg viewBox="0 0 300 340" className="w-full h-full filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
                      <path
                        d="M120,20 L210,35 L260,95 L280,180 L230,270 L170,320 L90,300 L40,240 L30,150 L65,80 Z"
                        fill="#2563EB"
                        stroke="#1D4ED8"
                        strokeWidth="2.5"
                        className="transition-all duration-300"
                      />
                      <path d="M65,80 Q150,160 230,270" stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                      <path d="M120,20 Q160,170 170,320" stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                      <circle cx="150" cy="165" r="7" fill="#E11D48" stroke="#FFFFFF" strokeWidth="2.5" />
                      <circle cx="100" cy="95" r="4.5" fill="#0284C7" />
                      <circle cx="205" cy="115" r="4.5" fill="#0284C7" />
                      <circle cx="185" cy="230" r="4.5" fill="#0284C7" />
                      <circle cx="95" cy="245" r="4.5" fill="#0284C7" />
                    </svg>
                  </div>
                )}

                {/* Badge Penanda Titik Pusat */}
                <div className="relative z-10 self-start px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/20 backdrop-blur-sm text-[10px] font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Pusat: {wilayahData.pusatPemerintahan || 'Kantor Kecamatan Gandrungmangu'}
                </div>

                {/* Info Card di Bagian Bawah Siluet / Peta */}
                <div className="relative z-10 bg-slate-900/95 rounded-2xl border border-white/10 p-4 text-xs space-y-2 backdrop-blur-md mt-3 shadow-lg">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Luas Wilayah:</span>
                    <span className="font-bold text-white">{wilayahData.luasWilayah || '64,37 km²'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Jumlah Desa Terdaftar:</span>
                    <span className="font-bold text-white">{wilayahData.jumlahDesa || '14 Desa'}</span>
                  </div>

                  {/* Batas Wilayah jika ada */}
                  {(wilayahData.batasUtara || wilayahData.batasSelatan || wilayahData.batasBarat || wilayahData.batasTimur) && (
                    <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                      {wilayahData.batasUtara && (
                        <div><span className="text-slate-400 font-semibold">Utara:</span> {wilayahData.batasUtara}</div>
                      )}
                      {wilayahData.batasSelatan && (
                        <div><span className="text-slate-400 font-semibold">Selatan:</span> {wilayahData.batasSelatan}</div>
                      )}
                      {wilayahData.batasBarat && (
                        <div><span className="text-slate-400 font-semibold">Barat:</span> {wilayahData.batasBarat}</div>
                      )}
                      {wilayahData.batasTimur && (
                        <div><span className="text-slate-400 font-semibold">Timur:</span> {wilayahData.batasTimur}</div>
                      )}
                    </div>
                  )}

                  <div className="pt-1.5 flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold border-t border-white/10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Terverifikasi Geospasial SOLID</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION: LAYANAN PENGADUAN & INFORMASI ───────────────────────────── */}
      <section className="bg-gradient-to-b from-[#FAF9F5] via-white to-amber-50/25 py-16 sm:py-24 relative overflow-hidden">
        {/* Sentuhan Vektor Gelombang Dialog & Dot-Matrix Responsif */}
        <PengaduanVectorBackground />
        {/* Background decorative subtle */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-rose-100 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-blue-100 blur-3xl" />
        </div>

        <div className="relative z-10 container mx-auto px-4 max-w-6xl">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold tracking-widest uppercase mb-4">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Layanan Masyarakat</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
              Pengaduan &amp; Informasi
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
              Sampaikan keluhan, masukan, atau permintaan informasi Anda. Tim kami siap merespons setiap laporan masyarakat.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Kiri: Info Kontak & WA */}
            <div className="lg:col-span-4 space-y-5">
              {/* Info Card WA */}
              <div className="rounded-3xl bg-emerald-500 p-6 text-white shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-black text-lg leading-tight">Hubungi via WhatsApp</p>
                    <p className="text-emerald-100 text-xs">Respon Cepat &amp; Langsung</p>
                  </div>
                </div>
                <a
                  href="https://wa.me/6208950881484?text=Halo,%20saya%20ingin%20menyampaikan%20pengaduan%20kepada%20Kecamatan%20Gandrungmangu."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3.5 rounded-2xl bg-white text-emerald-700 font-black text-center text-sm hover:bg-emerald-50 transition-colors shadow-lg"
                >
                  0895-0881-1484
                </a>
                <p className="text-emerald-100 text-[11px] text-center mt-3 leading-relaxed">
                  Klik untuk langsung chat WhatsApp dengan tim pelayanan kami.
                </p>
              </div>

              {/* Info layanan */}
              <div className="rounded-3xl bg-slate-50 border border-slate-200 p-5 space-y-3">
                <h4 className="text-slate-800 font-black text-sm">Jenis Layanan</h4>
                {[
                  { icon: '🚨', title: 'Pengaduan', desc: 'Laporkan masalah infrastruktur, pelayanan, atau ketertiban umum' },
                  { icon: '💡', title: 'Permintaan Informasi', desc: 'Minta data, dokumen, atau keterangan resmi dari pemerintah' },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                    <span className="text-xl mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-slate-900 font-bold text-xs">{item.title}</p>
                      <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* SLA / Waktu Respons */}
              <div className="rounded-3xl bg-slate-50 border border-slate-200 p-5">
                <h4 className="text-slate-800 font-black text-sm mb-3">Waktu Respons</h4>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Pengaduan Darurat', time: '1 x 24 Jam', color: 'text-rose-600' },
                    { label: 'Pengaduan Umum', time: '3 x 24 Jam', color: 'text-amber-600' },
                    { label: 'Permintaan Informasi', time: '5 x 24 Jam', color: 'text-blue-600' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-center">
                      <span className="text-slate-500">{r.label}</span>
                      <span className={`font-black ${r.color}`}>{r.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Kanan: Form Pengaduan */}
            <div className="lg:col-span-8">
              <PengaduanForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. FOOTER DARK THEMED ───────────────────────────────────────── */}
      <footer className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-blue-950 text-slate-300 py-12 sm:py-16 border-t border-white/10">
        {/* Sentuhan Vektor Kontur & Konstelasi Malam Footer */}
        <FooterVectorDecorations />
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start pb-10 border-b border-white/10">

            {/* Kolom 1: Logo & Nama Pemerintah Kecamatan */}
            <div className="md:col-span-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden relative shrink-0">
                  {logoImage ? (
                    <Image src={logoImage} alt="Logo" fill className="object-contain p-1" unoptimized />
                  ) : (
                    <Building2 className="h-5 w-5 text-white/70" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">
                    Kecamatan Gandrungmangu
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Pemerintah Kabupaten Cilacap
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-normal pt-1">
                Portal resmi pelayanan terpadu, administrasi surat mandiri, dan reservasi antrian digital masyarakat Kecamatan Gandrungmangu.
              </p>
            </div>

            {/* Kolom 2: Kontak Kantor Kecamatan */}
            <div className="md:col-span-3 space-y-2.5 text-xs">
              <h4 className="font-black text-white uppercase tracking-wider text-xs">
                Kantor Kecamatan
              </h4>
              <p className="text-slate-400 leading-relaxed">
                {configData?.address || "Jl. Gandrungmangu No. 01, Gandrungmangu, Kabupaten Cilacap, Jawa Tengah 53254"}
              </p>
              <div className="space-y-1 pt-1 text-slate-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{configData?.phone || "0895-0881-1484"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{configData?.email || "gandrungmangu@cilacapkab.go.id"}</span>
                </div>
              </div>
            </div>

            {/* Kolom 3: Jam Pelayanan (Horaires d'ouverture) */}
            <div className="md:col-span-3 space-y-2.5 text-xs">
              <h4 className="font-black text-white uppercase tracking-wider text-xs">
                Jam Pelayanan
              </h4>
              <div className="space-y-1.5 text-slate-400">
                <div>
                  <span className="font-bold text-slate-200">Senin - Kamis:</span>
                  <p>07.30 - 16.00 WIB</p>
                </div>
                <div>
                  <span className="font-bold text-slate-200">Jumat:</span>
                  <p>07.30 - 16.30 WIB</p>
                </div>
                <div>
                  <span className="font-bold text-slate-200">Sabtu - Minggu:</span>
                  <p className="text-rose-400 font-semibold">Tutup (Hari Libur)</p>
                </div>
              </div>
            </div>

            {/* Kolom 4: Sosial Media Resmi */}
            <div className="md:col-span-2 space-y-2.5 text-xs">
              <h4 className="font-black text-white uppercase tracking-wider text-xs">
                Sosial Media
              </h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Ikuti kanal resmi informasi & publikasi Kecamatan:
              </p>
              <div className="flex flex-col gap-2 pt-0.5">
                {/* Instagram */}
                <a
                  href="https://www.instagram.com/mascamat.gandrungmangu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-pink-500/20 text-slate-300 hover:text-pink-300 border border-white/10 hover:border-pink-400/40 font-semibold text-xs transition-all duration-200 group"
                >
                  <span className="w-5 h-5 rounded-lg bg-pink-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </span>
                  <span className="truncate">Instagram</span>
                </a>

                {/* Facebook */}
                <a
                  href="https://www.facebook.com/kecgandrungmangu/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-blue-500/20 text-slate-300 hover:text-blue-300 border border-white/10 hover:border-blue-400/40 font-semibold text-xs transition-all duration-200 group"
                >
                  <span className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </span>
                  <span className="truncate">Facebook</span>
                </a>

                {/* TikTok */}
                <a
                  href="https://www.tiktok.com/@mascamat.gandrungmangu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-slate-400/20 text-slate-300 hover:text-white border border-white/10 hover:border-slate-300/40 font-semibold text-xs transition-all duration-200 group"
                >
                  <span className="w-5 h-5 rounded-lg bg-slate-800 border border-white/20 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                    </svg>
                  </span>
                  <span className="truncate">TikTok</span>
                </a>
              </div>
            </div>

          </div>

          {/* Baris Hak Cipta & Tautan Cepat */}
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
            <p className="text-center sm:text-left">
              &copy; {new Date().getFullYear()} Pemerintah Kecamatan Gandrungmangu, Kabupaten Cilacap.
            </p>
            <div className="flex gap-4 text-[11px] font-medium">
              <Link href="/Antrian/online/" className="hover:text-slate-200 transition-colors">
                Antrian Online
              </Link>
              <span className="text-slate-700">&bull;</span>
              <a href="https://solid.gandrungmangu.id/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-200 transition-colors">
                Data Kewilayahan
              </a>
              <span className="text-slate-700">&bull;</span>
              <Link href="/login/" className="hover:text-slate-200 transition-colors">
                Akses Admin
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── 8. DIALOG MODAL RINCIAN ACARA LENGKAP ───────────────────────────────────── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-8 bg-white border-none shadow-2xl">
          {selectedDetailEvent && (
            <div className="space-y-5">
              <DialogHeader className="text-left space-y-2 border-b pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getEventType(selectedDetailEvent.description) === 'Internal'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : getEventType(selectedDetailEvent.description) === 'Eksternal'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                  >
                    Agenda {getEventType(selectedDetailEvent.description).toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>{formatTimeRange(selectedDetailEvent.start, selectedDetailEvent.end)}</span>
                  </div>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  {selectedDetailEvent.summary}
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>{activeDay.fullDate}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs sm:text-sm text-slate-700">
                {/* Lokasi */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-600" /> Lokasi Kegiatan
                  </span>
                  <p className="font-bold text-slate-800">
                    {selectedDetailEvent.location || 'Lokasi belum diatur'}
                  </p>
                </div>

                {/* Disposisi */}
                {getEventDisposition(selectedDetailEvent.description) && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" /> Disposisi Petugas / Pejabat
                    </span>
                    <p className="font-bold text-emerald-950">
                      {getEventDisposition(selectedDetailEvent.description)}
                    </p>
                  </div>
                )}

                {/* Deskripsi */}
                {getCleanDescription(selectedDetailEvent.description) && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Keterangan Acara
                    </span>
                    <p className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 leading-relaxed whitespace-pre-line">
                      {getCleanDescription(selectedDetailEvent.description)}
                    </p>
                  </div>
                )}

                {/* Notulensi */}
                {getNotulensi(selectedDetailEvent.description) && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5 text-amber-600" /> Catatan / Notulensi Rapat
                    </span>
                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                      {getNotulensi(selectedDetailEvent.description)}
                    </div>
                  </div>
                )}

                {/* Lampiran File */}
                {selectedDetailEvent.attachments && selectedDetailEvent.attachments.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Berkas Lampiran Undangan
                    </span>
                    <div className="flex flex-col gap-2">
                      {selectedDetailEvent.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold flex items-center justify-between transition-colors"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Paperclip className="w-4 h-4 text-rose-600 shrink-0" />
                            <span className="truncate">{att.title || 'Undangan.pdf'}</span>
                          </span>
                          <span className="text-[10px] uppercase font-black tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-md">
                            Unduh
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-3 border-t flex flex-col sm:flex-row gap-2">
                {selectedDetailEvent.htmlLink && (
                  <a
                    href={selectedDetailEvent.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Buka di Google Calendar</span>
                  </a>
                )}
                <Link
                  href="/agenda/"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  <span>Buka Modul Agenda</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIALOG MODAL BACA BERITA / INFORMASI TERKINI ────────────────── */}
      <Dialog open={isNewsModalOpen} onOpenChange={setIsNewsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-0 shadow-2xl">
          {selectedNewsDetail && (
            <div className="bg-white">
              {/* Cover Image */}
              {selectedNewsDetail.imageUrl && (
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                  <Image
                    src={selectedNewsDetail.imageUrl}
                    alt={selectedNewsDetail.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-center justify-between gap-2 text-white">
                    <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold tracking-wide shadow-md">
                      {formatNewsDate(selectedNewsDetail.date)}
                    </span>
                    {selectedNewsDetail.category && (
                      <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-200 text-xs font-bold uppercase tracking-wider border border-white/20">
                        {selectedNewsDetail.category}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="p-6 sm:p-8 space-y-5">
                {!selectedNewsDetail.imageUrl && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold tracking-wide">
                      {formatNewsDate(selectedNewsDetail.date)}
                    </span>
                    {selectedNewsDetail.category && (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
                        {selectedNewsDetail.category}
                      </span>
                    )}
                  </div>
                )}

                <DialogHeader className="text-left space-y-2">
                  <DialogTitle className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                    {selectedNewsDetail.title}
                  </DialogTitle>
                  {selectedNewsDetail.author && (
                    <div className="text-xs text-slate-400 font-medium">
                      Redaksi / Penulis: <span className="text-slate-700 font-semibold">{selectedNewsDetail.author}</span>
                    </div>
                  )}
                </DialogHeader>

                {selectedNewsDetail.excerpt && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 font-medium text-sm sm:text-base italic leading-relaxed">
                    &ldquo;{selectedNewsDetail.excerpt}&rdquo;
                  </div>
                )}

                <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line space-y-4 pt-1">
                  {selectedNewsDetail.content || selectedNewsDetail.excerpt}
                </div>

                <DialogFooter className="pt-6 border-t border-slate-100 flex items-center justify-between sm:justify-between">
                  <div className="text-xs text-slate-400">
                    Kecamatan Gandrungmangu
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNewsModalOpen(false)}
                    className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Tutup
                  </button>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIALOG MODAL SHOWCASE 14 DESA ───────────────────────────────── */}
      <Dialog open={isDesaModalOpen} onOpenChange={setIsDesaModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-0 shadow-2xl">
          {selectedDesaShowcase && (
            <div className="bg-white">
              {/* Cover Banner */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                {selectedDesaShowcase.imageUrl ? (
                  <Image
                    src={selectedDesaShowcase.imageUrl}
                    alt={selectedDesaShowcase.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 text-white/50 p-6 text-center">
                    <Landmark className="w-16 h-16 text-amber-400 opacity-60 mb-2" />
                    <span className="text-xs uppercase tracking-widest text-amber-200 font-bold">
                      Kecamatan Gandrungmangu
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 text-white flex items-end justify-between gap-4">
                  <DialogHeader className="text-left space-y-1">
                    <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md inline-block w-fit">
                      Kecamatan Gandrungmangu
                    </span>
                    <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-white mt-1 drop-shadow-md">
                      {selectedDesaShowcase.name}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Profil dan rincian informasi {selectedDesaShowcase.name}
                    </DialogDescription>
                  </DialogHeader>
                  {user && (
                    <Link
                      href="/pelayanan/desa"
                      className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shrink-0"
                    >
                      <PenSquare className="w-3 h-3 text-amber-300" />
                      <span>Edit Data</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Rincian Konten */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Meta Kades & Alamat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs">
                  <div>
                    <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                      Kepala Desa
                    </span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">
                      {selectedDesaShowcase.kepalaDesa || 'Belum diisi'}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                      Kontak Balai Desa
                    </span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">
                      {selectedDesaShowcase.kontak || 'Belum diisi'}
                    </p>
                  </div>
                  {selectedDesaShowcase.alamat && (
                    <div className="sm:col-span-2 pt-2 border-t border-amber-200/60">
                      <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                        Alamat Kantor Desa
                      </span>
                      <p className="font-medium text-slate-700 text-xs mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{selectedDesaShowcase.alamat}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Deskripsi Lengkap */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Rincian Informasi & Profil Desa
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {selectedDesaShowcase.deskripsi || 'Belum ada rincian deskripsi untuk desa ini.'}
                  </p>
                </div>

                {/* Tombol Aksi Tautan */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedDesaShowcase.websiteUrl ? (
                    <a
                      href={selectedDesaShowcase.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors shadow-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-indigo-600" />
                        <span>Website Resmi Desa</span>
                      </span>
                      <ExternalLink className="w-4 h-4 text-indigo-500" />
                    </a>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-400 text-xs font-bold flex items-center gap-2">
                      <Globe className="w-4 h-4 opacity-50" />
                      <span>Website Belum Tersedia</span>
                    </div>
                  )}

                  {selectedDesaShowcase.pelayananUrl ? (
                    <a
                      href={selectedDesaShowcase.pelayananUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors shadow-sm"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-rose-600" />
                        <span>Layanan Online Desa</span>
                      </span>
                      <ExternalLink className="w-4 h-4 text-rose-500" />
                    </a>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-400 text-xs font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 opacity-50" />
                      <span>Layanan Belum Tersedia</span>
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsDesaModalOpen(false)}
                    className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors ml-auto"
                  >
                    Tutup
                  </button>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
