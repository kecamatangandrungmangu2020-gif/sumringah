'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  ChevronDown,
  Ticket,
  Users,
  Calendar,
  Layers,
  ArrowUpRight,
  Star,
} from 'lucide-react';
import { staggerContainer, listItemStagger } from './motion-variants';
import {
  EASE_CINEMATIC,
  SlideLayoutMode,
  KineticScatterTitle,
  AnamorphicTransitionWipe,
  VerticalPhotoStrips,
  CenterColumnsReveal,
  CinematicHudOverlay,
  DottedMatrixBar,
  BroadcastTimecode,
} from './hero-cinematic-parts';

interface HeroSlideItem {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  actionText: string;
  actionUrl: string;
  external?: boolean;
  colorTone: string;
}

const MASCOT_VIDEO_URL =
  'https://res.cloudinary.com/zqw5r6ay/video/upload/v1790613043/Mascot_revealing_logo_video_20260928232803.mp4';

const QUICK_DOCK_ITEMS = [
  {
    label: 'Antrian Online',
    href: '/Antrian/online/',
    icon: Ticket,
    accent: 'text-cyan-300 group-hover:text-white',
  },
  {
    label: 'Kunjungan Tamu',
    href: '/kunjungan-tamu/',
    icon: Users,
    accent: 'text-sky-300 group-hover:text-white',
  },
  {
    label: 'Agenda Acara',
    href: '#agenda',
    icon: Calendar,
    accent: 'text-cyan-200 group-hover:text-white',
  },
  {
    label: 'Data SOLID',
    href: 'https://solid.gandrungmangu.id/',
    icon: Layers,
    accent: 'text-teal-300 group-hover:text-white',
    external: true,
  },
];

function getSlideLayoutMode(index: number): SlideLayoutMode {
  if (index === 0) return 'center-banner';
  return index % 2 === 1 ? 'text-left' : 'text-right';
}

