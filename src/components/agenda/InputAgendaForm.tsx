
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
import { FileUp, Loader2, Save, KeyRound, CheckCircle2, AlertCircle, X, Sparkles, Wand2 } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { callAppsScript } from "@/app/agenda/actions"
import { format } from "date-fns"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc, collection } from "firebase/firestore"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  eventType: z.enum(["Internal", "Eksternal"]).default("Internal"),
  eventDate: z.string().min(1, "Tanggal harus diisi."),
  eventTime: z.string().min(1, "Waktu harus diisi."),
  eventLocation: z.string().min(3, "Tempat minimal 3 karakter."),
  eventTitle: z.string().min(5, "Acara minimal 5 karakter."),
  eventNotes: z.string().optional(),
})

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
      eventTime: "",
      eventLocation: "Balai Kecamatan Gandrungmangu",
      eventTitle: "",
      eventNotes: "",
    },
  })

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

      const startDateTime = new Date(`${values.eventDate}T${values.eventTime.split(' ')[0] || '00:00'}`);
      // Simpan jenis dan penanda disposisi awal
      const description = `JENIS: ${values.eventType}\nDISPOSISI: Belum Didisposisi\n\nCATATAN: ${values.eventNotes || '-'}`.trim();

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
        fileData: fileData,
        folderId: folderId
      });

      if (!result || !result.success) {
        throw new Error(result?.error || "Gagal menyimpan ke Google.");
      }

      // Otomatis masukkan ke arsip dokumen "Dok Surat Masuk" di Firestore
      if (db) {
        try {
          const docSuratMasuk = {
            acara: values.eventTitle,
            lokasi: values.eventLocation || "Balai Kecamatan Gandrungmangu",
            tanggal: values.eventDate,
            waktu: values.eventTime || "",
            fileUrl: result.fileUrl || "",
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

      if (result.warning) {
        toast({
          title: "Agenda Tersimpan!",
          description: result.warning,
        });
      } else {
        toast({ title: "Sukses!", description: "Agenda telah ditambahkan ke kalender dan otomatis diarsipkan ke Dok Surat Masuk." });
      }

      form.reset({
        eventType: "Internal",
        eventDate: format(new Date(), "yyyy-MM-dd"),
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="eventDate" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Hari / Tanggal</FormLabel>
                  <FormControl><Input type="date" {...field} className="h-12 rounded-xl" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="eventTime" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Waktu</FormLabel>
                  <FormControl><Input type="time" {...field} className="h-12 rounded-xl" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
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

