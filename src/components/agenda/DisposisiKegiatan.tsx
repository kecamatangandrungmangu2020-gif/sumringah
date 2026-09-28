"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  RefreshCw, 
  Loader2, 
  Calendar as CalendarIcon,
  UserCheck,
  UserX,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  FileText,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Send,
  Trash2,
  Search,
  Filter,
  UserPlus,
  Edit3,
  Tag
} from "lucide-react"
import { format, addDays, subDays, parseISO, isValid } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { callAppsScript } from "@/app/agenda/actions"
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { collection, doc, setDoc } from "firebase/firestore"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface CalendarEvent {
  id: string;
  summary: string;
  location: string;
  htmlLink: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description: string;
}

export function parseEventDescription(description: string = "") {
  let type: "Internal" | "Eksternal" = "Internal";
  if (description.includes("JENIS: Eksternal")) type = "Eksternal";

  let disposition = "";
  let dispositionNotes = "";
  let isDisposed = false;

  const dispMatch = description.match(/^DISPOSISI:\s*(.+)$/m);
  if (dispMatch && dispMatch[1]) {
    const rawDisp = dispMatch[1].trim();
    if (
      rawDisp && 
      !rawDisp.toLowerCase().includes("belum didisposisi") && 
      !rawDisp.toLowerCase().includes("belum ada") &&
      rawDisp !== "-" && 
      rawDisp !== "undefined"
    ) {
      // Check if there is a note inside brackets e.g. "Nama Petugas (Catatan: ...)"
      const noteInDispMatch = rawDisp.match(/^(.*?)\s*\((?:Catatan:\s*)?(.*?)\)$/);
      if (noteInDispMatch) {
        disposition = noteInDispMatch[1].trim();
        dispositionNotes = noteInDispMatch[2].trim();
      } else {
        disposition = rawDisp;
      }
      isDisposed = true;
    }
  }

  // Notulensi
  const notulensiParts = description.split("--- NOTULENSI ---");
  const notulensi = notulensiParts.length > 1 ? notulensiParts[1].trim() : "";

  // Lampiran / Undangan URL
  const linkMatch = description.match(/📄 Undangan \/ Lampiran:\s*(https?:\/\/[^\s]+)/);
  const attachmentUrl = linkMatch ? linkMatch[1] : null;

  // Catatan Acara
  let eventNotes = "";
  const notesMatch = description.match(/CATATAN:\s*([\s\S]*?)(?=(--- NOTULENSI ---|📄 Undangan|$))/);
  if (notesMatch && notesMatch[1]) {
    const noteContent = notesMatch[1].trim();
    if (noteContent !== "-") {
      eventNotes = noteContent;
    }
  }

  return {
    type,
    disposition,
    dispositionNotes,
    isDisposed,
    notulensi,
    attachmentUrl,
    eventNotes,
  };
}

