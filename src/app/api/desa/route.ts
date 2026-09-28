import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface DesaItem {
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

export const DAFTAR_DESA_DEFAULT: DesaItem[] = [
  {
    id: 'bulusari',
    slug: 'bulusari',
    name: 'Desa Bulusari',
    kepalaDesa: 'Kepala Desa Bulusari',
    alamat: 'Jl. Raya Bulusari, Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Bulusari merupakan salah satu desa di Kecamatan Gandrungmangu yang dikenal dengan potensi pertanian sawah dan kegiatan kemasyarakatan yang aktif.',
    websiteUrl: 'https://bulusari.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  {
    id: 'cinangsi',
    slug: 'cinangsi',
    name: 'Desa Cinangsi',
    kepalaDesa: 'Kepala Desa Cinangsi',
    alamat: 'Jl. Raya Cinangsi, Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Cinangsi berkomitmen memberikan pelayanan prima bagi warga dan mendorong kemandirian ekonomi desa berbasis potensi lokal.',
    websiteUrl: 'https://cinangsi.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  {
    id: 'cisumur',
    slug: 'cisumur',
    name: 'Desa Cisumur',
    kepalaDesa: 'Kepala Desa Cisumur',
    alamat: 'Jl. Raya Cisumur, Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Cisumur aktif dalam pengembangan digitalisasi tata kelola desa dan peningkatan produktivitas pertanian serta UMKM warga.',
    websiteUrl: 'https://cisumur.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  {
    id: 'gandrungmangu',
    slug: 'gandrungmangu',
    name: 'Desa Gandrungmangu',
    kepalaDesa: 'Kepala Desa Gandrungmangu',
    alamat: 'Pusat Pemerintahan Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Gandrungmangu menjadi pusat aktivitas ekonomi dan sentra perniagaan utama di kawasan Kecamatan Gandrungmangu.',
    websiteUrl: 'https://gandrungmangu.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  {
    id: 'gandrungmanis',
    slug: 'gandrungmanis',
    name: 'Desa Gandrungmanis',
    kepalaDesa: 'Kepala Desa Gandrungmanis',
    alamat: 'Jl. Raya Gandrungmanis, Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Gandrungmanis terus berinovasi dalam infrastruktur desa, pembinaan generasi muda, dan ketahanan pangan berkelanjutan.',
    websiteUrl: 'https://gandrungmanis.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  {
    id: 'gintungreja',
    slug: 'gintungreja',
    name: 'Desa Gintungreja',
    kepalaDesa: 'Kepala Desa Gintungreja',
    alamat: 'Jl. Raya Gintungreja, Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Gintungreja memiliki komitmen kuat dalam transparansi anggaran desa dan penyediaan layanan administrasi kependudukan yang cepat.',
    websiteUrl: 'https://gintungreja.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  {
    id: 'karanganyar',
    slug: 'karanganyar',
    name: 'Desa Karanganyar',
    kepalaDesa: 'Kepala Desa Karanganyar',
    alamat: 'Jl. Raya Karanganyar, Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Karanganyar mengedepankan sinergi kelembagaan desa, pelayanan sosial kemasyarakatan, serta pemberdayaan petani.',
    websiteUrl: 'https://karanganyar-gandrungmangu.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  {
    id: 'karanggintung',
    slug: 'karanggintung',
    name: 'Desa Karanggintung',
    kepalaDesa: 'Kepala Desa Karanggintung',
    alamat: 'Jl. Raya Karanggintung, Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Karanggintung berfokus pada pembangunan akses jalan usaha tani, kelestarian lingkungan, dan pelayanan masyarakat ramah.',
    websiteUrl: 'https://karanggintung.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  {
    id: 'kertajaya',
    slug: 'kertajaya',
    name: 'Desa Kertajaya',
    kepalaDesa: 'Kepala Desa Kertajaya',
    alamat: 'Jl. Raya Kertajaya, Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Kertajaya menggalakkan kegiatan posyandu terpadu, pendidikan anak usia dini, dan peningkatan sarana prasarana desa.',
    websiteUrl: 'https://kertajaya.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  {
    id: 'layansari',
    slug: 'layansari',
    name: 'Desa Layansari',
    kepalaDesa: 'Kepala Desa Layansari',
    alamat: 'Jl. Raya Layansari, Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Layansari kaya akan nilai-nilai religius dan kebersamaan gotong royong warga, serta sentra pendidikan keagamaan.',
    websiteUrl: 'https://layansari.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  {
    id: 'muktisari',
    slug: 'muktisari',
    name: 'Desa Muktisari',
    kepalaDesa: 'Kepala Desa Muktisari',
    alamat: 'Jl. Raya Muktisari, Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Muktisari terus memajukan sektor agribisnis dan peternakan dengan pemanfaatan teknologi tepat guna bagi kemakmuran warga.',
    websiteUrl: 'https://muktisari.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  {
    id: 'rungkang',
    slug: 'rungkang',
    name: 'Desa Rungkang',
    kepalaDesa: 'Kepala Desa Rungkang',
    alamat: 'Jl. Raya Rungkang, Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Rungkang mengedepankan partisipasi masyarakat dalam musyawarah perencanaan pembangunan desa dan pelestarian seni budaya.',
    websiteUrl: 'https://rungkang.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  {
    id: 'sidaurip',
    slug: 'sidaurip',
    name: 'Desa Sidaurip',
    kepalaDesa: 'Kepala Desa Sidaurip',
    alamat: 'Jl. Raya Sidaurip, Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Sidaurip aktif membangun tata kelola pemerintahan desa yang bersih, akuntabel, dan mengutamakan kesejahteraan rakyat.',
    websiteUrl: 'https://sidaurip-gandrungmangu.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  },
  {
    id: 'wringinharjo',
    slug: 'wringinharjo',
    name: 'Desa Wringinharjo',
    kepalaDesa: 'Kepala Desa Wringinharjo',
    alamat: 'Jl. Raya Wringinharjo, Gandrungmangu, Cilacap',
    kontak: '',
    deskripsi: 'Desa Wringinharjo merupakan desa yang dinamis dengan komunitas pemuda kreatif, pembinaan kelompok wanita tani, dan layanan terpadu.',
    websiteUrl: 'https://wringinharjo.desa.id',
    pelayananUrl: 'https://gandrungmangu.cilacapkab.go.id/pelayanan'
  }
];

function getAdminDb() {
  try {
    if (!getApps().length) {
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      if (!privateKey || !clientEmail || !projectId) {
        return null;
      }

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        })
      });
    }
    return getFirestore();
  } catch (err: any) {
    console.warn('Firebase Admin initialization warning in desa API:', err?.message || err);
    return null;
  }
}

