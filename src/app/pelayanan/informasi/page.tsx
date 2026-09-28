'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Newspaper,
  Plus,
  Search,
  Filter,
  Calendar,
  Image as ImageIcon,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Star,
  StarOff,
  Globe,
  FileText,
  Clock,
  ExternalLink,
  Loader2,
  X,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

import { useFirestore, useUser } from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

export interface NewsItem {
  id: string;
  title: string;
  category: string;
  date: string;
  imageUrl?: string;
  imagePublicId?: string;
  excerpt: string;
  content: string;
  author?: string;
  isFeatured: boolean;
  status: 'published' | 'draft';
  createdAt?: any;
  updatedAt?: any;
}

const CATEGORIES = [
  'Pelayanan',
  'Pengumuman',
  'Pemerintahan',
  'Kegiatan',
  'Pertanian',
  'Kesehatan',
  'Pembangunan',
  'Umum'
];

export default function InformasiAdminPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Pelayanan');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState<'published' | 'draft'>('published');

  // Image Upload State (Cloudinary)
  const [imageUrl, setImageUrl] = useState('');
  const [imagePublicId, setImagePublicId] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Detail / Preview Modal
  const [previewItem, setPreviewItem] = useState<NewsItem | null>(null);

  // Delete Confirmation Dialog
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // 1. Subscribe to Firestore 'informasi' Collection
  useEffect(() => {
    if (!db) return;
    setLoading(true);

    const q = query(collection(db, 'informasi'), orderBy('date', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items: NewsItem[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as NewsItem);
        });
        setNewsList(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching informasi:', err);
        toast({
          variant: 'destructive',
          title: 'Gagal Memuat Data',
          description: 'Terjadi kendala saat menghubungkan ke database informasi.',
        });
        setLoading(false);
      }
    );

    return () => unsub();
  }, [db, toast]);

  // Handle Cloudinary Image Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Ukuran File Terlalu Besar',
        description: 'Maksimal ukuran foto adalah 5MB.',
      });
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-cloudinary/', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengunggah foto ke Cloudinary.');
      }

      setImageUrl(data.url);
      setImagePublicId(data.publicId || '');

      toast({
        title: 'Foto Berhasil Diunggah',
        description: 'Gambar telah tersimpan di Cloudinary dengan aman.',
      });
    } catch (err: any) {
      console.error('Upload Error:', err);
      toast({
        variant: 'destructive',
        title: 'Upload Gagal',
        description: err.message || 'Gagal menghubungi server Cloudinary.',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOpenCreateForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitle('');
    setCategory('Pelayanan');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setExcerpt('');
    setContent('');
    setIsFeatured(false);
    setStatus('published');
    setImageUrl('');
    setImagePublicId('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: NewsItem) => {
    setIsEditing(true);
    setEditingId(item.id);
    setTitle(item.title);
    setCategory(item.category || 'Pelayanan');
    setDate(item.date || format(new Date(), 'yyyy-MM-dd'));
    setExcerpt(item.excerpt || '');
    setContent(item.content || '');
    setIsFeatured(!!item.isFeatured);
    setStatus(item.status || 'published');
    setImageUrl(item.imageUrl || '');
    setImagePublicId(item.imagePublicId || '');
    setIsFormOpen(true);
  };

  const handleSaveForm = async () => {
    if (!db) return;
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Judul Wajib Diisi' });
      return;
    }
    if (!excerpt.trim()) {
      toast({ variant: 'destructive', title: 'Ringkasan / Cuplikan Redaksi Wajib Diisi' });
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      date,
      excerpt: excerpt.trim(),
      content: content.trim(),
      imageUrl: imageUrl.trim(),
      imagePublicId: imagePublicId.trim(),
      isFeatured: !!isFeatured,
      status,
      author: user?.displayName || user?.email || 'Admin Kecamatan',
      updatedAt: serverTimestamp(),
    };

    try {
      if (isEditing && editingId) {
        await updateDoc(doc(db, 'informasi', editingId), payload);
        toast({
          title: 'Berhasil Diperbarui',
          description: 'Informasi telah diperbarui dan langsung tayang sesuai status.',
        });
      } else {
        await addDoc(collection(db, 'informasi'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast({
          title: 'Informasi Baru Diterbitkan',
          description: 'Informasi terkini telah ditambahkan ke sistem.',
        });
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Save error:', err);
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan Data',
        description: err.message || 'Terjadi kendala pada database.',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'informasi', id));
      toast({ title: 'Informasi Dihapus' });
      setDeleteTargetId(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gagal Menghapus', description: err.message });
    }
  };

  const handleToggleFeatured = async (item: NewsItem) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'informasi', item.id), {
        isFeatured: !item.isFeatured,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: !item.isFeatured ? 'Ditetapkan sebagai Berita Utama' : 'Status Berita Utama Dicabut',
        description: !item.isFeatured
          ? 'Artikel ini akan tampil sebagai kartu besar di sisi kiri landing page.'
          : 'Artikel dikembalikan sebagai berita standar.',
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gagal Mengubah', description: err.message });
    }
  };

  const handleToggleStatus = async (item: NewsItem) => {
    if (!db) return;
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'informasi', item.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: newStatus === 'published' ? 'Informasi Dipublikasikan' : 'Informasi Dijadikan Draft',
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gagal Mengubah Status', description: err.message });
    }
  };

  // Filtered News Items
  const filteredList = newsList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalCount = newsList.length;
  const publishedCount = newsList.filter((n) => n.status === 'published').length;
  const draftCount = newsList.filter((n) => n.status === 'draft').length;
  const featuredCount = newsList.filter((n) => n.isFeatured).length;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-[10px] font-black uppercase tracking-wider">
            <Newspaper className="w-3.5 h-3.5 text-blue-600" />
            Modul Pelayanan & Publikasi Warga
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Kelola Informasi Terkini
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
            Kelola berita kegiatan, sosialisasi pelayanan, dan pengumuman kedinasan. Artikel yang dipublikasikan akan langsung tampil pada landing page utama warga.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenCreateForm}
            className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-slate-900/15 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Informasi Baru</span>
          </Button>
        </div>
      </div>

      {/* ── STATS BAR ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Informasi</span>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{totalCount}</span>
        </div>
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Dipublikasikan</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">{publishedCount}</span>
        </div>
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Draft / Arsip</span>
          <span className="text-2xl sm:text-3xl font-black text-amber-700 mt-2">{draftCount}</span>
        </div>
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Berita Utama (Hero)</span>
          <span className="text-2xl sm:text-3xl font-black text-rose-700 mt-2">{featuredCount}</span>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Cari judul atau ringkasan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Kategori Select */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-11 rounded-2xl bg-slate-50 border-slate-200 text-xs font-semibold w-full sm:w-44">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Semua Kategori</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Select */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-11 rounded-2xl bg-slate-50 border-slate-200 text-xs font-semibold w-full sm:w-40">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="published">Dipublikasikan</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── DAFTAR ARTIKEL INFORMASI (GRID) ─────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm animate-pulse space-y-4">
              <div className="aspect-[16/10] bg-slate-100 rounded-2xl w-full" />
              <div className="h-5 bg-slate-100 rounded-full w-2/3" />
              <div className="h-4 bg-slate-100 rounded-lg w-full" />
            </div>
          ))}
        </div>
      ) : filteredList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map((item) => {
            const isPub = item.status === 'published';

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Foto Thumbnail Cloudinary */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                        <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Tanpa Foto</span>
                      </div>
                    )}

                    {/* Badge Berita Utama (Featured) */}
                    {item.isFeatured && (
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" />
                        Berita Utama
                      </div>
                    )}

                    {/* Badge Kategori & Status */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wide">
                        {item.category || 'Umum'}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
                          isPub
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-400 text-slate-950 font-black'
                        }`}
                      >
                        {isPub ? 'Tayang' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  {/* Konten Teks */}
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>{item.date}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-normal">
                      {item.excerpt}
                    </p>
                  </div>
                </div>

                {/* Action Bar Bawah */}
                <div className="p-5 pt-0 border-t border-slate-100 mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {/* Toggle Featured */}
                    <button
                      onClick={() => handleToggleFeatured(item)}
                      title={item.isFeatured ? 'Batalkan Berita Utama' : 'Jadikan Berita Utama'}
                      className={`p-2 rounded-xl border transition-colors ${
                        item.isFeatured
                          ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${item.isFeatured ? 'fill-rose-600' : ''}`} />
                    </button>

                    {/* Toggle Status (Tayang / Draft) */}
                    <button
                      onClick={() => handleToggleStatus(item)}
                      title={isPub ? 'Ubah ke Draft' : 'Publikasikan Sekarang'}
                      className={`p-2 rounded-xl border transition-colors ${
                        isPub
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                    </button>

                    {/* Preview */}
                    <button
                      onClick={() => setPreviewItem(item)}
                      title="Lihat Pratinjau Redaksi"
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEditForm(item)}
                      title="Edit Redaksi Informasi"
                      className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Hapus */}
                    <button
                      onClick={() => setDeleteTargetId(item.id)}
                      title="Hapus Informasi"
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 sm:p-16 rounded-3xl bg-white border-2 border-dashed border-slate-200 text-center space-y-4 max-w-md mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Newspaper className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">Belum Ada Informasi Terbit</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              Mulai buat publikasi berita atau pengumuman desa untuk mengisi bagian Informasi Terkini di landing page.
            </p>
          </div>
          <Button
            onClick={handleOpenCreateForm}
            className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-6"
          >
            + Buat Informasi Pertama
          </Button>
        </div>
      )}

      {/* ── MODAL FORM (TAMBAH / EDIT INFORMASI) ─────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl rounded-3xl p-6 sm:p-8 bg-white border-none shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left space-y-1 border-b pb-4">
            <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900">
              {isEditing ? 'Edit Informasi Terkini' : 'Tambah Informasi & Berita Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500">
              Isi data judul, tanggal, foto unggulan Cloudinary, dan redaksi informasi untuk ditampilkan di landing page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Judul */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Judul Informasi <span className="text-rose-600">*</span>
              </Label>
              <Input
                placeholder="Contoh: Optimalisasi Sistem Antrian Digital & Administrasi Warga"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 text-sm font-semibold"
              />
            </div>

            {/* Row Kategori & Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Kategori
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Tanggal Publikasi
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 text-xs font-semibold"
                />
              </div>
            </div>

            {/* ── UPLOAD GAMBAR CLOUDINARY ─────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Foto Unggulan / Thumbnail (Cloudinary)</span>
                {imageUrl && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Tersimpan di Cloudinary
                  </span>
                )}
              </Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />

              {imageUrl ? (
                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group">
                  <Image
                    src={imageUrl}
                    alt="Preview Unggulan"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="rounded-xl font-bold text-xs"
                    >
                      <UploadCloud className="w-3.5 h-3.5 mr-1" />
                      Ganti Foto
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setImageUrl('');
                        setImagePublicId('');
                      }}
                      className="rounded-xl font-bold text-xs"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !uploadingImage && fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 transition-all rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  {uploadingImage ? (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="text-xs font-bold text-blue-700">
                        Mengunggah foto ke Cloudinary...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-sm">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800">
                          Klik untuk Unggah Foto dari Komputer
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Format JPG, PNG, WEBP (Maksimal 5MB) • Otomatis dioptimalkan Cloudinary
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Cuplikan Redaksi (Excerpt) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Ringkasan / Cuplikan Redaksi <span className="text-rose-600">*</span></span>
                <span className="text-[10px] font-normal text-slate-400">
                  Tampil pada kartu depan landing page (1-2 kalimat)
                </span>
              </Label>
              <Textarea
                placeholder="Tulis ringkasan singkat informasi yang padat dan menarik..."
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium resize-none"
              />
            </div>

            {/* Isi Redaksi Lengkap */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Isi Redaksi Lengkap</span>
                <span className="text-[10px] font-normal text-slate-400">
                  Detail rincian informasi dan pengumuman warga
                </span>
              </Label>
              <Textarea
                placeholder="Tulis narasi berita lengkap, tahapan pelayanan, poin penting acara, dsb..."
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium"
              />
            </div>

            {/* Pengaturan Status & Berita Utama */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              {/* Switch Berita Utama */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Jadikan Berita Utama (Sorotan)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Akan ditampilkan sebagai kartu foto besar di sisi kiri landing page publik.
                  </p>
                </div>
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              </div>

              {/* Switch Status Publikasi */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Status Publikasi (Langsung Tayang)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {status === 'published'
                      ? 'Artikel langsung dapat dibaca oleh publik di landing page.'
                      : 'Artikel disimpan sebagai draft dan belum tampil untuk umum.'}
                  </p>
                </div>
                <Switch
                  checked={status === 'published'}
                  onCheckedChange={(checked) => setStatus(checked ? 'published' : 'draft')}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl font-bold text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveForm}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-6"
            >
              {isEditing ? 'Simpan Perubahan' : 'Terbitkan Informasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL PREVIEW DETAIL REDAKSI ─────────────────────────────────── */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8 bg-white border-none shadow-2xl max-h-[85vh] overflow-y-auto">
          {previewItem && (
            <div className="space-y-5">
              <DialogHeader className="text-left space-y-2 border-b pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                    {previewItem.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {previewItem.date}
                  </span>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  {previewItem.title}
                </DialogTitle>
              </DialogHeader>

              {previewItem.imageUrl && (
                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-100">
                  <Image
                    src={previewItem.imageUrl}
                    alt={previewItem.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              <div className="space-y-4 text-xs sm:text-sm text-slate-700">
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 font-medium text-amber-950 leading-relaxed">
                  <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-800 mb-1">
                    Ringkasan Cuplikan:
                  </span>
                  {previewItem.excerpt}
                </div>

                {previewItem.content && (
                  <div className="space-y-2">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block">
                      Redaksi Informasi Lengkap:
                    </span>
                    <p className="whitespace-pre-line leading-relaxed text-slate-800">
                      {previewItem.content}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-3 border-t">
                <Button
                  onClick={() => setPreviewItem(null)}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                >
                  Tutup Pratinjau
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIALOG KONFIRMASI HAPUS ──────────────────────────────────────── */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Hapus Informasi Ini?</h3>
              <p className="text-xs text-slate-500">
                Data informasi yang dihapus tidak dapat dipulihkan dan akan langsung dihilangkan dari landing page publik.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTargetId(null)}
                className="rounded-xl font-bold text-xs"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteTargetId && handleDelete(deleteTargetId)}
                className="rounded-xl font-bold text-xs"
              >
                Ya, Hapus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
