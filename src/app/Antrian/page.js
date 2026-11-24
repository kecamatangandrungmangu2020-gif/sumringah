"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Home,
  ArrowLeft,
  ArrowRight,
  Ticket,
  Tv,
  Headset,
  Settings,
  Star,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { NightModeSwitch } from '../../components/ui/NightModeSwitch';
import { BackgroundPattern } from '../../components/landing/BackgroundPattern';
import { PresentationSheet, CardSilhouetteOverlay } from '../../components/landing/PresentationSheet';
import { RekapKunjunganTamuCard } from '../../components/kunjungan-tamu/RekapKunjunganTamuCard';
import {
  staggerContainer,
  cardFadeUp,
  VIEWPORT_ONCE,
  SPRING_TACTILE,
} from '../../components/landing/motion-variants';

const ANTRIAN_MODULES = [
  {
    id: 'kiosk',
    category: 'LAYAR SENTUH',
    title: 'Kiosk Antrian',
    desc: 'Layar sentuh cetak nomor tiket antrian fisik untuk warga yang hadir langsung di lokasi.',
    badge: 'LOKET FISIK',
    cta: 'Buka Layar Kiosk',
    href: '/Antrian/kiosk',
    icon: Ticket,
    priority: true,
    accentBg: 'from-[#0E7490] to-[#061E2B]',
  },
  {
    id: 'display',
    category: 'RUANG TUNGGU',
    title: 'Layar Display TV',
    desc: 'Layar monitor TV pemanggilan nomor antrian ruang tunggu otomatis disertai audio panggilan.',
    badge: 'MONITOR TV',
    cta: 'Buka Layar TV',
    href: '/Antrian/display',
    icon: Tv,
    priority: false,
    accentBg: 'from-[#0a556a] to-[#08384a]',
  },
  {
    id: 'operator',
    category: 'PETUGAS LOKET',
    title: 'Konsol Loket',
    desc: 'Panel pemanggil antrian dan manajemen pelayanan warga bagi petugas loket aktif.',
    badge: 'OPERATOR',
    cta: 'Masuk Panel Loket',
    href: '/Antrian/operator',
    icon: Headset,
    priority: true,
    accentBg: 'from-[#0284c7] to-[#0E7490]',
  },
  {
    id: 'pengaturan',
    category: 'ADMINISTRASI',
    title: 'Pengaturan Sistem',
    desc: 'Kelola kategori layanan, loket, histori antrian, pengaturan audio, dan akun operator.',
    badge: 'KONFIGURASI',
    cta: 'Buka Pengaturan',
    href: '/Antrian/pengaturan',
    icon: Settings,
    priority: false,
    accentBg: 'from-[#061E2B] to-[#0E7490]',
  },
];

