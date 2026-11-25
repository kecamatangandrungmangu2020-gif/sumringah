'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Ticket,
  Users,
  Calendar,
  Camera,
  Layers,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { PresentationSheet } from './PresentationSheet';
import {
  staggerContainer,
  cardFadeUp,
  VIEWPORT_ONCE,
  SPRING_TACTILE,
} from './motion-variants';

const SERVICE_CARDS = [
  {
    id: 'antrian',
    category: 'LOKET DIGITAL',
    title: 'Tiket Antrian Online',
    subtitle: 'Ambil nomor antrian pelayanan loket Kecamatan dari rumah secara cepat tanpa menunggu lama.',
    badge: 'PRIORITAS',
    href: '/Antrian/online/',
    icon: Ticket,
    priority: true,
    accentBg: 'from-[#0E7490] to-[#061E2B]',
  },
  {
    id: 'kunjungan-tamu',
    category: 'FRONT OFFICE • NON-PATEN',
    title: 'Register Kunjungan',
    subtitle: 'Tamu Dinas, Proposal, SPJ, Pengiriman Barang & Pengaduan dalam satu pintu Front Office.',
    badge: 'SATU PINTU',
    href: '/kunjungan-tamu/',
    icon: Users,
    priority: true,
    accentBg: 'from-[#0a556a] to-[#08384a]',
  },
  {
    id: 'agenda',
    category: 'KEDINASAN',
    title: 'Agenda Acara',
    subtitle: 'Pantau jadwal kegiatan dinas, rapat koordinasi, dan acara kemasyarakatan Hari H hingga H+3.',
    badge: 'REALTIME',
    href: '#agenda',
    icon: Calendar,
    priority: false,
    accentBg: 'from-[#0284c7] to-[#0E7490]',
  },
  {
    id: 'kegiatan',
    category: 'DOKUMENTASI',
    title: 'Laporan Kegiatan',
    subtitle: 'Pelaporan dokumentasi foto dan capaian pelaksanaan kegiatan lapangan aparatur & desa.',
    badge: 'PARTISIPASI',
    href: '/input/',
    icon: Camera,
    priority: false,
    accentBg: 'from-[#0e7490] to-[#155e75]',
  },
  {
    id: 'solid',
    category: 'GEOSPASIAL',
    title: 'Data Wilayah SOLID',
    subtitle: 'Sistem Olah Laporan Informasi & Data Desa: peta wilayah, potensi desa, dan infrastruktur.',
    badge: 'PORTAL DATA',
    href: 'https://solid.gandrungmangu.id/',
    icon: Layers,
    priority: false,
    external: true,
    accentBg: 'from-[#0f766e] to-[#061E2B]',
  },
  {
    id: 'website',
    category: 'PORTAL RESMI',
    title: 'Website Resmi',
    subtitle: 'Kunjungi laman resmi Pemerintah Kecamatan Gandrungmangu pada domain Kabupaten Cilacap.',
    badge: 'CILACAPKAB',
    href: 'https://gandrungmangu.cilacapkab.go.id/',
    icon: Globe,
    priority: false,
    external: true,
    accentBg: 'from-[#061E2B] to-[#0E7490]',
  },
];

export function ServicesSection() {
  return (
    <PresentationSheet
      id="layanan"
      sectionNumber="02"
      deckLabel="Layanan Digital"
      variant="ocean"
      silhouette="waves"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h2 className="font-hero font-bold text-2xl sm:text-3xl lg:text-[34px] tracking-tight text-white leading-tight">
            Layanan Digital Terpadu
          </h2>
          <p className="mt-1 font-hero text-xs sm:text-sm text-cyan-100/85 max-w-2xl">
            Akses cepat antrian online, layanan surat, agenda kedinasan, laporan kegiatan, dan data geospasial Kecamatan Gandrungmangu
          </p>
        </div>
        <Link
          href="/Antrian/online/"
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-full bg-white/15 hover:bg-[#f4c430] text-white hover:text-[#061E2B] border border-white/25 font-hero text-xs font-semibold transition-all duration-200"
        >
          <span>Mulai Layanan</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <motion.div
        variants={staggerContainer(0.07, 0.04)}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {SERVICE_CARDS.map((item) => {
          const Icon = item.icon;
          const cardContent = (
            <div className="group flex flex-col justify-between h-full rounded-[22px] bg-white dark:bg-[#0d1c2b] text-[#061E2B] dark:text-white p-4 sm:p-5 shadow-[0_14px_34px_rgba(3,20,30,0.28)] border border-white/80 dark:border-white/10 transition-all duration-300">
              {/* Header Kartu: Kategori, Judul & Tombol Panah */}
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-white/10">
                <div className="min-w-0">
                  <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#0E7490] dark:text-cyan-400 block truncate">
                    {item.category}
                  </span>
                  <h3 className="font-hero font-bold text-sm sm:text-[15.5px] text-[#061E2B] dark:text-white group-hover:text-[#0E7490] dark:group-hover:text-cyan-300 transition-colors line-clamp-1 mt-0.5">
                    {item.title}
                  </h3>
                </div>
                <span className="h-8 w-8 rounded-full bg-[#EBF5F8] group-hover:bg-[#0E7490] text-[#0E7490] group-hover:text-white dark:bg-white/10 dark:text-cyan-300 flex items-center justify-center shrink-0 transition-all duration-200">
                  {item.external ? (
                    <ExternalLink className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  )}
                </span>
              </div>

              {/* Visual Icon Banner */}
              <div
                className={`relative w-full h-24 rounded-2xl overflow-hidden bg-gradient-to-br ${item.accentBg} mb-3.5 flex items-center justify-between px-5 text-white`}
              >
                <div
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />
                <div className="relative z-10 h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-6 w-6 text-cyan-200" />
                </div>
                <span className="relative z-10 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/80">
                  SEMRINGAH
                </span>
              </div>

              {/* Deskripsi & Bottom Tag */}
              <div className="flex-1 flex flex-col justify-between gap-3">
                <p className="font-hero text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {item.subtitle}
                </p>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full font-hero text-[10px] font-bold uppercase tracking-wider ${
                      item.priority
                        ? 'bg-[#061E2B] text-[#f4c430] dark:bg-[#f4c430] dark:text-[#061E2B]'
                        : 'bg-[#EBF5F8] text-[#0E7490] dark:bg-cyan-950/60 dark:text-cyan-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                  <span className="font-hero text-[11px] font-bold text-[#0E7490] dark:text-cyan-300 group-hover:underline">
                    Akses →
                  </span>
                </div>
              </div>
            </div>
          );

          return (
            <motion.div
              key={item.id}
              variants={cardFadeUp}
              whileHover={{ y: -6 }}
              transition={SPRING_TACTILE}
              className="h-full"
            >
              {item.external ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className="block h-full">
                  {cardContent}
                </a>
              ) : (
                <Link href={item.href} className="block h-full">
                  {cardContent}
                </Link>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </PresentationSheet>
  );
}
