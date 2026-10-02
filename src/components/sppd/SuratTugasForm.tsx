"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Printer, FileText, Loader2, User, Calendar as CalendarIcon, RefreshCw, ChevronRight, MapPin, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { doc, collection } from "firebase/firestore"
import { generateSuratTugasPDF } from "@/lib/pdf-utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { cn } from "@/lib/utils"

// Helper: Memastikan data kategori lama dan custom tabs tetap cocok
const isCategoryMatch = (officialCat?: string, selectedCat?: string) => {
  if (!officialCat || !selectedCat) return false;
  if (officialCat.toLowerCase() === selectedCat.toLowerCase()) return true;

  if (selectedCat === "PKK KECAMATAN" && (
    officialCat === "SKRETARIS Kecamatan" ||
    officialCat === "PKK KECAMATAN" ||
    officialCat.toLowerCase() === "pkk"
  )) return true;

  if (selectedCat === "Darmawanita kecamatan" && (
    officialCat === "KEPALA Kecamatan" ||
    officialCat === "Darmawanita kecamatan" ||
    officialCat.toLowerCase().includes("darmawanita") ||
    officialCat.toLowerCase().includes("dharma wanita")
  )) return true;

  return false;
};

const formSchema = z.object({
  category: z.string().min(1, "Pilih kategori"),
  officialName: z.string().min(1, "Pilih atau isi nama personel"),
  description: z.string().min(5, "Tujuan tugas minimal 5 karakter"),
  destination: z.string().min(3, "Lokasi tujuan minimal 3 karakter"),
  startDate: z.string().min(1, "Pilih tanggal mulai"),
  endDate: z.string().min(1, "Pilih tanggal selesai"),
})

interface AgendaItem {
  id: string
  title: string
  date: string
  location: string
}

