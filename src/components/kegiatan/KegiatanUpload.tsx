
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ImagePlus, Loader2, FileText, Upload, Calendar as CalendarIcon, RefreshCw, Printer, FileCheck, Sparkles, BookOpen, AlertCircle, ChevronRight, CheckCircle, Save, Clock, ListOrdered, MessageSquare, Copy, Check, Send, UploadCloud, Paperclip, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { generateNotulenPDF, generateBASTPDF, generateDokumentasiPDF, generateRAPDF } from "@/lib/pdf-utils"
import { callAppsScript } from "@/app/agenda/actions"
import { generateNotulen } from "@/ai/flows/generate-notulen-flow"
import { convertNotulenToWa } from "@/lib/wa-notulen-formatter"
import { ImageUploader } from "@/components/ui/image-uploader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const formSchema = z.object({
  title: z.string().min(5, "Judul minimal 5 karakter"),
  description: z.string().min(1, "Isi notulen tidak boleh kosong"),
  activityType: z.enum(["Internal", "Eksternal"]).default("Internal"),
  category: z.string().default("Internal"),
  location: z.string().min(3, "Lokasi minimal 3 karakter"),
  date: z.string().min(1, "Pilih tanggal"),
  time: z.string().optional(),
  officialName: z.string().optional(),
  aiPromptNotes: z.string().optional(),
  notulenWa: z.string().optional(),
}).refine((data) => {
  if (data.activityType === "Internal" && (!data.officialName || data.officialName === "")) {
    return false;
  }
  return true;
}, {
  message: "Pilih pelaksana kegiatan untuk kegiatan internal",
  path: ["officialName"],
})

function formatIndonesianDateWithDay(dateStr?: string) {
  if (!dateStr) return "Senin, 31 Agustus 2026";
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const d = new Date(year, month - 1, day);
      const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      return `${days[d.getDay()]}, ${day} ${months[month - 1]} ${year}`;
    }
  } catch (e) {}
  return dateStr;
}

function buildDefaultWaSchema(data: {
  notulen?: string;
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  notes?: string;
  officialName?: string;
  activityType?: string;
}) {
  return convertNotulenToWa({
    notulen: data.notulen,
    title: data.title,
    date: data.date,
    time: data.time,
    location: data.location,
    notes: data.notes,
    officialName: data.officialName,
    activityType: data.activityType,
  });
}

interface AgendaItem {
  id: string
  summary: string
  location: string
  description?: string
  start: { dateTime: string };
}

