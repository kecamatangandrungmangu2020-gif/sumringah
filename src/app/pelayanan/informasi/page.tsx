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
  Sparkles,
  Images,
  ArrowUpDown,
  Maximize2,
  Video,
  Play,
  Film
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
import { NewsImage, NewsItem } from '@/lib/types';
import { NewsPhotoGallery } from '@/components/informasi/NewsPhotoGallery';

export type { NewsImage, NewsItem };

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

  // Image Upload State (Cloudinary) - Mendukung Banyak Foto (Multiple Photos)
  const [images, setImages] = useState<NewsImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // YouTube Video Upload State (Client-Side Resumable Upload via YouTube Data API v3)
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [manualYoutubeUrl, setManualYoutubeUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadStatus, setVideoUploadStatus] = useState('');
  const videoInputRef = useRef<HTMLInputElement | null>(null);

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

  // Handle Cloudinary Multiple Image Upload
  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file sizes (max 5MB each)
    const oversized = files.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Ukuran File Terlalu Besar',
        description: `${oversized.length} foto berukuran lebih dari 5MB. Maksimal ukuran per foto adalah 5MB.`,
      });
      return;
    }

    setUploadingImage(true);
    const newUploaded: NewsImage[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgressText(`Mengunggah foto ${i + 1} dari ${files.length}...`);

        // Deteksi dimensi asli gambar (landscape vs portrait)
        const dims = await new Promise<{ width: number; height: number; aspectRatio: 'landscape' | 'portrait' | 'square' }>((resolve) => {
          const img = new window.Image();
          const objUrl = URL.createObjectURL(file);
          img.onload = () => {
            const w = img.naturalWidth || 800;
            const h = img.naturalHeight || 600;
            URL.revokeObjectURL(objUrl);
            const ratio = w > h ? 'landscape' : w < h ? 'portrait' : 'square';
            resolve({ width: w, height: h, aspectRatio: ratio });
          };
          img.onerror = () => {
            URL.revokeObjectURL(objUrl);
            resolve({ width: 800, height: 600, aspectRatio: 'landscape' });
          };
          img.src = objUrl;
        });

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload-cloudinary/', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Gagal mengunggah foto "${file.name}".`);
        }

        const width = data.width || dims.width;
        const height = data.height || dims.height;
        const aspectRatio = width > height ? 'landscape' : width < height ? 'portrait' : 'square';

        newUploaded.push({
          url: data.url,
          publicId: data.publicId || '',
          width,
          height,
          aspectRatio,
        });
      }

      setImages(prev => [...prev, ...newUploaded]);
      toast({
        title: 'Foto Berhasil Diunggah',
        description: `${newUploaded.length} foto berhasil diunggah ke Cloudinary.`,
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
      setUploadProgressText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimaryImage = (indexToPrimary: number) => {
    setImages(prev => {
      const selected = prev[indexToPrimary];
      const others = prev.filter((_, idx) => idx !== indexToPrimary);
      return [selected, ...others];
    });
    toast({
      title: 'Foto Utama Diatur',
      description: 'Foto ini sekarang menjadi sampul depan informasi.',
    });
  };

  const extractYoutubeId = (input: string): string => {
    if (!input) return '';
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);
    return match && match[2].length === 11 ? match[2] : trimmed;
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({
        variant: 'destructive',
        title: 'Format File Tidak Sesuai',
        description: 'Harap pilih file video (MP4, WebM, MOV, dsb).',
      });
      return;
    }

    try {
      setUploadingVideo(true);
      setVideoUploadProgress(0);
      setVideoUploadStatus('Menghubungkan ke YouTube API & menyiapkan sesi upload...');

      // 1. Minta Resumable Upload URL dari backend Next.js Vercel
      const sessionRes = await fetch('/api/youtube-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || file.name.replace(/\.[^/.]+$/, ''),
          description: excerpt || 'Video publikasi kegiatan Kecamatan Gandrungmangu',
          fileSize: file.size,
          fileType: file.type || 'video/mp4',
        }),
      });

      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.uploadUrl) {
        throw new Error(sessionData.error || 'Gagal menginisiasi sesi upload ke YouTube.');
      }

      const { uploadUrl, accessToken } = sessionData;
      setVideoUploadStatus('Mengunggah video langsung ke server YouTube...');

      // 2. Client-side Resumable Upload via XMLHttpRequest langsung ke uploadUrl Google
      // Ini mem-bypass limit 4.5MB Vercel karena video di-streaming langsung ke Google
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      if (accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      }
      xhr.setRequestHeader('Content-Range', `bytes 0-${file.size - 1}/${file.size}`);

      xhr.upload.onprogress = (progressEvent) => {
        if (progressEvent.lengthComputable) {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setVideoUploadProgress(percent);
          const uploadedMb = (progressEvent.loaded / (1024 * 1024)).toFixed(1);
          const totalMb = (progressEvent.total / (1024 * 1024)).toFixed(1);
          setVideoUploadStatus(`Mengunggah ke YouTube: ${percent}% (${uploadedMb} MB / ${totalMb} MB)`);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const responseJson = JSON.parse(xhr.responseText);
            const newVideoId = responseJson.id;
            if (newVideoId) {
              setYoutubeVideoId(newVideoId);
              setManualYoutubeUrl(`https://www.youtube.com/watch?v=${newVideoId}`);
              setVideoUploadProgress(100);
              setVideoUploadStatus('Video berhasil di-hosting di YouTube (Unlisted)!');
              toast({
                title: 'Upload YouTube Berhasil! 🎉',
                description: `ID Video: ${newVideoId} (Status: Unlisted)`,
              });
            } else {
              throw new Error('Respons YouTube tidak menyertakan ID video.');
            }
          } catch (parseErr: any) {
            throw new Error('Gagal membaca respons upload YouTube: ' + parseErr.message);
          }
        } else {
          console.error('[YouTube PUT Error]', xhr.status, xhr.statusText, xhr.responseText);
          throw new Error(`Upload YouTube gagal (HTTP ${xhr.status}): ${xhr.statusText || xhr.responseText}`);
        }
        setUploadingVideo(false);
      };

      xhr.onerror = (errEvent) => {
        console.error('[YouTube XHR OnError]', errEvent, xhr.status, xhr.statusText);
        setUploadingVideo(false);
        toast({
          variant: 'destructive',
          title: 'Koneksi Upload Terputus',
          description: 'Gagal menghubungi server Google. Pastikan http://localhost:3000 sudah ditambahkan di Authorized JavaScript Origins Google Cloud Console.',
        });
      };

      xhr.send(file);
    } catch (err: any) {
      console.error('YouTube upload error:', err);
      setUploadingVideo(false);
      toast({
        variant: 'destructive',
        title: 'Gagal Upload Video ke YouTube',
        description: err.message || 'Periksa koneksi atau kredensial YouTube API.',
      });
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
    setImages([]);
    setYoutubeVideoId('');
    setManualYoutubeUrl('');
    setUploadingVideo(false);
    setVideoUploadProgress(0);
    setVideoUploadStatus('');
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

    // Inisialisasi daftar foto (mendukung multi foto dan data lama single imageUrl)
    let initialImages: NewsImage[] = [];
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      initialImages = item.images.map((img: any) =>
        typeof img === 'string' ? { url: img } : img
      );
    } else if (item.imageUrl) {
      initialImages = [{ url: item.imageUrl, publicId: item.imagePublicId }];
    }
    setImages(initialImages);

    // Inisialisasi YouTube Video
    setYoutubeVideoId(item.youtubeVideoId || '');
    setManualYoutubeUrl(item.youtubeVideoId ? `https://www.youtube.com/watch?v=${item.youtubeVideoId}` : '');
    setUploadingVideo(false);
    setVideoUploadProgress(0);
    setVideoUploadStatus('');
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

    const primaryUrl = images[0]?.url || '';
    const primaryPublicId = images[0]?.publicId || '';

    // Ambil youtubeVideoId baik dari upload ataupun input manual
    const finalYoutubeId = youtubeVideoId ? youtubeVideoId.trim() : (manualYoutubeUrl ? extractYoutubeId(manualYoutubeUrl) : null);

    const payload = {
      title: title.trim(),
      category,
      date,
      excerpt: excerpt.trim(),
      content: content.trim(),
      imageUrl: primaryUrl,
      imagePublicId: primaryPublicId,
      images: images,
      youtubeVideoId: finalYoutubeId || null,
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
                  {/* Foto Thumbnail Cloudinary - Mendukung Landscape & Portrait */}
                  <div className="relative">
                    {item.imageUrl || (item.images && item.images.length > 0) || item.youtubeVideoId ? (
                      <NewsPhotoGallery
                        images={item.images}
                        imageUrl={item.imageUrl}
                        youtubeVideoId={item.youtubeVideoId}
                        title={item.title}
                        mode="card"
                      />
                    ) : (
                      <div className="w-full h-[220px] flex flex-col items-center justify-center text-slate-400 bg-slate-100 rounded-2xl">
                        <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Tanpa Foto</span>
                      </div>
                    )}

                    {/* Badge Berita Utama (Featured) */}
                    {item.isFeatured && (
                      <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" />
                        Berita Utama
                      </div>
                    )}

                    {/* Badge Kategori & Status */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wide">
                          {item.category || 'Umum'}
                        </span>
                        {item.youtubeVideoId && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600/90 backdrop-blur-md text-white text-[9px] font-bold flex items-center gap-1 shadow-sm">
                            <Video className="w-3 h-3" />
                            <span>Video</span>
                          </span>
                        )}
                      </div>
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

            {/* ── UPLOAD BANYAK FOTO (MULTIPLE PHOTOS) CLOUDINARY ─────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Images className="w-4 h-4 text-blue-600" />
                  <span>Foto Informasi (Bisa Lebih Dari 1 Foto)</span>
                </Label>
                {images.length > 0 && (
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {images.length} Foto Siap Diterbitkan
                  </span>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleMultipleImagesUpload}
                className="hidden"
              />

              {/* Status Sedang Upload Banyak Foto */}
              {uploadingImage && (
                <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 text-center space-y-2">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto" />
                  <p className="text-xs font-bold text-blue-900">
                    {uploadProgressText || 'Sedang mengunggah foto ke Cloudinary...'}
                  </p>
                  <p className="text-[10px] text-blue-600">
                    Sistem mendeteksi ukuran dan rasio foto asli (Landscape / Portrait) secara otomatis.
                  </p>
                </div>
              )}

              {/* Grid Tampilan Foto yang Telah Diunggah */}
              {images.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((img, idx) => {
                      const isMain = idx === 0;
                      const isPort =
                        img.aspectRatio === 'portrait' ||
                        (img.width && img.height && img.height > img.width);

                      return (
                        <div
                          key={img.url + idx}
                          className={`relative rounded-2xl overflow-hidden border-2 transition-all flex flex-col justify-between bg-slate-900/5 group ${
                            isMain
                              ? 'border-amber-400 ring-2 ring-amber-300/40 shadow-sm'
                              : 'border-slate-200'
                          }`}
                        >
                          {/* Wadah Foto dengan rasio asli uncropped */}
                          <div className="relative h-36 w-full flex items-center justify-center p-1.5 overflow-hidden bg-slate-950/10">
                            {/* Ambient background blur */}
                            <div
                              className="absolute inset-0 bg-cover bg-center filter blur-md opacity-25 scale-110 pointer-events-none"
                              style={{ backgroundImage: `url(${img.url})` }}
                            />
                            <img
                              src={img.url}
                              alt={`Foto ${idx + 1}`}
                              className="relative z-10 max-h-full max-w-full w-auto h-auto object-contain rounded-lg"
                            />

                            {/* Badge Orientasi */}
                            <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider">
                              {isPort ? 'Portrait' : 'Landscape'}
                            </span>

                            {/* Badge Foto Utama */}
                            {isMain && (
                              <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow">
                                Sampul Utama
                              </span>
                            )}
                          </div>

                          {/* Tombol Aksi per Foto */}
                          <div className="p-2 bg-white flex items-center justify-between gap-1 border-t border-slate-100">
                            {!isMain ? (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryImage(idx)}
                                className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                title="Jadikan Sampul Utama"
                              >
                                <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                                <span>Utamakan</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 px-1.5 py-0.5">
                                ✓ Sampul
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus Foto Ini"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tombol Tambah Foto Lagi & Reset */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => !uploadingImage && fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="rounded-xl font-bold text-xs bg-slate-50 hover:bg-slate-100 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>+ Tambah Foto Lainnya</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setImages([])}
                      disabled={uploadingImage}
                      className="text-slate-400 hover:text-rose-600 text-xs font-semibold"
                    >
                      Hapus Semua Foto
                    </Button>
                  </div>
                </div>
              ) : (
                /* Area Dropzone Upload Foto Pertama kali (Bisa pilih multiple) */
                !uploadingImage && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 transition-all rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-sm">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">
                        Klik untuk Unggah Satu atau Lebih Foto (Bisa Pilih Sekaligus)
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Mendukung foto Landscape &amp; Portrait • Format JPG, PNG, WEBP (Maksimal 5MB/foto)
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* ── VIDEO PENDAMPING BERITA (YOUTUBE DATA API V3 - RESUMABLE CLIENT UPLOAD) ── */}
            <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-rose-50/50 border border-rose-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Video className="w-4 h-4 text-rose-600" />
                  <span>Video Pendamping Berita (YouTube)</span>
                  <span className="text-[10px] font-normal text-slate-400 capitalize">(Opsional)</span>
                </Label>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                  Status: Unlisted (Bypass Limit Vercel)
                </span>
              </div>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />

              {/* Status Sedang Mengunggah Video */}
              {uploadingVideo && (
                <div className="p-4 rounded-xl bg-white border border-rose-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                      <span className="text-xs font-bold text-slate-800">
                        {videoUploadStatus || 'Mengunggah video ke YouTube...'}
                      </span>
                    </div>
                    <span className="text-xs font-black text-rose-600">
                      {videoUploadProgress}%
                    </span>
                  </div>

                  {/* Progress Bar Realtime */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${videoUploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Video di-streaming langsung dari browser Anda ke YouTube tanpa membebani limit 4.5MB Vercel.
                  </p>
                </div>
              )}

              {/* Pratinjau Video Jika Sudah Ada youtubeVideoId */}
              {youtubeVideoId ? (
                <div className="space-y-3">
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-md border border-slate-200">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                      title="Pratinjau Video YouTube"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>ID YouTube: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-rose-600">{youtubeVideoId}</code></span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setYoutubeVideoId('');
                        setManualYoutubeUrl('');
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Hapus Video
                    </Button>
                  </div>
                </div>
              ) : (
                !uploadingVideo && (
                  <div className="space-y-3">
                    {/* Opsi 1: Tombol Upload File Video Langsung */}
                    <div
                      onClick={() => videoInputRef.current?.click()}
                      className="border-2 border-dashed border-rose-200 hover:border-rose-400 bg-white hover:bg-rose-50/40 transition-all rounded-2xl p-5 text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800">
                          Klik untuk Unggah File Video Langsung ke YouTube
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Mendukung MP4, MOV, WebM, MKV • Ukuran bebas (Client-side Resumable Upload)
                        </p>
                      </div>
                    </div>

                    {/* Opsi 2: Input Manual Link / ID YouTube */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <Label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                        <span>Atau masukkan Link / ID YouTube Manual jika video sudah ada:</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://www.youtube.com/watch?v=... atau dQw4w9WgXcQ"
                          value={manualYoutubeUrl}
                          onChange={(e) => {
                            setManualYoutubeUrl(e.target.value);
                            const extracted = extractYoutubeId(e.target.value);
                            if (extracted && extracted.length === 11) {
                              setYoutubeVideoId(extracted);
                            }
                          }}
                          className="h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const extracted = extractYoutubeId(manualYoutubeUrl);
                            if (extracted) {
                              setYoutubeVideoId(extracted);
                              toast({ title: 'Video Terpasang', description: `ID: ${extracted}` });
                            }
                          }}
                          className="h-9 px-3 rounded-xl text-xs font-bold"
                        >
                          Terapkan
                        </Button>
                      </div>
                    </div>
                  </div>
                )
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

              {/* Pratinjau Foto Asli (Landscape / Portrait & Multi-Foto & Cuplikan YouTube) */}
              {(previewItem.imageUrl || (previewItem.images && previewItem.images.length > 0) || previewItem.youtubeVideoId) && (
                <NewsPhotoGallery
                  images={previewItem.images}
                  imageUrl={previewItem.imageUrl}
                  youtubeVideoId={previewItem.youtubeVideoId}
                  title={previewItem.title}
                  mode="detail"
                />
              )}

              {/* Video YouTube Terkait */}
              {previewItem.youtubeVideoId && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600">
                    <Video className="w-4 h-4" />
                    <span>Video Pendamping Berita (YouTube)</span>
                  </div>
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-md border border-slate-200">
                    <iframe
                      src={`https://www.youtube.com/embed/${previewItem.youtubeVideoId}`}
                      title={previewItem.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
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
