'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  Loader2,
  CheckCircle,
  Search,
  Paperclip,
  ExternalLink,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

import { callAppsScript } from '@/app/agenda/actions';
import { GOOGLE_CONFIG } from '@/lib/google-config';
import { BackgroundPattern } from '@/components/landing/BackgroundPattern';
import { NightModeSwitch } from '@/components/ui/NightModeSwitch';
import {
  LandingAgendaDayInfo,
  LandingCalendarEvent,
} from '@/components/landing/AgendaSection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function AgendaKecamatanPage() {
  const [selectedDayTab, setSelectedDayTab] = useState<number>(0);
  const [filterType, setFilterType] = useState<'Semua' | 'Internal' | 'Eksternal'>('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LandingCalendarEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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

  const fetchAgendaForDays = useCallback(async () => {
    setIsRefreshing(true);
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
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAgendaForDays();
  }, [fetchAgendaForDays]);

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

  const activeDay = agendaDays[selectedDayTab] || agendaDays[0];

  const filteredItems = activeDay.items.filter((ev) => {
    const type = getEventType(ev.description);
    const matchType = filterType === 'Semua' || type === filterType;
    const q = searchTerm.trim().toLowerCase();
    const matchSearch =
      !q ||
      (ev.summary || '').toLowerCase().includes(q) ||
      (ev.location || '').toLowerCase().includes(q) ||
      (ev.description || '').toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const totalAllDays = agendaDays.reduce((sum, d) => sum + d.items.length, 0);

  return (
    <div className="relative min-h-screen bg-[#FAF8F5] dark:bg-[#05110E] text-[#041E17] dark:text-[#FAF8F5] flex flex-col transition-colors duration-300 overflow-x-clip">
      <BackgroundPattern />

      {/* Floating Capsule Header */}
      <header className="sticky top-0 z-40 px-3 sm:px-6 pt-2.5 pb-1.5">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3 px-4 h-13 sm:h-14 rounded-full bg-white/95 dark:bg-[#0A1F1A]/95 backdrop-blur-xl border border-[#E6E0D3] dark:border-[#C8A253]/20 shadow-[0_8px_24px_rgba(4,30,23,0.08)]">
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
                Agenda Kegiatan Kecamatan
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#065F46] dark:text-[#E5C882] mt-0.5">
                Rencana Kegiatan (Hari H s.d. H+3)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchAgendaForDays}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F3EFE6] hover:bg-[#C8A253] text-[#041E17] dark:bg-white/10 dark:text-[#E5C882] dark:hover:bg-[#C8A253] dark:hover:text-[#041E17] border border-[#C8A253]/30 font-hero text-[11px] font-bold transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
            <NightModeSwitch size="sm" />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 flex-1 space-y-5">
        {/* Sovereign Hero Banner */}
        <section className="relative overflow-hidden rounded-[24px] p-5 sm:p-7 bg-gradient-to-br from-[#065F46] via-[#064E3B] to-[#041E17] text-white border border-[#C8A253]/30 shadow-[0_18px_45px_rgba(4,30,23,0.2)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-3 bottom-0 w-32 h-36 opacity-[0.18] bg-no-repeat bg-contain bg-right-bottom"
            style={{ backgroundImage: "url('/images/tugu-gandrungmangu-silhouette.webp')" }}
          />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/12 border border-[#E5C882]/35 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#E5C882]">
                <Calendar className="w-3.5 h-3.5" />
                <span>Jadwal Resmi Google Calendar</span>
              </div>
              <h1 className="font-hero font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight">
                Agenda Kegiatan <span className="text-[#E5C882]">Kecamatan</span>
              </h1>
              <p className="font-hero text-xs sm:text-sm text-[#F5E9CC]/90 leading-relaxed">
                Rincian jadwal kegiatan kedinasan, rapat koordinasi, kehadiran pimpinan, dan disposisi pejabat Kecamatan Gandrungmangu secara transparan.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#041E17]/60 border border-[#C8A253]/30 shrink-0 self-start lg:self-auto">
              <Clock className="w-4 h-4 text-[#E5C882]" />
              <span className="font-mono text-xs font-bold text-[#F5E9CC]">
                {totalAllDays} Kegiatan (4 Hari)
              </span>
            </div>
          </div>
        </section>

        {/* 4 Day Tabs */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {agendaDays.map((day, idx) => {
            const isActive = selectedDayTab === idx;
            return (
              <button
                key={day.offset}
                type="button"
                onClick={() => setSelectedDayTab(idx)}
                className={`relative p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-br from-[#041E17] to-[#065F46] border-[#C8A253]/50 text-white shadow-lg scale-[1.01]'
                    : 'bg-white/95 dark:bg-[#0A1F1A]/95 hover:border-[#065F46]/60 border-[#E6E0D3] dark:border-white/10 text-[#041E17] dark:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span
                    className={`font-mono text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#C8A253] text-[#041E17]'
                        : 'bg-[#F3EFE6] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#E5C882]'
                    }`}
                  >
                    {day.shortLabel}
                  </span>
                  <span className={`font-hero text-[10.5px] font-semibold ${isActive ? 'text-[#E5C882]' : 'text-slate-500 dark:text-slate-400'}`}>
                    {day.dayName}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className={`font-hero text-lg sm:text-xl font-extrabold tracking-tight ${isActive ? 'text-white' : 'text-[#041E17] dark:text-white'}`}>
                    {day.shortDate}
                  </span>
                  <span className={`font-mono text-[10.5px] font-semibold ${isActive ? 'text-[#F5E9CC]' : 'text-slate-500 dark:text-slate-400'}`}>
                    {day.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `${day.items.length} Acara`}
                  </span>
                </div>
              </button>
            );
          })}
        </section>

        {/* Filter & Search Bar */}
        <section className="rounded-2xl bg-white/95 dark:bg-[#0A1F1A]/95 border border-[#E6E0D3] dark:border-[#C8A253]/20 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#065F46] dark:bg-[#C8A253]" />
            <h2 className="font-hero text-sm sm:text-base font-extrabold text-[#041E17] dark:text-white">
              {activeDay.fullDate}
            </h2>
            <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B] text-[#065F46] dark:text-[#E5C882]">
              {filteredItems.length} Acara
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#065F46] dark:text-[#E5C882] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari acara, lokasi, disposisi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 rounded-full bg-[#FAF8F5] dark:bg-[#05110E] border-[#E6E0D3] dark:border-white/15 text-xs"
              />
            </div>

            {(['Semua', 'Internal', 'Eksternal'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-full font-hero text-[11px] font-bold cursor-pointer transition-all ${
                  filterType === t
                    ? 'bg-[#065F46] text-white'
                    : 'bg-[#F3EFE6] dark:bg-white/10 text-[#041E17] dark:text-slate-200 hover:bg-[#C8A253]/30'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* Grid Rincian Agenda */}
        {activeDay.loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white dark:bg-[#0A1F1A] rounded-2xl p-5 border border-[#E6E0D3] dark:border-white/10 animate-pulse space-y-3"
              >
                <div className="h-4 bg-[#F3EFE6] dark:bg-white/10 rounded-full w-1/3" />
                <div className="h-5 bg-[#F3EFE6] dark:bg-white/10 rounded-xl w-3/4" />
                <div className="h-4 bg-[#F3EFE6] dark:bg-white/10 rounded-lg w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((event) => {
              const timeStr = formatTimeRange(event.start, event.end);
              const type = getEventType(event.description);
              const disp = getEventDisposition(event.description);
              const isInternal = type === 'Internal';
              const isExternal = type === 'Eksternal';

              return (
                <div
                  key={event.id}
                  onClick={() => {
                    setSelectedEvent(event);
                    setIsDetailOpen(true);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedEvent(event);
                      setIsDetailOpen(true);
                    }
                  }}
                  className="card-Kecamatan p-5 flex flex-col justify-between gap-3 group cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E6E0D3]/70 dark:border-white/10">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#041E17] dark:text-[#E5C882] bg-[#F3EFE6] dark:bg-[#064E3B]/60 px-2.5 py-1 rounded-full">
                        <Clock className="w-3 h-3 text-[#065F46] dark:text-[#E5C882]" />
                        <span>{timeStr}</span>
                      </div>
                      <span
                        className={`font-mono text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isInternal
                            ? 'bg-[#041E17] text-white dark:bg-[#065F46]'
                            : isExternal
                              ? 'bg-[#C8A253]/25 text-[#8A6520] dark:text-[#E5C882]'
                              : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {type}
                      </span>
                    </div>

                    {disp && (
                      <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 text-[11px] font-medium leading-tight">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-mono font-bold text-[9px] uppercase tracking-wide block text-emerald-800 dark:text-emerald-300">
                            Disposisi:
                          </span>
                          <span className="line-clamp-2">{disp}</span>
                        </div>
                      </div>
                    )}

                    <h3 className="font-hero text-sm sm:text-[15px] font-extrabold text-[#041E17] dark:text-white group-hover:text-[#065F46] dark:group-hover:text-[#E5C882] transition-colors leading-snug">
                      {event.summary}
                    </h3>

                    <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#065F46] dark:text-[#E5C882] shrink-0 mt-0.5" />
                      <span>{event.location || 'Lokasi belum diatur'}</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[#E6E0D3]/60 dark:border-white/10 flex items-center justify-between text-[11px] font-hero font-bold text-[#065F46] dark:text-[#E5C882]">
                    <span className="font-mono text-[10px] text-slate-400">
                      {event.attachments?.length ? `${event.attachments.length} Lampiran` : 'Klik untuk detail'}
                    </span>
                    <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Rincian Acara <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 rounded-3xl bg-white dark:bg-[#0A1F1A] border-2 border-dashed border-[#C8A253]/40 text-center space-y-3 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#E5C882] flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-hero text-sm sm:text-base font-bold text-[#041E17] dark:text-white">
              Tidak Ada Jadwal Agenda
            </h3>
            <p className="font-hero text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Belum ada kegiatan yang sesuai filter pada {activeDay.fullDate}.
            </p>
          </div>
        )}
      </main>

      {/* Modal Detail Agenda */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0A1F1A] border border-[#C8A253]/30 text-[#041E17] dark:text-slate-100">
          {selectedEvent && (
            <div className="space-y-4">
              <DialogHeader className="text-left space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#065F46] text-white font-mono text-[10.5px] font-bold">
                    <Clock className="w-3 h-3 text-[#E5C882]" />
                    {formatTimeRange(selectedEvent.start, selectedEvent.end)}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B] text-[#065F46] dark:text-[#E5C882] font-mono text-[10px] font-bold uppercase">
                    {getEventType(selectedEvent.description)}
                  </span>
                </div>
                <DialogTitle className="font-hero text-xl font-extrabold text-[#041E17] dark:text-white leading-snug">
                  {selectedEvent.summary}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-[#065F46] dark:text-[#E5C882] shrink-0" />
                  <span>{selectedEvent.location || 'Lokasi belum diatur'}</span>
                </DialogDescription>
              </DialogHeader>

              {getEventDisposition(selectedEvent.description) && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider mb-1 text-emerald-700 dark:text-emerald-300">
                    Disposisi / Yang Menghadiri
                  </p>
                  <p className="font-semibold">{getEventDisposition(selectedEvent.description)}</p>
                </div>
              )}

              {getCleanDescription(selectedEvent.description) && (
                <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#05110E] border border-[#E6E0D3] dark:border-white/10 text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {getCleanDescription(selectedEvent.description)}
                </div>
              )}

              {getNotulensi(selectedEvent.description) && (
                <div className="p-4 rounded-2xl bg-[#F3EFE6] dark:bg-[#064E3B]/35 border border-[#C8A253]/35 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#065F46] dark:text-[#E5C882]">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Notulensi Kegiatan</span>
                  </div>
                  <p className="text-xs sm:text-sm whitespace-pre-line leading-relaxed text-[#041E17] dark:text-[#F5E9CC]">
                    {getNotulensi(selectedEvent.description)}
                  </p>
                </div>
              )}

              {selectedEvent.attachments && selectedEvent.attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Lampiran Dokumen
                  </p>
                  <div className="space-y-1.5">
                    {selectedEvent.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-white/5 border border-[#E6E0D3] dark:border-white/10 hover:border-[#065F46] text-xs font-semibold transition-colors"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Paperclip className="w-3.5 h-3.5 text-[#065F46] dark:text-[#E5C882] shrink-0" />
                          <span className="truncate">{att.title || `Lampiran ${i + 1}`}</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="pt-3 border-t border-[#E6E0D3] dark:border-white/10 flex items-center justify-between sm:justify-between gap-2">
                {selectedEvent.htmlLink ? (
                  <a
                    href={selectedEvent.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#065F46] dark:text-[#E5C882] hover:underline"
                  >
                    <span>Buka Google Calendar</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="px-5 py-2 rounded-full bg-[#041E17] hover:bg-[#065F46] dark:bg-[#C8A253] text-white dark:text-[#041E17] font-hero text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Tutup
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
