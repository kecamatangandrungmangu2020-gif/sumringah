"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  RefreshCw, 
  Loader2, 
  Calendar as CalendarIcon,
  Send,
  BookUser,
  AlertCircle,
  Copy,
  Check,
  MessageSquare,
  Share2,
  Sparkles,
  Tag
} from "lucide-react"
import { format, parseISO, addDays, isValid } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { callAppsScript } from "@/app/agenda/actions"
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { doc, collection, setDoc } from "firebase/firestore"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { parseEventDescription } from "@/components/agenda/DisposisiKegiatan"

interface CalendarEvent {
  id: string;
  summary: string;
  location: string;
  htmlLink: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description: string;
}

export function RincianKegiatan() {
  // Default ke H+1 (Besok) sesuai instruksi dan kebiasaan pengumuman rengiat dinas
  const [searchDate, setSearchDate] = useState<string>(() => {
    return format(addDays(new Date(), 1), "yyyy-MM-dd")
  })
  const [searchEvents, setSearchEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [notulensi, setNotulensi] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingType, setIsUpdatingType] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { toast } = useToast()

  // Modal WhatsApp Rengiat
  const [isWaModalOpen, setIsWaModalOpen] = useState(false)
  const [customWaText, setCustomWaText] = useState("")
  const [copied, setCopied] = useState(false)

  const todayStr = format(new Date(), "yyyy-MM-dd")
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd")

  const { user } = useUser()
  const db = useFirestore()
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);
  const { data: userData } = useDoc(userDocRef);

  // Firestore collection for customized agenda types (Internal / Eksternal)
  const agendaTypesRef = useMemoFirebase(() => (db && user) ? collection(db, "agenda_types") : null, [db, user]);
  const { data: agendaTypesData } = useCollection<any>(agendaTypesRef);
  const agendaTypesMap = useMemo(() => {
    const map = new Map<string, "Internal" | "Eksternal">();
    if (agendaTypesData) {
      agendaTypesData.forEach((item: any) => {
        if (item.eventId && item.eventType) {
          map.set(item.eventId, item.eventType);
        }
      });
    }
    return map;
  }, [agendaTypesData]);

  const fetchAgendaData = useCallback(async (date: string) => {
    setIsSearching(true)
    setSearchEvents([])
    setSelectedEvent(null)
    setErrorMsg(null)
    
    try {
      const calendarId = userData?.googleCalendarId || GOOGLE_CONFIG.calendarId;
      const res = await callAppsScript({
        action: 'getCalendar',
        calendarId: calendarId,
        date: date
      });
      
      if (res && res.success) {
        const items = res.items || [];
        setSearchEvents(items);
        if (items.length === 0) {
          toast({ variant: "default", title: "Informasi", description: `Tidak ada agenda pada tanggal terpilih.` })
        }
      } else {
        setErrorMsg(res.error || "Gagal memproses data dari Google.");
      }

    } catch (err: any) {
      console.error("Fetch Agenda Error:", err);
      setErrorMsg("Koneksi gagal. Pastikan deployment Apps Script sudah benar.");
    } finally {
      setIsSearching(false);
    }
  }, [toast, userData])

  useEffect(() => {
    if (userData || !user) {
      fetchAgendaData(searchDate);
    }
  }, [fetchAgendaData, userData, user, searchDate])

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    const description = event.description || "";
    const separator = "--- NOTULENSI ---";
    const parts = description.split(separator);
    setNotulensi(parts.length > 1 ? parts[1].trim() : "");
  }

  const getEventType = (eventId: string, desc: string): "Internal" | "Eksternal" => {
    if (agendaTypesMap.has(eventId)) {
      return agendaTypesMap.get(eventId)!;
    }
    if (desc?.includes("JENIS: Eksternal")) return "Eksternal";
    return "Internal";
  }

  const handleUpdateType = async (newType: "Internal" | "Eksternal") => {
    if (!selectedEvent || !user || !db) return;
    setIsUpdatingType(true);
    try {
      await setDoc(doc(db, "agenda_types", selectedEvent.id), {
        eventId: selectedEvent.id,
        eventType: newType,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      }, { merge: true });

      const calendarId = userData?.googleCalendarId || GOOGLE_CONFIG.calendarId;
      await callAppsScript({
        action: 'updateEventDisposition',
        calendarId: calendarId,
        eventId: selectedEvent.id,
        eventType: newType,
      });

      toast({
        title: "Jenis Agenda Diperbarui",
        description: `Acara telah disesuaikan menjadi Agenda ${newType}.`
      });
    } catch (err: any) {
      console.error("Update Type Error:", err);
      toast({
        variant: "destructive",
        title: "Gagal Mengubah Jenis",
        description: err.message || "Terjadi kesalahan."
      });
    } finally {
      setIsUpdatingType(false);
    }
  };

  const getEventDisposition = (desc: string) => {
    const dispMatch = desc?.match(/^DISPOSISI:\s*(.+)$/m);
    if (dispMatch && dispMatch[1]) {
      const raw = dispMatch[1].trim();
      if (raw && !raw.toLowerCase().includes("belum") && raw !== "-" && raw !== "undefined") {
        return raw;
      }
    }
    return null;
  }

  // Fungsi Pembuat Format Teks RENGIAT WhatsApp
  const generateRengiatWAText = (events: CalendarEvent[], dateStr: string) => {
    let dateObj = new Date();
    try {
      dateObj = parseISO(dateStr);
      if (!isValid(dateObj)) dateObj = new Date(dateStr);
    } catch {
      dateObj = new Date();
    }
    const formattedDate = format(dateObj, "EEEE, d MMMM yyyy", { locale: localeID });
    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    let text = `RENGIAT\n${capitalizedDate}\n\n`;

    if (events.length === 0) {
      text += `(Belum ada agenda kegiatan tercatat untuk tanggal ini)`;
      return text;
    }

    // Urutkan agenda secara kronologis berdasarkan waktu
    const sortedEvents = [...events].sort((a, b) => {
      const timeA = a.start?.dateTime || "";
      const timeB = b.start?.dateTime || "";
      return timeA.localeCompare(timeB);
    });

    sortedEvents.forEach((evt, idx) => {
      let waktuStr = "Menyesuaikan";
      if (evt.start?.dateTime) {
        try {
          const parsedTime = parseISO(evt.start.dateTime);
          if (isValid(parsedTime)) {
            waktuStr = `Pukul ${format(parsedTime, "HH.mm")}`;
          }
        } catch {
          waktuStr = "Menyesuaikan";
        }
      }

      const lokasiStr = evt.location?.trim() || "Kecamatan Gandrungmangu";

      // Ekstraksi Disposisi
      const details = parseEventDescription(evt.description || "");
      let disposisiStr = "-";
      
      const dispMatch = (evt.description || "").match(/^DISPOSISI:\s*([^\n\r]+)/im);
      if (dispMatch && dispMatch[1]) {
        const raw = dispMatch[1].trim();
        if (raw && !raw.toLowerCase().includes("belum") && raw !== "-" && raw !== "undefined") {
          disposisiStr = raw;
        }
      }
      
      if (disposisiStr === "-" && details.disposition && details.disposition !== "-") {
        disposisiStr = details.dispositionNotes && details.dispositionNotes !== "-"
          ? `${details.disposition}, ${details.dispositionNotes}`
          : details.disposition;
      }

      text += `${idx + 1}. *${evt.summary?.trim() || "Kegiatan Dinas"}* || Waktu: ${waktuStr} || Lokasi: ${lokasiStr} || Disposisi: ${disposisiStr}\n`;
    });

    return text.trim();
  };

  const handleOpenWaModal = () => {
    const text = generateRengiatWAText(searchEvents, searchDate);
    setCustomWaText(text);
    setIsWaModalOpen(true);
  };

  const handleCopyDirect = async () => {
    const text = customWaText || generateRengiatWAText(searchEvents, searchDate);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast({
        title: "✓ Format RENGIAT Berhasil Disalin!",
        description: "Teks sudah disalin ke clipboard dan siap ditempel ke grup WhatsApp.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Gagal Menyalin",
        description: "Silakan salin teks secara manual dari kotak dialog.",
      });
    }
  };

  const handleOpenWhatsAppWeb = () => {
    const text = customWaText || generateRengiatWAText(searchEvents, searchDate);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleSaveNotulensi = async () => {
    if (!selectedEvent || !notulensi) {
      toast({ variant: "destructive", title: "Gagal Simpan", description: "Pilih acara dan isi notulensi terlebih dahulu." });
      return;
    }

    setIsSaving(true);
    try {
      const calendarId = userData?.googleCalendarId || GOOGLE_CONFIG.calendarId;
      const result = await callAppsScript({
        action: 'updateEventDescription',
        calendarId: calendarId,
        eventId: selectedEvent.id,
        newContent: notulensi
      });

      if (!result.success) {
        throw new Error(result.error || 'Gagal memperbarui acara.');
      }

      toast({ title: "Berhasil", description: "Notulensi disimpan ke Google Calendar." });
      fetchAgendaData(searchDate);

    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <div className="space-y-6">
        {/* Kontrol Tanggal & Tombol Aksi Salin Format WA */}
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white overflow-hidden">
          <CardContent className="p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Pilih Tanggal Rengiat
                </Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={searchDate === todayStr ? "default" : "outline"}
                    onClick={() => setSearchDate(todayStr)}
                    className="rounded-full text-xs font-bold h-8 px-3"
                  >
                    Hari Ini
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={searchDate === tomorrowStr ? "default" : "outline"}
                    onClick={() => setSearchDate(tomorrowStr)}
                    className={cn(
                      "rounded-full text-xs font-bold h-8 px-3 transition-all",
                      searchDate === tomorrowStr 
                        ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/25 border-amber-400" 
                        : "hover:border-amber-400 hover:text-amber-700"
                    )}
                  >
                    ⚡ H+1 (Besok)
                  </Button>
                </div>
              </div>

              {/* Tombol Utama: Salin Format WA */}
              <Button
                onClick={handleOpenWaModal}
                disabled={isSearching}
                className="rounded-2xl font-black uppercase tracking-tight bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 h-12 px-5 gap-2 shrink-0 self-start sm:self-center"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Format WA RENGIAT</span>
              </Button>
            </div>

            <div className="flex gap-3 pt-1">
              <Input 
                type="date" 
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-700 text-sm"
              />
              <Button 
                onClick={() => fetchAgendaData(searchDate)}
                disabled={isSearching}
                variant="outline"
                className="h-12 w-12 rounded-2xl shrink-0"
                title="Muat ulang agenda"
              >
                <RefreshCw className={cn("h-4 w-4", isSearching && "animate-spin")} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-800 animate-in fade-in zoom-in-95">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-xs font-bold leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Daftar Acara Tanggal Terpilih */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <p className="text-xs font-bold text-slate-500">
              Agenda untuk: <span className="text-primary font-black uppercase">{format(parseISO(searchDate), "EEEE, d MMMM yyyy", { locale: localeID })}</span>
            </p>
            <span className="text-[11px] font-bold text-slate-400">({searchEvents.length} Acara)</span>
          </div>

          {isSearching ? (
            <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary/30 mx-auto" /></div>
          ) : searchEvents.length > 0 ? (
            searchEvents.map((event, idx) => {
              const type = getEventType(event.id, event.description);
              const disp = getEventDisposition(event.description);
              const isInternal = type === "Internal";
              const isExternal = type === "Eksternal";

              let timeFormatted = "--:--";
              if (event.start?.dateTime) {
                try {
                  timeFormatted = format(parseISO(event.start.dateTime), "HH.mm");
                } catch {
                  timeFormatted = "--:--";
                }
              }
              
              return (
                <button 
                  key={event.id} 
                  onClick={() => handleSelectEvent(event)}
                  className={cn(
                    "w-full text-left p-5 rounded-3xl border shadow-sm transition-all flex flex-col gap-1.5 relative overflow-hidden",
                    isInternal ? "bg-blue-50/60 border-blue-200/60 hover:border-blue-300" : 
                    isExternal ? "bg-amber-50/60 border-amber-200/60 hover:border-amber-300" : 
                    "bg-white border-slate-100 hover:border-slate-300",
                    selectedEvent?.id === event.id && (
                        isInternal ? "ring-2 ring-blue-500/20 border-blue-500 bg-blue-50/80" :
                        isExternal ? "ring-2 ring-amber-500/20 border-amber-500 bg-amber-50/80" :
                        "ring-2 ring-primary/20 border-primary bg-primary/5"
                    )
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      #{idx + 1}
                    </span>
                    <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                        isInternal ? "bg-blue-100/80 border-blue-200 text-blue-900" :
                        isExternal ? "bg-amber-100/80 border-amber-200 text-amber-800" :
                        "bg-slate-100 border-slate-200 text-slate-500"
                    )}>
                        AGENDA {type.toUpperCase()}
                    </span>
                    <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      Pukul {timeFormatted} WIB
                    </span>
                    {disp ? (
                      <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800">
                        ✓ {disp}
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        Belum Disposisi
                      </span>
                    )}
                  </div>
                  <p className="font-black text-sm text-slate-800 leading-tight">{event.summary}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{event.location || "Lokasi belum diatur"}</p>
                </button>
              )
            })
          ) : !errorMsg && (
            <div className="text-center py-12 border-2 border-dashed rounded-[2.5rem] bg-white/50 space-y-2">
              <CalendarIcon className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-muted-foreground">Tidak ada agenda ditemukan pada tanggal ini.</p>
              <p className="text-xs text-muted-foreground">Pilih tanggal lain atau gunakan tombol Input Baru.</p>
            </div>
          )}
        </div>
      </div>

      {/* Kolom Kanan: Rincian & Notulensi */}
      <Card className="border-none shadow-xl shadow-blue-950/5 rounded-[2.5rem] bg-white lg:sticky lg:top-8">
        <CardHeader className="border-b">
            <div className="flex items-center gap-3">
                <BookUser className="h-6 w-6 text-primary" />
                <div>
                    <CardTitle className="text-lg font-black uppercase">Rincian & Notulensi</CardTitle>
                    <CardDescription>Pilih acara dari daftar untuk melihat detail dan mengisi notulensi.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {selectedEvent ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                    <Label className="text-xs text-muted-foreground">Judul Kegiatan</Label>
                    <p className="font-bold text-primary">{selectedEvent.summary}</p>
                </div>
                <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border",
                    getEventType(selectedEvent.id, selectedEvent.description) === "Internal" 
                      ? "bg-blue-50 border-blue-200 text-blue-800" 
                      : "bg-amber-50 border-amber-300 text-amber-900 font-black"
                )}>
                    Agenda {getEventType(selectedEvent.id, selectedEvent.description)}
                </span>
              </div>

              {/* EDITOR JENIS AGENDA (HANYA INTERNAL & EKSTERNAL) */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    Ubah Jenis Agenda
                  </Label>
                  <span className="text-[9px] text-muted-foreground font-semibold">Klik untuk mengganti</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateType("Internal")}
                    disabled={isUpdatingType}
                    className={cn(
                      "h-9 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center justify-center gap-1.5",
                      getEventType(selectedEvent.id, selectedEvent.description) === "Internal"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    🏢 Internal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateType("Eksternal")}
                    disabled={isUpdatingType}
                    className={cn(
                      "h-9 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center justify-center gap-1.5",
                      getEventType(selectedEvent.id, selectedEvent.description) === "Eksternal"
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-black"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    🌐 Eksternal
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Waktu</Label>
                <p className="font-semibold">
                  {selectedEvent.start?.dateTime ? format(parseISO(selectedEvent.start.dateTime), "HH:mm", { locale: localeID }) : "--:--"} - 
                  {selectedEvent.end?.dateTime ? format(parseISO(selectedEvent.end.dateTime), "HH:mm", { locale: localeID }) : "--:--"} WIB
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Lokasi</Label>
                <p className="font-semibold">{selectedEvent.location || "-"}</p>
              </div>
              {getEventDisposition(selectedEvent.description) && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <Label className="text-[10px] font-black uppercase text-emerald-800">Petugas Disposisi</Label>
                  <p className="font-bold text-xs text-emerald-950 mt-0.5">{getEventDisposition(selectedEvent.description)}</p>
                </div>
              )}
              <div>
                <Label htmlFor="notulensi" className="text-xs text-muted-foreground">Notulensi / Catatan Rapat</Label>
                <Textarea
                  id="notulensi"
                  value={notulensi}
                  onChange={(e) => setNotulensi(e.target.value)}
                  placeholder="Tulis hasil rapat atau catatan penting di sini..."
                  className="min-h-[200px] mt-1"
                />
              </div>
              <Button onClick={handleSaveNotulensi} disabled={isSaving || !notulensi} className="w-full gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                Simpan Notulensi ke Kalender
              </Button>
            </div>
          ) : (
            <div className="text-center py-20 space-y-2">
                <BookUser className="h-10 w-10 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-muted-foreground">Pilih satu acara di sebelah kiri untuk melihat rincian.</p>
                <p className="text-xs text-muted-foreground">Gunakan tombol "Format WA RENGIAT" di atas untuk menyalin seluruh agenda hari ini atau besok.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MODAL FORMAT WA RENGIAT ─────────────────────────────────────────────── */}
      <Dialog open={isWaModalOpen} onOpenChange={setIsWaModalOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] p-6 sm:p-8 bg-white border border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-emerald-800 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Format Siap Kirim WhatsApp (RENGIAT)
            </DialogTitle>
            <DialogDescription>
              Format rincian agenda untuk <strong>{format(parseISO(searchDate), "EEEE, d MMMM yyyy", { locale: localeID })}</strong> siap dibagikan ke WhatsApp. Anda dapat mengedit teks sebelum menyalin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <Textarea
              value={customWaText}
              onChange={(e) => setCustomWaText(e.target.value)}
              className="font-mono text-xs sm:text-sm bg-slate-950 text-slate-100 p-4 rounded-2xl min-h-[280px] leading-relaxed border-none focus-visible:ring-emerald-500 shadow-inner"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>* Teks di antara tanda bintang (*judul*) akan otomatis tampil tebal (bold) di WhatsApp.</span>
              <span className="font-bold text-slate-600">{searchEvents.length} Item Agenda</span>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center w-full pt-3 border-t">
            <Button
              variant="outline"
              onClick={() => setIsWaModalOpen(false)}
              className="rounded-xl h-11 px-4 text-xs font-bold w-full sm:w-auto"
            >
              Tutup
            </Button>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={handleCopyDirect}
                className={cn(
                  "rounded-xl h-11 px-5 text-xs font-black uppercase gap-2 shadow-md transition-all flex-1 sm:flex-none",
                  copied 
                    ? "bg-slate-900 text-emerald-400" 
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                )}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Tersalin ke Clipboard!" : "Salin Teks WA"}
              </Button>

              <Button
                onClick={handleOpenWhatsAppWeb}
                variant="outline"
                className="rounded-xl h-11 px-4 text-xs font-bold gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 flex-1 sm:flex-none"
              >
                <Share2 className="h-4 w-4" />
                Kirim ke WA
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
