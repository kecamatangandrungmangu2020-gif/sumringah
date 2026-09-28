'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  ShieldCheck,
  MapPinned,
  Store,
  Baby,
  Skull,
  Heart,
  Home,
  Music,
  Users,
  Flower2,
  UserCheck,
  Activity,
  HandHelping,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SktmForm } from './forms/sktm-form';
import { SkckForm } from './forms/skck-form';
import { PindahForm } from './forms/pindah-form';
import { SkuForm } from './forms/sku-form';
import { KelahiranForm } from './forms/kelahiran-form';
import { KematianForm } from './forms/kematian-form';
import { BelumMenikahForm } from './forms/belum-menikah-form';
import { DomisiliForm } from './forms/domisili-form';
import { IjinKeramaianForm } from './forms/ijin-keramaian-form';
import { MoyangForm } from './forms/moyang-form';
import { PemakamanForm } from './forms/pemakaman-form';
import { WaliForm } from './forms/wali-form';
import { ReaktivasiBpjsForm } from './forms/reaktivasi-bpjs-form';
import { PengantarUmumForm } from './forms/pengantar-umum-form';
import { KeteranganUmumForm } from './forms/keterangan-umum-form';

interface LetterServiceProps {
  isAdmin?: boolean;
}

const letterOptions = [
  { type: 'Surat Keterangan Umum', icon: FileText, color: 'bg-slate-200 text-slate-800', description: 'Keperluan administratif Kecamatan secara umum.' },
  { type: 'Surat Keterangan Tidak Mampu', icon: HandHelping, color: 'bg-orange-100 text-orange-600', description: 'Untuk bantuan sosial & biaya sekolah.' },
  { type: 'Surat Pengantar SKCK', icon: ShieldCheck, color: 'bg-blue-100 text-blue-600', description: 'Persyaratan melamar pekerjaan / kepolisian.' },
  { type: 'Surat Pengantar Pindah', icon: MapPinned, color: 'bg-emerald-100 text-emerald-600', description: 'Keterangan pindah domisili antar wilayah.' },
  { type: 'Surat Keterangan Usaha', icon: Store, color: 'bg-purple-100 text-purple-600', description: 'Untuk pengajuan KUR / identitas UMKM.' },
  { type: 'Surat Keterangan Kelahiran', icon: Baby, color: 'bg-pink-100 text-pink-600', description: 'Data kelahiran baru bagi warga Kecamatan.' },
  { type: 'Surat Keterangan Kematian', icon: Skull, color: 'bg-slate-200 text-slate-700', description: 'Surat keterangan duka cita & lapor diri.' },
  { type: 'Surat Keterangan Belum Menikah', icon: Heart, color: 'bg-red-100 text-red-600', description: 'Syarat pernikahan atau status lajang.' },
  { type: 'Surat Keterangan Domisili', icon: Home, color: 'bg-amber-100 text-amber-700', description: 'Keterangan tempat tinggal sementara.' },
  { type: 'Surat Ijin Keramaian', icon: Music, color: 'bg-indigo-100 text-indigo-600', description: 'Syarat mengadakan acara / hajatan.' },
  { type: 'Surat Keterangan Moyang', icon: Users, color: 'bg-teal-100 text-teal-600', description: 'Keterangan silsilah keluarga / garis keturunan.' },
  { type: 'Surat Keterangan Pemakaman', icon: Flower2, color: 'bg-green-100 text-green-700', description: 'Ijin penguburan di makam umum Kecamatan.' },
  { type: 'Surat Keterangan Wali', icon: UserCheck, color: 'bg-sky-100 text-sky-600', description: 'Keterangan perwalian anak di bawah umur.' },
  { type: 'Surat Keterangan Reaktivasi BPJS Kesehatan', icon: Activity, color: 'bg-rose-100 text-rose-600', description: 'Pengurusan BPJS yang terblokir / nonaktif.' },
  { type: 'Surat Pengantar Umum', icon: FileText, color: 'bg-slate-200 text-slate-800', description: 'Keperluan pengantar administrasi umum lainnya.' },
];

