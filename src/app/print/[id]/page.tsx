'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSubmissionById } from '@/lib/submissions';
import { LetterSubmission } from '@/lib/types';
import { SkuPrintTemplate } from '../_components/sku-print-template';
import { Loader2, AlertCircle, FileSearch, ShieldAlert } from 'lucide-react';
import { SktmPrintTemplate } from '../_components/sktm-print-template';
import { SkckPrintTemplate } from '../_components/skck-print-template';
import { PindahPrintTemplate } from '../_components/pindah-print-template';
import { KelahiranPrintTemplate } from '../_components/kelahiran-print-template';
import { KematianPrintTemplate } from '../_components/kematian-print-template';
import { BelumMenikahPrintTemplate } from '../_components/belum-menikah-print-template';
import { DomisiliPrintTemplate } from '../_components/domisili-print-template';
import { IjinKeramaianPrintTemplate } from '../_components/ijin-keramaian-print-template';
import { MoyangPrintTemplate } from '../_components/moyang-print-template';
import { PemakamanPrintTemplate } from '../_components/pemakaman-print-template';
import { WaliPrintTemplate } from '../_components/wali-print-template';
import { ReaktivasiBpjsPrintTemplate } from '../_components/reaktivasi-bpjs-print-template';
import { PengantarUmumPrintTemplate } from '../_components/pengantar-umum-print-template';
import { KeteranganUmumPrintTemplate } from '../_components/keterangan-umum-print-template';
import { useFirebase } from '@/firebase';

export default function PrintPage() {
  const params = useParams();
  const rawId = params?.id as string;
  const id = rawId ? decodeURIComponent(rawId).trim() : '';

  const [submission, setSubmission] = useState<LetterSubmission | 'not_found' | 'error' | 'verifying' | null>(null);
  const { firestore, isUserLoading, user } = useFirebase();

  useEffect(() => {
    // Tunggu hingga Firebase siap
    if (!id || !firestore || isUserLoading) return;

    // Jika belum ada user, kita periksa apakah kita harus menunggu Admin
    if (!user) {
      const isAdminHint = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';
      if (isAdminHint) {
        // Jika ada jejak login admin, tunggu sesi di-restore otomatis oleh SDK
        return;
      }
      // Jika memang tidak ada user dan bukan admin, biarkan getDoc mencoba (mungkin gagal)
    }

    const fetchSubmission = async () => {
      try {
        const foundSubmission = await getSubmissionById(firestore, id);
        if (foundSubmission) {
          setSubmission(foundSubmission);
        } else {
          setSubmission('not_found');
        }
      } catch (error: any) {
        console.error("Error fetching submission for print:", error);
        // Jika error "Permission Denied"
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
          setSubmission('error');
        } else {
          setSubmission('error');
        }
      }
    }

    fetchSubmission();
  }, [id, firestore, isUserLoading, user]);

  // Loading state yang lebih sabar
  if (isUserLoading || (id && !submission)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <div className="text-center space-y-2">
          <p className="text-sm font-black uppercase tracking-widest text-slate-900">
            Memverifikasi Otoritas Admin
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
            Mohon tunggu sejenak, sedang memulihkan sesi Anda...
          </p>
        </div>
      </div>
    );
  }

  if (submission === 'error') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md w-full p-10 bg-white rounded-[3rem] shadow-2xl border border-red-100 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Akses Dibatasi</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Sistem tidak dapat memverifikasi izin Admin Anda. Hal ini biasanya terjadi jika sesi login kadaluwarsa atau tab baru gagal mendeteksi identitas Anda.
            </p>
          </div>
          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-primary/20"
            >
              MUAT ULANG HALAMAN
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              LOGIN ULANG ADMIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submission === 'not_found') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md w-full p-8 bg-white rounded-[2rem] shadow-xl border border-amber-100 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center">
            <FileSearch className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase">Data Tidak Ditemukan</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Maaf, data pengajuan dengan ID tersebut tidak tersedia di database.
          </p>
        </div>
      </div>
    );
  }

  // Wajib persetujuan admin terlebih dahulu sebelum cetak
  if (
    submission &&
    typeof submission !== 'string' &&
    submission.status !== 'APPROVED' &&
    submission.status !== 'COMPLETED' &&
    submission.status !== 'disetujui'
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md w-full p-8 bg-white rounded-[2rem] shadow-xl border border-amber-200 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase">Dokumen Belum Disetujui</h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            Pengajuan surat ini masih berstatus <strong className="text-amber-700 uppercase">"{submission.status || 'MENUNGGU'}"</strong>.
            <br />
            Admin Kecamatan <strong>wajib menyetujui</strong> permohonan surat terlebih dahulu di menu <strong>Pelayanan Surat</strong> sebelum dokumen resmi dapat dicetak.
          </p>
          <div className="pt-2">
            <button
              onClick={() => window.location.href = '/pelayanan'}
              className="w-full py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              Kembali ke Menu Pelayanan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submission && typeof submission !== 'string' && (!submission.documentNumber || submission.documentNumber === 'Belum Ada')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md w-full p-8 bg-white rounded-[2rem] shadow-xl border border-amber-100 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase">Nomor Surat Belum Ada</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Dokumen tidak dapat dicetak karena belum memiliki nomor surat resmi. <br />
            Silakan kembali ke dasbor admin dan klik tombol <strong>"Tarik Surat"</strong> terlebih dahulu.
          </p>
        </div>
      </div>
    );
  }

  const renderTemplate = () => {
    if (!submission || typeof submission === 'string') return null;

    switch (submission.letterType) {
      case 'Surat Keterangan Umum':
        return <KeteranganUmumPrintTemplate submission={submission} />;
      case 'Surat Keterangan Usaha':
        return <SkuPrintTemplate submission={submission} />;
      case 'Surat Keterangan Tidak Mampu':
        return <SktmPrintTemplate submission={submission} />;
      case 'Surat Pengantar SKCK':
        return <SkckPrintTemplate submission={submission} />;
      case 'Surat Pengantar Pindah':
        return <PindahPrintTemplate submission={submission} />;
      case 'Surat Keterangan Kelahiran':
        return <KelahiranPrintTemplate submission={submission} />;
      case 'Surat Keterangan Kematian':
        return <KematianPrintTemplate submission={submission} />;
      case 'Surat Keterangan Belum Menikah':
        return <BelumMenikahPrintTemplate submission={submission} />;
      case 'Surat Keterangan Domisili':
        return <DomisiliPrintTemplate submission={submission} />;
      case 'Surat Ijin Keramaian':
        return <IjinKeramaianPrintTemplate submission={submission} />;
      case 'Surat Keterangan Moyang':
        return <MoyangPrintTemplate submission={submission} />;
      case 'Surat Keterangan Pemakaman':
        return <PemakamanPrintTemplate submission={submission} />;
      case 'Surat Keterangan Wali':
        return <WaliPrintTemplate submission={submission} />;
      case 'Surat Keterangan Reaktivasi BPJS Kesehatan':
        return <ReaktivasiBpjsPrintTemplate submission={submission} />;
      case 'Surat Pengantar Umum':
        return <PengantarUmumPrintTemplate submission={submission} />;
      default:
        return (
          <div className="flex h-screen w-full items-center justify-center bg-gray-100">
            <p className="p-8 bg-white rounded-lg shadow-md">
              Template cetak untuk jenis surat <span className="font-semibold">"{submission.letterType}"</span> belum tersedia.
            </p>
          </div>
        );
    }
  };

  return <>{renderTemplate()}</>;
}
