'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Compass,
  MapPin,
  ExternalLink,
  Landmark,
  ArrowRight,
} from 'lucide-react';
import { PresentationSheet } from './PresentationSheet';
import { LandingDesaItem } from './Header';
import {
  staggerContainer,
  cardFadeUp,
  VIEWPORT_ONCE,
} from './motion-variants';

export interface LandingWilayahData {
  title: string;
  subtitle?: string;
  description: string;
  secondaryDescription?: string;
  mapImageUrl?: string;
  bgImageUrl?: string;
  mapButtonText?: string;
  mapLinkUrl?: string;
  luasWilayah?: string;
  jumlahDesa?: string;
  pusatPemerintahan?: string;
  batasUtara?: string;
  batasSelatan?: string;
  batasBarat?: string;
  batasTimur?: string;
}

interface WilayahSectionProps {
  wilayahData: LandingWilayahData;
  desaList: LandingDesaItem[];
  onSelectDesa: (desa: LandingDesaItem) => void;
}

export function WilayahSection({ wilayahData, desaList, onSelectDesa }: WilayahSectionProps) {
  const stats = [
    { label: 'Luas Wilayah', value: wilayahData.luasWilayah || '64,37 km²' },
    { label: 'Jumlah Desa', value: wilayahData.jumlahDesa || '14 Desa' },
    { label: 'Pusat Pemerintahan', value: wilayahData.pusatPemerintahan || 'Gandrungmangu' },
  ];

  return (
    <PresentationSheet
      id="wilayah"
      sectionNumber="05"
      deckLabel="Geospasial & 14 Desa"
      variant="ocean"
      silhouette="geometric"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        {/* KIRI (6 cols): Deskripsi Wilayah + Statistik + CTA SOLID */}
        <div className="lg:col-span-6 space-y-5">
          {wilayahData.subtitle && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[#C8A253] font-mono text-[10px] font-bold tracking-[0.16em] uppercase">
              <Compass className="w-3.5 h-3.5" />
              <span>{wilayahData.subtitle}</span>
            </div>
          )}

          <h2 className="font-hero font-bold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight">
            {wilayahData.title || 'Wilayah Gandrungmangu'}
          </h2>

          <div className="space-y-3 font-hero text-xs sm:text-sm text-[#FAF8F5]/90 leading-relaxed whitespace-pre-line">
            <p>{wilayahData.description}</p>
            {wilayahData.secondaryDescription && <p>{wilayahData.secondaryDescription}</p>}
          </div>

          {/* 3 Metric Chips */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {stats.map((st) => (
              <div
                key={st.label}
                className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-3"
              >
                <span className="font-mono text-[9.5px] uppercase tracking-wider text-[#E5C882]/80 block">
                  {st.label}
                </span>
                <span className="font-hero text-xs sm:text-sm font-bold text-white mt-0.5 block truncate">
                  {st.value}
                </span>
              </div>
            ))}
          </div>

          {wilayahData.mapLinkUrl && (
            <div className="pt-1">
              <a
                href={wilayahData.mapLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#C8A253] hover:bg-white text-[#041E17] font-hero font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-lg hover:scale-[1.02]"
              >
                <MapPin className="w-4 h-4" />
                <span>{wilayahData.mapButtonText || 'Jelajahi Data Wilayah'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* KANAN (6 cols): Visual Peta & Batas Administrasi */}
        <div className="lg:col-span-6">
          <div className="rounded-[24px] bg-white/10 backdrop-blur-xl border border-white/20 p-5 shadow-2xl space-y-4">
            {wilayahData.mapImageUrl ? (
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-white border border-white/30">
                <Image
                  src={wilayahData.mapImageUrl}
                  alt={wilayahData.title || 'Peta Wilayah Gandrungmangu'}
                  fill
                  unoptimized
                  className="object-contain p-2"
                />
              </div>
            ) : (
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-white/95 border border-white/30 flex items-center justify-center p-6">
                <svg viewBox="0 0 300 340" className="w-full h-full drop-shadow-md">
                  <path
                    d="M120,20 L210,35 L260,95 L280,180 L230,270 L170,320 L90,300 L40,240 L30,150 L65,80 Z"
                    fill="#065F46"
                    stroke="#041E17"
                    strokeWidth="2.5"
                  />
                  <path d="M65,80 Q150,160 230,270" stroke="#C8A253" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                  <path d="M120,20 Q160,170 170,320" stroke="#C8A253" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                  <circle cx="150" cy="165" r="7" fill="#C8A253" stroke="#041E17" strokeWidth="2.5" />
                  <circle cx="100" cy="95" r="4.5" fill="#E5C882" />
                  <circle cx="205" cy="115" r="4.5" fill="#E5C882" />
                  <circle cx="185" cy="230" r="4.5" fill="#E5C882" />
                  <circle cx="95" cy="245" r="4.5" fill="#E5C882" />
                </svg>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-xl bg-[#041E17]/60 border border-white/10 p-2.5">
                <span className="font-mono text-[9px] uppercase text-[#E5C882] block">Utara</span>
                <span className="font-hero font-semibold text-white line-clamp-1">
                  {wilayahData.batasUtara || 'Karangpucung & Sidareja'}
                </span>
              </div>
              <div className="rounded-xl bg-[#041E17]/60 border border-white/10 p-2.5">
                <span className="font-mono text-[9px] uppercase text-[#E5C882] block">Selatan</span>
                <span className="font-hero font-semibold text-white line-clamp-1">
                  {wilayahData.batasSelatan || 'Bantarsari & Kawunganten'}
                </span>
              </div>
              <div className="rounded-xl bg-[#041E17]/60 border border-white/10 p-2.5">
                <span className="font-mono text-[9px] uppercase text-[#E5C882] block">Barat</span>
                <span className="font-hero font-semibold text-white line-clamp-1">
                  {wilayahData.batasBarat || 'Cipari & Sidareja'}
                </span>
              </div>
              <div className="rounded-xl bg-[#041E17]/60 border border-white/10 p-2.5">
                <span className="font-mono text-[9px] uppercase text-[#E5C882] block">Timur</span>
                <span className="font-hero font-semibold text-white line-clamp-1">
                  {wilayahData.batasTimur || 'Kecamatan Bantarsari'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Direktori Cepat 14 Desa Interaktif */}
      {desaList.length > 0 && (
        <motion.div
          variants={staggerContainer(0.03, 0.04)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="mt-7 pt-6 border-t border-white/15 space-y-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-[#C8A253]" />
              <h3 className="font-hero text-sm sm:text-base font-bold text-white">
                Direktori 14 Desa Wilayah Gandrungmangu
              </h3>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#E5C882]/80 hidden sm:inline">
              Klik desa untuk melihat profil
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {desaList.map((desa, idx) => (
              <motion.button
                key={desa.id}
                type="button"
                variants={cardFadeUp}
                onClick={() => onSelectDesa(desa)}
                className="group flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-[#041E17] border border-white/15 transition-all duration-200 text-left cursor-pointer"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-[9.5px] font-bold text-[#C8A253] group-hover:text-[#065F46] shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="font-hero text-xs font-semibold truncate">{desa.name}</span>
                </div>
                <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100 shrink-0" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </PresentationSheet>
  );
}
