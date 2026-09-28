"use client"

import { useState, useRef } from "react"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, getDocs, query, orderBy, where } from "firebase/firestore"
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking
} from "@/firebase/non-blocking-updates"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import {
  HeartPulse,
  Plus,
  Search,
  Upload,
  Download,
  Edit2,
  Trash2,
  Loader2,
  MoreVertical,
  User,
  MapPin,
  AlertTriangle,
  ArrowLeft,
  AlertCircle,
  Home
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import Link from "next/link"
import { cn } from "@/lib/utils"

const HEALTH_CATEGORIES = [
  "Balita",
  "Stunting",
  "Lansia",
  "Disabilitas",
  "Ibu Hamil",
  "Ibu Menyusui",
  "Ibu Hamil KEK",
  "Remaja Anemia"
]

export default function DataKesehatanPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState("Balita")
  const [searchTerm, setSearchTerm] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // CRUD States
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  const [formData, setFormData] = useState({ name: "", address: "", posyandu: "" })

  // Data Fetching
  const healthRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "health_records"),
      where("category", "==", activeTab),
      orderBy("createdAt", "desc")
    )
  }, [db, user, activeTab])

  const { data: records, isLoading } = useCollection(healthRef)

  const filteredRecords = (records || []).filter(r =>
    (r.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.posyandu || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  // CRUD Handlers
  const handleSave = async () => {
    if (!formData.name || !formData.address) {
      toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Nama dan Alamat wajib diisi." })
      return
    }

    try {
      if (isEditOpen && selectedRecord) {
        const docRef = doc(db, "health_records", selectedRecord.id)
        updateDocumentNonBlocking(docRef, {
          name: formData.name.toUpperCase(),
          address: formData.address.toUpperCase(),
          posyandu: formData.posyandu.toUpperCase(),
          updatedAt: new Date().toISOString()
        })
        toast({ title: "Diperbarui", description: "Data kesehatan berhasil diperbarui." })
        setIsEditOpen(false)
      } else {
        const colRef = collection(db, "health_records")
        addDocumentNonBlocking(colRef, {
          category: activeTab,
          name: formData.name.toUpperCase(),
          address: formData.address.toUpperCase(),
          posyandu: formData.posyandu.toUpperCase(),
          createdAt: new Date().toISOString(),
          createdBy: user?.uid
        })
        toast({ title: "Tersimpan", description: "Data baru telah ditambahkan ke database." })
        setIsAddOpen(false)
      }
      setFormData({ name: "", address: "", posyandu: "" })
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Gagal menyimpan data." })
    }
  }

  const handleDelete = () => {
    if (!selectedRecord) return
    const docRef = doc(db, "health_records", selectedRecord.id)
    deleteDocumentNonBlocking(docRef)
    toast({ title: "Terhapus", description: "Data telah dihapus dari sistem." })
    setIsDeleteOpen(false)
    setSelectedRecord(null)
  }

  const handleDeleteAllByCategory = async () => {
    if (!records || records.length === 0) return
    setIsProcessing(true)
    try {
      records.forEach(record => {
        const docRef = doc(db, "health_records", record.id)
        deleteDocumentNonBlocking(docRef)
      })
      toast({ title: "Berhasil Dihapus", description: `Seluruh data kategori ${activeTab} sedang diproses untuk dihapus.` })
      setIsDeleteAllOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal Menghapus" })
    } finally {
      setIsProcessing(false)
    }
  }

  // Excel Handlers
  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast({ variant: "destructive", title: "Data Kosong", description: "Tidak ada data untuk diekspor." })
      return
    }
    const exportData = filteredRecords.map(r => ({
      "Nama": r.name,
      "Alamat": r.address,
      "Posyandu": r.posyandu || "-",
      "Kategori": r.category,
      "Tanggal Input": r.createdAt
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, activeTab)
    XLSX.writeFile(wb, `Data_Kesehatan_${activeTab.replace(/\s+/g, '_')}_GANDRUNGMANGU.xlsx`)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws)

        let count = 0
        jsonData.forEach(row => {
          const keys = Object.keys(row)
          const nameKey = keys.find(k => k.toLowerCase().replace(/\s/g, '') === 'nama')
          const addressKey = keys.find(k => k.toLowerCase().replace(/\s/g, '') === 'alamat')
          const posyanduKey = keys.find(k => k.toLowerCase().replace(/\s/g, '') === 'posyandu')

          if (nameKey && addressKey) {
            addDocumentNonBlocking(collection(db, "health_records"), {
              category: activeTab,
              name: String(row[nameKey]).toUpperCase().trim(),
              address: String(row[addressKey]).toUpperCase().trim(),
              posyandu: posyanduKey ? String(row[posyanduKey]).toUpperCase().trim() : "",
              createdAt: new Date().toISOString(),
              createdBy: user?.uid
            })
            count++
          }
        })

        toast({ title: "Impor Berhasil", description: `${count} data telah diimpor ke kategori ${activeTab}.` })
      } catch (err) {
        toast({ variant: "destructive", title: "Impor Gagal", description: "Format file tidak sesuai." })
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsBinaryString(file)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto pb-24">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/dashboard/"><ArrowLeft className="h-6 w-6" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Data Kesehatan Masyarakat</h1>
            <p className="text-xs text-muted-foreground font-bold uppercase">Manajemen Data Balita, Stunting, & Kesehatan Ibu</p>
          </div>
        </div>
      </header>

      <section className="grid gap-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, alamat, atau posyandu..."
              className="pl-11 h-12 rounded-xl bg-white shadow-sm border-primary/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls" />
            <Button variant="outline" className="rounded-xl h-12 gap-2 font-bold uppercase text-[10px]" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
              <Upload className="h-4 w-4" /> Impor
            </Button>
            <Button variant="outline" className="rounded-xl h-12 gap-2 font-bold uppercase text-[10px]" onClick={handleExport}>
              <Download className="h-4 w-4" /> Ekspor
            </Button>
            <Button variant="destructive" className="rounded-xl h-12 gap-2 font-bold uppercase text-[10px]" onClick={() => setIsDeleteAllOpen(true)} disabled={isProcessing || !records || records.length === 0}>
              <Trash2 className="h-4 w-4" /> Hapus Semua
            </Button>
            <Button className="rounded-xl h-12 gap-2 font-black uppercase text-[10px] bg-primary shadow-lg shadow-primary/20" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4" /> Tambah Data
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-auto p-1.5 bg-muted/50 flex flex-row overflow-x-auto no-scrollbar md:flex-wrap rounded-2xl">
            {HEALTH_CATEGORIES.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="flex-shrink-0 px-6 py-3 text-[10px] font-black uppercase md:flex-1 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-black uppercase text-slate-800 flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-primary" /> Data {activeTab}
              </h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{filteredRecords.length} Jiwa Terdata</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <div className="col-span-full py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary/30 mx-auto" /></div>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <Card key={record.id} className="border-none shadow-sm hover:shadow-xl transition-all bg-white border border-primary/5 rounded-[1.5rem] overflow-hidden group">
                    <CardHeader className="p-5 pb-2 flex flex-row items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-black text-slate-800 uppercase truncate">{record.name}</CardTitle>
                        {record.posyandu && (
                          <Badge variant="outline" className="mt-1 text-[8px] font-black uppercase border-primary/20 text-primary bg-primary/5">
                            <Home className="h-2 w-2 mr-1" /> {record.posyandu}
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl font-bold uppercase text-[10px]">
                          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => {
                            setSelectedRecord(record)
                            setFormData({ name: record.name, address: record.address, posyandu: record.posyandu || "" })
                            setIsEditOpen(true)
                          }}>
                            <Edit2 className="h-3.5 w-3.5 text-primary" /> Edit Data
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2 text-destructive" onClick={() => {
                            setSelectedRecord(record)
                            setIsDeleteOpen(true)
                          }}>
                            <Trash2 className="h-3.5 w-3.5" /> Hapus Permanen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                      <div className="flex items-start gap-2 text-[11px] font-bold text-muted-foreground uppercase leading-relaxed">
                        <MapPin className="h-3.5 w-3.5 text-primary/40 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{record.address}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-24 text-center border-2 border-dashed rounded-[2.5rem] border-slate-100 bg-slate-50/30">
                  <p className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Belum ada data untuk kategori {activeTab}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Add / Edit Dialog */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(val) => {
        if (!val) { setIsAddOpen(false); setIsEditOpen(false); setFormData({ name: "", address: "", posyandu: "" }); }
      }}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-lg text-primary">{isEditOpen ? "Edit Data" : "Tambah Data"}</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">Kategori: {activeTab}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nama Lengkap</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="CONTOH: AGUSTIN"
                className="h-12 rounded-xl uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Alamat / RT RW</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                placeholder="CONTOH: RT 04 RW 05 KECAMATAN GANDRUNGMANGU"
                className="h-12 rounded-xl uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Kelompok Posyandu</Label>
              <Input
                value={formData.posyandu}
                onChange={(e) => setFormData(p => ({ ...p, posyandu: e.target.value }))}
                placeholder="CONTOH: LESTARI 3"
                className="h-12 rounded-xl uppercase"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="w-full h-14 rounded-2xl font-black uppercase shadow-lg shadow-primary/20">
              {isEditOpen ? "Simpan Perubahan" : "Tambahkan Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Confirm */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-xs text-center">
          <DialogHeader className="items-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <DialogTitle className="font-black uppercase text-destructive">Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <p className="text-xs font-bold uppercase text-slate-500 leading-relaxed py-4">
            Hapus data <strong>{selectedRecord?.name}</strong>? Tindakan ini permanen.
          </p>
          <DialogFooter className="flex-col gap-2">
            <Button variant="destructive" className="w-full h-12 rounded-2xl font-black uppercase" onClick={handleDelete}>Ya, Hapus Data</Button>
            <Button variant="ghost" className="w-full h-12 rounded-2xl font-bold uppercase" onClick={() => setIsDeleteOpen(false)}>Batal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirm */}
      <Dialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-sm text-center">
          <DialogHeader className="items-center">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Trash2 className="h-10 w-10 text-destructive" />
            </div>
            <DialogTitle className="font-black uppercase text-destructive text-lg leading-tight">Hapus Seluruh Data {activeTab}?</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-xs font-bold uppercase text-slate-500 leading-relaxed">
              Tindakan ini akan menghapus <strong>SEMUA</strong> data dalam kategori <strong>{activeTab}</strong> secara permanen dari database.
            </p>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2 text-left">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[9px] font-bold text-amber-700 uppercase">Pastikan Anda sudah mengekspor data ke Excel sebagai cadangan sebelum menghapus.</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button variant="ghost" className="w-full h-12 rounded-2xl font-bold uppercase" onClick={() => setIsDeleteAllOpen(false)}>Batal</Button>
            <Button variant="destructive" className="w-full h-12 rounded-2xl font-black uppercase shadow-lg shadow-destructive/20" onClick={handleDeleteAllByCategory} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Ya, Hapus Semua"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