export function DisposisiKegiatan() {
  // Default date is H+1 (Tomorrow) as requested
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return format(addDays(new Date(), 1), "yyyy-MM-dd");
  });

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingDisp, setIsSavingDisp] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Modal State for assigning disposition & editing type
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)
  const [selectedEventType, setSelectedEventType] = useState<"Internal" | "Eksternal">("Internal")
  const [selectedOfficer, setSelectedOfficer] = useState<string>("")
  const [customOfficer, setCustomOfficer] = useState<string>("")
  const [dispNotes, setDispNotes] = useState<string>("")

  const { toast } = useToast()
  const { user } = useUser()
  const db = useFirestore()

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);
  const { data: userData } = useDoc(userDocRef);

  // Fetch Personnel from Firestore
  const personnelRef = useMemoFirebase(() => (db && user) ? collection(db, "personnel") : null, [db, user])
  const { data: dbPersonnel, isLoading: isPersonnelLoading } = useCollection(personnelRef)

  const officerOptions = useMemo(() => {
    if (!dbPersonnel) return [];
    return dbPersonnel
      .map(p => ({
        name: p.name || "",
        nip: p.nip && p.nip !== '-' ? p.nip : "",
        jabatan: p.jabatan || "",
        category: p.category || "",
        display: `${p.name}${p.jabatan ? ` (${p.jabatan})` : ""}`,
      }))
      .filter(p => p.name.trim() !== "")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dbPersonnel]);

  const fetchEvents = useCallback(async (date: string) => {
    setIsLoading(true);
    setEvents([]);
    setErrorMsg(null);

    try {
      const calendarId = userData?.googleCalendarId || GOOGLE_CONFIG.calendarId;
      const res = await callAppsScript({
        action: 'getCalendar',
        calendarId: calendarId,
        date: date
      });

      if (res && res.success) {
        const items = res.items || [];
        setEvents(items);
      } else {
        setErrorMsg(res?.error || "Gagal memproses data kalender dari Google.");
      }
    } catch (err: any) {
      console.error("Fetch Disposisi Error:", err);
      setErrorMsg("Koneksi gagal. Pastikan deployment Apps Script dan koneksi Google Calendar aktif.");
    } finally {
      setIsLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    if (userData || !user) {
      fetchEvents(selectedDate);
    }
  }, [fetchEvents, selectedDate, userData, user]);

  // Firestore collection for customized agenda types
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

  const parsedEvents = useMemo(() => {
    return events.map(evt => {
      const details = parseEventDescription(evt.description);
      if (agendaTypesMap.has(evt.id)) {
        details.type = agendaTypesMap.get(evt.id)!;
      }
      return {
        ...evt,
        details
      };
    });
  }, [events, agendaTypesMap]);

  const filteredEvents = useMemo(() => {
    return parsedEvents.filter(evt => {
      const matchesSearch = 
        (evt.summary || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (evt.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (evt.details.disposition || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "PENDING") return !evt.details.isDisposed;
      if (statusFilter === "COMPLETED") return evt.details.isDisposed;
      return true;
    });
  }, [parsedEvents, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = parsedEvents.length;
    const completed = parsedEvents.filter(e => e.details.isDisposed).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [parsedEvents]);

  const handleOpenDisposisiModal = (event: CalendarEvent) => {
    setActiveEvent(event);
    const details = parseEventDescription(event.description);
    const currentType = agendaTypesMap.get(event.id) || details.type;
    setSelectedEventType(currentType === "Eksternal" ? "Eksternal" : "Internal");
    
    if (details.isDisposed && details.disposition) {
      // Check if matches one of the options
      const match = officerOptions.find(o => o.display === details.disposition || o.name === details.disposition);
      if (match) {
        setSelectedOfficer(match.display);
        setCustomOfficer("");
      } else {
        setSelectedOfficer("OTHER");
        setCustomOfficer(details.disposition);
      }
      setDispNotes(details.dispositionNotes || "");
    } else {
      setSelectedOfficer("");
      setCustomOfficer("");
      setDispNotes("");
    }

    setIsModalOpen(true);
  };

  const handleSaveDisposition = async () => {
    if (!activeEvent) return;

    const officerToAssign = (selectedOfficer === "OTHER" || selectedOfficer === "Lainnya") 
      ? customOfficer.trim() 
      : selectedOfficer.trim();
    if (!officerToAssign) {
      toast({
        variant: "destructive",
        title: "Petugas Belum Dipilih",
        description: "Silakan pilih nama petugas atau ketikkan nama secara manual.",
      });
      return;
    }

    setIsSavingDisp(true);
    try {
      // 1. Simpan perubahan jenis agenda ke Firestore agar langsung tersinkron
      if (db) {
        try {
          await setDoc(doc(db, "agenda_types", activeEvent.id), {
            eventId: activeEvent.id,
            eventType: selectedEventType,
            updatedAt: new Date().toISOString(),
            updatedBy: user?.uid || "admin"
          }, { merge: true });
        } catch (fsErr) {
          console.error("Gagal simpan agenda_type ke Firestore:", fsErr);
        }
      }

      // 2. Simpan disposisi & jenis agenda ke Google Calendar via Apps Script
      const calendarId = userData?.googleCalendarId || GOOGLE_CONFIG.calendarId;
      const res = await callAppsScript({
        action: 'updateEventDisposition',
        calendarId: calendarId,
        eventId: activeEvent.id,
        disposition: officerToAssign,
        dispositionNotes: dispNotes.trim(),
        eventType: selectedEventType,
      });

      if (!res || !res.success) {
        throw new Error(res?.error || "Gagal memperbarui disposisi di Google Calendar.");
      }

      toast({
        title: "Disposisi & Jenis Berhasil Disimpan!",
        description: `Kegiatan diatur sebagai Agenda ${selectedEventType} dan didisposisikan kepada ${officerToAssign}.`,
      });

      setIsModalOpen(false);
      fetchEvents(selectedDate);
    } catch (err: any) {
      console.error("Save Disposisi Error:", err);
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan Disposisi",
        description: err.message || "Terjadi kesalahan saat menyimpan disposisi.",
      });
    } finally {
      setIsSavingDisp(false);
    }
  };

  const handleQuickToggleType = async (eventId: string, currentType: "Internal" | "Eksternal") => {
    const newType = currentType === "Internal" ? "Eksternal" : "Internal";
    if (!user || !db) return;
    try {
      await setDoc(doc(db, "agenda_types", eventId), {
        eventId,
        eventType: newType,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      }, { merge: true });

      const calendarId = userData?.googleCalendarId || GOOGLE_CONFIG.calendarId;
      await callAppsScript({
        action: 'updateEventDisposition',
        calendarId,
        eventId,
        eventType: newType,
      });

      toast({
        title: "Jenis Agenda Diubah",
        description: `Acara dialihkan menjadi Agenda ${newType}.`
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Mengubah Jenis",
        description: err.message
      });
    }
  };

  const handleResetDisposition = async (event: CalendarEvent) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan status disposisi untuk kegiatan ini?")) {
      return;
    }

    setIsSavingDisp(true);
    try {
      const calendarId = userData?.googleCalendarId || GOOGLE_CONFIG.calendarId;
      const res = await callAppsScript({
        action: 'updateEventDisposition',
        calendarId: calendarId,
        eventId: event.id,
        disposition: "Belum Didisposisi",
        dispositionNotes: "",
      });

      if (!res || !res.success) {
        throw new Error(res?.error || "Gagal mereset disposisi di Google Calendar.");
      }

      toast({
        title: "Disposisi Dibatalkan",
        description: "Status kegiatan telah dikembalikan ke Belum Didisposisi.",
      });

      fetchEvents(selectedDate);
    } catch (err: any) {
      console.error("Reset Disposisi Error:", err);
      toast({
        variant: "destructive",
        title: "Gagal Mereset Disposisi",
        description: err.message,
      });
    } finally {
      setIsSavingDisp(false);
    }
  };

  const formatEventTime = (evt: CalendarEvent) => {
    try {
      if (evt.start?.dateTime) {
        const startDate = parseISO(evt.start.dateTime);
        const startTime = isValid(startDate) ? format(startDate, "HH:mm", { locale: localeID }) : "--:--";
        let endTime = "";
        if (evt.end?.dateTime) {
          const endDate = parseISO(evt.end.dateTime);
          endTime = isValid(endDate) ? ` - ${format(endDate, "HH:mm", { locale: localeID })} WIB` : " WIB";
        }
        return `${startTime}${endTime}`;
      } else if (evt.start?.date) {
        return "Seharian Penuh";
      }
    } catch (e) {
      // Fallback
    }
    return "Waktu Belum Diatur";
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const dayAfterTomorrowStr = format(addDays(new Date(), 2), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS & DATE SELECTOR */}
      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-blue-50/40 border-b">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-black uppercase text-slate-800 tracking-tight">
                  Manajemen Disposisi Kegiatan
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-500">
                  Pantau & tentukan petugas/pejabat yang ditugaskan untuk kegiatan H+1 atau tanggal lainnya.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEvents(selectedDate)}
              disabled={isLoading}
              className="gap-2 rounded-xl font-bold border-slate-200 shadow-sm self-start md:self-auto"
            >
              <RefreshCw className={cn("h-4 w-4 text-primary", isLoading && "animate-spin")} />
              <span>Segarkan Data</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* DATE PICKER & QUICK BUTTONS */}
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase text-slate-400 mr-1 tracking-wider">Cepat:</span>
              <Button
                type="button"
                size="sm"
                variant={selectedDate === todayStr ? "default" : "outline"}
                className={cn("rounded-xl text-xs font-bold", selectedDate === todayStr && "shadow-md")}
                onClick={() => setSelectedDate(todayStr)}
              >
                Hari Ini
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selectedDate === tomorrowStr ? "default" : "outline"}
                className={cn(
                  "rounded-xl text-xs font-black uppercase tracking-tight",
                  selectedDate === tomorrowStr ? "bg-primary text-white shadow-md shadow-primary/20" : "border-primary/30 text-primary hover:bg-primary/5"
                )}
                onClick={() => setSelectedDate(tomorrowStr)}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                H+1 (Besok)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selectedDate === dayAfterTomorrowStr ? "default" : "outline"}
                className={cn("rounded-xl text-xs font-bold", selectedDate === dayAfterTomorrowStr && "shadow-md")}
                onClick={() => setSelectedDate(dayAfterTomorrowStr)}
              >
                H+2 (Lusa)
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-[11px] font-black uppercase text-slate-400 shrink-0">Pilih Tanggal:</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-12 w-48 rounded-xl font-bold text-slate-700 bg-slate-50 border-slate-200 text-sm shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* SUMMARY STATS TILES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Agenda</p>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{stats.total}</p>
                <p className="text-[10px] font-semibold text-slate-500">
                  {format(parseISO(selectedDate), "EEEE, dd MMMM yyyy", { locale: localeID })}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-600">
                <CalendarIcon className="h-6 w-6" />
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border transition-all flex items-center justify-between",
              stats.pending > 0 
                ? "bg-amber-50/80 border-amber-300 shadow-sm" 
                : "bg-slate-50/50 border-slate-200"
            )}>
              <div>
                <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Belum Disposisi</p>
                <p className="text-2xl font-black text-amber-900 mt-0.5">{stats.pending}</p>
                <p className="text-[10px] font-bold text-amber-700">
                  {stats.pending > 0 ? "Perlu segera ditugaskan" : "Semua telah didisposisikan"}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border transition-all flex items-center justify-between",
              stats.completed > 0 
                ? "bg-emerald-50/80 border-emerald-300 shadow-sm" 
                : "bg-slate-50/50 border-slate-200"
            )}>
              <div>
                <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Selesai Disposisi</p>
                <p className="text-2xl font-black text-emerald-900 mt-0.5">{stats.completed}</p>
                <p className="text-[10px] font-bold text-emerald-700">Petugas telah ditentukan</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* SEARCH & FILTER BAR */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari nama acara, tempat, atau petugas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
              <Button
                type="button"
                size="sm"
                variant={statusFilter === "ALL" ? "default" : "ghost"}
                className={cn("h-9 rounded-lg text-xs font-bold", statusFilter === "ALL" && "shadow-sm")}
                onClick={() => setStatusFilter("ALL")}
              >
                Semua ({stats.total})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={statusFilter === "PENDING" ? "default" : "ghost"}
                className={cn(
                  "h-9 rounded-lg text-xs font-bold", 
                  statusFilter === "PENDING" && "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                )}
                onClick={() => setStatusFilter("PENDING")}
              >
                Belum ({stats.pending})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={statusFilter === "COMPLETED" ? "default" : "ghost"}
                className={cn(
                  "h-9 rounded-lg text-xs font-bold", 
                  statusFilter === "COMPLETED" && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                )}
                onClick={() => setStatusFilter("COMPLETED")}
              >
                Selesai ({stats.completed})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ERROR MESSAGE */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-xs font-bold leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* EVENT LISTINGS */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-16 bg-white rounded-[2.5rem] border shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Memuat rincian agenda dari Google Calendar...</p>
            <p className="text-xs text-muted-foreground mt-1">Mengambil data untuk {format(parseISO(selectedDate), "dd MMMM yyyy", { locale: localeID })}</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map((event) => {
            const isCompleted = event.details.isDisposed;
            const isInternal = event.details.type === "Internal";
            const isExternal = event.details.type === "Eksternal";

            return (
              <Card
                key={event.id}
                className={cn(
                  "border-2 transition-all duration-200 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md",
                  isCompleted 
                    ? "bg-white border-emerald-300 hover:border-emerald-400" 
                    : "bg-white border-amber-300 hover:border-amber-400 ring-2 ring-amber-400/20"
                )}
              >
                <div className="p-5 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* LEFT: EVENT DETAILS */}
                  <div className="space-y-3 flex-1">
                    {/* TOP BADGES */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* STATUS BADGE - DISTINCT COLOR */}
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 border border-emerald-300 text-emerald-800 shadow-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                          Selesai Disposisi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 border border-amber-300 text-amber-900 shadow-sm animate-pulse">
                          <Clock className="h-3.5 w-3.5 text-amber-700" />
                          Belum Disposisi
                        </span>
                      )}

                      {/* EVENT TYPE - QUICK TOGGLE BUTTON */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickToggleType(event.id, event.details.type);
                        }}
                        title="Klik untuk ubah jenis agenda (Internal / Eksternal)"
                        className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1 shadow-xs",
                          isInternal 
                            ? "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100" 
                            : "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 font-black"
                        )}
                      >
                        <span>Agenda {event.details.type}</span>
                        <span className="text-[10px] opacity-60">⇄</span>
                      </button>

                      {/* TIME */}
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {formatEventTime(event)}
                      </span>
                    </div>

                    {/* EVENT TITLE */}
                    <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-snug">
                      {event.summary}
                    </h3>

                    {/* LOCATION */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{event.location || "Lokasi belum ditentukan"}</span>
                    </div>

                    {/* CATATAN ACARA (IF ANY) */}
                    {event.details.eventNotes && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="font-bold uppercase text-[9px] text-slate-400 block mb-0.5">Catatan Acara:</span>
                        {event.details.eventNotes}
                      </div>
                    )}

                    {/* DISPOSITION CALLOUT / SUMMARY */}
                    {isCompleted ? (
                      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-emerald-700" />
                          <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                            Petugas Ditugaskan:
                          </span>
                        </div>
                        <p className="text-sm font-black text-emerald-950 pl-6">
                          {event.details.disposition}
                        </p>
                        {event.details.dispositionNotes && (
                          <p className="text-xs text-emerald-800 font-medium pl-6 italic">
                            &ldquo;{event.details.dispositionNotes}&rdquo;
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-dashed border-amber-300 flex items-center gap-2.5 text-amber-800">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        <p className="text-xs font-bold">
                          Kegiatan ini belum memiliki penugasan petugas. Klik tombol untuk menentukan disposisi.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: ACTION BUTTONS */}
                  <div className="flex flex-row lg:flex-col gap-2 shrink-0 justify-end lg:w-48">
                    {isCompleted ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleOpenDisposisiModal(event)}
                          className="flex-1 lg:flex-none h-12 rounded-xl font-black uppercase text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 gap-2 shadow-sm"
                        >
                          <UserCheck className="h-4 w-4 text-emerald-600" />
                          Ubah Disposisi
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleResetDisposition(event)}
                          disabled={isSavingDisp}
                          className="h-12 rounded-xl font-bold text-xs text-rose-600 hover:bg-rose-50 gap-1.5"
                          title="Hapus disposisi"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Batalkan</span>
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => handleOpenDisposisiModal(event)}
                        className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-wider bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 gap-2"
                      >
                        <UserCheck className="h-4 w-4" />
                        Disposisikan
                      </Button>
                    )}

                    {event.details.attachmentUrl && (
                      <a
                        href={event.details.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl text-[10px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Lihat Undangan
                        <ExternalLink className="h-3 w-3 ml-0.5" />
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-slate-300 p-8 space-y-3">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <CalendarIcon className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-slate-700">Tidak ada agenda pada tanggal ini</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Belum ada kegiatan yang tercatat di Google Calendar untuk tanggal {format(parseISO(selectedDate), "EEEE, dd MMMM yyyy", { locale: localeID })}.
            </p>
          </div>
        )}
      </div>

      {/* DISPOSISI MODAL / DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg rounded-[2.5rem] p-6 sm:p-8">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Penugasan Disposisi</span>
            </div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">
              Disposisi Petugas Kegiatan
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500">
              Tentukan pegawai atau staf yang bertugas menghadiri/melaksanakan acara ini.
            </DialogDescription>
          </DialogHeader>

          {activeEvent && (
            <div className="space-y-5 py-2">
              {/* EVENT RECAP */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400">Acara / Perihal:</p>
                <p className="text-sm font-black text-slate-800 leading-tight">{activeEvent.summary}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                  <span>📅 {format(parseISO(selectedDate), "dd MMM yyyy", { locale: localeID })}</span>
                  <span>⏰ {formatEventTime(activeEvent)}</span>
                  <span>📍 {activeEvent.location || "Balai Kecamatan"}</span>
                </div>
              </div>

              {/* EDIT JENIS AGENDA: HANYA INTERNAL & EKSTERNAL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-primary" />
                    Jenis Agenda <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold">Internal / Eksternal</span>
                </Label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedEventType("Internal")}
                    className={cn(
                      "h-11 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center justify-center gap-2",
                      selectedEventType === "Internal"
                        ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <span>🏢 Internal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEventType("Eksternal")}
                    className={cn(
                      "h-11 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center justify-center gap-2",
                      selectedEventType === "Eksternal"
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/25 font-black"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <span>🌐 Eksternal</span>
                  </button>
                </div>
              </div>

              {/* OFFICER SELECTOR */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-primary" />
                    Pilih Petugas / Pegawai <span className="text-red-500">*</span>
                  </Label>
                  {selectedOfficer !== "OTHER" && (
                    <button
                      type="button"
                      onClick={() => setSelectedOfficer("OTHER")}
                      className="text-[11px] font-bold text-amber-600 hover:text-amber-700 underline flex items-center gap-1"
                    >
                      <Edit3 className="h-3 w-3" />
                      Ketik Manual / Lainnya
                    </button>
                  )}
                </div>

                <Select 
                  value={selectedOfficer} 
                  onValueChange={(val) => {
                    setSelectedOfficer(val);
                    if (val !== "OTHER") {
                      setCustomOfficer("");
                    }
                  }}
                >
                  <SelectTrigger className="h-12 rounded-xl text-sm font-medium bg-white">
                    <SelectValue placeholder={isPersonnelLoading ? "Memuat data pegawai..." : "Pilih Nama Petugas atau Lainnya..."} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 rounded-xl">
                    {/* Opsi Lainnya di Bagian Teratas */}
                    <SelectItem value="OTHER" className="text-xs font-black text-amber-800 bg-amber-50 hover:bg-amber-100 py-2.5 border-b mb-1">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-amber-600" />
                        <span>✍️ Lainnya (Input Manual)</span>
                      </div>
                    </SelectItem>

                    {officerOptions.map((off) => (
                      <SelectItem key={off.display} value={off.display} className="text-xs font-semibold py-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{off.name}</span>
                          {(off.jabatan || off.nip) && (
                            <span className="text-[10px] text-muted-foreground">
                              {off.jabatan}{off.nip ? ` • NIP: ${off.nip}` : ""}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Kotak Input Manual Ketika Memilih Lainnya */}
                {selectedOfficer === "OTHER" && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-black uppercase text-amber-900 flex items-center gap-1.5">
                        <Edit3 className="h-3.5 w-3.5 text-amber-700" />
                        Input Nama Petugas / Instansi Manual <span className="text-red-500">*</span>
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOfficer("");
                          setCustomOfficer("");
                        }}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline"
                      >
                        Batal & Pilih dari Daftar
                      </button>
                    </div>
                    <Input
                      autoFocus
                      placeholder="Contoh: Panwas / Pembina Apel Kasi PM / Kasi Kesra / Kepala Desa..."
                      value={customOfficer}
                      onChange={(e) => setCustomOfficer(e.target.value)}
                      className="h-12 rounded-xl text-sm bg-white border-amber-300 font-semibold focus-visible:ring-amber-500 shadow-sm"
                    />
                    <p className="text-[10px] text-amber-800/90 font-medium">
                      Ketik nama pejabat, panitia, tim, atau pihak yang ditugaskan untuk kegiatan ini.
                    </p>
                  </div>
                )}
              </div>

              {/* DISPOSITION INSTRUCTION / NOTES */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-700">
                  Instruksi / Catatan Disposisi (Opsional)
                </Label>
                <Textarea
                  placeholder="Contoh: Mewakili Camat, buat notulensi, dan laporkan hasil rapat..."
                  value={dispNotes}
                  onChange={(e) => setDispNotes(e.target.value)}
                  className="min-h-[80px] rounded-xl text-xs"
                />

                {/* QUICK TEMPLATES */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[9px] font-bold text-slate-400 self-center">Template:</span>
                  {[
                    "Mewakili Camat",
                    "Hadir dan buat notulensi",
                    "Koordinasi lapangan",
                    "Dampingi warga"
                  ].map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => setDispNotes(tpl)}
                      className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition-colors"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="h-12 rounded-xl font-bold"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveDisposition}
              disabled={isSavingDisp}
              className="h-12 rounded-xl font-black uppercase text-xs tracking-wider gap-2 bg-primary shadow-lg shadow-primary/25"
            >
              {isSavingDisp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Simpan & Tetapkan Disposisi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
