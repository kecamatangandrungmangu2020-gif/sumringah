'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Clock,
  ShieldCheck,
  Sparkles,
  FileCheck2,
  Landmark,
  Users,
  Star,
  Ticket,
} from 'lucide-react';
import { PresentationSheet, CardSilhouetteOverlay } from './PresentationSheet';
import {
  staggerContainer,
  cardFadeUp,
  listItemStagger,
  VIEWPORT_ONCE,
  SPRING_TACTILE,
} from './motion-variants';

export function SambutanSection() {
  const coreValues = [
    { label: 'Semangat', sub: 'Melayani Sepenuh Hati', icon: Sparkles },
    { label: 'Cepat & Pasti', sub: 'Antrian Online 24/7', icon: FileCheck2 },
    { label: 'Transparan', sub: '14 Desa Terintegrasi', icon: Landmark },
    { label: 'Nggawe Bungah', sub: 'Ramah & Bebas Pungli', icon: ShieldCheck },
  ];

  const missions = [
    {
      num: '01',
      title: 'Pelayanan Publik Semringah',
      desc: 'Jam layanan Senin–Kamis 07.30–16.00 WIB & Jumat 07.30–16.30 WIB didukung antrian daring.',
      icon: Clock,
    },
    {
      num: '02',
      title: 'Administrasi Digital Terpadu',
      desc: 'Pengajuan surat kependudukan, rekomendasi, dan reservasi loket secara cepat tanpa antre panjang.',
      icon: FileCheck2,
    },
    {
      num: '03',
      title: 'Keterbukaan Agenda & Warta',
      desc: 'Publikasi agenda kedinasan Hari H hingga H+3 serta kabar resmi kegiatan Kecamatan.',
      icon: ShieldCheck,
    },
    {
      num: '04',
      title: 'Sinergi 14 Desa & SOLID',
      desc: 'Integrasi data geospasial dan profil 14 desa se-Kecamatan Gandrungmangu dalam satu portal.',
      icon: Users,
    },
  ];

  return (
    <PresentationSheet
      id="jelajahi-kecamatan"
      sectionNumber="01"
      deckLabel="Visi & Semringah"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 mb-4 sm:mb-8">
        <div>
          <h2 className="font-hero font-bold text-xl sm:text-3xl lg:text-[34px] tracking-tight text-[#041E17] dark:text-white leading-tight">
            Semangat Pelayanan <span className="text-[#065F46] dark:text-[#E5C882]">Semringah</span>
          </h2>
          <p className="mt-0.5 sm:mt-1 font-hero text-[11.5px] sm:text-sm text-slate-500 dark:text-slate-400">
            Pemerintah Kecamatan Gandrungmangu • Kabupaten Cilacap, Jawa Tengah
          </p>
        </div>
        <a
          href="https://sisukma.cilacapkab.go.id/Home/pelayanan/4012001"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-full bg-[#F3EFE6] hover:bg-[#065F46] text-[#065F46] hover:text-white dark:bg-[#064E3B]/60 dark:text-[#E5C882] dark:hover:bg-[#C8A253] dark:hover:text-[#041E17] font-hero text-xs font-semibold transition-all duration-200"
        >
          <Star className="h-3.5 w-3.5" />
          <span>Survei Kepuasan (SiSukma)</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
        {/* KOLOM KIRI (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          {/* 1. Ocean Teal Rounded Banner Card */}
          <motion.div
            variants={cardFadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
            className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#062433] text-white p-5 sm:p-7 shadow-[0_14px_36px_rgba(6,36,51,0.18)]"
          >
            <CardSilhouetteOverlay pattern="village" />
            <div className="relative z-10 space-y-3">
              <span className="inline-block px-3 py-0.5 rounded-full bg-white/15 border border-white/20 font-mono text-[10px] uppercase tracking-[0.16em] text-[#C8A253]">
                Motto Pelayanan Kecamatan
              </span>
              <h3 className="font-hero font-bold text-xl sm:text-2xl text-white leading-snug">
                SEMRINGAH — SEMAngat membeRIkan pelayanan NGgawe bungAH
              </h3>
              <p className="font-hero text-xs sm:text-[13.5px] text-[#FAF8F5]/90 leading-relaxed">
                &ldquo;Transformasi layanan digital Kecamatan Gandrungmangu dihadirkan agar seluruh warga dari 14 desa dapat mengakses antrian online, pengajuan surat, agenda kedinasan, dan informasi kewilayahan secara mudah, cepat, transparan, dan membahagiakan.&rdquo;
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#F5E9CC]/90 border-t border-white/15">
                <span className="font-hero font-bold text-white">
                  Pemerintah Kecamatan Gandrungmangu
                </span>
                <span className="font-mono text-[10px] text-[#E5C882]/85">
                  14 DESA • 64,37 KM² • CILACAP
                </span>
              </div>
            </div>
          </motion.div>

          {/* 2. Dark Marine Navy Pill Bar */}
          <div className="flex items-center justify-between px-5 py-3 rounded-full bg-[#041E17] dark:bg-[#08131d] text-white">
            <div className="flex items-center gap-2.5">
              <span className="font-hero text-xs sm:text-[13px] font-bold tracking-wide">
                Nilai Utama Pelayanan
              </span>
              <span className="hidden sm:inline-block text-[11px] font-mono text-[#E5C882]/80">
                Core Values
              </span>
            </div>
            <Link
              href="#layanan"
              aria-label="Lihat Layanan Digital"
              className="h-6 w-6 rounded-full bg-white/15 hover:bg-[#C8A253] hover:text-[#041E17] flex items-center justify-center transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* 3. 4 Clean Soft-Tinted Value Tiles (2x2 on Mobile, 4 on Desktop) */}
          <motion.div
            variants={staggerContainer(0.07, 0.05)}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
          >
            {coreValues.map((val) => {
              const Icon = val.icon;
              return (
                <motion.div
                  key={val.label}
                  variants={cardFadeUp}
                  whileHover={{ y: -4 }}
                  transition={SPRING_TACTILE}
                  className="rounded-xl sm:rounded-2xl bg-[#F2F6F8] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 p-2.5 sm:p-3.5 flex flex-col items-center text-center gap-1 sm:gap-1.5"
                >
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white dark:bg-[#064E3B]/60 shadow-xs flex items-center justify-center text-[#065F46] dark:text-[#E5C882]">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <span className="font-hero text-[11px] sm:text-xs font-bold text-[#041E17] dark:text-white leading-tight">
                    {val.label}
                  </span>
                  <span className="font-hero text-[9.5px] sm:text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
                    {val.sub}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* KOLOM KANAN (5 cols): Soft Mission Card (2x2 on Mobile, 1-col on Desktop) */}
        <motion.div
          variants={staggerContainer(0.08, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="lg:col-span-5 rounded-[20px] sm:rounded-[22px] bg-[#F3EFE6] dark:bg-[#0f2230] border border-[#E5C882]/60 dark:border-cyan-800/30 p-3.5 sm:p-6 flex flex-col justify-between gap-3 sm:gap-4"
        >
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-[#065F46] text-white shadow-sm">
              <span className="font-hero text-[11px] sm:text-xs font-bold uppercase tracking-[0.12em]">
                Pilar &amp; Prioritas Layanan
              </span>
              <span className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center font-mono text-[10px] font-bold">
                4
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3">
              {missions.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.num}
                    variants={listItemStagger}
                    className="flex flex-col lg:flex-row items-start gap-2 lg:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/85 dark:bg-[#0a1824]/80 border border-white dark:border-white/10 shadow-xs"
                  >
                    <div className="flex items-center justify-between w-full lg:w-auto">
                      <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B]/70 text-[#065F46] dark:text-[#E5C882] flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <span className="lg:hidden font-mono text-[9.5px] font-bold text-[#065F46] dark:text-[#E5C882]">
                        {item.num}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="hidden lg:inline font-mono text-[10px] font-bold text-[#065F46] dark:text-[#E5C882]">
                          {item.num}
                        </span>
                        <h4 className="font-hero text-[11.5px] sm:text-[13px] font-bold text-[#041E17] dark:text-white leading-tight line-clamp-2">
                          {item.title}
                        </h4>
                      </div>
                      <p className="mt-0.5 font-hero text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 leading-snug sm:leading-relaxed line-clamp-2 lg:line-clamp-none">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <Link
            href="/Antrian/online/"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#041E17] hover:bg-[#065F46] dark:bg-[#C8A253] dark:hover:bg-white text-white dark:text-[#041E17] font-hero text-xs font-bold uppercase tracking-[0.12em] transition-all duration-200"
          >
            <Ticket className="h-3.5 w-3.5" />
            <span>Ambil Tiket Antrian Online</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>
    </PresentationSheet>
  );
}