export default function HomePageAntrian() {
  const [logoTambahan, setLogoTambahan] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.logoTambahanUrl) return parsed.logoTambahanUrl;
        }
      } catch {}
    }
    return '';
  });

  useEffect(() => {
    fetch('/api/village-profile/?t=' + Date.now(), { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.logoTambahanUrl) setLogoTambahan(data.logoTambahanUrl);
      })
      .catch(() => {});

    if (db) {
      const unsub = onSnapshot(
        doc(db, 'settings', 'village'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (d.logoTambahanUrl) setLogoTambahan(d.logoTambahanUrl);
          }
        },
        () => {}
      );
      return () => unsub();
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#070b10] text-[#061E2B] dark:text-slate-100 overflow-x-clip transition-colors duration-300 pb-12">
      <BackgroundPattern />

      {/* ── 1. FLOATING PORCELAIN CAPSULE TOP BAR (SERASI LANDING PAGE) ──────── */}
      <header className="sticky top-0 z-40 w-full py-3 px-3 sm:px-5 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-5 py-2.5 rounded-full bg-white/95 dark:bg-[#0c1622]/95 backdrop-blur-2xl border border-slate-200/85 dark:border-white/10 shadow-[0_12px_36px_rgba(6,30,43,0.08)]">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F3F7F9] hover:bg-[#EBF5F8] dark:bg-white/10 dark:hover:bg-white/15 text-[#061E2B] dark:text-white border border-slate-200/80 dark:border-white/10 font-hero text-xs font-bold transition-all text-decoration-none"
            >
              <Home className="h-3.5 w-3.5 text-[#0E7490] dark:text-cyan-300" />
              <span>Beranda Utama</span>
            </Link>

            <Link
              href="/admin/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#061E2B] hover:bg-[#0E7490] text-white font-hero text-xs font-bold transition-all text-decoration-none shadow-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-cyan-300" />
              <span>Kembali ke Admin</span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF5F8] dark:bg-cyan-950/60 border border-[#0E7490]/25 text-[#0E7490] dark:text-cyan-300 font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
              <span className="h-2 w-2 rounded-full bg-[#0E7490] dark:bg-cyan-400 animate-pulse" />
              Portal Sistem Antrian
            </span>
            <NightModeSwitch size="sm" />
          </div>
        </div>
      </header>

      <main className="relative z-10 space-y-2">
        {/* ── 2. HERO BRANDING BANNER (OCEAN TEAL CORPORATE DECK) ──────────────── */}
        <section className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 pt-1 pb-2">
          <div className="relative overflow-hidden rounded-[26px] sm:rounded-[32px] bg-gradient-to-br from-[#0a4d60] via-[#0d6278] to-[#062230] text-white border border-cyan-300/20 shadow-[0_22px_60px_rgba(6,30,43,0.2)] px-5 sm:px-10 py-8 sm:py-10 text-center">
            <CardSilhouetteOverlay pattern="village" />

            <div className="relative z-10 flex flex-col items-center space-y-4">
              {/* Logo Instansi */}
              <div className="flex items-center justify-center">
                {logoTambahan ? (
                  <img
                    src={logoTambahan}
                    alt="Logo Sistem Antrian"
                    className="w-full max-w-[640px] max-h-[96px] object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
                  />
                ) : (
                  <div className="flex items-center justify-center gap-4 sm:gap-5 flex-wrap">
                    <img
                      src="/img/Logo.png"
                      alt="Logo Cilacap"
                      className="h-14 sm:h-16 object-contain drop-shadow-md"
                    />
                    <div className="h-10 w-[1.5px] bg-white/25" />
                    <img
                      src="/img/cilacap-bercahaya.png"
                      alt="Logo Cilacap Bercahaya"
                      className="h-12 sm:h-14 object-contain drop-shadow-md"
                    />
                    <div className="h-10 w-[1.5px] bg-white/25" />
                    <img
                      src="/img/logo-semringah.png"
                      alt="Logo Gandrungmangu Semringah"
                      className="h-14 sm:h-16 object-contain drop-shadow-md"
                    />
                  </div>
                )}
              </div>

              <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#f4c430] text-[#061E2B] font-hero text-[11px] sm:text-xs font-extrabold tracking-wide shadow-md">
                <Sparkles className="h-3.5 w-3.5" />
                &ldquo;SEMAngat membeRIkan pelayanan NGgawe bungAH&rdquo;
              </span>

              <div className="space-y-1.5 max-w-2xl">
                <h1 className="font-hero font-extrabold text-2xl sm:text-4xl tracking-tight text-white">
                  Portal Sistem Antrian Terpadu
                </h1>
                <p className="font-hero text-xs sm:text-sm text-cyan-100/85 leading-relaxed">
                  Pusat manajemen operasional loket antrian pelayanan real-time cloud dan rekap Kunjungan Tamu Front Office Kecamatan Gandrungmangu.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. 4 KARTU OPERASIONAL ANTRIAN (PERSIS SERVICES SECTION LANDING) ── */}
        <PresentationSheet
          id="modul-antrian"
          sectionNumber="01"
          deckLabel="Operasional Loket"
          variant="ocean"
          silhouette="waves"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <h2 className="font-hero font-bold text-xl sm:text-2xl lg:text-3xl tracking-tight text-white leading-tight">
                Modul Antrian &amp; Loket Pelayanan
              </h2>
              <p className="mt-1 font-hero text-xs sm:text-sm text-cyan-100/85">
                Pilih panel operasional sesuai perangkat: Kiosk Layar Sentuh, TV Display, Konsol Operator, atau Pengaturan
              </p>
            </div>
            <Link
              href="/Antrian/online/"
              className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-full bg-white/15 hover:bg-[#f4c430] text-white hover:text-[#061E2B] border border-white/25 font-hero text-xs font-semibold transition-all text-decoration-none"
            >
              <span>Antrian Online Warga</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <motion.div
            variants={staggerContainer(0.07, 0.04)}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {ANTRIAN_MODULES.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  variants={cardFadeUp}
                  whileHover={{ y: -6 }}
                  transition={SPRING_TACTILE}
                  className="h-full"
                >
                  <Link
                    href={item.href}
                    className="group flex flex-col justify-between h-full rounded-[22px] bg-white dark:bg-[#0d1c2b] text-[#061E2B] dark:text-white p-4 sm:p-5 shadow-[0_14px_34px_rgba(3,20,30,0.28)] border border-white/80 dark:border-white/10 transition-all duration-300 text-decoration-none"
                  >
                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-white/10">
                      <div className="min-w-0">
                        <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#0E7490] dark:text-cyan-400 block truncate">
                          {item.category}
                        </span>
                        <h3 className="font-hero font-bold text-sm sm:text-[15px] text-[#061E2B] dark:text-white group-hover:text-[#0E7490] dark:group-hover:text-cyan-300 transition-colors line-clamp-1 mt-0.5">
                          {item.title}
                        </h3>
                      </div>
                      <span className="h-8 w-8 rounded-full bg-[#EBF5F8] group-hover:bg-[#0E7490] text-[#0E7490] group-hover:text-white dark:bg-white/10 dark:text-cyan-300 flex items-center justify-center shrink-0 transition-all duration-200">
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>

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
                      <div className="relative z-10 h-11 w-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Icon className="h-5 w-5 text-cyan-200" />
                      </div>
                      <span className="relative z-10 font-mono text-[9.5px] uppercase tracking-[0.18em] text-cyan-100/80">
                        ANTRIAN
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-between gap-3">
                      <p className="font-hero text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {item.desc}
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
                          {item.cta} →
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </PresentationSheet>

        {/* ── 4. KARTU REKAP KUNJUNGAN TAMU (CORPORATE PRESENTATION DECK) ──────── */}
        <RekapKunjunganTamuCard />

        {/* ── 5. FOOTER STRIP ──────────────────────────────────────────────────── */}
        <footer className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 pt-4">
          <div className="rounded-full bg-white/90 dark:bg-[#0c1622]/90 backdrop-blur-xl border border-slate-200/85 dark:border-white/10 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 shadow-xs">
            <span className="font-hero">
              © {new Date().getFullYear()} Sistem Antrian Terpadu Kecamatan Gandrungmangu.
            </span>
            <a
              href="https://sisukma.cilacapkab.go.id/Home/pelayanan/4012001"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-hero font-bold text-[#0E7490] dark:text-[#f4c430] hover:underline text-decoration-none"
            >
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>Bantu Nilai Kami di SiSukma</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
