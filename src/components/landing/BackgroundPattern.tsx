'use client';

import React from 'react';

export function BackgroundPattern() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* 1. Base Canvas: Crisp Pure White (Light) / Deep Obsidian Midnight (Dark) */}
      <div className="absolute inset-0 bg-white dark:bg-[#05110E] pointer-events-none transition-colors duration-500" />

      {/* 2. Ambient Glow Orbs */}
      <div className="block dark:hidden absolute bottom-[18%] left-1/2 -translate-x-1/2 w-[820px] max-w-[92vw] h-[420px] rounded-full bg-gradient-to-t from-cyan-100/40 via-sky-50/25 to-transparent blur-[120px] pointer-events-none" />
      <div className="hidden dark:block absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[860px] max-w-[92vw] h-[440px] rounded-full bg-gradient-to-t from-[#C8A253]/12 via-sky-500/6 to-transparent blur-[140px] pointer-events-none" />

      {/* 3. Subtle Editorial Dot Grid */}
      <div
        className="block dark:hidden absolute inset-0 opacity-[0.024] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#041E17 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }}
      />
      <div
        className="hidden dark:block absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(200, 162, 83, 0.45) 1px, transparent 1px)`,
          backgroundSize: '38px 38px',
        }}
      />

      {/* 4. Siluet Pendopo Kantor Kecamatan Gandrungmangu (Light & Dark Mode — Utuh Tanpa Terpotong) */}
      <div className="absolute bottom-0 left-0 right-0 w-full h-[46vh] sm:h-[56vh] lg:h-[64vh] max-h-[680px] px-2 sm:px-6 pointer-events-none flex items-end justify-center overflow-hidden">
        <div
          className="block dark:hidden w-full h-full max-w-[1600px] mx-auto opacity-[0.12] bg-no-repeat bg-bottom bg-contain"
          style={{ backgroundImage: "url('/images/gandrungmangu-pendopo-silhouette-light.webp')" }}
        />
        <div
          className="hidden dark:block w-full h-full max-w-[1600px] mx-auto opacity-[0.11] bg-no-repeat bg-bottom bg-contain"
          style={{ backgroundImage: "url('/images/gandrungmangu-pendopo-silhouette-dark.webp')" }}
        />
      </div>

      {/* 5. Bottom Horizon Vignette */}
      <div className="absolute bottom-0 inset-x-0 h-20 sm:h-28 bg-gradient-to-t from-white dark:from-[#05110E] to-transparent pointer-events-none" />
    </div>
  );
}
