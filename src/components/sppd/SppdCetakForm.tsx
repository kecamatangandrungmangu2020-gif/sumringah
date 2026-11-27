"use client"

import { useState } from "react"
import { useCollection, useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, FileText, Loader2, ChevronRight, MapPin, Calendar, User, Search, Trash2, Edit2, AlertTriangle, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateSuratTugasPDF, generateSPPDPDF } from "@/lib/pdf-utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { SppdUpload } from "@/components/sppd/SppdUpload"

export function SppdCetakForm() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSppd, setSelectedSppd] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isGeneratingST, setIsGeneratingST] = useState(false)
  const [isGeneratingSPPD, setIsGeneratingSPPD] = useState(false)
  
  const { toast } = useToast()
  const { user } = useUser()
  const db = useFirestore()

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])
  
  const { data: userData } = useDoc(userDocRef)

  const sppdQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, "users", user.uid, "sppds")
  }, [db, user])

  const { data: sppds, isLoading, error } = useCollection(sppdQuery)

  const filtered = (sppds || []).filter(s => {
    const desc = (s.description || "").toLowerCase()
    const dest = (s.destination || "").toLowerCase()
    const name = (s.officialName || "").toLowerCase()
    const num = (s.stNumber || s.sppdNumber || s.documentNumber || "").toLowerCase()
    const search = searchTerm.toLowerCase()
    return desc.includes(search) || dest.includes(search) || name.includes(search) || num.includes(search)
  }).sort((a, b) => {
    const dateA = a.expenseDate ? new Date(a.expenseDate).getTime() : 0
    const dateB = b.expenseDate ? new Date(b.expenseDate).getTime() : 0
    return dateB - dateA
  })

  const handlePrintST = async (data: any) => {
    setIsGeneratingST(true)
    try {
      const values = {
        ...data,
        officialName: data.officialName || "-",
        description: data.description || "-",
        destination: data.destination || "-",
        startDate: data.startDate || "-",
        endDate: data.endDate || "-",
        letterNumber: data.stNumber || data.letterNumber || "-" // Backward compat
      }
      const pdfBlob = await generateSuratTugasPDF(values, userData?.logoBase64)
      const url = URL.createObjectURL(pdfBlob)
      window.open(url, "_blank")
      toast({ title: "Berhasil", description: "Surat tugas telah dibuat." })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat membuat PDF." })
    } finally {
      setIsGeneratingST(false)
    }
  }

  const handlePrintSPPD = async (data: any) => {
    setIsGeneratingSPPD(true)
    try {
      const values = {
        ...data,
        officialName: data.officialName || "-",
        description: data.description || "-",
        destination: data.destination || "-",
        startDate: data.startDate || "-",
        endDate: data.endDate || "-",
        totalExpense: data.amount?.toString() || "0",
        documentNumber: data.sppdNumber || data.documentNumber || "-" // Backward compat
      }
      const pdfBlob = await generateSPPDPDF(values, userData?.logoBase64)
      const url = URL.createObjectURL(pdfBlob)
      window.open(url, "_blank")
      toast({ title: "Berhasil", description: "Dokumen SPPD telah dibuat." })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat membuat PDF." })
    } finally {
      setIsGeneratingSPPD(false)
    }
  }

  const handleDelete = () => {
    if (!user || !selectedSppd || !db) return
    const docRef = doc(db, "users", user.uid, "sppds", selectedSppd.id)
    deleteDocumentNonBlocking(docRef)
    toast({ title: "Terhapus", description: "Pengajuan SPPD telah dihapus." })
    setSelectedSppd(null)
    setIsDeleting(false)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Memuat Berkas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-10 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
        <p className="text-sm font-bold text-destructive">Gagal memuat data.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Segarkan Halaman
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Cari kegiatan atau nama personel..." 
          className="pl-9 h-11 border-primary/20 rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {filtered.length > 0 ? (
          filtered.map((sppd) => (
            <div 
              key={sppd.id} 
              onClick={() => {
                setSelectedSppd(sppd)
                setIsEditing(false)
                setIsDeleting(false)
              }}
              className="flex items-start gap-4 p-4 rounded-2xl border bg-white hover:border-primary/40 transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors mt-0.5">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-1 mb-2">
                  <h3 className="font-black text-sm text-primary leading-tight whitespace-normal break-words">
                    {sppd.description || "Kegiatan Dinas"}
                  </h3>
                  <div className="flex gap-2">
                    <span className="w-fit text-[8px] font-black bg-emerald-50 px-2 py-0.5 rounded text-emerald-600 border border-emerald-100 uppercase">
                      ST: {sppd.stNumber || sppd.letterNumber || "Tanpa No"}
                    </span>
                    <span className="w-fit text-[8px] font-black bg-blue-50 px-2 py-0.5 rounded text-blue-600 border border-blue-100 uppercase">
                      SPPD: {sppd.sppdNumber || sppd.documentNumber || "Tanpa No"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                    <MapPin className="h-3 w-3 text-primary/50" />
                    <span>{sppd.destination || "-"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{sppd.officialName?.split(' - ')[0] || "-"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{sppd.startDate || "-"}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 transition-opacity mt-1" />
            </div>
          ))
        ) : (
          <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-3xl bg-muted/5 border-muted/50">
            <p className="font-bold text-xs uppercase tracking-widest">Tidak ada data ditemukan</p>
            <p className="text-[10px] mt-1">Silakan lakukan pengajuan biaya baru</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedSppd} onOpenChange={(open) => !open && setSelectedSppd(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[450px] rounded-3xl p-6 overflow-y-auto max-h-[90vh]">
          {isEditing ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-primary uppercase">Edit Pengajuan SPPD</DialogTitle>
                <DialogDescription>Perbarui rincian perjalanan dinas Anda.</DialogDescription>
              </DialogHeader>
              <SppdUpload 
                initialData={selectedSppd} 
                onSuccess={() => {
                  setIsEditing(false)
                  setSelectedSppd(null)
                }} 
              />
            </div>
          ) : isDeleting ? (
            <div className="space-y-6 py-4">
              <DialogHeader className="items-center text-center">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <DialogTitle className="text-lg font-bold">Hapus Pengajuan?</DialogTitle>
                <DialogDescription>
                  Tindakan ini tidak dapat dibatalkan. Seluruh data perjalanan untuk <strong>{selectedSppd?.description}</strong> akan dihapus.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Button variant="destructive" className="h-12 font-bold uppercase" onClick={handleDelete}>Ya, Hapus Sekarang</Button>
                <Button variant="ghost" className="h-12 font-bold uppercase" onClick={() => setIsDeleting(false)}>Batal</Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-primary uppercase">Opsi Pengajuan SPPD</DialogTitle>
                <DialogDescription className="text-xs font-medium">
                  Kelola dokumen untuk kegiatan <strong>{selectedSppd?.description}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="p-4 bg-muted/30 rounded-2xl space-y-2">
                   <div className="flex items-center gap-2 text-xs font-bold">
                    <User className="h-4 w-4 text-primary" />
                    <span>{selectedSppd?.officialName || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{selectedSppd?.destination || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{selectedSppd?.startDate || "-"} s/d {selectedSppd?.endDate || "-"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    onClick={() => handlePrintST(selectedSppd)}
                    variant="outline"
                    className="h-14 justify-start gap-4 text-sm font-black uppercase border-primary/20 hover:bg-primary/5 rounded-2xl"
                    disabled={isGeneratingST}
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    {isGeneratingST ? "Menyiapkan PDF..." : "Cetak Surat Tugas"}
                  </Button>

                  <Button 
                    onClick={() => handlePrintSPPD(selectedSppd)}
                    className="h-14 justify-start gap-4 text-sm font-black uppercase bg-[#065F46] hover:bg-[#041E17] text-white rounded-2xl shadow-lg"
                    disabled={isGeneratingSPPD}
                  >
                    <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <Printer className="h-5 w-5" />
                    </div>
                    {isGeneratingSPPD ? "Menyiapkan PDF..." : "Cetak Dokumen SPPD"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button variant="outline" className="h-11 gap-2 text-xs font-bold uppercase rounded-xl border-blue-500/20 text-blue-600 hover:bg-blue-50" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4" /> Edit Data
                  </Button>
                  <Button variant="outline" className="h-11 gap-2 text-xs font-bold uppercase rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5" onClick={() => setIsDeleting(true)}>
                    <Trash2 className="h-4 w-4" /> Hapus
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
