import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GOOGLE_CONFIG } from '@/lib/google-config';

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
    console.warn('Firebase Admin init warning in submissions API:', err?.message || err);
    return null;
  }
}

// POST: Pengajuan Surat Baru oleh Warga (Bypass client-side security rules)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nama, nik, alamat, maksudTujuan, files } = body;

    if (!nama || !nik || !alamat || !maksudTujuan) {
      return NextResponse.json(
        { success: false, error: 'Data isian belum lengkap (Nama, NIK, Alamat, Maksud/Tujuan wajib diisi)' },
        { status: 400 }
      );
    }

    const cleanNik = String(nik).trim();
    const cleanNama = String(nama).trim();
    const cleanAlamat = String(alamat).trim();
    const cleanMaksud = String(maksudTujuan).trim();

    if (!/^\d{16}$/.test(cleanNik)) {
      return NextResponse.json(
        { success: false, error: 'NIK harus terdiri dari 16 digit angka' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Koneksi database server gagal diinisialisasi' },
        { status: 500 }
      );
    }

    // 1. Dapatkan Target Folder ID Google Drive dari settings/village jika ada
    let targetFolderId = GOOGLE_CONFIG.parentFolderId;
    try {
      const villageSnap = await db.collection('settings').doc('village').get();
      if (villageSnap.exists) {
        const vData = villageSnap.data();
        if (vData?.agendaFolderId && vData.agendaFolderId.trim() !== '') {
          targetFolderId = vData.agendaFolderId.trim();
        } else if (vData?.kegiatanFolderId && vData.kegiatanFolderId.trim() !== '') {
          targetFolderId = vData.kegiatanFolderId.trim();
        }
      }
    } catch (e) {
      console.warn('Gagal membaca settings/village folder id:', e);
    }

    // 2. Unggah Berkas Persyaratan ke Google Drive
    const driveResults: Array<{ fieldName: string; fileName: string; fileUrl: string; fileId?: string }> = [];

    if (Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        if (!f.base64Data) continue;

        const cleanFileName = f.targetFileName
          ? `${f.targetFileName}.pdf`
          : `LAMPIRAN_${(f.fieldName || 'BERKAS').toUpperCase().replace(/\s+/g, '_')}_${cleanNik}_${Date.now()}`;

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 20000);

          const resp = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'uploadArchiveFile',
              folderId: targetFolderId,
              fileName: cleanFileName,
              fileData: {
                type: f.mimeType || 'application/pdf',
                base64: f.base64Data,
              },
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (resp.ok) {
            const uploadResult = await resp.json();
            if (uploadResult?.success) {
              driveResults.push({
                fieldName: f.fieldName || 'lampiran',
                fileName: cleanFileName,
                fileUrl: uploadResult.fileUrl || uploadResult.url || `https://drive.google.com/drive/folders/${targetFolderId}`,
                fileId: uploadResult.fileId || uploadResult.id,
              });
            } else {
              driveResults.push({
                fieldName: f.fieldName || 'lampiran',
                fileName: cleanFileName,
                fileUrl: `https://drive.google.com/drive/folders/${targetFolderId}`,
              });
            }
          } else {
            driveResults.push({
              fieldName: f.fieldName || 'lampiran',
              fileName: cleanFileName,
              fileUrl: `https://drive.google.com/drive/folders/${targetFolderId}`,
            });
          }
        } catch (uploadErr) {
          console.warn(`[submissions API] Gagal unggah ${cleanFileName} ke drive:`, uploadErr);
          driveResults.push({
            fieldName: f.fieldName || 'lampiran',
            fileName: cleanFileName,
            fileUrl: `https://drive.google.com/drive/folders/${targetFolderId}`,
          });
        }
      }
    }

    // 3. Terbitkan Nomor Tiket
    const year = new Date().getFullYear();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TKT-${year}-${randomCode}`;

    // 4. Simpan ke Firestore via Firebase Admin SDK
    const submissionData = {
      ticketNumber,
      letterType: 'Pengajuan Penggantian KK',
      requesterName: cleanNama,
      nik: cleanNik,
      alamat: cleanAlamat,
      maksudTujuan: cleanMaksud,
      documentNumber: 'Belum Ada',
      status: 'PENDING',
      source: 'online_warga',
      formData: {
        nama: cleanNama,
        name: cleanNama,
        nik: cleanNik,
        alamat: cleanAlamat,
        address: cleanAlamat,
        maksudTujuan: cleanMaksud,
        purpose: cleanMaksud,
      },
      driveFiles: driveResults,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('submissions').add(submissionData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      ticketNumber,
      driveFiles: driveResults,
    });
  } catch (err: any) {
    console.error('[submissions API POST error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Terjadi kesalahan pada server saat memproses pengajuan.' },
      { status: 500 }
    );
  }
}

// GET: Pencarian Permohonan Surat atau Lookup NIK Warga
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const query = searchParams.get('q') || searchParams.get('query');
    const nikParam = searchParams.get('nik');

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ success: false, data: [] }, { status: 500 });
    }

    // A. Lookup Resident by NIK
    if (action === 'lookup_resident' && nikParam) {
      const cleanNik = nikParam.trim();
      const docSnap = await db.collection('residents').doc(cleanNik).get();
      if (docSnap.exists) {
        return NextResponse.json({ success: true, resident: { id: docSnap.id, ...docSnap.data() } });
      }
      return NextResponse.json({ success: false, resident: null });
    }

    // B. Search Submissions by Ticket or NIK
    if (query) {
      const cleanQuery = query.trim().toLowerCase();
      const snapshot = await db.collection('submissions').orderBy('createdAt', 'desc').limit(50).get();
      const results: any[] = [];

      snapshot.forEach((doc) => {
        const d = doc.data();
        const matchTicket = (d.ticketNumber || '').toLowerCase() === cleanQuery;
        const matchNik = (d.nik || '') === cleanQuery || (d.formData?.nik || '') === cleanQuery;

        if (matchTicket || matchNik) {
          results.push({
            id: doc.id,
            ...d,
            createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
            updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt,
          });
        }
      });

      return NextResponse.json({ success: true, data: results });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (err: any) {
    console.error('[submissions API GET error]:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
