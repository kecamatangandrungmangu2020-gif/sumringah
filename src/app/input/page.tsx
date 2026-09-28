"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Search,
  Filter,
  Loader2,
  FileText,
  ExternalLink,
  MapPin,
  Calendar,
  BookOpen,
  Share2,
  FileCheck,
  FolderOpen,
  MessageSquare,
  Copy,
  Send,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Sparkles,
  ArrowLeft,
  Plus
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { KegiatanCard } from "@/components/kegiatan/KegiatanCard"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { KegiatanUpload } from "@/components/kegiatan/KegiatanUpload"
import { useFirestore } from "@/firebase"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

interface KegiatanItem {
  id: string
  title?: string
  description?: string
  date?: string
  uploadDate?: string
  location?: string
  category?: string
  activityType?: string
  imageUrls?: string[]
  notulenWa?: string
  driveUrls?: {
    notulen?: string
    bast?: string
    dokKegiatan?: string
    dokAtk?: string
    dokKonsumsi?: string
    undangan?: string
  }
  driveFolderId?: string
}

export default function PublicKegiatanPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"Semua" | "Internal" | "Eksternal">("Semua")
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<KegiatanItem | null>(null)
  const [kegiatans, setKegiatans] = useState<KegiatanItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedWA, setCopiedWA] = useState(false)

  const db = useFirestore()
  const { toast } = useToast()

  // Realtime listener dari Firestore + Fallback API
  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const fetchViaApi = async () => {
      try {
        const res = await fetch("/api/kegiatan/", { cache: "no-store" })
        const json = await res.json()
        if (json.success && Array.isArray(json.items)) {
          setKegiatans(json.items)
          setIsLoading(false)
        }
      } catch (err) {
        console.warn("Gagal memuat kegiatan via API fallback:", err)
      }
    }

    if (db) {
      try {
        const q = query(collection(db, "kegiatans"))
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const list: KegiatanItem[] = []
            snapshot.forEach((doc) => {
              list.push({ id: doc.id, ...(doc.data() as any) })
            })
            setKegiatans(list)
            setIsLoading(false)
          },
          (error) => {
            console.warn("Firestore public listener note:", error.message)
            fetchViaApi()
          }
        )
      } catch {
        fetchViaApi()
      }
    } else {
      fetchViaApi()
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [db])

  // Filter & Search Logic
  const filtered = kegiatans
    .filter((k) => {
      const title = k.title || ""
      const desc = k.description || ""
      const s = searchTerm.toLowerCase()
      const matchSearch = title.toLowerCase().includes(s) || desc.toLowerCase().includes(s)

      if (filterType === "Semua") return matchSearch
      const type = k.activityType || k.category || "Internal"
      return matchSearch && type.toLowerCase() === filterType.toLowerCase()
    })
    .sort((a, b) => new Date(b.uploadDate || b.date || 0).getTime() - new Date(a.uploadDate || a.date || 0).getTime())

  const totalCount = kegiatans.length
  const internalCount = kegiatans.filter((k) => (k.activityType || k.category || "Internal").toLowerCase() === "internal").length
  const eksternalCount = kegiatans.filter((k) => (k.activityType || k.category || "").toLowerCase() === "eksternal").length

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 flex flex-col font-sans pb-24 selection:bg-amber-500/20 selection:text-amber-900">
      {/* ── HEADER PUBLIK TANPA MENU ADMIN ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm shrink-0"
              title="Kembali ke Beranda Utama"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight uppercase leading-none text-slate-900">
                  Laporan Dokumentasi Kegiatan
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                  <CheckCircle2 className="h-3 w-3" /> Publik
                </span>
              </div>
              <span className="text-[10px] sm:text-xs tracking-wider text-slate-500 uppercase font-semibold mt-0.5">
                Pemerintah Kecamatan Gandrungmangu
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs gap-1.5 h-9 uppercase shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Laporan</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-xl border-slate-200 font-bold text-xs gap-1.5 hover:bg-slate-50 text-slate-700 h-9"
            >
              <Link href="/">
                <Building2 className="h-4 w-4 text-slate-500" />
                <span className="hidden sm:inline">Portal Kecamatan</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER PANEL KHUSUS KEGIATAN ────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white py-10 sm:py-14 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-amber-300 text-[11px] font-bold tracking-widest uppercase">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Transparansi & Dokumentasi Dinas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white leading-tight">
              Galeri & Laporan Kegiatan
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Arsip publikasi kegiatan kedinasan, musyawarah, pelayanan lapangan, dan acara kemasyarakatan di wilayah Kecamatan Gandrungmangu.
            </p>
          </div>

          {/* Quick Statistics Badges */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-center">
              <span className="block text-xl sm:text-2xl font-black text-amber-300 leading-none">{totalCount}</span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-1 block">Total</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-center">
              <span className="block text-xl sm:text-2xl font-black text-emerald-300 leading-none">{internalCount}</span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-1 block">Internal</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-center">
              <span className="block text-xl sm:text-2xl font-black text-sky-300 leading-none">{eksternalCount}</span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-1 block">Eksternal</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── KONTEN UTAMA: PENCARIAN, FILTER, DAN DAFTAR LAPORAN ───────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10 w-full flex-1 flex flex-col gap-6">
        {/* Tombol Buat Laporan Baru & Dialog Upload (Tanpa Login) */}
        <div className="flex flex-col gap-4">
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="w-full h-14 gap-3 text-sm sm:text-base font-black uppercase shadow-lg bg-primary hover:bg-primary/90 text-white rounded-2xl">
                <Plus className="h-6 w-6" /> Buat Laporan Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[95vh] overflow-y-auto p-4 sm:p-6 rounded-[2.5rem] border shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl font-black text-primary uppercase">Input Laporan Kegiatan</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase text-muted-foreground">Catat dan dokumentasikan kegiatan dinas atau kemasyarakatan Kecamatan.</DialogDescription>
              </DialogHeader>
              <KegiatanUpload onSuccess={() => setIsUploadOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Category Filter Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200/90 p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari dokumentasi atau nama kegiatan..."
              className="pl-10 h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white text-sm font-medium text-slate-800 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start md:self-auto overflow-x-auto w-full md:w-auto">
            {(["Semua", "Internal", "Eksternal"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filterType === type
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                {type === "Internal" && <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />}
                {type === "Eksternal" && <Globe className="h-3.5 w-3.5 text-sky-400" />}
                {type === "Semua" && <Filter className="h-3.5 w-3.5 text-slate-400" />}
                <span>{type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Status Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-3xl border border-dashed border-slate-300">
            <Loader2 className="h-9 w-9 animate-spin text-slate-700" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Memuat Data Kegiatan...</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <KegiatanCard
                  key={item.id}
                  kegiatan={{
                    id: item.id,
                    title: item.title || "Tanpa Judul",
                    description: item.description || "Tidak ada deskripsi",
                    date: item.date || item.uploadDate || "-",
                    location: item.location || "Balai Kecamatan",
                    category: item.category || "Internal",
                    activityType: item.activityType || item.category || "Internal",
                    imageUrl:
                      item.imageUrls && item.imageUrls.length > 0
                        ? item.imageUrls[0]
                        : `https://picsum.photos/seed/${item.id}/600/400`,
                  }}
                  onClick={() => setSelectedActivity(item)}
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2.5rem] bg-white border-slate-200 p-8 space-y-2">
                <p className="font-black text-slate-700 uppercase text-sm">Tidak Ditemukan Kegiatan</p>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                  {searchTerm
                    ? `Tidak ada dokumentasi kegiatan dengan kata kunci "${searchTerm}".`
                    : "Belum ada arsip dokumentasi kegiatan yang dipublikasikan."}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── DETAIL MODAL DIALOG (SAMA PERSIS DENGAN /KEGIATAN/ TANPA TOMBOL EDIT/HAPUS) ── */}
      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[650px] max-h-[92vh] overflow-y-auto p-0 rounded-[2.5rem] shadow-2xl border-none">
          {selectedActivity && (
            <div className="space-y-0 relative">
              <DialogHeader className="p-0">
                <DialogTitle className="sr-only">{selectedActivity.title}</DialogTitle>
                <DialogDescription className="sr-only">Detail dokumentasi kegiatan Kecamatan Gandrungmangu.</DialogDescription>
              </DialogHeader>

              {/* Cover Image Banner */}
              <div className="relative aspect-video w-full">
                <Image
                  src={
                    selectedActivity.imageUrls && selectedActivity.imageUrls.length > 0
                      ? selectedActivity.imageUrls[0]
                      : `https://picsum.photos/seed/${selectedActivity.id}/600/400`
                  }
                  alt={selectedActivity.title || "Cover"}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <Badge className="mb-2 bg-primary/95 border-none text-[10px] font-black uppercase tracking-widest text-white">
                    {selectedActivity.category || selectedActivity.activityType || "Internal"}
                  </Badge>
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-tight drop-shadow-md">
                    {selectedActivity.title}
                  </h2>
                </div>
              </div>

              {/* Detail Content Body */}
              <div className="p-6 space-y-6">
                {/* Info Tanggal & Lokasi */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200/60">
                    <Calendar className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Tanggal</p>
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {selectedActivity.date || selectedActivity.uploadDate || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200/60">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Lokasi</p>
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {selectedActivity.location || "Balai Kecamatan"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Deskripsi & Notulensi */}
                <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm text-sm leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">
                  {selectedActivity.description}
                </div>

                {/* Notulen WA Block */}
                {selectedActivity.notulenWa && (
                  <div className="border border-emerald-200 bg-emerald-50/40 rounded-3xl p-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <h4 className="text-xs font-black uppercase text-emerald-950 tracking-wider">
                          Notulen Kirim WA
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-[10px] font-bold uppercase rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-100 gap-1.5"
                          onClick={() => {
                            if (selectedActivity.notulenWa) {
                              navigator.clipboard.writeText(selectedActivity.notulenWa)
                              setCopiedWA(true)
                              setTimeout(() => setCopiedWA(false), 2000)
                              toast({
                                title: "Tersalin!",
                                description: "Teks laporan WhatsApp berhasil disalin ke clipboard.",
                              })
                            }
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{copiedWA ? "Tersalin" : "Salin WA"}</span>
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 px-3 text-[10px] font-black uppercase rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                          onClick={() => {
                            if (selectedActivity.notulenWa) {
                              window.open(
                                `https://api.whatsapp.com/send?text=${encodeURIComponent(selectedActivity.notulenWa)}`,
                                "_blank"
                              )
                            }
                          }}
                        >
                          <Send className="h-3.5 w-3.5" /> Buka WA
                        </Button>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-emerald-100 font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {selectedActivity.notulenWa}
                    </div>
                  </div>
                )}

                {/* Dokumen Terlampir di Drive */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <Share2 className="h-3 w-3" /> Dokumen Terlampir (Drive)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedActivity.driveUrls?.notulen && (
                      <Button
                        variant="outline"
                        className="h-12 rounded-xl justify-between border-primary/20 hover:bg-primary/5"
                        asChild
                      >
                        <a href={selectedActivity.driveUrls.notulen} target="_blank" rel="noopener noreferrer">
                          <span className="text-[10px] font-black uppercase flex items-center gap-2">
                            <FileText className="h-4 w-4 text-red-500" /> Notulen PDF
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    {selectedActivity.driveUrls?.bast && (
                      <Button
                        variant="outline"
                        className="h-12 rounded-xl justify-between border-primary/20 hover:bg-primary/5"
                        asChild
                      >
                        <a href={selectedActivity.driveUrls.bast} target="_blank" rel="noopener noreferrer">
                          <span className="text-[10px] font-black uppercase flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-emerald-500" /> BAST PDF
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    {selectedActivity.driveUrls?.dokKegiatan && (
                      <Button
                        variant="outline"
                        className="h-12 rounded-xl justify-between border-primary/20 hover:bg-primary/5"
                        asChild
                      >
                        <a href={selectedActivity.driveUrls.dokKegiatan} target="_blank" rel="noopener noreferrer">
                          <span className="text-[10px] font-black uppercase flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" /> Dok. Kegiatan
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    {selectedActivity.driveUrls?.dokAtk && (
                      <Button
                        variant="outline"
                        className="h-12 rounded-xl justify-between border-primary/20 hover:bg-primary/5"
                        asChild
                      >
                        <a href={selectedActivity.driveUrls.dokAtk} target="_blank" rel="noopener noreferrer">
                          <span className="text-[10px] font-black uppercase flex items-center gap-2">
                            <FileText className="h-4 w-4 text-amber-500" /> Dok. ATK
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    {selectedActivity.driveUrls?.dokKonsumsi && (
                      <Button
                        variant="outline"
                        className="h-12 rounded-xl justify-between border-primary/20 hover:bg-primary/5"
                        asChild
                      >
                        <a href={selectedActivity.driveUrls.dokKonsumsi} target="_blank" rel="noopener noreferrer">
                          <span className="text-[10px] font-black uppercase flex items-center gap-2">
                            <FileText className="h-4 w-4 text-purple-500" /> Dok. Konsumsi
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    {selectedActivity.driveUrls?.undangan && (
                      <Button
                        variant="outline"
                        className="h-12 rounded-xl justify-between border-primary/20 hover:bg-primary/5"
                        asChild
                      >
                        <a href={selectedActivity.driveUrls.undangan} target="_blank" rel="noopener noreferrer">
                          <span className="text-[10px] font-black uppercase flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-sky-500" /> Undangan
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>

                  {selectedActivity.driveFolderId && (
                    <Button
                      variant="secondary"
                      className="w-full h-12 rounded-xl gap-2 font-black uppercase text-[10px]"
                      asChild
                    >
                      <a
                        href={`https://drive.google.com/drive/folders/${selectedActivity.driveFolderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FolderOpen className="h-4 w-4" /> Buka Folder Kegiatan di Drive
                      </a>
                    </Button>
                  )}
                </div>

                {/* Tutup Modal Dialog */}
                <div className="pt-2 border-t flex justify-end">
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-2xl font-bold uppercase text-xs"
                    onClick={() => setSelectedActivity(null)}
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