export function SuratTugasForm() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState("agenda")
  const [isSyncing, setIsSyncing] = useState(false)
  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("")

  const { toast } = useToast()
  const { user } = useUser()
  const db = useFirestore()

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userDocRef)

  const personnelRef = useMemoFirebase(() => (db && user) ? collection(db, "personnel") : null, [db, user])
  const { data: dbOfficials } = useCollection(personnelRef)

  const customTabsRef = useMemoFirebase(() => (db && user) ? doc(db, "settings", "personnel_custom_tabs") : null, [db, user])
  const { data: customTabsDoc } = useDoc(customTabsRef)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      officialName: "",
      description: "",
      destination: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
  })

  useEffect(() => {
    setSelectedCalendarDate(new Date().toISOString().split('T')[0])
  }, [])

  const selectedCategory = form.watch("category")

  async function handleSync(date: Date) {
    setIsSyncing(true)
    try {
      const response = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'getCalendar',
          date: date.toISOString(),
          calendarId: GOOGLE_CONFIG.calendarId
        }),
        redirect: 'follow'
      });
      const res = await response.json();
      const events = (res.items || []).map((item: any) => ({
        id: item.id,
        title: item.summary || "Tanpa Judul",
        date: item.start?.date || item.start?.dateTime?.split('T')[0] || format(date, "yyyy-MM-dd"),
        location: item.location || "",
      }))
      setAgendas(events)
    } catch (err) {
      setAgendas([])
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSelectAgenda = (agenda: AgendaItem) => {
    form.setValue("destination", agenda.location, { shouldValidate: true })
    form.setValue("startDate", agenda.date, { shouldValidate: true })
    form.setValue("endDate", agenda.date, { shouldValidate: true })
    form.setValue("description", `Menghadiri / melaksanakan: ${agenda.title}`)
    setActiveTab("manual")
    toast({ title: "Data Terisi", description: "Detail kegiatan telah disinkronkan dari kalender." })
  }

  const handlePrint = async () => {
    const values = form.getValues()
    const isValid = await form.trigger()
    if (!isValid) return

    setIsGenerating(true)
    try {
      const pdfBlob = await generateSuratTugasPDF(values, userData?.logoBase64)
      const url = URL.createObjectURL(pdfBlob)
      window.open(url, "_blank")
      toast({ title: "Berhasil", description: "Surat tugas telah dibuat." })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat membuat PDF." })
    } finally {
      setIsGenerating(false)
    }
  }

  // Kategori dinamis tersinkronisasi otomatis dengan /profile/ dan database
  const personnelCategories = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    const added = new Set<string>();

    const add = (id: string, label: string) => {
      const key = id.toLowerCase().trim();
      if (!added.has(key)) {
        added.add(key);
        list.push({ id, label });
      }
    };

    const tabs: any[] = customTabsDoc?.tabs || [];

    // Helper cek apakah tab aktif untuk SPPD
    const isSppdActive = (catName: string) => {
      const found = tabs.find(t => t?.title?.toLowerCase()?.trim() === catName.toLowerCase()?.trim());
      if (!found) return true; // Default true jika belum pernah disetel
      return found.includeInSppd !== false;
    };

    // 1. Kategori default profil (hanya jika includeInSppd !== false)
    if (isSppdActive("Karyawan Kecamatan")) {
      add("Karyawan Kecamatan", "Karyawan Kecamatan");
    }
    if (isSppdActive("PKK KECAMATAN")) {
      add("PKK KECAMATAN", "PKK KECAMATAN");
    }
    if (isSppdActive("Darmawanita kecamatan")) {
      add("Darmawanita kecamatan", "Darmawanita kecamatan");
    }

    // 2. Kategori dari custom tabs profil (/profile/) yang includeInSppd !== false
    tabs.forEach((t) => {
      if (t?.title?.trim() && t.includeInSppd !== false) {
        add(t.title.trim(), t.title.trim());
      }
    });

    // 3. Kategori unik dari database personnel (hanya jika diaktifkan untuk SPPD)
    (dbOfficials || []).forEach((o: any) => {
      const cat = o.category?.trim();
      if (!cat) return;
      const lower = cat.toLowerCase();
      if (
        lower === "skretaris kecamatan" ||
        lower === "kepala kecamatan" ||
        lower === "pkk" ||
        lower.includes("darmawanita") ||
        lower.includes("dharma wanita")
      ) {
        return;
      }
      if (isSppdActive(cat)) {
        add(cat, cat);
      }
    });

    // 4. Pilihan manual
    add("Lainnya", "Lainnya");

    return list;
  }, [customTabsDoc, dbOfficials]);

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardHeader className="p-4 bg-primary/5 border-b">
        <CardTitle className="text-base flex items-center gap-2 text-primary">
          <FileText className="h-5 w-5" />
          Konfigurasi Surat Tugas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full h-10 mb-6 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="agenda" className="gap-2 text-[10px] font-black uppercase">
              <CalendarIcon className="h-3.5 w-3.5" />
              Pilih dari Kalender
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2 text-[10px] font-black uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Detail Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="mt-0 space-y-4">
            <div className="flex items-end gap-2 p-3 border rounded-xl bg-muted/20">
              <div className="flex-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">Tanggal Kegiatan</label>
                <Input
                  type="date"
                  value={selectedCalendarDate}
                  onChange={(e) => {
                    setSelectedCalendarDate(e.target.value);
                    if (e.target.value) handleSync(new Date(e.target.value));
                  }}
                  className="h-10 text-sm font-bold bg-white"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleSync(new Date(selectedCalendarDate))}
                disabled={isSyncing}
                className="h-10 w-10 shrink-0 bg-white"
              >
                <RefreshCw className={cn("h-4 w-4 text-primary", isSyncing && "animate-spin")} />
              </Button>
            </div>

            <ScrollArea className="h-[250px] border rounded-xl p-2 bg-white">
              {isSyncing ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary/30" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Mencari Agenda...</p>
                </div>
              ) : agendas.length > 0 ? (
                <div className="space-y-2">
                  {agendas.map((agenda: AgendaItem) => (
                    <button
                      key={agenda.id}
                      type="button"
                      onClick={() => handleSelectAgenda(agenda)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-primary/5 transition-all flex items-start justify-between gap-3 group border-slate-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold group-hover:text-primary leading-snug">{agenda.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                          <p className="text-[9px] text-muted-foreground truncate uppercase font-medium">{agenda.location || "Luar Kecamatan"}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center border-2 border-dashed rounded-xl border-muted/50">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Tidak ada agenda ditemukan</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="manual" className="mt-0">
            <Form {...form}>
              <form className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Jabatan / Lembaga</FormLabel>
                        <Select onValueChange={(val) => {
                          field.onChange(val);
                          form.setValue("officialName", "");
                        }} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Pilih Kategori..." />
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
                          <FormLabel className="text-xs font-bold uppercase">Nama Personel</FormLabel>
                          {selectedCategory === "Lainnya" ? (
                            <FormControl>
                              <Input placeholder="Ketik nama..." className="h-10" {...field} />
                            </FormControl>
                          ) : (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Pilih Nama..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <ScrollArea className="h-[180px]">
                                  {(dbOfficials || [])
                                    .filter(o => isCategoryMatch(o.category, selectedCategory))
                                    .map((o: any) => {
                                      const job = o.jabatan || selectedCategory;
                                      const val = `${o.name} - ${job}`;
                                      return (
                                        <SelectItem key={o.id || `${o.name}-${job}`} value={val}>
                                          {o.name} {o.jabatan && o.jabatan !== '-' ? `(${o.jabatan})` : ''}
                                        </SelectItem>
                                      );
                                    })}
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

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase">Maksud / Tujuan Tugas</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Tuliskan maksud penugasan..." className="h-20 text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase">Tempat Tujuan</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Contoh: Cilacap" className="h-10 pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Tgl Mulai</FormLabel>
                        <FormControl><Input type="date" className="h-10" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Tgl Selesai</FormLabel>
                        <FormControl><Input type="date" className="h-10" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="button"
                  onClick={handlePrint}
                  className="w-full h-12 gap-2 text-base font-black uppercase shadow-lg bg-primary hover:bg-primary/90 rounded-xl"
                  disabled={isGenerating}
                >
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
                  Cetak Surat Tugas PDF
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
