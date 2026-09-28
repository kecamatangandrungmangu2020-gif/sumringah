'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Landmark,
  MapPin,
  Globe,
  ExternalLink,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Edit3,
  Save,
  Eye,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  Search,
  RefreshCw,
  Loader2,
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

interface DesaItem {
  id: string;
  name: string;
  slug: string;
  kepalaDesa?: string;
  alamat?: string;
  kontak?: string;
  deskripsi?: string;
  imageUrl?: string;
  imagePublicId?: string;
  websiteUrl?: string;
  pelayananUrl?: string;
  updatedAt?: any;
}

export default function ManajemenDesaPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const [desaList, setDesaList] = useState<DesaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'incomplete'>('all');

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [activeDesa, setActiveDesa] = useState<DesaItem | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formKades, setFormKades] = useState('');
  const [formAlamat, setFormAlamat] = useState('');
  const [formKontak, setFormKontak] = useState('');
  const [formDeskripsi, setFormDeskripsi] = useState('');
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formPelayananUrl, setFormPelayananUrl] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImagePublicId, setFormImagePublicId] = useState('');

  // Upload Cloudinary State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Data Desa via API
  const fetchDesaData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/desa?t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.items)) {
        setDesaList(data.items);
      }
    } catch (err) {
      console.error('Gagal mengambil data desa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesaData();
  }, []);

  // Handle Edit Open
  const handleOpenEdit = (desa: DesaItem) => {
    setActiveDesa(desa);
    setFormName(desa.name || '');
    setFormKades(desa.kepalaDesa || '');
    setFormAlamat(desa.alamat || '');
    setFormKontak(desa.kontak || '');
    setFormDeskripsi(desa.deskripsi || '');
    setFormWebsiteUrl(desa.websiteUrl || '');
    setFormPelayananUrl(desa.pelayananUrl || '');
    setFormImageUrl(desa.imageUrl || '');
    setFormImagePublicId(desa.imagePublicId || '');
    setUploadError(null);
    setIsEditModalOpen(true);
  };

  // Handle Preview Open
  const handleOpenPreview = (desa: DesaItem) => {
    setActiveDesa(desa);
    setIsPreviewModalOpen(true);
  };

  // Upload ke Cloudinary
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('File harus berupa gambar (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran gambar maksimal 5 MB.');
      return;
    }

    setUploadingImage(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'profil_desa');

      const res = await fetch('/api/upload-cloudinary', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal mengunggah foto ke Cloudinary.');
      }

      setFormImageUrl(data.url);
      setFormImagePublicId(data.publicId || '');
    } catch (err: any) {
      console.error('Error upload foto desa:', err);
      setUploadError(err.message || 'Gagal mengunggah gambar.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Simpan Perubahan Data Desa
  const handleSaveDesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDesa) return;

    setSavingData(true);
    try {
      const payload: DesaItem = {
        id: activeDesa.id,
        slug: activeDesa.slug || activeDesa.id,
        name: formName || activeDesa.name,
        kepalaDesa: formKades,
        alamat: formAlamat,
        kontak: formKontak,
        deskripsi: formDeskripsi,
        websiteUrl: formWebsiteUrl,
        pelayananUrl: formPelayananUrl,
        imageUrl: formImageUrl,
        imagePublicId: formImagePublicId,
        updatedAt: new Date().toISOString(),
      };

      // 1. Simpan via API Server-side
      const res = await fetch('/api/desa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.message || 'Gagal menyimpan data ke server.');
      }

      // 2. Jika user login di browser dan Firestore aktif, sync ke Firestore client juga
      if (firestore && user) {
        try {
          await setDoc(doc(firestore, 'desa', activeDesa.id), payload, { merge: true });
        } catch (e) {
          console.warn('Sync client firestore desa:', e);
        }
      }

      // Perbarui state lokal
      setDesaList((prev) =>
        prev.map((d) => (d.id === activeDesa.id ? { ...d, ...payload } : d))
      );

      setIsEditModalOpen(false);
    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err.message || err}`);
    } finally {
      setSavingData(false);
    }
  };

  // Filter & Search
  const filteredDesa = desaList.filter((d) => {
    const matchQuery =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.kepalaDesa && d.kepalaDesa.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.alamat && d.alamat.toLowerCase().includes(searchQuery.toLowerCase()));

    const isComplete = Boolean(d.imageUrl && d.websiteUrl && d.pelayananUrl);
    if (filterStatus === 'complete') return matchQuery && isComplete;
    if (filterStatus === 'incomplete') return matchQuery && !isComplete;
    return matchQuery;
  });

  // Statistik Ringkas
  const totalDesa = desaList.length;
  const desaWithFoto = desaList.filter((d) => Boolean(d.imageUrl)).length;
  const desaWithWeb = desaList.filter((d) => Boolean(d.websiteUrl)).length;
  const desaWithLayanan = desaList.filter((d) => Boolean(d.pelayananUrl)).length;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-8 font-sans">

      {/* ── 1. HEADER & BREADCRUMB ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Link href="/dashboard" className="hover:text-amber-600 transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-slate-700">Pelayanan</span>
            <span>/</span>
            <span className="text-amber-600">Profil & Layanan 14 Desa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Landmark className="w-7 h-7 text-amber-600" />
            Manajemen Profil & Layanan Desa
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola foto unggahan Cloudinary, rincian informasi desa, tautan website resmi, dan portal layanan untuk 14 desa di Kecamatan Gandrungmangu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDesaData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 shadow-sm transition-all disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <Link
            href="/#desa"
            target="_blank"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
          >
            <Eye className="w-4 h-4" />
            <span>Buka di Landing Page</span>
          </Link>
        </div>
      </div>

      {/* ── 2. KARTU STATISTIK KELENGKAPAN ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalDesa}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Desa</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{desaWithFoto} / 14</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Foto Terunggah</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{desaWithWeb} / 14</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Website Terhubung</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{desaWithLayanan} / 14</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Layanan Aktif</div>
          </div>
        </div>
      </div>

      {/* ── 3. FILTER & SEARCH ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari desa, nama kepala desa, alamat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({totalDesa})
          </button>
          <button
            onClick={() => setFilterStatus('complete')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterStatus === 'complete'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Lengkap
          </button>
          <button
            onClick={() => setFilterStatus('incomplete')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterStatus === 'incomplete'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Belum Lengkap
          </button>
        </div>
      </div>

      {/* ── 4. GRID DAFTAR 14 DESA ────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <p className="text-sm font-medium">Memuat data 14 desa...</p>
        </div>
      ) : filteredDesa.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-2">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="font-bold text-slate-800">Tidak ada desa yang cocok</h3>
          <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter status Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDesa.map((desa, idx) => {
            const hasFoto = Boolean(desa.imageUrl);
            const hasWeb = Boolean(desa.websiteUrl);
            const hasLayanan = Boolean(desa.pelayananUrl);
            const isComplete = hasFoto && hasWeb && hasLayanan;

            return (
              <div
                key={desa.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
              >
                <div>
                  {/* Foto Banner / Cloudinary Thumbnail */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 border-b border-slate-100">
                    {hasFoto ? (
                      <Image
                        src={desa.imageUrl!}
                        alt={desa.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 via-amber-950 to-slate-900 flex flex-col items-center justify-center text-white/40 p-4 text-center">
                        <Landmark className="w-10 h-10 mb-2 opacity-50 text-amber-300" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                          Belum Ada Foto
                        </span>
                        <span className="text-[9px] text-slate-400">Klik kelola untuk upload</span>
                      </div>
                    )}

                    {/* Badge Nomor Urut */}
                    <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-black text-xs flex items-center justify-center shadow-md">
                      {idx + 1}
                    </div>

                    {/* Badge Kelengkapan */}
                    <div className="absolute top-3 right-3">
                      {isComplete ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold tracking-wide shadow-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Lengkap
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black tracking-wide shadow-md">
                          Perlu Update
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Konten Rincian */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
                        {desa.name}
                      </h3>
                      {desa.kepalaDesa ? (
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{desa.kepalaDesa}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600/80 italic mt-0.5">Nama Kades belum diisi</p>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {desa.deskripsi || 'Belum ada rincian profil desa yang dituliskan.'}
                    </p>

                    {/* Indikator Link Website & Layanan */}
                    <div className="pt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          hasWeb ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-400'
                        }`}
                        title={desa.websiteUrl || 'Belum ada link website'}
                      >
                        <Globe className="w-3 h-3" /> {hasWeb ? 'Web Ada' : 'Web Belum'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          hasLayanan ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-400'
                        }`}
                        title={desa.pelayananUrl || 'Belum ada link pelayanan'}
                      >
                        <FileText className="w-3 h-3" /> {hasLayanan ? 'Layanan Ada' : 'Layanan Belum'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="p-5 pt-0 grid grid-cols-2 gap-2 border-t border-slate-100 mt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(desa)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Pratinjau</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(desa)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Kelola</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. MODAL FORMULIR EDIT DESA (UPLOAD CLOUDINARY + RINCIAN) ──────── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-600" />
              Kelola Data: {activeDesa?.name}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-500">
              Perbarui foto desa melalui Cloudinary, rincian profil, serta tautan website dan layanan online.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDesa} className="space-y-6 pt-3">

            {/* 1. Upload Foto Cloudinary */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>1. Foto Banner Desa (Cloudinary)</span>
              </label>

              {formImageUrl ? (
                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border-2 border-slate-200 group bg-slate-100">
                  <Image
                    src={formImageUrl}
                    alt="Pratinjau Foto Desa"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 shadow-lg"
                    >
                      <UploadCloud className="w-4 h-4" /> Ganti Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormImageUrl('');
                        setFormImagePublicId('');
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 flex items-center gap-1.5 shadow-lg"
                    >
                      <Trash2 className="w-4 h-4" /> Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center space-y-2 ${
                    uploadingImage
                      ? 'border-amber-400 bg-amber-50/50'
                      : 'border-slate-300 hover:border-amber-500 hover:bg-amber-50/20'
                  }`}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                      <span className="text-xs font-bold text-slate-700">Mengunggah ke Cloudinary...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-1">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        Klik untuk upload foto banner {activeDesa?.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        Format: JPG, PNG, atau WebP (Maksimal 5 MB)
                      </div>
                    </>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />

              {uploadError && (
                <div className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {uploadError}
                </div>
              )}
            </div>

            {/* 2. Informasi Lengkap & Rincian Inputan */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>2. Informasi Lengkap & Rincian Desa</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nama Kepala Desa</label>
                  <input
                    type="text"
                    value={formKades}
                    onChange={(e) => setFormKades(e.target.value)}
                    placeholder="Contoh: Bpk. H. Sudirman"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">No. Kontak / WhatsApp Balai Desa</label>
                  <input
                    type="text"
                    value={formKontak}
                    onChange={(e) => setFormKontak(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Alamat Balai Desa</label>
                <input
                  type="text"
                  value={formAlamat}
                  onChange={(e) => setFormAlamat(e.target.value)}
                  placeholder="Contoh: Jl. Raya Bulusari No. 12, Gandrungmangu, Cilacap"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Deskripsi & Rincian Profil Desa
                </label>
                <textarea
                  rows={4}
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  placeholder="Tuliskan gambaran umum, potensi desa, sejarah singkat, atau visi-misi desa..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                />
              </div>
            </div>

            {/* 3. Link Website & Link Pelayanan */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-amber-600" />
                <span>3. Tautan Website & Layanan Desa</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Link Website Resmi Desa
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={formWebsiteUrl}
                      onChange={(e) => setFormWebsiteUrl(e.target.value)}
                      placeholder="https://namadesa.desa.id"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Link Pelayanan Online Desa
                  </label>
                  <div className="relative">
                    <ExternalLink className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={formPelayananUrl}
                      onChange={(e) => setFormPelayananUrl(e.target.value)}
                      placeholder="https://pelayanan.namadesa.desa.id atau link WA"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingData || uploadingImage}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {savingData ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 6. MODAL PRATINJAU TAMPILAN SHOWCASE DESA ─────────────────────── */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-0 shadow-2xl">
          {activeDesa && (
            <div className="bg-white">
              {/* Cover Banner */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                {activeDesa.imageUrl ? (
                  <Image
                    src={activeDesa.imageUrl}
                    alt={activeDesa.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 text-white/50 p-6 text-center">
                    <Landmark className="w-16 h-16 text-amber-400 opacity-60 mb-2" />
                    <span className="text-xs uppercase tracking-widest text-amber-200 font-bold">
                      Kecamatan Gandrungmangu
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 text-white">
                  <DialogHeader className="text-left space-y-1">
                    <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md inline-block w-fit">
                      Kecamatan Gandrungmangu
                    </span>
                    <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-white mt-1 drop-shadow-md">
                      {activeDesa.name}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Pratinjau profil {activeDesa.name}
                    </DialogDescription>
                  </DialogHeader>
                </div>
              </div>

              {/* Rincian Konten */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Meta Kades & Alamat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs">
                  <div>
                    <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                      Kepala Desa
                    </span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">
                      {activeDesa.kepalaDesa || 'Belum diisi'}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                      Kontak Balai Desa
                    </span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">
                      {activeDesa.kontak || 'Belum diisi'}
                    </p>
                  </div>
                  {activeDesa.alamat && (
                    <div className="sm:col-span-2 pt-2 border-t border-amber-200/60">
                      <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                        Alamat Kantor Desa
                      </span>
                      <p className="font-medium text-slate-700 text-xs mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{activeDesa.alamat}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Deskripsi Lengkap */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Rincian Informasi & Profil
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {activeDesa.deskripsi || 'Belum ada rincian deskripsi untuk desa ini.'}
                  </p>
                </div>

                {/* Tombol Aksi Tautan */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeDesa.websiteUrl ? (
                    <a
                      href={activeDesa.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-indigo-600" />
                        <span>Website Resmi Desa</span>
                      </span>
                      <ExternalLink className="w-4 h-4 text-indigo-500" />
                    </a>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-400 text-xs font-bold flex items-center gap-2">
                      <Globe className="w-4 h-4 opacity-50" />
                      <span>Website Belum Tersedia</span>
                    </div>
                  )}

                  {activeDesa.pelayananUrl ? (
                    <a
                      href={activeDesa.pelayananUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-rose-600" />
                        <span>Layanan Online Desa</span>
                      </span>
                      <ExternalLink className="w-4 h-4 text-rose-500" />
                    </a>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-400 text-xs font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 opacity-50" />
                      <span>Layanan Belum Tersedia</span>
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors ml-auto"
                  >
                    Tutup Pratinjau
                  </button>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
