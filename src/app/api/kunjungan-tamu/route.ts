import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  CATEGORY_META,
  KunjunganCategory,
  KunjunganStatus,
  KunjunganTamuRecord,
} from '@/types/kunjungan-tamu';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getAdminDb() {
  if (getApps().length === 0) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId =
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

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

function getTodayDateString(): string {
  const now = new Date();
  // WIB (UTC+7)
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wib.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function buildSummary(category: KunjunganCategory, details: Record<string, any>): string {
  switch (category) {
    case 'KUNJUNGAN_TAMU':
      return `${details.jenis_pertemuan || 'Kunjungan'} — ${details.topik || 'Koordinasi'}`;
    case 'PENGAJUAN_PROPOSAL':
      return `${details.judul_proposal || 'Proposal'} (${details.nomor_proposal || '-'})`;
    case 'PENYERAHAN_SPJ_BERKAS':
      return `${details.jenis_berkas || 'SPJ'} ${details.periode || ''} (${details.nomor_pengantar || '-'})`.trim();
    case 'SURAT_KETERANGAN_NON_PATEN':
      return `${details.jenis_dokumen || 'Surat'} — ${details.perihal_surat || '-'}`;
    case 'PENGIRIMAN_BARANG':
      return `${details.jenis_barang || 'Paket'} (${details.jumlah_koli || 1} koli)${details.nama_ekspedisi ? ` via ${details.nama_ekspedisi}` : ''}`;
    case 'PENGADUAN':
      return `${details.kategori_aduan || 'Pengaduan'} di ${details.lokasi_kejadian || '-'}`;
    default:
      return 'Kunjungan Front Office';
  }
}

// GET: Ambil daftar rekap atau lacak tiket berdasarkan ticket_id / whatsapp
export async function GET(req: Request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ success: false, data: [], message: 'Database tidak tersedia' }, { status: 500 });
    }

    const url = new URL(req.url);
    const ticket = url.searchParams.get('ticket')?.trim().toUpperCase();
    const whatsapp = url.searchParams.get('whatsapp')?.replace(/[^0-9]/g, '');
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');
    const dateFilter = url.searchParams.get('date'); // 'today' | 'YYYY-MM-DD' | 'all'
    const limitParam = Math.min(parseInt(url.searchParams.get('limit') || '150', 10), 300);

    const snapshot = await db
      .collection('kunjungan_tamu')
      .orderBy('created_at', 'desc')
      .limit(limitParam)
      .get();

    let data: KunjunganTamuRecord[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<KunjunganTamuRecord, 'id'>),
    }));

    if (ticket) {
      data = data.filter((item) => (item.ticket_id || '').toUpperCase() === ticket);
    }

    if (whatsapp) {
      data = data.filter((item) => {
        const cleanWa = (item.visitor?.whatsapp || '').replace(/[^0-9]/g, '');
        return cleanWa.endsWith(whatsapp) || cleanWa === whatsapp;
      });
    }

    if (category && category !== 'ALL') {
      data = data.filter((item) => item.category === category);
    }

    if (status && status !== 'ALL') {
      data = data.filter((item) => item.status === status);
    }

    if (dateFilter && dateFilter !== 'all') {
      const targetYmd =
        dateFilter === 'today' ? getTodayDateString() : dateFilter.replace(/-/g, '');
      data = data.filter((item) => {
        const tid = item.ticket_id || '';
        return tid.includes(`-${targetYmd}-`);
      });
    }

    return NextResponse.json({ success: true, data, total: data.length });
  } catch (error: any) {
    console.error('Error GET kunjungan_tamu:', error);
    return NextResponse.json(
      { success: false, data: [], message: error?.message || 'Gagal memuat data' },
      { status: 500 }
    );
  }
}

