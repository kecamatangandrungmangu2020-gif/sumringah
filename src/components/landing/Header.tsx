'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Menu,
  ChevronDown,
  User,
  Building2,
  Ticket,
  ChevronRight,
  Landmark,
  ExternalLink,
  Users,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

export interface LandingDesaItem {
  id: string;
  name: string;
  slug: string;
  kepalaDesa?: string;
  alamat?: string;
  kontak?: string;
  deskripsi?: string;
  imageUrl?: string;
  websiteUrl?: string;
  pelayananUrl?: string;
}

interface HeaderProps {
  logoImage?: string;
  desaList: LandingDesaItem[];
  isAuthenticated?: boolean;
}

const primaryNavItems: Array<{
  href: string;
  label: string;
  isHome?: boolean;
  external?: boolean;
}> = [
  { href: '#hero-roto-section', label: 'Beranda', isHome: true },
  { href: '/Antrian/online/', label: 'Pelayanan' },
  { href: '/informasi/', label: 'Informasi' },
  { href: '/agenda-kecamatan/', label: 'Agenda' },
  { href: 'https://solid.gandrungmangu.id/', label: 'Wilayah', external: true },
  { href: '/pengaduan/', label: 'Pengaduan' },
  { href: 'https://gandrungmangu.cilacapkab.go.id/', label: 'Berita Desa', external: true },
];

