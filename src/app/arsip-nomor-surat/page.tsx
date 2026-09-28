"use client"

import { useState } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, where, doc, setDoc, deleteDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Hash,
  Plus,
  Search,
  Loader2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Map,
  Save,
  AlertCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const KATEGORI_CONFIG = [
  { id: 'surat_keluar', label: 'Agenda Surat Keluar', icon: ArrowUpRight, color: 'text-blue-500' },
  { id: 'surat_masuk', label: 'Agenda Surat Masuk', icon: ArrowDownLeft, color: 'text-emerald-500' },
  { id: 'sk', label: 'Nomor SK', icon: FileText, color: 'text-purple-500' },
  { id: 'sppd', label: 'Nomor SPPD', icon: Map, color: 'text-teal-500' },
]

export default function ArsipNomorSuratPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const [activeKategori, setActiveKategori] = useState('surat_keluar')
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    nomor: "",
    perihal: "",
    tanggal: format(new Date(), "yyyy-MM-dd")
  })

  const agendaQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "buku_agenda"),
      where("kategori", "==", activeKategori),
      orderBy("createdAt", "desc")
    )
  }, [db, user, activeKategori])

  const { data: agendaList, isLoading } = useCollection(agendaQuery)

  const filtered = (agendaList || []).filter(item =>
    (item.nomor || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.perihal || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSave = async () => {
    if (!db || !user || !formData.nomor || !formData.perihal) {
      toast({ variant: "destructive", title: "Gagal", description: "Lengkapi semua isian." })
      return
    }

    setIsSaving(true)
    try {
      const id = doc(collection(db, "buku_agenda")).id
      await setDoc(doc(db, "buku_agenda", id), {
        ...formData,
        id,
        kategori: activeKategori,
        userId: user.uid,
        createdAt: new Date().toISOString()
      })
      toast({ title: "Tersimpan", description: "Data agenda telah dicatat." })
      setIsAddOpen(false)
      setFormData({ nomor: "", perihal: "", tanggal: format(new Date(), "yyyy-MM-dd") })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Gagal menyimpan data." })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus entri agenda ini?")) return
    try {
      await deleteDoc(doc(db, "buku_agenda", id))
      toast({ title: "Terhapus", description: "Agenda telah dihapus." })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan." })
    }
  }

  if (isUserLoading || user === undefined) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary/30" /></div>
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Register Surat</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase">Manajemen Buku Agenda & Penomoran Kecamatan</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="h-12 rounded-xl bg-primary hover:bg-primary/90 font-black uppercase shadow-lg gap-2">
          <Plus className="h-5 w-5" /> Input Agenda Manual
        </Button>
      </header>

      <Tabs value={activeKategori} onValueChange={setActiveKategori} className="w-full">
        <TabsList className="flex flex-wrap h-auto bg-muted/50 p-1.5 rounded-2xl mb-8 gap-1">
          {KATEGORI_CONFIG.map(cat => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="flex-1 min-w-[120px] rounded-xl h-11 text-[10px] font-black uppercase gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <cat.icon className={cn("h-4 w-4", cat.color)} />
              {cat.label.replace('Agenda ', '')}
            </TabsTrigger>
          ))}
        </TabsList>

        <section className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nomor atau perihal..."
              className="pl-11 h-14 rounded-2xl bg-white border-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400 w-16">No</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400">Nomor Surat / Dokumen</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400">Perihal / Kegiatan</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400">Tanggal</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/30" /></td></tr>
                    ) : filtered.length > 0 ? (
                      filtered.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg text-sm">
                              {item.nomor}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-700">{item.perihal}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-500">{item.tanggal}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-24 text-center text-slate-400 italic text-sm">
                          Belum ada data agenda di kategori ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </Tabs>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-[2.5rem] border-none p-8 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase">Input Agenda Baru</DialogTitle>
            <CardDescription className="font-bold text-[10px] uppercase">{KATEGORI_CONFIG.find(c => c.id === activeKategori)?.label}</CardDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tanggal</Label>
              <Input type="date" value={formData.tanggal} onChange={e => setFormData(p => ({ ...p, tanggal: e.target.value }))} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nomor Surat</Label>
              <Input placeholder="Contoh: 400 / 056 / 49 / 2026" value={formData.nomor} onChange={e => setFormData(p => ({ ...p, nomor: e.target.value }))} className="h-12 rounded-xl font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Perihal / Nama Kegiatan</Label>
              <Input placeholder="Tuliskan perihal atau isi singkat..." value={formData.perihal} onChange={e => setFormData(p => ({ ...p, perihal: e.target.value }))} className="h-12 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={isSaving} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase shadow-lg">
              {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5 mr-2" />} Simpan ke Agenda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
