'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Newspaper, Calendar, User, Video } from 'lucide-react';
import { NewsPhotoGallery } from '@/components/informasi/NewsPhotoGallery';
import { NewsImage } from '@/lib/types';
import { PresentationSheet, CardSilhouetteOverlay } from './PresentationSheet';
import {
  staggerContainer,
  cardFadeUp,
  VIEWPORT_ONCE,
  SPRING_TACTILE,
} from './motion-variants';

export interface LandingInformasiItem {
  id: string;
  title: string;
  category: string;
  date: string;
  imageUrl?: string;
  imagePublicId?: string;
  images?: (NewsImage | string)[];
  youtubeVideoId?: string;
  excerpt?: string;
  content?: string;
  isFeatured?: boolean;
  status: 'published' | 'draft';
  author?: string;
}

interface NewsSectionProps {
  newsList: LandingInformasiItem[];
  formatNewsDate: (dateStr?: string) => string;
  onSelectNews: (item: LandingInformasiItem) => void;
}

export function NewsSection({ newsList, formatNewsDate, onSelectNews }: NewsSectionProps) {
  const featuredNews = newsList.find((n) => n.isFeatured) || newsList[0] || null;
  const secondaryNews = featuredNews ? newsList.filter((n) => n.id !== featuredNews.id).slice(0, 4) : [];
  const quickArchive = featuredNews ? newsList.filter((n) => n.id !== featuredNews.id).slice(4, 6) : [];

  return (
    <PresentationSheet
      id="informasi"
      sectionNumber="03"
      deckLabel="Warta & Publikasi"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2.5 mb-4 sm:mb-7">
        <div>
          <h2 className="font-hero font-bold text-xl sm:text-3xl lg:text-[34px] tracking-tight text-[#041E17] dark:text-white leading-tight">
            Informasi &amp; Warta <span className="text-[#065F46] dark:text-[#E5C882]">Gandrungmangu</span>
          </h2>
          <p className="mt-0.5 sm:mt-1 font-hero text-[11.5px] sm:text-sm text-slate-500 dark:text-slate-400">
            Publikasi resmi kegiatan pemerintahan, pelayanan publik, dan kabar masyarakat Kecamatan
          </p>
        </div>

        <Link
          href="/informasi"
          className="inline-flex items-center gap-1.5 self-start md:self-auto px-4 py-2 rounded-full bg-[#F3EFE6] hover:bg-[#065F46] text-[#065F46] hover:text-white dark:bg-[#064E3B]/60 dark:text-[#E5C882] font-hero text-xs font-semibold transition-all"
        >
          <span>Semua Informasi</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {!featuredNews ? (
        <div className="p-12 sm:p-16 rounded-[24px] bg-[#FAF8F5] dark:bg-white/[0.03] border border-dashed border-slate-300/80 dark:border-white/15 text-center space-y-3 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#E5C882] flex items-center justify-center mx-auto">
            <Newspaper className="w-7 h-7" />
          </div>
          <h4 className="font-hero text-base font-bold text-[#041E17] dark:text-white">
            Belum Ada Informasi Terkini
          </h4>
          <p className="font-hero text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Publikasi dan berita resmi dari admin akan ditampilkan di sini setelah ditambahkan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
          {/* KIRI (7 cols): 2x2 Ice-Cyan Cards + Dark Navy Highlight Bar */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4">
            {secondaryNews.length > 0 ? (
              <motion.div
                variants={staggerContainer(0.07, 0.04)}
                initial="hidden"
                whileInView="visible"
                viewport={VIEWPORT_ONCE}
                className="grid grid-cols-2 gap-2.5 sm:gap-3.5"
              >
                {secondaryNews.map((art, idx) => (
                  <motion.div
                    key={art.id || idx}
                    variants={cardFadeUp}
                    whileHover={{ y: -4 }}
                    transition={SPRING_TACTILE}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectNews(art)}
                      className="w-full text-left group flex flex-col justify-between h-full rounded-xl sm:rounded-2xl bg-[#F2F7F9] dark:bg-white/[0.04] hover:bg-[#E7F2F6] dark:hover:bg-white/[0.08] border border-slate-200/70 dark:border-white/10 p-3 sm:p-4 transition-all duration-200 cursor-pointer"
                    >
                      <div className="space-y-1.5 sm:space-y-2 w-full">
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#065F46] text-white font-hero text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider truncate max-w-[65%]">
                            {art.youtubeVideoId && <Video className="h-2.5 w-2.5 shrink-0" />}
                            {art.category || 'INFORMASI'}
                          </span>
                          <span className="hidden sm:inline font-mono text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                            {formatNewsDate(art.date)}
                          </span>
                        </div>
                        <h3 className="font-hero font-bold text-[12px] sm:text-sm text-[#041E17] dark:text-white group-hover:text-[#065F46] dark:group-hover:text-[#E5C882] transition-colors line-clamp-2 leading-snug">
                          {art.title}
                        </h3>
                        <p className="font-hero text-[10.5px] sm:text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-snug sm:leading-relaxed">
                          {art.excerpt || art.content}
                        </p>
                      </div>
                      <div className="pt-2 sm:pt-3 mt-1.5 sm:mt-2 w-full flex items-center justify-between text-[10px] sm:text-[11px] font-hero font-semibold text-[#065F46] dark:text-[#E5C882]">
                        <span className="truncate text-slate-500 dark:text-slate-400 font-normal">
                          {formatNewsDate(art.date)}
                        </span>
                        <span className="shrink-0 group-hover:translate-x-0.5 transition-transform">
                          Baca →
                        </span>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-2xl bg-[#F2F7F9] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 p-6 flex items-center justify-center text-center min-h-[180px]">
                <p className="font-hero text-xs text-slate-500 dark:text-slate-400">
                  Klik kartu sorotan utama di samping untuk membaca rincian berita lengkap.
                </p>
              </div>
            )}

            {/* Dark Marine Navy Bottom Quick-News Strip */}
            <div className="relative overflow-hidden rounded-2xl bg-[#041E17] dark:bg-[#08131d] text-white p-4 space-y-2.5">
              <CardSilhouetteOverlay pattern="geometric" />
              <div className="relative z-10 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#E5C882]">
                  Arsip &amp; Indeks Publikasi
                </span>
                <Link
                  href="/informasi"
                  className="font-hero text-[11px] font-semibold text-[#C8A253] hover:underline"
                >
                  Indeks Informasi →
                </Link>
              </div>
              {quickArchive.length > 0 ? (
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {quickArchive.map((art, idx) => (
                    <button
                      key={art.id || idx}
                      type="button"
                      onClick={() => onSelectNews(art)}
                      className="group flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors text-left cursor-pointer"
                    >
                      <span className="font-hero text-xs font-medium text-white/95 group-hover:text-[#C8A253] line-clamp-1">
                        {art.title}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#E5C882] shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="relative z-10 font-hero text-xs text-[#F5E9CC]/80">
                  Jelajahi seluruh dokumentasi warta, pengumuman, dan galeri kegiatan resmi Kecamatan Gandrungmangu.
                </p>
              )}
            </div>
          </div>

          {/* KANAN (5 cols): Tall Rounded Editorial Featured Headline Photo */}
          <motion.div
            variants={cardFadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
            className="lg:col-span-5"
          >
            <div
              onClick={() => onSelectNews(featuredNews)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectNews(featuredNews);
              }}
              className="group relative flex flex-col justify-end h-full min-h-[250px] sm:min-h-[360px] lg:min-h-[430px] rounded-[20px] sm:rounded-[24px] overflow-hidden bg-[#041E17] p-4 sm:p-6 text-white shadow-[0_16px_42px_rgba(4,30,23,0.18)] cursor-pointer"
            >
              <div className="absolute inset-0">
                {featuredNews.imageUrl || (featuredNews.images && featuredNews.images.length > 0) || featuredNews.youtubeVideoId ? (
                  <NewsPhotoGallery
                    images={featuredNews.images}
                    imageUrl={featuredNews.imageUrl}
                    youtubeVideoId={featuredNews.youtubeVideoId}
                    title={featuredNews.title}
                    mode="card"
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#065F46] via-[#084C61] to-[#041E17]" />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#041E17]/95 via-[#041E17]/50 to-transparent pointer-events-none" />

              <div className="relative z-10 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#065F46] text-white font-hero text-[10px] font-bold uppercase tracking-wider">
                    {featuredNews.category || 'SOROTAN UTAMA'}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-[#F5E9CC]/90">
                    <Calendar className="h-3 w-3 text-[#C8A253]" />
                    {formatNewsDate(featuredNews.date)}
                  </span>
                </div>

                <h3 className="font-hero font-bold text-lg sm:text-xl text-white leading-snug line-clamp-3 group-hover:text-[#E5C882] transition-colors">
                  {featuredNews.title}
                </h3>

                <p className="font-hero text-xs text-slate-200/90 line-clamp-2 leading-relaxed">
                  {featuredNews.excerpt || featuredNews.content}
                </p>

                <div className="pt-2 flex items-center justify-between border-t border-white/15">
                  <span className="inline-flex items-center gap-1.5 font-hero text-[11px] text-[#F5E9CC]/85">
                    <User className="h-3.5 w-3.5 text-[#C8A253]" />
                    {featuredNews.author || 'Redaksi Kecamatan'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#C8A253] text-[#041E17] font-hero text-[11px] font-bold transition-transform group-hover:scale-105">
                    <span>Selengkapnya</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </PresentationSheet>
  );
}
