'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { PelayananDoc, DriveSettingsInfo, LetterSubmission } from '@/lib/types';
import { PELAYANAN_CATEGORIES, getCategoryLabel } from '@/lib/pelayanan-categories';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Save,
  Trash2,
  Edit,
  FileUp,
  FileText,
  ExternalLink,
  Globe,
  Cloud,
  Link2,
  FilePlus,
  FileCheck,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  MoreHorizontal,
  Eye,
  Ticket
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn, formatDateToDDMMYYYY } from '@/lib/utils';
import { updateSubmissionStatus, deleteSubmission } from '@/lib/submissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

/** Extracts a Google Drive folder ID from a full URL or returns the raw ID. */
function extractFolderId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  const id = match ? match[1] : trimmed;
  return id.split('?')[0].split('#')[0];
}

export default function AdminPelayananPage() {
  const [activeTab, setActiveTab] = useState<'surat' | 'dokumen'>('surat');

  // Pelayanan Docs Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<PelayananDoc | null>(null);
  const [fileToUpload, setSelectedFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  // Submissions search & detail states
  const [searchSubmission, setSearchSubmission] = useState('');
  const [selectedSubForDetail, setSelectedSubForDetail] = useState<LetterSubmission | null>(null);

  const isImageCategory = category === 'visi-misi' || category === 'maklumat' || category === 'pojok-baca';

  useEffect(() => {
    if (!editingDoc) {
      setSelectedFile(null);
      setImagePreview('');
      setLink('');
    }
  }, [category, editingDoc]);

  const firestore = useFirestore();
  const { toast } = useToast();

  // Queries
  const docsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'pelayananDocs'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'submissions'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: documents, isLoading: isLoadingDocs } = useCollection<PelayananDoc>(docsQuery);
  const { data: submissions, isLoading: isLoadingSubs } = useCollection<LetterSubmission>(submissionsQuery);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (file: File, docTitle: string) => {
    if (!firestore) return null;
    setIsUploading(true);
    try {
      const driveRef = doc(firestore, 'driveSettings', 'default');
      const driveSnap = await getDoc(driveRef);
      if (!driveSnap.exists()) throw new Error("Konfigurasi Google Drive belum diatur di menu Pengaturan.");

      const driveData = driveSnap.data() as DriveSettingsInfo;
      const appsScriptUrl = (driveData.appsScriptUrl || '').trim();
      const rootFolderId = extractFolderId(driveData.rootFolderId || '');

      if (!appsScriptUrl || !rootFolderId) throw new Error("URL Apps Script atau ID Folder Utama belum lengkap.");

      const base64Data = await convertFileToBase64(file);
      const payload = {
        rootFolderId,
        folderName: "PELAYANAN Kecamatan",
        letterType: "Informasi Publik",
        requesterName: "ADMIN",
        files: [{
          base64Data,
          mimeType: file.type,
          targetFileName: docTitle.toUpperCase().replace(/\s+/g, '_'),
        }]
      };

      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow',
      });

      const resultText = await response.text();
      let result;
      try {
        result = JSON.parse(resultText);
      } catch {
        throw new Error("Respons Apps Script bukan JSON valid: " + resultText.substring(0, 200));
      }

      if (result.status !== 'success') throw new Error(result.message || "Gagal unggah ke Drive.");
      return result.files[0].fileId;
    } catch (err: any) {
      console.error('[Drive Upload] Error:', err);
      toast({ title: "Gagal Unggah Berkas", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal mengunggah berkas.');
      }
      const data = await res.json();
      return data.url;
    } catch (err: any) {
      toast({ title: "Gagal Mengunggah Gambar", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file && isImageCategory) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview('');
    }
  };

  const handleSubmitDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || isSubmitting) return;

    if (!category || !title.trim()) {
      toast({ title: "Data Belum Lengkap", variant: "destructive" });
      return;
    }

    if (!editingDoc && !fileToUpload) {
      toast({
        title: "Pilih Berkas",
        description: isImageCategory ? "Mohon pilih berkas gambar yang akan diunggah." : "Mohon pilih file PDF yang akan diunggah.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingDoc) {
        const updateData: any = {
          title: title.toUpperCase(),
          category,
        };
        if (category === 'pojok-baca') {
          updateData.link = link;
        } else {
          updateData.link = null;
        }
        await updateDoc(doc(firestore, 'pelayananDocs', editingDoc.id), updateData);
        toast({ title: "Data Diperbarui" });
      } else {
        let fileId = '';
        let fileName = fileToUpload!.name;

        if (isImageCategory) {
          const uploadedUrl = await handleImageUpload(fileToUpload!);
          if (!uploadedUrl) {
            setIsSubmitting(false);
            return;
          }
          fileId = uploadedUrl;
        } else {
          const driveFileId = await handleFileUpload(fileToUpload!, title);
          if (!driveFileId) {
            setIsSubmitting(false);
            return;
          }
          fileId = driveFileId;
        }

        const docData: any = {
          title: title.toUpperCase(),
          category,
          fileId,
          fileName,
          createdAt: serverTimestamp(),
        };

        if (category === 'pojok-baca') {
          docData.link = link;
        }

        await addDoc(collection(firestore, 'pelayananDocs'), docData);
        toast({ title: "Dokumen Berhasil Disimpan" });
      }

      setTitle('');
      setCategory('');
      setSelectedFile(null);
      setEditingDoc(null);
      setLink('');
      setImagePreview('');
    } catch (error: any) {
      toast({ title: "Terjadi Kesalahan", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleEditDoc = (item: PelayananDoc) => {
    setEditingDoc(item);
    setTitle(item.title);
    setCategory(item.category);
    setLink(item.link || '');
  };

  const handleDeleteDoc = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'pelayananDocs', id));
      toast({ title: "Dokumen Dihapus" });
    } catch (error: any) {
      toast({ title: "Gagal Menghapus", variant: "destructive" });
    }
  };

  // Submissions actions
  const handleQuickUpdateStatus = async (sub: LetterSubmission, newStatus: string) => {
    if (!firestore) return;
    try {
      await updateSubmissionStatus(firestore, sub.id, newStatus);
      toast({
        title: newStatus === 'APPROVED' ? 'Pengajuan Disetujui' : newStatus === 'REJECTED' ? 'Pengajuan Ditolak' : 'Status Diperbarui',
        description: `Status pengajuan warga berhasil diubah menjadi ${newStatus === 'APPROVED' ? 'DISETUJUI' : newStatus === 'REJECTED' ? 'DITOLAK' : 'MENUNGGU'}.`,
      });
      if (selectedSubForDetail && selectedSubForDetail.id === sub.id) {
        setSelectedSubForDetail({ ...selectedSubForDetail, status: newStatus });
      }
    } catch (error: any) {
      toast({ title: "Gagal Memperbarui Status", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteSub = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteSubmission(firestore, id);
      toast({ title: "Pengajuan Dihapus" });
      if (selectedSubForDetail && selectedSubForDetail.id === id) {
        setSelectedSubForDetail(null);
      }
    } catch (error: any) {
      toast({ title: "Gagal Menghapus", variant: "destructive" });
    }
  };

  // Filter submissions by search query
  const filteredSubmissions = submissions?.filter((s) => {
    if (!searchSubmission.trim()) return true;
    const term = searchSubmission.toLowerCase();
    return (
      (s.letterType || '').toLowerCase().includes(term) ||
      (s.formData?.name || s.formData?.nama || s.requesterName || '').toLowerCase().includes(term) ||
      (s.formData?.nik || s.nik || '').toLowerCase().includes(term) ||
      (s.ticketNumber || '').toLowerCase().includes(term) ||
      (s.formData?.purpose || s.formData?.maksudTujuan || (s as any).maksudTujuan || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-6 pb-16 max-w-7xl mx-auto animate-fade-in-up">

      <PageHeader
        title="Manajemen Pengajuan Layanan Warga"
        description="Pantau dan kelola rincian pengajuan layanan warga serta persetujuan berkas secara terpadu."
      >
        <Button asChild size="default" className="rounded-xl font-bold uppercase tracking-wide bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md shadow-amber-500/20 text-white border-none text-xs hover:scale-[1.02] transition-all">
          <Link href="/pengajuan-surat">
            <FilePlus className="mr-1.5 h-4 w-4" /> Buka Layanan Warga
          </Link>
        </Button>
      </PageHeader>

      {/* KELOLA PENGAJUAN LAYANAN WARGA */}
      <Card className="rounded-2xl md:rounded-3xl border border-border/70 shadow-md shadow-blue-950/5 overflow-hidden bg-card/85 backdrop-blur-md">
        <CardHeader className="p-5 md:p-6 border-b border-border/70 bg-gradient-to-r from-blue-500/10 via-primary/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <CardTitle className="text-base md:text-lg font-black uppercase tracking-tight text-foreground">Daftar Pengajuan Layanan Warga</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground font-medium">
              Daftar seluruh permohonan layanan yang diajukan oleh warga via sistem.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-72">
            <Input
              placeholder="Cari Pemohon, NIK, Jenis Layanan, Tiket..."
              value={searchSubmission}
              onChange={(e) => setSearchSubmission(e.target.value)}
              className="h-10 rounded-xl pl-9 text-xs font-semibold bg-background/80 backdrop-blur-sm border-border/80 shadow-xs focus:ring-2 focus:ring-primary/30"
            />
            <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </CardHeader>



        <CardContent className="p-0">
          {/* MOBILE VIEW: RINGKAS PER KARTU (TIDAK PERLU MENGGESER TABLE) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {isLoadingSubs ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded-lg" />
                  <Skeleton className="h-3 w-1/2 rounded-lg" />
                </div>
              ))
            ) : filteredSubmissions?.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Belum ada pengajuan layanan warga.
              </div>
            ) : (
              filteredSubmissions?.map((sub) => (
                <div key={sub.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-sm uppercase text-slate-900 leading-tight">
                        {sub.formData?.name || sub.formData?.nama || sub.requesterName || 'Pemohon'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">NIK: {sub.formData?.nik || sub.nik || '-'}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSubForDetail(sub)}
                        className="h-8 px-2.5 rounded-xl font-bold text-xs text-primary border-primary/20 bg-primary/5 hover:bg-primary hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Rincian
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 shrink-0">
                            <MoreHorizontal className="h-4 w-4 text-slate-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-2xl border-slate-100 bg-white">
                          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1">
                            OPSI TINDAKAN
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem onClick={() => setSelectedSubForDetail(sub)} className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 hover:bg-slate-50">
                            <Eye className="h-4 w-4 text-slate-600" />
                            <span>Lihat Rincian</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleQuickUpdateStatus(sub, 'APPROVED')} className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 text-emerald-600 hover:bg-emerald-50">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>Setujui Pengajuan</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleQuickUpdateStatus(sub, 'REJECTED')} className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 text-red-500 hover:bg-red-50">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span>Tolak Pengajuan</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem onClick={() => handleDeleteSub(sub.id)} className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 text-red-500 hover:bg-red-50">
                            <Trash2 className="h-4 w-4 text-red-500" />
                            <span>Hapus Permanen</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <div className="space-y-0.5">
                      <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-500/10 text-blue-700 border border-blue-500/20">
                        {sub.letterType}
                      </Badge>
                      {(sub.formData?.purpose || sub.formData?.maksudTujuan || (sub as any).maksudTujuan) && (
                        <p className="text-[10px] font-medium text-slate-500 line-clamp-1 max-w-[220px]">
                          {sub.formData?.purpose || sub.formData?.maksudTujuan || (sub as any).maksudTujuan}
                        </p>
                      )}
                    </div>

                    <div>
                      {sub.status === 'APPROVED' || sub.status === 'COMPLETED' || sub.status === 'disetujui' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-700 text-white tracking-wider">
                          DISETUJUI
                        </span>
                      ) : sub.status === 'REJECTED' || sub.status === 'ditolak' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-600 text-white tracking-wider">
                          DITOLAK
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500 text-white tracking-wider">
                          MENUNGGU
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kode Tiket & Berkas Drive Info */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <Ticket className="h-3 w-3 text-slate-400" />
                      <span className="font-mono font-bold text-slate-700">
                        {sub.ticketNumber || '-'}
                      </span>
                    </div>

                    {sub.driveFiles && sub.driveFiles.length > 0 ? (
                      <div className="flex items-center gap-1">
                        {sub.driveFiles.map((f: any, idx: number) => (
                          <a
                            key={idx}
                            href={f.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 border border-blue-200"
                          >
                            <span>{f.fieldName === 'uploadKK' ? 'KK' : f.fieldName === 'uploadKTP' ? 'KTP' : `F${idx + 1}`}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Tanpa Berkas</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP VIEW: STANDARD TABLE */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/40 border-b border-border/60">
                <TableRow className="border-border/60">
                  <TableHead className="pl-8 font-black uppercase text-[9px] tracking-[0.2em] text-muted-foreground">Pemohon & NIK</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-[0.2em] text-muted-foreground">Jenis Layanan & Maksud</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-[0.2em] text-muted-foreground">Kode Tiket & Tanggal</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-[0.2em] text-muted-foreground">Lampiran Drive</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-[0.2em] text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right pr-8 font-black uppercase text-[9px] tracking-[0.2em] text-muted-foreground">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSubs ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6} className="p-8"><Skeleton className="h-10 w-full rounded-xl" /></TableCell></TableRow>
                  ))
                ) : filteredSubmissions?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground font-medium italic">Belum ada pengajuan layanan warga.</TableCell></TableRow>
                ) : (
                  filteredSubmissions?.map((sub) => (
                    <TableRow key={sub.id} className="hover:bg-primary/5 group transition-all border-border/40">
                      <TableCell className="pl-8 py-4">
                        <div className="space-y-0.5">
                          <p className="font-black text-sm uppercase text-foreground leading-tight">
                            {sub.formData?.name || sub.formData?.nama || sub.requesterName || 'Pemohon'}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground">NIK: {sub.formData?.nik || sub.nik || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-500/10 text-blue-700 border border-blue-500/20">
                            {sub.letterType}
                          </Badge>
                          {(sub.formData?.purpose || sub.formData?.maksudTujuan || (sub as any).maksudTujuan) && (
                            <p className="text-[10px] font-medium text-slate-500 truncate max-w-[220px]">
                              {sub.formData?.purpose || sub.formData?.maksudTujuan || (sub as any).maksudTujuan}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 font-mono font-bold text-xs text-slate-800">
                            <Ticket className="h-3 w-3 text-slate-400" />
                            <span>{sub.ticketNumber || '-'}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {sub.createdAt ? formatDateToDDMMYYYY(sub.createdAt) : '-'}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        {sub.driveFiles && sub.driveFiles.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {sub.driveFiles.map((file: any, idx: number) => {
                              const label = file.fieldName === 'uploadKK' ? 'KK' : file.fieldName === 'uploadKTP' ? 'KTP' : file.fileName || `Berkas ${idx + 1}`;
                              return (
                                <a
                                  key={idx}
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100 hover:text-blue-800 border border-blue-200 transition-colors"
                                  title={`Buka ${file.fileName || label} di Google Drive`}
                                >
                                  <span>{label}</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Tidak ada berkas</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {sub.status === 'APPROVED' || sub.status === 'COMPLETED' || sub.status === 'disetujui' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-700 text-white tracking-wider">
                            DISETUJUI
                          </span>
                        ) : sub.status === 'REJECTED' || sub.status === 'ditolak' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-600 text-white tracking-wider">
                            DITOLAK
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white tracking-wider">
                            MENUNGGU
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedSubForDetail(sub)}
                            className="h-8 px-3 rounded-xl font-bold text-xs text-primary border-primary/20 bg-primary/5 hover:bg-primary hover:text-white transition-all shadow-xs"
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" /> Rincian
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100">
                                <MoreHorizontal className="h-4 w-4 text-slate-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-2xl border-slate-100 bg-white">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1">
                                OPSI TINDAKAN
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => setSelectedSubForDetail(sub)}
                                className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 hover:bg-slate-50"
                              >
                                <Eye className="h-4 w-4 text-slate-600" />
                                <span>Lihat Rincian</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleQuickUpdateStatus(sub, 'APPROVED')}
                                className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 text-emerald-600 hover:bg-emerald-50"
                              >
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span>Setujui Pengajuan</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleQuickUpdateStatus(sub, 'REJECTED')}
                                className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 text-red-500 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span>Tolak Pengajuan</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handleDeleteSub(sub.id)}
                                className="rounded-xl px-3 py-2 cursor-pointer font-bold text-xs flex items-center gap-2.5 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                                <span>Hapus Permanen</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

      </Card>

      {/* DIALOG RINCIAN & PERSETUJUAN PENGAJUAN LAYANAN */}
      <Dialog open={!!selectedSubForDetail} onOpenChange={() => setSelectedSubForDetail(null)}>
        <DialogContent className="rounded-[2.5rem] max-w-xl p-8 max-h-[88vh] overflow-y-auto bg-white shadow-2xl border-slate-100">
          <DialogHeader className="space-y-2 text-left border-b pb-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" className="w-fit text-[10px] font-black uppercase px-3 py-1 bg-blue-500/10 text-blue-700 border border-blue-500/20">
                {selectedSubForDetail?.letterType || 'Pengajuan Layanan'}
              </Badge>
              {selectedSubForDetail?.ticketNumber && (
                <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                  <Ticket className="h-3.5 w-3.5 text-slate-400" />
                  <span>{selectedSubForDetail.ticketNumber}</span>
                </div>
              )}
            </div>
            <DialogTitle className="text-xl font-black uppercase text-slate-900">
              Rincian Pengajuan Layanan Warga
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Periksa kelengkapan data pemohon dan berkas lampiran, lalu tentukan persetujuan pengajuan.
            </DialogDescription>
          </DialogHeader>

          {selectedSubForDetail && (
            <div className="space-y-5 py-4 text-xs">
              {/* Status Banner */}
              <div className={cn(
                "p-4 rounded-2xl flex items-center justify-between border",
                selectedSubForDetail.status === 'APPROVED' || selectedSubForDetail.status === 'COMPLETED' || selectedSubForDetail.status === 'disetujui'
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                  : selectedSubForDetail.status === 'REJECTED' || selectedSubForDetail.status === 'ditolak'
                  ? "bg-red-50/70 border-red-200 text-red-800"
                  : "bg-amber-50/70 border-amber-200 text-amber-800"
              )}>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider block opacity-70">STATUS PENGAJUAN SAAT INI</span>
                  <p className="font-black text-sm uppercase">
                    {selectedSubForDetail.status === 'APPROVED' || selectedSubForDetail.status === 'COMPLETED' || selectedSubForDetail.status === 'disetujui'
                      ? 'DISETUJUI'
                      : selectedSubForDetail.status === 'REJECTED' || selectedSubForDetail.status === 'ditolak'
                      ? 'DITOLAK'
                      : 'MENUNGGU PERSETUJUAN'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleQuickUpdateStatus(selectedSubForDetail, 'APPROVED')}
                    className="h-8 px-3 rounded-xl font-black uppercase text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Setujui
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickUpdateStatus(selectedSubForDetail, 'REJECTED')}
                    className="h-8 px-3 rounded-xl font-black uppercase text-[10px] border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5" /> Tolak
                  </Button>
                </div>
              </div>

              {/* Data Pemohon */}
              <div className="p-5 rounded-2xl bg-slate-50 border space-y-3">
                <h4 className="font-black uppercase text-[10px] tracking-wider text-slate-400 border-b pb-1">DATA PEMOHON</h4>
                <div className="grid grid-cols-2 gap-3 font-medium">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Nama Lengkap</span>
                    <span className="font-bold text-slate-800 uppercase">{selectedSubForDetail.formData?.name || selectedSubForDetail.formData?.nama || selectedSubForDetail.requesterName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block">NIK</span>
                    <span className="font-mono font-bold text-slate-800">{selectedSubForDetail.formData?.nik || selectedSubForDetail.nik || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Alamat</span>
                    <span className="font-semibold text-slate-700">{selectedSubForDetail.formData?.address || selectedSubForDetail.formData?.alamat || (selectedSubForDetail as any).alamat || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Maksud / Tujuan */}
              {(selectedSubForDetail.formData?.purpose || selectedSubForDetail.formData?.maksudTujuan || (selectedSubForDetail as any).maksudTujuan) && (
                <div className="space-y-1.5">
                  <span className="font-black text-[10px] uppercase text-slate-400">Maksud / Tujuan Pengajuan</span>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-semibold leading-relaxed">
                    {selectedSubForDetail.formData?.purpose || selectedSubForDetail.formData?.maksudTujuan || (selectedSubForDetail as any).maksudTujuan}
                  </div>
                </div>
              )}

              {/* Berkas Lampiran Google Drive */}
              {selectedSubForDetail.driveFiles && selectedSubForDetail.driveFiles.length > 0 && (
                <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
                  <h4 className="font-black uppercase text-[10px] tracking-wider text-blue-800 flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> BERKAS LAMPIRAN GOOGLE DRIVE
                  </h4>
                  <div className="space-y-2 pt-1">
                    {selectedSubForDetail.driveFiles.map((file: any, idx: number) => {
                      const label = file.fieldName === 'uploadKK' ? 'Kartu Keluarga (KK)' : file.fieldName === 'uploadKTP' ? 'KTP Pemohon' : file.fileName || `Lampiran ${idx + 1}`;
                      return (
                        <a
                          key={idx}
                          href={file.fileUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-100 hover:border-blue-300 hover:shadow-sm transition-all group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">📄</span>
                            <div>
                              <p className="font-bold text-xs text-slate-800 uppercase line-clamp-1">
                                {label}
                              </p>
                              <p className="text-[10px] text-slate-400">{file.fileName || 'Tersimpan di Google Drive'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1 group-hover:underline shrink-0 bg-blue-50 px-2 py-1 rounded-lg">
                            Buka File <ExternalLink className="h-3 w-3" />
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-end border-t pt-4">
            <Button
              variant="outline"
              className="rounded-xl font-bold px-6"
              onClick={() => setSelectedSubForDetail(null)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