export async function GET() {
  try {
    const db = getAdminDb();
    const storedMap = new Map<string, any>();

    if (db) {
      try {
        const snap = await db.collection('desa').get();
        snap.forEach((doc) => {
          storedMap.set(doc.id, doc.data());
        });
      } catch (e) {
        console.warn('Gagal membaca koleksi desa dari Firestore:', e);
      }
    }

    // Gabungkan data default 14 desa dengan data yang tersimpan di Firestore
    const result: DesaItem[] = DAFTAR_DESA_DEFAULT.map((def) => {
      const stored = storedMap.get(def.id) || storedMap.get(def.slug);
      if (stored) {
        return {
          ...def,
          ...stored,
          id: def.id,
          name: stored.name || def.name,
        };
      }
      return def;
    });

    return NextResponse.json({ success: true, items: result });
  } catch (error: any) {
    console.error('Error fetching data desa:', error);
    return NextResponse.json({ success: true, items: DAFTAR_DESA_DEFAULT });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, kepalaDesa, alamat, kontak, deskripsi, imageUrl, imagePublicId, websiteUrl, pelayananUrl } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID desa wajib disertakan' }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Admin DB tidak tersedia' }, { status: 500 });
    }

    const cleanData = {
      id,
      name: name || '',
      slug: id,
      kepalaDesa: kepalaDesa || '',
      alamat: alamat || '',
      kontak: kontak || '',
      deskripsi: deskripsi || '',
      imageUrl: imageUrl || '',
      imagePublicId: imagePublicId || '',
      websiteUrl: websiteUrl || '',
      pelayananUrl: pelayananUrl || '',
      updatedAt: new Date().toISOString(),
    };

    await db.collection('desa').doc(id).set(cleanData, { merge: true });

    return NextResponse.json({ success: true, message: 'Data desa berhasil disimpan', data: cleanData });
  } catch (error: any) {
    console.error('Error saving data desa:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Gagal menyimpan data desa' }, { status: 500 });
  }
}
