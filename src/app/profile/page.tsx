"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  User,
  ArrowLeft,
  Search,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  CreditCard,
  AlertTriangle,
  MapPin,
  Tag,
  X,
  Layers,
  Sparkles,
  SlidersHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useState, useRef, useMemo, useEffect } from "react"
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, getDocs } from "firebase/firestore"
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking
} from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import { cn } from "@/lib/utils"

// Kategori default
const DEFAULT_CATEGORIES = [
  "Karyawan Kecamatan",
  "PKK KECAMATAN",
  "Darmawanita kecamatan"
];

// Opsi field cepat untuk pembuatan tab baru
const QUICK_FIELD_SUGGESTIONS = [
  "Nama",
  "Jabatan",
  "Alamat",
  "No HP",
  "NIP",
  "NIK",
  "Keterangan",
  "Dusun / RT"
];

interface CustomTab {
  id: string;
  title: string;
  fields: string[];
  includeInSppd?: boolean;
  includeInCetakDokumen?: boolean;
}

// Helper: Weighting for Karyawan Kecamatan hierarchy (Camat -> Sekretaris -> Kasi -> Kasubbag -> Lainnya)
const getRankWeight = (jabatan: string) => {
  const j = (jabatan || "").toUpperCase().trim();
  if (!j) return 999;

  // 1. Camat
  if (
    (j === "CAMAT" || j.startsWith("CAMAT") || j.includes("CAMAT GANDRUNGMANGU") || j.includes("PLT. CAMAT") || j.includes("PJ. CAMAT")) &&
    !j.includes("SEKRETARIS") &&
    !j.includes("SEKCAM") &&
    !j.includes("AJUDAN") &&
    !j.includes("PENGEMUDI") &&
    !j.includes("SOPIR") &&
    !j.includes("DRIVER") &&
    !j.includes("STAF")
  ) {
    return 1;
  }

  // 2. Sekretaris (Sekretaris Kecamatan / Sekcam)
  if (
    j.includes("SEKRETARIS KECAMATAN") ||
    j.includes("SEKCAM") ||
    j.includes("SEKRETARIS")
  ) {
    return 2;
  }

  // 3. Kasi (Kepala Seksi)
  if (
    (j.startsWith("KASI ") || j === "KASI" || j.includes("KASI ") || j.includes("KEPALA SEKSI")) &&
    !j.includes("KASUBBAG") &&
    !j.includes("KASUBAG")
  ) {
    return 3;
  }

  // 4. Kasubbag (Kepala Sub Bagian)
  if (
    j.includes("KASUBBAG") ||
    j.includes("KASUBAG") ||
    j.includes("KEPALA SUB BAGIAN") ||
    j.includes("KEPALA SUBBAGIAN") ||
    j.includes("KEPALA SUB")
  ) {
    return 4;
  }

  // 5. Baru yang lainnya
  return 10;
};

