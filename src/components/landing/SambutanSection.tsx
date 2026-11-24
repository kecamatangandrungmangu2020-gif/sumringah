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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h2 className="font-hero font-bold text-2xl sm:text-3xl lg:text-[34px] tracking-tight text-[#061E2B] dark:text-white leading-tight">
            Semangat Pelayanan <span className="text-[#0E7490] dark:text-cyan-400">Semringah</span>
          </h2>
          <p className="mt-1 font-hero text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Pemerintah Kecamatan Gandrungmangu • Kabupaten Cilacap, Jawa Tengah
          </p>
        </div>
        <a
          href="https://sisukma.cilacapkab.go.id/Home/pelayanan/4012001"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-full bg-[#EBF5F8] hover:bg-[#0E7490] text-[#0E7490] hover:text-white dark:bg-cyan-950/60 dark:text-cyan-300 dark:hover:bg-cyan-500 dark:hover:text-[#061E2B] font-hero text-xs font-semibold transition-all duration-200"
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
            className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0a556a] via-[#0e7490] to-[#062433] text-white p-5 sm:p-7 shadow-[0_14px_36px_rgba(6,36,51,0.18)]"
          >
            <CardSilhouetteOverlay pattern="village" />
            <div className="relative z-10 space-y-3">
              <span className="inline-block px-3 py-0.5 rounded-full bg-white/15 border border-white/20 font-mono text-[10px] uppercase tracking-[0.16em] text-[#f4c430]">
                Motto Pelayanan Kecamatan
              </span>
              <h3 className="font-hero font-bold text-xl sm:text-2xl text-white leading-snug">
                SEMRINGAH — SEMAngat membeRIkan pelayanan NGgawe bungAH
              </h3>
              <p className="font-hero text-xs sm:text-[13.5px] text-cyan-50/90 leading-relaxed">
                &ldquo;Transformasi layanan digital Kecamatan Gandrungmangu dihadirkan agar seluruh warga dari 14 desa dapat mengakses antrian online, pengajuan surat, agenda kedinasan, dan informasi kewilayahan secara mudah, cepat, transparan, dan membahagiakan.&rdquo;
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-cyan-100/90 border-t border-white/15">
                <span className="font-hero font-bold text-white">
                  Pemerintah Kecamatan Gandrungmangu
                </span>
                <span className="font-mono text-[10px] text-cyan-200/85">
                  14 DESA • 64,37 KM² • CILACAP
                </span>
              </div>
            </div>
          </motion.div>

          {/* 2. Dark Marine Navy Pill Bar */}
          <div className="flex items-center justify-between px-5 py-3 rounded-full bg-[#061E2B] dark:bg-[#08131d] text-white">
            <div className="flex items-center gap-2.5">
              <span className="font-hero text-xs sm:text-[13px] font-bold tracking-wide">
                Nilai Utama Pelayanan
              </span>
              <span className="hidden sm:inline-block text-[11px] font-mono text-cyan-300/80">
                Core Values
              </span>
            </div>
            <Link
              href="#layanan"
              aria-label="Lihat Layanan Digital"
              className="h-6 w-6 rounded-full bg-white/15 hover:bg-[#f4c430] hover:text-[#061E2B] flex items-center justify-center transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* 3. 4 Clean Soft-Tinted Value Tiles */}
          <motion.div
            variants={staggerContainer(0.07, 0.05)}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {coreValues.map((val) => {
              const Icon = val.icon;
              return (
                <motion.div
                  key={val.label}
                  variants={cardFadeUp}
                  whileHover={{ y: -4 }}
                  transition={SPRING_TACTILE}
                  className="rounded-2xl bg-[#F2F6F8] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 p-3.5 flex flex-col items-center text-center gap-1.5"
                >
                  <div className="h-8 w-8 rounded-full bg-white dark:bg-cyan-950/60 shadow-xs flex items-center justify-center text-[#0E7490] dark:text-cyan-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-hero text-xs font-bold text-[#061E2B] dark:text-white leading-tight">
                    {val.label}
                  </span>
                  <span className="font-hero text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
                    {val.sub}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* KOLOM KANAN (5 cols): Soft Ice-Cyan Mission Card */}
        <motion.div
          variants={staggerContainer(0.08, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="lg:col-span-5 rounded-[22px] bg-[#EBF5F8] dark:bg-[#0f2230] border border-cyan-200/60 dark:border-cyan-800/30 p-5 sm:p-6 flex flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-full bg-[#0E7490] text-white shadow-sm">
              <span className="font-hero text-xs font-bold uppercase tracking-[0.12em]">
                Pilar &amp; Prioritas Layanan
              </span>
              <span className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center font-mono text-[10px] font-bold">
                4
              </span>
            </div>

            <div className="space-y-3">
              {missions.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.num}
                    variants={listItemStagger}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-white/85 dark:bg-[#0a1824]/80 border border-white dark:border-white/10 shadow-xs"
                  >
                    <div className="h-9 w-9 rounded-full bg-[#EBF5F8] dark:bg-cyan-950/70 text-[#0E7490] dark:text-cyan-300 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-[#0E7490] dark:text-cyan-400">
                          {item.num}
                        </span>
                        <h4 className="font-hero text-xs sm:text-[13px] font-bold text-[#061E2B] dark:text-white leading-tight">
                          {item.title}
                        </h4>
                      </div>
                      <p className="mt-0.5 font-hero text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
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
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#061E2B] hover:bg-[#0E7490] dark:bg-[#f4c430] dark:hover:bg-white text-white dark:text-[#061E2B] font-hero text-xs font-bold uppercase tracking-[0.12em] transition-all duration-200"
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
