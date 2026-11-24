'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_WIPE: [number, number, number, number] = [0.76, 0, 0.24, 1];

export type SlideLayoutMode = 'center-banner' | 'text-left' | 'text-right';

export interface StripSpec {
  left: number;
  width: number;
  top: number;
  height: number;
  from: 'top' | 'bottom';
  delay: number;
  frameStyle: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  hasAccentBar?: 'left' | 'right';
  glassCap?: 'top' | 'bottom';
}

const STRIPS_RIGHT_PRESET: StripSpec[] = [
  { left: 0, width: 17.8, top: 22, height: 64, from: 'bottom', delay: 0.06, frameStyle: 'top-left', hasAccentBar: 'left' },
  { left: 20.5, width: 17.8, top: 32, height: 62, from: 'top', delay: 0.12, frameStyle: 'bottom-right', glassCap: 'top' },
  { left: 41, width: 17.8, top: 14, height: 74, from: 'bottom', delay: 0.18, frameStyle: 'top-left' },
  { left: 61.5, width: 17.8, top: 4, height: 82, from: 'top', delay: 0.24, frameStyle: 'top-right', glassCap: 'bottom' },
  { left: 82, width: 18, top: 20, height: 62, from: 'bottom', delay: 0.3, frameStyle: 'bottom-right', hasAccentBar: 'right' },
];

const STRIPS_LEFT_PRESET: StripSpec[] = [
  { left: 0, width: 18, top: 18, height: 66, from: 'top', delay: 0.06, frameStyle: 'top-left' },
  { left: 20.5, width: 17.8, top: 6, height: 78, from: 'bottom', delay: 0.12, frameStyle: 'top-right', glassCap: 'bottom' },
  { left: 41, width: 17.8, top: 24, height: 68, from: 'top', delay: 0.18, frameStyle: 'bottom-left' },
  { left: 61.5, width: 17.8, top: 10, height: 76, from: 'bottom', delay: 0.24, frameStyle: 'top-right', hasAccentBar: 'right', glassCap: 'top' },
  { left: 82, width: 18, top: 28, height: 56, from: 'top', delay: 0.3, frameStyle: 'bottom-right' },
];

const CENTER_COLUMNS = [
  { left: 0, width: 20.2, from: 'top' as const, delay: 0.04 },
  { left: 20, width: 20.2, from: 'bottom' as const, delay: 0.1 },
  { left: 40, width: 20.2, from: 'top' as const, delay: 0.16 },
  { left: 60, width: 20.2, from: 'bottom' as const, delay: 0.22 },
  { left: 80, width: 20.2, from: 'top' as const, delay: 0.28 },
];

const KEEP_UPPERCASE = new Set([
  'UMKM', 'SOLID', 'KTP', 'KK', 'RT', 'RW', 'APBD', 'HD', 'ID', 'WIB', 'SEMRINGAH', 'SPPD',
]);

