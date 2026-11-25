'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  FileCheck,
  Paperclip,
  Globe,
  Video,
  ExternalLink,
  Landmark,
  FileText,
} from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

import { useFirebase, useUser } from '@/firebase';
import { callAppsScript } from '@/app/agenda/actions';
import { GOOGLE_CONFIG } from '@/lib/google-config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { NewsPhotoGallery } from '@/components/informasi/NewsPhotoGallery';

import { BackgroundPattern } from '@/components/landing/BackgroundPattern';
import { FullpageScrollController } from '@/components/landing/FullpageScrollController';
import { Header, LandingDesaItem } from '@/components/landing/Header';
import { HeroSection } from '@/components/landing/HeroSection';
import { SambutanSection } from '@/components/landing/SambutanSection';
import { ServicesSection } from '@/components/landing/ServicesSection';
import { NewsSection, LandingInformasiItem } from '@/components/landing/NewsSection';
import {
  AgendaSection,
  LandingAgendaDayInfo,
  LandingCalendarEvent,
} from '@/components/landing/AgendaSection';
import { WilayahSection, LandingWilayahData } from '@/components/landing/WilayahSection';
import { PengaduanSection } from '@/components/landing/PengaduanSection';
import { Footer } from '@/components/landing/Footer';

const DEFAULT_WILAYAH_CONFIG: LandingWilayahData = {
  title: 'Wilayah Gandrungmangu',
  subtitle: 'Geospasial & Kewilayahan',
  description:
    'Kecamatan Gandrungmangu membentang strategis di bagian barat Kabupaten Cilacap, menaungi 14 Desa dengan potensi agraris yang subur, sentra perekonomian rakyat, dan kerukunan warga yang kokoh.',
  secondaryDescription:
    'Melalui integrasi data interaktif SOLID (Sistem Olah Laporan Informasi & Data Desa), Anda dapat mengeksplorasi informasi desa, potensi desa, jaringan jalan, serta data geospasial kewilayahan secara transparan dan mudah diakses.',
  mapImageUrl: '',
  bgImageUrl:
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop',
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

export default function HomePage() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const [configData, setConfigData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache');
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [wilayahData, setWilayahData] = useState<LandingWilayahData>(DEFAULT_WILAYAH_CONFIG);
  const [selectedDayTab, setSelectedDayTab] = useState<number>(0);
  const [selectedDetailEvent, setSelectedDetailEvent] = useState<LandingCalendarEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRefreshingAgenda, setIsRefreshingAgenda] = useState(false);

  const [newsList, setNewsList] = useState<LandingInformasiItem[]>([]);
  const [selectedNewsDetail, setSelectedNewsDetail] = useState<LandingInformasiItem | null>(null);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

  const [desaList, setDesaList] = useState<LandingDesaItem[]>([]);
  const [selectedDesaShowcase, setSelectedDesaShowcase] = useState<LandingDesaItem | null>(null);
  const [isDesaModalOpen, setIsDesaModalOpen] = useState(false);

  const [agendaDays, setAgendaDays] = useState<LandingAgendaDayInfo[]>(() => {
    const base = new Date();
    return [0, 1, 2, 3].map((offset) => {
      const d = addDays(base, offset);
      return {
        offset,
        label:
          offset === 0
            ? 'Hari Ini (Hari H)'
            : offset === 1
              ? 'Besok (H+1)'
              : offset === 2
                ? 'Lusa (H+2)'
                : 'H+3',
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

  // Fetch initial data via API routes
  useEffect(() => {
    const ts = Date.now();
    fetch(`/api/village-profile/?t=${ts}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setConfigData((prev: any) => ({ ...prev, ...data }));
          try {
            localStorage.setItem('village_profile_cache', JSON.stringify(data));
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});

    fetch(`/api/informasi?t=${ts}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.items)) {
          setNewsList(data.items);
        }
      })
      .catch(() => {});

    fetch(`/api/desa?t=${ts}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.items)) {
          setDesaList(data.items);
        }
      })
      .catch(() => {});

    fetch(`/api/wilayah?t=${ts}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((resData) => {
        if (resData && resData.success && resData.data) {
          setWilayahData((prev) => ({ ...prev, ...resData.data }));
        }
      })
      .catch(() => {});
  }, []);

  // Realtime Firestore listeners
  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(
      doc(firestore, 'settings', 'village'),
      (snap) => {
        if (snap.exists()) {
          setConfigData((prev: any) => ({ ...prev, ...snap.data() }));
        }
      },
      () => {}
    );
    return () => unsub();
  }, [firestore]);

  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(
      doc(firestore, 'settings', 'wilayah'),
      (snap) => {
        if (snap.exists()) {
          setWilayahData((prev) => ({ ...prev, ...(snap.data() as Partial<LandingWilayahData>) }));
        }
      },
      () => {}
    );
    return () => unsub();
  }, [firestore]);

  useEffect(() => {
    if (!firestore) return;
    try {
      const q = query(collection(firestore, 'informasi'), where('status', '==', 'published'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const items: LandingInformasiItem[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data() } as LandingInformasiItem);
          });
          items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setNewsList(items);
        },
        () => {}
      );
      return () => unsub();
    } catch {
      // ignore
    }
  }, [firestore]);

  // Fetch Google Calendar events for Hari H..H+3
  const fetchAgendaForDays = useCallback(async () => {
    setIsRefreshingAgenda(true);
    const base = new Date();
    const calendarId = GOOGLE_CONFIG.calendarId || 'primary';

    const dayConfigs = [0, 1, 2, 3].map((offset) => {
      const d = addDays(base, offset);
      return {
        offset,
        label:
          offset === 0
            ? 'Hari Ini (Hari H)'
            : offset === 1
              ? 'Besok (H+1)'
              : offset === 2
                ? 'Lusa (H+2)'
                : 'H+3',
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
              items:
                res && res.success && Array.isArray(res.items)
                  ? (res.items as LandingCalendarEvent[])
                  : [],
              loading: false,
            };
          } catch {
            return { ...cfg, items: [], loading: false };
          }
        })
      );
      setAgendaDays(results);
    } finally {
      setIsRefreshingAgenda(false);
    }
  }, []);

  useEffect(() => {
    fetchAgendaForDays();
  }, [fetchAgendaForDays]);

  const getFormattedHeroImage = (data: any) => {
    const raw =
      data?.heroPhotoUrl || data?.heroPhotoBase64 || data?.heroImageUrl || data?.heroImageBase64;
    if (!raw || typeof raw !== 'string') return '/hero-Kecamatan.jpg';
    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('data:') ||
      raw.startsWith('/')
    ) {
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

  const formatTimeRange = (start?: { dateTime?: string }, end?: { dateTime?: string }) => {
    if (!start?.dateTime) return 'Waktu Belum Diatur';
    try {
      const s = parseISO(start.dateTime);
      const sStr = format(s, 'HH:mm');
      if (end?.dateTime) {
        const e = parseISO(end.dateTime);
        return `${sStr} - ${format(e, 'HH:mm')} WIB`;
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
        return format(parseISO(dateStr), 'dd MMM yyyy', { locale: localeID });
      }
      return format(new Date(dateStr), 'dd MMM yyyy', { locale: localeID });
    } catch {
      return dateStr;
    }
  };

  const activeDay = agendaDays[selectedDayTab] || agendaDays[0];

  return (
    <div className="relative flex min-h-screen flex-col bg-white dark:bg-[#05110E] text-slate-900 dark:text-slate-100 overflow-x-clip transition-colors duration-300">
      <BackgroundPattern />
      <FullpageScrollController />

      <Header
        logoImage={logoImage}
        desaList={desaList}
        isAuthenticated={Boolean(user)}
      />

      <main className="relative z-10 space-y-1 sm:space-y-2">
        {/* 1. Hero Cinematic Multi-Slide */}
        <HeroSection heroImage={heroImage} wilayahBgImage={wilayahData.bgImageUrl} />

        {/* 2. Visi & Semangat Pelayanan Semringah */}
        <SambutanSection />

        {/* 3. Layanan Digital Terpadu (Ocean Deck) */}
        <ServicesSection />

        {/* 4. Informasi & Warta Terkini */}
        <NewsSection
          newsList={newsList}
          formatNewsDate={formatNewsDate}
          onSelectNews={(item) => {
            setSelectedNewsDetail(item);
            setIsNewsModalOpen(true);
          }}
        />

        {/* 5. Agenda Kegiatan Kecamatan (Hari H..H+3) */}
        <AgendaSection
          agendaDays={agendaDays}
          selectedDayTab={selectedDayTab}
          onSelectDayTab={setSelectedDayTab}
          isRefreshingAgenda={isRefreshingAgenda}
          onRefreshAgenda={fetchAgendaForDays}
          onSelectEvent={(ev) => {
            setSelectedDetailEvent(ev);
            setIsDetailOpen(true);
          }}
          formatTimeRange={formatTimeRange}
          getEventType={getEventType}
          getEventDisposition={getEventDisposition}
        />

        {/* 6. Wilayah Gandrungmangu & Direktori 14 Desa (Ocean Deck) */}
        <WilayahSection
          wilayahData={wilayahData}
          desaList={desaList}
          onSelectDesa={(desa) => {
            setSelectedDesaShowcase(desa);
            setIsDesaModalOpen(true);
          }}
        />

        {/* 7. Pengaduan & Permintaan Informasi Masyarakat */}
        <PengaduanSection />
      </main>

      {/* 8. Closing Presentation Footer */}
      <Footer
        logoImage={logoImage}
        configData={configData}
        heroImage={heroImage}
        wilayahBgImage={wilayahData.bgImageUrl}
      />

      {/* ── MODAL 1: RINCIAN ACARA AGENDA ───────────────────────────────────── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl rounded-[26px] p-6 sm:p-8 bg-white dark:bg-[#0A1F1A] border border-slate-200/80 dark:border-white/10 shadow-2xl">
          {selectedDetailEvent && (
            <div className="space-y-5">
              <DialogHeader className="text-left space-y-2 border-b border-slate-200/80 dark:border-white/10 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#065F46] text-white">
                    Agenda {getEventType(selectedDetailEvent.description)}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[#041E17] dark:text-[#E5C882] bg-[#F3EFE6] dark:bg-[#064E3B]/60 px-3 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 text-[#065F46] dark:text-[#E5C882]" />
                    <span>{formatTimeRange(selectedDetailEvent.start, selectedDetailEvent.end)}</span>
                  </div>
                </div>
                <DialogTitle className="font-hero text-xl sm:text-2xl font-bold text-[#041E17] dark:text-white leading-snug">
                  {selectedDetailEvent.summary}
                </DialogTitle>
                <DialogDescription className="font-hero text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#065F46] dark:text-[#E5C882]" />
                  <span>{activeDay.fullDate}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 space-y-1">
                  <span className="font-mono text-[10px] font-bold uppercase text-[#065F46] dark:text-[#E5C882] tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Lokasi Kegiatan
                  </span>
                  <p className="font-hero font-bold text-[#041E17] dark:text-white">
                    {selectedDetailEvent.location || 'Lokasi belum diatur'}
                  </p>
                </div>

                {getEventDisposition(selectedDetailEvent.description) && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
                    <span className="font-mono text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 tracking-wider flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Disposisi Petugas / Pejabat
                    </span>
                    <p className="font-hero font-bold text-emerald-950 dark:text-emerald-100">
                      {getEventDisposition(selectedDetailEvent.description)}
                    </p>
                  </div>
                )}

                {getCleanDescription(selectedDetailEvent.description) && (
                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Keterangan Acara
                    </span>
                    <p className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 leading-relaxed whitespace-pre-line">
                      {getCleanDescription(selectedDetailEvent.description)}
                    </p>
                  </div>
                )}

                {getNotulensi(selectedDetailEvent.description) && (
                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] font-bold uppercase text-[#065F46] dark:text-[#E5C882] tracking-wider flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5" /> Catatan / Notulensi Rapat
                    </span>
                    <div className="p-3.5 rounded-2xl bg-[#F3EFE6] dark:bg-[#064E3B]/40 border border-[#E5C882]/70 dark:border-cyan-800/40 leading-relaxed whitespace-pre-line font-medium">
                      {getNotulensi(selectedDetailEvent.description)}
                    </div>
                  </div>
                )}

                {selectedDetailEvent.attachments && selectedDetailEvent.attachments.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Berkas Lampiran Undangan
                    </span>
                    <div className="flex flex-col gap-2">
                      {selectedDetailEvent.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-xl bg-[#F3EFE6] hover:bg-[#065F46] hover:text-white dark:bg-white/5 border border-[#E5C882]/70 dark:border-white/10 text-[#041E17] dark:text-[#E5C882] font-bold flex items-center justify-between transition-colors"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Paperclip className="w-4 h-4 shrink-0" />
                            <span className="truncate">{att.title || 'Undangan.pdf'}</span>
                          </span>
                          <span className="font-mono text-[10px] uppercase font-bold tracking-wider bg-[#041E17] text-white px-2.5 py-0.5 rounded-full">
                            Unduh
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2">
                {selectedDetailEvent.htmlLink ? (
                  <a
                    href={selectedDetailEvent.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#F3EFE6] hover:bg-[#065F46] text-[#065F46] hover:text-white dark:bg-white/10 dark:text-[#E5C882] font-hero font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Google Calendar</span>
                  </a>
                ) : (
                  <div />
                )}
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="px-6 py-2 rounded-full bg-[#041E17] hover:bg-[#065F46] text-white font-hero font-bold text-xs uppercase tracking-wider transition-colors ml-auto cursor-pointer"
                >
                  Tutup
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: BACA BERITA / INFORMASI TERKINI ────────────────────────── */}
      <Dialog open={isNewsModalOpen} onOpenChange={setIsNewsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-[26px] border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0A1F1A] shadow-2xl">
          {selectedNewsDetail && (
            <div>
              {(selectedNewsDetail.imageUrl ||
                (selectedNewsDetail.images && selectedNewsDetail.images.length > 0) ||
                selectedNewsDetail.youtubeVideoId) ? (
                <div className="p-4 sm:p-6 pb-0">
                  <NewsPhotoGallery
                    images={selectedNewsDetail.images}
                    imageUrl={selectedNewsDetail.imageUrl}
                    youtubeVideoId={selectedNewsDetail.youtubeVideoId}
                    title={selectedNewsDetail.title}
                    mode="detail"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#065F46] text-white font-mono text-xs font-bold">
                      {formatNewsDate(selectedNewsDetail.date)}
                    </span>
                    {selectedNewsDetail.category && (
                      <span className="px-3 py-1 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#E5C882] font-hero text-xs font-bold uppercase tracking-wider">
                        {selectedNewsDetail.category}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-6 sm:px-8 pt-6 flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#065F46] text-white font-mono text-xs font-bold">
                    {formatNewsDate(selectedNewsDetail.date)}
                  </span>
                  {selectedNewsDetail.category && (
                    <span className="px-3 py-1 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#E5C882] font-hero text-xs font-bold uppercase tracking-wider">
                      {selectedNewsDetail.category}
                    </span>
                  )}
                </div>
              )}

              <div className="p-6 sm:p-8 space-y-5">
                <DialogHeader className="text-left space-y-2">
                  <DialogTitle className="font-hero text-2xl sm:text-3xl font-bold text-[#041E17] dark:text-white leading-tight">
                    {selectedNewsDetail.title}
                  </DialogTitle>
                  {selectedNewsDetail.author && (
                    <div className="font-hero text-xs text-slate-400 font-medium">
                      Redaksi / Penulis:{' '}
                      <span className="text-[#041E17] dark:text-slate-200 font-semibold">
                        {selectedNewsDetail.author}
                      </span>
                    </div>
                  )}
                </DialogHeader>

                {selectedNewsDetail.excerpt && (
                  <div className="p-4 rounded-2xl bg-[#F3EFE6] dark:bg-[#064E3B]/40 border border-[#E5C882]/70 dark:border-cyan-800/40 text-[#041E17] dark:text-[#F5E9CC] font-medium text-sm sm:text-base italic leading-relaxed">
                    &ldquo;{selectedNewsDetail.excerpt}&rdquo;
                  </div>
                )}

                <div className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line pt-1">
                  {selectedNewsDetail.content || selectedNewsDetail.excerpt}
                </div>

                {selectedNewsDetail.youtubeVideoId && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-hero font-bold uppercase tracking-wider text-[#065F46] dark:text-[#E5C882]">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span>Video Dokumentasi Terkait</span>
                      </div>
                      <a
                        href={`https://www.youtube.com/watch?v=${selectedNewsDetail.youtubeVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold hover:underline capitalize"
                      >
                        <span>Tonton di YouTube</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg border border-slate-200 dark:border-white/10">
                      <iframe
                        src={`https://www.youtube.com/embed/${selectedNewsDetail.youtubeVideoId}`}
                        title={selectedNewsDetail.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                )}

                <DialogFooter className="pt-5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between sm:justify-between">
                  <div className="font-mono text-xs text-slate-400">Kecamatan Gandrungmangu</div>
                  <button
                    type="button"
                    onClick={() => setIsNewsModalOpen(false)}
                    className="px-5 py-2.5 rounded-full bg-[#041E17] hover:bg-[#065F46] text-white font-hero font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: SHOWCASE 14 DESA ───────────────────────────────────────── */}
      <Dialog open={isDesaModalOpen} onOpenChange={setIsDesaModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-[26px] border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0A1F1A] shadow-2xl">
          {selectedDesaShowcase && (
            <div>
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#041E17]">
                {selectedDesaShowcase.imageUrl ? (
                  <Image
                    src={selectedDesaShowcase.imageUrl}
                    alt={selectedDesaShowcase.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#041E17] via-[#065F46] to-[#041E17] text-white/60 p-6 text-center">
                    <Landmark className="w-16 h-16 text-[#C8A253] opacity-70 mb-2" />
                    <span className="font-mono text-xs uppercase tracking-widest text-[#E5C882] font-bold">
                      Kecamatan Gandrungmangu
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#041E17]/90 via-[#041E17]/30 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 text-white">
                  <DialogHeader className="text-left space-y-1">
                    <span className="px-3 py-1 rounded-full bg-[#C8A253] text-[#041E17] font-mono text-[10px] font-bold uppercase tracking-wider inline-block w-fit">
                      Kecamatan Gandrungmangu
                    </span>
                    <DialogTitle className="font-hero text-2xl sm:text-3xl font-extrabold text-white mt-1">
                      {selectedDesaShowcase.name}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Profil dan rincian informasi {selectedDesaShowcase.name}
                    </DialogDescription>
                  </DialogHeader>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-[#FAF8F5] dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                      Kepala Desa
                    </span>
                    <p className="font-hero font-bold text-[#041E17] dark:text-white text-sm mt-0.5">
                      {selectedDesaShowcase.kepalaDesa || 'Belum diisi'}
                    </p>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                      Kontak Balai Desa
                    </span>
                    <p className="font-hero font-bold text-[#041E17] dark:text-white text-sm mt-0.5">
                      {selectedDesaShowcase.kontak || 'Belum diisi'}
                    </p>
                  </div>
                  {selectedDesaShowcase.alamat && (
                    <div className="sm:col-span-2 pt-2 border-t border-slate-200/70 dark:border-white/10">
                      <span className="font-mono font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                        Alamat Kantor Desa
                      </span>
                      <p className="font-hero font-medium text-slate-700 dark:text-slate-300 text-xs mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#065F46] dark:text-[#E5C882] shrink-0" />
                        <span>{selectedDesaShowcase.alamat}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#065F46] dark:text-[#E5C882]">
                    Rincian Informasi &amp; Profil Desa
                  </h4>
                  <p className="font-hero text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {selectedDesaShowcase.deskripsi || 'Belum ada rincian deskripsi untuk desa ini.'}
                  </p>
                </div>

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedDesaShowcase.websiteUrl ? (
                    <a
                      href={selectedDesaShowcase.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-2xl bg-[#F3EFE6] hover:bg-[#065F46] text-[#041E17] hover:text-white dark:bg-white/5 dark:text-[#E5C882] border border-[#E5C882]/70 dark:border-white/10 font-hero font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span>Website Resmi Desa</span>
                      </span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 text-xs font-bold flex items-center gap-2">
                      <Globe className="w-4 h-4 opacity-50" />
                      <span>Website Belum Tersedia</span>
                    </div>
                  )}

                  {selectedDesaShowcase.pelayananUrl ? (
                    <a
                      href={selectedDesaShowcase.pelayananUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-2xl bg-[#041E17] hover:bg-[#065F46] text-white font-hero font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#C8A253]" />
                        <span>Layanan Online Desa</span>
                      </span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 text-xs font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 opacity-50" />
                      <span>Layanan Belum Tersedia</span>
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-4 border-t border-slate-200/80 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsDesaModalOpen(false)}
                    className="px-5 py-2.5 rounded-full bg-[#041E17] hover:bg-[#065F46] text-white font-hero font-bold text-xs uppercase tracking-wider transition-colors ml-auto cursor-pointer"
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
