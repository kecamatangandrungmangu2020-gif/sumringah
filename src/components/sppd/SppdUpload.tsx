"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plane, Calendar as CalendarIcon, RefreshCw, ChevronRight, Save, Hash, Sparkles, Clock, MapPin, Users, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { format, addDays, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { callAppsScript } from "@/app/agenda/actions"
import { getNextSequenceNumber, saveToBukuAgenda } from "@/lib/naskah-dinas-utils"

const formSchema = z.object({
  category: z.string().min(1, "Pilih kategori"),
  officialName: z.string().min(1, "Pilih atau isi nama personel"),
  stNumber: z.string().min(3, "Nomor Surat Tugas wajib diisi"),
  sppdNumber: z.string().min(3, "Nomor SPPD wajib diisi"),
  destination: z.string().min(3, "Tujuan minimal 3 karakter"),
  totalExpense: z.string().min(1, "Total biaya harus diisi"),
  startDate: z.string().min(1, "Pilih tanggal mulai"),
  endDate: z.string().min(1, "Pilih tanggal selesai"),
  description: z.string().optional(),
  companions: z.string().optional(),
})

interface AgendaItem {
  id: string
  summary: string
  location: string
  description?: string
  start: { dateTime: string };
}

interface CompanionEntry {
  category: string
  name: string
}

interface SppdUploadProps {
  onSuccess?: () => void
  initialData?: any
}

