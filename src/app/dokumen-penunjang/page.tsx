"use client"

// Updated with Honor Kegiatan module
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Printer,
  ArrowLeft,
  Users,
  UserCheck,
  Wallet,
  Briefcase,
  Calendar,
  Loader2,
  ChevronRight,
  Database,
  Type,
  UserPlus,
  Percent,
  Coins,
  Clock,
  Banknote,
  ShieldCheck,
  Info,
  Stethoscope,
  Baby,
  Award,
  ReceiptText,
  Plus,
  Trash2,
  Store,
  ShoppingBag,
  RefreshCw
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useState, Suspense, useMemo, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { GOOGLE_CONFIG } from "@/lib/google-config"
import { callAppsScript } from "@/app/agenda/actions"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { BIDANG_NAMES, type ApbItem } from "@/lib/apbdes-data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { collection, doc, query, where, orderBy } from "firebase/firestore"
import { generateDaftarHadirPDF, generateUangSakuPDF, generateDaftarHadirPesertaPDF } from "@/lib/pdf-utils-v2"
import { generateHonorNarasumberPDF, generateInsentifPDF, generateSiltapPDF } from "@/lib/pdf-utils"
import { generateNotaDanFakturPDF, generateStrukBelanjaPDF, type TransactionItem } from "@/lib/pdf-transaction-docs"

// Define robust types for build safety
interface Participant {
  name: string;
  jabatan: string;
  category: string;
}

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

