import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    console.warn('Firebase Admin initialization warning in informasi API:', err?.message || err);
    return null;
  }
}

export async function GET() {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ success: false, items: [], message: 'Admin DB not initialized' });
    }

    const snapshot = await db.collection('informasi').get();
    const items: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      // Hanya ambil yang berstatus published
      if (data.status === 'published' || !data.status) {
        items.push({
          id: doc.id,
          ...data,
        });
      }
    });

    // Urutkan berdasarkan tanggal terbaru
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error('Error fetching informasi via Admin SDK:', error);
    return NextResponse.json({ success: false, items: [], error: error?.message || 'Internal error' });
  }
}