export function SppdUpload({ onSuccess, initialData }: SppdUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isFetchingStNumber, setIsFetchingStNumber] = useState(false)
  const [isFetchingSppdNumber, setIsFetchingSppdNumber] = useState(false)
  const [activeTab, setActiveTab] = useState(initialData ? "manual" : "agenda")
  const [isSyncing, setIsSyncing] = useState(false)
  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [duration, setDuration] = useState<number>(1)

  const [numCompanions, setNumCompanions] = useState<number>(0)
  const [companionsList, setCompanionsList] = useState<CompanionEntry[]>([])

  const { toast } = useToast()
  const { user } = useUser()
  const db = useFirestore()

  const personnelRef = useMemoFirebase(() => (db && user) ? collection(db, "personnel") : null, [db, user])
  const { data: dbOfficials } = useCollection(personnelRef)

  // Baca googleCalendarId dari user settings (sama seperti RincianKegiatan & Dashboard)
  const userDocRef = useMemoFirebase(() => (db && user) ? doc(db, "users", user.uid) : null, [db, user])
  const { data: userData } = useDoc(userDocRef)
  const villageSettingsRef = useMemoFirebase(() => (db && user) ? doc(db, "settings", "village") : null, [db, user])
  const { data: villageSettings } = useDoc(villageSettingsRef)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: initialData?.category || "",
      officialName: initialData?.officialName || "",
      stNumber: initialData?.stNumber || initialData?.letterNumber || "", // backward compat
      sppdNumber: initialData?.sppdNumber || initialData?.documentNumber || "", // backward compat
      destination: initialData?.destination || "",
      totalExpense: initialData?.amount?.toString() || "",
      startDate: initialData?.startDate || format(new Date(), "yyyy-MM-dd"),
      endDate: initialData?.endDate || format(new Date(), "yyyy-MM-dd"),
      description: initialData?.description || "",
      companions: initialData?.companions || "",
    },
  })

  useEffect(() => {
    if (initialData?.companions) {
      const lines = initialData.companions.split("\n").filter(Boolean)
      const parsed = lines.map((line: string) => {
        const parts = line.split(" - ")
        return { name: parts[0], category: parts[1] || "Karyawan Kecamatan" }
      })
      setCompanionsList(parsed)
      setNumCompanions(parsed.length)
    }
  }, [initialData])

  const watchStartDate = form.watch("startDate")
  const selectedCategory = form.watch("category")

  useEffect(() => {
    if (watchStartDate) {
      const start = parseISO(watchStartDate)
      const end = addDays(start, duration - 1)
      form.setValue("endDate", format(end, "yyyy-MM-dd"), { shouldValidate: true })
    }
  }, [watchStartDate, duration, form])

  const handleNumCompanionsChange = (val: string) => {
    const num = parseInt(val) || 0
    setNumCompanions(num)
    const newList = [...companionsList]
    if (num > newList.length) {
      for (let i = newList.length; i < num; i++) {
        newList.push({ category: "", name: "" })
      }
    } else {
      newList.splice(num)
    }
    setCompanionsList(newList)
  }

  const updateCompanion = (index: number, field: keyof CompanionEntry, value: string) => {
    const newList = [...companionsList]
    newList[index] = { ...newList[index], [field]: value }
    if (field === 'category') newList[index].name = ""
    setCompanionsList(newList)
  }

  const handlePullStNumber = async () => {
    if (!db) return
    setIsFetchingStNumber(true)
    try {
      const nextNum = await getNextSequenceNumber(db, "surat_tugas_sppd")
      form.setValue("stNumber", nextNum, { shouldValidate: true })
      toast({ title: "No. Surat Tugas Ditarik", description: nextNum })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Tarik Nomor" })
    } finally {
      setIsFetchingStNumber(false)
    }
  }

  const handlePullSppdNumber = async () => {
    if (!db) return
    setIsFetchingSppdNumber(true)
    try {
      const nextNum = await getNextSequenceNumber(db, "sppd")
      form.setValue("sppdNumber", nextNum, { shouldValidate: true })
      toast({ title: "No. SPPD Ditarik", description: nextNum })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Tarik Nomor" })
    } finally {
      setIsFetchingSppdNumber(false)
    }
  }

  const handleSync = useCallback(async (date: string) => {
    setIsSyncing(true)
    setAgendas([])
    try {
      // Gunakan calendarId dari user settings atau village settings (sama seperti RincianKegiatan)
      const calendarId = userData?.googleCalendarId || villageSettings?.googleCalendarId || GOOGLE_CONFIG.calendarId;
      const res = await callAppsScript({
        action: 'getCalendar',
        date: date,
        calendarId: calendarId
      });
      if (res && res.success && res.items) {
        // Hanya tampilkan agenda eksternal untuk keperluan SPPD perjalanan dinas
        const externalOnly = res.items.filter((item: any) =>
          (item.description || '').includes('JENIS: Eksternal')
        );
        setAgendas(externalOnly);
      } else {
        setAgendas([]);
      }
    } catch (err: any) {
      // Silent fail: jangan crash, cukup kosongkan agenda
      setAgendas([]);
    } finally {
      setIsSyncing(false)
    }
  }, [userData, villageSettings]);

  useEffect(() => {
    // Tunggu userData (googleCalendarId) siap dulu sebelum fetch, sama seperti RincianKegiatan
    if (activeTab === 'agenda' && (userData !== undefined || villageSettings !== undefined)) {
      handleSync(selectedCalendarDate);
    }
  }, [selectedCalendarDate, handleSync, activeTab, userData, villageSettings]);

  const handleSelectAgenda = (agenda: AgendaItem) => {
    form.setValue("destination", agenda.location || "Luar Kecamatan", { shouldValidate: true })
    form.setValue("startDate", format(new Date(agenda.start.dateTime), "yyyy-MM-dd"), { shouldValidate: true })
    form.setValue("description", agenda.summary, { shouldValidate: true })
    setActiveTab("manual")
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !db) return
    setIsUploading(true)

    const serializedCompanions = companionsList
      .filter(c => c.name && c.category)
      .map(c => `${c.name} - ${c.category}`)
      .join("\n")

    const payload = {
      ...values,
      userId: user.uid,
      amount: parseFloat(values.totalExpense) || 0,
      expenseDate: initialData?.expenseDate || new Date().toISOString(),
      approvalStatus: initialData?.approvalStatus || "pending",
      description: values.description || `Perjalanan dinas ke ${values.destination}`,
      companions: serializedCompanions,
      // Mapping for backward compatibility with cetak form
      letterNumber: values.stNumber,
      documentNumber: values.sppdNumber
    }

    try {
      if (initialData?.id) {
        const docRef = doc(db, "users", user.uid, "sppds", initialData.id)
        updateDocumentNonBlocking(docRef, payload)
      } else {
        const sppdRef = collection(db, "users", user.uid, "sppds")
        addDocumentNonBlocking(sppdRef, { ...payload, documentUrls: [] })
      }

      // SINKRON KE BUKU AGENDA (SURAT TUGAS KE SURAT KELUAR, SPPD KE SPPD)
      await saveToBukuAgenda(db, {
        kategori: "surat_keluar",
        nomor: values.stNumber,
        perihal: `Surat Tugas: ${values.description || values.destination}`,
        userId: user.uid
      });

      await saveToBukuAgenda(db, {
        kategori: "sppd",
        nomor: values.sppdNumber,
        perihal: `SPPD: ${values.description || values.destination}`,
        userId: user.uid
      });

      toast({ title: "Sukses!", description: "Pengajuan SPPD telah dicatat dalam Buku Agenda." })
      form.reset()
      onSuccess?.()
    } catch (err) {
      toast({ variant: "destructive", title: "Terjadi Kesalahan", description: "Gagal menyimpan data." })
    } finally {
      setIsUploading(false)
    }
  }

  const personnelCategories = [
    { id: "Karyawan Kecamatan", label: "Karyawan" },
    { id: "SKRETARIS Kecamatan", label: "SKRETARIS Kecamatan" },
    { id: "KEPALA Kecamatan", label: "KEPALA Kecamatan" },
    { id: "Kader", label: "Kader" },
    { id: "Lainnya", label: "Lainnya" }
  ]

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      {!initialData && (
        <TabsList className="grid grid-cols-2 w-full h-11 mb-6 bg-accent/5 p-1 rounded-xl">
          <TabsTrigger value="agenda" className="gap-2 text-[10px] font-black uppercase rounded-lg">
            <CalendarIcon className="h-4 w-4" />
            Agenda Kecamatan
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2 text-[10px] font-black uppercase rounded-lg">
            <Plane className="h-4 w-4" />
            Isi Pengajuan
          </TabsTrigger>
        </TabsList>
      )}

      <TabsContent value="agenda" className="mt-0 space-y-4">
        <div className="flex items-end gap-2 p-4 border rounded-2xl bg-accent/5 shadow-inner border-accent/10">
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase text-accent mb-1 block">Pilih Tanggal Agenda</label>
            <Input
              type="date"
              value={selectedCalendarDate}
              onChange={(e) => setSelectedCalendarDate(e.target.value)}
              className="h-12 font-black border-accent/20 bg-white"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleSync(selectedCalendarDate)}
            disabled={isSyncing}
            className="h-12 w-12 shrink-0 border-accent/20 bg-white shadow-sm"
          >
            <RefreshCw className={cn("h-5 w-5 text-accent", isSyncing && "animate-spin")} />
          </Button>
        </div>

        <ScrollArea className="h-[300px] border rounded-2xl p-2 bg-muted/20">
          {isSyncing ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-accent/40" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Menyambungkan Kalender...</p>
            </div>
          ) : agendas.length > 0 ? (
            <div className="space-y-3">
              {agendas.map((agenda: AgendaItem) => (
                <button
                  key={agenda.id}
                  type="button"
                  onClick={() => handleSelectAgenda(agenda)}
                  className="w-full text-left p-4 rounded-xl border bg-card hover:bg-accent/5 transition-all flex items-start justify-between gap-3 group shadow-sm border-accent/10"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border bg-sky-100 border-sky-200 text-sky-700">
                        EKSTERNAL
                      </span>
                    </div>
                    <p className="text-sm font-black group-hover:text-accent leading-tight whitespace-normal">{agenda.summary}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <MapPin className="h-3 w-3 text-accent/50" />
                      <p className="text-[10px] text-muted-foreground truncate font-bold uppercase">{agenda.location || "Luar Kecamatan"}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent shrink-0 mt-1" />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center border-2 border-dashed rounded-3xl border-muted/50 flex flex-col items-center justify-center gap-2">
              <CalendarIcon className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Tidak ada agenda eksternal pada tanggal ini</p>
            </div>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="manual" className="mt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Lembaga/Jabatan</FormLabel>
                    <Select onValueChange={(val) => {
                      field.onChange(val);
                      form.setValue("officialName", "");
                    }} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 border-accent/20">
                          <SelectValue placeholder="Pilih..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {personnelCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedCategory && (
                <FormField
                  control={form.control}
                  name="officialName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Nama Personel</FormLabel>
                      {selectedCategory === "Lainnya" ? (
                        <FormControl>
                          <Input placeholder="Ketik nama..." className="h-11 border-accent/20" {...field} />
                        </FormControl>
                      ) : (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 border-accent/20">
                              <SelectValue placeholder="Pilih..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <ScrollArea className="h-[180px]">
                              {(dbOfficials || []).filter(o => o.category === selectedCategory).map((o: any) => (
                                <SelectItem key={`${o.name}-${o.jabatan}`} value={`${o.name} - ${o.jabatan}`}>
                                  {o.name}
                                </SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-primary/5 p-5 rounded-2xl border border-primary/10">
              <FormField
                control={form.control}
                name="stNumber"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-[9px] font-black uppercase text-primary">No. Surat Tugas</FormLabel>
                      <button
                        type="button"
                        onClick={handlePullStNumber}
                        disabled={isFetchingStNumber}
                        className="text-[8px] font-black text-primary uppercase flex items-center gap-1 hover:opacity-70 disabled:opacity-50"
                      >
                        {isFetchingStNumber ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
                        Tarik Nomor
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/40" />
                        <Input placeholder="800.1.11.1 / XXX / 49 / 2026" className="h-10 pl-9 border-primary/20 font-mono text-[11px] font-bold bg-white" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sppdNumber"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-[9px] font-black uppercase text-accent">No. SPPD</FormLabel>
                      <button
                        type="button"
                        onClick={handlePullSppdNumber}
                        disabled={isFetchingSppdNumber}
                        className="text-[8px] font-black text-accent uppercase flex items-center gap-1 hover:opacity-70 disabled:opacity-50"
                      >
                        {isFetchingSppdNumber ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
                        Tarik Nomor
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-accent/40" />
                        <Input placeholder="000.1.2.3 / XXX / 49 / 2026" className="h-10 pl-9 border-accent/20 font-mono text-[11px] font-bold bg-white" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Tujuan Dinas</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Masukkan lokasi tujuan..." className="h-11 pl-10 border-accent/20" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 p-4 border rounded-2xl bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-slate-500" />
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Daftar Pengikut</h4>
              </div>

              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Jumlah Pengikut</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={numCompanions}
                    onChange={(e) => handleNumCompanionsChange(e.target.value)}
                    placeholder="0"
                    className="h-11 border-slate-300"
                  />
                </FormControl>
              </FormItem>

              {companionsList.map((comp, idx) => (
                <div key={idx} className="space-y-3 pt-3 border-t border-slate-200 animate-in fade-in slide-in-from-top-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Pengikut #{idx + 1}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground">Lembaga</FormLabel>
                      <Select
                        value={comp.category}
                        onValueChange={(val) => updateCompanion(idx, 'category', val)}
                      >
                        <SelectTrigger className="h-10 text-xs border-slate-300 bg-white">
                          <SelectValue placeholder="Pilih..." />
                        </SelectTrigger>
                        <SelectContent>
                          {personnelCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <FormLabel className="text-[9px] font-bold uppercase text-muted-foreground">Nama Personel</FormLabel>
                      {comp.category === "Lainnya" ? (
                        <Input
                          placeholder="Ketik nama..."
                          value={comp.name}
                          onChange={(e) => updateCompanion(idx, 'name', e.target.value)}
                          className="h-10 text-xs border-slate-300 bg-white"
                        />
                      ) : (
                        <Select
                          disabled={!comp.category}
                          value={comp.name}
                          onValueChange={(val) => updateCompanion(idx, 'name', val)}
                        >
                          <SelectTrigger className="h-10 text-xs border-slate-300 bg-white">
                            <SelectValue placeholder="Pilih Nama..." />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-[150px]">
                              {(dbOfficials || []).filter(o => o.category === comp.category).map((o: any) => (
                                <SelectItem key={`${o.name}-${o.jabatan}`} value={`${o.name} - ${o.jabatan}`}>
                                  {o.name}
                                </SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 p-4 border rounded-2xl bg-primary/5 border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Waktu Perjalanan</h4>
              </div>
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Tanggal Berangkat</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-11 border-primary/20 bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground block">Durasi</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((d: number) => (
                    <Button
                      key={d}
                      type="button"
                      variant={duration === d ? "default" : "outline"}
                      onClick={() => setDuration(d)}
                      className={cn(
                        "flex-1 h-10 text-[10px] font-black uppercase rounded-xl transition-all",
                        duration === d ? "bg-primary shadow-md" : "border-primary/20 bg-white text-primary hover:bg-primary/5"
                      )}
                    >
                      {d} Hari
                    </Button>
                  ))}
                </div>
              </div>
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Tanggal Kembali</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-11 border-primary/20 bg-muted/30 font-bold" {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Maksud / Judul Kegiatan</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Rapat Koordinasi..." className="h-11 border-accent/20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalExpense"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Estimasi Biaya (Rp)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="500000" className="h-11 border-accent/20 font-black text-accent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-14 text-base font-black uppercase shadow-lg bg-accent hover:bg-accent/90 rounded-2xl transition-all active:scale-[0.98]" disabled={isUploading}>
              {isUploading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> MENGIRIM...</> : initialData ? <><Save className="mr-2 h-5 w-5" /> SIMPAN PERUBAHAN</> : <><Plane className="mr-2 h-5 w-5" /> AJUKAN SEKARANG</>}
            </Button>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  )
}
