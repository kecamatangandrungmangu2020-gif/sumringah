'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Newspaper,
  Search,
  Filter,
  Calendar,
  ArrowLeft,
  Images,
  Globe,
  Clock,
  User,
  Share2,
  Building2,
  Sparkles,
  Video,
  ExternalLink
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

import { useFirebase } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { NewsImage, NewsItem } from '@/lib/types';
import { NewsPhotoGallery } from '@/components/informasi/NewsPhotoGallery';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  'Semua Kategori',
  'Pelayanan',
  'Pengumuman',
  'Pemerintahan',
  'Kegiatan',
  'Pertanian',
  'Kesehatan',
  'Pembangunan',
  'Umum'
];

export default function SemuaInformasiPage() {
  const { firestore } = useFirebase();

  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');

  // Detail Modal
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Fetch data informasi dari Firestore (realtime) atau API
  useEffect(() => {
    let unsub = () => {};

    if (firestore) {
      try {
        const q = query(
          collection(firestore, 'informasi'),
          where('status', '==', 'published')
        );

        unsub = onSnapshot(
          q,
          (snapshot) => {
            const items: NewsItem[] = [];
            snapshot.forEach((docSnap) => {
              items.push({ id: docSnap.id, ...docSnap.data() } as NewsItem);
            });
            items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            setNewsList(items);
            setLoading(false);
          },
          (err) => {
            console.warn('Fallback ke API informasi:', err);
            fetchApiData();
          }
        );
      } catch {
        fetchApiData();
      }
    } else {
      fetchApiData();
    }

    function fetchApiData() {
      fetch('/api/informasi', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && Array.isArray(data.items)) {
            setNewsList(data.items);
          }
        })
        .catch((err) => console.error('Gagal fetch /api/informasi:', err))
        .finally(() => setLoading(false));
    }

    return () => unsub();
  }, [firestore]);

  const formatNewsDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      if (dateStr.length === 10) {
        return format(parseISO(dateStr), 'dd MMMM yyyy', { locale: localeID });
      }
      return format(new Date(dateStr), 'dd MMMM yyyy', { locale: localeID });
    } catch {
      return dateStr;
    }
  };

  // Filter daftar informasi
  const filteredList = newsList.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      item.title.toLowerCase().includes(term) ||
      (item.excerpt && item.excerpt.toLowerCase().includes(term)) ||
      (item.content && item.content.toLowerCase().includes(term)) ||
      (item.author && item.author.toLowerCase().includes(term));

    const matchCategory =
      selectedCategory === 'Semua Kategori' ||
      item.category === selectedCategory;

    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 flex flex-col font-sans">
      {/* ── HEADER NAVIGATION ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
        <div className="container mx-auto px-4 max-w-6xl h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-950 transition-colors bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-full"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-sm">
              <Newspaper className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 leading-none">
                Informasi Terkini
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Kecamatan Gandrungmangu
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ──────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white via-rose-50/20 to-transparent py-10 sm:py-14 border-b border-slate-200/50">
        <div className="container mx-auto px-4 max-w-6xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black uppercase tracking-wider">
            <Newspaper className="w-3.5 h-3.5 text-rose-600" />
            Kabar &amp; Publikasi Resmi
          </div>

          <h1 className="font-editorial italic font-extrabold text-3xl sm:text-4xl md:text-5xl text-slate-900 tracking-tight">
            Semua Informasi &amp; Berita Terkini
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Kumpulan seluruh publikasi berita, sosialisasi pelayanan, pengumuman kedinasan, dan dokumentasi kemasyarakatan yang diterbitkan oleh Pemerintah Kecamatan Gandrungmangu.
          </p>
        </div>
      </section>

      {/* ── FILTER & SEARCH TOOLBAR ──────────────────────────────────────── */}
      <section className="container mx-auto px-4 max-w-6xl -mt-6">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
          {/* Baris Pencarian & Counter */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari judul artikel, topik, atau kata kunci..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium"
              />
            </div>

            <div className="text-xs font-semibold text-slate-500 self-end sm:self-center">
              Menampilkan <span className="font-bold text-slate-900">{filteredList.length}</span> dari {newsList.length} artikel
            </div>
          </div>

          {/* Baris Kategori Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── GRID DAFTAR INFORMASI ────────────────────────────────────────── */}
      <main className="container mx-auto px-4 max-w-6xl py-10 flex-1">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm animate-pulse space-y-4"
              >
                <div className="h-44 bg-slate-100 rounded-2xl w-full" />
                <div className="h-5 bg-slate-100 rounded-full w-2/3" />
                <div className="h-4 bg-slate-100 rounded-lg w-full" />
              </div>
            ))}
          </div>
        ) : filteredList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredList.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedNews(item);
                  setIsModalOpen(true);
                }}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Foto Thumbnail Sesuai Rasio Asli (Landscape & Portrait & Cuplikan YouTube) */}
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
                      <div className="w-full h-[220px] flex flex-col items-center justify-center bg-gradient-to-br from-rose-900 via-amber-900 to-slate-900 text-white/50 p-6 text-center rounded-2xl">
                        <Newspaper className="w-12 h-12 opacity-40 mb-2" />
                        <span className="text-[10px] uppercase tracking-widest text-amber-200/80 font-bold">
                          Kecamatan Gandrungmangu
                        </span>
                      </div>
                    )}

                    {/* Badge Tanggal & Kategori & Video */}
                    <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-[11px] font-bold tracking-wide shadow-md">
                          {formatNewsDate(item.date)}
                        </span>
                        {item.youtubeVideoId && (
                          <span className="px-2 py-0.5 rounded-full bg-red-600/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                            <Video className="w-3 h-3" />
                            <span>Video</span>
                          </span>
                        )}
                      </div>
                      {item.category && (
                        <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-amber-200 text-[10px] font-bold uppercase tracking-wider border border-white/20">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Isi Teks Kartu */}
                  <div className="p-6 space-y-2.5">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-rose-600 transition-colors leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal line-clamp-3">
                      {item.excerpt || item.content}
                    </p>
                  </div>
                </div>

                {/* Footer Kartu */}
                <div className="px-6 pb-6 pt-0 flex items-center justify-between border-t border-slate-50 mt-2">
                  <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold text-xs uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                    <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px]">
                      ▶
                    </span>
                    <span>Baca Selengkapnya</span>
                  </span>

                  {item.author && (
                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                      {item.author}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="p-12 sm:p-16 rounded-3xl bg-white border-2 border-dashed border-slate-200 text-center space-y-3 max-w-lg mx-auto shadow-sm">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Newspaper className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800">
              Tidak Ada Informasi yang Ditemukan
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau pilih kategori yang berbeda.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('Semua Kategori');
              }}
              className="rounded-full text-xs font-bold"
            >
              Reset Filter
            </Button>
          </div>
        )}
      </main>

      {/* ── MODAL BACA DETAIL INFORMASI ─────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-0 shadow-2xl bg-white">
          {selectedNews && (
            <div>
              {/* Cover & Gallery Multi-Foto (Landscape & Portrait Asli & Cuplikan YouTube) */}
              {(selectedNews.imageUrl || (selectedNews.images && selectedNews.images.length > 0) || selectedNews.youtubeVideoId) ? (
                <div className="p-4 sm:p-6 pb-0">
                  <NewsPhotoGallery
                    images={selectedNews.images}
                    imageUrl={selectedNews.imageUrl}
                    youtubeVideoId={selectedNews.youtubeVideoId}
                    title={selectedNews.title}
                    mode="detail"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold tracking-wide shadow-sm">
                      {formatNewsDate(selectedNews.date)}
                    </span>
                    {selectedNews.category && (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider border border-amber-200">
                        {selectedNews.category}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-6 sm:px-8 pt-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold tracking-wide">
                      {formatNewsDate(selectedNews.date)}
                    </span>
                    {selectedNews.category && (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
                        {selectedNews.category}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Isi Narasi Berita */}
              <div className="p-6 sm:p-8 space-y-5">
                <DialogHeader className="text-left space-y-2">
                  <DialogTitle className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                    {selectedNews.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {selectedNews.excerpt || selectedNews.title}
                  </DialogDescription>
                  {selectedNews.author && (
                    <div className="text-xs text-slate-400 font-medium">
                      Redaksi / Penulis: <span className="text-slate-700 font-semibold">{selectedNews.author}</span>
                    </div>
                  )}
                </DialogHeader>

                {selectedNews.excerpt && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 font-medium text-sm sm:text-base italic leading-relaxed">
                    &ldquo;{selectedNews.excerpt}&rdquo;
                  </div>
                )}

                <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line space-y-4 pt-1">
                  {selectedNews.content || selectedNews.excerpt}
                </div>

                {/* Video Dokumentasi YouTube */}
                {selectedNews.youtubeVideoId && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-600">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span>Video Dokumentasi Kegiatan</span>
                      </div>
                      <a
                        href={`https://www.youtube.com/watch?v=${selectedNews.youtubeVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline capitalize"
                      >
                        <span>Tonton di YouTube</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg border border-slate-200">
                      <iframe
                        src={`https://www.youtube.com/embed/${selectedNews.youtubeVideoId}`}
                        title={selectedNews.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                )}

                <DialogFooter className="pt-6 border-t border-slate-100 flex items-center justify-between sm:justify-between">
                  <div className="text-xs text-slate-400">
                    Kecamatan Gandrungmangu
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Tutup
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