const configs = {
  "daftar-hadir": {
    title: "Daftar Hadir",
    desc: "Cetak daftar hadir rapat atau kegiatan umum Kecamatan.",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  "uang-saku": {
    title: "Uang Saku",
    desc: "Cetak tanda terima uang saku/transport peserta.",
    icon: Wallet,
    color: "text-teal-600",
    bgColor: "bg-teal-50"
  },
  "honor-narasumber": {
    title: "Honor Narasumber",
    desc: "Cetak tanda terima honorarium narasumber.",
    icon: UserPlus,
    color: "text-amber-600",
    bgColor: "bg-amber-50"
  },
  "bukti-transaksi": {
    title: "Cetak Bukti Transaksi",
    desc: "Cetak Nota Pesanan, Faktur Pengiriman & Struk Belanja Kasir.",
    icon: ReceiptText,
    color: "text-orange-600",
    bgColor: "bg-orange-50"
  }
}

/**
 * Utilitas Pengurutan Hierarkis untuk PDF
 */
const CATEGORY_ORDER = [
  "Karyawan Kecamatan",
  "SKRETARIS Kecamatan",
  "KEPALA Kecamatan",
  "Kader",
  "KPM",
  "Karang Taruna",
  "Linmas",
  "Pengurus BUMDes",
  "Pengurus KDMP",
  "Guru Ngaji",
  "Guru TK & Paud"
];

const getRankWeight = (jabatan: string) => {
  const j = jabatan.toUpperCase();
  if (j.includes("KEPALA Kecamatan")) return 1;
  if (j.includes("SEKRETARIS Kecamatan")) return 2;
  if (j.includes("KASI") || j.includes("KEPALA SEKSI")) return 3;
  if (j.includes("KAUR") || j.includes("KEPALA URUSAN")) return 4;
  if (j.includes("KASI KESRA") || j.includes("KADUS")) return 5;
  if (j.includes("STAF")) return 6;
  return 100;
};

const getRtRwWeight = (jabatan: string) => {
  const j = jabatan.toUpperCase();
  const rwMatch = j.match(/RW\s*(\d+)/);
  const rtMatch = j.match(/RT\s*(\d+)/);
  const rwNum = rwMatch ? parseInt(rwMatch[1]) : 0;
  const rtNum = rtMatch ? parseInt(rtMatch[1]) : 0;
  let weight = rwNum * 1000;
  if (j.includes("KETUA RW") && !j.includes("RT")) {
    weight += 0;
  } else {
    weight += rtNum;
  }
  return weight;
};

const getKaderWeight = (jabatan: string) => {
  const j = jabatan.toUpperCase();
  const match = j.match(/(?:WIWIT RAHAYU|LESTARI|RAHAYU)\s*(\d+)/i) || j.match(/(\d+)/);
  return match ? parseInt(match[1]) : 999;
};

const sortParticipants = (list: any[]) => {
  return list.sort((a, b) => {
    const catA = a.category;
    const catB = b.category;

    if (catA !== catB) {
      return CATEGORY_ORDER.indexOf(catA) - CATEGORY_ORDER.indexOf(catB);
    }

    if (catA === "Karyawan Kecamatan") {
      return getRankWeight(a.jabatan) - getRankWeight(b.jabatan);
    } else if (catA === "KEPALA Kecamatan") {
      return getRtRwWeight(a.jabatan) - getRtRwWeight(b.jabatan);
    } else if (catA === "Kader") {
      return getKaderWeight(a.jabatan) - getKaderWeight(b.jabatan);
    }

    return a.name.localeCompare(b.name);
  });
};

function DokumenContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get("type")
  const current = type ? configs[type as keyof typeof configs] : null
  const { toast } = useToast()
  const { user } = useUser()
  const db = useFirestore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Sub tab state for posyandu
  const [posyanduSubType, setPosyanduSubType] = useState<"kader" | "peserta">("kader")

  // FETCH APBDes Data from Firestore (Unified Source)
  const apbRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "apbdes"), orderBy("kode", "asc"))
  }, [db, user])
  const { data: currentApbData, isLoading: isApbLoading } = useCollection<any>(apbRef)

  // Mengambil data personil dari Firestore
  const personnelRef = useMemoFirebase(() => (db && user) ? collection(db, "personnel") : null, [db, user])
  const { data: dbOfficials } = useCollection(personnelRef)

  // GLOBAL CONFIG: Ambil Logo dari Pengaturan Kecamatan
  const villageSettingsRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "settings", "village")
  }, [db, user])
  const { data: villageSettings } = useDoc(villageSettingsRef)

  const [useApbdes, setUseApbdes] = useState(true)
  const [selectedYear, setSelectedYear] = useState("2026")
  const [bidang, setBidang] = useState("")
  const [sumber, setSumber] = useState("")
  const [kegiatan, setKegiatan] = useState("")
  const [manualTitle, setManualTitle] = useState("")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [location, setLocation] = useState("Balai Kecamatan Gandrungmangu")
  const [time, setTime] = useState("09:00 WIB")

  // Agenda states
  const [selectedAgendaDate, setSelectedAgendaDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [agendaList, setAgendaList] = useState<any[]>([])
  const [isAgendaLoading, setIsAgendaLoading] = useState(false)

  const fetchAgendas = useCallback(async (targetDate: string) => {
    setIsAgendaLoading(true)
    try {
      const calendarId = villageSettings?.googleCalendarId || GOOGLE_CONFIG.calendarId;
      const res = await callAppsScript({
        action: 'getCalendar',
        date: targetDate,
        calendarId: calendarId
      });

      if (res.success && res.items) {
        setAgendaList(res.items);
      } else {
        setAgendaList([]);
      }
    } catch (err) {
      console.error("Fetch Agenda Error:", err);
      setAgendaList([]);
    } finally {
      setIsAgendaLoading(false);
    }
  }, [villageSettings]);

  useEffect(() => {
    if (useApbdes && selectedAgendaDate) {
      fetchAgendas(selectedAgendaDate);
    }
  }, [useApbdes, selectedAgendaDate, fetchAgendas]);

  const internalAgendaList = useMemo(() => {
    return (agendaList || []).filter((item: any) => {
      const desc = item.description || "";
      const summary = item.summary || "";

      // Jangan tampilkan jika terindikasi kegiatan eksternal
      if (
        desc.includes("JENIS: Eksternal") ||
        desc.toLowerCase().includes("eksternal") ||
        summary.toLowerCase().includes("eksternal")
      ) {
        return false;
      }

      // Khusus kegiatan internal saja (memiliki penanda JENIS: Internal atau kata kunci internal)
      return (
        desc.includes("JENIS: Internal") ||
        desc.toLowerCase().includes("internal") ||
        summary.toLowerCase().includes("internal")
      );
    });
  }, [agendaList]);

  const handleSelectAgendaItem = (agenda: any) => {
    const cleanTitle = (agenda.summary || "").replace(/^Kegiatan\s*:\s*/i, "").trim();
    setKegiatan(cleanTitle);

    // Otomatis sesuaikan Tanggal & Waktu
    let eventDate = selectedAgendaDate;
    if (agenda.start?.dateTime) {
      const startDate = new Date(agenda.start.dateTime);
      eventDate = format(startDate, "yyyy-MM-dd");
      setDate(eventDate);
      setTime(`${format(startDate, "HH:mm")} WIB`);
    } else if (agenda.start?.date) {
      eventDate = agenda.start.date;
      setDate(eventDate);
      setTime("09:00 WIB");
    } else {
      setDate(selectedAgendaDate);
      setTime("09:00 WIB");
    }

    // Otomatis sesuaikan Lokasi
    if (agenda.location && agenda.location.trim() !== "") {
      setLocation(agenda.location.trim());
    } else {
      setLocation("Balai Kecamatan Gandrungmangu");
    }

    toast({
      title: "Kegiatan Internal Dipilih",
      description: `${cleanTitle} (Tanggal, Waktu & Lokasi otomatis disesuaikan)`,
    });
  };

  const [jumlahOrang, setJumlahOrang] = useState<number>(15)
  const [jumlahKuotaPeserta, setJumlahKuotaPeserta] = useState<number>(30)
  const [participantSelections, setParticipantSelections] = useState(Array(6).fill("none"));

  const [uangSakuNominal, setUangSakuNominal] = useState("100000")
  const [uangSakuTax, setUangSakuTax] = useState("5")

  const [numNarsum, setNumNarsum] = useState<number>(1)
  const [narsumData, setNarsumData] = useState(
    Array(4).fill(null).map(() => ({ name: "", position: "", nominal: "", tax: "0" }))
  )

  // Honor Kegiatan States
  const HONOR_KEGIATAN_CATEGORIES = [
    "Honorarium Protokoler",
    "Honorarium Kebersihan",
    "Honorarium Petugas Registrasi",
    "Honorarium Tim Pelaksana Kegiatan",
    "Honorarium Operator",
    "Input Manual"
  ]

  const [honorKegiatanCat, setHonorKegiatanCat] = useState("Honorarium Protokoler")
  const [manualHonorCat, setManualHonorCat] = useState("")
  const [numHonorKegiatan, setNumHonorKegiatan] = useState<number>(1)
  const [honorKegiatanData, setHonorKegiatanData] = useState(
    Array(20).fill(null).map(() => ({ name: "", position: "Protokoler / MC", nominal: "", tax: "0" }))
  )
  const [batchHonorNominal, setBatchHonorNominal] = useState("")
  const [batchHonorTax, setBatchHonorTax] = useState("0")

  const [insentifCat, setInsentifCat] = useState("KEPALA Kecamatan")
  const [insentifMonth, setInsentifMonth] = useState("Januari")
  const [insentifNominal, setInsentifNominal] = useState("0")
  const [insentifTax, setInsentifTax] = useState("0")

  const [siltapSubType, setSiltapSubType] = useState<"Karyawan" | "SKRETARIS Kecamatan">("Karyawan")

  // Posyandu States
  const [selectedLestari, setSelectedLestari] = useState("")
  const [selectedHealthCategory, setSelectedHealthCategory] = useState("Balita")

  // Fetch actual health records data based on selection
  const healthDataQuery = useMemoFirebase(() => {
    if (!db || !user || type !== "daftar-hadir-posyandu" || posyanduSubType !== "peserta" || !selectedHealthCategory) return null;

    const colRef = collection(db, "health_records");
    if (selectedLestari && selectedLestari !== "SEMUA POSYANDU") {
      return query(colRef, where("category", "==", selectedHealthCategory), where("posyandu", "==", selectedLestari));
    }
    return query(colRef, where("category", "==", selectedHealthCategory));
  }, [db, user, type, posyanduSubType, selectedHealthCategory, selectedLestari]);
  const { data: healthRecords } = useCollection(healthDataQuery);

  // Bukti Transaksi States
  const [buktiTab, setBuktiTab] = useState<"nota-faktur" | "struk-belanja">("nota-faktur");

  // Tab 1: Nota & Faktur Pengiriman
  const [notaDate, setNotaDate] = useState("");
  const [notaKaryawanNama, setNotaKaryawanNama] = useState("");
  const [notaKaryawanJabatan, setNotaKaryawanJabatan] = useState("");
  const [notaKepalaKecamatan, setNotaKepalaKecamatan] = useState("ASMARUL FUADI");
  const [notaNamaToko, setNotaNamaToko] = useState("");
  const [notaNamaPemilik, setNotaNamaPemilik] = useState("");
  const [notaAlamatToko, setNotaAlamatToko] = useState("GANDRUNGMANGU");
  const [notaNoTelp, setNotaNoTelp] = useState("");
  const [notaNoNota, setNotaNoNota] = useState("");
  const [notaNoFaktur, setNotaNoFaktur] = useState("");
  const [notaItems, setNotaItems] = useState<TransactionItem[]>([
    { jenisBarang: "", banyaknya: 1, satuan: "buah", hargaSatuan: "", jumlah: "" },
  ]);

  // Tab 2: Struk Belanja
  const [strukDate, setStrukDate] = useState("");
  const [strukJam, setStrukJam] = useState("14");
  const [strukMenit, setStrukMenit] = useState("30");
  const [strukDetik, setStrukDetik] = useState("00");
  const [strukNamaToko, setStrukNamaToko] = useState("");
  const [strukAlamatToko, setStrukAlamatToko] = useState("Jl. Slamet Riyadi No. 60, Kecamatan Gandrungmangu");
  const [strukNoTelp, setStrukNoTelp] = useState("");
  const [strukKasir, setStrukKasir] = useState("KASIR 01");
  const [strukNoRef, setStrukNoRef] = useState("");
  const [strukBayarTunai, setStrukBayarTunai] = useState("");
  const [strukItems, setStrukItems] = useState<TransactionItem[]>([
    { jenisBarang: "", banyaknya: 1, satuan: "Pcs", hargaSatuan: "", jumlah: "" },
  ]);

  useEffect(() => {
    setMounted(true)
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
    setNotaDate(today)
    setStrukDate(today)

    // Auto switch to manual mode for posyandu & bukti-transaksi
    if (type === "daftar-hadir-posyandu" || type === "bukti-transaksi") {
      setUseApbdes(false)
    }
  }, [type])

  const LestariGroups = useMemo(() => {
    if (!dbOfficials) return [];
    const kaders = dbOfficials.filter(o => o.category === "Kader");
    const groups = new Set<string>();
    kaders.forEach(k => {
      const job = k.jabatan?.toUpperCase() || "";
      // Cari pola "Wiwit Rahayu [Angka]" atau "Lestari [Angka]"
      const matchSari = job.match(/SARI\s+RAHAYU\s*(\d+)?/i);
      const matchLestari = job.match(/LESTARI\s*(\d+)?/i);

      if (matchSari) groups.add(matchSari[0].trim());
      else if (matchLestari) groups.add(matchLestari[0].trim());
      else if (job.includes("WIWIT RAHAYU")) groups.add("WIWIT RAHAYU");
      else if (job.includes("LESTARI")) groups.add("LESTARI");
    });

    const result = Array.from(groups).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.match(/\d+/)?.[0] || "0");
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
    return ["SEMUA POSYANDU", ...result];
  }, [dbOfficials]);

  const handleParticipantSelectionChange = (index: number, value: string) => {
    const newSelections = [...participantSelections];
    newSelections[index] = value;
    setParticipantSelections(newSelections);
  };

  const participantCategories = useMemo(() =>
    Array.from(new Set((dbOfficials || []).map(o => o.category).filter(c => c && c.trim() !== '')))
    , [dbOfficials]);

  const filteredSources = useMemo(() => {
    if (!bidang || !currentApbData) return []
    const sources = currentApbData
      .filter((item: any) => String(item.bidang) === String(bidang) && item.tahun === selectedYear)
      .map((item: any) => String(item.sumber || "").trim())
      .filter(s => s !== "");
    return Array.from(new Set(sources))
  }, [bidang, selectedYear, currentApbData])

  const filteredActivities = useMemo(() => {
    if (!bidang || !sumber || !currentApbData) return []
    return currentApbData.filter((item: any) =>
      String(item.bidang) === String(bidang) &&
      item.tahun === selectedYear &&
      String(item.sumber || "").trim() === String(sumber).trim()
    )
  }, [bidang, sumber, selectedYear, currentApbData])

  const handlePrint = async () => {
    setIsGenerating(true)
    try {
      const finalTitle = (type === "daftar-hadir-posyandu" || !useApbdes) ? manualTitle : kegiatan;

      let pdfBlob;

      if (type === "daftar-hadir" || type === "uang-saku") {
        if (!finalTitle) throw new Error("Judul kegiatan harus diisi")
        const quota = jumlahOrang || 1;
        const selectedCats = participantSelections.filter(cat => cat && cat !== "none");
        let allParticipants: any[] = [];

        selectedCats.forEach(cat => {
          const members = (dbOfficials || []).filter(o => o.category === cat).map(o => ({
            name: String(o.name || ""),
            jabatan: String(o.jabatan || ""),
            category: String(o.category || "")
          }));
          allParticipants.push(...members);
        });

        const sorted = sortParticipants(allParticipants);
        const uniqueParticipants = Array.from(new Map(sorted.map(item => [item.name, item])).values());
        const finalParticipants = Array.from({ length: quota }, (_, i) =>
          uniqueParticipants[i] || { name: "", jabatan: "", category: "" }
        );

        const pdfData = {
          kegiatan: finalTitle,
          tanggal: date,
          participants: finalParticipants,
          nominal: uangSakuNominal,
          tax: uangSakuTax,
          location,
          time
        };

        if (type === "daftar-hadir") {
          pdfBlob = await generateDaftarHadirPDF(pdfData, villageSettings?.logoBase64);
        } else {
          pdfBlob = await generateUangSakuPDF(pdfData, villageSettings?.logoBase64);
        }
      }
      else if (type === "daftar-hadir-posyandu") {
        if (!finalTitle) throw new Error("Judul kegiatan harus diisi")
        if (!selectedLestari) throw new Error("Pilih Kelompok Posyandu")

        const isAll = selectedLestari === "SEMUA POSYANDU";
        const displayLestari = isAll ? "LESTARI" : selectedLestari;
        const reportTitle = isAll ? "DAFTAR HADIR POSYANDU" : `DAFTAR HADIR POSYANDU ${displayLestari}`;

        if (posyanduSubType === "kader") {
          const kaders = (dbOfficials || []).filter(o => o.category === "Kader" && (isAll || o.jabatan?.toUpperCase().includes(selectedLestari)));
          const quota = Math.max(kaders.length, 10);
          const sortedKaders = sortParticipants(kaders);
          const finalParticipants = Array.from({ length: quota }, (_, i) =>
            sortedKaders[i] ? { name: sortedKaders[i].name, jabatan: sortedKaders[i].jabatan, category: "Kader" } : { name: "", jabatan: "", category: "" }
          );
          const pdfData = {
            kegiatan: finalTitle,
            tanggal: date,
            participants: finalParticipants,
            mainTitle: reportTitle,
            location,
            time
          };
          pdfBlob = await generateDaftarHadirPDF(pdfData, villageSettings?.logoBase64);
        } else {
          const mappedParticipants = (healthRecords || []).map(r => ({
            name: r.name,
            jabatan: r.address,
            category: r.category
          }));
          mappedParticipants.sort((a, b) => a.name.localeCompare(b.name));
          const pdfData = {
            kegiatan: finalTitle,
            tanggal: date,
            participants: mappedParticipants,
            quota: Math.max(mappedParticipants.length, jumlahKuotaPeserta),
            mainTitle: isAll ? `DAFTAR HADIR ${selectedHealthCategory.toUpperCase()} POSYANDU` : `DAFTAR HADIR ${selectedHealthCategory.toUpperCase()} POSYANDU ${displayLestari}`,
            location,
            time
          };
          pdfBlob = await generateDaftarHadirPesertaPDF(pdfData, villageSettings?.logoBase64);
        }
      }
      else if (type === "honor-narasumber") {
        if (!finalTitle) throw new Error("Nama kegiatan harus diisi")
        const activeNarsum = narsumData.slice(0, numNarsum)
        pdfBlob = await generateHonorNarasumberPDF({ title: finalTitle, date, location, time, narsum: activeNarsum }, villageSettings?.logoBase64)
      }
      else if (type === "honor-kegiatan") {
        if (!finalTitle) throw new Error("Nama kegiatan harus diisi")
        const activeHonor = honorKegiatanData.slice(0, numHonorKegiatan)
        let categoryTitle = honorKegiatanCat === "Input Manual"
          ? (manualHonorCat.trim() || "HONORARIUM KEGIATAN")
          : honorKegiatanCat

        let formattedHeading = categoryTitle.toUpperCase()
        if (!formattedHeading.startsWith("TANDA TERIMA")) {
          formattedHeading = `TANDA TERIMA ${formattedHeading}`
        }

        pdfBlob = await generateHonorNarasumberPDF({
          docTitle: formattedHeading,
          title: finalTitle,
          date,
          location,
          time,
          narsum: activeHonor
        }, villageSettings?.logoBase64)
      }
      else if (type === "bukti-transaksi") {
        if (buktiTab === "nota-faktur") {
          if (!notaNamaToko.trim()) throw new Error("Nama toko / penyedia barang harus diisi")
          if (!notaKaryawanNama.trim()) throw new Error("Pilih Karyawan / pelaksana yang membidangi")
          const valid = notaItems.filter(it => it.jenisBarang && it.jenisBarang.trim() !== "")
          if (valid.length === 0) throw new Error("Tambahkan minimal 1 barang pada nota")

          pdfBlob = await generateNotaDanFakturPDF({
            tanggal: notaDate,
            namaToko: notaNamaToko,
            namaPemilik: notaNamaPemilik,
            alamatToko: notaAlamatToko,
            noTeleponToko: notaNoTelp,
            KaryawanNama: notaKaryawanNama,
            KaryawanJabatan: notaKaryawanJabatan,
            kepalaKecamatanNama: notaKepalaKecamatan || "ASMARUL FUADI",
            noNota: notaNoNota,
            noFaktur: notaNoFaktur,
            items: notaItems
          }, villageSettings?.logoBase64)
        } else {
          if (!strukNamaToko.trim()) throw new Error("Nama toko / merchant harus diisi")
          const valid = strukItems.filter(it => it.jenisBarang && it.jenisBarang.trim() !== "")
          if (valid.length === 0) throw new Error("Tambahkan minimal 1 barang belanjaan pada struk")

          pdfBlob = await generateStrukBelanjaPDF({
            tanggal: strukDate,
            jam: strukJam,
            menit: strukMenit,
            detik: strukDetik,
            namaToko: strukNamaToko,
            alamatToko: strukAlamatToko,
            noTelepon: strukNoTelp,
            namaKasir: strukKasir,
            noStruk: strukNoRef,
            bayarTunai: strukBayarTunai,
            items: strukItems
          })
        }
      }
      else if (type === "insentif") {
        let insentifParticipants: { name: string; position: string; category: string }[] = []
        const categoryMap = {
          "KEPALA Kecamatan": "KEPALA Kecamatan",
          "KADER POSYANDU": "Kader",
          "GURU PAUD": "Guru TK & Paud",
          "KADER KPM": "KPM",
          "HONORARIUM LINMAS": "Linmas"
        };
        const selectedCategory = (categoryMap as any)[insentifCat];
        if (selectedCategory) {
          const rawMembers = (dbOfficials || []).filter(o => o.category === selectedCategory).map(o => ({
            name: String(o.name || ""),
            position: String(o.jabatan || ""),
            category: String(o.category || ""),
            jabatan: String(o.jabatan || "")
          }));
          const sorted = sortParticipants(rawMembers);
          insentifParticipants = sorted.map(s => ({ name: s.name, position: s.position, category: s.category }));
        }

        pdfBlob = await generateInsentifPDF({
          category: insentifCat,
          month: insentifMonth,
          date: date,
          nominal: insentifNominal,
          tax: insentifTax,
          participants: insentifParticipants,
          jumlahOrang: insentifParticipants.length
        }, villageSettings?.logoBase64)
      }
      else if (type === "siltap") {
        let dataToPrint = [];
        if (siltapSubType === "Karyawan") {
          dataToPrint = (dbOfficials || [])
            .filter(o => o.category === "Karyawan Kecamatan")
            .map(o => {
              let nominal = 0;
              const job = (o.jabatan || "").toUpperCase();
              if (job.includes("KEPALA Kecamatan")) nominal = 4000000;
              else if (job.includes("SEKRETARIS Kecamatan")) nominal = 3000000;
              else if (job.includes("KAUR KEUANGAN")) nominal = 2400000;
              else if (job.includes("KAUR UMUM") || job.includes("KAUR UMUM ADD")) nominal = 2400000;
              else if (job.includes("KASI PEMERINTAHAN")) nominal = 2400000;
              else if (job.includes("KASI KESEJAHTERAAN")) nominal = 2400000;
              else if (job.includes("KASI PELAYANAN")) nominal = 2400000;
              else if (job.includes("KASI KESRA")) nominal = 2200000;
              else if (job.includes("STAF")) nominal = 2050000;
              else nominal = 0;
              return { name: o.name, jabatan: o.jabatan, nominal: nominal, category: o.category };
            });
          dataToPrint = sortParticipants(dataToPrint);
        } else {
          dataToPrint = (dbOfficials || [])
            .filter(o => o.category === "SKRETARIS Kecamatan")
            .map(o => {
              let nominal = 0;
              const job = (o.jabatan || "").toUpperCase();
              if (job.includes("KETUA") && !job.includes("WAKIL")) nominal = 550000;
              else if (job.includes("WAKIL KETUA")) nominal = 450000;
              else if (job.includes("SEKRETARIS")) nominal = 400000;
              else nominal = 350000;
              return { name: o.name, jabatan: o.jabatan, nominal: nominal, category: o.category };
            });
          dataToPrint.sort((a, b) => b.nominal - a.nominal || a.name.localeCompare(b.name));
        }
        pdfBlob = await generateSiltapPDF({
          month: insentifMonth,
          date,
          title: siltapSubType === "Karyawan" ? "TANDA TERIMA SILTAP" : "TANDA TERIMA INSENTIF SKRETARIS Kecamatan",
          data: dataToPrint
        }, villageSettings?.logoBase64)
      }

      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob)
        window.open(url, "_blank")
        toast({ title: "Berhasil", description: "Dokumen siap dicetak." })
      } else {
        throw new Error("Gagal menghasilkan PDF.")
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Cetak", description: e.message || "Terjadi kesalahan sistem." })
    } finally {
      setIsGenerating(false)
    }
  }

  const updateNarsumData = (index: number, field: string, value: string) => {
    const newData = [...narsumData]
    newData[index] = { ...newData[index], [field]: value }
    setNarsumData(newData)
  }

  const getDefaultJob = (cat: string) => {
    switch (cat) {
      case "Honorarium Protokoler": return "Protokoler / MC";
      case "Honorarium Kebersihan": return "Petugas Kebersihan";
      case "Honorarium Petugas Registrasi": return "Petugas Registrasi";
      case "Honorarium Tim Pelaksana Kegiatan": return "Tim Pelaksana Kegiatan";
      case "Honorarium Operator": return "Operator / IT";
      default: return "Petugas Kegiatan";
    }
  }

  const handleSelectHonorCat = (cat: string) => {
    setHonorKegiatanCat(cat)
    const defaultPos = getDefaultJob(cat)
    setHonorKegiatanData(prev => prev.map(item => ({
      ...item,
      position: item.position === "" || [
        "Protokoler / MC",
        "Petugas Kebersihan",
        "Petugas Registrasi",
        "Tim Pelaksana Kegiatan",
        "Operator / IT",
        "Petugas Kegiatan"
      ].includes(item.position) ? defaultPos : item.position
    })))
  }

  const updateHonorKegiatanData = (index: number, field: string, value: string) => {
    const newData = [...honorKegiatanData]
    newData[index] = { ...newData[index], [field]: value }
    setHonorKegiatanData(newData)
  }

  const applyBatchHonor = () => {
    if (!batchHonorNominal) {
      toast({ variant: "destructive", title: "Nominal Kosong", description: "Masukkan nominal honor terlebih dahulu." })
      return
    }
    setHonorKegiatanData(prev => prev.map(item => ({
      ...item,
      nominal: batchHonorNominal,
      tax: batchHonorTax
    })))
    toast({ title: "Berhasil", description: `Nominal Rp ${parseInt(batchHonorNominal || "0").toLocaleString('id-ID')} & Pajak ${batchHonorTax}% diterapkan ke semua penerima.` })
  }

  const handleNotaItemChange = (index: number, field: keyof TransactionItem, value: any) => {
    setNotaItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };
      if (field === "banyaknya" || field === "hargaSatuan") {
        const qty = parseFloat(String(field === "banyaknya" ? value : current.banyaknya)) || 0;
        const price = parseFloat(String(field === "hargaSatuan" ? value : current.hargaSatuan).replace(/\D/g, "")) || 0;
        current.jumlah = qty * price;
      }
      updated[index] = current;
      return updated;
    });
  };

  const addNotaItem = () => {
    setNotaItems((prev) => [
      ...prev,
      { jenisBarang: "", banyaknya: 1, satuan: "Pcs", hargaSatuan: "", jumlah: "" },
    ]);
  };

  const removeNotaItem = (index: number) => {
    setNotaItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleStrukItemChange = (index: number, field: keyof TransactionItem, value: any) => {
    setStrukItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };
      if (field === "banyaknya" || field === "hargaSatuan") {
        const qty = parseFloat(String(field === "banyaknya" ? value : current.banyaknya)) || 0;
        const price = parseFloat(String(field === "hargaSatuan" ? value : current.hargaSatuan).replace(/\D/g, "")) || 0;
        current.jumlah = qty * price;
      }
      updated[index] = current;
      return updated;
    });
  };

  const addStrukItem = () => {
    setStrukItems((prev) => [
      ...prev,
      { jenisBarang: "", banyaknya: 1, satuan: "Pcs", hargaSatuan: "", jumlah: "" },
    ]);
  };

  const removeStrukItem = (index: number) => {
    setStrukItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const setCurrentTimeForStruk = () => {
    const now = new Date();
    setStrukJam(String(now.getHours()).padStart(2, "0"));
    setStrukMenit(String(now.getMinutes()).padStart(2, "0"));
    setStrukDetik(String(now.getSeconds()).padStart(2, "0"));
    toast({ title: "Waktu Disetel", description: "Jam, menit, detik telah diisi dengan waktu saat ini." });
  };

  if (!mounted) return null

  if (!current) {
    return (
      <div className="flex flex-col gap-8 p-4 md:p-10 max-w-5xl mx-auto">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-tight">Pusat Dokumen</h1>
          <p className="text-muted-foreground font-medium">Pilih jenis berkas administrasi yang ingin Anda cetak.</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-4">
          {Object.entries(configs).map(([key, item]) => (
            <Link key={key} href={`/dokumen-penunjang/?type=${key}`}>
              <Card className="border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group active:scale-95 h-full flex flex-col rounded-xl md:rounded-2xl overflow-hidden bg-white">
                <CardHeader className={cn("p-3.5 md:p-6 rounded-t-xl md:rounded-t-2xl flex flex-col items-center text-center sm:items-start sm:text-left", item.bgColor)}>
                  <item.icon className={cn("h-8 w-8 md:h-12 md:w-12 mb-1.5 md:mb-2 transition-transform group-hover:scale-110 shrink-0", item.color)} />
                  <CardTitle className="text-xs md:text-lg font-bold uppercase leading-snug line-clamp-2">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-6 flex-1 flex flex-col justify-between gap-2 md:gap-4">
                  <p className="text-[9px] md:text-xs text-muted-foreground font-medium leading-relaxed line-clamp-2 hidden sm:block">{item.desc}</p>
                  <div className="flex items-center justify-center sm:justify-start text-[8px] md:text-[10px] font-black uppercase text-primary tracking-wider group-hover:gap-2 transition-all pt-1 border-t border-slate-100 sm:border-0">
                    <span>Pilih Berkas</span> <ChevronRight className="h-3 w-3 ml-0.5 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-3xl mx-auto">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full h-12 w-12 hover:bg-muted">
          <Link href="/dokumen-penunjang/">
            <ArrowLeft className="h-6 w-6 text-primary" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Formulir Cetak</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase">{current.title}</p>
        </div>
      </header>

      <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden mb-20">
        <CardHeader className={cn("p-8", current.bgColor)}>
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <current.icon className={cn("h-8 w-8", current.color)} />
            </div>
            <div>
              <CardTitle className="text-xl font-bold uppercase leading-none mb-1">{current.title}</CardTitle>
              <CardDescription className="text-xs font-medium opacity-70">{current.desc}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">

          {type === "insentif" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Pilih Kelompok Penerima</Label>
                <div className="grid grid-cols-2 gap-4">
                  {["KEPALA Kecamatan", "KADER POSYANDU", "GURU PAUD", "KADER KPM", "HONORARIUM LINMAS"].map((cat) => (
                    <Button
                      key={cat}
                      type="button"
                      onClick={() => setInsentifCat(cat)}
                      className={cn(
                        "h-14 rounded-2xl font-black text-[10px] uppercase transition-all border-2",
                        insentifCat === cat
                          ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200"
                          : "bg-white border-muted text-purple-900 hover:bg-purple-50 hover:border-purple-200"
                      )}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Insentif Bulan</Label>
                  <Select value={insentifMonth} onValueChange={setInsentifMonth}>
                    <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-none px-5 text-base font-bold">
                      <SelectValue placeholder="Pilih Bulan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(m => (
                        <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Tgl Penyaluran</Label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-600/50" />
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-muted/20 border-none font-bold text-base"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-purple-50/50 rounded-[2.5rem] border border-purple-100 shadow-inner grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-purple-900 tracking-widest ml-1">Nominal Insentif (RP)</Label>
                  <div className="relative">
                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-600" />
                    <Input
                      type="number"
                      placeholder="0"
                      value={insentifNominal}
                      onChange={(e) => setInsentifNominal(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-white border-none font-black text-purple-900 text-lg shadow-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-purple-900 tracking-widest ml-1">Pot Pajak (%)</Label>
                  <div className="relative">
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-600" />
                    <Input
                      type="number"
                      placeholder="0"
                      value={insentifTax}
                      onChange={(e) => setInsentifTax(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-white border-none font-black text-purple-900 text-lg shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === "siltap" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Pilih Jenis Pembayaran</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    type="button"
                    onClick={() => setSiltapSubType("Karyawan")}
                    className={cn(
                      "h-16 rounded-2xl font-black text-xs uppercase gap-3 transition-all",
                      siltapSubType === "Karyawan" ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary border-2 border-transparent"
                    )}
                  >
                    <Users className="h-5 w-5" /> SILTAP Karyawan
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setSiltapSubType("SKRETARIS Kecamatan")}
                    className={cn(
                      "h-16 rounded-2xl font-black text-xs uppercase gap-3 transition-all",
                      siltapSubType === "SKRETARIS Kecamatan" ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary border-2 border-transparent"
                    )}
                  >
                    <ShieldCheck className="h-5 w-5" /> INSENTIF SKRETARIS Kecamatan
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Pilih Bulan / Tunjangan</Label>
                  <Select value={insentifMonth} onValueChange={setInsentifMonth}>
                    <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-none px-5 text-base font-bold">
                      <SelectValue placeholder="Pilih Bulan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(m => (
                        <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Tgl Cetak</Label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-muted/20 border-none font-bold text-base"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === "daftar-hadir-posyandu" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <Tabs value={posyanduSubType} onValueChange={(v: any) => setPosyanduSubType(v)} className="w-full">
                <TabsList className="grid grid-cols-2 w-full h-12 mb-6 bg-rose-50 p-1 rounded-xl">
                  <TabsTrigger value="kader" className="gap-2 text-[10px] font-black uppercase rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                    <UserCheck className="h-4 w-4" />
                    Daftar Kader
                  </TabsTrigger>
                  <TabsTrigger value="peserta" className="gap-2 text-[10px] font-black uppercase rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                    <Baby className="h-4 w-4" />
                    Daftar Peserta Posyandu
                  </TabsTrigger>
                </TabsList>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Judul Kegiatan</Label>
                    <Input
                      placeholder="Contoh: Posyandu Balita & Lansia"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="h-14 rounded-2xl bg-rose-50/50 border-rose-100 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Pilih Kelompok Posyandu</Label>
                    <Select value={selectedLestari} onValueChange={setSelectedLestari}>
                      <SelectTrigger className="h-14 rounded-2xl bg-rose-50 border-rose-100 font-black">
                        <SelectValue placeholder="Pilih Posyandu..." />
                      </SelectTrigger>
                      <SelectContent>
                        {LestariGroups.map(group => (
                          <SelectItem key={group} value={group} className="font-bold">{group}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {posyanduSubType === "peserta" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-1">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Pilih Jenis Peserta</Label>
                        <Select value={selectedHealthCategory} onValueChange={setSelectedHealthCategory}>
                          <SelectTrigger className="h-14 rounded-2xl bg-rose-50 border-rose-100 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HEALTH_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat} className="font-bold">{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Minimal Baris (Jika Data Sedikit)</Label>
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-rose-600/50" />
                          <Input
                            type="number"
                            value={jumlahKuotaPeserta}
                            onChange={(e) => setJumlahKuotaPeserta(parseInt(e.target.value) || 0)}
                            className="h-14 pl-12 rounded-2xl bg-rose-50/30 border-rose-100 font-black text-rose-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Tanggal</Label>
                      <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Waktu</Label>
                      <Input value={time} onChange={e => setTime(e.target.value)} placeholder="09:00 WIB" className="h-12 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Lokasi (Manual)</Label>
                    <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Contoh: Rumah Ibu RW 01" className="h-12 rounded-xl" />
                  </div>
                </div>
              </Tabs>
            </div>
          )}

          {type === "bukti-transaksi" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              {/* TAB SELECTOR DENGAN SOLID ORANGE BUTTONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full p-1.5 rounded-2xl bg-orange-50/70 border border-orange-200">
                <button
                  type="button"
                  onClick={() => setBuktiTab("nota-faktur")}
                  className={cn(
                    "flex items-center justify-center gap-2.5 h-13 py-3 px-4 rounded-xl text-xs font-black uppercase transition-all cursor-pointer",
                    buktiTab === "nota-faktur"
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/30 ring-2 ring-orange-500/20"
                      : "bg-white text-slate-700 hover:bg-orange-100/60 hover:text-orange-950 border border-orange-200/80"
                  )}
                >
                  <Store className={cn("h-4 w-4", buktiTab === "nota-faktur" ? "text-white" : "text-orange-600")} />
                  1. Nota &amp; Faktur Pengiriman
                </button>
                <button
                  type="button"
                  onClick={() => setBuktiTab("struk-belanja")}
                  className={cn(
                    "flex items-center justify-center gap-2.5 h-13 py-3 px-4 rounded-xl text-xs font-black uppercase transition-all cursor-pointer",
                    buktiTab === "struk-belanja"
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/30 ring-2 ring-orange-500/20"
                      : "bg-white text-slate-700 hover:bg-orange-100/60 hover:text-orange-950 border border-orange-200/80"
                  )}
                >
                  <ReceiptText className={cn("h-4 w-4", buktiTab === "struk-belanja" ? "text-white" : "text-orange-600")} />
                  2. Struk Belanja Kasir
                </button>
              </div>

              {/* TAB 1: NOTA & FAKTUR PENGIRIMAN */}
              {buktiTab === "nota-faktur" && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2">
                  {/* Identitas Toko & Karyawan */}
                  <div className="p-6 rounded-3xl bg-orange-50/40 border border-orange-200/80 space-y-5">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-orange-600" />
                      <h3 className="text-xs font-black uppercase text-orange-950 tracking-wider">
                        Identitas Toko &amp; Penerima Barang
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Tanggal Transaksi / Pesanan</Label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-600" />
                          <Input
                            type="date"
                            value={notaDate}
                            onChange={(e) => setNotaDate(e.target.value)}
                            className="h-12 pl-12 rounded-xl bg-white border-orange-200 font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Karyawan / Pemesan Barang</Label>
                          {dbOfficials && dbOfficials.length > 0 && (
                            <Select
                              onValueChange={(val) => {
                                const off = dbOfficials.find(o => o.name === val);
                                if (off) {
                                  setNotaKaryawanNama(off.name);
                                  setNotaKaryawanJabatan(off.jabatan || off.category);
                                }
                              }}
                            >
                              <SelectTrigger className="h-6 text-[9px] font-bold border-orange-200 text-orange-700 bg-white w-auto px-2 rounded-lg">
                                <SelectValue placeholder="Pilih Personil" />
                              </SelectTrigger>
                              <SelectContent>
                                {(dbOfficials || []).map((o, oIdx) => (
                                  <SelectItem key={oIdx} value={o.name} className="text-xs font-medium">
                                    {o.name} ({o.jabatan || o.category})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <Input
                          placeholder="Contoh: TEDY TRISNANTO"
                          value={notaKaryawanNama}
                          onChange={(e) => setNotaKaryawanNama(e.target.value)}
                          className="h-12 rounded-xl bg-white border-orange-200 font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Penerima Faktur (Kepala Kecamatan)</Label>
                          {dbOfficials && dbOfficials.length > 0 && (
                            <Select
                              onValueChange={(val) => setNotaKepalaKecamatan(val)}
                            >
                              <SelectTrigger className="h-6 text-[9px] font-bold border-orange-200 text-orange-700 bg-white w-auto px-2 rounded-lg">
                                <SelectValue placeholder="Pilih Kary." />
                              </SelectTrigger>
                              <SelectContent>
                                {(dbOfficials || []).map((o, oIdx) => (
                                  <SelectItem key={oIdx} value={o.name} className="text-xs font-medium">
                                    {o.name} ({o.jabatan || o.category})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <Input
                          placeholder="Contoh: ASMARUL FUADI"
                          value={notaKepalaKecamatan}
                          onChange={(e) => setNotaKepalaKecamatan(e.target.value)}
                          className="h-12 rounded-xl bg-white border-orange-200 font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Nama Pemilik Toko / Pengirim</Label>
                        <Input
                          placeholder="Contoh: DEDI"
                          value={notaNamaPemilik}
                          onChange={(e) => setNotaNamaPemilik(e.target.value)}
                          className="h-12 rounded-xl bg-white border-orange-200 font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Nama Toko / Usaha</Label>
                        <Input
                          placeholder="Contoh: NAYA"
                          value={notaNamaToko}
                          onChange={(e) => setNotaNamaToko(e.target.value)}
                          className="h-12 rounded-xl bg-white border-orange-200 font-bold text-orange-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Kecamatan / Lokasi Toko (Di-)</Label>
                        <Input
                          placeholder="Contoh: GANDRUNGMANGU"
                          value={notaAlamatToko}
                          onChange={(e) => setNotaAlamatToko(e.target.value)}
                          className="h-12 rounded-xl bg-white border-orange-200 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Daftar Barang Nota */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-orange-950 tracking-widest ml-1 flex items-center gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5 text-orange-600" />
                        Rincian Barang Belanja ({notaItems.length} Item)
                      </Label>
                      <Button
                        type="button"
                        onClick={addNotaItem}
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 rounded-xl border-orange-200 bg-white text-orange-950 hover:bg-orange-50 hover:text-orange-900 text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-orange-600" />
                        <span className="text-orange-950 font-bold">Tambah Barang</span>
                      </Button>
                    </div>

                    {/* Tabel Rincian Barang 1 Baris */}
                    <div className="rounded-2xl border border-orange-200/90 bg-white overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-orange-100/70 border-b border-orange-200 text-[10px] font-black uppercase text-orange-950 tracking-wider">
                              <th className="py-3 px-2 text-center w-12">No</th>
                              <th className="py-3 px-3">Jenis / Nama Barang</th>
                              <th className="py-3 px-2 text-center w-24">Banyaknya</th>
                              <th className="py-3 px-2 text-center w-28">Satuan</th>
                              <th className="py-3 px-3 text-right w-36">Harga Satuan (Rp)</th>
                              <th className="py-3 px-3 text-right w-36">Subtotal</th>
                              <th className="py-3 px-2 text-center w-14">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-orange-100">
                            {notaItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-orange-50/40 transition-colors">
                                {/* 1. No */}
                                <td className="py-2.5 px-2 text-center">
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 text-xs font-black text-orange-950">
                                    {idx + 1}
                                  </span>
                                </td>

                                {/* 2. Jenis / Nama Barang */}
                                <td className="py-2.5 px-3">
                                  <Input
                                    placeholder="Contoh: Foto Copy Undangan dan Materi"
                                    value={item.jenisBarang}
                                    onChange={(e) => handleNotaItemChange(idx, "jenisBarang", e.target.value)}
                                    className="h-10 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 font-bold text-xs md:text-sm text-slate-800 w-full"
                                  />
                                </td>

                                {/* 3. Banyaknya */}
                                <td className="py-2.5 px-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder="1"
                                    value={item.banyaknya}
                                    onChange={(e) => handleNotaItemChange(idx, "banyaknya", e.target.value)}
                                    className="h-10 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 font-bold text-center text-xs md:text-sm text-slate-800 w-full"
                                  />
                                </td>

                                {/* 4. Satuan */}
                                <td className="py-2.5 px-2">
                                  <Input
                                    placeholder="buah / Rim"
                                    value={item.satuan}
                                    onChange={(e) => handleNotaItemChange(idx, "satuan", e.target.value)}
                                    className="h-10 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 font-medium text-center text-xs md:text-sm text-slate-800 w-full"
                                  />
                                </td>

                                {/* 5. Harga Satuan */}
                                <td className="py-2.5 px-3">
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={item.hargaSatuan}
                                    onChange={(e) => handleNotaItemChange(idx, "hargaSatuan", e.target.value)}
                                    className="h-10 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 font-bold text-right text-xs md:text-sm text-orange-950 w-full"
                                  />
                                </td>

                                {/* 6. Subtotal */}
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <span className="font-black text-xs text-orange-800 bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-200/80 block text-right">
                                    Rp {(Number(item.jumlah) || 0).toLocaleString("id-ID")}
                                  </span>
                                </td>

                                {/* 7. Aksi */}
                                <td className="py-2.5 px-2 text-center">
                                  {notaItems.length > 1 ? (
                                    <Button
                                      type="button"
                                      onClick={() => removeNotaItem(idx)}
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg cursor-pointer"
                                      title="Hapus baris"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground/30 text-xs">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Total Baris Nota */}
                    <div className="p-5 rounded-2xl bg-orange-500 text-white flex items-center justify-between shadow-lg shadow-orange-500/20">
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider opacity-90">Total Nota &amp; Faktur</p>
                        <p className="text-xl font-black">
                          Rp {notaItems.reduce((acc, it) => acc + (Number(it.jumlah) || 0), 0).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={addNotaItem}
                        variant="outline"
                        className="rounded-xl font-black text-xs gap-1.5 h-10 bg-white text-orange-950 border border-orange-200 hover:bg-orange-50 hover:text-orange-900 shadow-sm cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-orange-600" />
                        <span className="text-orange-950 font-black">Tambah Barang</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STRUK BELANJA KASIR */}
              {buktiTab === "struk-belanja" && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2">
                  {/* Identitas Merchant / Toko Struk */}
                  <div className="p-6 rounded-3xl bg-orange-50/40 border border-orange-200/80 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ReceiptText className="h-4 w-4 text-orange-600" />
                        <h3 className="text-xs font-black uppercase text-orange-950 tracking-wider">
                          Rincian Struk &amp; Waktu Transaksi
                        </h3>
                      </div>
                      <Button
                        type="button"
                        onClick={setCurrentTimeForStruk}
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg border-orange-200 text-orange-700 hover:bg-orange-50 text-[10px] font-bold"
                      >
                        <Clock className="h-3 w-3 mr-1 text-orange-600" /> Waktu Sekarang
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Tanggal Pembelian</Label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-600" />
                          <Input
                            type="date"
                            value={strukDate}
                            onChange={(e) => setStrukDate(e.target.value)}
                            className="h-12 pl-12 rounded-xl bg-white border-orange-200 font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Waktu Transaksi (Jam : Menit : Detik)</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            placeholder="Jam (00-23)"
                            value={strukJam}
                            onChange={(e) => setStrukJam(e.target.value)}
                            className="h-12 rounded-xl bg-white border-orange-200 text-center font-bold"
                          />
                          <Input
                            placeholder="Menit (00-59)"
                            value={strukMenit}
                            onChange={(e) => setStrukMenit(e.target.value)}
                            className="h-12 rounded-xl bg-white border-orange-200 text-center font-bold"
                          />
                          <Input
                            placeholder="Detik (00-59)"
                            value={strukDetik}
                            onChange={(e) => setStrukDetik(e.target.value)}
                            className="h-12 rounded-xl bg-white border-orange-200 text-center font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Nama Toko / Minimarket</Label>
                        <Input
                          placeholder="Contoh: MINIMARKET GANDRUNGMANGU JAYA"
                          value={strukNamaToko}
                          onChange={(e) => setStrukNamaToko(e.target.value)}
                          className="h-12 rounded-xl bg-white border-orange-200 font-bold text-orange-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Alamat Toko</Label>
                        <Input
                          placeholder="Contoh: Jl. Slamet Riyadi No. 60, Kecamatan Gandrungmangu"
                          value={strukAlamatToko}
                          onChange={(e) => setStrukAlamatToko(e.target.value)}
                          className="h-12 rounded-xl bg-white border-orange-200 font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Nama Kasir (Opsional)</Label>
                        <Input
                          placeholder="KASIR 01"
                          value={strukKasir}
                          onChange={(e) => setStrukKasir(e.target.value)}
                          className="h-12 rounded-xl bg-white border-orange-200 font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Nominal Pembayaran Tunai (Rp)</Label>
                        <Input
                          type="number"
                          placeholder="Opsional (Pas / Otomatis)"
                          value={strukBayarTunai}
                          onChange={(e) => setStrukBayarTunai(e.target.value)}
                          className="h-12 rounded-xl bg-white border-orange-200 font-bold text-orange-950"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Daftar Barang Struk */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-orange-950 tracking-widest ml-1 flex items-center gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5 text-orange-600" />
                        Barang Belanjaan Struk ({strukItems.length} Item)
                      </Label>
                      <Button
                        type="button"
                        onClick={addStrukItem}
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 rounded-xl border-orange-200 bg-white text-orange-950 hover:bg-orange-50 hover:text-orange-900 text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-orange-600" />
                        <span className="text-orange-950 font-bold">Tambah Barang</span>
                      </Button>
                    </div>

                    {/* Tabel Rincian Barang 1 Baris */}
                    <div className="rounded-2xl border border-orange-200/90 bg-white overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-orange-100/70 border-b border-orange-200 text-[10px] font-black uppercase text-orange-950 tracking-wider">
                              <th className="py-3 px-2 text-center w-12">No</th>
                              <th className="py-3 px-3">Jenis / Nama Barang</th>
                              <th className="py-3 px-2 text-center w-24">Banyaknya</th>
                              <th className="py-3 px-2 text-center w-28">Satuan</th>
                              <th className="py-3 px-3 text-right w-36">Harga Satuan (Rp)</th>
                              <th className="py-3 px-3 text-right w-36">Subtotal</th>
                              <th className="py-3 px-2 text-center w-14">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-orange-100">
                            {strukItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-orange-50/40 transition-colors">
                                {/* 1. No */}
                                <td className="py-2.5 px-2 text-center">
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 text-xs font-black text-orange-950">
                                    {idx + 1}
                                  </span>
                                </td>

                                {/* 2. Jenis / Nama Barang */}
                                <td className="py-2.5 px-3">
                                  <Input
                                    placeholder="Contoh: Aqua Botol 600ml"
                                    value={item.jenisBarang}
                                    onChange={(e) => handleStrukItemChange(idx, "jenisBarang", e.target.value)}
                                    className="h-10 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 font-bold text-xs md:text-sm text-slate-800 w-full"
                                  />
                                </td>

                                {/* 3. Banyaknya */}
                                <td className="py-2.5 px-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder="1"
                                    value={item.banyaknya}
                                    onChange={(e) => handleStrukItemChange(idx, "banyaknya", e.target.value)}
                                    className="h-10 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 font-bold text-center text-xs md:text-sm text-slate-800 w-full"
                                  />
                                </td>

                                {/* 4. Satuan */}
                                <td className="py-2.5 px-2">
                                  <Input
                                    placeholder="Pcs / Btl"
                                    value={item.satuan}
                                    onChange={(e) => handleStrukItemChange(idx, "satuan", e.target.value)}
                                    className="h-10 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 font-medium text-center text-xs md:text-sm text-slate-800 w-full"
                                  />
                                </td>

                                {/* 5. Harga Satuan */}
                                <td className="py-2.5 px-3">
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={item.hargaSatuan}
                                    onChange={(e) => handleStrukItemChange(idx, "hargaSatuan", e.target.value)}
                                    className="h-10 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 font-bold text-right text-xs md:text-sm text-orange-950 w-full"
                                  />
                                </td>

                                {/* 6. Subtotal */}
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <span className="font-black text-xs text-orange-800 bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-200/80 block text-right">
                                    Rp {(Number(item.jumlah) || 0).toLocaleString("id-ID")}
                                  </span>
                                </td>

                                {/* 7. Aksi */}
                                <td className="py-2.5 px-2 text-center">
                                  {strukItems.length > 1 ? (
                                    <Button
                                      type="button"
                                      onClick={() => removeStrukItem(idx)}
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg cursor-pointer"
                                      title="Hapus baris"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground/30 text-xs">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Total Baris Struk */}
                    <div className="p-5 rounded-2xl bg-orange-500 text-white flex items-center justify-between shadow-lg shadow-orange-500/20">
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider opacity-90">Total Belanja Struk</p>
                        <p className="text-xl font-black">
                          Rp {strukItems.reduce((acc, it) => acc + (Number(it.jumlah) || 0), 0).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={addStrukItem}
                        variant="outline"
                        className="rounded-xl font-black text-xs gap-1.5 h-10 bg-white text-orange-950 border border-orange-200 hover:bg-orange-50 hover:text-orange-900 shadow-sm cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-orange-600" />
                        <span className="text-orange-950 font-black">Tambah Barang</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(type !== "siltap" && type !== "insentif" && type !== "daftar-hadir-posyandu" && type !== "bukti-transaksi") && (
            <div className="space-y-8">
              <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
                <Button
                  variant={useApbdes ? "default" : "ghost"}
                  className={cn("flex-1 text-[10px] uppercase font-black gap-2 h-10", useApbdes && "shadow-md")}
                  onClick={() => setUseApbdes(true)}
                >
                  <Calendar className="h-3 w-3" /> Agenda
                </Button>
                <Button
                  variant={!useApbdes ? "default" : "ghost"}
                  className={cn("flex-1 text-[10px] uppercase font-black gap-2 h-10", !useApbdes && "shadow-md")}
                  onClick={() => setUseApbdes(false)}
                >
                  <Type className="h-3 w-3" /> Manual
                </Button>
              </div>

              <div className="grid gap-5">
                {useApbdes ? (
                  <div className="space-y-5">
                    {/* Pilih Tanggal Agenda Kegiatan */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase text-primary tracking-widest ml-1 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          Pilih Tanggal Agenda Giat
                        </Label>
                        {isAgendaLoading && (
                          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" /> Sinkronisasi kalender...
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="date"
                            value={selectedAgendaDate}
                            onChange={(e) => {
                              setSelectedAgendaDate(e.target.value);
                              setDate(e.target.value);
                            }}
                            className="h-12 pl-12 rounded-xl bg-primary/5 border-primary/20 font-bold text-primary"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => fetchAgendas(selectedAgendaDate)}
                          disabled={isAgendaLoading}
                          className="h-12 w-12 rounded-xl border-primary/20 hover:bg-primary/5 shrink-0"
                          title="Sinkronisasi ulang agenda"
                        >
                          <RefreshCw className={cn("h-4 w-4 text-primary", isAgendaLoading && "animate-spin")} />
                        </Button>
                      </div>
                    </div>

                    {/* Munculkan Daftar Kegiatan Internal */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between ml-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                          Daftar Kegiatan Internal ({selectedAgendaDate})
                        </Label>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 border border-amber-200/80 px-2 py-0.5 rounded-full">
                          {internalAgendaList.length} Kegiatan Internal
                        </span>
                      </div>

                      {isAgendaLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 bg-muted/10 rounded-2xl border border-dashed border-primary/20">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <p className="text-xs font-bold text-muted-foreground">Mengambil agenda kegiatan internal...</p>
                        </div>
                      ) : internalAgendaList.length > 0 ? (
                        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                          {internalAgendaList.map((agenda: any) => {
                            const cleanTitle = (agenda.summary || "").replace(/^Kegiatan\s*:\s*/i, "").trim();
                            const isSelected = kegiatan === cleanTitle;
                            const timeDisplay = agenda.start?.dateTime
                              ? `${format(new Date(agenda.start.dateTime), "HH:mm")} WIB`
                              : "09:00 WIB";

                            return (
                              <button
                                key={agenda.id}
                                type="button"
                                onClick={() => handleSelectAgendaItem(agenda)}
                                className={cn(
                                  "w-full p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 text-left shadow-xs group",
                                  isSelected
                                    ? "bg-amber-50/70 border-amber-400 shadow-sm ring-1 ring-amber-400/40"
                                    : "bg-white hover:bg-amber-50/20 border-slate-200/90"
                                )}
                              >
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border bg-amber-100 border-amber-200 text-amber-800">
                                      INTERNAL
                                    </span>
                                  </div>
                                  <p className={cn("text-xs font-bold leading-snug break-words group-hover:text-amber-900 transition-colors", isSelected ? "text-amber-950 font-black" : "text-slate-800")}>
                                    {cleanTitle}
                                  </p>
                                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium flex-wrap">
                                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                                      <Clock className="h-3 w-3 text-amber-700/70" />
                                      {timeDisplay}
                                    </span>
                                    {agenda.location && (
                                      <span className="truncate max-w-[220px]">
                                        📍 {agenda.location}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className={cn(
                                  "text-[9px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0 mt-0.5",
                                  isSelected ? "bg-amber-600 text-white font-bold" : "bg-muted text-muted-foreground group-hover:bg-amber-100 group-hover:text-amber-900"
                                )}>
                                  {isSelected ? "Terpilih" : "Pilih"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-8 px-4 text-center bg-muted/10 rounded-2xl border border-dashed border-muted-foreground/30 space-y-1">
                          <p className="text-xs font-bold text-muted-foreground">
                            Tidak ada agenda kegiatan internal pada tanggal ini.
                          </p>
                          <p className="text-[10px] text-muted-foreground/70">
                            Silakan pilih tanggal lain atau gunakan tab <span className="text-primary font-bold cursor-pointer underline" onClick={() => setUseApbdes(false)}>Manual</span> untuk mengetik perihal kegiatan.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Badge Notifikasi Kegiatan Terpilih */}
                    {kegiatan && (
                      <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-[9px] font-black uppercase text-primary tracking-wider">Kegiatan Terpilih untuk Dokumen:</p>
                          <p className="text-xs font-bold text-slate-900 break-words">{kegiatan}</p>
                          <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground font-medium flex-wrap pt-0.5">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Calendar className="h-3 w-3 text-primary" /> {date}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Clock className="h-3 w-3 text-primary" /> {time}
                            </span>
                            <span className="truncate max-w-[240px]">
                              📍 {location}
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setKegiatan("")}
                          className="h-8 text-[10px] font-bold text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          Ubah
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nama Kegiatan</Label>
                    <Input
                      placeholder="Ketik perihal kegiatan..."
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="h-14 rounded-2xl bg-muted/20 border-none px-5 text-base font-medium"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tanggal</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-12 pl-12 rounded-xl bg-muted/20 border-none font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Waktu</Label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="09:00 WIB"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="h-12 pl-12 rounded-xl bg-muted/20 border-none font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Lokasi</Label>
                  <Input
                    placeholder="Lokasi kegiatan..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-12 rounded-xl bg-muted/20 border-none px-5 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {type === "honor-narasumber" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Jumlah Narasumber</Label>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      variant={numNarsum === n ? "default" : "outline"}
                      onClick={() => setNumNarsum(n)}
                      className={cn(
                        "h-14 rounded-2xl font-black text-sm transition-all",
                        numNarsum === n ? "bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200" : "border-amber-200 hover:bg-amber-50 text-amber-900"
                      )}
                    >
                      {n} Orang
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {Array.from({ length: numNarsum }).map((_, i) => (
                  <div key={i} className="p-6 rounded-[2rem] border border-amber-100 bg-amber-50/30 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-600 opacity-20" />
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-[10px] font-black uppercase text-amber-800 tracking-[0.2em]">Narasumber {i + 1}</h3>
                      <Briefcase className="h-4 w-4 text-amber-600 opacity-40" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-amber-900/60 ml-1">Nama Lengkap</Label>
                        <Input
                          placeholder="Ketik nama..."
                          value={narsumData[i].name}
                          onChange={(e) => updateNarsumData(i, "name", e.target.value)}
                          className="h-12 rounded-xl bg-white border-amber-100 focus:border-amber-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-amber-900/60 ml-1">Jabatan</Label>
                        <Input
                          placeholder="Jabatan/Instansi..."
                          value={narsumData[i].position}
                          onChange={(e) => updateNarsumData(i, "position", e.target.value)}
                          className="h-12 rounded-xl bg-white border-amber-100 focus:border-amber-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-amber-900/60 ml-1">Nominal Honor (Rp)</Label>
                        <div className="relative">
                          <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600 opacity-50" />
                          <Input
                            type="number"
                            placeholder="0"
                            value={narsumData[i].nominal}
                            onChange={(e) => updateNarsumData(i, "nominal", e.target.value)}
                            className="h-12 pl-10 rounded-xl bg-white border-amber-100 focus:border-amber-400 font-bold"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-amber-900/60 ml-1">Pajak (%)</Label>
                        <div className="relative">
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600 opacity-50" />
                          <Input
                            type="number"
                            placeholder="0"
                            value={narsumData[i].tax}
                            onChange={(e) => setNarsumData(prev => {
                              const next = [...prev];
                              next[i] = { ...next[i], tax: e.target.value };
                              return next;
                            })}
                            className="h-12 pl-10 rounded-xl bg-white border-amber-100 focus:border-amber-400 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === "honor-kegiatan" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-indigo-900 tracking-widest ml-1">
                  Pilih Kategori Honor Kegiatan
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {HONOR_KEGIATAN_CATEGORIES.map((cat, idx) => (
                    <Button
                      key={cat}
                      type="button"
                      onClick={() => handleSelectHonorCat(cat)}
                      className={cn(
                        "h-14 rounded-2xl font-black text-xs transition-all border-2 text-left justify-start px-4",
                        honorKegiatanCat === cat
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:border-indigo-700"
                          : "bg-white border-muted text-indigo-950 hover:bg-indigo-50/50 hover:border-indigo-200"
                      )}
                    >
                      <span className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center text-[10px] mr-2 shrink-0 font-black",
                        honorKegiatanCat === cat ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                      )}>
                        {idx + 1}
                      </span>
                      <span className="truncate">{cat}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {honorKegiatanCat === "Input Manual" && (
                <div className="space-y-2 p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 animate-in slide-in-from-top-2">
                  <Label className="text-[10px] font-black uppercase text-indigo-800 tracking-widest ml-1">
                    Nama Kategori Honor (Input Manual)
                  </Label>
                  <Input
                    placeholder="Contoh: Honorarium Tim Teknis Lapangan"
                    value={manualHonorCat}
                    onChange={(e) => setManualHonorCat(e.target.value)}
                    className="h-12 rounded-xl bg-white border-indigo-200 font-bold text-indigo-950"
                  />
                  <p className="text-[10px] text-indigo-700/70 font-medium ml-1 italic">
                    * Judul dokumen pada PDF akan dicetak: &quot;TANDA TERIMA {manualHonorCat.trim().toUpperCase() || "HONORARIUM KEGIATAN"}&quot;
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">
                    Jumlah Penerima Honor
                  </Label>
                  <span className="text-xs font-black text-indigo-600">{numHonorKegiatan} Orang</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      variant={numHonorKegiatan === n ? "default" : "outline"}
                      onClick={() => setNumHonorKegiatan(n)}
                      className={cn(
                        "h-12 rounded-xl font-black text-xs transition-all",
                        numHonorKegiatan === n
                          ? "bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 text-white"
                          : "border-indigo-100 hover:bg-indigo-50 text-indigo-900"
                      )}
                    >
                      {n} Org
                    </Button>
                  ))}
                </div>
                {numHonorKegiatan > 10 && (
                  <div className="flex items-center gap-3 pt-1">
                    <Label className="text-[10px] font-bold text-muted-foreground">Kustom Jumlah:</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={numHonorKegiatan}
                      onChange={(e) => setNumHonorKegiatan(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                      className="w-24 h-10 rounded-lg text-center font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="p-6 bg-indigo-50/40 rounded-3xl border border-indigo-100 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-indigo-600" />
                    <Label className="text-xs font-black uppercase text-indigo-950 tracking-tight">
                      Pengisian Nominal Cepat (Otomatis ke Semua)
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-indigo-900/70 ml-1">Nominal Honor (Rp)</Label>
                    <Input
                      type="number"
                      placeholder="Contoh: 150000"
                      value={batchHonorNominal}
                      onChange={(e) => setBatchHonorNominal(e.target.value)}
                      className="h-11 rounded-xl bg-white border-indigo-200 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-indigo-900/70 ml-1">Pajak (%)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={batchHonorTax}
                      onChange={(e) => setBatchHonorTax(e.target.value)}
                      className="h-11 rounded-xl bg-white border-indigo-200 font-bold"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={applyBatchHonor}
                      className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs"
                    >
                      Terapkan ke Semua
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {Array.from({ length: numHonorKegiatan }).map((_, i) => {
                  const item = honorKegiatanData[i] || { name: "", position: "", nominal: "", tax: "0" };
                  const nom = parseInt(item.nominal) || 0;
                  const taxPercent = parseInt(item.tax) || 0;
                  const taxVal = Math.round(nom * (taxPercent / 100));
                  const netVal = nom - taxVal;

                  return (
                    <div key={i} className="p-6 rounded-3xl border border-indigo-100 bg-white shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600 opacity-70" />
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                            {i + 1}
                          </span>
                          <h3 className="text-xs font-black uppercase text-indigo-950 tracking-wider">
                            Penerima {i + 1}
                          </h3>
                        </div>
                        {nom > 0 && (
                          <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
                            Diterima: Rp {netVal.toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Nama Penerima</Label>
                            {dbOfficials && dbOfficials.length > 0 && (
                              <Select
                                onValueChange={(val) => {
                                  const off = dbOfficials.find(o => o.name === val);
                                  if (off) {
                                    updateHonorKegiatanData(i, "name", off.name);
                                    if (off.jabatan) {
                                      updateHonorKegiatanData(i, "position", off.jabatan);
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 text-[10px] font-bold border-indigo-100 text-indigo-600 bg-indigo-50/50 w-auto px-2 rounded-lg">
                                  <SelectValue placeholder="Pilih dari Data Personil Kecamatan" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(dbOfficials || []).map((o, oIdx) => (
                                    <SelectItem key={oIdx} value={o.name} className="text-xs font-medium">
                                      {o.name} ({o.jabatan || o.category})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <Input
                            placeholder="Ketik nama lengkap penerima..."
                            value={item.name}
                            onChange={(e) => updateHonorKegiatanData(i, "name", e.target.value)}
                            className="h-12 rounded-xl bg-muted/20 border-none font-bold"
                          />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Jabatan / Peran</Label>
                          <Input
                            placeholder="Contoh: Protokoler / Petugas / Anggota"
                            value={item.position}
                            onChange={(e) => updateHonorKegiatanData(i, "position", e.target.value)}
                            className="h-12 rounded-xl bg-muted/20 border-none font-medium"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Nominal Honor (Rp)</Label>
                          <div className="relative">
                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600 opacity-60" />
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.nominal}
                              onChange={(e) => updateHonorKegiatanData(i, "nominal", e.target.value)}
                              className="h-12 pl-10 rounded-xl bg-muted/20 border-none font-black text-indigo-950"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Potongan Pajak (%)</Label>
                          <div className="relative">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600 opacity-60" />
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.tax}
                              onChange={(e) => updateHonorKegiatanData(i, "tax", e.target.value)}
                              className="h-12 pl-10 rounded-xl bg-muted/20 border-none font-black text-indigo-950"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(type === "daftar-hadir" || type === "uang-saku") && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Kuota Peserta (Master Baris Tabel)</Label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    type="number"
                    value={jumlahOrang}
                    onChange={(e) => setJumlahOrang(parseInt(e.target.value) || 0)}
                    className="h-12 pl-12 rounded-xl bg-primary/5 border-primary/10 font-black text-primary"
                  />
                </div>
                <p className="text-[9px] text-muted-foreground font-bold italic">* Tabel PDF akan dibuat dengan tepat {jumlahOrang} nomor baris sesuai kuota.</p>
              </div>

              {type === "uang-saku" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 bg-teal-50 rounded-3xl border border-teal-100 shadow-inner">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-teal-900 tracking-widest">Nominal Uang Saku (Rp)</Label>
                    <div className="relative">
                      <Coins className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
                      <Input
                        type="number"
                        placeholder="0"
                        value={uangSakuNominal}
                        onChange={(e) => setUangSakuNominal(e.target.value)}
                        className="h-12 pl-12 rounded-xl bg-white border-teal-200 font-black text-teal-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-teal-900 tracking-widest">Pot Pajak (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-600" />
                      <Input
                        type="number"
                        placeholder="0"
                        value={uangSakuTax}
                        onChange={(e) => setUangSakuTax(e.target.value)}
                        className="h-12 pl-12 rounded-xl bg-white border-teal-200 font-black text-teal-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              <section className={cn("p-6 rounded-3xl border space-y-4", type === "uang-saku" ? "bg-teal-50/50 border-teal-100" : "bg-primary/5 border-primary/10")}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", type === "uang-saku" ? "bg-teal-600" : "bg-primary")}>
                    <UserPlus className="h-4 w-4 text-white" />
                  </div>
                  <h3 className={cn("text-sm font-black uppercase tracking-tight", type === "uang-saku" ? "text-teal-900" : "text-primary")}>Otomatisasi Nama Peserta</h3>
                </div>
                <p className={cn("text-[10px] font-bold leading-relaxed mb-4 italic", type === "uang-saku" ? "text-teal-700" : "text-primary/80")}>
                  * Pilih kategori peserta. Nama akan diisi otomatis berdasarkan prioritas urutan input 1 ke 6.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {participantSelections.map((selection, i) => (
                    <div key={i} className="space-y-1.5">
                      <Label className={cn("text-[9px] font-black uppercase ml-1", type === "uang-saku" ? "text-teal-800" : "text-primary/90")}>Kelompok Peserta {i + 1}</Label>
                      <Select
                        value={selection}
                        onValueChange={(value) => handleParticipantSelectionChange(i, value)}
                      >
                        <SelectTrigger className={cn("h-11 rounded-xl bg-white", type === "uang-saku" ? "border-teal-200" : "border-primary/20")}>
                          <SelectValue placeholder="Pilih Kelompok..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Kosong --</SelectItem>
                          {participantCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          <div className="pt-6 border-t space-y-4">
            <Button
              className={cn(
                "w-full h-16 gap-3 text-lg font-black uppercase shadow-lg rounded-[1.25rem] active:scale-95 transition-all",
                type === "honor-narasumber" ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200" :
                  type === "honor-kegiatan" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200" :
                    type === "bukti-transaksi" ? "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20" :
                      type === "insentif" ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200" :
                        type === "siltap" ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20" :
                          type === "uang-saku" ? "bg-teal-600 hover:bg-teal-700 text-teal-50 shadow-teal-200" :
                            type === "daftar-hadir-posyandu" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200" :
                              "bg-primary hover:bg-primary/90 shadow-primary/20"
              )}
              onClick={handlePrint}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Printer className="h-6 w-6" />}
              Cetak PDF Sekarang
            </Button>
            <p className="text-[10px] text-center text-muted-foreground italic font-medium">
              * Dokumen akan dicetak dengan kop surat Pemerintah Kecamatan Gandrungmangu.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DokumenSuspense() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <StatusChecker />
    </Suspense>
  )
}

function StatusChecker() {
  return <DokumenContent />
}

export default function DokumenPenunjangPage() {
  return <DokumenSuspense />
}