export function Header({ logoImage, desaList, isAuthenticated }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isDesaDropdownOpen, setIsDesaDropdownOpen] = useState(false);
  const desaDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (desaDropdownRef.current && !desaDropdownRef.current.contains(event.target as Node)) {
        setIsDesaDropdownOpen(false);
      }
    }
    if (isDesaDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDesaDropdownOpen]);

  const adminHref = isAuthenticated ? '/admin/' : '/login/';

  const brandBlock = (
    <Link
      href="/"
      className="flex items-center gap-2 sm:gap-2.5 shrink-0 transition-all hover:opacity-90 active:scale-[0.98]"
    >
      {logoImage ? (
        <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl overflow-hidden p-0.5 shrink-0 bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10">
          <Image
            src={logoImage}
            alt="Logo Kecamatan Gandrungmangu"
            fill
            unoptimized
            className="object-contain p-0.5 pointer-events-none select-none"
          />
        </div>
      ) : (
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl shrink-0 bg-[#041E17] text-white dark:bg-[#065F46] dark:text-white">
          <Building2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </div>
      )}
      <div className="flex flex-col text-left">
        <span className="font-hero font-extrabold tracking-[0.04em] sm:tracking-[0.06em] text-[10.5px] sm:text-[12.5px] uppercase leading-none text-[#041E17] dark:text-white">
          KEC. GANDRUNGMANGU
        </span>
        <span className="text-[7px] sm:text-[8.5px] font-hero uppercase tracking-[0.14em] sm:tracking-[0.18em] font-semibold mt-0.5 sm:mt-1 text-[#065F46] dark:text-[#E5C882]">
          KABUPATEN CILACAP • SEMRINGAH
        </span>
      </div>
    </Link>
  );

  const desaDropdownMenu = (solid: boolean) => (
    <div className="relative" ref={desaDropdownRef}>
      <button
        type="button"
        onClick={() => setIsDesaDropdownOpen((prev) => !prev)}
        className={cn(
          'flex items-center gap-1 font-hero tracking-[0.01em] transition-all outline-none whitespace-nowrap cursor-pointer',
          solid
            ? 'text-[12px] xl:text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:text-[#065F46] dark:hover:text-[#E5C882] hover:bg-[#F3EFE6] dark:hover:bg-white/5 px-3 py-1.5 rounded-full'
            : 'text-[12.5px] xl:text-[13.5px] font-medium text-white/90 hover:text-white py-1 drop-shadow-[0_2px_8px_rgba(3,20,30,0.65)]'
        )}
      >
        <span>14 Desa</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            isDesaDropdownOpen && 'rotate-180'
          )}
        />
      </button>

      {isDesaDropdownOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[400px] rounded-2xl p-3 border border-[#C8A253]/20 bg-[#041E17]/95 backdrop-blur-2xl text-white shadow-2xl z-50">
          <div className="px-3 py-2 mb-2 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between text-[10.5px] text-[#C8A253] font-hero font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-[#E5C882]" />
              14 Desa di Gandrungmangu
            </span>
            <span className="text-[9px] text-[#F5E9CC]/70 font-mono">PILIH DESA</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-[340px] overflow-y-auto pr-1">
            {desaList.map((desa, idx) => (
              <Link
                key={desa.id}
                href={`/${desa.slug || desa.id}/`}
                onClick={() => setIsDesaDropdownOpen(false)}
                className="flex items-center gap-2 p-2 rounded-xl text-left bg-white/[0.04] hover:bg-[#065F46]/60 border border-transparent hover:border-[#C8A253]/30 transition-all group"
              >
                <span className="w-5 h-5 rounded-md bg-[#C8A253]/20 border border-[#C8A253]/30 text-[#E5C882] text-[9.5px] font-mono font-bold flex items-center justify-center shrink-0 group-hover:bg-[#C8A253] group-hover:text-[#041E17] transition-colors">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-hero text-white/95 font-medium group-hover:text-white truncate transition-colors">
                  {desa.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const mobileControls = (
    <div className="flex items-center gap-1.5 lg:hidden">
      <NightModeSwitch size="sm" />

      <Link
        href={adminHref}
        className="hidden sm:flex relative h-8 w-8 items-center justify-center rounded-full bg-[#F3EFE6] hover:bg-[#d8ecf2] dark:bg-white/10 dark:hover:bg-white/20 text-[#041E17] dark:text-white transition-all"
        aria-label="Portal Admin"
      >
        <User className="h-3.5 w-3.5" />
        {isAuthenticated && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#05110E]" />
        )}
      </Link>

      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="h-8 w-8 flex items-center justify-center rounded-full bg-[#041E17] hover:bg-[#065F46] dark:bg-[#065F46] text-white transition-all cursor-pointer"
            aria-label="Buka menu navigasi"
          >
            <Menu className="h-4 w-4" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-[310px] sm:w-[340px] max-w-[88vw] border-l border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#05110E] text-[#041E17] dark:text-slate-100 p-4 sm:p-5 shadow-2xl flex flex-col justify-between overflow-y-auto"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu Navigasi Kecamatan</SheetTitle>
            <SheetDescription>Menu navigasi Kecamatan Gandrungmangu</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-3.5 border-b border-slate-200/80 dark:border-white/10 pr-8">
              {brandBlock}
            </div>

            <div className="space-y-1.5">
              {primaryNavItems.map((item) =>
                item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileSheetOpen(false)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-hero font-bold uppercase tracking-wider flex items-center justify-between transition-all duration-200 neu-btn text-[#041E17] dark:text-slate-200 hover:text-[#065F46]"
                  >
                    <span>{item.label}</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-55 shrink-0" />
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileSheetOpen(false)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-hero font-bold uppercase tracking-wider flex items-center justify-between transition-all duration-200 neu-btn text-[#041E17] dark:text-slate-200 hover:text-[#065F46]"
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-40 shrink-0" />
                  </Link>
                )
              )}
              <Link
                href="/input/"
                onClick={() => setMobileSheetOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-xs font-hero font-bold uppercase tracking-wider flex items-center justify-between transition-all duration-200 neu-btn text-[#041E17] dark:text-slate-200 hover:text-[#065F46]"
              >
                <span>Laporan Kegiatan</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-40 shrink-0" />
              </Link>
            </div>

            {desaList.length > 0 && (
              <div className="neu-inset rounded-[22px] p-2.5 space-y-1">
                <div className="px-2.5 pt-1 pb-1">
                  <p className="text-[10px] font-hero font-extrabold uppercase tracking-widest text-[#065F46] dark:text-[#E5C882]">
                    14 Desa Gandrungmangu
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                  {desaList.map((desa) => (
                    <Link
                      key={desa.id}
                      href={`/${desa.slug || desa.id}/`}
                      onClick={() => setMobileSheetOpen(false)}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#065F46] hover:bg-white/70 dark:hover:bg-white/5 truncate"
                    >
                      {desa.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
            <div className="flex flex-col">
              <span className="text-xs font-hero font-bold uppercase tracking-wider text-[#041E17] dark:text-white">
                Tampilan Malam
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Mode gelap (Night Mode)
              </span>
            </div>
            <NightModeSwitch size="sm" />
          </div>

          <div className="pt-3.5 border-t border-slate-200/80 dark:border-white/10 flex flex-col gap-2 mt-3">
            <Link href="/Antrian/online/" onClick={() => setMobileSheetOpen(false)}>
              <Button className="neu-btn-primary text-white w-full h-11 rounded-2xl font-hero font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-0 shadow-md">
                <Ticket className="h-4 w-4 text-white" />
                <span>Ambil Antrian Online</span>
              </Button>
            </Link>
            <div className="flex gap-2">
              <Link href="/kunjungan-tamu/" onClick={() => setMobileSheetOpen(false)} className="flex-1">
                <Button
                  variant="outline"
                  className="neu-btn text-[#041E17] dark:text-slate-200 w-full h-9 rounded-xl font-hero font-bold text-[11px] uppercase tracking-wider"
                >
                  <Users className="h-3.5 w-3.5 mr-1.5 text-[#065F46] dark:text-[#E5C882]" />
                  Tamu
                </Button>
              </Link>
              <Link href={adminHref} onClick={() => setMobileSheetOpen(false)} className="flex-1">
                <Button
                  variant="outline"
                  className="neu-btn text-[#041E17] dark:text-slate-200 w-full h-9 rounded-xl font-hero font-bold text-[11px] uppercase tracking-wider"
                >
                  <User className="h-3.5 w-3.5 mr-1.5 text-[#065F46] dark:text-[#E5C882]" />
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  /* ═════════════════════════════════════════════════════════════════════════════
     MODE 1: ARCHITECTURAL SCULPTED DUAL-WING HEADER (LANDING TOP)
     ═════════════════════════════════════════════════════════════════════════════ */
  if (!isScrolled) {
    return (
      <header className="fixed top-0 left-0 z-50 w-full pointer-events-none transition-all duration-300">
        <div className="w-full h-[8px] sm:h-[12px] lg:h-[14px] bg-white dark:bg-[#05110E] pointer-events-auto" />

        <div className="relative flex items-start justify-between w-full -mt-[8px] sm:-mt-[12px] lg:-mt-[14px]">
          {/* LEFT WING */}
          <div className="relative flex items-start shrink-0 pointer-events-auto">
            <div className="h-[54px] sm:h-[64px] lg:h-[68px] pl-3.5 sm:pl-6 lg:pl-8 pr-2.5 sm:pr-5 bg-white dark:bg-[#05110E] flex items-center">
              {brandBlock}
            </div>
            <svg
              viewBox="0 0 46 68"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="h-[54px] sm:h-[64px] lg:h-[68px] w-[26px] sm:w-[40px] lg:w-[46px] shrink-0 -ml-[1px] text-white dark:text-[#05110E]"
            >
              <path d="M0 0H46V12C26 12 24 68 0 68V0Z" fill="currentColor" />
            </svg>
            <svg
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="absolute left-2 sm:left-3 lg:left-3.5 top-[54px] sm:top-[64px] lg:top-[68px] h-[18px] w-[18px] sm:h-[22px] sm:w-[22px] text-white dark:text-[#05110E] pointer-events-none"
            >
              <path d="M0 0H22C9.85 0 0 9.85 0 22V0Z" fill="currentColor" />
            </svg>
          </div>

          {/* CENTER RECESSED ARCH NAV */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden lg:flex flex-1 items-center justify-center h-[68px] pt-2.5 px-3 xl:px-6 pointer-events-auto"
          >
            <div className="flex items-center gap-2.5 xl:gap-4 2xl:gap-5">
              {primaryNavItems.map((item) =>
                item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-hero text-[12px] xl:text-[13px] font-medium text-white/90 hover:text-white tracking-[0.01em] transition-all duration-200 whitespace-nowrap py-1 drop-shadow-[0_2px_8px_rgba(3,20,30,0.65)]"
                  >
                    <span>{item.label}</span>
                    <ExternalLink className="h-3 w-3 opacity-80" />
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative font-hero text-[12px] xl:text-[13px] tracking-[0.01em] transition-all duration-200 whitespace-nowrap py-1 drop-shadow-[0_2px_8px_rgba(3,20,30,0.65)]',
                      item.isHome
                        ? 'text-white font-bold after:content-[""] after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[2px] after:bg-[#E5C882] after:rounded-full'
                        : 'text-white/90 hover:text-white font-medium'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              )}

              {desaDropdownMenu(false)}
            </div>
          </nav>

          {/* RIGHT WING */}
          <div className="relative flex items-start shrink-0 pointer-events-auto">
            <svg
              viewBox="0 0 46 68"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="h-[54px] sm:h-[64px] lg:h-[68px] w-[26px] sm:w-[40px] lg:w-[46px] shrink-0 -mr-[1px] text-white dark:text-[#05110E]"
            >
              <path d="M46 0H0V12C20 12 22 68 46 68V0Z" fill="currentColor" />
            </svg>

            <div className="h-[54px] sm:h-[64px] lg:h-[68px] pl-1.5 sm:pl-3.5 pr-3.5 sm:pr-6 lg:pr-8 bg-white dark:bg-[#05110E] flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1.5 xl:gap-2">
                <Link
                  href="/kunjungan-tamu/"
                  aria-label="Register Kunjungan Front Office"
                  className="h-8 w-8 flex items-center justify-center rounded-full text-slate-600 hover:text-[#065F46] hover:bg-[#F3EFE6] dark:text-slate-300 dark:hover:text-[#E5C882] dark:hover:bg-white/10 transition-all"
                  title="Register Kunjungan (Proposal, SPJ, Barang & Pengaduan)"
                >
                  <Users className="h-3.5 w-3.5" />
                </Link>

                <Link
                  href={adminHref}
                  aria-label={isAuthenticated ? 'Buka Dashboard Admin' : 'Login Admin'}
                  className="relative h-8 w-8 flex items-center justify-center rounded-full text-slate-600 hover:text-[#065F46] hover:bg-[#F3EFE6] dark:text-slate-300 dark:hover:text-[#E5C882] dark:hover:bg-white/10 transition-all"
                  title={isAuthenticated ? 'Dashboard Admin' : 'Login Admin'}
                >
                  <User className="h-3.5 w-3.5" />
                  {isAuthenticated && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                  )}
                </Link>

                <NightModeSwitch size="sm" />

                <Link
                  href="/Antrian/online/"
                  className="ml-1 inline-flex items-center justify-center h-9 xl:h-10 px-4 xl:px-5 rounded-full bg-[#041E17] hover:bg-[#065F46] dark:bg-[#065F46] dark:hover:bg-[#C8A253] text-white dark:hover:text-[#041E17] font-hero font-semibold text-xs tracking-[0.02em] shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-95 whitespace-nowrap"
                >
                  Antrian Online
                </Link>
              </div>

              {mobileControls}
            </div>

            <svg
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="absolute right-2 sm:right-3 lg:right-3.5 top-[54px] sm:top-[64px] lg:top-[68px] h-[18px] w-[18px] sm:h-[22px] sm:w-[22px] text-white dark:text-[#05110E] pointer-events-none"
            >
              <path d="M22 0H0C12.15 0 22 9.85 22 22V0Z" fill="currentColor" />
            </svg>
          </div>
        </div>
      </header>
    );
  }

  /* ═════════════════════════════════════════════════════════════════════════════
     MODE 2: SCROLLED — FLOATING PORCELAIN CAPSULE HEADER
     ═════════════════════════════════════════════════════════════════════════════ */
  return (
    <header className="fixed top-0 left-0 z-50 w-full py-2 sm:py-3 px-2.5 sm:px-5 lg:px-8 transition-all duration-300 pointer-events-none">
      <div className="mx-auto flex items-center justify-between h-14 sm:h-[62px] max-w-7xl px-3 sm:px-4 lg:px-5 xl:px-6 rounded-full bg-white/95 dark:bg-[#05110E]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_36px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.03)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.75)] pointer-events-auto transition-all duration-300">
        <div className="mr-2 xl:mr-4 shrink-0">{brandBlock}</div>

        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 shrink-0">
          {primaryNavItems.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-hero text-[11.5px] xl:text-[12.5px] tracking-[0.01em] transition-all px-2.5 py-1.5 rounded-full relative whitespace-nowrap text-slate-700 dark:text-slate-300 hover:text-[#065F46] dark:hover:text-[#E5C882] hover:bg-[#F3EFE6] dark:hover:bg-white/5 font-medium"
              >
                <span>{item.label}</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'font-hero text-[11.5px] xl:text-[12.5px] tracking-[0.01em] transition-all px-2.5 py-1.5 rounded-full relative whitespace-nowrap',
                  item.isHome
                    ? 'bg-[#065F46] text-white font-semibold shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-[#065F46] dark:hover:text-[#E5C882] hover:bg-[#F3EFE6] dark:hover:bg-white/5 font-medium'
                )}
              >
                {item.label}
              </Link>
            )
          )}

          {desaDropdownMenu(true)}
        </nav>

        <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 shrink-0 ml-2 xl:ml-4">
          <Link
            href="/kunjungan-tamu/"
            aria-label="Register Kunjungan"
            className="h-8 w-8 flex items-center justify-center rounded-full bg-[#FAF8F5] hover:bg-[#F3EFE6] dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 hover:text-[#065F46] dark:text-slate-200 dark:hover:text-[#E5C882] transition-all hover:scale-105 active:scale-95"
            title="Register Kunjungan"
          >
            <Users className="h-3.5 w-3.5" />
          </Link>

          <Link
            href={adminHref}
            aria-label="Portal Admin"
            className="relative h-8 w-8 flex items-center justify-center rounded-full bg-[#FAF8F5] hover:bg-[#F3EFE6] dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 hover:text-[#065F46] dark:text-slate-200 dark:hover:text-[#E5C882] transition-all hover:scale-105 active:scale-95"
            title={isAuthenticated ? 'Dashboard Admin' : 'Login Admin'}
          >
            <User className="h-3.5 w-3.5" />
            {isAuthenticated && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
            )}
          </Link>

          <NightModeSwitch size="sm" />

          <Link
            href="/Antrian/online/"
            className="ml-0.5 inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#041E17] hover:bg-[#065F46] dark:bg-[#065F46] dark:hover:bg-[#C8A253] text-white dark:hover:text-[#041E17] font-hero font-semibold text-xs tracking-[0.02em] shadow-sm transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap"
          >
            Antrian Online
          </Link>
        </div>

        {mobileControls}
      </div>
    </header>
  );
}