// Helper: Weighting for RT/RW sorting if used
const getRtRwWeight = (jabatan: string) => {
  const j = (jabatan || "").toUpperCase();
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

// Helper: Memastikan data lama (SKRETARIS Kecamatan & KEPALA Kecamatan) tetap terbaca di tab baru
const isCategoryMatch = (officialCat?: string, currentTab?: string) => {
  if (!officialCat || !currentTab) return false;
  if (officialCat.toLowerCase() === currentTab.toLowerCase()) return true;
  // Aliases untuk backward compatibility
  if (currentTab === "PKK KECAMATAN" && (
    officialCat === "SKRETARIS Kecamatan" ||
    officialCat === "PKK KECAMATAN" ||
    officialCat.toLowerCase() === "pkk"
  )) return true;

  if (currentTab === "Darmawanita kecamatan" && (
    officialCat === "KEPALA Kecamatan" ||
    officialCat === "Darmawanita kecamatan" ||
    officialCat.toLowerCase().includes("darmawanita") ||
    officialCat.toLowerCase().includes("dharma wanita")
  )) return true;

  return false;
};

export default function ProfilePage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Firebase personnel collection
  const personnelRef = useMemoFirebase(() => (db && user) ? collection(db, "personnel") : null, [db, user])
  const { data: officials, isLoading: isDataLoading } = useCollection(personnelRef)

  // Firestore setting for dynamic custom tabs
  const customTabsRef = useMemoFirebase(() => (db && user) ? doc(db, "settings", "personnel_custom_tabs") : null, [db, user])
  const { data: customTabsDoc } = useDoc(customTabsRef)

  const customTabs: CustomTab[] = useMemo(() => {
    return customTabsDoc?.tabs || [];
  }, [customTabsDoc])

  // Gabungan kategori default + custom tabs
  const allCategories = useMemo(() => {
    const customTitles = customTabs.map(t => t.title);
    return [
      ...DEFAULT_CATEGORIES,
      ...customTitles.filter(c => !DEFAULT_CATEGORIES.some(d => d.toLowerCase() === c.toLowerCase()))
    ];
  }, [customTabs]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("Karyawan Kecamatan");

  // State untuk Modal Tambah Tab Baru (Custom Tab)
  const [isAddTabModalOpen, setIsAddTabModalOpen] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState("");
  const [newTabFields, setNewTabFields] = useState<string[]>(["Nama", "Jabatan", "Alamat"]);
  const [newTabIncludeInSppd, setNewTabIncludeInSppd] = useState(true);
  const [newTabIncludeInCetakDokumen, setNewTabIncludeInCetakDokumen] = useState(true);
  const [customFieldInput, setCustomFieldInput] = useState("");
  const [deletingTab, setDeletingTab] = useState<string | null>(null);

  // State untuk Modal Edit Rincian Kolom & Pengaturan Tab
  const [isEditTabModalOpen, setIsEditTabModalOpen] = useState(false);
  const [editingTabTitle, setEditingTabTitle] = useState("");
  const [editingTabFields, setEditingTabFields] = useState<string[]>([]);
  const [editingTabIncludeInSppd, setEditingTabIncludeInSppd] = useState(true);
  const [editingTabIncludeInCetakDokumen, setEditingTabIncludeInCetakDokumen] = useState(true);
  const [editCustomFieldInput, setEditCustomFieldInput] = useState("");
  const [importTargetTab, setImportTargetTab] = useState<string>("");

  // State untuk Modal Tambah / Edit Personel
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [editingOfficial, setEditingOfficial] = useState<any>(null);

  // State untuk Konfirmasi Hapus Personel
  const [isDeleteSingleConfirmOpen, setIsDeleteSingleConfirmOpen] = useState(false);
  const [deletingOfficial, setDeletingOfficial] = useState<any>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Helper mengambil kolom untuk tab tertentu
  const getFieldsForTab = (tabName: string): string[] => {
    const custom = customTabs.find(t => t.title.toLowerCase() === tabName.toLowerCase());
    if (custom && custom.fields && custom.fields.length > 0) {
      return custom.fields;
    }
    if (tabName === "Karyawan Kecamatan") {
      return ["Nama", "NIP", "Jabatan"];
    }
    if (tabName === "PKK KECAMATAN" || tabName === "Darmawanita kecamatan") {
      return ["Nama", "Jabatan", "Alamat"];
    }
    return ["Nama", "Jabatan", "Alamat"];
  };

  // Sorting logic combined with filtering
  const sortedOfficials = useMemo(() => {
    if (!officials) return [];

    const filtered = officials.filter(o =>
      (o.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (o.jabatan?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (o.nip?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (o.alamat?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const catA = String(a.category || "").trim();
      const catB = String(b.category || "").trim();
      if (catA !== catB) return catA.localeCompare(catB);

      if (catA.toLowerCase() === "karyawan kecamatan") {
        const wA = getRankWeight(a.jabatan);
        const wB = getRankWeight(b.jabatan);
        if (wA !== wB) return wA - wB;
      }

      return (a.name || "").localeCompare(b.name || "");
    });
  }, [officials, searchTerm]);

  // Handler pembuatan Tab Baru
  const handleCreateCustomTab = () => {
    if (!newTabTitle.trim() || !db) return;
    const cleanTitle = newTabTitle.trim();
    if (allCategories.some(c => c.toLowerCase() === cleanTitle.toLowerCase())) {
      toast({
        variant: "destructive",
        title: "Tab Sudah Ada",
        description: `Tab dengan nama "${cleanTitle}" sudah tersedia.`
      });
      return;
    }

    const cleanFields = newTabFields.map(f => f.trim()).filter(Boolean);
    if (cleanFields.length === 0) {
      toast({
        variant: "destructive",
        title: "Kolom Kosong",
        description: "Tambahkan minimal satu kolom (misal: Nama)."
      });
      return;
    }

    const newTab: CustomTab = {
      id: `tab_${Date.now()}`,
      title: cleanTitle,
      fields: cleanFields,
      includeInSppd: newTabIncludeInSppd,
      includeInCetakDokumen: newTabIncludeInCetakDokumen,
    };

    const updatedTabs = [...customTabs, newTab];
    setDocumentNonBlocking(doc(db, "settings", "personnel_custom_tabs"), {
      tabs: updatedTabs
    }, { merge: true });

    toast({
      title: "Tab Berhasil Dibuat",
      description: `Kategori tab "${cleanTitle}" berhasil ditambahkan dengan ${cleanFields.length} kolom.`
    });

    setIsAddTabModalOpen(false);
    setActiveTab(cleanTitle);
    setNewTabTitle("");
    setNewTabFields(["Nama", "Jabatan", "Alamat"]);
    setNewTabIncludeInSppd(true);
    setNewTabIncludeInCetakDokumen(true);
  };

  // Handler Hapus Custom Tab
  const handleDeleteCustomTab = (tabTitle: string) => {
    if (!db) return;
    const updatedTabs = customTabs.filter(t => t.title.toLowerCase() !== tabTitle.toLowerCase());
    setDocumentNonBlocking(doc(db, "settings", "personnel_custom_tabs"), {
      tabs: updatedTabs
    }, { merge: true });

    toast({
      title: "Tab Dihapus",
      description: `Tab "${tabTitle}" berhasil dihapus.`
    });

    setDeletingTab(null);
    if (activeTab.toLowerCase() === tabTitle.toLowerCase()) {
      setActiveTab(DEFAULT_CATEGORIES[0]);
    }
  };

  // Handler Buka Modal Edit Kolom Tab
  const handleOpenEditTabModal = (tabName: string) => {
    const custom = customTabs.find(t => t.title.toLowerCase() === tabName.toLowerCase());
    setEditingTabTitle(tabName);
    setEditingTabFields([...getFieldsForTab(tabName)]);
    setEditingTabIncludeInSppd(custom ? (custom.includeInSppd ?? true) : true);
    setEditingTabIncludeInCetakDokumen(custom ? (custom.includeInCetakDokumen ?? true) : true);
    setEditCustomFieldInput("");
    setIsEditTabModalOpen(true);
  };

  // Handler Simpan Perubahan Kolom Tab
  const handleSaveEditTabFields = () => {
    if (!editingTabTitle || !db) return;
    const cleanFields = editingTabFields.map(f => f.trim()).filter(Boolean);
    if (cleanFields.length === 0) {
      toast({
        variant: "destructive",
        title: "Kolom Kosong",
        description: "Tambahkan minimal satu kolom (misal: Nama)."
      });
      return;
    }

    const existingIndex = customTabs.findIndex(t => t.title.toLowerCase() === editingTabTitle.toLowerCase());
    let updatedTabs: CustomTab[];

    if (existingIndex >= 0) {
      updatedTabs = customTabs.map((t, idx) =>
        idx === existingIndex ? {
          ...t,
          fields: cleanFields,
          includeInSppd: editingTabIncludeInSppd,
          includeInCetakDokumen: editingTabIncludeInCetakDokumen
        } : t
      );
    } else {
      updatedTabs = [
        ...customTabs,
        {
          id: `tab_${Date.now()}`,
          title: editingTabTitle,
          fields: cleanFields,
          includeInSppd: editingTabIncludeInSppd,
          includeInCetakDokumen: editingTabIncludeInCetakDokumen
        }
      ];
    }

    setDocumentNonBlocking(doc(db, "settings", "personnel_custom_tabs"), {
      tabs: updatedTabs
    }, { merge: true });

    toast({
      title: "Pengaturan Tab Diperbarui",
      description: `Rincian kolom dan pengaturan integrasi "${editingTabTitle}" berhasil disimpan.`
    });

    setIsEditTabModalOpen(false);
  };

  // Buka Modal Tambah Personel untuk Tab Aktif
  const handleOpenAddModal = () => {
    const fields = getFieldsForTab(activeTab);
    const initialValues: Record<string, string> = {};
    fields.forEach(f => {
      initialValues[f] = "";
    });
    setFormValues(initialValues);
    setIsAddModalOpen(true);
  };

  // Buka Modal Edit Personel
  const handleOpenEditModal = (official: any) => {
    const fields = getFieldsForTab(official.category || activeTab);
    const initialValues: Record<string, string> = {};
    fields.forEach(f => {
      const lower = f.toLowerCase();
      const val = official[f] ||
        (official.customFields && official.customFields[f]) ||
        (lower === "nama" ? official.name : "") ||
        (lower === "jabatan" ? official.jabatan : "") ||
        (lower === "nip" ? (official.nip !== "-" ? official.nip : "") : "") ||
        (lower === "alamat" ? (official.alamat || official.address || "") : "");
      initialValues[f] = val || "";
    });
    setFormValues(initialValues);
    setEditingOfficial(official);
    setIsEditModalOpen(true);
  };

  // Simpan Tambah Personel
  const handleSaveAdd = () => {
    if (!db) return;
    const fields = getFieldsForTab(activeTab);
    const primaryField = fields[0] || "Nama";
    if (!formValues[primaryField]?.trim()) {
      toast({
        variant: "destructive",
        title: "Wajib Diisi",
        description: `Kolom ${primaryField} harus diisi.`
      });
      return;
    }

    const nameVal = (formValues["Nama"] || formValues["nama"] || formValues[fields[0]] || "-").toUpperCase().trim();
    const jabatanVal = (formValues["Jabatan"] || formValues["jabatan"] || formValues[fields[1]] || "-").toUpperCase().trim();
    const nipVal = formValues["NIP"] || formValues["nip"] || "-";
    const alamatVal = formValues["Alamat"] || formValues["alamat"] || "-";

    const payload: any = {
      ...formValues,
      name: nameVal,
      jabatan: jabatanVal,
      nip: nipVal,
      alamat: alamatVal,
      category: activeTab,
      customFields: formValues,
      active: true,
      createdAt: new Date().toISOString()
    };

    const colRef = collection(db, "personnel");
    addDocumentNonBlocking(colRef, payload);
    toast({ title: "Berhasil", description: `Data berhasil ditambahkan ke ${activeTab}.` });
    setIsAddModalOpen(false);
  };

  // Simpan Perubahan Personel
  const handleSaveEdit = () => {
    if (!editingOfficial || !db) return;
    const fields = getFieldsForTab(editingOfficial.category || activeTab);
    const nameVal = (formValues["Nama"] || formValues["nama"] || formValues[fields[0]] || editingOfficial.name || "-").toUpperCase().trim();
    const jabatanVal = (formValues["Jabatan"] || formValues["jabatan"] || formValues[fields[1]] || editingOfficial.jabatan || "-").toUpperCase().trim();
    const nipVal = formValues["NIP"] || formValues["nip"] || editingOfficial.nip || "-";
    const alamatVal = formValues["Alamat"] || formValues["alamat"] || editingOfficial.alamat || "-";

    const payload: any = {
      ...editingOfficial,
      ...formValues,
      name: nameVal,
      jabatan: jabatanVal,
      nip: nipVal,
      alamat: alamatVal,
      customFields: {
        ...(editingOfficial.customFields || {}),
        ...formValues
      }
    };

    const docRef = doc(db, "personnel", editingOfficial.id);
    setDocumentNonBlocking(docRef, payload, { merge: true });
    toast({ title: "Berhasil", description: "Data berhasil diperbarui." });
    setIsEditModalOpen(false);
  };

  const handleConfirmDeleteSingle = () => {
    if (!deletingOfficial || !db) return;
    const docRef = doc(db, "personnel", deletingOfficial.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Terhapus", description: "Data dihapus secara permanen." });
    setIsDeleteSingleConfirmOpen(false);
  };

  // Ekspor Data Excel Sesuai Kolom Tab Spesifik
  const handleExport = (targetTab: string = activeTab) => {
    if (!officials || officials.length === 0) return;
    const fields = getFieldsForTab(targetTab);
    const matchingOfficials = sortedOfficials.filter(o => isCategoryMatch(o.category, targetTab));

    if (matchingOfficials.length === 0) {
      toast({
        variant: "destructive",
        title: "Data Kosong",
        description: `Tidak ada data pada kategori ${targetTab} untuk diekspor.`
      });
      return;
    }

    const exportData = matchingOfficials.map(o => {
      const row: Record<string, any> = {};
      fields.forEach(f => {
        const lower = f.toLowerCase().trim();
        let val = o[f] || (o.customFields && o.customFields[f]);
        
        if (!val || val === "-") {
          if (lower.includes("nama")) val = o.name || o.nama;
          else if (lower.includes("jabatan") || lower.includes("peran")) val = o.jabatan || o.position;
          else if (lower.includes("nip")) val = o.nip;
          else if (lower.includes("alamat") || lower.includes("domisili")) val = o.alamat || o.address;
          else if (lower.includes("nik")) val = o.nik;
          else if (lower.includes("hp") || lower.includes("telepon")) val = o.noHp || o.phone || o.telepon || o.hp;
        }

        row[f] = val && String(val).trim() !== "" && String(val).trim() !== "-" ? String(val).trim() : "-";
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-fit lebar kolom
    const colWidths = fields.map(f => {
      const maxLength = Math.max(
        f.length,
        ...exportData.map(r => String(r[f] || "").length)
      );
      return { wch: Math.max(maxLength + 3, 14) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, targetTab.substring(0, 30));
    XLSX.writeFile(wb, `Data_${targetTab.replace(/[^a-zA-Z0-9]/g, '_')}_gandrungmangu.xlsx`);
    toast({ title: "Ekspor Berhasil", description: `File Excel untuk ${targetTab} (${exportData.length} data) berhasil diunduh.` });
  };

  // Unduh Contoh Template Excel Sesuai Kolom Tab Spesifik
  const handleDownloadTemplate = (targetTab: string = activeTab) => {
    const fields = getFieldsForTab(targetTab);
    const sampleRow1: Record<string, string> = {};
    const sampleRow2: Record<string, string> = {};

    fields.forEach(f => {
      const lower = f.toLowerCase().trim();
      if (lower.includes("nama")) {
        sampleRow1[f] = "BUDI SANTOSO";
        sampleRow2[f] = "SITI AMINAH";
      } else if (lower.includes("nip")) {
        sampleRow1[f] = "19850101 201001 1 001";
        sampleRow2[f] = "19880512 201202 2 003";
      } else if (lower.includes("nik")) {
        sampleRow1[f] = "3301010101850001";
        sampleRow2[f] = "3301011205880002";
      } else if (lower.includes("jabatan") || lower.includes("peran")) {
        sampleRow1[f] = "KETUA";
        sampleRow2[f] = "SEKRETARIS";
      } else if (lower.includes("alamat") || lower.includes("domisili")) {
        sampleRow1[f] = "Gandrungmangu RT 01 RW 01";
        sampleRow2[f] = "Gandrungmangu RT 02 RW 01";
      } else if (lower.includes("dusun") || lower.includes("rt")) {
        sampleRow1[f] = "Dusun Gandrungmangu";
        sampleRow2[f] = "Dusun Karanganyar";
      } else if (lower.includes("hp") || lower.includes("telepon") || lower.includes("wa")) {
        sampleRow1[f] = "081234567890";
        sampleRow2[f] = "089876543210";
      } else if (lower.includes("keterangan")) {
        sampleRow1[f] = "Aktif";
        sampleRow2[f] = "Aktif";
      } else {
        sampleRow1[f] = `Contoh ${f} 1`;
        sampleRow2[f] = `Contoh ${f} 2`;
      }
    });

    const ws = XLSX.utils.json_to_sheet([sampleRow1, sampleRow2]);
    const colWidths = fields.map(f => ({ wch: Math.max(f.length + 5, 18) }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `Format_Impor_${targetTab.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    toast({
      title: "Format Terunduh",
      description: `Format Excel ${targetTab} (${fields.join(", ")}) berhasil diunduh.`
    });
  };

  const handleTriggerImport = (targetTab: string) => {
    setImportTargetTab(targetTab);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Impor Data Excel Sesuai Kolom Tab Spesifik
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetTab = importTargetTab || activeTab;
    if (!file || !db || !user) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws);

        if (jsonData.length === 0) {
          toast({ variant: "destructive", title: "File Kosong", description: "Tidak ada data yang ditemukan di file Excel." });
          return;
        }

        const fields = getFieldsForTab(targetTab);
        let importedCount = 0;

        jsonData.forEach((row) => {
          const keys = Object.keys(row);
          const rowValues: Record<string, string> = {};

          fields.forEach(field => {
            const cleanField = field.toLowerCase().replace(/[^a-z0-9]/g, '');
            // 1. Direct clean matching
            let matchingKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanField);

            // 2. Fuzzy fallback matching for common aliases
            if (!matchingKey) {
              if (cleanField.includes("nama")) {
                matchingKey = keys.find(k => {
                  const lk = k.toLowerCase();
                  return lk.includes("nama") || lk === "name";
                });
              } else if (cleanField.includes("jabatan") || cleanField.includes("peran")) {
                matchingKey = keys.find(k => {
                  const lk = k.toLowerCase();
                  return lk.includes("jabatan") || lk.includes("posisi") || lk.includes("peran");
                });
              } else if (cleanField.includes("nip")) {
                matchingKey = keys.find(k => k.toLowerCase().includes("nip"));
              } else if (cleanField.includes("alamat")) {
                matchingKey = keys.find(k => k.toLowerCase().includes("alamat") || k.toLowerCase().includes("address"));
              } else if (cleanField.includes("nik")) {
                matchingKey = keys.find(k => k.toLowerCase().includes("nik"));
              } else if (cleanField.includes("hp") || cleanField.includes("telepon")) {
                matchingKey = keys.find(k => k.toLowerCase().includes("hp") || k.toLowerCase().includes("telepon") || k.toLowerCase().includes("wa"));
              }
            }

            if (matchingKey && row[matchingKey] !== undefined && String(row[matchingKey]).trim() !== "") {
              rowValues[field] = String(row[matchingKey]).trim();
            } else {
              rowValues[field] = "-";
            }
          });

          // Ambil nama dari field yang mengandung 'nama' atau field pertama
          const nameFieldKey = fields.find(f => f.toLowerCase().includes("nama")) || fields[0];
          const rawName = rowValues[nameFieldKey];

          if (rawName && rawName !== "-" && rawName.trim() !== "") {
            const nameVal = rawName.toUpperCase().trim();
            
            // Jabatan
            const jabatanFieldKey = fields.find(f => f.toLowerCase().includes("jabatan") || f.toLowerCase().includes("peran")) || fields[1];
            const jabatanVal = (rowValues[jabatanFieldKey] && rowValues[jabatanFieldKey] !== "-") 
              ? rowValues[jabatanFieldKey].toUpperCase().trim() 
              : targetTab.toUpperCase();

            // NIP
            const nipFieldKey = fields.find(f => f.toLowerCase().includes("nip"));
            const nipVal = (nipFieldKey && rowValues[nipFieldKey] !== "-") ? rowValues[nipFieldKey] : "-";

            // Alamat
            const alamatFieldKey = fields.find(f => f.toLowerCase().includes("alamat") || f.toLowerCase().includes("domisili"));
            const alamatVal = (alamatFieldKey && rowValues[alamatFieldKey] !== "-") ? rowValues[alamatFieldKey] : "-";

            const colRef = collection(db, "personnel");
            addDocumentNonBlocking(colRef, {
              ...rowValues,
              name: nameVal,
              jabatan: jabatanVal,
              nip: nipVal,
              alamat: alamatVal,
              category: targetTab,
              customFields: rowValues,
              active: true,
              createdAt: new Date().toISOString()
            });
            importedCount++;
          }
        });

        if (importedCount > 0) {
          toast({ title: "Impor Berhasil", description: `${importedCount} data (${targetTab}) berhasil diimpor sesuai format kolom.` });
        } else {
          toast({
            variant: "destructive",
            title: "Format Tidak Cocok",
            description: `Pastikan file Excel memiliki kolom yang sesuai dengan ${targetTab} (${fields.join(", ")}).`
          });
        }
      } catch (error) {
        console.error("Import error:", error);
        toast({ variant: "destructive", title: "Impor Gagal", description: "Terjadi kesalahan saat membaca file Excel." });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDeleteAll = async () => {
    if (!db) return;
    setIsProcessing(true);
    try {
      const q = collection(db, "personnel");
      const snapshot = await getDocs(q);
      snapshot.docs.forEach((docSnap) => {
        deleteDocumentNonBlocking(docSnap.ref);
      });
      toast({ title: "Berhasil", description: "Proses penghapusan database dimulai." });
      setShowDeleteAllConfirm(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan akses." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isDataLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sinkronisasi Database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/dashboard/"><ArrowLeft className="h-6 w-6" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-black uppercase text-primary tracking-tight">Data Lembaga & Karyawan Kecamatan</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Manajemen Data Karyawan, Lembaga & Kelompok</p>
          </div>
        </div>

        {/* Action Header: Tombol + Tambah Tab & Hapus Seluruh Database */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewTabTitle("");
              setNewTabFields(["Nama", "Jabatan", "Alamat"]);
              setCustomFieldInput("");
              setIsAddTabModalOpen(true);
            }}
            className="h-9 rounded-xl gap-2 font-black text-[10px] uppercase border-primary/30 text-primary bg-primary/5 hover:bg-primary hover:text-white shadow-sm transition-all"
            title="Tambah Kategori / Tab Baru dengan Kolom Kustom"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Tab Baru
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase text-destructive hover:bg-destructive/5"
            onClick={() => setShowDeleteAllConfirm(true)}
            disabled={isProcessing}
          >
            <Trash2 className="h-3.5 w-3.5" /> Hapus Seluruh Database
          </Button>
        </div>
      </header>

      <section className="grid gap-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, jabatan, alamat..."
            className="pl-11 h-14 rounded-2xl bg-white shadow-sm border-primary/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs defaultValue={allCategories[0] || "Karyawan Kecamatan"} value={activeTab} className="w-full" onValueChange={setActiveTab}>
          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls" />
          <TabsList className="w-full h-auto p-1.5 bg-muted/50 flex flex-row overflow-x-auto no-scrollbar md:flex-wrap rounded-2xl gap-1">
            {allCategories.map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="flex-shrink-0 px-5 py-3 text-[10px] font-black uppercase md:flex-1 md:min-w-[130px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all shadow-none"
              >
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          {allCategories.map((cat) => {
            const fields = getFieldsForTab(cat);
            const isCustom = !DEFAULT_CATEGORIES.includes(cat);
            const matchingOfficials = sortedOfficials.filter(o => isCategoryMatch(o.category, cat));

            return (
              <TabsContent key={cat} value={cat} className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">{cat}</h3>
                      {isCustom && (
                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-amber-50 text-amber-700 border-amber-200">
                          Tab Kustom
                        </Badge>
                      )}
                    </div>
                    {(() => {
                      const customSetting = customTabs.find(t => t.title.toLowerCase() === cat.toLowerCase());
                      const inSppd = customSetting ? (customSetting.includeInSppd ?? true) : true;
                      const inCetak = customSetting ? (customSetting.includeInCetakDokumen ?? true) : true;
                      return (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-bold text-muted-foreground">
                            Kolom isian: <span className="text-primary font-semibold">{fields.join(", ")}</span> ({matchingOfficials.length} data)
                          </span>
                          <span className="text-muted-foreground text-xs">•</span>
                          {inSppd ? (
                            <Badge variant="outline" className="text-[8px] font-black uppercase bg-emerald-50 text-emerald-700 border-emerald-200 py-0 h-4">
                              SPPD: Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-100 text-slate-400 border-slate-200 py-0 h-4">
                              SPPD: Nonaktif
                            </Badge>
                          )}
                          {inCetak ? (
                            <Badge variant="outline" className="text-[8px] font-black uppercase bg-blue-50 text-blue-700 border-blue-200 py-0 h-4">
                              Cetak: Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-100 text-slate-400 border-slate-200 py-0 h-4">
                              Cetak: Nonaktif
                            </Badge>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadTemplate(cat)}
                      className="h-10 rounded-xl gap-2 font-black text-[10px] uppercase border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-800 shadow-sm"
                      title={`Unduh format Excel (${fields.join(", ")})`}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Format Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTriggerImport(cat)}
                      disabled={isProcessing}
                      className="h-10 rounded-xl gap-2 font-black text-[10px] uppercase border-slate-200 hover:bg-slate-50 shadow-sm"
                      title={`Impor data Excel sesuai format kolom ${cat}`}
                    >
                      <Upload className="h-3.5 w-3.5" /> Impor
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(cat)}
                      className="h-10 rounded-xl gap-2 font-black text-[10px] uppercase border-slate-200 hover:bg-slate-50 shadow-sm"
                      title={`Ekspor data ${cat} (${fields.join(", ")})`}
                    >
                      <Download className="h-3.5 w-3.5" /> Ekspor
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditTabModal(cat)}
                      className="h-10 rounded-xl gap-2 font-black text-[10px] uppercase border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-800 shadow-sm transition-all"
                      title={`Edit atau atur rincian kolom isian untuk tab ${cat}`}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-600" /> Edit Kolom
                    </Button>

                    <Button
                      onClick={handleOpenAddModal}
                      className="h-10 gap-2 text-[10px] font-black uppercase bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl px-5"
                    >
                      <Plus className="h-4 w-4" />
                      Tambah {cat}
                    </Button>

                    {isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingTab(cat)}
                        className="h-10 rounded-xl gap-1.5 font-bold text-[10px] uppercase text-destructive hover:bg-destructive/10"
                        title="Hapus tab kustom ini"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus Tab
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {matchingOfficials.map((official) => {
                    const primaryField = fields[0] || "Nama";
                    const secondaryField = fields[1] || "Jabatan";

                    const titleVal = official[primaryField] ||
                      (official.customFields && official.customFields[primaryField]) ||
                      official.name || "-";

                    const badgeVal = official[secondaryField] ||
                      (official.customFields && official.customFields[secondaryField]) ||
                      official.jabatan;

                    const extraFields = fields.slice(1);

                    return (
                      <Card key={official.id} className="border-none shadow-sm rounded-[1.5rem] overflow-hidden group hover:shadow-xl transition-all bg-white border border-primary/5">
                        <CardHeader className="p-5 pb-3 flex-row items-start justify-between">
                          <div className="flex-1 overflow-hidden space-y-2">
                            {badgeVal && badgeVal !== "-" && (
                              <Badge variant="outline" className="w-fit text-[9px] uppercase font-black text-primary border-primary/20 bg-primary/5">
                                {badgeVal}
                              </Badge>
                            )}
                            <CardTitle className="text-base font-black truncate text-slate-800 leading-snug">
                              {titleVal}
                            </CardTitle>

                            {/* Tampilan Kondisional Kolom Tambahan */}
                            <div className="flex flex-col gap-1 pt-1">
                              {extraFields.map((f) => {
                                if (f === secondaryField) return null; // Sudah di badge atas
                                const lower = f.toLowerCase();
                                const val = official[f] ||
                                  (official.customFields && official.customFields[f]) ||
                                  (lower === "nip" ? official.nip : "") ||
                                  (lower === "alamat" ? (official.alamat || official.address || "") : "");

                                if (!val || val === "-") return null;

                                return (
                                  <div key={f} className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 w-fit max-w-full">
                                    {lower.includes("nip") || lower.includes("nik") ? (
                                      <CreditCard className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                                    ) : lower.includes("alamat") || lower.includes("dusun") ? (
                                      <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                                    ) : (
                                      <Tag className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                                    )}
                                    <span className="text-[9px] font-black uppercase text-slate-400 shrink-0">{f}:</span>
                                    <span className="font-bold text-slate-800 truncate">{val}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl font-black uppercase text-[10px] p-2">
                              <DropdownMenuItem className="rounded-xl cursor-pointer" onClick={() => handleOpenEditModal(official)}>
                                <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Data
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive rounded-xl cursor-pointer" onClick={() => {
                                setDeletingOfficial(official);
                                setIsDeleteSingleConfirmOpen(true);
                              }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus Permanen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </CardHeader>
                        <CardContent className="p-5 pt-0">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold">
                            <User className="h-3 w-3 text-primary/40" />
                            Database ID: <span className="font-mono">{official.id.substring(0, 6)}...</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {matchingOfficials.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2.5rem] text-muted-foreground border-slate-100 bg-slate-50/30 space-y-2">
                      <p className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">Belum ada data di kategori {cat}</p>
                      <Button
                        onClick={handleOpenAddModal}
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-[10px] font-black uppercase"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Data Sekarang
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </section>

      {/* ── MODAL TAMBAH TAB BARU (CUSTOM TAB BUILDER) ────────────────────────── */}
      <Dialog open={isAddTabModalOpen} onOpenChange={setIsAddTabModalOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-6 sm:p-8 max-w-lg bg-white">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
              <DialogTitle className="font-black uppercase text-lg text-primary">Tambah Tab / Kategori Baru</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Isi judul tab dan tentukan kolom data yang ingin ditambahkan (kondisional per tab).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* 1. Isi Judul Tab */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-600 ml-1">1. Isi Judul Tab</Label>
              <Input
                value={newTabTitle}
                onChange={(e) => setNewTabTitle(e.target.value)}
                placeholder="Contoh: Karang Taruna, Linmas, BPD, Posyandu..."
                className="h-12 rounded-xl font-bold"
              />
            </div>

            {/* 2. Tambah Kolom Isian */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase text-slate-600 ml-1">2. Atur Kolom / Isian Form</Label>
                <span className="text-[9px] font-bold text-muted-foreground">{newTabFields.length} kolom dipilih</span>
              </div>

              {/* Tombol Cepat Klik (+) */}
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold uppercase text-slate-400 ml-1">Klik (+) Kolom Cepat:</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_FIELD_SUGGESTIONS.map((suggestion) => {
                    const isAdded = newTabFields.includes(suggestion);
                    return (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          if (!isAdded) {
                            setNewTabFields([...newTabFields, suggestion]);
                          }
                        }}
                        disabled={isAdded}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1",
                          isAdded
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                            : "bg-primary/5 text-primary hover:bg-primary hover:text-white border border-primary/20 shadow-xs"
                        )}
                      >
                        <Plus className="h-3 w-3" />
                        {suggestion}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input Kolom Kustom Lain */}
              <div className="flex gap-2 pt-1">
                <Input
                  value={customFieldInput}
                  onChange={(e) => setCustomFieldInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = customFieldInput.trim();
                      if (val && !newTabFields.includes(val)) {
                        setNewTabFields([...newTabFields, val]);
                        setCustomFieldInput("");
                      }
                    }
                  }}
                  placeholder="Ketik nama kolom kustom lain (misal: Unit Kerja)..."
                  className="h-10 rounded-xl text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const val = customFieldInput.trim();
                    if (val && !newTabFields.includes(val)) {
                      setNewTabFields([...newTabFields, val]);
                      setCustomFieldInput("");
                    }
                  }}
                  disabled={!customFieldInput.trim()}
                  className="h-10 rounded-xl px-3 font-bold text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
                </Button>
              </div>

              {/* Daftar Kolom Terpilih */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <p className="text-[9px] font-black uppercase text-slate-500">Urutan Kolom Formulir & Tabel:</p>
                <div className="flex flex-wrap gap-2">
                  {newTabFields.map((field, idx) => (
                    <div
                      key={field}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl shadow-xs text-xs font-bold"
                    >
                      <span className="text-[10px] text-primary font-black">{idx + 1}.</span>
                      <span>{field}</span>
                      <button
                        type="button"
                        onClick={() => setNewTabFields(newTabFields.filter(f => f !== field))}
                        className="ml-1 text-slate-400 hover:text-destructive transition-colors"
                        title={`Hapus kolom ${field}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {newTabFields.length === 0 && (
                    <p className="text-xs text-amber-600 font-bold italic py-1">Belum ada kolom. Klik tombol kolom cepat di atas.</p>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Pengaturan Integrasi Menu */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Label className="text-[10px] font-black uppercase text-slate-600 ml-1">3. Integrasi Menu Pilihan</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Pilihan Masuk ke SPPD */}
                <div
                  onClick={() => setNewTabIncludeInSppd(!newTabIncludeInSppd)}
                  className={cn(
                    "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                    newTabIncludeInSppd ? "bg-emerald-50/60 border-emerald-300 text-emerald-950 shadow-xs" : "bg-slate-50 border-slate-200 text-slate-500"
                  )}
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-black uppercase">Masuk ke SPPD</p>
                    <p className="text-[10px] font-medium leading-tight">Muncul di pilihan Lembaga/Jabatan menu /sppd/</p>
                  </div>
                  <Switch
                    checked={newTabIncludeInSppd}
                    onCheckedChange={setNewTabIncludeInSppd}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Pilihan Masuk ke Cetak Dokumen */}
                <div
                  onClick={() => setNewTabIncludeInCetakDokumen(!newTabIncludeInCetakDokumen)}
                  className={cn(
                    "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                    newTabIncludeInCetakDokumen ? "bg-blue-50/60 border-blue-300 text-blue-950 shadow-xs" : "bg-slate-50 border-slate-200 text-slate-500"
                  )}
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-black uppercase">Masuk ke Cetak Dokumen</p>
                    <p className="text-[10px] font-medium leading-tight">Muncul di pilihan peserta /dokumen-penunjang/</p>
                  </div>
                  <Switch
                    checked={newTabIncludeInCetakDokumen}
                    onCheckedChange={setNewTabIncludeInCetakDokumen}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsAddTabModalOpen(false)}
              className="h-12 rounded-xl font-bold uppercase w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleCreateCustomTab}
              disabled={!newTabTitle.trim() || newTabFields.length === 0}
              className="h-12 rounded-xl font-black uppercase bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 w-full sm:flex-1"
            >
              Simpan & Buat Tab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL TAMBAH PERSONEL (DINAMIS SESUAI KOLOM TAB) ──────────────────── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-6 sm:p-8 max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-lg text-primary">Tambah Data {activeTab}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-semibold">
              Isian berikut disesuaikan dengan pengaturan kolom pada tab <strong>{activeTab}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
            {getFieldsForTab(activeTab).map((field, idx) => (
              <div key={field} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase text-slate-600 ml-1">
                    {field} {idx === 0 && <span className="text-destructive">*</span>}
                  </Label>
                  <span className="text-[9px] text-slate-400 font-bold">Kolom {idx + 1}</span>
                </div>
                <Input
                  value={formValues[field] || ""}
                  onChange={(e) => setFormValues(prev => ({ ...prev, [field]: e.target.value }))}
                  placeholder={`Ketik ${field.toLowerCase()}...`}
                  className="h-11 rounded-xl font-medium"
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              onClick={handleSaveAdd}
              disabled={!formValues[getFieldsForTab(activeTab)[0]]}
              className="w-full h-12 rounded-xl font-black uppercase shadow-lg shadow-primary/20"
            >
              Simpan Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL EDIT PERSONEL (DINAMIS SESUAI KOLOM TAB) ────────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-6 sm:p-8 max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-lg text-primary">Edit Data</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-semibold">
              Perbarui rincian data untuk kategori <strong>{editingOfficial?.category || activeTab}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
            {getFieldsForTab(editingOfficial?.category || activeTab).map((field, idx) => (
              <div key={field} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase text-slate-600 ml-1">
                    {field} {idx === 0 && <span className="text-destructive">*</span>}
                  </Label>
                  <span className="text-[9px] text-slate-400 font-bold">Kolom {idx + 1}</span>
                </div>
                <Input
                  value={formValues[field] || ""}
                  onChange={(e) => setFormValues(prev => ({ ...prev, [field]: e.target.value }))}
                  placeholder={`Ketik ${field.toLowerCase()}...`}
                  className="h-11 rounded-xl font-medium"
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              onClick={handleSaveEdit}
              className="w-full h-12 rounded-xl font-black uppercase shadow-lg shadow-primary/20"
            >
              Perbarui Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG KONFIRMASI HAPUS SINGLE ───────────────────────────────────── */}
      <Dialog open={isDeleteSingleConfirmOpen} onOpenChange={setIsDeleteSingleConfirmOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-xs text-center">
          <DialogHeader className="items-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <DialogTitle className="font-black uppercase text-destructive">Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-xs font-bold uppercase text-slate-500 leading-relaxed">
              Hapus <strong>{deletingOfficial?.name || deletingOfficial?.nama}</strong> dari database secara permanen?
            </p>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button variant="destructive" onClick={handleConfirmDeleteSingle} className="w-full h-12 rounded-2xl font-black uppercase shadow-lg shadow-destructive/20">
              Ya, Hapus Data
            </Button>
            <Button variant="ghost" onClick={() => setIsDeleteSingleConfirmOpen(false)} className="w-full h-12 rounded-2xl font-bold uppercase">
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG KONFIRMASI HAPUS TAB KUSTOM ────────────────────────────────── */}
      <AlertDialog open={!!deletingTab} onOpenChange={(open) => !open && setDeletingTab(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-none p-8">
          <AlertDialogHeader className="items-center text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <Trash2 className="h-8 w-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-lg font-black uppercase text-destructive">
              Hapus Tab &ldquo;{deletingTab}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-xs uppercase text-slate-500 leading-relaxed">
              Tab kustom ini akan dihapus dari daftar tab. Data personil yang sudah tersimpan di database tetap tersimpan dengan aman.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <AlertDialogCancel className="h-11 rounded-xl font-bold uppercase w-full">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTab && handleDeleteCustomTab(deletingTab)}
              className="h-11 rounded-xl font-black uppercase bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20 w-full"
            >
              Ya, Hapus Tab
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── DIALOG KONFIRMASI HAPUS SELURUH DATABASE ─────────────────────────── */}
      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent className="rounded-[2.5rem] border-none p-8">
          <AlertDialogHeader className="items-center text-center">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Trash2 className="h-10 w-10 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl font-black uppercase text-destructive">Hapus Seluruh Database?</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-xs uppercase text-slate-500 leading-relaxed">
              Tindakan ini akan menghapus SEMUA data personel di seluruh kategori dari Firestore. Pastikan Anda sudah memiliki cadangan (Ekspor Excel).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
            <AlertDialogCancel className="h-12 rounded-2xl font-bold uppercase w-full">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="h-12 rounded-2xl font-black uppercase bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20 w-full" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Ya, Hapus Semua"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MODAL EDIT RINCIAN KOLOM TAB ────────────────────────────────────── */}
      <Dialog open={isEditTabModalOpen} onOpenChange={setIsEditTabModalOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-6 sm:p-8 max-w-lg bg-white">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <DialogTitle className="font-black uppercase text-lg text-primary">
                Atur Kolom: {editingTabTitle}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Tambah atau kurangi rincian kolom isian formulir &amp; tabel pada tab <strong>{editingTabTitle}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* Tombol Cepat Klik (+) */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-black uppercase text-slate-500 ml-1">Tambah Kolom Cepat (+):</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_FIELD_SUGGESTIONS.map((suggestion) => {
                  const isAdded = editingTabFields.includes(suggestion);
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        if (!isAdded) {
                          setEditingTabFields([...editingTabFields, suggestion]);
                        }
                      }}
                      disabled={isAdded}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1",
                        isAdded
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                          : "bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 shadow-xs"
                      )}
                    >
                      <Plus className="h-3 w-3" />
                      {suggestion}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Kolom Kustom Lain */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-600 ml-1">Atau Ketik Nama Kolom Kustom:</Label>
              <div className="flex gap-2">
                <Input
                  value={editCustomFieldInput}
                  onChange={(e) => setEditCustomFieldInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = editCustomFieldInput.trim();
                      if (val && !editingTabFields.includes(val)) {
                        setEditingTabFields([...editingTabFields, val]);
                        setEditCustomFieldInput("");
                      }
                    }
                  }}
                  placeholder="Contoh: Unit Kerja, No SK, Golongan..."
                  className="h-10 rounded-xl text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const val = editCustomFieldInput.trim();
                    if (val && !editingTabFields.includes(val)) {
                      setEditingTabFields([...editingTabFields, val]);
                      setEditCustomFieldInput("");
                    }
                  }}
                  disabled={!editCustomFieldInput.trim()}
                  className="h-10 rounded-xl px-3 font-bold text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
                </Button>
              </div>
            </div>

            {/* Daftar Kolom Terpilih */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase text-slate-600">
                  Daftar Rincian Kolom Aktif ({editingTabFields.length}):
                </p>
                <span className="text-[9px] text-muted-foreground font-semibold">Klik (×) untuk mengurangi</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {editingTabFields.map((field, idx) => (
                  <div
                    key={field}
                    className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl shadow-xs text-xs font-bold"
                  >
                    <span className="text-[10px] text-primary font-black">{idx + 1}.</span>
                    <span>{field}</span>
                    <button
                      type="button"
                      onClick={() => setEditingTabFields(editingTabFields.filter(f => f !== field))}
                      className="ml-1 text-slate-400 hover:text-destructive transition-colors"
                      title={`Hapus kolom ${field}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {editingTabFields.length === 0 && (
                  <p className="text-xs text-amber-600 font-bold italic py-1">Belum ada kolom. Klik tombol kolom cepat di atas.</p>
                )}
              </div>
            </div>

            {/* Pengaturan Integrasi Menu */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Label className="text-[10px] font-black uppercase text-slate-600 ml-1">Pengaturan Integrasi Menu Pilihan</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Pilihan Masuk ke SPPD */}
                <div
                  onClick={() => setEditingTabIncludeInSppd(!editingTabIncludeInSppd)}
                  className={cn(
                    "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                    editingTabIncludeInSppd ? "bg-emerald-50/60 border-emerald-300 text-emerald-950 shadow-xs" : "bg-slate-50 border-slate-200 text-slate-500"
                  )}
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-black uppercase">Masuk ke SPPD</p>
                    <p className="text-[10px] font-medium leading-tight">Muncul di pilihan Lembaga/Jabatan menu /sppd/</p>
                  </div>
                  <Switch
                    checked={editingTabIncludeInSppd}
                    onCheckedChange={setEditingTabIncludeInSppd}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Pilihan Masuk ke Cetak Dokumen */}
                <div
                  onClick={() => setEditingTabIncludeInCetakDokumen(!editingTabIncludeInCetakDokumen)}
                  className={cn(
                    "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                    editingTabIncludeInCetakDokumen ? "bg-blue-50/60 border-blue-300 text-blue-950 shadow-xs" : "bg-slate-50 border-slate-200 text-slate-500"
                  )}
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-black uppercase">Masuk ke Cetak Dokumen</p>
                    <p className="text-[10px] font-medium leading-tight">Muncul di pilihan peserta /dokumen-penunjang/</p>
                  </div>
                  <Switch
                    checked={editingTabIncludeInCetakDokumen}
                    onCheckedChange={setEditingTabIncludeInCetakDokumen}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsEditTabModalOpen(false)}
              className="h-12 rounded-xl font-bold uppercase w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveEditTabFields}
              disabled={editingTabFields.length === 0}
              className="h-12 rounded-xl font-black uppercase bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 w-full sm:flex-1"
            >
              Simpan Perubahan Kolom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
