'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Globe,
  Compass,
  Building2,
  ExternalLink,
  Trash2,
  RotateCcw,
  Eye,
  Layers,
  ArrowRight,
  ShieldCheck,
  Map as MapIcon,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface WilayahData {
  title: string;
  subtitle?: string;
  description: string;
  secondaryDescription?: string;
  mapImageUrl?: string;
  mapImagePublicId?: string;
  bgImageUrl?: string;
  bgImagePublicId?: string;
  mapButtonText?: string;
  mapLinkUrl?: string;
  luasWilayah?: string;
  jumlahDesa?: string;
  pusatPemerintahan?: string;
  batasUtara?: string;
  batasSelatan?: string;
  batasBarat?: string;
  batasTimur?: string;
  updatedAt?: any;
}

const DEFAULT_DATA: WilayahData = {
  title: 'Wilayah Gandrungmangu',
  subtitle: 'Geospasial & Kewilayahan',
  description:
    'Kecamatan Gandrungmangu membentang strategis di bagian barat Kabupaten Cilacap, menaungi 14 Desa dengan potensi agraris yang subur, sentra perekonomian rakyat, dan kerukunan warga yang kokoh.',
  secondaryDescription:
    'Melalui integrasi peta interaktif SOLID (Sistem Operasional Layanan Informasi Kecamatan), Anda dapat mengeksplorasi batas desa, sebaran kantor pelayanan, jaringan jalan, serta data geospasial kewilayahan secara transparan dan mudah diakses.',
  mapImageUrl: '',
  mapImagePublicId: '',
  bgImageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop',
  mapButtonText: 'Jelajahi Data Wilayah',
  mapLinkUrl: 'https://solid.gandrungmangu.id/',
  luasWilayah: '64,37 km²',
  jumlahDesa: '14 Desa',
  pusatPemerintahan: 'Kantor Kecamatan Gandrungmangu',
  batasUtara: 'Kecamatan Karangpucung & Sidareja',
  batasSelatan: 'Kecamatan Bantarsari & Kawunganten',
  batasBarat: 'Kecamatan Cipari & Sidareja',
  batasTimur: 'Kecamatan Bantarsari',
};

