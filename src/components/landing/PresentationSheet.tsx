'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { EASE_OUT_EXPO, VIEWPORT_ONCE } from './motion-variants';
import { cn } from '@/lib/utils';

interface CardSilhouetteOverlayProps {
  pattern?: 'village' | 'waves' | 'geometric';
  className?: string;
}

export function CardSilhouetteOverlay({
  pattern = 'village',
  className,
}: CardSilhouetteOverlayProps) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden select-none', className)}
      aria-hidden="true"
    >
      {/* Ambient Cyan/Sky Glow Orbs */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#E5C882]/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-[#E5C882]/10 blur-3xl" />

      {/* Micro Dot Matrix Pattern */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.85) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Siluet Tugu Kecamatan Gandrungmangu (Proporsional Mengikuti Tinggi Kartu, Tidak Terpotong) */}
      <div
        className="absolute inset-x-4 sm:inset-x-6 bottom-2 top-3 sm:bottom-3 sm:top-4 opacity-[0.16] bg-no-repeat bg-right-bottom bg-contain"
        style={{
          backgroundImage: "url('/images/tugu-gandrungmangu-silhouette.webp')",
        }}
      />

      {pattern === 'village' && (
        <svg
          viewBox="0 0 240 240"
          fill="none"
          aria-hidden="true"
          className="absolute -top-12 -right-12 w-56 h-56 text-white/[0.08]"
        >
          <circle cx="120" cy="120" r="96" stroke="currentColor" strokeWidth="1.2" strokeDasharray="6 6" />
          <circle cx="120" cy="120" r="64" stroke="currentColor" strokeWidth="1" />
        </svg>
      )}

      {pattern === 'waves' && (
        <svg
          viewBox="0 0 1200 320"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute bottom-0 inset-x-0 w-full h-40 sm:h-52 text-white/[0.09]"
        >
          <path
            d="M0,192 C220,120 420,260 660,180 C880,105 1040,150 1200,110 L1200,320 L0,320 Z"
            fill="currentColor"
          />
          <path
            d="M0,240 C280,170 520,290 780,210 C980,150 1100,200 1200,180 L1200,320 L0,320 Z"
            fill="currentColor"
            fillOpacity="0.65"
          />
          <path
            d="M0,145 C260,85 480,220 740,140 C940,78 1090,125 1200,90"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
        </svg>
      )}

      {pattern === 'geometric' && (
        <svg
          viewBox="0 0 600 300"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full text-white/[0.07]"
        >
          <path d="M380 0 L600 0 L600 300 L260 300 Z" fill="currentColor" />
          <circle cx="520" cy="70" r="85" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.9" />
          <circle cx="520" cy="70" r="52" stroke="currentColor" strokeWidth="1" strokeDasharray="4 5" strokeOpacity="0.9" />
          <path d="M0 245 Q180 190 360 255 T600 225" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.8" />
        </svg>
      )}
    </div>
  );
}

interface PresentationSheetProps {
  id?: string;
  sectionNumber: string;
  deckLabel: string;
  variant?: 'light' | 'ocean';
  silhouette?: 'village' | 'waves' | 'geometric';
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
  noPadding?: boolean;
}

export function PresentationSheet({
  id,
  sectionNumber,
  deckLabel,
  variant = 'light',
  silhouette = 'village',
  className,
  innerClassName,
  children,
  noPadding = false,
}: PresentationSheetProps) {
  const isOcean = variant === 'ocean';

  return (
    <section
      id={id}
      className={cn(
        'relative mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 py-3.5 sm:py-5 scroll-mt-20 sm:scroll-mt-24 snap-section',
        className
      )}
    >
      <motion.div
        initial={false}
        whileInView={{ opacity: 1 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
        className={cn(
          'relative overflow-hidden rounded-[24px] sm:rounded-[32px] transition-colors duration-300',
          isOcean
            ? 'bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#04231B] text-white border border-[#C8A253]/20 shadow-[0_22px_60px_rgba(4,30,23,0.2)]'
            : 'bg-white dark:bg-[#0A1F1A] text-[#041E17] dark:text-slate-100 border border-slate-200/90 dark:border-white/10 shadow-[0_12px_40px_rgba(4,30,23,0.06)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.48)]',
          !noPadding && 'p-5 sm:p-8 lg:p-10',
          innerClassName
        )}
      >
        {isOcean ? (
          <CardSilhouetteOverlay pattern={silhouette} />
        ) : (
          <div className="pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden="true">
            <div
              className="block dark:hidden absolute inset-x-4 sm:inset-x-6 bottom-2 top-6 opacity-[0.06] bg-no-repeat bg-right-bottom bg-contain"
              style={{ backgroundImage: "url('/images/tugu-gandrungmangu-silhouette-dark.webp')" }}
            />
            <div
              className="hidden dark:block absolute inset-x-4 sm:inset-x-6 bottom-2 top-6 opacity-[0.08] bg-no-repeat bg-right-bottom bg-contain"
              style={{ backgroundImage: "url('/images/tugu-gandrungmangu-silhouette.webp')" }}
            />
          </div>
        )}

        {/* Running Deck Header Bar */}
        <div
          className={cn(
            'relative z-10 flex items-center justify-between gap-3 pb-4 mb-5 sm:mb-7 border-b',
            noPadding && 'px-5 sm:px-8 lg:px-10 pt-5 sm:pt-7',
            isOcean
              ? 'border-white/15'
              : 'border-slate-200/80 dark:border-white/10'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full shrink-0',
                isOcean
                  ? 'bg-[#C8A253] shadow-[0_0_8px_rgba(200,162,83,0.6)]'
                  : 'bg-[#065F46] dark:bg-[#C8A253]'
              )}
            />
            <span
              className={cn(
                'font-hero text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.14em] truncate',
                isOcean
                  ? 'text-[#F5E9CC]/90'
                  : 'text-[#041E17]/80 dark:text-slate-300'
              )}
            >
              Kecamatan Gandrungmangu
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                'font-mono text-[10px] font-semibold tracking-[0.14em]',
                isOcean ? 'text-[#E5C882]' : 'text-slate-600 dark:text-slate-300'
              )}
            >
              {sectionNumber}
            </span>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full font-hero text-[9.5px] sm:text-[10px] font-semibold tracking-[0.06em]',
                isOcean
                  ? 'bg-white/15 text-white border border-white/20 backdrop-blur-xs'
                  : 'bg-[#F3EFE6] dark:bg-[#064E3B]/60 text-[#064E3B] dark:text-[#E5C882]'
              )}
            >
              {deckLabel}
            </span>
          </div>
        </div>

        <div className="relative z-10">{children}</div>
      </motion.div>
    </section>
  );
}