export function LetterService({ isAdmin = false }: LetterServiceProps) {
  const [selectedLetter, setSelectedLetter] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const renderForm = () => {
    const props = { isAdmin };
    switch (selectedLetter) {
      case 'Surat Keterangan Umum': return <KeteranganUmumForm {...props} />;
      case 'Surat Keterangan Tidak Mampu': return <SktmForm {...props} />;
      case 'Surat Pengantar SKCK': return <SkckForm {...props} />;
      case 'Surat Pengantar Pindah': return <PindahForm {...props} />;
      case 'Surat Keterangan Usaha': return <SkuForm {...props} />;
      case 'Surat Keterangan Kelahiran': return <KelahiranForm {...props} />;
      case 'Surat Keterangan Kematian': return <KematianForm {...props} />;
      case 'Surat Keterangan Belum Menikah': return <BelumMenikahForm {...props} />;
      case 'Surat Keterangan Domisili': return <DomisiliForm {...props} />;
      case 'Surat Ijin Keramaian': return <IjinKeramaianForm {...props} />;
      case 'Surat Keterangan Moyang': return <MoyangForm {...props} />;
      case 'Surat Keterangan Pemakaman': return <PemakamanForm {...props} />;
      case 'Surat Keterangan Wali': return <WaliForm {...props} />;
      case 'Surat Keterangan Reaktivasi BPJS Kesehatan': return <ReaktivasiBpjsForm {...props} />;
      case 'Surat Pengantar Umum': return <PengantarUmumForm {...props} />;
      default: return null;
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-10">
      {!selectedLetter ? (
        <div className="space-y-6">
          <div className="text-center space-y-1.5 my-4">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight italic font-serif">
              Pilih <span className="text-primary not-italic">Layanan Surat</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
              Silakan pilih salah satu kartu di bawah ini untuk mulai pengisian formulir pengajuan surat resmi Anda.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {letterOptions.map((opt) => (
              <Card
                key={opt.type}
                className="cursor-pointer group relative hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-slate-200/80 bg-white overflow-hidden rounded-xl md:rounded-2xl flex flex-col hover:border-primary/30 shadow-xs"
                onClick={() => {
                  setSelectedLetter(opt.type);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <CardContent className="p-3.5 md:p-6 flex flex-col h-full items-center text-center">
                  <div className={cn("w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl mb-2.5 md:mb-4 flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-xs shrink-0", opt.color)}>
                    <opt.icon className="h-5 w-5 md:h-7 md:w-7" />
                  </div>
                  <div className="space-y-1 md:space-y-2 flex-1">
                    <h3 className="text-xs md:text-sm font-extrabold text-slate-900 uppercase tracking-tight leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {opt.type}
                    </h3>
                    <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed line-clamp-2 hidden sm:block">
                      {opt.description}
                    </p>
                  </div>
                  <div className="mt-3 md:mt-5 pt-2.5 md:pt-4 border-t border-slate-100 w-full flex items-center justify-center gap-1.5">
                    <span className="text-[8px] md:text-[9px] font-black text-primary uppercase tracking-wider">BUKA FORMULIR</span>
                    <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <ArrowLeft className="h-3 w-3 md:h-3.5 md:w-3.5 rotate-180" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      ) : (
        <Card className="rounded-2xl border border-slate-200/90 shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <CardHeader className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <FileText className="w-32 h-32" />
            </div>
            <div className="space-y-4 relative z-10">
              <Button
                variant="ghost"
                onClick={() => setSelectedLetter('')}
                className="text-white hover:bg-white/10 -ml-3 font-black uppercase text-[10px] tracking-widest h-8"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> KEMBALI KE DAFTAR
              </Button>
              <div className="space-y-1">
                <CardTitle className="text-2xl md:text-3xl font-black uppercase italic tracking-tight">
                  {selectedLetter}
                </CardTitle>
                <CardDescription className="text-white/70 font-medium text-xs italic">
                  Lengkapi data formulir pengajuan {isAdmin ? 'oleh Admin' : ''} secara akurat.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-10 bg-white">
            {renderForm()}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
