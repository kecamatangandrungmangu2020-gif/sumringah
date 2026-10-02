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
    console.warn('Firebase Admin initialization warning in antrian manage:', err?.message || err);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Database admin tidak dapat diakses.' }, { status: 500 });
    }
    const snap = await db.collection('settings').get();
    const settings: Record<string, string> = {};
    snap.forEach(doc => {
      const val = doc.data()?.value;
      if (val !== undefined && val !== null) {
        settings[doc.id] = String(val);
      }
    });
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Gagal memuat pengaturan.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Database admin tidak dapat diakses.' }, { status: 500 });
    }

    const body = await req.json();
    const { action, collection: colName, id, data } = body;

    if (!action) {
      return NextResponse.json({ success: false, message: 'Parameter action diperlukan.' }, { status: 400 });
    }

    // 1. Operator Actions
    if (action === 'save_operator') {
      const { nama, username, password } = data || {};
      if (!nama || !username || !password) {
        return NextResponse.json({ success: false, message: 'Nama, username, dan password wajib diisi.' }, { status: 400 });
      }

      if (id) {
        await db.collection('operators').doc(id).set({
          nama,
          username,
          password
        }, { merge: true });
        return NextResponse.json({ success: true, message: 'Operator berhasil diperbarui.' });
      } else {
        const docRef = await db.collection('operators').add({
          nama,
          username,
          password
        });
        return NextResponse.json({ success: true, id: docRef.id, message: 'Operator berhasil ditambahkan.' });
      }
    }

    if (action === 'delete_operator') {
      if (!id) {
        return NextResponse.json({ success: false, message: 'ID operator diperlukan.' }, { status: 400 });
      }
      await db.collection('operators').doc(id).delete();
      return NextResponse.json({ success: true, message: 'Operator berhasil dihapus.' });
    }

    // 2. Loket Actions
    if (action === 'save_loket') {
      const { nama } = data || {};
      if (!nama) {
        return NextResponse.json({ success: false, message: 'Nama loket wajib diisi.' }, { status: 400 });
      }
      if (id) {
        await db.collection('loket').doc(id).set({ nama }, { merge: true });
        return NextResponse.json({ success: true, message: 'Loket berhasil diperbarui.' });
      } else {
        const docRef = await db.collection('loket').add({ nama });
        return NextResponse.json({ success: true, id: docRef.id, message: 'Loket berhasil ditambahkan.' });
      }
    }

    if (action === 'delete_loket') {
      if (!id) {
        return NextResponse.json({ success: false, message: 'ID loket diperlukan.' }, { status: 400 });
      }
      await db.collection('loket').doc(id).delete();
      return NextResponse.json({ success: true, message: 'Loket berhasil dihapus.' });
    }

    // 3. Pelayanan Actions
    if (action === 'save_layanan') {
      const { kode, nama, estimasi_waktu, loket_id, loket_nama } = data || {};
      if (!kode || !nama) {
        return NextResponse.json({ success: false, message: 'Kode dan nama layanan wajib diisi.' }, { status: 400 });
      }
      const targetDocId = id || `pelayanan-${kode.toUpperCase()}`;
      await db.collection('pelayanan').doc(targetDocId).set({
        kode: kode.toUpperCase(),
        nama,
        estimasi_waktu: Number(estimasi_waktu) || 10,
        loket_id: loket_id || '',
        loket_nama: loket_nama || ''
      }, { merge: true });
      return NextResponse.json({ success: true, id: targetDocId, message: 'Layanan berhasil disimpan.' });
    }

    if (action === 'delete_layanan') {
      if (!id) {
        return NextResponse.json({ success: false, message: 'ID layanan diperlukan.' }, { status: 400 });
      }
      await db.collection('pelayanan').doc(id).delete();
      return NextResponse.json({ success: true, message: 'Layanan berhasil dihapus.' });
    }

    // 4. Settings Actions
    if (action === 'save_settings') {
      const settingsData = data || {};
      const batch = db.batch();
      for (const [key, val] of Object.entries(settingsData)) {
        const ref = db.collection('settings').doc(key);
        batch.set(ref, { value: String(val) }, { merge: true });
      }
      await batch.commit();
      return NextResponse.json({ success: true, message: 'Pengaturan umum berhasil disimpan.' });
    }

    // Generic fallback for any other Antrian collection
    if (action === 'generic_save' && colName) {
      if (id) {
        await db.collection(colName).doc(id).set(data || {}, { merge: true });
        return NextResponse.json({ success: true });
      } else {
        const ref = await db.collection(colName).add(data || {});
        return NextResponse.json({ success: true, id: ref.id });
      }
    }

    if (action === 'generic_delete' && colName && id) {
      await db.collection(colName).doc(id).delete();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Action tidak dikenali.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in antrian manage API:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Terjadi kesalahan internal server.' }, { status: 500 });
  }
}
