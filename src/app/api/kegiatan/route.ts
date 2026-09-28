import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getAdminDb() {
  try {
    if (!getApps().length) {
      const privateKey = (process.env.GOOGLE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n');
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'sistem-giat';

      if (privateKey && clientEmail && projectId) {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        initializeApp();
      }
    }
    return getFirestore();
  } catch (err: any) {
    console.warn('Firebase Admin init warning in kegiatan API:', err?.message || err);
    return null;
  }
}

export async function GET() {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ success: false, items: [], message: 'Admin DB not initialized' });
    }

    const snapshot = await db.collection('kegiatans').get();
    const items: any[] = [];

    snapshot.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Urutkan berdasarkan tanggal terbaru
    items.sort((a, b) => new Date(b.uploadDate || b.date || 0).getTime() - new Date(a.uploadDate || a.date || 0).getTime());

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error('Error fetching kegiatan via Admin SDK:', error);
    return NextResponse.json({ success: false, error: error.message, items: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Admin DB not initialized' }, { status: 500 });
    }

    const body = await req.json();
    if (!body || !body.title) {
      return NextResponse.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
    }

    const docData = {
      ...body,
      uploadDate: body.uploadDate || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      updatedBy: body.updatedBy || 'publik',
    };

    const docRef = await db.collection('kegiatans').add(docData);
    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error: any) {
    console.error('Error saving kegiatan via Admin SDK:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
