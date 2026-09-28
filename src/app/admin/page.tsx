'use client';

import { useUser, useFirestore } from "@/firebase"
import { Button } from "@/components/ui/button"
import {
  Home,
  LogIn,
  Shield,
  Clock,
  ExternalLink,
  Menu,
  FileText,
  Ticket,
  Landmark,
  Star,
  Calendar,
  Layers,
  MapPin
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { doc, onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export default function AdminLandingPage() {
  const { user } = useUser()
  const db = useFirestore()
  const [mounted, setMounted] = useState(false)
  const [configData, setConfigData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache')
        if (cached) return JSON.parse(cached)
      } catch (e) { }
    }
    return null
  })

  useEffect(() => {
    setMounted(true)
    // Tarik data profil Kecamatan publik via API route
    fetch('/api/village-profile/?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setConfigData((prev: any) => ({ ...prev, ...data }))
          try {
            localStorage.setItem('village_profile_cache', JSON.stringify(data))
          } catch (e) { }
        }
      })
      .catch(err => console.warn('Could not fetch village profile API:', err))
  }, [])

  // Jika user sedang login, aktifkan listener onSnapshot Firestore untuk update real-time
  useEffect(() => {
    if (!db || !user) return
    const unsub = onSnapshot(doc(db, "settings", "village"), (snap) => {
      if (snap.exists()) {
        const d = snap.data()
        setConfigData((prev: any) => ({ ...prev, ...d }))
      }
    })
    return () => unsub()
  }, [db, user])

  if (!mounted) return null

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
    if (!raw || typeof raw !== 'string') return '/img/Logo.png';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
      return raw;
    }
    return `data:image/png;base64,${raw}`;
  };

  const heroImage = getFormattedHeroImage(configData);
  const logoImage = getFormattedLogo(configData);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white font-sans selection:bg-amber-400 selection:text-slate-950">
      
      {/* ── 1. HEADER / NAVBAR (SERASI DENGAN LANDING PAGE) ────────────────────── */}
      <header className="px-4 lg:px-10 h-20 flex items-center justify-between border-b border-white/10 bg-slate-950/75 backdrop-blur-md sticky top-0 z-50 text-white">
        <Link href="/" className="flex items-center gap-3.5 hover:opacity-90 transition-opacity">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center relative shrink-0 shadow-lg shadow-black/40 overflow-hidden bg-black/30 border border-white/15 p-1">
            <Image
              src={logoImage}
              alt="Logo Cilacap"
              fill
              className="object-contain p-1"
              unoptimized
            />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-black text-lg sm:text-xl text-white tracking-tight leading-tight">
              Kecamatan Gandrungmangu
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-amber-300/90 tracking-wider uppercase">
              Kabupaten Cilacap
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2.5">
          <Button asChild variant="outline" className="rounded-full font-bold border-amber-400/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 hover:text-amber-200 transition-all">
            <Link href="/">
              <FileText className="w-4 h-4 mr-1.5 text-amber-400" />
              Portal Warga
            </Link>
          </Button>

          <Button asChild variant="outline" className="rounded-full font-bold border-sky-400/30 text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 hover:text-sky-200 transition-all">
            <Link href="/Antrian/">
              <Ticket className="w-4 h-4 mr-1.5 text-sky-400" />
              Sistem Antrian
            </Link>
          </Button>

          <Button asChild variant="outline" className="rounded-full font-bold border-white/15 text-slate-200 bg-white/5 hover:bg-white/15 hover:text-white transition-all">
            <Link href="/agenda/">
              <Calendar className="w-4 h-4 mr-1.5 text-sky-300" />
              Agenda
            </Link>
          </Button>

          <Button asChild variant="default" className="rounded-full font-bold bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-500/20 hover:scale-105 transition-all border border-amber-300/60 ml-1">
            <Link href={user ? "/dashboard/" : "/login/"}>
              <LogIn className="w-4 h-4 mr-1.5 text-slate-950" />
              Masuk Sistem
            </Link>
          </Button>
        </div>

        {/* Mobile Nav (Hamburger) */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 text-white">
                <Menu className="h-6 w-6 text-white" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] border-l border-white/10 rounded-l-[2rem] shadow-2xl bg-slate-950 text-white">
              <SheetHeader className="text-left pb-6 border-b border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 bg-primary/20 border border-primary/40 rounded-xl flex items-center justify-center p-1.5 relative shrink-0">
                    <Image src={logoImage} alt="Logo" fill className="object-contain p-1" unoptimized />
                  </div>
                  <SheetTitle className="text-white font-black uppercase tracking-tight text-base">Menu Portal</SheetTitle>
                </div>
                <SheetDescription className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Pemerintah Kecamatan Gandrungmangu</SheetDescription>
              </SheetHeader>

              <div className="py-6 space-y-3">
                <Button asChild variant="ghost" className="w-full h-14 justify-start gap-4 rounded-2xl text-sm font-black uppercase tracking-tight bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all">
                  <Link href="/">
                    <div className="h-10 w-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                      <FileText className="h-5 w-5" />
                    </div>
                    Portal Warga
                  </Link>
                </Button>

                <Button asChild variant="ghost" className="w-full h-14 justify-start gap-4 rounded-2xl text-sm font-black uppercase tracking-tight bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 transition-all">
                  <Link href="/Antrian/">
                    <div className="h-10 w-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20">
                      <Ticket className="h-5 w-5" />
                    </div>
                    Sistem Antrian
                  </Link>
                </Button>

                <Button asChild variant="ghost" className="w-full h-14 justify-start gap-4 rounded-2xl text-sm font-black uppercase tracking-tight bg-white/5 text-white hover:bg-white/10 transition-all">
                  <Link href="/agenda/">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-sky-300">
                      <Calendar className="h-5 w-5" />
                    </div>
                    Agenda Kegiatan
                  </Link>
                </Button>

                <Button asChild variant="ghost" className="w-full h-14 justify-start gap-4 rounded-2xl text-sm font-black uppercase tracking-tight bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg">
                  <Link href={user ? "/dashboard/" : "/login/"}>
                    <div className="h-10 w-10 rounded-xl bg-slate-950/20 flex items-center justify-center shrink-0 text-slate-950">
                      <LogIn className="h-5 w-5" />
                    </div>
                    Masuk Sistem
                  </Link>
                </Button>
              </div>

              <div className="absolute bottom-8 left-6 right-6 border-t border-white/10 pt-4">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-amber-300/80 font-bold uppercase tracking-widest">Kecamatan Gandrungmangu</p>
                  <p className="text-[9px] text-slate-400 font-medium">Kabupaten Cilacap, Jawa Tengah</p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* ── 2. HERO SECTION IDENTIK LANDING PAGE ────────────────────────────────── */}
      <main className="flex-1">
        <section className="relative w-full min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden py-16 md:py-24">
          {/* Foto Halaman Utama & Vignette Hangat Alami */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            {heroImage ? (
              <Image
                src={heroImage}
                alt="Foto Utama Kecamatan Gandrungmangu"
                fill
                priority
                className="object-cover object-center brightness-95 scale-100"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-blue-900 via-sky-800 to-amber-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-slate-950/70 to-slate-950/95" />
            <div className="absolute inset-0 bg-radial from-transparent via-slate-950/20 to-black/60" />
          </div>

          <div className="container relative z-10 mx-auto px-4 text-center my-auto flex flex-col items-center">
            
            {/* Badge Pemerintah Kecamatan */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-md border border-amber-400/30 text-amber-300 text-[11px] sm:text-xs font-bold tracking-[0.25em] uppercase mb-3 sm:mb-4 shadow-lg animate-in fade-in slide-in-from-bottom-3 duration-700">
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Pemerintah Kecamatan</span>
            </div>

            {/* Judul Besar 2 Baris: Dashboard Admin */}
            <h1 className="select-none mb-3 sm:mb-4 flex flex-col items-center justify-center leading-[1.05] sm:leading-[1.08] animate-in fade-in slide-in-from-bottom-5 duration-700">
              <span className="font-heading font-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[80px] text-white tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
                Dashboard
              </span>

              <span className="relative inline-flex flex-col items-center mt-1 sm:mt-2">
                <span className="relative inline-flex items-center justify-center">
                  <span className="font-editorial italic font-extrabold text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[94px] text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-yellow-400 tracking-tight drop-shadow-[0_4px_24px_rgba(245,158,11,0.5)]">
                    Admin
                  </span>
                </span>

                {/* Lengkungan Garis Senyuman (Smile Arc) Presisi */}
                <span className="w-44 sm:w-64 md:w-80 lg:w-96 h-4 sm:h-6 relative -mt-0.5 sm:-mt-1 flex items-center justify-center pointer-events-none">
                  <svg
                    viewBox="0 0 320 38"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full overflow-visible"
                  >
                    <defs>
                      <linearGradient id="smileGradientAdmin" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.75" />
                        <stop offset="25%" stopColor="#FDE047" />
                        <stop offset="50%" stopColor="#FFFFFF" />
                        <stop offset="75%" stopColor="#FDE047" />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.75" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 12 10 Q 160 38 308 10"
                      stroke="url(#smileGradientAdmin)"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </span>
            </h1>

            {/* Slogan SEMRINGAH Badge */}
            <div className="mb-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-bold shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: '#0f172a',
                  fontSize: '0.825rem',
                  letterSpacing: '0.3px',
                  border: '1px solid #fef08a'
                }}
              >
                <Star className="w-3.5 h-3.5 fill-current text-slate-900" />
                "SEMAngat memberIkan pelayanan NGgawe bungAH"
              </span>
            </div>

            {/* Subtitle Deskripsi */}
            <p className="text-sm sm:text-base md:text-lg text-slate-200/90 max-w-2xl mx-auto leading-relaxed font-normal mb-8 drop-shadow-sm animate-in fade-in slide-in-from-bottom-7 duration-700">
              {configData?.subheadline || "Platform terintegrasi pengelolaan administrasi pemerintahan, pelayanan warga Kecamatan, dan dokumentasi kegiatan."}
            </p>

            {/* 3 Tombol Aksi Utama */}
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 md:gap-5 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-9 duration-1000">
              {/* Tombol 1: Masuk Sistem */}
              <Link
                href={user ? "/dashboard/" : "/login/"}
                className="w-full sm:w-auto min-w-[200px] md:min-w-[220px] h-16 md:h-18 px-7 md:px-9 rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 text-blue-700 hover:text-blue-800 font-black text-base md:text-lg tracking-wide uppercase shadow-xl shadow-black/25 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 border border-white"
              >
                <LogIn className="h-5 w-5 md:h-6 md:w-6 text-blue-700 shrink-0" />
                <span>MASUK SISTEM</span>
              </Link>

              {/* Tombol 2: Antrian */}
              <Link
                href="/Antrian/"
                className="w-full sm:w-auto min-w-[200px] md:min-w-[220px] h-16 md:h-18 px-7 md:px-9 rounded-2xl bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-base md:text-lg tracking-wide uppercase shadow-xl shadow-sky-950/40 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 border border-sky-300/40"
              >
                <Ticket className="h-5 w-5 md:h-6 md:w-6 text-sky-100 shrink-0" />
                <span>ANTRIAN</span>
              </Link>

              {/* Tombol 3: Portal Warga */}
              <Link
                href="/"
                className="w-full sm:w-auto min-w-[200px] md:min-w-[220px] h-16 md:h-18 px-7 md:px-9 rounded-2xl bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md border border-white/20 hover:border-amber-400/40 text-white font-bold text-base md:text-lg tracking-normal shadow-xl shadow-slate-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
              >
                <FileText className="h-5 w-5 md:h-6 md:w-6 text-amber-400 shrink-0" />
                <span>Portal Warga</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 3. FITUR & SISTEM TERPADU KECAMATAN ─────────────────────────────────── */}
        <section id="features" className="py-24 bg-slate-950/95 relative z-10 border-t border-white/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-400 text-xs font-bold uppercase tracking-widest">
                <span>DIGITALISASI KECAMATAN</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
                Sistem & Pelayanan Terpadu
              </h2>
              <div className="h-1.5 w-24 bg-gradient-to-r from-blue-500 via-amber-400 to-yellow-400 mx-auto rounded-full" />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {[
                {
                  title: "Database Terpadu",
                  icon: Shield,
                  desc: "Satu database untuk seluruh data administrasi Kecamatan, tersimpan aman dan terintegrasi real-time cloud.",
                  color: "text-sky-400",
                  bg: "bg-sky-500/10 border-sky-500/20"
                },
                {
                  title: "Laporan Kegiatan",
                  icon: ExternalLink,
                  desc: "Digitalisasi setiap agenda, kegiatan dinas, dan pembangunan wilayah Kecamatan secara transparan.",
                  color: "text-amber-400",
                  bg: "bg-amber-500/10 border-amber-500/20"
                },
                {
                  title: "Pelayanan Mandiri",
                  icon: FileText,
                  desc: "Layanan permohonan surat online cepat, tertib administrasi, dan mudah diakses oleh warga masyarakat.",
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/10 border-emerald-500/20"
                },
                {
                  title: "Sistem Antrian Loket",
                  icon: Ticket,
                  desc: "Kiosk tiket fisik, layar display TV ruang tunggu, dan konsol loket pelayanan terpadu real-time.",
                  color: "text-blue-400",
                  bg: "bg-blue-500/10 border-blue-500/20"
                }
              ].map((f, i) => (
                <div key={i} className="p-8 rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-md shadow-lg shadow-black/20 hover:border-amber-400/40 hover:-translate-y-1.5 transition-all duration-300 group relative overflow-hidden">
                  <div className={`h-14 w-14 rounded-2xl ${f.bg} ${f.color} border shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300`}>
                    <f.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                  <p className="text-slate-300/80 leading-relaxed text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── 4. FOOTER IDENTIK LANDING PAGE ─────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2 space-y-6">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden relative shrink-0 p-1">
                  <Image src={logoImage} alt="Logo" fill className="object-contain p-1" unoptimized />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-tight text-white leading-tight">Kecamatan Gandrungmangu</span>
                  <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase">Kabupaten Cilacap</span>
                </div>
              </div>
              <p className="max-w-md leading-relaxed text-sm text-slate-300">
                Pemerintah Kecamatan Gandrungmangu berkomitmen untuk terus berinovasi dalam memberikan pelayanan prima melalui digitalisasi terpadu dan transparan.
              </p>
              <div className="pt-2">
                <a
                  href="https://sisukma.cilacapkab.go.id/Home/pelayanan/4012001"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-all shadow-sm"
                >
                  <Star className="w-4 h-4 fill-current text-amber-400" />
                  Bantu Nilai Kami di Sisukma Cilacap
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-amber-400 font-bold text-sm uppercase tracking-widest">Akses Menu</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/" className="text-amber-300 font-semibold hover:text-white transition-colors">Portal Warga</Link></li>
                <li><Link href="/Antrian/" className="hover:text-amber-300 transition-colors">Sistem Antrian Terpadu</Link></li>
                <li><Link href="/agenda/" className="hover:text-amber-300 transition-colors">Agenda Kegiatan Wilayah</Link></li>
                <li><Link href={user ? "/dashboard/" : "/login/"} className="hover:text-amber-300 transition-colors">Masuk Sistem Manajemen</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-amber-400 font-bold text-sm uppercase tracking-widest">Website & Layanan</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="https://gandrungmangu.cilacapkab.go.id/" target="_blank" rel="noreferrer" className="hover:text-amber-300 transition-colors inline-flex items-center gap-1.5">
                    Website Resmi Kecamatan <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                </li>
                <li>
                  <a href="https://cilacapkab.go.id/" target="_blank" rel="noreferrer" className="hover:text-amber-300 transition-colors inline-flex items-center gap-1.5">
                    Portal Kabupaten Cilacap <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-slate-500 font-medium">
            <p className="uppercase tracking-wider">
              &copy; {new Date().getFullYear()} Pemerintah Kecamatan Gandrungmangu. Seluruh Hak Cipta Dilindungi.
            </p>
            <div className="flex gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Gandrungmangu Semringah</span>
              <span>&bull;</span>
              <span>Cilacap Bercahaya</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
