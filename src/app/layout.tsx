"use client"

import './globals.css';
import { BottomNav } from '@/components/layout/BottomNav';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Button } from '@/components/ui/button';
import { Settings, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { VectorBackground } from '@/components/layout/VectorBackground';
import { useUser } from '@/firebase';

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
    isDesaPage;

  return (
    <html lang="id">
      <head>
        <title>Manajemen Kecamatan Gandrungmangu</title>
        <meta name="description" content="Sistem Manajemen & Pelayanan Kecamatan Gandrungmangu, Kec. Gandrungmangu, Kab. Cilacap" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />

        {/* ── PWA / Android APK ────────────────────────────────── */}
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#13447c" />
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

        {/* ── Fonts ────────────────────────────────────────────── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

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
      <body className="font-body antialiased bg-background overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
        {!mounted ? (
          <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
          </div>
        ) : (
          <FirebaseClientProvider>
            {!isAntrian && <VectorBackground />}
            {isPublicPage ? (
              <main className="w-full min-h-screen relative z-10">
                {children}
                <Toaster />
              </main>
            ) : (
              <ManagementGuard>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full overflow-hidden relative z-10">
                    <AppSidebar />
                    <SidebarInset className="flex-1 flex flex-col min-w-0 bg-transparent">
                      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 md:hidden">
                        <SidebarTrigger className="h-10 w-10" />
                        <div className="flex-1 text-center font-black text-primary uppercase tracking-tighter">Gandrungmangu</div>
                        <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10">
                          <Link href="/settings/">
                            <Settings className="h-5 w-5 text-muted-foreground" />
                          </Link>
                        </Button>
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
      </body>
    </html>
  );
}
