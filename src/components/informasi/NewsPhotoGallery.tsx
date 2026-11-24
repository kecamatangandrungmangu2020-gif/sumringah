'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Images, Maximize2, Play } from 'lucide-react';
import { NewsImage } from '@/lib/types';

interface NewsPhotoGalleryProps {
  images?: (NewsImage | string)[];
  imageUrl?: string;
  youtubeVideoId?: string;
  title: string;
  mode?: 'card' | 'detail';
  className?: string;
}

export function normalizeImages(
  images?: (NewsImage | string)[],
  imageUrl?: string,
  youtubeVideoId?: string
): NewsImage[] {
  const result: NewsImage[] = [];

  if (Array.isArray(images) && images.length > 0) {
    images.forEach((img) => {
      if (typeof img === 'string' && img.trim()) {
        result.push({ url: img.trim() });
      } else if (img && typeof img === 'object' && img.url) {
        result.push(img);
      }
    });
  }

  if (result.length === 0 && imageUrl && imageUrl.trim()) {
    result.push({ url: imageUrl.trim() });
  }

  // Jika belum ada foto unggahan, tapi ada video YouTube, otomatis gunakan cuplikan thumbnail YouTube!
  if (result.length === 0 && youtubeVideoId && youtubeVideoId.trim()) {
    const yId = youtubeVideoId.trim();
    result.push({
      url: `https://img.youtube.com/vi/${yId}/hqdefault.jpg`,
      aspectRatio: 'landscape',
    });
  }

  return result;
}

export function NewsPhotoGallery({
  images,
  imageUrl,
  youtubeVideoId,
  title,
  mode = 'detail',
  className = '',
}: NewsPhotoGalleryProps) {
  const photoList = normalizeImages(images, imageUrl, youtubeVideoId);
  const [activeIndex, setActiveIndex] = useState(0);

  if (photoList.length === 0) {
    return null;
  }

  const currentPhoto = photoList[activeIndex] || photoList[0];

  // Helper untuk deteksi rasio portrait
  const isPortrait =
    currentPhoto.aspectRatio === 'portrait' ||
    (currentPhoto.width &&
      currentPhoto.height &&
      currentPhoto.height > currentPhoto.width);

  // ── MODE 1: TAMPILAN KARTU (CARD / PREVIEW LIST) ───────────────────────────
  if (mode === 'card') {
    const mainPhoto = photoList[0];
    const isMainPortrait =
      mainPhoto.aspectRatio === 'portrait' ||
      (mainPhoto.width && mainPhoto.height && mainPhoto.height > mainPhoto.width);

    return (
      <div
        className={`relative w-full h-[220px] sm:h-[260px] bg-slate-950/5 flex items-center justify-center overflow-hidden rounded-2xl ${className}`}
      >
        {/* Ambient Blur Backdrop jika foto Portrait atau Landscape agar serasi */}
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-30 scale-125 transition-transform duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${mainPhoto.url})` }}
        />

        {/* Gambar Utama (Uncropped, menjaga aspect ratio asli landscape/portrait) */}
        <img
          src={mainPhoto.url}
          alt={title}
          className={`relative z-10 max-h-full max-w-full w-auto h-auto object-contain transition-transform duration-500 group-hover:scale-105 shadow-sm rounded-lg ${
            isMainPortrait ? 'max-h-[94%]' : 'w-full object-cover'
          }`}
          loading="lazy"
        />

        {/* Tombol Play Overlay jika cuplikan berasal dari video YouTube */}
        {youtubeVideoId && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-xl backdrop-blur-sm group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Badge Jumlah Foto jika Lebih dari 1 Foto */}
        {photoList.length > 1 && (
          <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wider flex items-center gap-1.5 shadow-md border border-white/20">
            <Images className="w-3.5 h-3.5 text-amber-400" />
            <span>{photoList.length} Foto</span>
          </div>
        )}
      </div>
    );
  }

  // ── MODE 2: TAMPILAN DETAIL LENGKAP (MODAL / HALAMAN BERITA) ───────────────
  return (
    <div className={`space-y-3 w-full ${className}`}>
      {/* Frame Tampilan Foto Utama Aktif */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950/10 border border-slate-200/80 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[380px] max-h-[560px] p-2 sm:p-4">
        {/* Ambient Backdrop Blur */}
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-35 scale-110 pointer-events-none transition-all duration-500"
          style={{ backgroundImage: `url(${currentPhoto.url})` }}
        />

        {/* Foto Aktif: Sesuai Rasio Asli (Landscape melebar, Portrait memanjang ke atas) */}
        <div className="relative z-10 w-full flex items-center justify-center h-full max-h-[500px]">
          <img
            src={currentPhoto.url}
            alt={`${title} - Foto ${activeIndex + 1}`}
            className="max-h-[500px] w-auto max-w-full object-contain mx-auto rounded-xl shadow-lg transition-all duration-300"
          />
        </div>

        {/* Tombol Navigasi Kiri / Kanan jika Lebih Dari 1 Foto */}
        {photoList.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev > 0 ? prev - 1 : photoList.length - 1));
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 border border-white/20"
              title="Foto Sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev < photoList.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 border border-white/20"
              title="Foto Selanjutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Badge Info Foto di Pojok Bawah */}
        <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          {photoList.length > 1 ? (
            <div className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold tracking-wide border border-white/20 shadow-md">
              Foto {activeIndex + 1} dari {photoList.length}
            </div>
          ) : (
            <div />
          )}

          <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-200 text-[10px] font-bold uppercase tracking-wider border border-white/10 shadow-md">
            {isPortrait ? 'Orientasi Portrait' : 'Orientasi Landscape'}
          </div>
        </div>
      </div>

      {/* Strip Thumbnail jika ada lebih dari 1 foto */}
      {photoList.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 px-0.5 scrollbar-thin">
          {photoList.map((photo, idx) => {
            const isThumbActive = idx === activeIndex;
            return (
              <button
                key={photo.url + idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  isThumbActive
                    ? 'border-amber-500 ring-2 ring-amber-400/50 scale-105'
                    : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400'
                }`}
              >
                <img
                  src={photo.url}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/70 text-[9px] font-bold text-white">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