export function toCinematicTitleCase(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (/[a-z]/.test(trimmed)) return trimmed;
  return trimmed
    .split(/\s+/)
    .map((word) => {
      const clean = word.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
      if (KEEP_UPPERCASE.has(clean)) return word.toUpperCase();
      if (word.length <= 1) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function KineticScatterTitle({
  text,
  slideKey,
  align = 'left',
  size = 'side',
}: {
  text: string;
  slideKey: string | number;
  align?: 'left' | 'center' | 'right';
  size?: 'center' | 'side';
}) {
  const formatted = toCinematicTitleCase(text);
  const words = formatted.split(/\s+/).filter(Boolean);

  const getCharDelay = (wordIdx: number, charIdx: number) => {
    const hash = ((wordIdx + 1) * 37 + (charIdx + 1) * 19) % 13;
    return 0.2 + hash * 0.034;
  };

  const getCharOffsetX = (wordIdx: number, charIdx: number) => {
    const hash = ((wordIdx + 2) * 17 + (charIdx + 3) * 13) % 5;
    return (hash - 2) * 6;
  };

  const alignClass =
    align === 'center'
      ? 'justify-center text-center'
      : align === 'right'
        ? 'justify-end text-right'
        : 'justify-start text-left';

  const sizeClass =
    size === 'center'
      ? 'text-4xl sm:text-6xl md:text-7xl lg:text-[74px] xl:text-[84px] leading-[1.03] font-extrabold tracking-[-0.03em] drop-shadow-[0_8px_32px_rgba(0,0,0,0.72)]'
      : 'text-[26px] sm:text-[40px] lg:text-[44px] xl:text-[52px] leading-[1.08]';

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.h1
        key={`kinetic-title-${slideKey}`}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`font-hero font-bold text-white tracking-[-0.025em] drop-shadow-[0_4px_24px_rgba(3,20,30,0.5)] flex flex-wrap gap-x-[0.26em] gap-y-0.5 ${alignClass} ${sizeClass}`}
      >
        {words.map((word, wIdx) => (
          <span key={`${wIdx}-${word}`} className="inline-flex whitespace-nowrap">
            {Array.from(word).map((char, cIdx) => {
              const delay = getCharDelay(wIdx, cIdx);
              const offsetX = getCharOffsetX(wIdx, cIdx);
              return (
                <motion.span
                  key={`${wIdx}-${cIdx}`}
                  variants={{
                    hidden: {
                      opacity: 0,
                      x: offsetX,
                      filter: 'blur(7px)',
                      scale: 0.9,
                    },
                    visible: {
                      opacity: 1,
                      x: 0,
                      filter: 'blur(0px)',
                      scale: 1,
                      transition: {
                        duration: 0.4,
                        delay,
                        ease: EASE_CINEMATIC,
                      },
                    },
                    exit: {
                      opacity: 0,
                      x: -offsetX * 0.5,
                      filter: 'blur(4px)',
                      transition: {
                        duration: 0.22,
                        delay: (cIdx % 5) * 0.018,
                        ease: 'easeIn',
                      },
                    },
                  }}
                  className="inline-block will-change-transform"
                >
                  {char}
                </motion.span>
              );
            })}
          </span>
        ))}
      </motion.h1>
    </AnimatePresence>
  );
}

export function AnamorphicTransitionWipe({
  transitionKey,
  direction = 'next',
}: {
  transitionKey: string | number;
  direction?: 'next' | 'prev';
}) {
  const dir = direction === 'next' ? 1 : -1;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`wipe-burst-${transitionKey}`}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9, delay: 0.18, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <motion.div
            initial={{ x: `${-110 * dir}%`, skewX: -18, opacity: 0.55 }}
            animate={{ x: `${130 * dir}%`, skewX: -18, opacity: 0 }}
            transition={{ duration: 0.72, ease: EASE_WIPE }}
            className="absolute -inset-y-10 left-0 w-[38%] bg-gradient-to-r from-transparent via-cyan-200/30 to-white/20 backdrop-blur-md border-x border-white/20"
          />

          <motion.div
            initial={{ x: `${-115 * dir}%`, opacity: 0.72 }}
            animate={{ x: `${125 * dir}%`, opacity: 0 }}
            transition={{ duration: 0.74, ease: EASE_WIPE }}
            className="absolute top-[14%] left-0 h-[16%] w-[62%] bg-gradient-to-r from-transparent via-cyan-300/35 to-white/25 backdrop-blur-md border-y border-white/25"
          />

          <motion.div
            initial={{ x: `${115 * dir}%`, opacity: 0.68 }}
            animate={{ x: `${-125 * dir}%`, opacity: 0 }}
            transition={{ duration: 0.78, delay: 0.04, ease: EASE_WIPE }}
            className="absolute bottom-[18%] right-0 h-[19%] w-[56%] bg-gradient-to-l from-transparent via-sky-300/30 to-cyan-200/20 backdrop-blur-md border-y border-white/20"
          />

          <motion.div
            initial={{ scaleX: 0.15, opacity: 0, x: `${-22 * dir}%` }}
            animate={{
              scaleX: [0.2, 1.45, 1.9],
              opacity: [0, 1, 0],
              x: [`${-18 * dir}%`, `${4 * dir}%`, `${26 * dir}%`],
            }}
            transition={{ duration: 0.82, ease: EASE_CINEMATIC }}
            className="absolute top-[48%] -translate-y-1/2 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_26px_8px_rgba(34,211,238,0.85)]"
          />

          <motion.div
            initial={{ scale: 0.35, opacity: 0, x: `${-12 * dir}%` }}
            animate={{
              scale: [0.45, 1.3, 0.85],
              opacity: [0, 0.9, 0],
              x: [`${-6 * dir}%`, `${14 * dir}%`, `${32 * dir}%`],
            }}
            transition={{ duration: 0.82, ease: EASE_CINEMATIC }}
            className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-20 rounded-full bg-cyan-200/50 blur-2xl"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function VerticalPhotoStrips({
  imageUrl,
  alt,
  slideKey,
  side,
  activeIndex,
  metricValue,
}: {
  imageUrl: string;
  alt: string;
  slideKey: string | number;
  side: 'left' | 'right';
  activeIndex: number;
  metricValue: string;
}) {
  const strips = side === 'right' ? STRIPS_RIGHT_PRESET : STRIPS_LEFT_PRESET;

  return (
    <div className="relative w-full h-[185px] sm:h-[300px] md:h-[340px] lg:h-[min(54vh,435px)] xl:h-[min(58vh,485px)]">
      <motion.div
        key={`strip-metric-${activeIndex}`}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.38, ease: EASE_CINEMATIC }}
        className={`hidden lg:flex items-center gap-2 absolute z-30 pointer-events-none ${
          side === 'right' ? 'top-[2%] left-[2%]' : 'top-[2%] right-[2%] flex-row-reverse'
        }`}
      >
        <span className="h-2 w-2 rounded-full border border-white/90 bg-cyan-300/40" />
        <span className="h-[1px] w-7 bg-white/55" />
        <span className="font-mono text-[10.5px] font-medium text-white/90 tabular-nums drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
          {metricValue}
        </span>
      </motion.div>

      <AnimatePresence mode="popLayout">
        <motion.div
          key={`strips-group-${slideKey}-${side}`}
          className="absolute inset-0"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
        >
          {strips.map((strip, idx) => {
            const innerWidthPct = (100 / strip.width) * 100;
            const innerHeightPct = (100 / strip.height) * 100;
            const innerLeftPct = -(strip.left / strip.width) * 100;
            const innerTopPct = -(strip.top / strip.height) * 100;

            const frameClass =
              strip.frameStyle === 'top-left'
                ? '-translate-x-1.5 -translate-y-1.5 sm:-translate-x-2 sm:-translate-y-2 border-t border-l border-r border-white/85'
                : strip.frameStyle === 'top-right'
                  ? 'translate-x-1.5 -translate-y-1.5 sm:translate-x-2 sm:-translate-y-2 border-t border-r border-l border-white/85'
                  : strip.frameStyle === 'bottom-left'
                    ? '-translate-x-1.5 translate-y-1.5 sm:-translate-x-2 sm:translate-y-2 border-b border-l border-r border-white/80'
                    : 'translate-x-1.5 translate-y-1.5 sm:translate-x-2 sm:translate-y-2 border-b border-r border-l border-white/80';

            return (
              <motion.div
                key={`strip-${idx}`}
                style={{
                  left: `${strip.left}%`,
                  width: `${strip.width}%`,
                  top: `${strip.top}%`,
                  height: `${strip.height}%`,
                }}
                initial={{
                  y: strip.from === 'top' ? '-115%' : '115%',
                  opacity: 0,
                }}
                animate={{
                  y: '0%',
                  opacity: 1,
                }}
                exit={{
                  y: strip.from === 'top' ? '105%' : '-105%',
                  opacity: 0,
                  transition: {
                    duration: 0.45,
                    delay: idx * 0.028,
                    ease: EASE_WIPE,
                  },
                }}
                transition={{
                  duration: 0.88,
                  delay: strip.delay,
                  ease: EASE_CINEMATIC,
                }}
                className="absolute will-change-transform"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, delay: strip.delay + 0.22, ease: EASE_CINEMATIC }}
                  className={`pointer-events-none absolute inset-0 z-20 ${frameClass}`}
                />

                {strip.hasAccentBar && (
                  <motion.span
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    exit={{ scaleY: 0, opacity: 0 }}
                    transition={{ duration: 0.45, delay: strip.delay + 0.3, ease: EASE_CINEMATIC }}
                    className={`pointer-events-none absolute z-30 w-[4px] sm:w-[5px] h-8 sm:h-10 bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.7)] origin-top ${
                      strip.hasAccentBar === 'left'
                        ? '-left-2 sm:-left-2.5 top-3'
                        : '-right-2 sm:-right-2.5 bottom-5'
                    }`}
                  />
                )}

                <div className="relative w-full h-full overflow-hidden shadow-[0_18px_42px_rgba(3,20,30,0.5)] bg-[#0a3040]">
                  <motion.div
                    initial={{ scale: 1.09 }}
                    animate={{ scale: 1.01 }}
                    transition={{ duration: 6.5, ease: 'easeOut' }}
                    style={{
                      width: `${innerWidthPct}%`,
                      height: `${innerHeightPct}%`,
                      left: `${innerLeftPct}%`,
                      top: `${innerTopPct}%`,
                    }}
                    className="absolute will-change-transform"
                  >
                    <Image
                      src={imageUrl}
                      alt={alt}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 95vw, 60vw"
                      className="object-cover object-center brightness-[1.04] contrast-[1.06]"
                    />
                  </motion.div>

                  {strip.glassCap && (
                    <div
                      className={`pointer-events-none absolute inset-x-0 h-[16%] bg-cyan-300/20 backdrop-blur-[1.5px] ${
                        strip.glassCap === 'top'
                          ? 'top-0 border-b border-white/25'
                          : 'bottom-0 border-t border-white/25'
                      }`}
                    />
                  )}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-cyan-950/20" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function CenterColumnsReveal({
  imageUrl,
  alt,
  slideKey,
  isVisible = true,
  videoUrl,
}: {
  imageUrl: string;
  alt: string;
  slideKey: string | number;
  isVisible?: boolean;
  videoUrl?: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        {isVisible && (
          <motion.div
            key={`center-cols-${slideKey}`}
            className="absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1, transition: { duration: 0.55 } }}
          >
            {videoUrl ? (
              <video
                autoPlay
                loop
                muted
                playsInline
                poster={imageUrl}
                className="absolute inset-0 w-full h-full object-cover object-center brightness-[0.82] contrast-[1.06]"
              >
                <source src={videoUrl} type="video/mp4" />
              </video>
            ) : (
              CENTER_COLUMNS.map((col, idx) => {
                const innerWidthPct = (100 / col.width) * 100;
                const innerLeftPct = -(col.left / col.width) * 100;
                return (
                  <motion.div
                    key={`col-${idx}`}
                    style={{ left: `${col.left}%`, width: `${col.width}%` }}
                    initial={{ y: col.from === 'top' ? '-105%' : '105%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    exit={{
                      y: col.from === 'top' ? '105%' : '-105%',
                      opacity: 0,
                      transition: { duration: 0.46, delay: idx * 0.028, ease: EASE_WIPE },
                    }}
                    transition={{ duration: 0.88, delay: col.delay, ease: EASE_CINEMATIC }}
                    className="absolute top-0 bottom-0 overflow-hidden border-r border-white/10 will-change-transform"
                  >
                    <motion.div
                      initial={{ scale: 1.07 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 7, ease: 'easeOut' }}
                      style={{ width: `${innerWidthPct}%`, left: `${innerLeftPct}%` }}
                      className="absolute top-0 bottom-0"
                    >
                      <Image
                        src={imageUrl}
                        alt={alt}
                        fill
                        unoptimized
                        sizes="100vw"
                        className="object-cover object-center brightness-[0.9] contrast-[1.05]"
                      />
                    </motion.div>
                  </motion.div>
                );
              })
            )}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.35 } }}
              className="absolute inset-0 bg-gradient-to-b from-[#041520]/65 via-[#062230]/25 to-[#041520]/75"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CinematicHudOverlay({
  activeIndex,
  totalSlides,
  layoutMode,
}: {
  activeIndex: number;
  totalSlides: number;
  layoutMode: SlideLayoutMode;
}) {
  const slideNumStr = String(activeIndex + 1).padStart(2, '0');
  const totalNumStr = String(totalSlides).padStart(2, '0');

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none">
      <motion.div
        key={`geo-circle-${activeIndex}`}
        initial={{ scale: 0.72, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.05, ease: EASE_CINEMATIC }}
        className={`hidden md:block absolute -top-12 w-32 h-32 lg:w-40 lg:h-40 rounded-full border border-white/20 bg-cyan-200/12 backdrop-blur-[2px] ${
          layoutMode === 'text-right' ? 'right-[20%]' : 'left-[16%]'
        }`}
      />

      <motion.div
        key={`geo-arc-${activeIndex}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: EASE_CINEMATIC }}
        className={`hidden lg:block absolute -bottom-24 w-[380px] h-[380px] rounded-full border-[24px] border-cyan-300/[0.06] ${
          layoutMode === 'text-right' ? '-right-20' : '-left-20'
        }`}
      />

      <motion.div
        key={`hud-idx-${activeIndex}`}
        initial={{ opacity: 0, x: layoutMode === 'text-right' ? 14 : -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, delay: 0.14, ease: EASE_CINEMATIC }}
        className={`hidden sm:flex items-center gap-2.5 absolute top-[72px] sm:top-[78px] ${
          layoutMode === 'text-right'
            ? 'right-12 lg:right-16 flex-row-reverse'
            : 'left-6 lg:left-12'
        }`}
      >
        <span className="h-[1px] w-10 sm:w-12 bg-white/60" />
        <span className="font-mono text-[11px] font-semibold tracking-[0.2em] text-white/95">
          {slideNumStr}
        </span>
        <span className="font-mono text-[10px] tracking-[0.18em] text-cyan-200/75">
          / {totalNumStr}
        </span>
      </motion.div>

      <div className="hidden xl:flex flex-col items-center gap-2 absolute left-4 top-1/2 -translate-y-1/2 text-white/65">
        <span className="font-mono text-[9px] tracking-[0.2em]">{slideNumStr}</span>
        <span className="w-[1px] h-10 bg-white/40" />
        <span
          className="font-mono text-[8.5px] uppercase tracking-[0.26em] text-cyan-100/80"
          style={{ writingMode: 'vertical-rl' }}
        >
          GANDRUNGMANGU
        </span>
      </div>
    </div>
  );
}

export function DottedMatrixBar({
  activeIndex,
  totalSlides,
  align = 'left',
}: {
  activeIndex: number;
  totalSlides: number;
  align?: 'left' | 'center';
}) {
  return (
    <div
      className={`flex items-center gap-1.5 shrink-0 ${
        align === 'center' ? 'justify-center' : 'justify-start'
      }`}
    >
      <span className="h-[3px] w-5 bg-cyan-300 rounded-full shadow-[0_0_10px_rgba(103,232,249,0.65)]" />
      <div className="flex items-center gap-1">
        {Array.from({ length: 8 }).map((_, i) => {
          const isLit = i <= ((activeIndex + 1) * Math.floor(8 / Math.max(totalSlides, 1))) - 1;
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0.25, scale: 0.8 }}
              animate={{
                opacity: isLit ? 0.95 : 0.35,
                scale: isLit ? 1 : 0.85,
              }}
              transition={{ duration: 0.35, delay: i * 0.03 }}
              className={`h-[3.5px] w-[3.5px] ${isLit ? 'bg-white' : 'bg-white/45'}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function BroadcastTimecode({ activeIndex }: { activeIndex: number }) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    setElapsedSec(0);
    const interval = setInterval(() => {
      setElapsedSec((prev) => (prev + 1) % 60);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeIndex]);

  const timecode = `+ 00:00:${String(elapsedSec).padStart(2, '0')}:${String((activeIndex * 7 + elapsedSec * 3) % 30).padStart(2, '0')} +`;

  return (
    <span className="inline-flex items-center font-mono text-[10px] tracking-[0.2em] text-cyan-100/85 tabular-nums">
      {timecode}
    </span>
  );
}
