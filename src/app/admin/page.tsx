'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  LogIn,
  ExternalLink,
  Menu,
  FileText,
  Ticket,
  ArrowUpRight,
  Building2,
  ChevronRight,
  Star,
} from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { NightModeSwitch } from '@/components/ui/NightModeSwitch';
import { KineticScatterTitle, EASE_CINEMATIC } from '@/components/landing/hero-cinematic-parts';

const MASCOT_VIDEO_URL =
  'https://res.cloudinary.com/zqw5r6ay/video/upload/v1790613043/Mascot_revealing_logo_video_20260928232803.mp4';

export default function AdminLandingPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<{ time: string; date: string } | null>(null);

  const [configData, setConfigData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache');
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    return null;
  });

  useEffect(() => {
    setMounted(true);
    fetch('/api/village-profile/?t=' + Date.now(), { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setConfigData((prev: any) => ({ ...prev, ...data }));
          try {
            localStorage.setItem('village_profile_cache', JSON.stringify(data));
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      setCurrentTime({
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
        date: `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!db || !user) return;
    const unsub = onSnapshot(doc(db, 'settings', 'village'), (snap) => {
      if (snap.exists()) {
        setConfigData((prev: any) => ({ ...prev, ...snap.data() }));
      }
    });
    return () => unsub();
  }, [db, user]);

  if (!mounted) return null;

  const getFormattedHeroImage = (data: any) => {
    const raw = data?.heroPhotoUrl || data?.heroPhotoBase64 || data?.heroImageUrl || data?.heroImageBase64;
    if (!raw || typeof raw !== 'string') return '/hero-Kecamatan.jpg';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
      return raw;
    }
    return `data:image/jpeg;base64,${raw}`;
  };

  const getFormattedLogo = (data: any) => {
    const raw = data?.logoUrl || data?.logoKecamatanUrl || data?.logoBase64;
    if (!raw || typeof raw !== 'string') return '';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
      return raw;
    }
    return `data:image/png;base64,${raw}`;
  };

  const heroImage = getFormattedHeroImage(configData);
  const logoImage = getFormattedLogo(configData);
  const systemHref = user ? '/dashboard/' : '/login/';

  const navLinks = [
    { href: '/', label: 'Portal Warga' },
    { href: '/Antrian/', label: 'Sistem Antrian' },
    { href: '/kunjungan-tamu/?channel=front_office', label: 'Kunjungan Tamu' },
    { href: '/agenda/', label: 'Agenda' },
  ];

  const brandBlock = (
    <Link
      href="/"
      className="flex items-center gap-2 sm:gap-2.5 shrink-0 transition-all hover:opacity-90 active:scale-[0.98]"
    >
      {logoImage ? (
        <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl overflow-hidden p-0.5 shrink-0 bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10">
          <Image src={logoImage} alt="Logo Kecamatan" fill unoptimized className="object-contain p-0.5" />
        </div>
      ) : (
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl shrink-0 bg-[#061E2B] text-white dark:bg-[#0E7490]">
          <Building2 className="h-4 w-4" />
        </div>
      )}
      <div className="flex flex-col text-left">
        <span className="font-hero font-extrabold tracking-[0.04em] sm:tracking-[0.06em] text-[10.5px] sm:text-[12.5px] uppercase leading-none text-[#061E2B] dark:text-white">
          PORTAL ADMIN
        </span>
        <span className="text-[7px] sm:text-[8.5px] font-hero uppercase tracking-[0.14em] sm:tracking-[0.18em] font-semibold mt-0.5 sm:mt-1 text-[#0E7490] dark:text-cyan-300">
          KEC. GANDRUNGMANGU • CILACAP
        </span>
      </div>
    </Link>
  );

  const mobileControls = (
    <div className="flex items-center gap-1.5 lg:hidden">
      <NightModeSwitch size="sm" />
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="h-8 w-8 flex items-center justify-center rounded-full bg-[#061E2B] hover:bg-[#0E7490] dark:bg-[#0E7490] text-white transition-all cursor-pointer"
            aria-label="Buka menu portal admin"
          >
            <Menu className="h-4 w-4" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-[310px] max-w-[88vw] border-l border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#070b10] text-[#061E2B] dark:text-slate-100 p-5 shadow-2xl flex flex-col justify-between"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu Portal Admin</SheetTitle>
            <SheetDescription>Navigasi Portal Admin Kecamatan Gandrungmangu</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4">
            <div className="pb-3.5 border-b border-slate-200/80 dark:border-white/10 pr-8">
              {brandBlock}
            </div>
            <div className="space-y-1.5">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileSheetOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-hero font-bold uppercase tracking-wider flex items-center justify-between neu-btn text-[#061E2B] dark:text-slate-200 hover:text-[#0E7490]"
                >
                  <span>{item.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-3.5 border-t border-slate-200/80 dark:border-white/10 flex flex-col gap-2">
            <Link href={systemHref} onClick={() => setMobileSheetOpen(false)}>
              <Button className="neu-btn-primary text-white w-full h-11 rounded-2xl font-hero font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-0">
                <LogIn className="h-4 w-4" />
                <span>Masuk Sistem</span>
              </Button>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-white dark:bg-[#070b10] text-slate-900 dark:text-slate-100 overflow-x-clip transition-colors duration-300">
      {/* ── 1. HEADER: ARCHITECTURAL DUAL-WING (TOP) & FLOATING CAPSULE (SCROLLED) ── */}
      {!isScrolled ? (
        <header className="fixed top-0 left-0 z-50 w-full pointer-events-none transition-all duration-300">
          <div className="w-full h-[8px] sm:h-[12px] lg:h-[14px] bg-white dark:bg-[#070b10] pointer-events-auto" />
          <div className="relative flex items-start justify-between w-full -mt-[8px] sm:-mt-[12px] lg:-mt-[14px]">
            {/* Left Wing */}
            <div className="relative flex items-start shrink-0 pointer-events-auto">
              <div className="h-[54px] sm:h-[64px] lg:h-[68px] pl-3.5 sm:pl-6 lg:pl-8 pr-2.5 sm:pr-5 bg-white dark:bg-[#070b10] flex items-center">
                {brandBlock}
              </div>
              <svg
                viewBox="0 0 46 68"
                fill="none"
                aria-hidden="true"
                className="h-[54px] sm:h-[64px] lg:h-[68px] w-[26px] sm:w-[40px] lg:w-[46px] shrink-0 -ml-[1px] text-white dark:text-[#070b10]"
              >
                <path d="M0 0H46V12C26 12 24 68 0 68V0Z" fill="currentColor" />
              </svg>
              <svg
                viewBox="0 0 22 22"
                fill="none"
                aria-hidden="true"
                className="absolute left-2 sm:left-3 lg:left-3.5 top-[54px] sm:top-[64px] lg:top-[68px] h-[18px] w-[18px] sm:h-[22px] sm:w-[22px] text-white dark:text-[#070b10] pointer-events-none"
              >
                <path d="M0 0H22C9.85 0 0 9.85 0 22V0Z" fill="currentColor" />
              </svg>
            </div>

            {/* Center Nav */}
            <nav className="hidden lg:flex flex-1 items-center justify-center h-[68px] pt-2.5 px-4 pointer-events-auto">
              <div className="flex items-center gap-5 xl:gap-7">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="font-hero text-[13px] font-medium text-white/90 hover:text-white transition-all py-1 drop-shadow-[0_2px_8px_rgba(3,20,30,0.65)] whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            {/* Right Wing */}
            <div className="relative flex items-start shrink-0 pointer-events-auto">
              <svg
                viewBox="0 0 46 68"
                fill="none"
                aria-hidden="true"
                className="h-[54px] sm:h-[64px] lg:h-[68px] w-[26px] sm:w-[40px] lg:w-[46px] shrink-0 -mr-[1px] text-white dark:text-[#070b10]"
              >
                <path d="M46 0H0V12C20 12 22 68 46 68V0Z" fill="currentColor" />
              </svg>
              <div className="h-[54px] sm:h-[64px] lg:h-[68px] pl-1.5 sm:pl-3.5 pr-3.5 sm:pr-6 lg:pr-8 bg-white dark:bg-[#070b10] flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-2">
                  <NightModeSwitch size="sm" />
                  <Link
                    href={systemHref}
                    className="ml-1 inline-flex items-center gap-1.5 h-9 xl:h-10 px-4 xl:px-5 rounded-full bg-[#061E2B] hover:bg-[#0E7490] dark:bg-[#0E7490] dark:hover:bg-cyan-400 text-white dark:hover:text-[#061E2B] font-hero font-semibold text-xs tracking-[0.02em] shadow-sm transition-all whitespace-nowrap"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Masuk Sistem</span>
                  </Link>
                </div>
                {mobileControls}
              </div>
              <svg
                viewBox="0 0 22 22"
                fill="none"
                aria-hidden="true"
                className="absolute right-2 sm:right-3 lg:right-3.5 top-[54px] sm:top-[64px] lg:top-[68px] h-[18px] w-[18px] sm:h-[22px] sm:w-[22px] text-white dark:text-[#070b10] pointer-events-none"
              >
                <path d="M22 0H0C12.15 0 22 9.85 22 22V0Z" fill="currentColor" />
              </svg>
            </div>
          </div>
        </header>
      ) : (
        <header className="fixed top-0 left-0 z-50 w-full py-2 sm:py-3 px-2.5 sm:px-5 lg:px-8 transition-all duration-300 pointer-events-none">
          <div className="mx-auto flex items-center justify-between h-14 sm:h-[62px] max-w-7xl px-3 sm:px-5 rounded-full bg-white/95 dark:bg-[#070b10]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_36px_rgba(15,23,42,0.08)] pointer-events-auto">
            {brandBlock}
            <nav className="hidden lg:flex items-center gap-1.5">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-hero text-[12.5px] font-medium text-slate-700 dark:text-slate-300 hover:text-[#0E7490] dark:hover:text-cyan-300 hover:bg-[#EBF5F8] dark:hover:bg-white/5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="hidden lg:flex items-center gap-2">
              <NightModeSwitch size="sm" />
              <Link
                href={systemHref}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#061E2B] hover:bg-[#0E7490] dark:bg-[#0E7490] text-white font-hero font-semibold text-xs transition-all whitespace-nowrap"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Masuk Sistem</span>
              </Link>
            </div>
            {mobileControls}
          </div>
        </header>
      )}

      {/* ── 2. FRAMED CINEMATIC HERO SECTION (SERASI LANDING PAGE) ──────────────── */}
      <main className="relative z-10 space-y-1 sm:space-y-2">
        <section className="relative min-h-[100svh] lg:h-[100dvh] lg:max-h-[1080px] lg:min-h-[600px] w-full bg-white dark:bg-[#070b10] p-2 sm:p-3 lg:p-3.5">
          <div className="relative h-full min-h-[calc(100svh-16px)] sm:min-h-[calc(100svh-24px)] lg:min-h-0 w-full rounded-[20px] sm:rounded-[26px] lg:rounded-[28px] overflow-hidden bg-[#072636] text-white flex flex-col justify-between select-none shadow-[0_12px_40px_rgba(7,22,30,0.12)]">
            {/* Video / Image Backdrop */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <video
                autoPlay
                loop
                muted
                playsInline
                poster={heroImage}
                className="w-full h-full object-cover object-center brightness-[0.8] contrast-[1.06]"
              >
                <source src={MASCOT_VIDEO_URL} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-br from-[#08384a]/80 via-[#146a80]/60 to-[#062230]/88 pointer-events-none" />
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#041620]/80 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#041620]/80 to-transparent pointer-events-none" />
            </div>

            {/* Spacer Header */}
            <div className="h-14 sm:h-[68px] lg:h-[72px] shrink-0 pointer-events-none" />

            {/* Konten Hero Tengah */}
            <div className="relative z-20 flex-1 flex items-center justify-center px-4 sm:px-8 py-4">
              <div className="mx-auto max-w-4xl flex flex-col items-center text-center">
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: EASE_CINEMATIC }}
                  className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#061E2B]/75 backdrop-blur-md border border-cyan-300/35 mb-3 sm:mb-4 shadow-md"
                >
                  <span className="h-2 w-2 rounded-full bg-[#f4c430] shadow-[0_0_8px_#f4c430]" />
                  <span className="font-mono text-[9.5px] sm:text-[10.5px] font-semibold uppercase tracking-[0.22em] text-cyan-50">
                    Portal Manajemen Pemerintah Kecamatan
                  </span>
                </motion.div>

                <KineticScatterTitle
                  text="Dashboard Admin"
                  slideKey="admin-hero"
                  align="center"
                  size="center"
                />

                <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2.5 sm:gap-3.5">
                  <span className="hidden sm:block w-8 sm:w-12 h-[1.5px] bg-cyan-300/75" />
                  <p className="font-hero text-[11px] sm:text-[13px] font-bold uppercase tracking-[0.2em] text-cyan-200">
                    Gandrungmangu Semringah • Kabupaten Cilacap
                  </p>
                  <span className="hidden sm:block w-8 sm:w-12 h-[1.5px] bg-cyan-300/75" />
                </div>

                <p className="mt-2.5 font-hero text-xs sm:text-sm font-medium text-white/90 leading-relaxed max-w-2xl">
                  {configData?.subheadline ||
                    'Platform terintegrasi pengelolaan administrasi pemerintahan, sistem antrian loket, kunjungan tamu front office, dan dokumentasi kegiatan Kecamatan.'}
                </p>

                {/* 3 Tombol Aksi Utama (Selaras Pill Style Landing Page) */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href={systemHref}
                    className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0E7490] hover:bg-white text-white hover:text-[#061E2B] border border-cyan-300/40 font-hero font-bold text-xs uppercase tracking-[0.15em] shadow-[0_12px_30px_rgba(14,116,144,0.45)] transition-all duration-300 active:scale-95"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Masuk Sistem</span>
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>

                  <Link
                    href="/Antrian/"
                    className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#f4c430] hover:bg-white text-[#061E2B] font-hero font-bold text-xs uppercase tracking-[0.15em] shadow-lg transition-all duration-300 active:scale-95"
                  >
                    <Ticket className="h-4 w-4" />
                    <span>Sistem Antrian</span>
                  </Link>

                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#061E2B]/70 hover:bg-[#0E7490] text-white border border-white/25 backdrop-blur-md font-hero font-bold text-xs uppercase tracking-[0.14em] transition-all duration-300"
                  >
                    <FileText className="h-4 w-4 text-cyan-300" />
                    <span>Portal Warga</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Bottom HUD Bar */}
            <div className="relative z-30 w-full pb-4 px-4 sm:px-8 lg:px-12 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#061E2B]/80 backdrop-blur-md border border-cyan-300/25 min-w-[146px]">
                <div className="flex flex-col items-start leading-none">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
                    <span className="tabular-nums">{currentTime ? currentTime.time : '00:00:00'}</span>
                    <span className="text-[9px] text-cyan-300 font-semibold">WIB</span>
                  </div>
                  <span className="text-[8.5px] font-mono uppercase tracking-[0.12em] text-cyan-100/75 mt-0.5">
                    {currentTime ? currentTime.date : 'ADMIN • GANDRUNGMANGU'}
                  </span>
                </div>
              </div>

              <a
                href="https://sisukma.cilacapkab.go.id/Home/pelayanan/4012001"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#061E2B]/75 hover:bg-[#f4c430] text-cyan-100 hover:text-[#061E2B] border border-cyan-300/25 font-hero text-[11px] font-bold transition-all"
              >
                <Star className="h-3.5 w-3.5 text-[#f4c430] fill-current" />
                <span>SiSukma Cilacap</span>
                <ExternalLink className="h-3 w-3 opacity-75" />
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
