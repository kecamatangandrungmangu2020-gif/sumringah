import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface WilayahData {
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

export const DEFAULT_WILAYAH_DATA: WilayahData = {
  title: 'Wilayah Gandrungmangu',
  subtitle: 'Geospasial & Kewilayahan',
  description:
    'Kecamatan Gandrungmangu membentang strategis di bagian barat Kabupaten Cilacap, menaungi 14 Desa dengan potensi agraris yang subur, sentra perekonomian rakyat, dan kerukunan warga yang kokoh.',
  secondaryDescription:
    'Melalui integrasi data interaktif SOLID (Sistem Olah Laporan Informasi & Data Desa), Anda dapat mengeksplorasi informasi desa, potensi desa, jaringan jalan, serta data geospasial kewilayahan secara transparan dan mudah diakses.',
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

function getAdminDb() {
  if (getApps().length === 0) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

      if (privateKey && clientEmail && projectId) {
        initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });
      } else {
        initializeApp();
      }
    } catch (e) {
      console.warn('Firebase Admin init warning:', e);
    }
  }

  try {
    return getFirestore();
  } catch (err) {
    console.error('getFirestore Admin error:', err);
    return null;
  }
}

export async function GET() {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ success: true, data: DEFAULT_WILAYAH_DATA });
    }

    const docSnap = await db.collection('settings').doc('wilayah').get();
    if (docSnap.exists) {
      const stored = docSnap.data();
      return NextResponse.json({
        success: true,
        data: {
          ...DEFAULT_WILAYAH_DATA,
          ...stored,
        },
      });
    }

    return NextResponse.json({ success: true, data: DEFAULT_WILAYAH_DATA });
  } catch (error: any) {
    console.error('Error fetching data wilayah:', error);
    return NextResponse.json({ success: true, data: DEFAULT_WILAYAH_DATA });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getAdminDb();

    if (!db) {
      return NextResponse.json({ success: false, message: 'Database Admin tidak tersedia' }, { status: 500 });
    }

    const cleanData: WilayahData = {
      title: body.title || DEFAULT_WILAYAH_DATA.title,
      subtitle: body.subtitle || DEFAULT_WILAYAH_DATA.subtitle,
      description: body.description || DEFAULT_WILAYAH_DATA.description,
      secondaryDescription: body.secondaryDescription || DEFAULT_WILAYAH_DATA.secondaryDescription,
      mapImageUrl: body.mapImageUrl || '',
      mapImagePublicId: body.mapImagePublicId || '',
      bgImageUrl: body.bgImageUrl || DEFAULT_WILAYAH_DATA.bgImageUrl,
      bgImagePublicId: body.bgImagePublicId || '',
      mapButtonText: body.mapButtonText || DEFAULT_WILAYAH_DATA.mapButtonText,
      mapLinkUrl: body.mapLinkUrl || DEFAULT_WILAYAH_DATA.mapLinkUrl,
      luasWilayah: body.luasWilayah || DEFAULT_WILAYAH_DATA.luasWilayah,
      jumlahDesa: body.jumlahDesa || DEFAULT_WILAYAH_DATA.jumlahDesa,
      pusatPemerintahan: body.pusatPemerintahan || DEFAULT_WILAYAH_DATA.pusatPemerintahan,
      batasUtara: body.batasUtara || DEFAULT_WILAYAH_DATA.batasUtara,
      batasSelatan: body.batasSelatan || DEFAULT_WILAYAH_DATA.batasSelatan,
      batasBarat: body.batasBarat || DEFAULT_WILAYAH_DATA.batasBarat,
      batasTimur: body.batasTimur || DEFAULT_WILAYAH_DATA.batasTimur,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('settings').doc('wilayah').set(cleanData, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Pengaturan wilayah berhasil diperbarui',
      data: cleanData,
    });
  } catch (error: any) {
    console.error('Error saving data wilayah:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menyimpan data wilayah' },
      { status: 500 }
    );
  }
}
