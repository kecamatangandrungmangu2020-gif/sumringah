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
    accentBg: 'from-[#065F46] to-[#041E17]',
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
    accentBg: 'from-[#064E3B] to-[#064E3B]',
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
    accentBg: 'from-[#047857] to-[#065F46]',
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
    accentBg: 'from-[#065F46] to-[#155e75]',
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
    accentBg: 'from-[#0f766e] to-[#041E17]',
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
    accentBg: 'from-[#041E17] to-[#065F46]',
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 mb-4 sm:mb-8">
        <div>
          <h2 className="font-hero font-bold text-xl sm:text-3xl lg:text-[34px] tracking-tight text-white leading-tight">
            Layanan Digital Terpadu
          </h2>
          <p className="mt-0.5 sm:mt-1 font-hero text-[11.5px] sm:text-sm text-[#F5E9CC]/85 max-w-2xl">
            Akses cepat antrian online, layanan surat, agenda kedinasan, laporan kegiatan, dan data geospasial Kecamatan Gandrungmangu
          </p>
        </div>
        <Link
          href="/Antrian/online/"
          className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/15 hover:bg-[#C8A253] text-white hover:text-[#041E17] border border-white/25 font-hero text-[11px] sm:text-xs font-semibold transition-all duration-200"
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
        className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4"
      >
        {SERVICE_CARDS.map((item) => {
          const Icon = item.icon;
          const cardContent = (
            <div className="group flex flex-col justify-between h-full rounded-[16px] sm:rounded-[22px] bg-white dark:bg-[#0d1c2b] text-[#041E17] dark:text-white p-3 sm:p-5 shadow-[0_14px_34px_rgba(3,20,30,0.28)] border border-white/80 dark:border-white/10 transition-all duration-300">
              {/* Header Kartu: Kategori, Judul & Tombol Panah */}
              <div className="flex items-start justify-between gap-1.5 pb-2 mb-2 sm:pb-3 sm:mb-3 border-b border-slate-100 dark:border-white/10">
                <div className="min-w-0">
                  <span className="font-mono text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.14em] text-[#065F46] dark:text-[#E5C882] block truncate">
                    {item.category}
                  </span>
                  <h3 className="font-hero font-bold text-[12.5px] sm:text-[15.5px] text-[#041E17] dark:text-white group-hover:text-[#065F46] dark:group-hover:text-[#E5C882] transition-colors line-clamp-1 mt-0.5">
                    {item.title}
                  </h3>
                </div>
                <span className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-[#F3EFE6] group-hover:bg-[#065F46] text-[#065F46] group-hover:text-white dark:bg-white/10 dark:text-[#E5C882] flex items-center justify-center shrink-0 transition-all duration-200">
                  {item.external ? (
                    <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  ) : (
                    <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform group-hover:translate-x-0.5" />
                  )}
                </span>
              </div>

              {/* Visual Icon Banner */}
              <div
                className={`relative w-full h-14 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br ${item.accentBg} mb-2 sm:mb-3.5 flex items-center justify-between px-3 sm:px-5 text-white`}
              >
                <div
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />
                <div className="relative z-10 h-8 w-8 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-4 w-4 sm:h-6 sm:w-6 text-[#E5C882]" />
                </div>
                <span className="relative z-10 hidden sm:inline font-mono text-[10px] uppercase tracking-[0.2em] text-[#F5E9CC]/80">
                  SEMRINGAH
                </span>
              </div>

              {/* Deskripsi & Bottom Tag */}
              <div className="flex-1 flex flex-col justify-between gap-2 sm:gap-3">
                <p className="font-hero text-[10.5px] sm:text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-snug sm:leading-relaxed">
                  {item.subtitle}
                </p>
                <div className="flex items-center justify-between gap-1.5 pt-0.5 sm:pt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full font-hero text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate ${
                      item.priority
                        ? 'bg-[#041E17] text-[#C8A253] dark:bg-[#C8A253] dark:text-[#041E17]'
                        : 'bg-[#F3EFE6] text-[#065F46] dark:bg-[#064E3B]/60 dark:text-[#E5C882]'
                    }`}
                  >
                    {item.badge}
                  </span>
                  <span className="font-hero text-[10px] sm:text-[11px] font-bold text-[#065F46] dark:text-[#E5C882] group-hover:underline shrink-0">
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
