import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface PengaduanData {
  id?: string;
  jenis: 'pengaduan' | 'informasi';
  nama: string;
  nik?: string;
  nohp: string;
  email?: string;
  subjek: string;
  isi: string;
  status: 'baru' | 'diproses' | 'selesai' | 'ditolak';
  balasan?: string;
  dibalasOleh?: string;
  diprosesPada?: string;
  dibalas?: boolean;
  createdAt: string;
  updatedAt?: string;
}

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

// GET: Ambil semua pengaduan (untuk admin)
export async function GET(req: Request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ success: false, data: [] }, { status: 500 });
    }

    const url = new URL(req.url);
    const jenis = url.searchParams.get('jenis'); // filter by jenis
    const status = url.searchParams.get('status'); // filter by status
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let query = db.collection('pengaduan').orderBy('createdAt', 'desc').limit(limit);

    const snapshot = await db.collection('pengaduan').orderBy('createdAt', 'desc').limit(limit).get();

    let data: PengaduanData[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<PengaduanData, 'id'>),
    }));

    // Client-side filter
    if (jenis) data = data.filter(d => d.jenis === jenis);
    if (status) data = data.filter(d => d.status === status);

    return NextResponse.json({ success: true, data, total: data.length });
  } catch (error: any) {
    console.error('Error fetching pengaduan:', error);
    return NextResponse.json({ success: false, data: [], error: error.message }, { status: 500 });
  }
}

// POST: Buat pengaduan baru (dari landing page / publik)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getAdminDb();

    if (!db) {
      return NextResponse.json({ success: false, message: 'Database tidak tersedia' }, { status: 500 });
    }

    if (!body.nama?.trim() || !body.nohp?.trim() || !body.subjek?.trim() || !body.isi?.trim() || !body.jenis) {
      return NextResponse.json(
        { success: false, message: 'Nama, No. HP, Subjek, dan Isi wajib diisi.' },
        { status: 400 }
      );
    }

    const newData: PengaduanData = {
      jenis: body.jenis === 'informasi' ? 'informasi' : 'pengaduan',
      nama: body.nama.trim(),
      nik: body.nik?.trim() || '',
      nohp: body.nohp.trim(),
      email: body.email?.trim() || '',
      subjek: body.subjek.trim(),
      isi: body.isi.trim(),
      status: 'baru',
      dibalas: false,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('pengaduan').add(newData);

    return NextResponse.json({
      success: true,
      message: body.jenis === 'informasi'
        ? 'Permintaan informasi berhasil dikirim. Kami akan segera merespons.'
        : 'Pengaduan Anda berhasil dikirim. Kami akan segera menindaklanjuti.',
      id: docRef.id,
    });
  } catch (error: any) {
    console.error('Error creating pengaduan:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mengirim pengaduan' },
      { status: 500 }
    );
  }
}

// PATCH: Admin membalas / mengubah status pengaduan
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const db = getAdminDb();

    if (!body.id) {
      return NextResponse.json({ success: false, message: 'ID pengaduan wajib ada.' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ success: false, message: 'Database tidak tersedia' }, { status: 500 });
    }

    const updateData: Partial<PengaduanData> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.status) updateData.status = body.status;
    if (body.balasan !== undefined) {
      updateData.balasan = body.balasan;
      updateData.dibalas = !!body.balasan;
      updateData.dibalasOleh = body.dibalasOleh || 'Admin';
      updateData.diprosesPada = new Date().toISOString();
    }

    await db.collection('pengaduan').doc(body.id).update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Pengaduan berhasil diperbarui.',
    });
  } catch (error: any) {
    console.error('Error updating pengaduan:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memperbarui pengaduan' },
      { status: 500 }
    );
  }
}
