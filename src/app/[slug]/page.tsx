'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, notFound } from 'next/navigation';
import {
  Landmark,
  MapPin,
  Globe,
  ExternalLink,
  Phone,
  Mail,
  User,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  Clock,
  Building2,
  Calendar,
  Share2,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

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

const DAFTAR_DESA_DEFAULT: Record<string, DesaItem> = {
  bulusari: {
    id: 'bulusari',
    slug: 'bulusari',
    name: 'Desa Bulusari',
    kepalaDesa: 'Kepala Desa Bulusari',
    alamat: 'Jl. Raya Bulusari, Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Bulusari merupakan salah satu desa di Kecamatan Gandrungmangu yang dikenal dengan potensi pertanian sawah dan kegiatan kemasyarakatan yang dinamis. Pemerintah Desa Bulusari terus meningkatkan kualitas tata kelola desa berbasis teknologi informasi guna memberikan pelayanan yang transparan, mudah, dan akuntabel bagi seluruh warga.',
    websiteUrl: 'https://bulusari.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  cinangsi: {
    id: 'cinangsi',
    slug: 'cinangsi',
    name: 'Desa Cinangsi',
    kepalaDesa: 'Kepala Desa Cinangsi',
    alamat: 'Jl. Raya Cinangsi, Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Cinangsi berkomitmen memberikan pelayanan prima bagi warga dan mendorong kemandirian ekonomi desa berbasis potensi lokal, pertanian, serta penguatan sektor usaha mikro kecil dan menengah (UMKM).',
    websiteUrl: 'https://cinangsi.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  cisumur: {
    id: 'cisumur',
    slug: 'cisumur',
    name: 'Desa Cisumur',
    kepalaDesa: 'Kepala Desa Cisumur',
    alamat: 'Jl. Raya Cisumur, Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Cisumur aktif dalam pengembangan digitalisasi tata kelola desa, peningkatan produktivitas hasil tani, dan transparansi pelayanan publik yang terintegrasi dengan sistem pelayanan Kecamatan Gandrungmangu.',
    websiteUrl: 'https://cisumur.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  gandrungmangu: {
    id: 'gandrungmangu',
    slug: 'gandrungmangu',
    name: 'Desa Gandrungmangu',
    kepalaDesa: 'Kepala Desa Gandrungmangu',
    alamat: 'Pusat Pemerintahan Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Gandrungmangu merupakan pusat aktivitas ekonomi, sentra perniagaan utama, dan kawasan penyangga pelayanan strategis di lingkungan Kecamatan Gandrungmangu dengan fasilitas publik yang representatif.',
    websiteUrl: 'https://gandrungmangu.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  gandrungmanis: {
    id: 'gandrungmanis',
    slug: 'gandrungmanis',
    name: 'Desa Gandrungmanis',
    kepalaDesa: 'Kepala Desa Gandrungmanis',
    alamat: 'Jl. Raya Gandrungmanis, Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Gandrungmanis terus berinovasi dalam infrastruktur desa, pembinaan generasi muda, dan ketahanan pangan berkelanjutan demi mewujudkan kehidupan masyarakat yang makmur dan sejahtera.',
    websiteUrl: 'https://gandrungmanis.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  gintungreja: {
    id: 'gintungreja',
    slug: 'gintungreja',
    name: 'Desa Gintungreja',
    kepalaDesa: 'Kepala Desa Gintungreja',
    alamat: 'Jl. Raya Gintungreja, Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Gintungreja memiliki komitmen kuat dalam keterbukaan informasi publik, penyediaan layanan administrasi kependudukan yang cepat, dan pembangunan sarana prasarana pedesaan.',
    websiteUrl: 'https://gintungreja.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  karanganyar: {
    id: 'karanganyar',
    slug: 'karanganyar',
    name: 'Desa Karanganyar',
    kepalaDesa: 'Kepala Desa Karanganyar',
    alamat: 'Jl. Raya Karanganyar, Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Karanganyar mengedepankan sinergi kelembagaan desa, pelayanan sosial kemasyarakatan, serta pemberdayaan petani melalui gabungan kelompok tani (Gapoktan) yang tangguh.',
    websiteUrl: 'https://karanganyar-gandrungmangu.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  karanggintung: {
    id: 'karanggintung',
    slug: 'karanggintung',
    name: 'Desa Karanggintung',
    kepalaDesa: 'Kepala Desa Karanggintung',
    alamat: 'Jl. Raya Karanggintung, Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Karanggintung berfokus pada pembangunan jalan usaha tani, kelestarian lingkungan hidup, dan pelayanan masyarakat yang humanis dan ramah bagi segenap kalangan warga.',
    websiteUrl: 'https://karanggintung.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  kertajaya: {
    id: 'kertajaya',
    slug: 'kertajaya',
    name: 'Desa Kertajaya',
    kepalaDesa: 'Kepala Desa Kertajaya',
    alamat: 'Jl. Raya Kertajaya, Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Kertajaya menggalakkan kegiatan posyandu terpadu, peningkatan kualitas pendidikan dasar desa, dan percepatan penyaluran program bantuan sosial tepat sasaran.',
    websiteUrl: 'https://kertajaya.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  layansari: {
    id: 'layansari',
    slug: 'layansari',
    name: 'Desa Layansari',
    kepalaDesa: 'Kepala Desa Layansari',
    alamat: 'Jl. Raya Layansari, Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Layansari dikenal sebagai kawasan yang sarat nilai religius dan tradisi kebersamaan gotong royong yang kental, didukung pusat pendidikan keagamaan terkemuka di Gandrungmangu.',
    websiteUrl: 'https://layansari.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  muktisari: {
    id: 'muktisari',
    slug: 'muktisari',
    name: 'Desa Muktisari',
    kepalaDesa: 'Kepala Desa Muktisari',
    alamat: 'Jl. Raya Muktisari, Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Muktisari terus memajukan sektor agribisnis dan peternakan dengan pemanfaatan teknologi tepat guna demi mendorong taraf hidup dan perekonomian warga desa.',
    websiteUrl: 'https://muktisari.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  rungkang: {
    id: 'rungkang',
    slug: 'rungkang',
    name: 'Desa Rungkang',
    kepalaDesa: 'Kepala Desa Rungkang',
    alamat: 'Jl. Raya Rungkang, Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Rungkang menjunjung tinggi asas musyawarah mufakat, pelestarian kearifan seni budaya tradisional, dan kemudahan pengurusan surat-menyurat warga.',
    websiteUrl: 'https://rungkang.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  sidaurip: {
    id: 'sidaurip',
    slug: 'sidaurip',
    name: 'Desa Sidaurip',
    kepalaDesa: 'Kepala Desa Sidaurip',
    alamat: 'Jl. Raya Sidaurip, Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Sidaurip aktif membangun tata kelola pemerintahan desa yang bersih, berintegritas, dan inovatif dalam menghadirkan layanan kependudukan secara cepat dan tepat.',
    websiteUrl: 'https://sidaurip-gandrungmangu.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  wringinharjo: {
    id: 'wringinharjo',
    slug: 'wringinharjo',
    name: 'Desa Wringinharjo',
    kepalaDesa: 'Kepala Desa Wringinharjo',
    alamat: 'Jl. Raya Wringinharjo, Gandrungmangu, Cilacap, Jawa Tengah 53254',
    kontak: '(0282) 526-XXX',
    deskripsi: 'Desa Wringinharjo merupakan desa yang dinamis dengan komunitas pemuda kreatif, pembinaan kelompok tani wanita, serta pelayanan administrasi yang siap melayani dengan ramah.',
    websiteUrl: 'https://wringinharjo.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  }
};

const ALL_VILLAGES_LIST = Object.values(DAFTAR_DESA_DEFAULT);

export default function VillagePortalPage() {
  const params = useParams();
  const rawSlug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : '';
  const normalizedSlug = (rawSlug || '').toLowerCase();

  const isKnownVillage = Boolean(DAFTAR_DESA_DEFAULT[normalizedSlug]);
  const defaultData = DAFTAR_DESA_DEFAULT[normalizedSlug] || DAFTAR_DESA_DEFAULT['bulusari'];

  const [desa, setDesa] = useState<DesaItem>(defaultData);
  const [allDesa, setAllDesa] = useState<DesaItem[]>(ALL_VILLAGES_LIST);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (normalizedSlug && DAFTAR_DESA_DEFAULT[normalizedSlug]) {
      setDesa(DAFTAR_DESA_DEFAULT[normalizedSlug]);
    }
  }, [normalizedSlug]);

  // Fetch updated data from API
  useEffect(() => {
    fetch('/api/desa?t=' + Date.now(), { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.items)) {
          setAllDesa(data.items);
          const found = data.items.find(
            (d: DesaItem) => (d.slug || d.id || '').toLowerCase() === normalizedSlug
          );
          if (found) {
            setDesa(found);
          }
        }
      })
      .catch(() => {});
  }, [normalizedSlug]);

  if (rawSlug && !isKnownVillage) {
    notFound();
  }

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const otherVillages = allDesa.filter(
    (d) => (d.slug || d.id).toLowerCase() !== normalizedSlug
  );

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-900">

      {/* ── 1. HEADER / NAVBAR ELEGAN DENGAN BACK BUTTON ────────────────── */}
      <header className="sticky top-0 z-50 w-full px-4 sm:px-8 py-4 bg-slate-950/85 backdrop-blur-xl border-b border-white/10 text-white shadow-lg">
        <div className="container mx-auto flex items-center justify-between">

          {/* Tombol Kembali ke Kecamatan & Identitas Daerah */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15"
              title="Kembali ke Beranda Kecamatan"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Kecamatan Gandrungmangu</span>
              <span className="sm:hidden">Beranda</span>
            </Link>

            <div className="h-4 w-px bg-white/20 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                Desa Resmi
              </span>
              <span className="text-sm sm:text-base font-bold text-white tracking-tight">
                {desa.name}
              </span>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all border border-white/15"
              title="Salin Tautan Halaman"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">{copied ? 'Tersalin!' : 'Bagikan'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* ── 2. HERO SECTION KHAS PROFIL DESA ────────────────────────────── */}
      <section className="relative w-full min-h-[460px] sm:min-h-[520px] md:min-h-[580px] flex flex-col justify-between overflow-hidden">
        {/* Foto Banner Desa (Cloudinary atau Default Background) */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-slate-950">
          {desa.imageUrl ? (
            <Image
              src={desa.imageUrl}
              alt={desa.name}
              fill
              priority
              className="object-cover object-center brightness-95"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-950 via-amber-950 to-slate-900" />
          )}
          {/* Overlay Natural Warm Vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-amber-950/40 via-transparent to-black/40" />
        </div>

        {/* Konten Hero Tengah */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 my-auto pt-16 pb-12 max-w-5xl">
          <div className="space-y-4 text-center sm:text-left">

            {/* Badges Info Kewilayahan */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
              <span className="px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md">
                Pemerintah Desa
              </span>
              <span className="px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-200 text-xs font-bold uppercase tracking-wider border border-white/25">
                Kecamatan Gandrungmangu
              </span>
              <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-slate-300 text-xs font-medium border border-white/10 hidden sm:inline-block">
                Kabupaten Cilacap
              </span>
            </div>

            {/* Judul Besar Nama Desa */}
            <h1 className="font-editorial italic font-extrabold text-5xl sm:text-7xl md:text-8xl text-white tracking-normal drop-shadow-xl select-none leading-none">
              {desa.name}
            </h1>

            {/* Tombol Aksi Tautan Resmi Desa */}
            {(desa.websiteUrl || desa.pelayananUrl) ? (
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4">
                {desa.websiteUrl ? (
                  <a
                    href={desa.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Website Resmi Desa</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                ) : null}

                {desa.pelayananUrl ? (
                  <a
                    href={desa.pelayananUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Pelayanan Online Desa</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                ) : null}
              </div>
            ) : null}

          </div>
        </div>

        {/* Ombak Penutup Bawah Menuju Konten Putih */}
        <div className="relative z-10 w-full overflow-hidden leading-none">
          <svg
            className="w-full h-12 sm:h-16 md:h-20 text-[#FAF9F5]"
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <path
              d="M0,40 C360,110 540,10 900,70 C1200,120 1340,30 1440,60 L1440,120 L0,120 Z"
              fill="#FAF9F5"
            />
          </svg>
        </div>
      </section>

      {/* ── 3. TIGA KARTU INFORMASI UTAMA WILAYAH ───────────────────────── */}
      <section className="relative z-20 -mt-6 sm:-mt-8 container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">

          {/* Kartu 1: Kepala Desa */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-md hover:shadow-lg transition-all space-y-2 flex flex-col justify-between">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-1">
              <User className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Kepala Desa
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 mt-0.5 leading-snug">
                {desa.kepalaDesa || 'Belum diatur'}
              </h3>
            </div>
            <div className="pt-2 text-xs text-slate-500 flex items-center gap-1.5 font-medium border-t border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Pemerintahan Desa Aktif</span>
            </div>
          </div>

          {/* Kartu 2: Alamat Balai Desa */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-md hover:shadow-lg transition-all space-y-2 flex flex-col justify-between">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-1">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Kantor Balai Desa
              </span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 leading-relaxed line-clamp-2">
                {desa.alamat || 'Alamat balai desa belum diisi'}
              </p>
            </div>
            <div className="pt-2 text-xs text-slate-500 flex items-center gap-1.5 font-medium border-t border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-rose-600" />
              <span>Wilayah Gandrungmangu</span>
            </div>
          </div>

          {/* Kartu 3: Kontak & Pelayanan */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-md hover:shadow-lg transition-all space-y-2 flex flex-col justify-between">
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-1">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Kontak & Telepon
              </span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {desa.kontak || 'Hubungi Kantor Balai Desa'}
              </p>
            </div>
            <div className="pt-2 text-xs text-slate-500 flex items-center gap-1.5 font-medium border-t border-slate-100">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Senin - Jumat 08.00 - 15.00</span>
            </div>
          </div>

        </div>
      </section>

      {/* ── 4. KONTEN DETAIL PROFIL DESA & LAYANAN ───────────────────────── */}
      <section className="py-14 sm:py-20 container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* Kolom Kiri: Rincian Narasi / Profil Desa */}
          <div className="lg:col-span-8 bg-white p-7 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black uppercase tracking-wider">
                <Landmark className="w-3.5 h-3.5 text-amber-700" />
                Profil & Informasi Lengkap
              </div>
              <h2 className="font-editorial italic font-extrabold text-3xl sm:text-4xl text-slate-900">
                Tentang {desa.name}
              </h2>
            </div>

            <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line space-y-4">
              {desa.deskripsi || 'Deskripsi dan rincian profil desa belum diatur oleh admin.'}
            </div>
          </div>

          {/* Kolom Kanan: Kartu Info Resmi Balai Desa & Tautan */}
          <div className="lg:col-span-4 space-y-6">

            {/* Kartu Portal Website Resmi Desa */}
            <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 text-white shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Portal Resmi Desa</h4>
                  <span className="text-[10px] text-slate-400">Domain Resmi .desa.id</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Kunjungi situs web desa untuk melihat publikasi anggaran, transparansi APBDes, serta berita lokal terkini.
              </p>

              {desa.websiteUrl ? (
                <a
                  href={desa.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <span>Buka Website Desa</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <div className="py-2.5 px-4 rounded-xl bg-white/10 text-slate-400 text-xs font-bold text-center">
                  Website Desa Segera Hadir
                </div>
              )}
            </div>

            {/* Kartu Jam Operasional Pelayanan */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Jam Kerja Balai Desa
              </h4>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">Senin - Kamis</span>
                  <span>08.00 - 15.00 WIB</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">Jumat</span>
                  <span>08.00 - 15.30 WIB</span>
                </div>
                <div className="flex justify-between py-1 text-rose-600 font-semibold">
                  <span>Sabtu - Minggu</span>
                  <span>Tutup (Libur)</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── 5. JELAJAHI 13 DESA LAINNYA DI GANDRUNGMANGU ─────────────────── */}
      <section className="py-14 sm:py-16 bg-white border-t border-slate-200/70">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-[11px] font-black uppercase text-amber-700 tracking-wider block mb-1">
                Kecamatan Gandrungmangu
              </span>
              <h3 className="font-editorial italic font-extrabold text-2xl sm:text-3xl text-slate-900">
                Jelajahi Desa Lainnya
              </h3>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 transition-colors"
            >
              <span>Beranda Kecamatan</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {otherVillages.map((item) => (
              <Link
                key={item.id}
                href={`/${item.slug || item.id}/`}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-200/80 hover:border-amber-300 text-slate-800 hover:text-amber-900 transition-all text-center flex flex-col items-center justify-center space-y-1.5 group shadow-sm hover:shadow-md"
              >
                <div className="w-8 h-8 rounded-full bg-white text-slate-700 group-hover:bg-amber-400 group-hover:text-slate-950 flex items-center justify-center transition-colors shadow-sm">
                  <Landmark className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold truncate max-w-full">
                  {item.name.replace('Desa ', '')}
                </span>
                <span className="text-[9px] text-slate-400 group-hover:text-amber-700 uppercase font-semibold">
                  Lihat Profil →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. FOOTER ───────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white py-10 border-t border-slate-800 text-xs">
        <div className="container mx-auto px-4 max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <span className="font-bold text-white text-sm block">
              {desa.name} • Kecamatan Gandrungmangu
            </span>
            <p className="text-slate-400 text-[11px]">
              Pemerintah Kabupaten Cilacap, Provinsi Jawa Tengah.
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider text-[10px] transition-colors"
          >
            Portal Kecamatan Gandrungmangu
          </Link>
        </div>
      </footer>

    </div>
  );
}
