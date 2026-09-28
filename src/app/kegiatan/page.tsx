
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Search,
  Filter,
  Plus,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  FileText,
  ImageIcon,
  ExternalLink,
  MapPin,
  Calendar,
  User,
  BookOpen,
  Share2,
  Trash2,
  FileCheck,
  FolderOpen,
  Edit,
  MessageSquare,
  Copy,
  Check,
  Send
} from "lucide-react"
import Link from "next/link"
import { KegiatanCard } from "@/components/kegiatan/KegiatanCard"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { KegiatanUpload } from "@/components/kegiatan/KegiatanUpload"
import { useCollection, useUser, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

export default function KegiatanPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedForDelete, setSelectedForDelete] = useState<any>(null)
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  const [editingActivity, setEditingActivity] = useState<any>(null)

  const { user, isUserLoading: isAuthLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  // GLOBAL COLLECTION: Use village-wide kegiatan collection
  const kegiatanQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, "kegiatans")
  }, [db, user])

  const { data: kegiatans, isLoading } = useCollection(kegiatanQuery)

  const filtered = (kegiatans || []).filter(k => {
    const title = k.title || ""
    const desc = k.description || ""
    const s = searchTerm.toLowerCase()
    return title.toLowerCase().includes(s) || desc.toLowerCase().includes(s)
  }).sort((a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime())

  const handleDelete = () => {
    if (!user || !selectedForDelete || !db) return
    const docRef = doc(db, "kegiatans", selectedForDelete.id)
    deleteDocumentNonBlocking(docRef)
    toast({ title: "Terhapus", description: "Dokumentasi kegiatan telah dihapus dari database Kecamatan." })
    setSelectedForDelete(null)
    setSelectedActivity(null)
  }

  const handleOpenEdit = (activity: any) => {
    setEditingActivity(activity)
    setIsEditOpen(true)
    setSelectedActivity(null) // Close detail dialog
  }

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 overflow-x-hidden">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/dashboard/"><ChevronLeft className="h-6 w-6" /></Link></Button>
          <div>
            <h1 className="text-xl font-black text-primary uppercase tracking-tight leading-none">Laporan Kegiatan</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Laporan & Dokumentasi Terpadu</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-primary/20 text-primary font-black uppercase text-[10px] h-9 gap-1.5 shadow-sm"
            onClick={() => {
              const url = `${window.location.origin}/input/`
              navigator.clipboard.writeText(url)
              toast({ title: "Link Publik Disalin!", description: "Tautan publik tanpa login (/input) berhasil disalin ke clipboard." })
            }}
          >
            <Share2 className="h-3.5 w-3.5" /> Salin Link Publik (/input)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-xl font-black uppercase text-[10px] h-9 gap-1.5"
            asChild
          >
            <Link href="/input/" target="_blank">
              <ExternalLink className="h-3.5 w-3.5" /> Buka Tampilan Publik
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari laporan..." className="pl-9 h-12 rounded-xl bg-muted/30 border-none shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl bg-muted/30 border-none"><Filter className="h-5 w-5 text-primary" /></Button>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-14 gap-3 text-base font-black uppercase shadow-lg bg-primary hover:bg-primary/90 rounded-2xl">
              <Plus className="h-6 w-6" /> Buat Laporan Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[95vh] overflow-y-auto p-4 sm:p-6 rounded-[2.5rem] border shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-primary uppercase">Input Laporan Kegiatan</DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase text-muted-foreground">Catat dan dokumentasikan kegiatan dinas atau kemasyarakatan Kecamatan.</DialogDescription>
            </DialogHeader>
            <KegiatanUpload onSuccess={() => setIsUploadOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sinkronisasi...</p>
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
                  imageUrl: (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : `https://picsum.photos/seed/${item.id}/600/400`
                }}
                onDelete={(e) => { e.stopPropagation(); setSelectedForDelete(item); }}
                onClick={() => setSelectedActivity(item)}
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2.5rem] bg-muted/5 border-muted/50">
              <p className="font-black text-muted-foreground uppercase text-sm">Belum Ada Dokumentasi</p>
            </div>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0 rounded-[2.5rem] shadow-2xl border-none">
          {selectedActivity && (
            <div className="space-y-0 relative">
              <DialogHeader className="p-0">
                <DialogTitle className="sr-only">{selectedActivity.title}</DialogTitle>
                <DialogDescription className="sr-only">Detail dokumentasi kegiatan Kecamatan.</DialogDescription>
              </DialogHeader>

              <div className="relative aspect-video w-full">
                <Image
                  src={(selectedActivity.imageUrls && selectedActivity.imageUrls.length > 0) ? selectedActivity.imageUrls[0] : `https://picsum.photos/seed/${selectedActivity.id}/600/400`}
                  alt="Cover" fill className="object-cover" unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <Badge className="mb-2 bg-primary/90 border-none text-[10px] font-black uppercase tracking-widest">{selectedActivity.category}</Badge>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">{selectedActivity.title}</h2>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div><p className="text-[8px] font-black text-muted-foreground uppercase">Tanggal</p><p className="text-xs font-bold">{selectedActivity.date}</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div><p className="text-[8px] font-black text-muted-foreground uppercase">Lokasi</p><p className="text-xs font-bold truncate">{selectedActivity.location}</p></div>
                  </div>
                </div>

                <div className="p-5 bg-white border rounded-3xl shadow-sm text-sm leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">
                  {selectedActivity.description}
                </div>

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
                            navigator.clipboard.writeText(selectedActivity.notulenWa);
                            toast({ title: "Tersalin!", description: "Teks laporan WhatsApp berhasil disalin ke clipboard." });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 text-emerald-600" /> Salin WA
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 px-3 text-[10px] font-black uppercase rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                          onClick={() => {
                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(selectedActivity.notulenWa)}`, '_blank');
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

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <Share2 className="h-3 w-3" /> Dokumen Terlampir (Drive)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedActivity.driveUrls?.notulen && (
                      <Button variant="outline" className="h-12 rounded-xl justify-between border-primary/20 hover:bg-primary/5" asChild>
                        <a href={selectedActivity.driveUrls.notulen} target="_blank" rel="noopener noreferrer">
                          <span className="text-[10px] font-black uppercase flex items-center gap-2"><FileText className="h-4 w-4 text-red-500" /> Notulen PDF</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    {selectedActivity.driveUrls?.bast && (
                      <Button variant="outline" className="h-12 rounded-xl justify-between border-primary/20 hover:bg-primary/5" asChild>
                        <a href={selectedActivity.driveUrls.bast} target="_blank" rel="noopener noreferrer">
                          <span className="text-[10px] font-black uppercase flex items-center gap-2"><FileCheck className="h-4 w-4 text-emerald-500" /> BAST PDF</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    {selectedActivity.driveUrls?.dokKegiatan && (
                      <Button variant="outline" className="h-12 rounded-xl justify-between border-primary/20 hover:bg-primary/5" asChild>
                        <a href={selectedActivity.driveUrls.dokKegiatan} target="_blank" rel="noopener noreferrer">
                          <span className="text-[10px] font-black uppercase flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" /> Dok. Kegiatan</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    {selectedActivity.driveUrls?.dokAtk && (
                      <Button variant="outline" className="h-12 rounded-xl justify-between border-primary/20 hover:bg-primary/5" asChild>
                        <a href={selectedActivity.driveUrls.dokAtk} target="_blank" rel="noopener noreferrer">
                          <span className="text-[10px] font-black uppercase flex items-center gap-2"><FileText className="h-4 w-4 text-amber-500" /> Dok. ATK</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    {selectedActivity.driveUrls?.dokKonsumsi && (
                      <Button variant="outline" className="h-12 rounded-xl justify-between border-primary/20 hover:bg-primary/5" asChild>
                        <a href={selectedActivity.driveUrls.dokKonsumsi} target="_blank" rel="noopener noreferrer">
                          <span className="text-[10px] font-black uppercase flex items-center gap-2"><FileText className="h-4 w-4 text-purple-500" /> Dok. Konsumsi</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    {selectedActivity.driveUrls?.undangan && (
                      <Button variant="outline" className="h-12 rounded-xl justify-between border-primary/20 hover:bg-primary/5" asChild>
                        <a href={selectedActivity.driveUrls.undangan} target="_blank" rel="noopener noreferrer">
                          <span className="text-[10px] font-black uppercase flex items-center gap-2"><BookOpen className="h-4 w-4 text-sky-500" /> Undangan</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>

                  {selectedActivity.driveFolderId && (
                    <Button variant="secondary" className="w-full h-12 rounded-xl gap-2 font-black uppercase text-[10px]" asChild>
                      <a href={`https://drive.google.com/drive/folders/${selectedActivity.driveFolderId}`} target="_blank" rel="noopener noreferrer">
                        <FolderOpen className="h-4 w-4" /> Buka Folder Kegiatan di Drive
                      </a>
                    </Button>
                  )}
                </div>

                <div className="pt-4 border-t flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl font-black uppercase gap-2 border-primary/20 text-primary hover:bg-primary/5" onClick={() => handleOpenEdit(selectedActivity)}>
                    <Edit className="h-4 w-4" /> Edit Laporan
                  </Button>
                  <Button variant="destructive" className="flex-1 h-12 rounded-xl font-black uppercase gap-2" onClick={() => setSelectedForDelete(selectedActivity)}>
                    <Trash2 className="h-4 w-4" /> Hapus
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[95vh] overflow-y-auto p-4 sm:p-6 rounded-[2.5rem] border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary uppercase">Sunting Dokumentasi</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase text-muted-foreground">Perbarui data atau tambah dokumen susulan.</DialogDescription>
          </DialogHeader>
          {editingActivity && (
            <KegiatanUpload
              initialData={editingActivity}
              onSuccess={() => {
                setIsEditOpen(false)
                setEditingActivity(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedForDelete} onOpenChange={(open) => !open && setSelectedForDelete(null)}>
        <DialogContent className="w-[90vw] sm:max-w-[400px] rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-destructive uppercase">Hapus Dokumentasi?</DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase mt-1 leading-relaxed">Tindakan ini permanen.</DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button variant="ghost" onClick={() => setSelectedForDelete(null)} className="w-full sm:flex-1 h-12 rounded-2xl font-bold uppercase">Batal</Button>
            <Button variant="destructive" onClick={handleDelete} className="w-full sm:flex-1 h-12 rounded-2xl font-black uppercase">Ya, Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
