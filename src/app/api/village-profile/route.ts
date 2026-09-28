import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

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
    console.warn('Firebase Admin initialization warning:', err?.message || err);
    return null;
  }
}

export async function GET() {
  let logoBase64 = null;
  let logoUrl = null;
  let logoKecamatanUrl = null;
  let logoTambahanUrl = null;
  let logoTambahanBase64 = null;
  let heroPhotoBase64 = null;
  let heroPhotoUrl = null;
  let headline = null;
  let subheadline = null;

  try {
    const db = getAdminDb();
    if (db) {
      try {
        const snap = await db.doc('settings/village').get();
        if (snap.exists) {
          const data = snap.data();
          logoBase64 = data?.logoBase64 || null;
          logoUrl = data?.logoUrl || data?.logoKecamatanUrl || null;
          logoKecamatanUrl = data?.logoKecamatanUrl || data?.logoUrl || null;
          logoTambahanUrl = data?.logoTambahanUrl || null;
          logoTambahanBase64 = data?.logoTambahanBase64 || null;
          heroPhotoBase64 = data?.heroPhotoBase64 || null;
          heroPhotoUrl = data?.heroPhotoUrl || null;
          headline = data?.headline || null;
          subheadline = data?.subheadline || null;
        }
      } catch {
        // Fallback anggun jika Cloud Firestore Admin API belum aktif di GCP atau belum terpropagasi
      }
    }

    // Default fallback jika foto utama belum ada di firestore
    if (!heroPhotoBase64 && !heroPhotoUrl) {
      heroPhotoUrl = '/hero-Kecamatan.jpg';
    }

    return NextResponse.json({
      logoBase64,
      logoUrl,
      logoKecamatanUrl,
      logoTambahanUrl,
      logoTambahanBase64,
      heroPhotoBase64,
      heroPhotoUrl,
      headline,
      subheadline,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      heroPhotoUrl: '/hero-Kecamatan.jpg',
      error: error.message
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.heroPhotoBase64 && typeof body.heroPhotoBase64 === 'string') {
      try {
        const rawBase64 = body.heroPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(rawBase64, 'base64');
        const filePath = path.join(process.cwd(), 'public', 'hero-Kecamatan.jpg');
        fs.writeFileSync(filePath, buffer);
      } catch (fileErr) {
        console.warn('Gagal menulis foto ke public/hero-Kecamatan.jpg:', fileErr);
      }
    }
    if (body.logoTambahanBase64 && typeof body.logoTambahanBase64 === 'string') {
      try {
        const rawBase64 = body.logoTambahanBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(rawBase64, 'base64');
        const filePath = path.join(process.cwd(), 'public', 'img', 'logo-tambahan.png');
        fs.writeFileSync(filePath, buffer);
      } catch (fileErr) {
        console.warn('Gagal menulis logo-tambahan ke file:', fileErr);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