const HeroDigitalClock = React.memo(function HeroDigitalClock() {
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDateTime(new Date());
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedDateTime = useMemo(() => {
    if (!currentDateTime) return null;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = days[currentDateTime.getDay()];
    const date = currentDateTime.getDate();
    const month = months[currentDateTime.getMonth()];
    const year = currentDateTime.getFullYear();
    const hours = String(currentDateTime.getHours()).padStart(2, '0');
    const minutes = String(currentDateTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentDateTime.getSeconds()).padStart(2, '0');
    return {
      time: `${hours}:${minutes}:${seconds}`,
      date: `${day}, ${date} ${month} ${year}`,
    };
  }, [currentDateTime]);

  return (
    <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#061E2B]/80 backdrop-blur-md border border-cyan-300/25 shadow-sm min-w-[146px]">
      <div className="flex flex-col items-start leading-none">
        <div className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs font-bold text-white tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse shadow-[0_0_8px_#67e8f9]" />
          <span className="tabular-nums">
            {formattedDateTime ? formattedDateTime.time : '00:00:00'}
          </span>
          <span className="text-[9px] text-cyan-300 font-semibold tracking-normal font-mono ml-0.5">
            WIB
          </span>
        </div>
        <span className="text-[8.5px] sm:text-[9px] font-mono font-medium uppercase tracking-[0.12em] text-cyan-100/75 mt-0.5">
          {formattedDateTime ? formattedDateTime.date : 'WIB • GANDRUNGMANGU'}
        </span>
      </div>
    </div>
  );
});

export function HeroSection({
  heroImage,
  wilayahBgImage,
}: {
  heroImage?: string;
  wilayahBgImage?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [transitionTick, setTransitionTick] = useState(0);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const slides: HeroSlideItem[] = useMemo(() => {
    const primaryImg =
      heroImage && heroImage !== '/hero-Kecamatan.jpg'
        ? heroImage
        : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1400&auto=format&fit=crop';
    const territoryImg =
      wilayahBgImage ||
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1400&auto=format&fit=crop';

    return [
      {
        id: 'slide-intro-gandrungmangu',
        tag: 'Portal Resmi Pemerintah Kecamatan',
        title: 'Gandrungmangu Semringah',
        subtitle: 'Kabupaten Cilacap • Jawa Tengah',
        description:
          'Pelayanan Digital Kecamatan Gandrungmangu — Hadir dengan SEMRINGAH (SEMAngat membeRIkan pelayanan NGgawe bungAH) untuk 14 Desa.',
        imageUrl: primaryImg,
        videoUrl: MASCOT_VIDEO_URL,
        actionText: 'Ambil Antrian Online',
        actionUrl: '/Antrian/online/',
        colorTone: 'from-[#08384a]/78 via-[#146a80]/60 to-[#062230]/86',
      },
      {
        id: 'slide-pelayanan-digital',
        tag: 'Front Office • Non-PATEN',
        title: 'Kunjungan Tamu',
        subtitle: 'Tamu Dinas, Proposal, SPJ, Barang & Pengaduan',
        description:
          'Satu pintu Front Office Kecamatan Gandrungmangu untuk penerimaan tamu dinas, penyerahan proposal, SPJ desa, paket logistik, dan aspirasi warga.',
        imageUrl: primaryImg,
        actionText: 'Isi Kunjungan Tamu',
        actionUrl: '/kunjungan-tamu/',
        colorTone: 'from-[#0a3d50]/78 via-[#166e85]/62 to-[#072636]/86',
      },
      {
        id: 'slide-wilayah-solid',
        tag: 'Geospasial & 14 Desa',
        title: 'Wilayah & SOLID',
        subtitle: '64,37 km² • 14 Desa Terintegrasi',
        description:
          'Eksplorasi data geospasial kewilayahan, profil 14 desa, dan potensi agraris Kecamatan Gandrungmangu secara transparan melalui portal SOLID.',
        imageUrl: territoryImg,
        actionText: 'Jelajahi Data Wilayah',
        actionUrl: '#wilayah',
        colorTone: 'from-[#0b4254]/78 via-[#18778f]/60 to-[#082838]/86',
      },
      {
        id: 'slide-agenda-publik',
        tag: 'Transparansi & Kedinasan',
        title: 'Agenda & Informasi',
        subtitle: 'Kalender Kegiatan & Warta Resmi',
        description:
          'Pantau jadwal agenda kedinasan Hari H hingga H+3 secara realtime serta kabar terbaru kegiatan pemerintahan dan masyarakat Kecamatan.',
        imageUrl:
          'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=1280&auto=format&fit=crop',
        actionText: 'Lihat Agenda Kegiatan',
        actionUrl: '#agenda',
        colorTone: 'from-[#093b4d]/78 via-[#16738a]/62 to-[#072433]/86',
      },
    ];
  }, [heroImage, wilayahBgImage]);

  const safeIndex = activeIndex % slides.length;
  const activeSlide = slides[safeIndex] || slides[0];
  const layoutMode = getSlideLayoutMode(safeIndex);
  const autoSlideSeconds = 9;
  const metricValue = (1.45 + safeIndex * 1.12).toFixed(3);

  const goToSlide = useCallback(
    (nextIndex: number, dir: 'next' | 'prev' = 'next') => {
      setDirection(dir);
      setActiveIndex(((nextIndex % slides.length) + slides.length) % slides.length);
      setTransitionTick((t) => t + 1);
    },
    [slides.length]
  );

  const handleNext = useCallback(() => {
    goToSlide(safeIndex + 1, 'next');
  }, [goToSlide, safeIndex]);

  const handlePrev = useCallback(() => {
    goToSlide(safeIndex - 1, 'prev');
  }, [goToSlide, safeIndex]);

  const handleRandomize = useCallback(() => {
    if (slides.length <= 1) return;
    let nextIdx = safeIndex;
    while (nextIdx === safeIndex) {
      nextIdx = Math.floor(Math.random() * slides.length);
    }
    goToSlide(nextIdx, 'next');
  }, [goToSlide, safeIndex, slides.length]);

  useEffect(() => {
    if (hasUserInteracted) return;
    const activate = () => setHasUserInteracted(true);
    window.addEventListener('pointermove', activate, { once: true, passive: true });
    window.addEventListener('wheel', activate, { once: true, passive: true });
    window.addEventListener('touchstart', activate, { once: true, passive: true });
    window.addEventListener('keydown', activate, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointermove', activate);
      window.removeEventListener('wheel', activate);
      window.removeEventListener('touchstart', activate);
      window.removeEventListener('keydown', activate);
    };
  }, [hasUserInteracted]);

  useEffect(() => {
    if (!hasUserInteracted) return;
    const timer = setInterval(() => {
      setDirection('next');
      setActiveIndex((prev) => (prev + 1) % slides.length);
      setTransitionTick((t) => t + 1);
    }, autoSlideSeconds * 1000);
    return () => clearInterval(timer);
  }, [hasUserInteracted, slides.length]);

  const handleDiscover = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById('jelajahi-kecamatan');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' });
    }
  };

  const slideKey = `${activeSlide.id}-${transitionTick}`;

  return (
    <section
      id="hero-roto-section"
      className="relative min-h-[100svh] lg:h-[100dvh] lg:max-h-[1080px] lg:min-h-[600px] w-full bg-white dark:bg-[#070b10] p-2 sm:p-3 lg:p-3.5 snap-section"
    >
      <div className="relative h-full min-h-[calc(100svh-16px)] sm:min-h-[calc(100svh-24px)] lg:min-h-0 w-full rounded-[20px] sm:rounded-[26px] lg:rounded-[28px] overflow-hidden bg-[#072636] text-white flex flex-col justify-between select-none shadow-[0_12px_40px_rgba(7,22,30,0.12)]">
        {/* 1. ATMOSPHERIC LUMINOUS TEAL/CYAN BACKDROP */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={`hero-backdrop-${slideKey}`}
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1.02 }}
              exit={{ opacity: 0, scale: 1 }}
              transition={{ duration: 1.05, ease: EASE_CINEMATIC }}
              className="absolute inset-0"
            >
              <Image
                src={activeSlide.imageUrl}
                alt={activeSlide.title}
                fill
                priority
                unoptimized
                sizes="100vw"
                className={`object-cover object-center transition-all duration-700 ${
                  layoutMode === 'center-banner'
                    ? 'brightness-[0.6] contrast-[1.05] scale-[1.02]'
                    : 'brightness-[0.72] saturate-[0.8] contrast-[1.04] blur-[4px] scale-[1.06]'
                }`}
              />
            </motion.div>
          </AnimatePresence>

          <div
            className={`absolute inset-0 bg-gradient-to-br ${activeSlide.colorTone} pointer-events-none transition-colors duration-700`}
          />

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 72% 58% at 58% 44%, rgba(56, 189, 248, 0.28) 0%, rgba(14, 116, 144, 0.1) 52%, rgba(4, 20, 30, 0.52) 100%)',
            }}
          />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#041620]/80 via-[#041620]/28 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#041620]/75 via-[#041620]/20 to-transparent pointer-events-none" />
        </div>

        {/* Center Banner Video / 5-Column Reveal */}
        <CenterColumnsReveal
          imageUrl={activeSlide.imageUrl}
          alt={activeSlide.title}
          slideKey={slideKey}
          isVisible={layoutMode === 'center-banner'}
          videoUrl={activeSlide.videoUrl}
        />

        {/* 2. ANAMORPHIC OPTICAL FLARE & GLASS WIPE */}
        <AnamorphicTransitionWipe transitionKey={transitionTick} direction={direction} />

        {/* 3. BROADCAST HUD TELEMETRY OVERLAY */}
        <CinematicHudOverlay
          activeIndex={safeIndex}
          totalSlides={slides.length}
          layoutMode={layoutMode}
        />

        {/* Spacer untuk Fixed Architectural Header */}
        <div className="h-14 sm:h-[68px] lg:h-[72px] shrink-0 pointer-events-none" />

        {/* 4. MAIN CINEMATIC STAGE */}
        <div className="relative z-20 flex-1 min-h-0 flex items-center justify-center w-full my-auto py-2 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            {layoutMode === 'center-banner' ? (
              <motion.div
                key={`center-showcase-${slideKey}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12, transition: { duration: 0.3 } }}
                transition={{ duration: 0.6, ease: EASE_CINEMATIC }}
                className="relative w-full flex items-center justify-center px-4 sm:px-8"
              >
                <div className="relative mx-auto max-w-4xl flex flex-col items-center text-center">
                  <div
                    className="pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10"
                    style={{
                      background:
                        'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(4, 20, 30, 0.45) 0%, rgba(4, 20, 30, 0) 100%)',
                    }}
                  />

                  <motion.div
                    initial={transitionTick === 0 ? false : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.08, ease: EASE_CINEMATIC }}
                    className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#061E2B]/75 backdrop-blur-md border border-cyan-300/35 mb-3 sm:mb-4 shadow-[0_6px_20px_rgba(6,30,43,0.35)]"
                  >
                    <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9]" />
                    <span className="font-mono text-[9.5px] sm:text-[10.5px] font-semibold uppercase tracking-[0.22em] text-cyan-50">
                      {activeSlide.tag}
                    </span>
                  </motion.div>

                  <KineticScatterTitle
                    text={activeSlide.title}
                    slideKey={slideKey}
                    align="center"
                    size="center"
                  />

                  <motion.div
                    initial={transitionTick === 0 ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.48, delay: 0.28, ease: EASE_CINEMATIC }}
                    className="mt-3 sm:mt-4 flex items-center justify-center gap-2.5 sm:gap-3.5"
                  >
                    <span className="hidden sm:block w-8 sm:w-12 h-[1.5px] bg-cyan-300/75" />
                    <p className="font-hero text-[11px] sm:text-[13px] font-bold uppercase tracking-[0.2em] text-cyan-200 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                      {activeSlide.subtitle}
                    </p>
                    <span className="hidden sm:block w-8 sm:w-12 h-[1.5px] bg-cyan-300/75" />
                  </motion.div>

                  <motion.p
                    initial={transitionTick === 0 ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.48, delay: 0.36, ease: EASE_CINEMATIC }}
                    className="mt-2.5 font-hero text-xs sm:text-sm font-medium text-white/95 leading-relaxed max-w-xl line-clamp-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]"
                  >
                    {activeSlide.description}
                  </motion.p>

                  <motion.div
                    initial={transitionTick === 0 ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.48, delay: 0.44, ease: EASE_CINEMATIC }}
                    className="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3"
                  >
                    <Link
                      href={activeSlide.actionUrl}
                      className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0E7490] hover:bg-white text-white hover:text-[#061E2B] border border-cyan-300/40 font-hero font-bold text-[11px] sm:text-xs uppercase tracking-[0.16em] shadow-[0_12px_30px_rgba(14,116,144,0.45)] transition-all duration-300 active:scale-95"
                    >
                      <span>{activeSlide.actionText}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>

                    <a
                      href="https://sisukma.cilacapkab.go.id/Home/pelayanan/4012001"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#061E2B]/70 hover:bg-[#f4c430] text-white hover:text-[#061E2B] border border-white/25 backdrop-blur-md font-hero font-bold text-[11px] uppercase tracking-[0.14em] transition-all duration-300"
                    >
                      <Star className="h-3.5 w-3.5 text-[#f4c430] group-hover:text-[#061E2B] fill-current" />
                      <span>Bantu Nilai Kami</span>
                    </a>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handlePrev}
                        aria-label="Slide Sebelumnya"
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-cyan-200/35 bg-[#061E2B]/65 hover:bg-[#0E7490] hover:border-cyan-200/60 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-90"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        aria-label="Slide Berikutnya"
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-cyan-200/35 bg-[#061E2B]/65 hover:bg-[#0E7490] hover:border-cyan-200/60 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-90"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`split-showcase-${slideKey}`}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
                className="mx-auto w-full max-w-7xl px-4 sm:px-10 lg:px-14 xl:px-16"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-5 sm:gap-7 lg:gap-9">
                  <div
                    className={`lg:col-span-5 flex flex-col items-start text-left z-20 min-w-0 ${
                      layoutMode === 'text-right' ? 'order-2 lg:order-2 lg:pl-3' : 'order-2 lg:order-1 lg:pr-3'
                    }`}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.48, delay: 0.1, ease: EASE_CINEMATIC }}
                      className="flex items-center gap-2.5 mb-2.5 sm:mb-3 max-w-full"
                    >
                      <DottedMatrixBar activeIndex={safeIndex} totalSlides={slides.length} align="left" />
                      <span className="px-3 py-0.5 rounded-full bg-[#0E7490]/80 border border-cyan-300/35 backdrop-blur-sm font-mono text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-[0.16em] text-white truncate">
                        {activeSlide.tag}
                      </span>
                    </motion.div>

                    <KineticScatterTitle
                      text={activeSlide.title}
                      slideKey={slideKey}
                      align="left"
                      size="side"
                    />

                    <motion.div
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.26, ease: EASE_CINEMATIC }}
                      className="flex items-center gap-1 origin-left my-3 sm:my-3.5"
                    >
                      <span className="w-20 sm:w-24 h-[2px] bg-white/85" />
                      <span className="w-6 h-[2px] bg-cyan-300" />
                    </motion.div>

                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.42, delay: 0.32, ease: EASE_CINEMATIC }}
                      className="font-hero text-[11px] sm:text-xs font-semibold uppercase tracking-[0.13em] text-cyan-200"
                    >
                      {activeSlide.subtitle}
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.38, ease: EASE_CINEMATIC }}
                      className="mt-1.5 font-hero text-xs sm:text-[13px] font-normal text-white/85 leading-relaxed max-w-md line-clamp-2 sm:line-clamp-3"
                    >
                      {activeSlide.description}
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.48, delay: 0.44, ease: EASE_CINEMATIC }}
                      className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3"
                    >
                      <Link
                        href={activeSlide.actionUrl}
                        className="group inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-full bg-white hover:bg-[#0E7490] text-[#061E2B] hover:text-white font-hero font-bold text-[11px] uppercase tracking-[0.15em] shadow-[0_10px_28px_rgba(6,30,43,0.35)] transition-all duration-300 active:scale-95"
                      >
                        <span>{activeSlide.actionText}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handlePrev}
                          aria-label="Slide Sebelumnya"
                          className="h-9 w-9 rounded-full border border-cyan-200/35 bg-[#061E2B]/55 hover:bg-[#0E7490] hover:border-cyan-200/60 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-90"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          aria-label="Slide Berikutnya"
                          className="h-9 w-9 rounded-full border border-cyan-200/35 bg-[#061E2B]/55 hover:bg-[#0E7490] hover:border-cyan-200/60 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-90"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.45, delay: 0.52 }}
                      className="hidden sm:flex items-center gap-2 mt-3"
                    >
                      <span className="h-[1px] w-5 bg-cyan-200/50" />
                      <BroadcastTimecode activeIndex={safeIndex} />
                    </motion.div>
                  </div>

                  <div
                    className={`lg:col-span-7 relative z-10 ${
                      layoutMode === 'text-right' ? 'order-1 lg:order-1' : 'order-1 lg:order-2'
                    }`}
                  >
                    <VerticalPhotoStrips
                      imageUrl={activeSlide.imageUrl}
                      alt={activeSlide.title}
                      slideKey={slideKey}
                      side={layoutMode === 'text-right' ? 'left' : 'right'}
                      activeIndex={safeIndex}
                      metricValue={metricValue}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 5. BOTTOM BAR: QUICK DOCK, HUD CLOCK, DISCOVER & PROGRESS */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          variants={staggerContainer(0.08, 0.1)}
          className="relative z-30 w-full pb-3 sm:pb-4 px-4 sm:px-8 lg:px-12 shrink-0 space-y-2"
        >
          <motion.div variants={listItemStagger} className="mx-auto max-w-2xl flex items-center justify-center">
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5 p-1.5 rounded-2xl sm:rounded-full bg-[#061E2B]/80 backdrop-blur-xl border border-cyan-300/25 shadow-[0_14px_36px_rgba(6,30,43,0.5)] w-full sm:w-auto">
              {QUICK_DOCK_ITEMS.map((item) => {
                const Icon = item.icon;
                const inner = (
                  <>
                    <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 transition-transform group-hover:scale-110 ${item.accent}`} />
                    <span className="text-[9.5px] sm:text-[11px] font-hero font-semibold text-white/95 group-hover:text-white whitespace-nowrap">
                      {item.label}
                    </span>
                  </>
                );
                if (item.external) {
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 rounded-xl sm:rounded-full hover:bg-[#0E7490] hover:-translate-y-0.5 active:scale-95 transition-all text-center"
                    >
                      {inner}
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 rounded-xl sm:rounded-full hover:bg-[#0E7490] hover:-translate-y-0.5 active:scale-95 transition-all text-center"
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            variants={listItemStagger}
            className="mx-auto max-w-7xl relative flex items-center justify-between gap-3 min-h-[36px] pr-2 lg:pr-8"
          >
            <HeroDigitalClock />

            <div className="hidden md:flex items-center justify-center">
              <a
                href="#jelajahi-kecamatan"
                onClick={handleDiscover}
                className="group flex flex-col items-center justify-center gap-0.5 cursor-pointer text-white/90 hover:text-white transition-all text-center"
              >
                <span className="text-[10.5px] font-hero font-semibold uppercase tracking-[0.26em] pl-[0.26em] border-b border-white/40 group-hover:border-cyan-300 pb-0.5 transition-colors whitespace-nowrap">
                  Jelajahi Kecamatan Kami
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-cyan-300 animate-bounce transition-colors" />
              </a>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1">
                {slides.map((s, idx) => {
                  const isActive = idx === safeIndex;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => goToSlide(idx, idx > safeIndex ? 'next' : 'prev')}
                      aria-label={`Pilih Slide ${idx + 1}`}
                      className="relative flex h-6 w-7 sm:w-8 items-center justify-center cursor-pointer focus:outline-none group"
                    >
                      <span
                        className={`relative h-1.5 w-full rounded-full overflow-hidden transition-opacity duration-300 ${
                          isActive ? 'bg-white/35' : 'bg-white/25 group-hover:bg-white/55'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            key={`progress-${slideKey}`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: autoSlideSeconds, ease: 'linear' }}
                            className="absolute inset-0 bg-cyan-300 origin-left"
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleRandomize}
                aria-label="Acak Slide"
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#0E7490] hover:bg-white text-white hover:text-[#061E2B] border border-cyan-300/35 transition-all cursor-pointer shadow-[0_6px_20px_rgba(14,116,144,0.45)] hover:scale-105 active:scale-95"
                title="Acak Slide"
              >
                <RotateCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.2] transition-transform active:rotate-180" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
