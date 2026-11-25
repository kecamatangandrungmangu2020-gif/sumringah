'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Mail,
  MapPin,
  Phone,
  Clock3,
  MessageCircle,
  Ticket,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { CardSilhouetteOverlay } from './PresentationSheet';
import { EASE_OUT_EXPO, VIEWPORT_ONCE } from './motion-variants';

interface FooterProps {
  logoImage?: string;
  configData?: {
    address?: string;
    phone?: string;
    email?: string;
  } | null;
  heroImage?: string;
  wilayahBgImage?: string;
}

export function Footer({ logoImage, configData, heroImage, wilayahBgImage }: FooterProps) {
  const panoramaImages = [
    heroImage && heroImage !== '/hero-Kecamatan.jpg'
      ? heroImage
      : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1000&auto=format&fit=crop',
    wilayahBgImage ||
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1000&auto=format&fit=crop',
  ];

  return (
    <div id="footer-kecamatan" className="relative mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 pt-4 pb-8 sm:pb-10 snap-section">
      <motion.footer
        initial={{ opacity: 0, y: 28, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: 0.72, ease: EASE_OUT_EXPO }}
        className="overflow-hidden rounded-[26px] sm:rounded-[32px] bg-white dark:bg-[#0c1622] border border-slate-200/80 dark:border-white/10 shadow-[0_18px_55px_rgba(6,30,43,0.08)]"
      >
        {/* Top 3-Panel Panoramic Photo Header + Curved Arch */}
        <div className="relative h-28 sm:h-36 w-full grid grid-cols-3 gap-0.5 bg-[#061E2B] overflow-hidden">
          {panoramaImages.map((imgUrl, i) => (
            <div key={i} className="relative h-full w-full">
              <Image
                src={imgUrl}
                alt={`Panorama Kecamatan Gandrungmangu ${i + 1}`}
                fill
                unoptimized
                sizes="34vw"
                className="object-cover brightness-90"
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-[#061E2B]/30 via-transparent to-[#061E2B]/60 pointer-events-none" />
          <svg
            viewBox="0 0 1440 70"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute bottom-0 inset-x-0 w-full h-8 sm:h-12 text-white dark:text-[#0c1622] block"
            preserveAspectRatio="none"
          >
            <path d="M0,70 Q720,-20 1440,70 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Centered Closing Statement & Action Pills */}
        <div className="px-5 sm:px-10 pt-5 pb-8 text-center max-w-3xl mx-auto space-y-3">
          <span className="inline-block px-3 py-0.5 rounded-full bg-[#EBF5F8] dark:bg-cyan-950/60 text-[#0E7490] dark:text-cyan-300 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
            Portal Resmi Pemerintah Kecamatan
          </span>
          <h3 className="font-hero font-bold text-2xl sm:text-3xl tracking-tight text-[#061E2B] dark:text-white">
            Terima Kasih Telah Mengunjungi Kecamatan Gandrungmangu
          </h3>
          <p className="font-hero text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Hadir dengan semangat <span className="font-bold text-[#0E7490] dark:text-cyan-300">SEMRINGAH</span> — Kami siap melayani administrasi kependudukan, surat, dan informasi masyarakat secara cepat dan transparan.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://wa.me/6208950881484?text=Halo,%20saya%20membutuhkan%20informasi%20layanan%20Kecamatan%20Gandrungmangu."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#061E2B] hover:bg-[#0E7490] dark:bg-[#f4c430] dark:hover:bg-white text-white dark:text-[#061E2B] font-hero text-xs font-bold uppercase tracking-wider transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Hubungi Siaga WA</span>
            </a>
            <Link
              href="/Antrian/online/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#EBF5F8] hover:bg-[#0E7490] text-[#0E7490] hover:text-white dark:bg-white/10 dark:text-white font-hero text-xs font-bold uppercase tracking-wider transition-all"
            >
              <Ticket className="h-4 w-4" />
              <span>Ambil Antrian Online</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Footer Directory & Contact Strip */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0a4d60] via-[#0a3b4d] to-[#061E2B] text-cyan-50/90 px-5 sm:px-10 py-8 sm:py-10">
          <CardSilhouetteOverlay pattern="village" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden relative shrink-0">
                  {logoImage ? (
                    <Image src={logoImage} alt="Logo" fill className="object-contain p-1" unoptimized />
                  ) : (
                    <Building2 className="h-5 w-5 text-cyan-300" />
                  )}
                </div>
                <div>
                  <h4 className="font-hero text-sm font-extrabold text-white uppercase tracking-tight">
                    Kecamatan Gandrungmangu
                  </h4>
                  <p className="font-mono text-[9.5px] font-semibold text-cyan-200/80 uppercase tracking-widest">
                    Pemerintah Kabupaten Cilacap
                  </p>
                </div>
              </div>
              <p className="font-hero text-xs text-cyan-100/80 leading-relaxed max-w-sm">
                Portal resmi pelayanan terpadu, administrasi surat mandiri, agenda kedinasan, dan reservasi antrian digital masyarakat Kecamatan Gandrungmangu.
              </p>

              {/* Sosial Media Resmi */}
              <div className="flex items-center gap-2.5 pt-1">
                <a
                  href="https://www.facebook.com/kecgandrungmangu/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook Kecamatan Gandrungmangu"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all duration-200 hover:border-[#f4c430] hover:bg-[#f4c430] hover:text-[#061E2B] hover:scale-105"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>

                <a
                  href="https://www.instagram.com/mascamat.gandrungmangu"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram Kecamatan Gandrungmangu"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all duration-200 hover:border-[#f4c430] hover:bg-[#f4c430] hover:text-[#061E2B] hover:scale-105"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>

                <a
                  href="https://www.tiktok.com/@mascamat.gandrungmangu"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok Kecamatan Gandrungmangu"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all duration-200 hover:border-[#f4c430] hover:bg-[#f4c430] hover:text-[#061E2B] hover:scale-105"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.82.94 1.93 1.63 3.16 2.01v3.74c-1.39-.02-2.77-.42-3.95-1.16-.72-.45-1.36-1.02-1.87-1.7v7.66c0 1.25-.26 2.47-.79 3.6-1.06 2.22-3.15 3.8-5.6 4.21-1.35.23-2.74.15-4.05-.24-2.26-.67-4.14-2.31-5.11-4.47-.6-1.34-.84-2.82-.7-4.29.28-2.9 2.06-5.46 4.81-6.42 1.27-.45 2.64-.5 3.94-.16v3.83c-.8-.28-1.68-.28-2.47.01-1.33.49-2.28 1.77-2.39 3.18-.12 1.63.89 3.16 2.46 3.51.68.15 1.39.11 2.05-.12.98-.35 1.72-1.19 1.92-2.2.06-.31.08-.63.08-.94V0h.02z" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="lg:col-span-4 grid grid-cols-2 gap-6 font-hero text-xs">
              <div>
                <h4 className="font-bold uppercase tracking-[0.16em] text-white mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f4c430]" />
                  <span>Layanan Publik</span>
                </h4>
                <ul className="space-y-2 text-cyan-100/80">
                  <li><Link href="/Antrian/online/" className="hover:text-[#f4c430] transition-colors">Antrian Online</Link></li>
                  <li><Link href="/kunjungan-tamu/" className="hover:text-[#f4c430] transition-colors">Register Kunjungan</Link></li>
                  <li><Link href="/input/" className="hover:text-[#f4c430] transition-colors">Laporan Kegiatan</Link></li>
                  <li><Link href="#pengaduan" className="hover:text-[#f4c430] transition-colors">Pengaduan Warga</Link></li>
                  <li>
                    <a
                      href="https://sisukma.cilacapkab.go.id/Home/pelayanan/4012001"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#f4c430] transition-colors"
                    >
                      Survei SiSukma
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold uppercase tracking-[0.16em] text-white mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f4c430]" />
                  <span>Informasi</span>
                </h4>
                <ul className="space-y-2 text-cyan-100/80">
                  <li><Link href="/informasi" className="hover:text-[#f4c430] transition-colors">Informasi Terkini</Link></li>
                  <li><Link href="#agenda" className="hover:text-[#f4c430] transition-colors">Agenda Kegiatan</Link></li>
                  <li><Link href="#wilayah" className="hover:text-[#f4c430] transition-colors">Wilayah &amp; 14 Desa</Link></li>
                  <li>
                    <a
                      href="https://solid.gandrungmangu.id/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#f4c430] transition-colors"
                    >
                      Data SOLID
                    </a>
                  </li>
                  <li><Link href="/login/" className="hover:text-[#f4c430] transition-colors">Portal Admin</Link></li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-2.5 font-hero text-xs text-cyan-100/80">
              <h4 className="font-bold uppercase tracking-[0.16em] text-white mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f4c430]" />
                <span>Kontak Kantor Kecamatan</span>
              </h4>
              <p className="flex gap-2">
                <MapPin className="h-4 w-4 text-[#f4c430] shrink-0 mt-0.5" />
                <span>
                  {configData?.address ||
                    'Jl. Gandrungmangu No. 01, Gandrungmangu, Kabupaten Cilacap, Jawa Tengah 53254'}
                </span>
              </p>
              <p className="flex gap-2">
                <Phone className="h-4 w-4 text-[#f4c430] shrink-0 mt-0.5" />
                <span>{configData?.phone || '0895-0881-1484'}</span>
              </p>
              <p className="flex gap-2">
                <Mail className="h-4 w-4 text-[#f4c430] shrink-0 mt-0.5" />
                <span className="truncate">{configData?.email || 'gandrungmangu@cilacapkab.go.id'}</span>
              </p>
              <p className="flex gap-2">
                <Clock3 className="h-4 w-4 text-[#f4c430] shrink-0 mt-0.5" />
                <span>Senin–Kamis 07.30–16.00 WIB • Jumat 07.30–16.30 WIB</span>
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-8 pt-5 border-t border-white/15 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-cyan-100/75">
            <span>
              © {new Date().getFullYear()} Pemerintah Kecamatan Gandrungmangu, Kabupaten Cilacap.
            </span>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <Link href="/Antrian/online/" className="hover:text-[#f4c430] transition-colors">
                Antrian Online
              </Link>
              <span className="opacity-40">•</span>
              <a
                href="https://gandrungmangu.cilacapkab.go.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#f4c430] transition-colors"
              >
                Website Resmi
              </a>
              <span className="opacity-40">•</span>
              <Link href="/login/" className="hover:text-[#f4c430] transition-colors">
                Akses Admin
              </Link>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
