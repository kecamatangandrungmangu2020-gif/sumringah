'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface SlideItem {
  id: string;
  number: string;
  title: string;
  tag: string;
}

export const SLIDES: SlideItem[] = [
  { id: 'hero-roto-section', number: '01', title: 'Beranda', tag: 'Gandrungmangu' },
  { id: 'jelajahi-kecamatan', number: '02', title: 'Visi Semringah', tag: 'Nilai Pelayanan' },
  { id: 'layanan', number: '03', title: 'Layanan Digital', tag: 'Akses Cepat' },
  { id: 'informasi', number: '04', title: 'Informasi', tag: 'Warta Terkini' },
  { id: 'agenda', number: '05', title: 'Agenda', tag: 'Jadwal Kegiatan' },
  { id: 'wilayah', number: '06', title: 'Wilayah & Desa', tag: '14 Desa & SOLID' },
  { id: 'pengaduan', number: '07', title: 'Pengaduan', tag: 'Layanan Warga' },
  { id: 'footer-kecamatan', number: '08', title: 'Kontak', tag: 'Kantor Kecamatan' },
];

export function FullpageScrollController() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const foundIdx = SLIDES.findIndex((s) => s.id === entry.target.id);
          if (foundIdx !== -1) {
            setActiveIndex(foundIdx);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '-25% 0px -45% 0px',
      threshold: 0.05,
    });

    SLIDES.forEach((slide) => {
      const el = document.getElementById(slide.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSlide = useCallback((index: number) => {
    if (index < 0 || index >= SLIDES.length) return;
    const targetSlide = SLIDES[index];
    const targetElement = document.getElementById(targetSlide.id);
    if (targetElement) {
      isScrollingRef.current = true;
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveIndex(index);
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 750);
    }
  }, []);

  return (
    <>
      {/* Desktop Floating Section TOC Navigator */}
      <aside
        aria-label="Navigasi Bagian Halaman"
        className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-end gap-2 select-none pointer-events-auto"
      >
        <button
          type="button"
          onClick={() => scrollToSlide(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Bagian Sebelumnya"
          title="Bagian Sebelumnya"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/85 dark:bg-slate-900/85 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-md transition-all disabled:opacity-25 disabled:pointer-events-none hover:scale-110 active:scale-95 cursor-pointer mb-0.5"
        >
          <ChevronUp className="h-3.5 w-3.5 stroke-[2.2]" />
        </button>

        <div className="text-[9.5px] font-mono font-semibold tracking-wider text-slate-500 dark:text-slate-400 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-white/10 shadow-sm mb-0.5">
          <span className="text-[#065F46] dark:text-[#E5C882] font-bold">{SLIDES[activeIndex]?.number}</span>
          <span className="text-slate-400 mx-0.5">/</span>
          <span>{SLIDES[SLIDES.length - 1]?.number}</span>
        </div>

        <div className="flex flex-col items-end gap-1 py-1.5 px-1 rounded-full bg-white/60 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/70 dark:border-white/10 shadow-sm">
          {SLIDES.map((slide, idx) => {
            const isActive = activeIndex === idx;
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={slide.id}
                className="relative flex items-center justify-end group"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: 8, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 8, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-8 mr-1 flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 shadow-md backdrop-blur-md text-[10px] font-hero uppercase tracking-wider font-bold bg-[#041E17] text-white border border-[#C8A253]/25 pointer-events-none"
                    >
                      <span className="font-mono text-[9px] text-[#E5C882]">{slide.number}</span>
                      <span>{slide.title}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => scrollToSlide(idx)}
                  aria-label={`Lompat ke bagian ${slide.number}: ${slide.title}`}
                  className="relative flex h-6 w-6 items-center justify-center rounded-full cursor-pointer focus:outline-none"
                >
                  <span
                    className={`flex items-center justify-center transition-all duration-300 rounded-full ${
                      isActive
                        ? 'w-2.5 h-5 bg-[#065F46] dark:bg-[#C8A253] shadow-xs'
                        : 'w-2 h-2 bg-slate-400/60 dark:bg-slate-600 group-hover:bg-[#041E17] dark:group-hover:bg-[#E5C882] group-hover:scale-125'
                    }`}
                  >
                    {isActive && (
                      <span className="w-1 h-1 rounded-full bg-white dark:bg-[#041E17]" />
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollToSlide(activeIndex + 1)}
          disabled={activeIndex === SLIDES.length - 1}
          aria-label="Bagian Berikutnya"
          title="Bagian Berikutnya"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/85 dark:bg-slate-900/85 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-md transition-all disabled:opacity-25 disabled:pointer-events-none hover:scale-110 active:scale-95 cursor-pointer mt-0.5"
        >
          <ChevronDown className="h-3.5 w-3.5 stroke-[2.2]" />
        </button>
      </aside>

      {/* Mobile Quick Section Pill */}
      <AnimatePresence>
        {activeIndex > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            aria-label="Navigasi Cepat Mobile"
            className="fixed bottom-4 right-4 z-40 xl:hidden flex items-center gap-1 p-1 rounded-full bg-white/90 dark:bg-slate-900/90 select-none shadow-lg backdrop-blur-xl border border-slate-300/70 dark:border-white/15"
          >
            <button
              type="button"
              onClick={() => scrollToSlide(0)}
              aria-label="Kembali ke Atas"
              title="Kembali ke Atas"
              className="flex h-8 w-8 items-center justify-center rounded-full neu-btn text-slate-700 dark:text-slate-200 active:scale-95 cursor-pointer"
            >
              <ChevronUp className="h-4 w-4 stroke-[2.2]" />
            </button>

            <div className="flex items-center gap-1 px-2 py-0.5">
              <span className="text-[10px] font-mono font-bold text-[#065F46] dark:text-[#E5C882]">
                {SLIDES[activeIndex]?.number}
              </span>
              <span className="text-[9px] text-slate-400">/</span>
              <span className="text-[9px] font-mono text-slate-500">{SLIDES[SLIDES.length - 1]?.number}</span>
              <span className="text-[9.5px] font-hero font-bold text-[#041E17] dark:text-slate-200 uppercase tracking-wider ml-1 max-w-[95px] truncate hidden sm:inline-block">
                {SLIDES[activeIndex]?.title}
              </span>
            </div>

            <button
              type="button"
              onClick={() => scrollToSlide(activeIndex + 1)}
              disabled={activeIndex === SLIDES.length - 1}
              aria-label="Bagian Berikutnya"
              className="flex h-8 w-8 items-center justify-center rounded-full neu-btn text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer"
            >
              <ChevronDown className="h-4 w-4 stroke-[2.2]" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
