'use client';

import React from 'react';

/**
 * ── KOMPONEN DASAR: WHITE ABSTRACT WAVE VECTOR ──────────────────────────────
 * Mengimplementasikan gaya visual sesuai referensi gambar yang dikirimkan:
 * - Latar belakang putih bersih dengan gelombang kurva perak/abu-abu halus (silver-white waves).
 * - Garis aksen lengkung tipis berkilau (crisp subtle highlight lines).
 * - Efek flare cahaya lembut (soft radiant glow).
 * - DILENGKAPI MASK & FEATHERING GRADIENT: Menghilangkan garis terpotong di batas atas dan bawah,
 *   sehingga menyatu 100% mulus (seamless) dengan Hero section & seksi sekitarnya.
 */
export function WhiteWaveVector({
  flip = false,
  className = '',
  opacity = 'opacity-85',
  topFade = true,
  bottomFade = true,
}: {
  flip?: boolean;
  className?: string;
  opacity?: string;
  topFade?: boolean;
  bottomFade?: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden z-0 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Container Gambar Vektor Gelombang Putih dengan Mask Alus (Tanpa garis terpotong) */}
      <div
        className="absolute inset-0"
        style={{
          maskImage:
            topFade && bottomFade
              ? 'linear-gradient(to bottom, transparent 0%, black 160px, black calc(100% - 140px), transparent 100%)'
              : topFade
              ? 'linear-gradient(to bottom, transparent 0%, black 160px, black 100%)'
              : bottomFade
              ? 'linear-gradient(to bottom, black 0%, black calc(100% - 140px), transparent 100%)'
              : undefined,
          WebkitMaskImage:
            topFade && bottomFade
              ? 'linear-gradient(to bottom, transparent 0%, black 160px, black calc(100% - 140px), transparent 100%)'
              : topFade
              ? 'linear-gradient(to bottom, transparent 0%, black 160px, black 100%)'
              : bottomFade
              ? 'linear-gradient(to bottom, black 0%, black calc(100% - 140px), transparent 100%)'
              : undefined,
        }}
      >
        {/* Gambar Asli Referensi Vektor Gelombang Putih 3D Lembut */}
        <div
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ${opacity} ${
            flip ? 'scale-x-[-1]' : ''
          }`}
          style={{ backgroundImage: `url('/img/bg-vector-white.png')` }}
        />
      </div>

      {/* Lapisan Gradasi Lembut Pembaur Transisi Atas & Bawah (Anti-Garis Terpotong) */}
      {topFade && (
        <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-[#FAF9F5] via-[#FAF9F5]/80 to-transparent pointer-events-none z-[1]" />
      )}
      {bottomFade && (
        <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-[#FAF9F5] via-[#FAF9F5]/80 to-transparent pointer-events-none z-[1]" />
      )}
    </div>
  );
}

/**
 * ── 1. LAYANAN VECTOR TRACK (TRACK KARTU MELAYANG) ───────────────────────────
 * Ditiadakan garis artificial agar 5 lencana tampil bersih, rapi, tanpa garis terpotong.
 */
export function LayananVectorTrack() {
  return null;
}

/**
 * ── 2. INFORMASI TERKINI VECTOR BACKGROUND ───────────────────────────────────
 * Menggunakan latar belakang kurva gelombang putih/perak elegan sesuai referensi,
 * dilengkapi topFade dan bottomFade agar transisi dari Hero/Layanan 100% mulus tanpa garis terpotong.
 */
export function InformasiVectorBackground() {
  return <WhiteWaveVector flip={true} opacity="opacity-80" topFade={true} bottomFade={true} />;
}

/**
 * ── 3. AGENDA KEGIATAN VECTOR BACKGROUND ─────────────────────────────────────
 * Menggunakan latar belakang kurva gelombang putih/perak elegan sesuai referensi.
 */
export function AgendaVectorBackground() {
  return <WhiteWaveVector flip={false} opacity="opacity-75" topFade={true} bottomFade={true} />;
}

/**
 * ── 4. WILAYAH GEOSPASIAL VECTOR RADAR & GRID ────────────────────────────────
 * Ditampilkan pada seksi bertema gelap "Wilayah Gandrungmangu".
 */
export function WilayahVectorGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1] opacity-35" aria-hidden="true">
      {/* Grid Koordinat Lintang & Bujur Sangat Halus */}
      <svg className="absolute inset-0 w-full h-full opacity-6" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="wilayah-geo-grid-clean" width="60" height="60" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="60" y2="0" stroke="#38BDF8" strokeWidth="0.5" />
            <line x1="0" y1="0" x2="0" y2="60" stroke="#38BDF8" strokeWidth="0.5" />
            <circle cx="0" cy="0" r="1" fill="#38BDF8" fillOpacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wilayah-geo-grid-clean)" />
      </svg>

      {/* Radar Geodetik Konsentris (Transparan & Elegan) */}
      <svg
        className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[720px] h-[720px] text-sky-400/20"
        viewBox="0 0 720 720"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="360" cy="360" r="340" stroke="currentColor" strokeWidth="0.8" strokeDasharray="5 7" strokeOpacity="0.2" />
        <circle cx="360" cy="360" r="260" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 5" strokeOpacity="0.18" />
        <circle cx="360" cy="360" r="180" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.22" />
        <circle cx="360" cy="360" r="100" stroke="currentColor" strokeWidth="0.9" strokeDasharray="3 4" strokeOpacity="0.25" />
        <circle cx="360" cy="360" r="30" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
        <circle cx="360" cy="360" r="3" fill="#38BDF8" fillOpacity="0.35" />

        <line x1="360" y1="0" x2="360" y2="720" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.15" strokeDasharray="8 6" />
        <line x1="0" y1="360" x2="720" y2="360" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.15" strokeDasharray="8 6" />

        <text x="366" y="32" fill="#38BDF8" fontSize="9" fontFamily="monospace" opacity="0.35">000° N</text>
        <text x="664" y="356" fill="#38BDF8" fontSize="9" fontFamily="monospace" opacity="0.35">090° E</text>
        <text x="366" y="700" fill="#38BDF8" fontSize="9" fontFamily="monospace" opacity="0.35">180° S</text>
        <text x="14" y="356" fill="#38BDF8" fontSize="9" fontFamily="monospace" opacity="0.35">270° W</text>
      </svg>
    </div>
  );
}

/**
 * ── 5. PENGADUAN & INFORMASI VECTOR BACKGROUND ───────────────────────────────
 * Menghadirkan latar belakang gelombang vektor putih/perak persis seperti gambar referensi.
 */
export function PengaduanVectorBackground() {
  return <WhiteWaveVector flip={false} opacity="opacity-90" topFade={true} bottomFade={true} />;
}

/**
 * ── 6. FOOTER VECTOR DECORATIONS ─────────────────────────────────────────────
 * Garis batas kontur topografi malam pada footer gelap.
 */
export function FooterVectorDecorations() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      <svg
        className="absolute top-0 left-0 w-full h-24 text-sky-400/20"
        viewBox="0 0 1440 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M0,32 C320,80 580,10 960,56 C1240,90 1380,20 1440,40"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 4"
        />
      </svg>
    </div>
  );
}
