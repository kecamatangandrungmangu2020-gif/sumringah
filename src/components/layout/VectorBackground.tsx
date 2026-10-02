"use client";

import React from "react";

/**
 * VectorBackground: Komponen Latar Belakang Vektor 3D Modern
 * Menghasilkan kurva organik 3D berdimensi halus (kiri & atas)
 * serta jaring gelombang titik parametrik (kanan & bawah)
 * sesuai dengan referensi visual pengguna.
 */
export function VectorBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none print:hidden d-print-none"
      style={{ printColorAdjust: 'exact' }}
    >
      {/* ── 1. Gradient Base Layer ────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff] via-[#f8fafc] to-[#f1f5f9] dark:from-[#080e1a] dark:via-[#0e1728] dark:to-[#0a1220] transition-colors duration-500" />

      {/* ── 2. Subtle Radial Ambient Lighting ─────────────────────── */}
      <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-600/[0.035] dark:bg-blue-500/[0.04] blur-[120px]" />
      <div className="absolute top-[40%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-sky-600/[0.03] dark:bg-sky-400/[0.035] blur-[140px]" />
      <div className="absolute -bottom-[10%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-amber-400/[0.02] dark:bg-amber-300/[0.025] blur-[100px]" />

      {/* ── 3. High-Definition Vector Curves & Dotted Mesh SVG ──────── */}
      <svg
        className="absolute inset-0 w-full h-full object-cover"
        viewBox="0 0 1920 1080"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients untuk Pita Kurva 3D Putih/Platinum (Light) & Biru Samudera Safir Obsidian (Dark) */}
          <linearGradient id="ribbonGrad1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" className="dark:stop-color-[#0e1e32]" />
            <stop offset="50%" stopColor="#f3f4f6" stopOpacity="0.75" className="dark:stop-color-[#0a1728]" />
            <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0.4" className="dark:stop-color-[#070f1a]" />
          </linearGradient>

          <linearGradient id="ribbonGrad2" x1="0" y1="0" x2="1" y2="0.8">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" className="dark:stop-color-[#142944]" />
            <stop offset="60%" stopColor="#f1f5f9" stopOpacity="0.6" className="dark:stop-color-[#0d1d32]" />
            <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.25" className="dark:stop-color-[#081220]" />
          </linearGradient>

          <linearGradient id="ribbonGrad3" x1="0" y1="0.2" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" className="dark:stop-color-[#102238]" />
            <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.1" className="dark:stop-color-[#081220]" />
          </linearGradient>

          {/* Bayangan Halus untuk Dimensi 3D Layering */}
          <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="15" dy="25" stdDeviation="30" floodColor="#0f172a" floodOpacity="0.04" className="dark:flood-color-[#000000] dark:flood-opacity-30" />
          </filter>

          <filter id="meshShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="8" dy="12" stdDeviation="16" floodColor="#0f172a" floodOpacity="0.02" />
          </filter>

          {/* Pola Titik Parametrik Mikro untuk Gelombang Jaring Kawat */}
          <pattern id="dotPattern" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#94a3b8" fillOpacity="0.35" className="dark:fill-[#38bdf8] dark:fill-opacity-25" />
            <circle cx="10" cy="10" r="0.9" fill="#94a3b8" fillOpacity="0.2" className="dark:fill-[#38bdf8] dark:fill-opacity-15" />
          </pattern>
        </defs>

        {/* ── Lapisan Kurva 3D 1: Lengkungan Utama Kiri Atas ──────────────── */}
        <path
          d="M-150 -100 C 350 120, 700 380, 850 820 C 950 1120, 600 1300, 300 1400 L -200 1400 Z"
          fill="url(#ribbonGrad1)"
          filter="url(#softShadow)"
        />

        {/* ── Lapisan Kurva 3D 2: Lengkungan Kedua (Kedalaman Lapisan) ──────── */}
        <path
          d="M-100 -200 C 450 60, 820 320, 1050 720 C 1200 1020, 950 1250, 700 1350 L -200 1350 Z"
          fill="url(#ribbonGrad2)"
          filter="url(#softShadow)"
          opacity="0.9"
        />

        {/* ── Lapisan Kurva 3D 3: Sapuan Halus Tengah ──────────────────────── */}
        <path
          d="M-50 -300 C 600 0, 980 260, 1250 620 C 1450 920, 1300 1150, 1050 1300 L -200 1300 Z"
          fill="url(#ribbonGrad3)"
          filter="url(#softShadow)"
          opacity="0.8"
        />

        {/* ── Garis Kontur Halus (Stroke Accent) ─────────────────────────── */}
        <path
          d="M-150 -100 C 350 120, 700 380, 850 820 C 950 1120, 600 1300, 300 1400"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeOpacity="0.8"
          fill="none"
          className="dark:stroke-[#1e3a63] dark:stroke-opacity-40"
        />
        <path
          d="M-100 -200 C 450 60, 820 320, 1050 720 C 1200 1020, 950 1250, 700 1350"
          stroke="#ffffff"
          strokeWidth="2"
          strokeOpacity="0.6"
          fill="none"
          className="dark:stroke-[#1e3a63] dark:stroke-opacity-30"
        />

        {/* ── Jaring Kawat Titik Parametrik (3D Dotted Mesh Wave di Kanan) ─── */}
        <g filter="url(#meshShadow)" opacity="0.85">
          {/* Jalur Gelombang Titik 1 */}
          <path
            d="M 1100 1150 C 1200 850, 1450 650, 1680 520 C 1850 420, 1950 380, 2050 350"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="2 10"
            strokeOpacity="0.45"
            fill="none"
            className="dark:stroke-[#38bdf8] dark:stroke-opacity-30"
          />
          <path
            d="M 1140 1170 C 1240 880, 1480 680, 1710 550 C 1880 450, 1980 410, 2080 380"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="2 10"
            strokeOpacity="0.42"
            fill="none"
            className="dark:stroke-[#38bdf8] dark:stroke-opacity-28"
          />
          <path
            d="M 1180 1190 C 1280 910, 1510 710, 1740 580 C 1910 480, 2010 440, 2110 410"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="2 10"
            strokeOpacity="0.39"
            fill="none"
            className="dark:stroke-[#38bdf8] dark:stroke-opacity-26"
          />
          <path
            d="M 1220 1210 C 1320 940, 1540 740, 1770 610 C 1940 510, 2040 470, 2140 440"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="2 10"
            strokeOpacity="0.36"
            fill="none"
            className="dark:stroke-[#38bdf8] dark:stroke-opacity-24"
          />
          <path
            d="M 1260 1230 C 1360 970, 1570 770, 1800 640 C 1970 540, 2070 500, 2170 470"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="2 10"
            strokeOpacity="0.33"
            fill="none"
            className="dark:stroke-[#38bdf8] dark:stroke-opacity-22"
          />

          {/* Gelombang Pola Silang (Cross-contour wave ribbons) */}
          <path
            d="M 1000 700 C 1180 620, 1420 660, 1620 780 C 1820 900, 1980 940, 2100 950"
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeDasharray="2 8"
            strokeOpacity="0.35"
            fill="none"
            className="dark:stroke-[#38bdf8] dark:stroke-opacity-25"
          />
          <path
            d="M 980 740 C 1160 660, 1400 700, 1600 820 C 1800 940, 1960 980, 2080 990"
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeDasharray="2 8"
            strokeOpacity="0.32"
            fill="none"
            className="dark:stroke-[#38bdf8] dark:stroke-opacity-22"
          />
          <path
            d="M 960 780 C 1140 700, 1380 740, 1580 860 C 1780 980, 1940 1020, 2060 1030"
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeDasharray="2 8"
            strokeOpacity="0.29"
            fill="none"
            className="dark:stroke-[#38bdf8] dark:stroke-opacity-20"
          />
          <path
            d="M 940 820 C 1120 740, 1360 780, 1560 900 C 1760 1020, 1920 1060, 2040 1070"
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeDasharray="2 8"
            strokeOpacity="0.26"
            fill="none"
            className="dark:stroke-[#38bdf8] dark:stroke-opacity-18"
          />

          {/* Area Pola Titik Terisi (Filled Mesh Contour) */}
          <path
            d="M 1250 1150 C 1400 850, 1600 680, 1850 560 C 1980 500, 2100 480, 2200 480 L 2200 1200 L 1250 1200 Z"
            fill="url(#dotPattern)"
            opacity="0.6"
          />
        </g>
      </svg>
    </div>
  );
}
export default VectorBackground;