// POST: Buat tiket Kunjungan Tamu baru
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getAdminDb();

    if (!db) {
      return NextResponse.json({ success: false, message: 'Database tidak tersedia' }, { status: 500 });
    }

    const visitor = body.visitor || {};
    const category = body.category as KunjunganCategory;
    const details = body.details || {};

    if (!visitor.nama?.trim() || !visitor.whatsapp?.trim() || !category || !CATEGORY_META[category]) {
      return NextResponse.json(
        { success: false, message: 'Nama lengkap, nomor WhatsApp, dan kategori keperluan wajib diisi.' },
        { status: 400 }
      );
    }

    const meta = CATEGORY_META[category];

    const ymd = getTodayDateString();
    const prefix = `TMI-${ymd}-`;

    // Hitung nomor urut hari ini secara aman
    const existingSnap = await db
      .collection('kunjungan_tamu')
      .where('ticket_id', '>=', prefix)
      .where('ticket_id', '<=', `${prefix}\uf8ff`)
      .get();

    let maxSeq = 0;
    existingSnap.forEach((docSnap) => {
      const tid = String(docSnap.data()?.ticket_id || '');
      const seqStr = tid.split('-')[2];
      const seqNum = parseInt(seqStr || '0', 10);
      if (!Number.isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;
    });

    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    const ticketId = `${prefix}${nextSeq}`;
    const nowIso = new Date().toISOString();

    const targetSection =
      body.target_section?.trim() || details.tujuan_pejabat || meta.defaultSection;

    const inputChannel =
      body.input_channel === 'front_office' || body.input_channel === 'kiosk'
        ? body.input_channel
        : 'mandiri_hp';

    const record: Omit<KunjunganTamuRecord, 'id'> = {
      ticket_id: ticketId,
      created_at: nowIso,
      updated_at: nowIso,
      input_channel: inputChannel,
      visitor: {
        status: visitor.status || 'warga_umum',
        nama: String(visitor.nama).trim(),
        whatsapp: String(visitor.whatsapp).trim(),
        asal_desa_instansi: String(visitor.asal_desa_instansi || '').trim() || 'Lainnya',
        asal_manual: visitor.asal_manual ? String(visitor.asal_manual).trim() : '',
        nik: visitor.nik ? String(visitor.nik).trim() : '',
      },
      category,
      target_section: targetSection,
      summary: buildSummary(category, details),
      details,
      attachment: body.attachment || null,
      status: 'MENUNGGU',
      tracking_logs: [
        {
          timestamp: nowIso,
          status: 'MENUNGGU',
          actor: inputChannel === 'front_office' ? 'Petugas Front Office' : 'Portal Mandiri Tamu',
          note: `Tiket ${ticketId} berhasil dicatat dan diarahkan ke ${targetSection}.`,
        },
      ],
      skm_rating: null,
      skm_feedback: '',
    };

    const docRef = await db.collection('kunjungan_tamu').add(record);

    return NextResponse.json({
      success: true,
      message: 'Data kunjungan tamu berhasil dicatat.',
      data: { id: docRef.id, ...record },
    });
  } catch (error: any) {
    console.error('Error POST kunjungan_tamu:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menyimpan kunjungan tamu' },
      { status: 500 }
    );
  }
}

// PATCH: Update status / disposisi / tambah tracking_logs / rating SKM
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const db = getAdminDb();

    if (!db) {
      return NextResponse.json({ success: false, message: 'Database tidak tersedia' }, { status: 500 });
    }

    if (!body.id) {
      return NextResponse.json({ success: false, message: 'ID dokumen wajib disertakan.' }, { status: 400 });
    }

    const docRef = db.collection('kunjungan_tamu').doc(body.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ success: false, message: 'Data kunjungan tidak ditemukan.' }, { status: 404 });
    }

    const current = snap.data() as KunjunganTamuRecord;
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      updated_at: nowIso,
    };

    const logs = Array.isArray(current.tracking_logs) ? [...current.tracking_logs] : [];

    if (body.status || body.note || body.target_section) {
      const nextStatus: KunjunganStatus = body.status || current.status;
      updatePayload.status = nextStatus;
      if (body.target_section) {
        updatePayload.target_section = body.target_section;
      }
      logs.push({
        timestamp: nowIso,
        status: nextStatus,
        actor: body.actor?.trim() || 'Petugas Front Office',
        note:
          body.note?.trim() ||
          `Status diperbarui menjadi ${nextStatus}${body.target_section ? ` — Disposisi ke ${body.target_section}` : ''}.`,
      });
      updatePayload.tracking_logs = logs;
    }

    if (typeof body.skm_rating === 'number') {
      updatePayload.skm_rating = Math.min(5, Math.max(1, body.skm_rating));
      if (body.skm_feedback !== undefined) {
        updatePayload.skm_feedback = String(body.skm_feedback).trim();
      }
    }

    await docRef.update(updatePayload);

    return NextResponse.json({
      success: true,
      message: 'Data kunjungan berhasil diperbarui.',
      data: { id: body.id, ...current, ...updatePayload },
    });
  } catch (error: any) {
    console.error('Error PATCH kunjungan_tamu:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memperbarui data' },
      { status: 500 }
    );
  }
}