export function KegiatanUpload({ onSuccess, initialData }: { onSuccess?: () => void, initialData?: any }) {
  const [isUploading, setIsUploading] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [isGeneratingDok, setIsGeneratingDok] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(initialData ? "manual" : "agenda")
  const [isSyncing, setIsSyncing] = useState(false)
  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))

  // Cloudinary Image URLs
  const [cloudinaryUrls, setCloudinaryUrls] = useState<{
    kegiatan: string[],
    atk: string[],
    konsumsi: string[]
  }>({
    kegiatan: initialData?.cloudinaryUrls?.kegiatan || [],
    atk: initialData?.cloudinaryUrls?.atk || [],
    konsumsi: initialData?.cloudinaryUrls?.konsumsi || []
  })

  const [selectedMaterials, setSelectedMaterials] = useState<File[]>([])
  const [selectedUndangan, setSelectedUndangan] = useState<File | null>(null)
  const [isAnalyzingAcuan, setIsAnalyzingAcuan] = useState(false)
  const [uploadedAcuanName, setUploadedAcuanName] = useState<string | null>(null)

  const undanganInputRef = useRef<HTMLInputElement>(null)
  const materiInputRef = useRef<HTMLInputElement>(null)
  const acuanFileInputRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()
  const { user } = useUser()
  const db = useFirestore()

  const personnelRef = useMemoFirebase(() => db ? collection(db, "personnel") : null, [db])
  const { data: dbOfficials } = useCollection(personnelRef)

  // GLOBAL CONFIG: Use shared village settings
  const villageSettingsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, "settings", "village")
  }, [db])
  const { data: villageSettings } = useDoc(villageSettingsRef)

  const filteredOfficials = (dbOfficials || []).filter(o =>
    o.jabatan?.includes("KAUR") || o.jabatan?.includes("KEPALA SEKSI") || o.category === "Karyawan Kecamatan"
  );

  const [isCopiedWa, setIsCopiedWa] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      activityType: initialData?.activityType || "Internal",
      category: initialData?.category || "Internal",
      location: initialData?.location || "Balai Kecamatan Gandrungmangu",
      date: initialData?.date || format(new Date(), "yyyy-MM-dd"),
      time: initialData?.time || "",
      officialName: initialData?.officialName || "",
      aiPromptNotes: initialData?.aiPromptNotes || "",
      notulenWa: initialData?.notulenWa || "",
    },
  })

  const watchActivityType = form.watch("activityType");

  useEffect(() => {
    if (watchActivityType === "Eksternal" && !form.getValues("notulenWa")) {
      const template = convertNotulenToWa({
        notulen: form.getValues("description"),
        title: form.getValues("title"),
        date: form.getValues("date"),
        time: form.getValues("time"),
        location: form.getValues("location"),
        notes: form.getValues("aiPromptNotes"),
        officialName: form.getValues("officialName"),
        activityType: "Eksternal",
      });
      form.setValue("notulenWa", template, { shouldDirty: false });
    }
  }, [watchActivityType, form]);

  const handleSync = useCallback(async (date: string) => {
    setIsSyncing(true)
    setAgendas([])
    try {
      const calendarId = villageSettings?.googleCalendarId || GOOGLE_CONFIG.calendarId;
      const res = await callAppsScript({
        action: 'getCalendar',
        date: date,
        calendarId: calendarId
      });

      if (res.success && res.items) {
        setAgendas(res.items)
      } else {
        throw new Error(res.error || "Gagal mengambil data kalender")
      }
    } catch (err: any) {
      console.error("Sync Error:", err);
      toast({ variant: "destructive", title: "Gagal Sinkronisasi", description: "Tidak dapat menghubungkan kalender." })
    } finally {
      setIsSyncing(false)
    }
  }, [toast, villageSettings])

  useEffect(() => {
    if (!initialData && villageSettings) {
      handleSync(selectedCalendarDate);
    }
  }, [selectedCalendarDate, handleSync, initialData, villageSettings])

  const fileToBase64 = async (file: File): Promise<{ name: string, type: string, base64: string } | null> => {
    if (!file || file.size === 0) return null;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const commaIdx = result.indexOf(',');
        const base64 = commaIdx !== -1 ? result.substring(commaIdx + 1) : '';
        resolve({
          name: file.name,
          type: file.type || "application/octet-stream",
          base64: base64
        });
      };
      reader.onerror = error => reject(error);
    });
  }

  const blobToBase64 = (blob: Blob): Promise<string> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result as string;
        const commaIdx = result.indexOf(',');
        const base64 = commaIdx !== -1 ? result.substring(commaIdx + 1) : '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const handleSelectAgenda = (agenda: AgendaItem) => {
    const cleanTitle = agenda.summary.replace(/^Kegiatan\s*:\s*/i, "");
    form.setValue("title", cleanTitle, { shouldDirty: true, shouldValidate: true })

    if (agenda.start?.dateTime) {
      const startDate = new Date(agenda.start.dateTime);
      form.setValue("date", format(startDate, "yyyy-MM-dd"), { shouldDirty: true, shouldValidate: true })
      form.setValue("time", format(startDate, "HH:mm"), { shouldDirty: true, shouldValidate: true })
    }

    form.setValue("location", agenda.location || "Balai Kecamatan Gandrungmangu", { shouldDirty: true, shouldValidate: true })

    // Otomatisasi tipe kegiatan berdasarkan agenda
    const desc = agenda.description || "";
    if (desc.includes("JENIS: Internal")) {
      form.setValue("activityType", "Internal", { shouldValidate: true });
      form.setValue("category", "Internal");
    } else if (desc.includes("JENIS: Eksternal")) {
      form.setValue("activityType", "Eksternal", { shouldValidate: true });
      form.setValue("category", "Eksternal");
    }

    setActiveTab("manual")
    toast({ title: "Agenda Terpilih", description: `Data telah terisi otomatis termasuk jam kegiatan.` })
  }

  const handlePreviewBAST = async () => {
    const values = form.getValues();
    if (!values.officialName) {
      toast({ variant: "destructive", title: "Pilih Pelaksana", description: "Silakan pilih nama pelaksana terlebih dahulu." });
      return;
    }
    try {
      const pdfBlob = await generateBASTPDF(values, villageSettings?.logoBase64);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal PDF", description: "Kesalahan saat membuat BAST." });
    }
  }

  const handlePreviewRA = async () => {
    const values = form.getValues();
    try {
      const pdfBlob = await generateRAPDF(values, villageSettings?.logoBase64);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal PDF", description: "Kesalahan saat membuat Rundown Acara." });
    }
  }

  const handlePreviewNotulen = async () => {
    const values = form.getValues();
    try {
      const pdfBlob = await generateNotulenPDF(values, villageSettings?.logoBase64);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal PDF", description: "Kesalahan saat membuat Notulen." });
    }
  }

  const getFilesFromUrls = async (urls: string[]) => {
    const filePromises = urls.map(async (url, idx) => {
      const res = await fetch(url);
      const blob = await res.blob();
      return new File([blob], `image_${idx}.webp`, { type: "image/webp" });
    });
    return await Promise.all(filePromises);
  };

  const handlePreviewCategoryDok = async (category: 'kegiatan' | 'atk' | 'konsumsi', urls: string[]) => {
    if (urls.length === 0) {
      toast({ variant: "destructive", title: "Foto Belum Diupload", description: `Silakan upload foto ${category.toUpperCase()} ke Cloudinary terlebih dahulu.` });
      return;
    }
    const values = form.getValues();
    if (!values.title) {
      toast({ variant: "destructive", title: "Judul Kosong", description: "Isi nama kegiatan terlebih dahulu." });
      return;
    }
    setIsGeneratingDok(category);
    try {
      const title = category === 'kegiatan' ? "DOKUMENTASI KEGIATAN" : category === 'atk' ? "DOKUMENTASI ATK" : "DOKUMENTASI KONSUMSI";
      const files = await getFilesFromUrls(urls);
      const pdfBlob = await generateDokumentasiPDF(values, title, files, villageSettings?.logoBase64);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal PDF", description: "Terjadi kesalahan sistem saat memproses gambar." });
    } finally {
      setIsGeneratingDok(null);
    }
  }

  const handleAskAI = async () => {
    const values = form.getValues();
    if (!values.title) {
      toast({ variant: "destructive", title: "Judul Kosong", description: "Isi nama kegiatan agar AI bisa menyusun notulen." });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const response = await generateNotulen({
        title: values.title,
        location: values.location || "Balai Kecamatan Gandrungmangu",
        date: values.date || format(new Date(), "yyyy-MM-dd"),
        time: values.time || "",
        notes: values.aiPromptNotes || "",
        activityType: values.activityType || "Internal",
      });

      if (response && response.notulen) {
        form.setValue("description", response.notulen, { shouldDirty: true, shouldValidate: true });
        
        // Selalu sinkronkan format WA dengan notulen yang baru saja dibuat oleh AI
        const finalWa = response.notulenWa || convertNotulenToWa({
          notulen: response.notulen,
          title: values.title,
          location: values.location || "Balai Kecamatan Gandrungmangu",
          date: values.date || format(new Date(), "yyyy-MM-dd"),
          time: values.time || "",
          notes: values.aiPromptNotes || "",
          officialName: values.officialName,
          activityType: values.activityType || "Internal",
        });

        form.setValue("notulenWa", finalWa, { shouldDirty: true, shouldValidate: true });
        toast({ title: "AI Berhasil", description: "Draf notulen & format WA telah diselaraskan." });
      }
    } catch (e: any) {
      console.error("Gagal AI Notulen:", e);
      toast({ 
        variant: "destructive", 
        title: "Gagal AI", 
        description: e?.message || "Layanan AI sedang sibuk. Silakan coba beberapa saat lagi." 
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }

  const handleGenerateWaTemplate = () => {
    const values = form.getValues();
    const template = convertNotulenToWa({
      notulen: values.description,
      title: values.title,
      location: values.location,
      date: values.date,
      time: values.time,
      notes: values.aiPromptNotes,
      officialName: values.officialName,
      activityType: values.activityType,
    });
    form.setValue("notulenWa", template, { shouldDirty: true, shouldValidate: true });
    toast({ title: "Format WA Diselaraskan", description: "Format laporan WhatsApp telah disesuaikan dengan isi notulen kegiatan." });
  }

  const handleCopyWa = () => {
    const text = form.getValues("notulenWa");
    if (!text) {
      toast({ variant: "destructive", title: "Teks Kosong", description: "Format pesan WA belum terisi." });
      return;
    }
    navigator.clipboard.writeText(text);
    setIsCopiedWa(true);
    toast({ title: "Tersalin!", description: "Format pesan WA berhasil disalin ke clipboard." });
    setTimeout(() => setIsCopiedWa(false), 2000);
  }

  const handleSendWa = () => {
    const text = form.getValues("notulenWa");
    if (!text) {
      toast({ variant: "destructive", title: "Teks Kosong", description: "Format pesan WA belum terisi." });
      return;
    }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  const handleAcuanFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Otomatis masukkan berkas ke list Upload Materi (tanpa batasan ukuran untuk arsip Drive)
    setSelectedMaterials(prev => {
      const exists = prev.some(f => f.name === file.name && f.size === file.size);
      if (exists) return prev;
      return [...prev, file];
    });

    setUploadedAcuanName(file.name);
    setIsAnalyzingAcuan(true);

    try {
      // Mengirim via FormData streaming agar browser tidak mengonversi ke base64 string di memori (bebas call stack overflow)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", form.getValues("title") || "");
      formData.append("location", form.getValues("location") || "");
      formData.append("date", form.getValues("date") || "");
      formData.append("time", form.getValues("time") || "");
      formData.append("activityType", form.getValues("activityType") || "Eksternal");

      const res = await fetch("/api/analyze-acuan", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal memproses berkas acuan.");
      }

      if (data.aiPromptNotes) {
        form.setValue("aiPromptNotes", data.aiPromptNotes, { shouldDirty: true, shouldValidate: true });
      }
      if (data.notulen) {
        form.setValue("description", data.notulen, { shouldDirty: true, shouldValidate: true });
      }
      if (data.notulenWa) {
        form.setValue("notulenWa", data.notulenWa, { shouldDirty: true, shouldValidate: true });
      }

      toast({
        title: "Berkas Berhasil Dibaca AI!",
        description: `Berkas "${file.name}" berhasil dibaca. Catatan acuan, Isi Notulen, dan Notulen WA telah otomatis terisi, serta berkas dilampirkan ke Upload Materi.`,
      });
    } catch (err: any) {
      console.error("Error analyze acuan:", err);
      toast({
        variant: "destructive",
        title: "Gagal Menganalisis Berkas",
        description: err?.message || "Terjadi kesalahan saat membaca berkas dengan AI.",
      });
    } finally {
      setIsAnalyzingAcuan(false);
      if (acuanFileInputRef.current) {
        acuanFileInputRef.current.value = "";
      }
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (cloudinaryUrls.kegiatan.length === 0) {
      toast({ variant: "destructive", title: "Foto Wajib", description: "Minimal upload 1 foto kegiatan ke Cloudinary." });
      return;
    }

    setIsUploading(true);

    try {
      // 1. Prepare materials & undangan
      const materialData = await Promise.all(selectedMaterials.map(f => fileToBase64(f)));
      const undanganData = selectedUndangan ? await fileToBase64(selectedUndangan) : null;

      // 2. Generate PDF Files for Notulen & BAST
      const notulenBlob = await generateNotulenPDF(values, villageSettings?.logoBase64);
      const notulenBase64 = await blobToBase64(notulenBlob);

      let bastBase64 = null;
      if (values.activityType === "Internal") {
        const bastBlob = await generateBASTPDF(values, villageSettings?.logoBase64);
        bastBase64 = await blobToBase64(bastBlob);
      }

      // 3. Generate Documentation PDFs from Cloudinary URLs
      let dokKegiatanBase64 = null;
      if (cloudinaryUrls.kegiatan.length > 0) {
        const files = await getFilesFromUrls(cloudinaryUrls.kegiatan);
        const blob = await generateDokumentasiPDF(values, "DOKUMENTASI KEGIATAN", files, villageSettings?.logoBase64);
        dokKegiatanBase64 = await blobToBase64(blob);
      }

      let dokAtkBase64 = null;
      if (watchActivityType === "Internal" && cloudinaryUrls.atk.length > 0) {
        const files = await getFilesFromUrls(cloudinaryUrls.atk);
        const blob = await generateDokumentasiPDF(values, "DOKUMENTASI ATK", files, villageSettings?.logoBase64);
        dokAtkBase64 = await blobToBase64(blob);
      }

      let dokKonsumsiBase64 = null;
      if (watchActivityType === "Internal" && cloudinaryUrls.konsumsi.length > 0) {
        const files = await getFilesFromUrls(cloudinaryUrls.konsumsi);
        const blob = await generateDokumentasiPDF(values, "DOKUMENTASI KONSUMSI", files, villageSettings?.logoBase64);
        dokKonsumsiBase64 = await blobToBase64(blob);
      }

      const targetFolderId = villageSettings?.kegiatanFolderId || GOOGLE_CONFIG.parentFolderId;

      const filesPayload: any = {
        photos: [],
        materials: materialData.filter(Boolean),
        undangan: undanganData,
        notulen: notulenBase64 ? { name: `Notulen_${values.title}.pdf`, type: 'application/pdf', base64: notulenBase64 } : null,
        bast: bastBase64 ? { name: `BAST_${values.title}.pdf`, type: 'application/pdf', base64: bastBase64 } : null,
        dokKegiatan: dokKegiatanBase64 ? { name: `Dokumentasi_Kegiatan.pdf`, type: 'application/pdf', base64: dokKegiatanBase64 } : null,
        dokAtk: dokAtkBase64 ? { name: `Dokumentasi_ATK.pdf`, type: 'application/pdf', base64: dokAtkBase64 } : null,
        dokKonsumsi: dokKonsumsiBase64 ? { name: `Dokumentasi_Konsumsi.pdf`, type: 'application/pdf', base64: dokKonsumsiBase64 } : null,
      };

      // 4. Save Everything to Google Drive via Apps Script
      let result = await callAppsScript({
        action: 'saveToDrive',
        folderName: `${values.title} | ${values.date} ${initialData ? '(UPDATED)' : ''}`,
        parentFolderId: targetFolderId,
        files: filesPayload
      });

      // Fallback: Jika Apps Script yang aktif di cloud belum dideploy dengan fungsi saveToDrive,
      // otomatis beralih mengunggah arsip berkas menggunakan aksi uploadArchiveFile yang sudah ada di Apps Script!
      if (!result?.success && result?.error && (result.error.includes("saveToDrive") || result.error.includes("Aksi tidak dikenal"))) {
        console.warn("saveToDrive belum tersedia di deployment Apps Script, beralih ke fallback uploadArchiveFile...");
        const fallbackUrls: Record<string, string> = {};

        const filesToUpload: { key: string; name: string; type: string; base64: string }[] = [];
        if (filesPayload.notulen?.base64) filesToUpload.push({ key: 'notulen', name: filesPayload.notulen.name, type: filesPayload.notulen.type, base64: filesPayload.notulen.base64 });
        if (filesPayload.bast?.base64) filesToUpload.push({ key: 'bast', name: filesPayload.bast.name, type: filesPayload.bast.type, base64: filesPayload.bast.base64 });
        if (filesPayload.dokKegiatan?.base64) filesToUpload.push({ key: 'dokKegiatan', name: filesPayload.dokKegiatan.name, type: filesPayload.dokKegiatan.type, base64: filesPayload.dokKegiatan.base64 });
        if (filesPayload.dokAtk?.base64) filesToUpload.push({ key: 'dokAtk', name: filesPayload.dokAtk.name, type: filesPayload.dokAtk.type, base64: filesPayload.dokAtk.base64 });
        if (filesPayload.dokKonsumsi?.base64) filesToUpload.push({ key: 'dokKonsumsi', name: filesPayload.dokKonsumsi.name, type: filesPayload.dokKonsumsi.type, base64: filesPayload.dokKonsumsi.base64 });
        if (filesPayload.undangan?.base64) filesToUpload.push({ key: 'undangan', name: filesPayload.undangan.name, type: filesPayload.undangan.type, base64: filesPayload.undangan.base64 });
        if (Array.isArray(filesPayload.materials)) {
          filesPayload.materials.forEach((mat: any, idx: number) => {
            if (mat?.base64) filesToUpload.push({ key: `materi_${idx + 1}`, name: mat.name, type: mat.type, base64: mat.base64 });
          });
        }

        for (const item of filesToUpload) {
          try {
            const upRes = await callAppsScript({
              action: 'uploadArchiveFile',
              folderId: targetFolderId,
              fileName: item.name,
              fileData: {
                type: item.type || 'application/pdf',
                base64: item.base64
              }
            });
            if (upRes?.success && upRes.fileUrl) {
              fallbackUrls[item.key] = upRes.fileUrl;
            }
          } catch (itemErr) {
            console.error(`Gagal upload fallback ${item.key}:`, itemErr);
          }
        }

        result = {
          success: true,
          folderId: targetFolderId,
          fileUrls: fallbackUrls
        };
      }

      if (!result?.success) throw new Error(result?.error || "Gagal simpan ke Drive");

      // 5. Save to Firestore (Village Root Collection)
      const docData = {
        ...values,
        updatedBy: user?.uid || "publik",
        uploadDate: initialData?.uploadDate || new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        driveFolderId: result.folderId || targetFolderId,
        driveUrls: result.fileUrls || {},
        cloudinaryUrls: cloudinaryUrls,
        imageUrls: [...cloudinaryUrls.kegiatan, ...cloudinaryUrls.atk, ...cloudinaryUrls.konsumsi]
      };

      if (initialData?.id) {
        if (!db) throw new Error("Database tidak siap");
        const docRef = doc(db, "kegiatans", initialData.id);
        updateDocumentNonBlocking(docRef, docData);
        toast({ title: "Laporan Diperbarui!", description: `Data Kecamatan telah diupdate dan dokumen PDF baru telah diunggah ke Drive.` });
      } else {
        if (db) {
          const kegiatanRef = collection(db, "kegiatans");
          addDocumentNonBlocking(kegiatanRef, docData);
        } else {
          await fetch('/api/kegiatan/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(docData),
          });
        }
        toast({ title: "Berhasil!", description: `Laporan masuk ke database Kecamatan & Seluruh dokumen PDF diarsipkan ke Drive.` });
      }

      form.reset();
      setCloudinaryUrls({ kegiatan: [], atk: [], konsumsi: [] });
      setSelectedMaterials([]); setSelectedUndangan(null);
      setUploadedAcuanName(null);
      onSuccess?.();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Mengirim", description: err.message });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4 w-full overflow-x-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {!initialData && (
          <TabsList className="grid grid-cols-2 w-full h-12 mb-4 bg-muted/50 p-1">
            <TabsTrigger value="agenda" className="gap-2 text-xs font-bold">
              <CalendarIcon className="h-4 w-4" />
              Agenda Kecamatan
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2 text-xs font-bold">
              <FileText className="h-4 w-4" />
              Isi Laporan
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="agenda" className="mt-0 space-y-4 w-full">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-end gap-2 p-4 border rounded-xl bg-card shadow-sm border-primary/20">
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Pilih Tanggal Agenda</label>
                <Input
                  type="date"
                  value={selectedCalendarDate}
                  onChange={(e) => setSelectedCalendarDate(e.target.value)}
                  className="h-12 text-base font-bold w-full"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSync(selectedCalendarDate)}
                disabled={isSyncing}
                className="h-12 w-12 flex items-center justify-center rounded-xl border border-primary/20 bg-white hover:bg-primary/5 transition-colors shrink-0"
              >
                <RefreshCw className={cn("h-5 w-5 text-primary", isSyncing && "animate-spin")} />
              </button>
            </div>

            <div className="space-y-2 w-full">
              <ScrollArea className="h-[350px] w-full border rounded-xl p-2 bg-muted/20">
                {isSyncing ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-[10px] text-muted-foreground">Menghubungkan...</p>
                  </div>
                ) : agendas.length > 0 ? (
                  <div className="space-y-3 w-full">
                    {agendas.map((agenda: AgendaItem) => {
                      const isInternal = agenda.description?.includes("JENIS: Internal");
                      const isExternal = agenda.description?.includes("JENIS: Eksternal");

                      return (
                        <button
                          key={agenda.id}
                          type="button"
                          onClick={() => handleSelectAgenda(agenda)}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-3 group shadow-sm",
                            isInternal ? "bg-amber-50/40 border-amber-200 hover:bg-amber-50 hover:border-amber-300" :
                              isExternal ? "bg-sky-50/30 border-sky-100 hover:bg-sky-50 hover:border-sky-300" :
                                "bg-white border-primary/10 hover:bg-primary/5 hover:border-primary/30"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "text-[7px] font-black uppercase px-1.5 py-0.5 rounded border",
                                isInternal ? "bg-amber-100 border-amber-200 text-amber-800" :
                                  isExternal ? "bg-sky-100 border-sky-200 text-sky-700" :
                                    "bg-slate-100 border-slate-200 text-slate-500"
                              )}>
                                {isInternal ? 'INTERNAL' : isExternal ? 'EKSTERNAL' : 'UMUM'}
                              </span>
                            </div>
                            <p className="text-sm font-bold leading-snug group-hover:text-primary whitespace-normal break-words">
                              {agenda.summary}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                              <p className="text-[9px] font-bold text-muted-foreground">
                                {agenda.start?.dateTime ? format(new Date(agenda.start.dateTime), "HH:mm") : '--:--'} WIB
                              </p>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-normal break-words font-medium">
                              {agenda.location || 'Lokasi belum diatur'}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center border-2 border-dashed rounded-xl border-muted/50">
                    <p className="text-xs text-muted-foreground">Tidak ada agenda pada tanggal ini.</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-0 w-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
              <FormField
                control={form.control}
                name="activityType"
                render={({ field }) => (
                  <FormItem className="space-y-3 p-4 border rounded-xl bg-primary/5 border-primary/20">
                    <FormLabel className="text-xs font-black text-primary uppercase tracking-widest">Jenis Kegiatan</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} value={field.value} className="flex gap-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="Internal" /></FormControl>
                          <FormLabel className="font-bold text-sm">Internal</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="Eksternal" /></FormControl>
                          <FormLabel className="font-bold text-sm">Eksternal</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Nama Kegiatan</FormLabel>
                    <FormControl><Input placeholder="Judul kegiatan..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="officialName"
                render={({ field }) => (
                  <FormItem className="animate-in fade-in slide-in-from-top-1">
                    <FormLabel className="text-xs font-bold uppercase">Pelaksana</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Pelaksana..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {filteredOfficials.map((o: any) => (
                            <SelectItem key={`${o.name}-${o.jabatan}`} value={`${o.name} - ${o.jabatan}`}>
                              {o.name} - {o.jabatan}
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Tanggal</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="time" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase flex items-center gap-2">
                      <Clock className="h-3 w-3" /> Jam
                    </FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Lokasi</FormLabel>
                    <FormControl><Input placeholder="Tempat..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField
                control={form.control}
                name="aiPromptNotes"
                render={({ field }) => (
                  <FormItem className="p-4 sm:p-5 border rounded-2xl bg-amber-50/40 border-amber-200/90 space-y-3 shadow-sm">
                    {/* Baris Judul & Tombol Upload */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FormLabel className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5 tracking-tight">
                          <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                          Prompt / Catatan Acuan AI (Opsional)
                        </FormLabel>
                        <span className="text-[10px] font-bold border border-amber-300 text-amber-900 bg-amber-100/80 rounded-full px-2.5 py-0.5 whitespace-nowrap shadow-2xs">
                          {watchActivityType === "Eksternal" ? "Acuan Notulen & WA" : "Acuan Rapat"}
                        </span>
                      </div>

                      <div className="flex items-center shrink-0">
                        <input
                          type="file"
                          ref={acuanFileInputRef}
                          className="hidden"
                          accept="image/*,.pdf,.ppt,.pptx,.doc,.docx"
                          onChange={handleAcuanFileUpload}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isAnalyzingAcuan}
                          onClick={() => acuanFileInputRef.current?.click()}
                          className="h-8 px-3 text-[11px] font-bold uppercase rounded-xl border-amber-300 bg-amber-100/90 hover:bg-amber-200/90 text-amber-950 shadow-sm gap-1.5 transition-all max-w-full"
                        >
                          {isAnalyzingAcuan ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700 shrink-0" />
                              <span className="truncate">Membaca Berkas...</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                              <span className="truncate">Upload Berkas (Foto / PDF / PPT)</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-800/80 leading-relaxed">
                      Tulis catatan rapat atau unggah berkas acuan (foto tulis tangan, PDF, materi PPT) untuk dibaca AI secara otomatis menjadi Notulen & Draf WA.
                    </p>

                    {/* Badge Berkas Aktif */}
                    {uploadedAcuanName && (
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-900 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="truncate font-medium text-[11px]">
                            Acuan Aktif: <strong className="font-bold text-emerald-950">{uploadedAcuanName}</strong>
                          </span>
                        </div>
                        <span className="text-[9px] font-extrabold uppercase bg-emerald-100/90 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-300/80 shrink-0">
                          Tersimpan di Upload Materi
                        </span>
                      </div>
                    )}

                    <FormControl>
                      <Textarea
                        placeholder="Contoh: Hadir Danramil 10 Gdm, Polsek/yg mewakili, Sekcam, Kades, Pengurus Karang Taruna. Rapat bahas persiapan Pordes Sepak Bola & Voli tgl 13-27 Sept di Desa Cinangsi..."
                        className="min-h-[90px] text-xs leading-relaxed bg-white border-amber-200 focus-visible:ring-amber-400 placeholder:text-muted-foreground/60 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-1">
                      <FormLabel className="text-xs font-bold uppercase">Isi Notulen</FormLabel>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <button type="button" className="flex h-7 items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 text-[10px] font-medium text-primary" onClick={handleAskAI} disabled={isGeneratingAI}>
                          {isGeneratingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Tanya AI
                        </button>
                        <button type="button" className="flex h-7 items-center gap-1 rounded-md border border-primary/30 px-2 text-[10px] font-medium text-primary" onClick={handlePreviewNotulen}>
                          <Printer className="h-3 w-3" /> PDF Notulen
                        </button>
                        {watchActivityType === "Internal" && (
                          <>
                            <button type="button" className="flex h-7 items-center gap-1 rounded-md border border-primary/30 px-2 text-[10px] font-medium text-primary" onClick={handlePreviewRA}>
                              <ListOrdered className="h-3 w-3" /> PDF RA
                            </button>
                            <button type="button" className="flex h-7 items-center gap-1 rounded-md border border-primary/30 px-2 text-[10px] font-medium text-primary" onClick={handlePreviewBAST}>
                              <FileCheck className="h-3 w-3" /> PDF BAST
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <FormControl>
                      <Textarea placeholder="Tulis ringkasan kegiatan..." className="h-32 text-sm leading-relaxed" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(watchActivityType === "Eksternal" || !!form.watch("notulenWa")) && (
                <Card className="border border-emerald-200/80 bg-gradient-to-b from-emerald-50/40 to-white rounded-3xl overflow-hidden shadow-sm">
                  <CardHeader className="p-4 sm:p-5 pb-3 border-b border-emerald-100 bg-emerald-50/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-black uppercase text-emerald-950 tracking-tight">
                            Notulen Kirim WA
                          </CardTitle>
                          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                            Format Laporan WhatsApp Resmi Siap Kirim
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateWaTemplate}
                          title="Sinkronkan format WA dari isi notulen saat ini"
                          className="h-8 px-2.5 text-[10px] font-bold uppercase rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 gap-1.5"
                        >
                          <RefreshCw className="h-3 w-3 text-emerald-600" />
                          Sinkronkan dari Notulen
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopyWa}
                          className="h-8 px-2.5 text-[10px] font-bold uppercase rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 gap-1.5"
                        >
                          {isCopiedWa ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-emerald-600" />}
                          {isCopiedWa ? "Tersalin" : "Salin Teks"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSendWa}
                          className="h-8 px-3 text-[10px] font-black uppercase rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5"
                        >
                          <Send className="h-3 w-3" />
                          Kirim WA
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-2.5">
                    <FormField
                      control={form.control}
                      name="notulenWa"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormControl>
                            <Textarea
                              placeholder="Format laporan WhatsApp akan tampil di sini..."
                              className="font-mono text-xs leading-relaxed min-h-[260px] bg-white border-emerald-200/80 focus-visible:ring-emerald-500 text-slate-800"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                      <span>Skema laporan Camat Gandrungmangu (DUMP).</span>
                      <span className="font-mono">{(form.watch("notulenWa") || "").length} karakter</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-8 p-6 bg-slate-50 border rounded-[2rem]">
                <div className="flex items-center gap-2">
                  <ImagePlus className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-black uppercase text-primary tracking-tight">Dokumentasi Foto</h4>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <ImageUploader
                      label={watchActivityType === "Internal" ? "1. Foto Utama Kegiatan" : "Foto Utama Kegiatan"}
                      onUploadComplete={(urls) => setCloudinaryUrls(prev => ({ ...prev, kegiatan: [...prev.kegiatan, ...urls] }))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-10 text-[10px] font-black uppercase gap-2 border-primary/20 hover:bg-primary/5 rounded-xl shadow-sm"
                      onClick={() => handlePreviewCategoryDok('kegiatan', cloudinaryUrls.kegiatan)}
                      disabled={cloudinaryUrls.kegiatan.length === 0 || !!isGeneratingDok}
                    >
                      {isGeneratingDok === 'kegiatan' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                      Buat Dokumen Kegiatan
                    </Button>
                  </div>

                  {watchActivityType === "Internal" && (
                    <>
                      <div className="space-y-3">
                        <ImageUploader
                          label="2. Foto ATK / Belanja"
                          onUploadComplete={(urls) => setCloudinaryUrls(prev => ({ ...prev, atk: [...prev.atk, ...urls] }))}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-10 text-[10px] font-black uppercase gap-2 border-primary/20 hover:bg-primary/5 rounded-xl shadow-sm"
                          onClick={() => handlePreviewCategoryDok('atk', cloudinaryUrls.atk)}
                          disabled={cloudinaryUrls.atk.length === 0 || !!isGeneratingDok}
                        >
                          {isGeneratingDok === 'atk' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                          Buat Dokumen ATK
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <ImageUploader
                          label="3. Foto Konsumsi / Makan"
                          onUploadComplete={(urls) => setCloudinaryUrls(prev => ({ ...prev, konsumsi: [...prev.konsumsi, ...urls] }))}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-10 text-[10px] font-black uppercase gap-2 border-primary/20 hover:bg-primary/5 rounded-xl shadow-sm"
                          onClick={() => handlePreviewCategoryDok('konsumsi', cloudinaryUrls.konsumsi)}
                          disabled={cloudinaryUrls.konsumsi.length === 0 || !!isGeneratingDok}
                        >
                          {isGeneratingDok === 'konsumsi' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                          Buat Dokumen KONSUMSI
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-100 my-6" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div onClick={() => undanganInputRef.current?.click()} className={cn("h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors", selectedUndangan ? "bg-primary/5 border-primary/50" : "bg-muted/30")}>
                    <input type="file" ref={undanganInputRef} className="hidden" accept=".pdf" onChange={(e) => setSelectedUndangan(e.target.files?.[0] || null)} />
                    {selectedUndangan ? <CheckCircle className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-[8px] font-black uppercase">Upload Undangan (PDF)</span>
                  </div>
                  {selectedUndangan && (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-100/80 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate font-medium text-slate-700">{selectedUndangan.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          ({(selectedUndangan.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUndangan(null);
                        }}
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                        title="Hapus undangan"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div onClick={() => materiInputRef.current?.click()} className={cn("h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors", selectedMaterials.length > 0 ? "bg-primary/5 border-primary/50" : "bg-muted/30")}>
                    <input
                      type="file"
                      ref={materiInputRef}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
                      multiple
                      onChange={(e) => {
                        const newFiles = Array.from(e.target.files || []);
                        setSelectedMaterials(prev => {
                          const existingNames = new Set(prev.map(f => f.name));
                          const uniqueNew = newFiles.filter(f => !existingNames.has(f.name));
                          return [...prev, ...uniqueNew];
                        });
                      }}
                    />
                    {selectedMaterials.length > 0 ? <CheckCircle className="h-4 w-4 text-primary" /> : <BookOpen className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-[8px] font-black uppercase">
                      Upload Materi {selectedMaterials.length > 0 ? `(${selectedMaterials.length} File)` : ""}
                    </span>
                  </div>

                  {selectedMaterials.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {selectedMaterials.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-100/80 border border-slate-200 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate font-medium text-slate-700">{file.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              ({(file.size / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMaterials(prev => prev.filter((_, i) => i !== idx));
                              if (uploadedAcuanName === file.name) {
                                setUploadedAcuanName(null);
                              }
                            }}
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                            title="Hapus berkas materi ini"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full h-14 text-base font-black uppercase shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" disabled={isUploading}>
                {isUploading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {initialData ? 'Memperbarui...' : 'Menyimpan ke Database Kecamatan...'}</> : initialData ? <><Save className="mr-2 h-5 w-5" /> Perbarui Laporan</> : <><Upload className="mr-2 h-5 w-5" /> Simpan ke Arsip Kecamatan</>}
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
