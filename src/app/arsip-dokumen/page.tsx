"use client"

import { useState } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Archive, 
  Scale, 
  Loader2, 
  Plus, 
  Search, 
  ExternalLink, 
  Trash2, 
  AlertCircle, 
  Calendar, 
  Mail, 
  MapPin, 
  RefreshCw,
  FileText
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, orderBy, query } from "firebase/firestore"
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { callAppsScript } from "@/app/agenda/actions"
import { format } from "date-fns"

export default function ArsipDokumenPage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const [isUploading, setIsUploading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Form states for Dok Surat Masuk (Sederhana: Acara/Perihal + PDF + Tanggal & Lokasi)
  const [suratAcara, setSuratAcara] = useState("")
  const [suratTanggal, setSuratTanggal] = useState(format(new Date(), "yyyy-MM-dd"))
  const [suratLokasi, setSuratLokasi] = useState("Balai Kecamatan Gandrungmangu")

  // Form states for Produk Hukum
  const [phNamaDokumen, setPhNamaDokumen] = useState("")
  const [phJenis, setPhJenis] = useState("")
  const [phJenisManual, setPhPhJenisManual] = useState("")
  const [phNomor, setPhNomor] = useState("")

  // GLOBAL DATA FETCHING
  const villageSettingsRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "settings", "village")
  }, [db, user])
  const { data: villageSettings } = useDoc(villageSettingsRef)

  // Realtime Collection Dok Surat Masuk
  const suratMasukRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "dokSuratMasuk"), orderBy("createdAt", "desc"))
  }, [db, user])

  // Realtime Collection Produk Hukum
  const phRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "produkHukum"), orderBy("createdAt", "desc"))
  }, [db, user])

  const { data: suratMasukList, isLoading: isSuratLoading } = useCollection(suratMasukRef)
  const { data: phList, isLoading: isPhLoading } = useCollection(phRef)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ variant: "destructive", title: "Format Salah", description: "Hanya file PDF yang diperbolehkan." })
        return
      }
      setSelectedFile(file)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = error => reject(error)
    })
  }

  const uploadToDrive = async (fileName: string, targetFolderId: string) => {
    if (!selectedFile) return null
    const base64 = await fileToBase64(selectedFile)
    const payload = {
      action: 'uploadArchiveFile',
      folderId: targetFolderId,
      fileName,
      fileData: {
        type: selectedFile.type,
        base64: base64
      }
    }

    try {
      const response = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        redirect: "follow"
      })
      const result = await response.json()
      return result.success ? result : null
    } catch (e) {
      console.error("Upload error:", e)
      return null
    }
  }

  // Simpan Dok Surat Masuk Manual
  const handleSaveSuratMasuk = async () => {
    if (!user || !suratAcara || !selectedFile) {
      toast({ 
        variant: "destructive", 
        title: "Data Belum Lengkap", 
        description: "Harap isi Acara / Perihal surat dan pilih berkas PDF yang ingin diarsipkan." 
      })
      return
    }

    const targetFolderId = villageSettings?.suratMasukFolderId || villageSettings?.agendaFolderId || villageSettings?.spjFolderId || GOOGLE_CONFIG.parentFolderId;

    setIsUploading(true)
    try {
      const fileName = `Surat Masuk - ${suratAcara} | ${suratTanggal}.pdf`
      const driveResult = await uploadToDrive(fileName, targetFolderId)

      if (driveResult) {
        const docData = {
          createdBy: user.uid,
          acara: suratAcara,
          lokasi: suratLokasi || "Balai Kecamatan Gandrungmangu",
          tanggal: suratTanggal || format(new Date(), "yyyy-MM-dd"),
          fileUrl: driveResult.fileUrl,
          driveFileId: driveResult.fileId,
          fileName: selectedFile.name,
          sumber: "Input Manual",
          createdAt: new Date().toISOString()
        }
        const ref = collection(db, "dokSuratMasuk")
        addDocumentNonBlocking(ref, docData)
        toast({ title: "Berhasil Diarsipkan", description: "Dokumen Surat Masuk berhasil diunggah dan disimpan ke arsip." })
        setSuratAcara("")
        setSuratLokasi("Balai Kecamatan Gandrungmangu")
        setSelectedFile(null)
      } else {
        throw new Error("Gagal mengunggah berkas ke Google Drive. Periksa izin folder Drive.")
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Simpan", description: e.message })
    } finally {
      setIsUploading(false)
    }
  }

  // Simpan Produk Hukum
  const handleSavePh = async () => {
    const finalJenis = phJenis === "Lainnya" ? phJenisManual : phJenis
    if (!user || !phNamaDokumen || !finalJenis || !phNomor || !selectedFile) {
      toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Mohon isi semua bidang dan pilih file PDF." })
      return
    }

    const targetFolderId = villageSettings?.produkHukumFolderId || GOOGLE_CONFIG.parentFolderId;

    setIsUploading(true)
    try {
      const fileName = `${phNamaDokumen} | ${finalJenis} No ${phNomor}.pdf`
      const driveResult = await uploadToDrive(fileName, targetFolderId)

      if (driveResult) {
        const docData = {
          createdBy: user.uid,
          namaDokumen: phNamaDokumen,
          jenisDok: finalJenis,
          nomorDok: phNomor,
          fileUrl: driveResult.fileUrl,
          driveFileId: driveResult.fileId,
          createdAt: new Date().toISOString()
        }
        const ref = collection(db, "produkHukum")
        addDocumentNonBlocking(ref, docData)
        toast({ title: "Berhasil", description: "Produk Hukum telah diarsipkan secara global." })
        setPhNamaDokumen(""); setPhJenis(""); setPhPhJenisManual(""); setPhNomor(""); setSelectedFile(null)
      } else {
        throw new Error("Gagal unggah ke Drive. Cek izin akses folder.")
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Simpan", description: e.message })
    } finally {
      setIsUploading(false)
    }
  }

  // Sinkronisasi otomatis dari Kalender Agenda (mengambil undangan yang tersimpan di Google Calendar)
  const handleSyncFromAgenda = async () => {
    if (!user || !db) return
    setIsSyncing(true)
    try {
      const calendarId = GOOGLE_CONFIG.calendarId
      const todayStr = format(new Date(), "yyyy-MM-dd")
      const res = await callAppsScript({
        action: 'getCalendar',
        calendarId: calendarId,
        date: todayStr
      })

      if (res && res.success && Array.isArray(res.items)) {
        let syncedCount = 0
        const existingUrls = new Set((suratMasukList || []).map((d: any) => d.fileUrl || d.acara))

        for (const evt of res.items) {
          const desc = evt.description || ""
          const linkMatch = desc.match(/📄 Undangan \/ Lampiran:\s*(https?:\/\/[^\s]+)/)
          const attachmentUrl = linkMatch ? linkMatch[1] : null
          const title = evt.summary || "Agenda Undangan"

          if (!existingUrls.has(attachmentUrl) && !existingUrls.has(title)) {
            let eventDate = todayStr
            if (evt.start?.dateTime) {
              eventDate = evt.start.dateTime.split("T")[0]
            } else if (evt.start?.date) {
              eventDate = evt.start.date
            }

            const docData = {
              createdBy: user.uid,
              acara: title,
              lokasi: evt.location || "Balai Kecamatan Gandrungmangu",
              tanggal: eventDate,
              fileUrl: attachmentUrl || "",
              fileName: "Undangan Agenda",
              sumber: "Agenda Undangan",
              createdAt: new Date().toISOString()
            }
            addDocumentNonBlocking(collection(db, "dokSuratMasuk"), docData)
            syncedCount++
          }
        }

        if (syncedCount > 0) {
          toast({ title: "Sinkronisasi Berhasil", description: `${syncedCount} dokumen undangan dari Agenda berhasil disinkronkan ke Dok Surat Masuk.` })
        } else {
          toast({ title: "Data Sudah Sesuai", description: "Semua dokumen dari Agenda sudah tercatat di Dok Surat Masuk." })
        }
      } else {
        toast({ title: "Informasi", description: "Tidak ada data undangan baru dari kalender agenda." })
      }
    } catch (err: any) {
      console.error("Sync error:", err)
      toast({ variant: "destructive", title: "Sinkronisasi Gagal", description: err.message || "Gagal menghubungi kalender agenda." })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDelete = (id: string, collectionName: "dokSuratMasuk" | "produkHukum") => {
    if (!user || !db) return
    const docRef = doc(db, collectionName, id)
    deleteDocumentNonBlocking(docRef)
    toast({ title: "Dihapus", description: "Dokumen telah dihapus dari arsip." })
  }

  const filteredSuratMasuk = (suratMasukList || []).filter((item: any) => {
    const q = searchTerm.toLowerCase()
    return (
      (item.acara || "").toLowerCase().includes(q) ||
      (item.lokasi || "").toLowerCase().includes(q) ||
      (item.tanggal || "").toLowerCase().includes(q) ||
      (item.sumber || "").toLowerCase().includes(q)
    )
  })

  const filteredPh = (phList || []).filter(item =>
    (item.namaDokumen || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.nomorDok || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.jenisDok || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Archive className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Arsip Digital Terpadu</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase">Database Kecamatan Gandrungmangu</p>
        </div>
      </header>

      {(!villageSettings?.produkHukumFolderId && !villageSettings?.spjFolderId) && (
        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-xs font-bold text-yellow-800">
            Folder penyimpanan spesifik belum diatur di menu <Link href="/settings/" className="underline">Pengaturan</Link>. Sistem akan menggunakan folder cadangan utama Google Drive.
          </p>
        </div>
      )}

      <Tabs defaultValue="suratMasuk" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/50 p-1.5 rounded-2xl mb-8">
          <TabsTrigger 
            value="suratMasuk" 
            className="gap-2 text-[10px] sm:text-xs font-black uppercase rounded-xl h-full data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Mail className="h-4 w-4" />
            Dok Surat Masuk
          </TabsTrigger>
          <TabsTrigger 
            value="ph" 
            className="gap-2 text-[10px] sm:text-xs font-black uppercase rounded-xl h-full data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Scale className="h-4 w-4" />
            PRODUK HUKUM
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: DOK SURAT MASUK ──────────────────────────────────────────────── */}
        <TabsContent value="suratMasuk" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          {/* Form Isian Dok Surat Masuk */}
          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-primary/5 p-6 sm:p-8">
              <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Input Dok Surat Masuk
              </CardTitle>
              <CardDescription>
                Unggah berkas PDF dan isi Acara / Perihal surat masuk atau undangan dinas Kecamatan.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Input Acara / Perihal (Wajib) */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                    Acara / Perihal Surat <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    placeholder="Contoh: Undangan Rapat Koordinasi Lintas Sektoral Tingkat Kecamatan" 
                    value={suratAcara} 
                    onChange={(e) => setSuratAcara(e.target.value)} 
                    className="h-12 rounded-xl" 
                  />
                </div>

                {/* Tanggal Acara / Surat */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Tanggal Acara / Surat
                  </Label>
                  <Input 
                    type="date" 
                    value={suratTanggal} 
                    onChange={(e) => setSuratTanggal(e.target.value)} 
                    className="h-12 rounded-xl" 
                  />
                </div>

                {/* Lokasi Acara */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> Lokasi Acara
                  </Label>
                  <Input 
                    placeholder="Contoh: Balai Kecamatan Gandrungmangu" 
                    value={suratLokasi} 
                    onChange={(e) => setSuratLokasi(e.target.value)} 
                    className="h-12 rounded-xl" 
                  />
                </div>

                {/* Upload PDF (Wajib) */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Upload Dokumen PDF Surat Masuk <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileChange} 
                    className="h-12 pt-2.5 rounded-xl border-dashed" 
                  />
                  {selectedFile && (
                    <p className="text-xs text-emerald-600 font-bold mt-1">
                      ✓ Berkas terpilih: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>

              <Button
                className="w-full h-14 rounded-2xl font-black uppercase shadow-lg shadow-primary/20 gap-2"
                disabled={isUploading}
                onClick={handleSaveSuratMasuk}
              >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                Arsipkan Dokumen Surat Masuk
              </Button>
            </CardContent>
          </Card>

          {/* Rincian Dok Surat Masuk */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
              <div>
                <h3 className="font-black text-primary uppercase text-sm flex items-center gap-2">
                  <span>Daftar Arsip Dok Surat Masuk</span>
                  <span className="text-xs font-normal text-muted-foreground">({filteredSuratMasuk.length} dokumen)</span>
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Rincian Acara | Lokasi | Tanggal dari berkas yang diunggah serta undangan otomatis dari Agenda Kegiatan
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSyncFromAgenda} 
                  disabled={isSyncing}
                  className="rounded-xl h-9 text-xs font-bold gap-1.5 text-slate-700 hover:text-primary"
                  title="Tarik undangan yang tercatat di Agenda Kegiatan"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-primary" : ""}`} />
                  <span className="hidden sm:inline">Sinkron Agenda</span>
                </Button>

                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Cari acara, lokasi..." 
                    className="pl-8 h-9 text-xs rounded-full" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {isSuratLoading ? (
                <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/30" /></div>
              ) : filteredSuratMasuk.length > 0 ? (
                filteredSuratMasuk.map((item: any) => (
                  <div 
                    key={item.id} 
                    className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:border-primary/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-slate-900 text-sm sm:text-base leading-snug">
                            {item.acara}
                          </h4>
                          {item.sumber === "Agenda Undangan" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-700 border border-sky-200">
                              Dari Agenda
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              Input Arsip
                            </span>
                          )}
                        </div>

                        {/* Rincian Lengkap: Acara | Lokasi | Tanggal */}
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                          <span className="text-primary font-bold">Acara: <span className="text-slate-800 font-normal">{item.acara}</span></span>
                          <span className="text-slate-300 font-bold">|</span>
                          <span className="text-primary font-bold">Lokasi: <span className="text-slate-800 font-normal">{item.lokasi || "-"}</span></span>
                          <span className="text-slate-300 font-bold">|</span>
                          <span className="text-primary font-bold">Tanggal: <span className="text-slate-800 font-normal">{item.tanggal || "-"}</span></span>
                          {item.waktu && (
                            <>
                              <span className="text-slate-300 font-bold">|</span>
                              <span className="text-primary font-bold">Waktu: <span className="text-slate-800 font-normal">{item.waktu} WIB</span></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {item.fileUrl ? (
                        <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2 text-primary border-primary/30 hover:bg-primary/5 font-bold" asChild>
                          <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" /> <span>Lihat PDF</span>
                          </a>
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic px-2">Tanpa File</span>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl" 
                        onClick={() => handleDelete(item.id, "dokSuratMasuk")}
                        title="Hapus dari Arsip"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center border-2 border-dashed rounded-3xl text-muted-foreground space-y-2">
                  <Mail className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="font-bold text-sm">Belum ada arsip Dok Surat Masuk.</p>
                  <p className="text-xs">Unggah berkas baru melalui form di atas atau berkas undangan dari Agenda Kegiatan akan otomatis muncul di sini.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: PRODUK HUKUM ─────────────────────────────────────────────────── */}
        <TabsContent value="ph" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-primary/5 p-6 sm:p-8">
              <CardTitle className="text-lg font-black uppercase">Input Produk Hukum</CardTitle>
              <CardDescription>Arsipkan SK, BA, SE, dan dokumen lainnya.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Nama Dokumen</Label>
                  <Input placeholder="Contoh: SK Pengangkatan Karyawan Kecamatan" value={phNamaDokumen} onChange={(e) => setPhNamaDokumen(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Jenis Dokumen</Label>
                  <Select value={phJenis} onValueChange={setPhJenis}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Pilih Jenis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["SK", "BA", "SE", "Lainnya"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {phJenis === "Lainnya" && (
                  <div className="space-y-2 animate-in slide-in-from-top-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Nama Dokumen Manual</Label>
                    <Input placeholder="Ketik jenis dokumen..." value={phJenisManual} onChange={(e) => setPhPhJenisManual(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Nomor Dokumen</Label>
                  <Input placeholder="Contoh: 141/02/2026" value={phNomor} onChange={(e) => setPhNomor(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Upload Dokumen PDF</Label>
                  <Input type="file" accept=".pdf" onChange={handleFileChange} className="h-12 pt-2.5 rounded-xl border-dashed" />
                </div>
              </div>
              <Button
                className="w-full h-14 rounded-2xl font-black uppercase shadow-lg shadow-primary/20 gap-2"
                disabled={isUploading}
                onClick={handleSavePh}
              >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                Arsipkan Produk Hukum
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-primary uppercase text-sm">Daftar Arsip Produk Hukum</h3>
              <div className="relative w-48 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari nama/nomor/jenis..." className="pl-9 h-9 text-xs rounded-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3">
              {isPhLoading ? (
                <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/30" /></div>
              ) : filteredPh.length > 0 ? (
                filteredPh.map((item) => (
                  <div key={item.id} className="p-4 bg-white border rounded-2xl shadow-sm flex items-center justify-between gap-4 group hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                        <Scale className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{item.namaDokumen}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase">{item.jenisDok} • {item.nomorDok}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2" asChild>
                        <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Lihat</span>
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleDelete(item.id, "produkHukum")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center border-2 border-dashed rounded-3xl text-muted-foreground">Belum ada arsip Produk Hukum.</div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
