
"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FileUp, Loader2, Save, KeyRound, CheckCircle2, AlertCircle, X, Sparkles, Wand2, CalendarDays } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { callAppsScript } from "@/app/agenda/actions"
import { format, addDays, parseISO, differenceInCalendarDays, isValid } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc, collection } from "firebase/firestore"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"

const formSchema = z
  .object({
    eventType: z.enum(["Internal", "Eksternal"]).default("Internal"),
    eventDate: z.string().min(1, "Tanggal mulai harus diisi."),
    eventEndDate: z.string().min(1, "Tanggal selesai harus diisi."),
    eventTime: z.string().min(1, "Waktu harus diisi."),
    eventLocation: z.string().min(3, "Tempat minimal 3 karakter."),
    eventTitle: z.string().min(5, "Acara minimal 5 karakter."),
    eventNotes: z.string().optional(),
  })
  .refine(
    (data) => {
      const start = parseISO(data.eventDate);
      const end = parseISO(data.eventEndDate);
      return isValid(start) && isValid(end) && end >= start;
    },
    {
      message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.",
      path: ["eventEndDate"],
    }
  )
  .refine(
    (data) => {
      const start = parseISO(data.eventDate);
      const end = parseISO(data.eventEndDate);
      return isValid(start) && isValid(end) && differenceInCalendarDays(end, start) <= 13;
    },
    {
      message: "Maksimal rentang kegiatan adalah 14 hari berturut-turut.",
      path: ["eventEndDate"],
    }
  )

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export function InputAgendaForm() {
  const [isSaving, setIsSaving] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [invitationFile, setInvitationFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const { user } = useUser()
  const db = useFirestore()

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);
  const { data: userData } = useDoc(userDocRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventType: "Internal",
      eventDate: format(new Date(), "yyyy-MM-dd"),
      eventEndDate: format(new Date(), "yyyy-MM-dd"),
      eventTime: "",
      eventLocation: "Balai Kecamatan Gandrungmangu",
      eventTitle: "",
      eventNotes: "",
    },
  })

  const watchedStartDate = form.watch("eventDate");
  const watchedEndDate = form.watch("eventEndDate");

  const selectedDatesList = (() => {
    try {
      const s = parseISO(watchedStartDate);
      const e = parseISO(watchedEndDate || watchedStartDate);
      if (!isValid(s) || !isValid(e) || e < s) return [];
      const diff = Math.min(differenceInCalendarDays(e, s), 13);
      return Array.from({ length: diff + 1 }, (_, i) => addDays(s, i));
    } catch {
      return [];
    }
  })();

  const applyDurationDays = (days: number) => {
    try {
      const s = parseISO(form.getValues("eventDate"));
      if (isValid(s)) {
        form.setValue("eventEndDate", format(addDays(s, days - 1), "yyyy-MM-dd"), {
          shouldValidate: true,
        });
      }
    } catch {}
  };

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast({ variant: "destructive", title: "Format Tidak Sesuai", description: "Harap unggah file PDF atau Gambar (JPG/PNG)." })
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ variant: "destructive", title: "Ukuran Terlalu Besar", description: "Maksimal ukuran file adalah 10 MB." })
        return
      }
      setInvitationFile(file)
      toast({ 
        title: "Undangan Dipilih", 
        description: `File "${file.name}" siap dipindai dengan AI atau dilampirkan ke kalender.` 
      })
    }
  }

  const handleScanInvitation = async () => {
    if (!invitationFile) {
      toast({
        variant: "destructive",
        title: "File Belum Dipilih",
        description: "Silakan pilih berkas surat undangan (PDF atau Foto) terlebih dahulu.",
      });
      return;
    }

    setIsScanning(true);
    try {
      const dataUri = await fileToBase64(invitationFile);

      const response = await fetch("/api/scan-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileDataUri: dataUri }),
      });

      const res = await response.json();

      if (!res.success || !res.data) {
        throw new Error(res.error || "Gagal mengekstrak informasi dari surat undangan.");
      }

      const scanned = res.data;

      // Otomatis isi formulir dengan hasil scanning
      if (scanned.eventTitle) {
        form.setValue("eventTitle", scanned.eventTitle, { shouldValidate: true });
      }
      if (scanned.eventDate) {
        form.setValue("eventDate", scanned.eventDate, { shouldValidate: true });
        form.setValue("eventEndDate", scanned.eventEndDate || scanned.eventDate, { shouldValidate: true });
      }
      if (scanned.eventTime) {
        form.setValue("eventTime", scanned.eventTime, { shouldValidate: true });
      }
      if (scanned.eventLocation) {
        form.setValue("eventLocation", scanned.eventLocation, { shouldValidate: true });
      }
      if (scanned.eventNotes) {
        form.setValue("eventNotes", scanned.eventNotes, { shouldValidate: true });
      }
      if (scanned.eventType === "Internal" || scanned.eventType === "Eksternal") {
        form.setValue("eventType", scanned.eventType, { shouldValidate: true });
      }

      toast({
        title: "⚡ Pindai Dokumen Berhasil!",
        description: "Formulir telah terisi otomatis sesuai rincian surat undangan. Silakan periksa kembali sebelum menyimpan.",
      });
    } catch (err: any) {
      console.error("Scan Invitation Error:", err);
      toast({
        variant: "destructive",
        title: "Gagal Memindai Dokumen",
        description: err.message || "Pastikan surat undangan memiliki teks yang jelas dan terbaca.",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true);
    try {
      const calendarId = userData?.googleCalendarId || GOOGLE_CONFIG.calendarId;
      const folderId = userData?.agendaFolderId || GOOGLE_CONFIG.parentFolderId;

      let fileData = null;
      if (invitationFile) {
        const base64String = await fileToBase64(invitationFile);
        fileData = {
          name: invitationFile.name,
          type: invitationFile.type,
          base64: base64String.split(',')[1],
        };
      }

      const startObj = parseISO(values.eventDate);
      const endObj = parseISO(values.eventEndDate || values.eventDate);
      const totalDays = Math.max(1, differenceInCalendarDays(endObj, startObj) + 1);
      const timePart = values.eventTime.split(' ')[0] || '08:00';

      let uploadedFileUrl = "";
      let lastWarning: string | null = null;

      for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
        const currentDateStr = format(addDays(startObj, dayIdx), "yyyy-MM-dd");
        const startDateTime = new Date(`${currentDateStr}T${timePart}`);
        const dayInfoNote = totalDays > 1 ? ` (Hari ke-${dayIdx + 1} dari ${totalDays} Hari)` : "";
        let description = `JENIS: ${values.eventType}\nDISPOSISI: Belum Didisposisi\n\nCATATAN: ${values.eventNotes || '-'}${dayInfoNote}`.trim();

        // Pada hari ke-2 dst., tautkan file undangan yang sudah diunggah di hari ke-1 agar tidak duplikat di Google Drive
        if (dayIdx > 0 && uploadedFileUrl) {
          description += `\n\n📄 Undangan / Lampiran: ${uploadedFileUrl}`;
        }

        const result = await callAppsScript({
          action: "createEventAndUpload",
          eventData: {
            calendarId: calendarId,
            title: values.eventTitle,
            start: startDateTime.toISOString(),
            end: new Date(startDateTime.getTime() + 60 * 60 * 1000).toISOString(),
            description: description,
            location: values.eventLocation,
          },
          fileData: dayIdx === 0 ? fileData : null,
          folderId: folderId
        });

        if (!result || !result.success) {
          throw new Error(result?.error || `Gagal menyimpan agenda hari ke-${dayIdx + 1} ke Google.`);
        }

        if (dayIdx === 0 && result.fileUrl) {
          uploadedFileUrl = result.fileUrl;
        }
        if (result.warning) {
          lastWarning = result.warning;
        }
      }

      // Otomatis masukkan ke arsip dokumen "Dok Surat Masuk" di Firestore
      if (db) {
        try {
          const tanggalLabel =
            totalDays > 1
              ? `${values.eventDate} s.d. ${values.eventEndDate} (${totalDays} Hari)`
              : values.eventDate;
          const docSuratMasuk = {
            acara: values.eventTitle,
            lokasi: values.eventLocation || "Balai Kecamatan Gandrungmangu",
            tanggal: tanggalLabel,
            waktu: values.eventTime || "",
            fileUrl: uploadedFileUrl,
            fileName: invitationFile ? invitationFile.name : "",
            keterangan: values.eventNotes || "",
            sumber: "Agenda Undangan",
            createdAt: new Date().toISOString(),
            createdBy: user ? user.uid : "agenda",
          };
          addDocumentNonBlocking(collection(db, "dokSuratMasuk"), docSuratMasuk);
        } catch (saveDocErr) {
          console.error("Gagal simpan otomatis ke dokSuratMasuk:", saveDocErr);
        }
      }

      if (lastWarning) {
        toast({
          title: `Agenda ${totalDays > 1 ? `${totalDays} Hari ` : ""}Tersimpan!`,
          description: lastWarning,
        });
      } else {
        toast({
          title: "Sukses!",
          description:
            totalDays > 1
              ? `Berhasil membuat ${totalDays} agenda kegiatan (${values.eventDate} s.d. ${values.eventEndDate}) di Google Calendar dan arsip Dok Surat Masuk.`
              : "Agenda telah ditambahkan ke kalender dan otomatis diarsipkan ke Dok Surat Masuk.",
        });
      }

      const todayNow = format(new Date(), "yyyy-MM-dd");
      form.reset({
        eventType: "Internal",
        eventDate: todayNow,
        eventEndDate: todayNow,
        eventTime: "",
        eventLocation: "Balai Kecamatan Gandrungmangu",
        eventTitle: "",
        eventNotes: "",
      });
      setInvitationFile(null);

    } catch (error: any) {
      console.error("Submit Error:", error);
      const isDriveAccessError = error.message?.includes("Akses ditolak: DriveApp") || error.message?.includes("DriveApp");

      toast({
        variant: "destructive",
        title: isDriveAccessError ? "Izin Google Drive Diperlukan" : "Gagal Simpan",
        description: isDriveAccessError 
          ? "Akses DriveApp belum diotorisasi. Buka Editor Google Apps Script, pilih fungsi 'forceGrantAllPermissions', klik Jalankan (Run), lalu Deploy versi baru Web App sebagai 'Saya'." 
          : error.message
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <Card className="border-none shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg">Formulir Input Agenda</CardTitle>
        <CardDescription>Isi detail acara baru secara manual atau gunakan tombol Pindai AI dari surat undangan.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {!userData?.agendaFolderId && invitationFile && (
              <Alert className="bg-blue-50 border-blue-100">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-[10px] font-bold text-blue-800 uppercase">
                  ID Folder belum diatur di Pengaturan. File akan diunggah ke folder utama (My Drive).
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Jenis Kegiatan</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} value={field.value} className="flex gap-4">
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="Internal" /></FormControl>
                        <FormLabel className="font-medium">Internal</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="Eksternal" /></FormControl>
                        <FormLabel className="font-medium">Eksternal</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* UNDANGAN & SMART SCAN AI SECTION */}
            <div className="space-y-3">
              <FormLabel className="text-xs font-bold uppercase text-muted-foreground flex items-center justify-between">
                <span>Undangan (Opsional)</span>
                {invitationFile && (
                  <span className="text-[10px] text-emerald-600 font-bold lowercase">
                    ({(invitationFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                )}
              </FormLabel>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className={cn(
                    "flex-1 justify-start gap-2 h-12 rounded-xl transition-all",
                    invitationFile ? "border-primary/40 bg-primary/5 text-primary font-bold" : "hover:bg-slate-50"
                  )} 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{invitationFile ? invitationFile.name : "Pilih File Undangan (PDF / Foto / Scan)..."}</span>
                </Button>
                {invitationFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-xl text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => {
                      setInvitationFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    title="Batal pilih file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".pdf,image/png,image/jpeg,image/webp" 
                  className="hidden" 
                />
              </div>

              {/* SMART SCAN AI BOX & BUTTON */}
              {invitationFile && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-primary/5 border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                          Smart Scan AI Surat Undangan
                          <span className="bg-emerald-100 text-emerald-800 text-[8px] px-1.5 py-0.5 rounded-full font-bold">Siap Pindai</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                          Otomatis membaca Acara/Perihal, Hari/Tanggal, Waktu, Tempat, dan Catatan dari surat.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleScanInvitation}
                      disabled={isScanning}
                      className="h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2 shrink-0 self-stretch sm:self-auto"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Menganalisis...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 text-amber-300" />
                          <span>Pindai Dokumen</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {isScanning && (
                    <div className="pt-1 flex items-center gap-2 text-xs font-bold text-primary animate-pulse border-t border-primary/10">
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      <span>Sedang membaca dan mengekstrak rincian acara dari berkas surat...</span>
                    </div>
                  )}

                  {!isScanning && (
                    <p className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Berkas siap dilampirkan otomatis ke Google Calendar
                    </p>
                  )}
                </div>
              )}
            </div>

            <FormField control={form.control} name="eventTitle" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Acara / Perihal</FormLabel>
                <FormControl><Input placeholder="Contoh: Rapat Koordinasi Stunting" {...field} className="h-12 rounded-xl" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FormLabel className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  <span>Hari &amp; Tanggal Kegiatan (Bisa Lebih Dari 1 Hari)</span>
                </FormLabel>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => applyDurationDays(d)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer",
                        selectedDatesList.length === d
                          ? "bg-[#0E7490] text-white border-[#0E7490]"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:border-[#0E7490]/50"
                      )}
                    >
                      {d} Hari
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="eventDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold uppercase text-muted-foreground">Tanggal Mulai</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          field.onChange(newStart);
                          const currEnd = form.getValues("eventEndDate");
                          if (!currEnd || currEnd < newStart) {
                            form.setValue("eventEndDate", newStart, { shouldValidate: true });
                          }
                        }}
                        className="h-12 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="eventEndDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold uppercase text-muted-foreground">Tanggal Selesai</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={watchedStartDate}
                        {...field}
                        className="h-12 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="eventTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold uppercase text-muted-foreground">Waktu Mulai</FormLabel>
                    <FormControl><Input type="time" {...field} className="h-12 rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {selectedDatesList.length > 1 && (
                <div className="p-3.5 rounded-2xl bg-cyan-50/80 border border-cyan-200 text-xs space-y-1.5">
                  <div className="font-bold text-[#0E7490] flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>
                      Kegiatan Multi-Hari ({selectedDatesList.length} Hari) — Otomatis dibuat {selectedDatesList.length} agenda di Google Calendar:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {selectedDatesList.map((dt, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-full bg-white border border-cyan-200 text-[11px] font-semibold text-[#061E2B]"
                      >
                        Hari {idx + 1}: {format(dt, "EEE, dd MMM yyyy", { locale: localeID })}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <FormField control={form.control} name="eventLocation" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Tempat</FormLabel>
                <FormControl><Input placeholder="Contoh: Balai Kecamatan Gandrungmangu" {...field} className="h-12 rounded-xl" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="eventNotes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Catatan Tambahan (Opsional)</FormLabel>
                <FormControl><Textarea placeholder="Catatan atau deskripsi singkat acara..." {...field} className="min-h-[100px] rounded-xl" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Alert className="bg-amber-50 border-amber-200 rounded-2xl">
              <KeyRound className="h-4 w-4 text-amber-600" />
              <AlertTitle className="font-bold text-amber-800">Solusi Gagal Simpan</AlertTitle>
              <AlertDescription className="text-[10px] text-amber-700 font-medium uppercase leading-relaxed">
                Jika error 'Akses Ditolak', pastikan ID Kalender/Folder di Pengaturan sudah benar dan jalankan fungsi <strong>'forceGrantAllPermissions'</strong> di Editor Skrip.
              </AlertDescription>
            </Alert>

            <Button type="submit" disabled={isSaving} className="w-full h-14 gap-2 text-base font-black uppercase shadow-lg shadow-primary/20 rounded-2xl">
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Simpan Agenda
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

