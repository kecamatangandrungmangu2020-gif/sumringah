'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Newspaper,
  Search,
  ArrowLeft,
  Video,
  ExternalLink,
  Calendar,
  User,
  Sparkles,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

import { useFirebase } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { NewsItem } from '@/lib/types';
import { NewsPhotoGallery } from '@/components/informasi/NewsPhotoGallery';
import { BackgroundPattern } from '@/components/landing/BackgroundPattern';
import { NightModeSwitch } from '@/components/ui/NightModeSwitch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  'Umum',
];

export default function SemuaInformasiPage() {
  const { firestore } = useFirebase();

  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');

  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let unsub = () => {};

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
          () => fetchApiData()
        );
      } catch {
        fetchApiData();
      }
    } else {
      fetchApiData();
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

  const filteredList = newsList.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      item.title.toLowerCase().includes(term) ||
      (item.excerpt && item.excerpt.toLowerCase().includes(term)) ||
      (item.content && item.content.toLowerCase().includes(term)) ||
      (item.author && item.author.toLowerCase().includes(term));

    const matchCategory =
      selectedCategory === 'Semua Kategori' || item.category === selectedCategory;

    return matchSearch && matchCategory;
  });

  return (
    <div className="relative min-h-screen bg-[#FAF8F5] dark:bg-[#05110E] text-[#041E17] dark:text-[#FAF8F5] flex flex-col transition-colors duration-300 overflow-x-clip">
      <BackgroundPattern />

      {/* Top Floating Porcelain Capsule Header */}
      <header className="sticky top-0 z-40 px-3 sm:px-6 pt-2.5 pb-1.5">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3 px-4 h-13 sm:h-14 rounded-full bg-white/95 dark:bg-[#0A1F1A]/95 backdrop-blur-xl border border-[#E6E0D3] dark:border-[#C8A253]/20 shadow-[0_8px_24px_rgba(4,30,23,0.08)]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#065F46] hover:bg-[#041E17] text-white font-hero text-xs font-bold transition-all shadow-sm shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Beranda</span>
            </Link>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="font-hero font-extrabold text-sm text-[#041E17] dark:text-white leading-none truncate">
                Informasi &amp; Warta Gandrungmangu
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#065F46] dark:text-[#E5C882] mt-0.5">
                Publikasi Resmi Pemerintah Kecamatan
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://gandrungmangu.cilacapkab.go.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F3EFE6] hover:bg-[#C8A253] text-[#041E17] dark:bg-white/10 dark:text-[#E5C882] dark:hover:bg-[#C8A253] dark:hover:text-[#041E17] border border-[#C8A253]/30 font-hero text-[11px] font-bold transition-all"
            >
              <span>Berita Desa</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <NightModeSwitch size="sm" />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 flex-1 space-y-5">
        {/* Sovereign Deep Emerald Hero Banner */}
        <section className="relative overflow-hidden rounded-[24px] p-5 sm:p-7 bg-gradient-to-br from-[#065F46] via-[#064E3B] to-[#041E17] text-white border border-[#C8A253]/30 shadow-[0_18px_45px_rgba(4,30,23,0.2)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-3 bottom-0 w-32 h-36 opacity-[0.18] bg-no-repeat bg-contain bg-right-bottom"
            style={{ backgroundImage: "url('/images/tugu-gandrungmangu-silhouette.webp')" }}
          />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/12 border border-[#E5C882]/35 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#E5C882]">
                <Newspaper className="w-3.5 h-3.5" />
                <span>Warta &amp; Publikasi Resmi</span>
              </div>
              <h1 className="font-hero font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight">
                Informasi &amp; Warta <span className="text-[#E5C882]">Gandrungmangu</span>
              </h1>
              <p className="font-hero text-xs sm:text-sm text-[#F5E9CC]/90 leading-relaxed">
                Kumpulan lengkap seluruh publikasi berita, sosialisasi pelayanan, pengumuman kedinasan, dan dokumentasi kemasyarakatan Kecamatan Gandrungmangu.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#041E17]/60 border border-[#C8A253]/30 shrink-0 self-start lg:self-auto">
              <Sparkles className="w-4 h-4 text-[#E5C882]" />
              <span className="font-mono text-xs font-bold text-[#F5E9CC]">
                {filteredList.length} / {newsList.length} Artikel
              </span>
            </div>
          </div>
        </section>

        {/* Filter & Search Toolbar */}
        <section className="rounded-[22px] bg-white/95 dark:bg-[#0A1F1A]/95 border border-[#E6E0D3] dark:border-[#C8A253]/20 p-4 sm:p-5 shadow-sm space-y-3.5">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-[#065F46] dark:text-[#E5C882] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari judul artikel, topik, atau penulis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-full bg-[#FAF8F5] dark:bg-[#05110E] border-[#E6E0D3] dark:border-white/15 text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full font-hero text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#065F46] text-white shadow-sm'
                        : 'bg-[#F3EFE6] dark:bg-white/10 hover:bg-[#C8A253]/25 text-[#041E17] dark:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Grid Daftar Semua Kartu Informasi */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-[#0A1F1A] rounded-3xl p-5 border border-[#E6E0D3] dark:border-white/10 shadow-sm animate-pulse space-y-4"
              >
                <div className="h-44 bg-[#F3EFE6] dark:bg-white/10 rounded-2xl w-full" />
                <div className="h-5 bg-[#F3EFE6] dark:bg-white/10 rounded-full w-2/3" />
                <div className="h-4 bg-[#F3EFE6] dark:bg-white/10 rounded-lg w-full" />
              </div>
            ))}
          </div>
        ) : filteredList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredList.map((item) => (
              <article
                key={item.id}
                onClick={() => {
                  setSelectedNews(item);
                  setIsModalOpen(true);
                }}
                className="card-Kecamatan overflow-hidden cursor-pointer flex flex-col justify-between group"
              >
                <div>
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
                      <div className="w-full h-[210px] flex flex-col items-center justify-center bg-gradient-to-br from-[#065F46] via-[#064E3B] to-[#041E17] text-white/60 p-6 text-center">
                        <Newspaper className="w-11 h-11 opacity-50 mb-2 text-[#E5C882]" />
                        <span className="font-mono text-[10px] uppercase tracking-widest text-[#E5C882] font-bold">
                          Kecamatan Gandrungmangu
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#065F46] text-white font-mono text-[10px] font-bold shadow-md">
                          <Calendar className="w-3 h-3 text-[#E5C882]" />
                          {formatNewsDate(item.date)}
                        </span>
                        {item.youtubeVideoId && (
                          <span className="px-2 py-0.5 rounded-full bg-[#C8A253] text-[#041E17] text-[10px] font-bold flex items-center gap-1 shadow-sm">
                            <Video className="w-3 h-3" />
                            <span>Video</span>
                          </span>
                        )}
                      </div>
                      {item.category && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#041E17]/80 backdrop-blur-md text-[#E5C882] text-[10px] font-bold uppercase tracking-wider border border-[#C8A253]/30">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="font-hero text-base sm:text-lg font-extrabold text-[#041E17] dark:text-white group-hover:text-[#065F46] dark:group-hover:text-[#E5C882] transition-colors leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="font-hero text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {item.excerpt || item.content}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 flex items-center justify-between border-t border-[#E6E0D3]/70 dark:border-white/10">
                  <span className="inline-flex items-center gap-1.5 text-[#065F46] dark:text-[#E5C882] font-hero font-bold text-xs uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                    <span className="w-4 h-4 rounded-full bg-[#065F46] dark:bg-[#C8A253] text-white dark:text-[#041E17] flex items-center justify-center text-[9px]">
                      ▶
                    </span>
                    <span>Baca Selengkapnya</span>
                  </span>

                  {item.author && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[130px]">
                      <User className="w-3 h-3 shrink-0" />
                      {item.author}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-[#0A1F1A] border-2 border-dashed border-[#C8A253]/40 text-center space-y-3 max-w-lg mx-auto shadow-sm">
            <div className="w-14 h-14 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#E5C882] flex items-center justify-center mx-auto">
              <Newspaper className="w-7 h-7" />
            </div>
            <h4 className="font-hero text-base font-bold text-[#041E17] dark:text-white">
              Tidak Ada Informasi yang Ditemukan
            </h4>
            <p className="font-hero text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau pilih kategori yang berbeda.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('Semua Kategori');
              }}
              className="rounded-full text-xs font-bold border-[#065F46] text-[#065F46] dark:border-[#C8A253] dark:text-[#E5C882]"
            >
              Reset Filter
            </Button>
          </div>
        )}
      </main>

      {/* Modal Baca Detail Informasi */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border border-[#C8A253]/25 shadow-2xl bg-white dark:bg-[#0A1F1A] text-[#041E17] dark:text-slate-100">
          {selectedNews && (
            <div>
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
                    <span className="px-3 py-1 rounded-full bg-[#065F46] text-white text-xs font-bold tracking-wide shadow-sm">
                      {formatNewsDate(selectedNews.date)}
                    </span>
                    {selectedNews.category && (
                      <span className="px-3 py-1 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B] text-[#065F46] dark:text-[#E5C882] text-xs font-bold uppercase tracking-wider border border-[#C8A253]/30">
                        {selectedNews.category}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-6 sm:px-8 pt-6 flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#065F46] text-white text-xs font-bold tracking-wide">
                    {formatNewsDate(selectedNews.date)}
                  </span>
                  {selectedNews.category && (
                    <span className="px-3 py-1 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B] text-[#065F46] dark:text-[#E5C882] text-xs font-bold uppercase tracking-wider">
                      {selectedNews.category}
                    </span>
                  )}
                </div>
              )}

              <div className="p-6 sm:p-8 space-y-5">
                <DialogHeader className="text-left space-y-2">
                  <DialogTitle className="font-hero text-2xl sm:text-3xl font-bold text-[#041E17] dark:text-white leading-tight">
                    {selectedNews.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {selectedNews.excerpt || selectedNews.title}
                  </DialogDescription>
                  {selectedNews.author && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Redaksi / Penulis: <span className="text-[#065F46] dark:text-[#E5C882] font-semibold">{selectedNews.author}</span>
                    </div>
                  )}
                </DialogHeader>

                {selectedNews.excerpt && (
                  <div className="p-4 rounded-2xl bg-[#F3EFE6] dark:bg-[#064E3B]/40 border border-[#C8A253]/35 text-[#041E17] dark:text-[#F5E9CC] font-medium text-sm sm:text-base italic leading-relaxed">
                    &ldquo;{selectedNews.excerpt}&rdquo;
                  </div>
                )}

                <div className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line space-y-4 pt-1">
                  {selectedNews.content || selectedNews.excerpt}
                </div>

                {selectedNews.youtubeVideoId && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#065F46] dark:text-[#E5C882]">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span>Video Dokumentasi Kegiatan</span>
                      </div>
                      <a
                        href={`https://www.youtube.com/watch?v=${selectedNews.youtubeVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold hover:underline capitalize"
                      >
                        <span>Tonton di YouTube</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg border border-[#E6E0D3] dark:border-white/15">
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

                <DialogFooter className="pt-5 border-t border-[#E6E0D3] dark:border-white/10 flex items-center justify-between sm:justify-between">
                  <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    Kecamatan Gandrungmangu
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-full bg-[#041E17] hover:bg-[#065F46] dark:bg-[#C8A253] dark:hover:bg-[#E5C882] text-white dark:text-[#041E17] font-hero font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
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
