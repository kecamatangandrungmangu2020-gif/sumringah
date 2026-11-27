"use client"

import './globals.css';
import { BottomNav } from '@/components/layout/BottomNav';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Button } from '@/components/ui/button';
import { Settings, Loader2, Globe, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BackgroundPattern } from '@/components/landing/BackgroundPattern';
import { NightModeSwitch } from '@/components/ui/NightModeSwitch';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { useUser } from '@/firebase';

function getSystemPageTitle(pathname: string | null): string {
  const p = (pathname || '').replace(/\/$/, '').toLowerCase();
  if (p.startsWith('/dashboard')) return 'Dashboard Kecamatan';
  if (p.startsWith('/agenda')) return 'Agenda Kegiatan';
  if (p.startsWith('/pelayanan/informasi')) return 'Informasi Terkini';
  if (p.startsWith('/pelayanan/desa')) return 'Profil & Layanan Desa';
  if (p.startsWith('/pelayanan/wilayah')) return 'Data Wilayah';
  if (p.startsWith('/pelayanan/pengaduan')) return 'Pengaduan & Informasi';
  if (p.startsWith('/pelayanan')) return 'Kelola Pengajuan';
  if (p.startsWith('/penduduk')) return 'Data Penduduk';
  if (p.startsWith('/arsip-dokumen')) return 'Arsip Digital';
  if (p.startsWith('/arsip-nomor-surat')) return 'Register Surat';
  if (p.startsWith('/sppd')) return 'Manajemen SPPD';
  if (p.startsWith('/kegiatan')) return 'Laporan Kegiatan';
  if (p.startsWith('/dokumen-penunjang')) return 'Cetak Dokumen';
  if (p.startsWith('/profile')) return 'Data Karyawan Kecamatan';
  if (p.startsWith('/data-kesehatan')) return 'Data Kesehatan';
  if (p.startsWith('/settings')) return 'Pengaturan Sistem';
  return 'Sistem Terpadu';
}

/**
 * Guard Komponen untuk memastikan hanya admin gandrungmangu@gmail.id 
 * yang bisa mengakses fitur manajemen Kecamatan.
 */
function ManagementGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        router.replace('/login/');
      } else {
        setAuthorized(true);
      }
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !authorized) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary/40 mb-4" />
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Memverifikasi Otoritas Manajemen...</p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sembunyikan sidebar di Landing Page (/), Portal Admin (/admin), Login Page (/login), 
  // fitur Dev Utility, Print, Portal Surat Online Warga (/suratonline), dan Halaman Pengajuan Surat (/pengajuan-surat)
  const isDevUtility = pathname?.startsWith('/dev/');
  const isPrintPage = pathname?.startsWith('/print/') || pathname?.startsWith('/print');
  const isSuratOnline = pathname?.startsWith('/suratonline/') || pathname === '/suratonline';
  const isPengajuanSurat = pathname?.startsWith('/pengajuan-surat/') || pathname === '/pengajuan-surat' || pathname?.startsWith('/pengajuan');
  const isAntrian = pathname?.toLowerCase().startsWith('/antrian');
  const isAdminPortal = pathname === '/admin' || pathname === '/admin/';

  // Daftar 14 desa publik agar bebas diakses masyarakat umum tanpa harus login
  const DAFTAR_DESA_SLUGS = [
    'bulusari',
    'cinangsi',
    'cisumur',
    'gandrungmangu',
    'gandrungmanis',
    'gintungreja',
    'karanganyar',
    'karanggintung',
    'kertajaya',
    'layansari',
    'muktisari',
    'rungkang',
    'sidaurip',
    'wringinharjo'
  ];
  const cleanPath = pathname?.replace(/^\/|\/$/g, '').toLowerCase() || '';
  const isDesaPage =
    DAFTAR_DESA_SLUGS.some((slug) => cleanPath === slug || cleanPath.startsWith(slug + '/')) ||
    cleanPath.startsWith('desa/') ||
    cleanPath === 'desa';

  const isInputPage = pathname === '/input' || pathname === '/input/' || pathname?.startsWith('/input/');
  const isInformasiPage = pathname === '/informasi' || pathname === '/informasi/' || pathname?.startsWith('/informasi');
  const isKunjunganTamu =
    pathname === '/kunjungan-tamu' ||
    pathname === '/kunjungan-tamu/' ||
    pathname?.startsWith('/kunjungan-tamu/');
  const isFileConverter =
    pathname === '/file-converter' ||
    pathname === '/file-converter/' ||
    pathname?.startsWith('/file-converter/');

  const isPublicPage =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/login/' ||
    isAdminPortal ||
    isDevUtility ||
    isPrintPage ||
    isSuratOnline ||
    isPengajuanSurat ||
    isAntrian ||
    isInputPage ||
    isDesaPage ||
    isInformasiPage ||
    isKunjunganTamu ||
    isFileConverter;

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <title>Kecamatan Gandrungmangu — Pelayanan Digital Semringah</title>
        <meta name="description" content="Portal Resmi Sistem Manajemen & Pelayanan Digital Kecamatan Gandrungmangu, Kabupaten Cilacap" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />

        {/* ── PWA / Android APK ────────────────────────────────── */}
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#065F46" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Gandrungmangu" />

        {/* ── iOS PWA (Add to Home Screen) ─────────────────────── */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Gandrungmangu" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* ── Favicon ──────────────────────────────────────────── */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* ── Fonts (Plus Jakarta Sans, Montserrat, Fraunces, Oswald, JetBrains Mono) ── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,800&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700;800;900&family=Oswald:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* ── Theme Pre-hydration Script ───────────────────────── */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var savedTheme = localStorage.getItem('gandrungmangu_theme');
                if (savedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />

        {/* ── Service Worker Registration ───────────────────────── */}
        <script dangerouslySetInnerHTML={{
          __html: `
          if ('serviceWorker' in navigator) {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for (var r of registrations) { r.unregister(); }
              });
            } else {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(reg) { console.log('[PWA] SW registered:', reg.scope); })
                  .catch(function(err) { console.warn('[PWA] SW registration failed:', err); });
              });
            }
          }
        `}} />
      </head>
      <body className="font-sans antialiased bg-background text-foreground overflow-x-hidden selection:bg-[#065F46] selection:text-white" suppressHydrationWarning>
        <ThemeProvider>
          {!mounted ? (
            <div className="flex h-screen w-full items-center justify-center bg-background">
              <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
            </div>
          ) : (
            <FirebaseClientProvider>
              {!isAntrian && !isPublicPage && <BackgroundPattern />}
              {isPublicPage ? (
                <main className="w-full min-h-screen relative z-10">
                  {children}
                  <Toaster />
                </main>
              ) : (
                <ManagementGuard>
                  <SidebarProvider>
                    <div className="system-shell flex min-h-screen w-full overflow-hidden relative z-10">
                      <AppSidebar />
                      <SidebarInset className="flex-1 flex flex-col min-w-0 bg-transparent">
                        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0A1F1A]/90 backdrop-blur-xl px-4 md:px-6 shadow-[0_4px_20px_rgba(4,30,23,0.04)]">
                          <div className="flex items-center gap-3 min-w-0">
                            <SidebarTrigger className="h-9 w-9 rounded-full bg-[#F3EFE6] hover:bg-[#065F46] text-[#065F46] hover:text-white dark:bg-white/10 dark:text-[#E5C882] transition-colors" />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-[#065F46] dark:bg-[#C8A253] shrink-0" />
                                <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#065F46] dark:text-[#E5C882] truncate">
                                  Kecamatan Gandrungmangu
                                </span>
                              </div>
                              <span className="font-hero font-extrabold text-sm sm:text-base text-[#041E17] dark:text-white truncate leading-tight">
                                {getSystemPageTitle(pathname)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              href="/kunjungan-tamu/?channel=front_office"
                              className="hidden lg:inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-[#F3EFE6] hover:bg-[#065F46] text-[#065F46] hover:text-white dark:bg-white/10 dark:text-[#E5C882] font-hero text-[11px] font-bold transition-all"
                            >
                              <Users className="h-3.5 w-3.5" />
                              <span>Kunjungan Tamu</span>
                            </Link>
                            <Link
                              href="/"
                              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-[#041E17] hover:bg-[#065F46] text-white font-hero text-[11px] font-bold transition-all"
                            >
                              <Globe className="h-3.5 w-3.5 text-[#E5C882]" />
                              <span>Portal Warga</span>
                            </Link>
                            <Link
                              href="/admin/"
                              className="inline-flex items-center gap-1.5 h-8 px-3 sm:px-3.5 rounded-full bg-[#065F46] hover:bg-[#047857] text-white dark:bg-[#C8A253]/20 dark:text-[#E5C882] dark:border dark:border-[#C8A253]/30 dark:hover:bg-[#C8A253]/30 font-hero text-[11px] font-bold shadow-sm transition-all"
                              title="Kembali ke Portal Admin"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                              <span className="hidden xs:inline sm:inline">Kembali ke Admin</span>
                            </Link>
                            <NightModeSwitch size="sm" />
                            <Button variant="ghost" size="icon" asChild className="rounded-full h-9 w-9 bg-[#FAF8F5] hover:bg-[#F3EFE6] dark:bg-white/10 text-[#041E17] dark:text-slate-200">
                              <Link href="/settings/" title="Pengaturan">
                                <Settings className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </header>
                        <main className="flex-1 w-full max-w-screen-2xl mx-auto p-0 overflow-y-auto">
                          <div className="pb-24 md:pb-8">
                            {children}
                          </div>
                        </main>
                      </SidebarInset>
                    </div>
                    <BottomNav />
                    <Toaster />
                  </SidebarProvider>
                </ManagementGuard>
              )}
            </FirebaseClientProvider>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
