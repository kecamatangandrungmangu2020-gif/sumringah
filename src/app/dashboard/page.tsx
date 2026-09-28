
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Map,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  Users,
  LayoutDashboard,
  RefreshCw,
  Loader2,
  MapPin,
  Plus
} from "lucide-react"
import { KegiatanCard } from "@/components/kegiatan/KegiatanCard"
import { KegiatanUpload } from "@/components/kegiatan/KegiatanUpload"
import { SppdUpload } from "@/components/sppd/SppdUpload"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import Link from "next/link"
import { useUser, useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { callAppsScript } from "@/app/agenda/actions"

export default function DashboardPage() {
  const [isKegiatanOpen, setIsKegiatanOpen] = useState(false)
  const [isSppdOpen, setIsSppdOpen] = useState(false)
  const [todayAgenda, setTodayAgenda] = useState<any[]>([])
  const [isAgendaLoading, setIsAgendaLoading] = useState(false)
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // GLOBAL SETTINGS: Use shared village settings
  const villageSettingsRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "settings", "village")
  }, [db, user])
  const { data: villageSettings } = useDoc(villageSettingsRef)

  const fetchTodayAgenda = useCallback(async () => {
    setIsAgendaLoading(true);
    try {
      const calendarId = villageSettings?.googleCalendarId || GOOGLE_CONFIG.calendarId;
      const localDateStr = format(new Date(), "yyyy-MM-dd");
      const res = await callAppsScript({
        action: 'getCalendar',
        calendarId: calendarId,
        date: localDateStr
      });

      if (res && res.success && res.items) {
        setTodayAgenda(res.items);
      } else {
        setTodayAgenda([]);
      }
    } catch (err) {
      console.warn("Dashboard Agenda fetch error:", err);
      setTodayAgenda([]);
    } finally {
      setIsAgendaLoading(false);
    }
  }, [villageSettings]);

  useEffect(() => {
    if (mounted && villageSettings) {
      fetchTodayAgenda();
    }
  }, [mounted, fetchTodayAgenda, villageSettings]);

  // GLOBAL COLLECTIONS: Shared village data
  const kegiatanQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "kegiatans"),
      orderBy("uploadDate", "desc"),
      limit(2)
    )
  }, [db, user])

  const { data: kegiatans, isLoading: isKegiatanLoading } = useCollection(kegiatanQuery)

  const sppdQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "sppds"),
      orderBy("expenseDate", "desc"),
      limit(3)
    )
  }, [db, user])

  const { data: sppds } = useCollection(sppdQuery)

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 pb-24 md:pb-8 animate-fade-in-up">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center shadow-lg shadow-blue-950/15">
              <LayoutDashboard className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gradient-Kecamatan">
                  Dashboard Kecamatan
                </h1>
                <Badge className="badge-Kecamatan text-[9px] py-0.5 px-2">TERPADU 2026</Badge>
              </div>
              <p className="text-muted-foreground text-xs md:text-sm font-medium">Pusat database dan layanan terpadu Kecamatan Gandrungmangu.</p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="card-Kecamatan overflow-hidden relative group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-sky-500 opacity-80 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 md:p-5 pb-0 flex flex-row items-center justify-between space-y-0">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">Laporan</p>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <FileText className="h-4 w-4 md:h-4.5 md:w-4.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-5 pt-1 md:pt-2">
            <div className="text-2xl md:text-3xl font-black text-gradient-Kecamatan">{kegiatans?.length || 0}</div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1 md:mt-2 font-semibold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
              Database Kecamatan
            </p>
          </CardContent>
        </Card>

        <Card className="card-Kecamatan overflow-hidden relative group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400 opacity-80 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 md:p-5 pb-0 flex flex-row items-center justify-between space-y-0">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">SPPD</p>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Map className="h-4 w-4 md:h-4.5 md:w-4.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-5 pt-1 md:pt-2">
            <div className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400">{sppds?.length || 0}</div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1 md:mt-2 font-semibold">Histori Dinas</p>
          </CardContent>
        </Card>

        <Card className="card-Kecamatan overflow-hidden relative group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-600 to-blue-500 opacity-80 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 md:p-5 pb-0 flex flex-row items-center justify-between space-y-0">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">Anggaran</p>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-700 dark:text-sky-300 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-4 w-4 md:h-4.5 md:w-4.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-5 pt-1 md:pt-2">
            <div className="text-2xl md:text-3xl font-black text-primary">85%</div>
            <p className="text-[9px] md:text-[10px] text-primary/80 font-black mt-1 md:mt-2 uppercase tracking-tight">Realisasi 2026</p>
          </CardContent>
        </Card>

        <Card className="card-Kecamatan overflow-hidden relative group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-500 opacity-80 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="p-4 md:p-5 pb-0 flex flex-row items-center justify-between space-y-0">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hadir</p>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4 md:h-4.5 md:w-4.5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-5 pt-1 md:pt-2">
            <div className="text-2xl md:text-3xl font-black text-blue-600 dark:text-sky-400">100%</div>
            <p className="text-[9px] md:text-[10px] text-blue-700/90 dark:text-sky-300 font-black mt-1 md:mt-2 uppercase tracking-tight">Staff Aktif</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <Card className="card-Kecamatan overflow-hidden">
            <CardHeader className="card-Kecamatan-header">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base md:text-lg font-black text-gradient-Kecamatan uppercase tracking-tight">Agenda Hari Ini</CardTitle>
                  <CardDescription className="text-[10px] md:text-xs font-medium">Sinkronisasi kalender kegiatan Kecamatan Gandrungmangu</CardDescription>
                </div>
                <button
                  type="button"
                  onClick={fetchTodayAgenda}
                  className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-all active:scale-95"
                  title="Perbarui Agenda"
                >
                  <RefreshCw className={cn("h-4 w-4", isAgendaLoading && "animate-spin")} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {isAgendaLoading ? (
                  <div className="p-10 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Menghubungkan kalender Kecamatan...</p>
                  </div>
                ) : todayAgenda.length > 0 ? (
                  todayAgenda.map((agenda, i) => (
                    <div key={i} className="p-4 flex items-center gap-4 hover:bg-primary/5 transition-colors">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500/15 to-blue-600/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{agenda.summary}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-semibold">{agenda.location || "Balai Kecamatan Gandrungmangu"}</p>
                        </div>
                      </div>
                      <Badge className="badge-Kecamatan text-[8px] md:text-[9px] py-0.5 px-2">AKTIF</Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-8 md:p-10 text-center flex flex-col items-center gap-2">
                    <p className="text-xs text-muted-foreground font-medium italic">Tidak ada jadwal agenda kedinasan hari ini.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-black text-gradient-Kecamatan uppercase tracking-tight">Laporan Kecamatan Terbaru</h3>
              <Button variant="ghost" size="sm" asChild className="text-primary font-bold text-xs hover:bg-primary/10 rounded-xl">
                <Link href="/kegiatan/" className="flex items-center gap-1">
                  Lihat Semua <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {isKegiatanLoading ? (
                <div className="col-span-full py-10 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary/30" />
                  <p className="text-[10px] text-muted-foreground">Sinkronisasi data kegiatan...</p>
                </div>
              ) : (kegiatans || []).length > 0 ? (
                kegiatans?.map((item) => (
                  <KegiatanCard
                    key={item.id}
                    kegiatan={{
                      ...item,
                      imageUrl: item.imageUrls?.[0] === "Tersimpan di Drive" ? "https://picsum.photos/seed/" + item.id + "/600/400" : (item.imageUrls?.[0] || `https://picsum.photos/seed/${item.id}/600/400`)
                    }}
                  />
                ))
              ) : (
                <div className="col-span-full py-10 text-center border-2 border-dashed rounded-3xl border-primary/15 bg-white/40 dark:bg-card/40 backdrop-blur-sm">
                  <p className="text-xs text-muted-foreground italic">Belum ada histori tercatat.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <Card className="card-Kecamatan overflow-hidden">
            <CardHeader className="card-Kecamatan-header">
              <CardTitle className="text-base md:text-lg font-black text-gradient-Kecamatan uppercase tracking-tight">Aksi Cepat</CardTitle>
              <CardDescription className="text-[10px] md:text-xs font-medium">Input dan pengajuan data terpadu</CardDescription>
            </CardHeader>
            <CardContent className="p-5 md:p-6 space-y-3">
              <Dialog open={isKegiatanOpen} onOpenChange={setIsKegiatanOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full h-14 justify-start gap-4 text-sm md:text-base font-bold shadow-lg shadow-blue-950/15 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 transition-all active:scale-[0.98]">
                    <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shadow-sm">
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                    Input Laporan Kecamatan
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 rounded-3xl border-none shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="font-black uppercase text-primary">Input Laporan</DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase">Dokumentasikan kegiatan pembangunan atau sosial.</DialogDescription>
                  </DialogHeader>
                  <KegiatanUpload onSuccess={() => setIsKegiatanOpen(false)} />
                </DialogContent>
              </Dialog>

              <Dialog open={isSppdOpen} onOpenChange={setIsSppdOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full h-14 justify-start gap-4 text-sm md:text-base font-bold border-primary/20 rounded-2xl hover:bg-primary/10 hover:border-primary/40 transition-all active:scale-[0.98]">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Map className="h-5 w-5" />
                    </div>
                    Pengajuan SPPD
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 rounded-3xl border-none shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="font-black uppercase text-accent">Pengajuan SPPD</DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase">Input rincian biaya perjalanan dinas.</DialogDescription>
                  </DialogHeader>
                  <SppdUpload onSuccess={() => setIsSppdOpen(false)} />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="font-black text-gradient-Kecamatan uppercase tracking-tight text-sm px-1">Status Pengajuan SPPD</h3>
            <div className="space-y-3">
              {sppds && sppds.length > 0 ? (
                sppds.map((sppd, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-blue-950/10 dark:border-blue-500/20 bg-white/80 dark:bg-card/85 backdrop-blur-md hover:border-primary/30 hover:shadow-md transition-all">
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border ${sppd.approvalStatus === 'approved'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25'
                      }`}>
                      {sppd.approvalStatus === 'approved' ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-bold truncate">{sppd.description || "Dinas Luar"}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[8px] md:text-[9px] font-semibold text-muted-foreground uppercase truncate">{sppd.destination || "-"}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-30" />
                  </div>
                ))
              ) : (
                <div className="p-8 text-center border-2 border-dashed rounded-3xl text-muted-foreground border-primary/15 bg-white/30 dark:bg-card/30 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider">Tidak ada pengajuan aktif.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
