'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  Loader2,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { PresentationSheet } from './PresentationSheet';
import {
  staggerContainer,
  cardFadeUp,
  listItemStagger,
  VIEWPORT_ONCE,
  SPRING_TACTILE,
} from './motion-variants';

export interface LandingCalendarEvent {
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

export interface LandingAgendaDayInfo {
  offset: number;
  label: string;
  shortLabel: string;
  dateKey: string;
  fullDate: string;
  shortDate: string;
  dayName: string;
  items: LandingCalendarEvent[];
  loading: boolean;
}

interface AgendaSectionProps {
  agendaDays: LandingAgendaDayInfo[];
  selectedDayTab: number;
  onSelectDayTab: (idx: number) => void;
  isRefreshingAgenda: boolean;
  onRefreshAgenda: () => void;
  onSelectEvent: (event: LandingCalendarEvent) => void;
  formatTimeRange: (start?: { dateTime?: string }, end?: { dateTime?: string }) => string;
  getEventType: (desc?: string) => string;
  getEventDisposition: (desc?: string) => string | null;
}

export function AgendaSection({
  agendaDays,
  selectedDayTab,
  onSelectDayTab,
  isRefreshingAgenda,
  onRefreshAgenda,
  onSelectEvent,
  formatTimeRange,
  getEventType,
  getEventDisposition,
}: AgendaSectionProps) {
  const activeDay = agendaDays[selectedDayTab] || agendaDays[0];

  return (
    <PresentationSheet
      id="agenda"
      sectionNumber="04"
      deckLabel="Agenda & Jadwal"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 sm:mb-6">
        <div>
          <h2 className="font-hero font-bold text-2xl sm:text-3xl lg:text-[34px] tracking-tight text-[#061E2B] dark:text-white leading-tight">
            Agenda Kegiatan <span className="text-[#0E7490] dark:text-cyan-400">Kecamatan</span>
          </h2>
          <p className="mt-1 font-hero text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Jadwal kegiatan kedinasan, rapat koordinasi, dan disposisi pejabat kewilayahan (Hari H s.d. H+3)
          </p>
        </div>
        <button
          type="button"
          onClick={onRefreshAgenda}
          disabled={isRefreshingAgenda}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-full bg-[#0E7490] hover:bg-[#061E2B] text-white font-hero text-xs font-semibold transition-all duration-200 disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingAgenda ? 'animate-spin' : ''}`} />
          <span>Segarkan Jadwal</span>
        </button>
      </div>

      {/* Container Konten Agenda */}
      <div className="rounded-[22px] bg-[#F4F8FA] dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 p-4 sm:p-6 space-y-6">
        {/* 4 Tabs Hari */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {agendaDays.map((day, idx) => {
            const isActive = selectedDayTab === idx;
            return (
              <button
                key={day.offset}
                type="button"
                onClick={() => onSelectDayTab(idx)}
                className={`relative p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-br from-[#061E2B] to-[#0E7490] border-cyan-400/30 text-white shadow-lg scale-[1.01]'
                    : 'bg-white dark:bg-[#0c1622] hover:border-[#0E7490]/50 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span
                    className={`font-mono text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#f4c430] text-[#061E2B]'
                        : 'bg-[#EBF5F8] dark:bg-cyan-950/60 text-[#0E7490] dark:text-cyan-300'
                    }`}
                  >
                    {day.shortLabel}
                  </span>
                  <span className={`font-hero text-[10px] font-semibold ${isActive ? 'text-cyan-200' : 'text-slate-400'}`}>
                    {day.dayName}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className={`font-hero text-lg sm:text-xl font-extrabold tracking-tight ${isActive ? 'text-white' : 'text-[#061E2B] dark:text-white'}`}>
                    {day.shortDate}
                  </span>
                  <span className={`font-mono text-[10.5px] font-semibold ${isActive ? 'text-cyan-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {day.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `${day.items.length} Acara`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Subheader Hari Aktif */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0E7490] dark:bg-cyan-400" />
            <h3 className="font-hero text-sm sm:text-base font-bold text-[#061E2B] dark:text-white">
              Agenda {activeDay.fullDate}
            </h3>
          </div>
          <span className="font-mono text-[11px] font-semibold text-[#0E7490] dark:text-cyan-300">
            {activeDay.items.length} Terjadwal
          </span>
        </div>

        {/* Grid Kartu Agenda */}
        {activeDay.loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white dark:bg-[#0c1622] rounded-2xl p-5 border border-slate-200/70 dark:border-white/10 animate-pulse space-y-3"
              >
                <div className="h-4 bg-slate-200/70 dark:bg-white/10 rounded-full w-1/3" />
                <div className="h-5 bg-slate-200/70 dark:bg-white/10 rounded-xl w-3/4" />
                <div className="h-4 bg-slate-200/70 dark:bg-white/10 rounded-lg w-1/2" />
              </div>
            ))}
          </div>
        ) : activeDay.items.length > 0 ? (
          <motion.div
            variants={staggerContainer(0.06, 0.03)}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {activeDay.items.map((event) => {
              const timeStr = formatTimeRange(event.start, event.end);
              const type = getEventType(event.description);
              const disp = getEventDisposition(event.description);
              const isInternal = type === 'Internal';
              const isExternal = type === 'Eksternal';

              return (
                <motion.div
                  key={event.id}
                  variants={cardFadeUp}
                  whileHover={{ y: -4 }}
                  transition={SPRING_TACTILE}
                  onClick={() => onSelectEvent(event)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectEvent(event);
                  }}
                  className="bg-white dark:bg-[#0c1622] rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-md hover:border-[#0E7490]/50 transition-all duration-200 flex flex-col justify-between gap-3 group cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-white/10">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#061E2B] dark:text-cyan-200 bg-[#EBF5F8] dark:bg-cyan-950/60 px-2.5 py-1 rounded-full">
                        <Clock className="w-3 h-3 text-[#0E7490] dark:text-cyan-300" />
                        <span>{timeStr}</span>
                      </div>
                      <span
                        className={`font-mono text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isInternal
                            ? 'bg-[#061E2B] text-white dark:bg-[#0E7490]'
                            : isExternal
                              ? 'bg-[#f4c430]/20 text-amber-800 dark:text-[#f4c430]'
                              : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {type}
                      </span>
                    </div>

                    {disp && (
                      <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 text-[11px] font-medium leading-tight">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-mono font-bold text-[9px] uppercase tracking-wide block text-emerald-800 dark:text-emerald-300">
                            Disposisi:
                          </span>
                          <span className="line-clamp-2">{disp}</span>
                        </div>
                      </div>
                    )}

                    <h4 className="font-hero text-sm sm:text-[15px] font-bold text-[#061E2B] dark:text-white group-hover:text-[#0E7490] dark:group-hover:text-cyan-300 transition-colors leading-snug line-clamp-2">
                      {event.summary}
                    </h4>

                    <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#0E7490] dark:text-cyan-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{event.location || 'Lokasi belum diatur'}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end text-[11px] font-hero font-bold text-[#0E7490] dark:text-cyan-300">
                    <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Rincian Acara <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="p-10 sm:p-12 rounded-2xl bg-white dark:bg-[#0c1622] border border-dashed border-slate-300/80 dark:border-white/15 text-center space-y-3 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-[#EBF5F8] dark:bg-cyan-950/60 text-[#0E7490] dark:text-cyan-300 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="font-hero text-sm sm:text-base font-bold text-[#061E2B] dark:text-white">
              Tidak Ada Jadwal Agenda
            </h4>
            <p className="font-hero text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Belum ada agenda kedinasan atau acara kemasyarakatan yang dijadwalkan pada {activeDay.fullDate}.
            </p>
          </div>
        )}
      </div>

      {/* Footer Strip */}
      <motion.div
        variants={listItemStagger}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
        className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left"
      >
        <p className="font-hero text-[11px] text-slate-500 dark:text-slate-400">
          * Terintegrasi langsung dengan Google Calendar resmi Pemerintah Kecamatan Gandrungmangu.
        </p>
        <span className="font-mono text-[10.5px] font-semibold text-[#0E7490] dark:text-cyan-400">
          Klik kartu untuk melihat rincian &amp; notulensi
        </span>
      </motion.div>
    </PresentationSheet>
  );
}
