
'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Ticket, FilePlus2, Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

interface SubmissionSuccessProps {
  ticketNumber: string;
  onReset: () => void;
}

export function SubmissionSuccess({ ticketNumber, onReset }: SubmissionSuccessProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadImage = async () => {
    if (cardRef.current === null) return;

    setIsDownloading(true);
    try {
      // Tunggu sebentar agar render UI stabil
      await new Promise(resolve => setTimeout(resolve, 300));

      const options = {
        backgroundColor: '#ffffff',
        cacheBust: true,
        pixelRatio: 2, // Kualitas lebih tajam
        style: {
          margin: '0',
          padding: '20px',
        }
      };

      let dataUrl;
      try {
        // Percobaan pertama: Normal
        dataUrl = await toPng(cardRef.current, options);
      } catch (innerError) {
        // Percobaan kedua: Tanpa font embedding jika terjadi SecurityError
        console.warn("Mencoba mengunduh tanpa font embedding karena pembatasan keamanan CSS.");
        dataUrl = await toPng(cardRef.current, { ...options, fontEmbedCSS: '' });
      }

      const link = document.createElement('a');
      link.download = `tiket-Kecamatan-${ticketNumber}.png`;
      link.href = dataUrl;
      link.click();

      toast({
        title: "Berhasil",
        description: "Tiket telah disimpan ke Karyawan Anda.",
      });
    } catch (err) {
      console.error('Gagal mengunduh gambar:', err);
      toast({
        title: "Gagal Mengunduh",
        description: "Maaf, terjadi kesalahan saat memproses gambar. Silakan screenshot layar Anda sebagai alternatif.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center py-8 space-y-6">
      <div ref={cardRef} className="w-full max-w-lg bg-white rounded-xl">
        <Card className="w-full shadow-none border-0 sm:border">
          <CardHeader className="items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2 shadow-inner">
              <CheckCircle className="w-10 h-10" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Pengajuan Surat Berhasil Terkirim!</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Permohonan Anda otomatis masuk ke sistem antrean verifikasi Admin Kecamatan Gandrungmangu.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl p-6 border-2 border-primary/20 shadow-xs">
              <p className="text-xs text-primary font-black uppercase tracking-widest mb-1.5">KODE TIKET PELACAKAN ANDA</p>
              <div className="flex items-center justify-center gap-3">
                <Ticket className="w-7 h-7 text-primary" />
                <p className="text-3xl sm:text-4xl font-black tracking-widest text-slate-900 font-mono">{ticketNumber}</p>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-2">
                Catat atau simpan kode tiket ini untuk memantau status persetujuan surat Anda.
              </p>
            </div>

            <div className="text-xs text-slate-600 text-left p-4 border border-slate-200/80 rounded-xl bg-slate-50/70 space-y-2">
              <p className="font-bold text-slate-900">Ketentuan & Prosedur Pengambilan:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Admin Kecamatan akan memverifikasi kelengkapan data & berkas persyaratan Anda.</li>
                <li>Ketika status berubah menjadi <strong>"Disetujui Admin"</strong>, dokumen resmi siap diambil.</li>
                <li>Pengambilan di <strong>Balai Kecamatan Gandrungmangu</strong> pada hari kerja (Senin - Jumat, 07:00 - 16:00 WIB) dengan membawa <strong>KTP Asli</strong>.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg px-4">
        <Button
          onClick={handleDownloadImage}
          variant="outline"
          className="flex-1 h-12 border-primary/30 text-primary font-bold hover:bg-primary/5 rounded-xl"
          disabled={isDownloading}
        >
          {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Simpan Tiket (Gambar)
        </Button>
        <Button
          onClick={onReset}
          className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md shadow-primary/20"
        >
          <FilePlus2 className="mr-2 h-4 w-4" />
          Ajukan Surat Lain
        </Button>
      </div>
    </div>
  );
}