export default function WilayahAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<WilayahData>(DEFAULT_DATA);

  // Upload State (Map Image)
  const [uploadingMap, setUploadingMap] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);

  // Upload State (Background Image)
  const [uploadingBg, setUploadingBg] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // Fetch Existing Settings
  const fetchWilayahData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wilayah?t=' + Date.now(), { cache: 'no-store' });
      const resJson = await res.json();
      if (resJson && resJson.success && resJson.data) {
        setFormData({ ...DEFAULT_DATA, ...resJson.data });
      }
    } catch (err) {
      console.error('Gagal mengambil data wilayah:', err);
      toast({
        title: 'Gagal Memuat Data',
        description: 'Terjadi kendala saat mengambil data wilayah. Menggunakan data default.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWilayahData();
  }, []);

  // Upload Gambar Peta ke Cloudinary
  const handleMapFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('File harus berupa gambar (JPG, PNG, WebP, SVG).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Ukuran gambar maksimal 8 MB.');
      return;
    }

    setUploadingMap(true);
    setUploadError(null);

    try {
      const bodyData = new FormData();
      bodyData.append('file', file);
      bodyData.append('folder', 'peta_wilayah');

      const res = await fetch('/api/upload-cloudinary', {
        method: 'POST',
        body: bodyData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengunggah peta ke Cloudinary.');
      }

      setFormData((prev) => ({
        ...prev,
        mapImageUrl: data.url,
        mapImagePublicId: data.publicId || '',
      }));

      toast({
        title: 'Peta Berhasil Diunggah',
        description: 'Gambar peta wilayah berhasil diunggah ke Cloudinary.',
      });
    } catch (err: any) {
      console.error('Error upload peta:', err);
      setUploadError(err.message || 'Gagal mengunggah gambar peta.');
      toast({
        title: 'Gagal Unggah',
        description: err.message || 'Tidak dapat mengunggah gambar ke Cloudinary.',
        variant: 'destructive',
      });
    } finally {
      setUploadingMap(false);
      if (mapInputRef.current) mapInputRef.current.value = '';
    }
  };

  // Upload Background Banner ke Cloudinary
  const handleBgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBg(true);
    try {
      const bodyData = new FormData();
      bodyData.append('file', file);
      bodyData.append('folder', 'peta_wilayah');

      const res = await fetch('/api/upload-cloudinary', {
        method: 'POST',
        body: bodyData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengunggah background.');
      }

      setFormData((prev) => ({
        ...prev,
        bgImageUrl: data.url,
        bgImagePublicId: data.publicId || '',
      }));

      toast({
        title: 'Background Diperbarui',
        description: 'Foto latar belakang wilayah berhasil diunggah.',
      });
    } catch (err: any) {
      console.error('Error upload background:', err);
      toast({
        title: 'Gagal Unggah Background',
        description: err.message || 'Terjadi kesalahan.',
        variant: 'destructive',
      });
    } finally {
      setUploadingBg(false);
      if (bgInputRef.current) bgInputRef.current.value = '';
    }
  };

  // Submit Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/wilayah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.message || 'Gagal menyimpan pengaturan.');
      }

      toast({
        title: 'Pengaturan Tersimpan!',
        description: 'Data dan gambar peta wilayah pada landingpage telah diperbarui.',
      });
    } catch (err: any) {
      console.error('Error saving wilayah:', err);
      toast({
        title: 'Gagal Menyimpan',
        description: err.message || 'Terjadi kesalahan sistem.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (confirm('Kembalikan isian ke format data awal (default)?')) {
      setFormData(DEFAULT_DATA);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* ── HEADER HALAMAN ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4 text-amber-500" />
            <span>Manajemen Kewilayahan Landingpage</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Kelola Wilayah & Peta
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Atur judul, narasi deskripsi, batas wilayah, tautan peta, serta unggah gambar peta ke Cloudinary untuk seksi &ldquo;Wilayah&rdquo; di landingpage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchWilayahData}
            disabled={loading}
            className="rounded-xl gap-2 font-bold text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetToDefault}
            className="rounded-xl gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Awal</span>
          </Button>

          <Button
            type="button"
            asChild
            variant="secondary"
            size="sm"
            className="rounded-xl gap-1.5 font-bold text-xs"
          >
            <Link href="/#wilayah" target="_blank">
              <Eye className="w-3.5 h-3.5 text-primary" />
              <span>Lihat di Landingpage</span>
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Memuat Data Wilayah...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── KOLOM KIRI: FORM PENGATURAN TEKS & STATISTIK (8 KOLOM) ─────── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Kartu 1: Teks Utama Wilayah */}
            <Card className="rounded-3xl border-border/70 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border/50 pb-4">
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  Judul & Redaksi Wilayah
                </CardTitle>
                <CardDescription className="text-xs">
                  Redaksi teks yang tampil di sebelah kiri seksi Wilayah landingpage.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Judul Utama</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Contoh: Wilayah Gandrungmangu"
                      className="rounded-xl text-sm font-semibold"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Subjudul / Kategori</Label>
                    <Input
                      value={formData.subtitle || ''}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="Contoh: Geospasial & Kewilayahan"
                      className="rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Deskripsi Paragraf 1 (Gambaran Umum)</Label>
                  <Textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tuliskan gambaran posisi geografis dan potensi wilayah..."
                    className="rounded-xl text-xs sm:text-sm leading-relaxed"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Deskripsi Paragraf 2 (Integrasi Peta / Informasi)</Label>
                  <Textarea
                    rows={3}
                    value={formData.secondaryDescription || ''}
                    onChange={(e) => setFormData({ ...formData, secondaryDescription: e.target.value })}
                    placeholder="Tuliskan penjelasan mengenai fitur peta interaktif dan transparansi data..."
                    className="rounded-xl text-xs sm:text-sm leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Label Tombol Peta</Label>
                    <Input
                      value={formData.mapButtonText || ''}
                      onChange={(e) => setFormData({ ...formData, mapButtonText: e.target.value })}
                      placeholder="Contoh: Jelajahi Data Wilayah"
                      className="rounded-xl text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Tautan / Link Peta (SOLID / GIS / Maps)</Label>
                    <Input
                      value={formData.mapLinkUrl || ''}
                      onChange={(e) => setFormData({ ...formData, mapLinkUrl: e.target.value })}
                      placeholder="https://solid.gandrungmangu.id/ atau link Google Maps"
                      className="rounded-xl text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kartu 2: Batas & Statistik Kewilayahan */}
            <Card className="rounded-3xl border-border/70 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border/50 pb-4">
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Statistik & Batas-Batas Wilayah
                </CardTitle>
                <CardDescription className="text-xs">
                  Data parameter wilayah yang ditampilkan pada kartu info geospasial.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Luas Wilayah</Label>
                    <Input
                      value={formData.luasWilayah || ''}
                      onChange={(e) => setFormData({ ...formData, luasWilayah: e.target.value })}
                      placeholder="64,37 km²"
                      className="rounded-xl text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Jumlah Desa</Label>
                    <Input
                      value={formData.jumlahDesa || ''}
                      onChange={(e) => setFormData({ ...formData, jumlahDesa: e.target.value })}
                      placeholder="14 Desa"
                      className="rounded-xl text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Pusat Pemerintahan</Label>
                    <Input
                      value={formData.pusatPemerintahan || ''}
                      onChange={(e) => setFormData({ ...formData, pusatPemerintahan: e.target.value })}
                      placeholder="Kantor Kecamatan Gandrungmangu"
                      className="rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50">
                  <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider block mb-3">
                    Batas-Batas Wilayah Administratif
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Batas Utara</Label>
                      <Input
                        value={formData.batasUtara || ''}
                        onChange={(e) => setFormData({ ...formData, batasUtara: e.target.value })}
                        placeholder="Contoh: Kec. Karangpucung & Sidareja"
                        className="rounded-xl text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Batas Selatan</Label>
                      <Input
                        value={formData.batasSelatan || ''}
                        onChange={(e) => setFormData({ ...formData, batasSelatan: e.target.value })}
                        placeholder="Contoh: Kec. Bantarsari & Kawunganten"
                        className="rounded-xl text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Batas Barat</Label>
                      <Input
                        value={formData.batasBarat || ''}
                        onChange={(e) => setFormData({ ...formData, batasBarat: e.target.value })}
                        placeholder="Contoh: Kec. Cipari & Sidareja"
                        className="rounded-xl text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Batas Timur</Label>
                      <Input
                        value={formData.batasTimur || ''}
                        onChange={(e) => setFormData({ ...formData, batasTimur: e.target.value })}
                        placeholder="Contoh: Kec. Bantarsari"
                        className="rounded-xl text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tombol Simpan Bawah */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-2xl px-8 py-6 font-black text-sm uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl hover:scale-105 transition-all gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan Wilayah</span>
                  </>
                )}
              </Button>
            </div>

          </div>

          {/* ── KOLOM KANAN: UPLOAD CLOUDINARY & PREVIEW (5 KOLOM) ──────────── */}
          <div className="lg:col-span-5 space-y-6">

            {/* Kartu Upload Peta Cloudinary */}
            <Card className="rounded-3xl border-border/70 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border/50 pb-4">
                <CardTitle className="text-base font-extrabold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-emerald-500" />
                    Gambar Peta Wilayah
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Cloudinary
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Unggah foto peta batas wilayah, peta tata ruang, atau infografis peta Gandrungmangu.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {/* Preview Gambar Peta */}
                {formData.mapImageUrl ? (
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-border/80 shadow-md group bg-white">
                    <Image
                      src={formData.mapImageUrl}
                      alt="Peta Wilayah Gandrungmangu"
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => mapInputRef.current?.click()}
                        disabled={uploadingMap}
                        className="rounded-xl text-xs font-bold"
                      >
                        Ganti Peta
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setFormData({ ...formData, mapImageUrl: '', mapImagePublicId: '' })}
                        className="rounded-xl text-xs font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => mapInputRef.current?.click()}
                    className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-border hover:border-amber-400/80 bg-muted/20 hover:bg-amber-500/5 transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      {uploadingMap ? (
                        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                      ) : (
                        <UploadCloud className="w-6 h-6" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      {uploadingMap ? 'Mengunggah ke Cloudinary...' : 'Klik untuk Unggah Gambar Peta'}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                      Mendukung format JPG, PNG, WebP, atau SVG (Maks. 8 MB). Peta akan otomatis tersimpan di Cloudinary.
                    </p>
                  </div>
                )}

                <input
                  ref={mapInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleMapFileChange}
                  className="hidden"
                />

                {uploadError && (
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Input Manual URL Peta jika diperlukan */}
                <div className="space-y-1.5 pt-2 border-t border-border/40">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Atau Masukkan URL Peta Langsung
                  </Label>
                  <Input
                    value={formData.mapImageUrl || ''}
                    onChange={(e) => setFormData({ ...formData, mapImageUrl: e.target.value })}
                    placeholder="https://res.cloudinary.com/.../peta.jpg"
                    className="rounded-xl text-xs font-mono"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Kartu Live Preview Tampilan di Landingpage */}
            <Card className="rounded-3xl border-border/70 shadow-sm overflow-hidden bg-slate-950 text-white">
              <CardHeader className="bg-white/5 border-b border-white/10 pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-white">
                  <span>Pratinjau Kartu Wilayah</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-300">Live Preview</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="relative aspect-[4/4] rounded-2xl bg-blue-950/80 border border-white/15 p-4 flex flex-col justify-between overflow-hidden shadow-inner">
                  {/* Foto Peta Terpasang atau Ilustrasi Siluet */}
                  {formData.mapImageUrl ? (
                    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-white border border-white/20 shadow-sm flex items-center justify-center">
                      <Image
                        src={formData.mapImageUrl}
                        alt="Preview Peta"
                        fill
                        className="object-contain p-2"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-full h-36 rounded-xl bg-white flex items-center justify-center p-2">
                      <svg viewBox="0 0 300 240" className="w-3/4 h-3/4 filter drop-shadow-md">
                        <path
                          d="M120,20 L210,35 L260,95 L280,180 L230,220 L170,230 L90,220 L40,180 L30,120 L65,60 Z"
                          fill="#2563EB"
                          stroke="#1D4ED8"
                          strokeWidth="2"
                        />
                        <circle cx="150" cy="120" r="6" fill="#E11D48" />
                      </svg>
                    </div>
                  )}

                  {/* Badge Pusat Pemerintahan */}
                  <div className="self-start px-2.5 py-1 rounded-lg bg-slate-900/90 border border-white/15 text-[10px] font-bold text-amber-300 flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    Pusat: {formData.pusatPemerintahan || 'Gandrungmangu'}
                  </div>

                  {/* Info Box Bawah */}
                  <div className="bg-slate-900/95 rounded-xl border border-white/10 p-3 text-[11px] space-y-1 mt-2">
                    <div className="flex justify-between text-slate-300">
                      <span>Luas Wilayah:</span>
                      <span className="font-bold text-white">{formData.luasWilayah || '64,37 km²'}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Jumlah Desa:</span>
                      <span className="font-bold text-white">{formData.jumlahDesa || '14 Desa'}</span>
                    </div>
                    <div className="pt-1 flex items-center gap-1 text-[9px] text-amber-400 font-semibold border-t border-white/10">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Terverifikasi Geospasial SOLID</span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[11px] text-slate-400">
                    Kartu di atas adalah representasi visual bagaimana peta dan statistik Anda tampil di landingpage.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </form>
      )}
    </div>
  );
}
