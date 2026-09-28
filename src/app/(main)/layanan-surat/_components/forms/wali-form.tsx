'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ShieldCheck, User, Baby, UploadCloud, FileCheck, Paperclip } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmissionSuccess } from '../submission-success';
import { addSubmission } from '@/lib/submissions';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { getResidentByNik } from '@/lib/residents';
import { cn, formatDbDateToForm } from '@/lib/utils';

// --- Helper Functions ---
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

interface GoogleFileUploaderProps {
  label: string;
  onFileSelect: (file: File, fieldName: string) => void;
  fieldName: string;
  isRequired?: boolean;
  disabled?: boolean;
}

function GoogleFileUploader({ label, onFileSelect, fieldName, isRequired, disabled }: GoogleFileUploaderProps) {
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelect(file, fieldName);
    }
  };

  return (
    <FormItem className="flex flex-col">
      <FormLabel className={cn("text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2", isRequired && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
        {label}
      </FormLabel>
      <FormControl>
        <div className={cn(
          "relative group border-2 border-dashed rounded-2xl p-4 transition-all hover:border-primary/50 bg-slate-50/50",
          fileName && "border-emerald-200 bg-emerald-50/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={disabled || !!fileName}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            accept="image/jpeg,image/png,application/pdf"
          />
          <div className="flex flex-col items-center justify-center text-center gap-2 py-2">
            {fileName ? (
              <>
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <FileCheck className="h-6 w-6 text-emerald-600 animate-in zoom-in" />
                </div>
                <p className="text-[10px] font-black text-emerald-700 line-clamp-1 uppercase px-2 tracking-tight">{fileName}</p>
              </>
            ) : (
              <>
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <UploadCloud className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-slate-600 transition-colors">
                  Pilih Berkas
                </p>
              </>
            )}
          </div>
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
  <div className="space-y-6 rounded-[2rem] border p-6 md:p-10 bg-white shadow-sm">
    <div className="flex items-center gap-3 border-b pb-4">
      <Icon className="h-5 w-5 text-primary" />
      <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">{title}</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
  </div>
);

const personSchema = z.object({
  nik: z.string().length(16, 'NIK harus 16 digit.'),
  name: z.string().min(1, 'Nama lengkap wajib diisi.'),
  gender: z.string().min(1, 'Jenis kelamin wajib diisi.'),
  birthPlace: z.string().min(1, 'Tempat lahir wajib diisi.'),
  birthDate: z.string().min(1, 'Tanggal lahir wajib diisi.'),
  job: z.string().optional(),
  address: z.string().min(1, 'Alamat wajib diisi.'),
});

const formSchema = z.object({
  purpose: z.string().min(1, 'Persyaratan/keperluan wajib diisi.'),
  wali: personSchema,
  anak: personSchema,
});

export function WaliForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingWali, setIsSearchingWali] = useState(false);
  const [isSearchingAnak, setIsSearchingAnak] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<Array<{ fieldName: string; file: File }>>([]);

  const { firestore } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      purpose: '',
      wali: { nik: '', name: '', gender: '', birthPlace: '', birthDate: '', job: '', address: '' },
      anak: { nik: '', name: '', gender: '', birthPlace: '', birthDate: '', address: '' },
    },
  });

  const waliNik = form.watch('wali.nik');
  const anakNik = form.watch('anak.nik');

  const handleAutoFill = async (nik: string, prefix: 'wali' | 'anak') => {
    if (nik?.length === 16 && firestore) {
      prefix === 'wali' ? setIsSearchingWali(true) : setIsSearchingAnak(true);
      try {
        const resident = await getResidentByNik(firestore, nik);
        if (resident) {
          form.setValue(`${prefix}.name`, resident.fullName.toUpperCase());
          form.setValue(`${prefix}.gender`, resident.gender);
          form.setValue(`${prefix}.birthPlace`, resident.placeOfBirth);
          form.setValue(`${prefix}.birthDate`, formatDbDateToForm(resident.dateOfBirth));
          if (prefix === 'wali') form.setValue(`wali.job`, resident.occupation);

          const fullAddress = `${resident.address}, RT ${resident.rt} RW ${resident.rw}, ${resident.kelurahan}, kec. Gandrungmangu, Kab. Cilacap`.toUpperCase();
          form.setValue(`${prefix}.address`, fullAddress);

          toast({ title: "Data Ditemukan", description: `Data ${prefix === 'wali' ? 'Wali' : 'Anak'} telah diisi otomatis.` });
        }
      } catch (error) {
        console.error("Auto-fill error:", error);
      } finally {
        prefix === 'wali' ? setIsSearchingWali(false) : setIsSearchingAnak(false);
      }
    }
  };

  useEffect(() => { handleAutoFill(waliNik, 'wali'); }, [waliNik, firestore]);
  useEffect(() => { handleAutoFill(anakNik, 'anak'); }, [anakNik, firestore]);

  const handleFileSelect = (file: File, fieldName: string) => {
    setFilesToUpload(prev => [...prev, { file, fieldName }]);
  };

  const generateTicketNumber = () => {
    return Math.random().toString().substring(2, 8);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;

    if (!isAdmin) {
      const hasKtp = filesToUpload.some(f => f.fieldName === 'ktp');
      const hasKk = filesToUpload.some(f => f.fieldName === 'kk');
      if (!hasKtp || !hasKk) {
        toast({ title: "Berkas Belum Lengkap", description: "Mohon unggah foto KTP dan KK Wali.", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const newTicketNumber = generateTicketNumber();

      const filesPayload = await Promise.all(
        filesToUpload.map(async (fileData) => {
          const base64Data = await convertFileToBase64(fileData.file);
          return {
            base64Data,
            mimeType: fileData.file.type,
            targetFileName: `${fileData.fieldName}_${values.wali.nik}`,
            fieldName: fileData.fieldName,
          };
        })
      );

      await addSubmission(firestore, {
        ticketNumber: newTicketNumber,
        requesterName: values.wali.name,
        nik: values.wali.nik,
        letterType: 'Surat Keterangan Wali',
        formData: values,
        filesToUpload: filesPayload,
      });

      setTicketNumber(newTicketNumber);
      setIsSubmitted(true);
      toast({ title: "Pengajuan Berhasil", description: `Nomor tiket Anda: ${newTicketNumber}` });
    } catch (error: any) {
      toast({ title: "Gagal Mengajukan", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) return <SubmissionSuccess ticketNumber={ticketNumber} onReset={() => { form.reset(); setIsSubmitted(false); setFilesToUpload([]); }} />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
        <div className="p-8 border-2 border-primary/10 rounded-[3rem] bg-emerald-50/30 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
          <div className="p-4 bg-primary text-white rounded-2xl">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <FormField control={form.control} name="purpose" render={({ field }) => (
            <FormItem className="flex-1 w-full">
              <FormLabel className="text-sm font-black uppercase tracking-tight text-primary italic">Untuk Persyaratan / Keperluan</FormLabel>
              <FormControl><Input placeholder="Contoh: Pengambilan Bantuan PIP" {...field} disabled={isSubmitting} className="h-14 rounded-2xl border-white shadow-sm" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormSection title="Data Wali / Nenek" icon={User}>
          <FormField control={form.control} name="wali.nik" render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className="font-bold text-primary">NIK Wali</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input placeholder="3301xxxxxxxxxxxx" {...field} disabled={isSubmitting} maxLength={16} className="h-12 rounded-xl" />
                  {isSearchingWali && <Loader2 className="absolute right-4 top-3 h-6 w-6 animate-spin text-primary" />}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="wali.name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Lengkap</FormLabel>
              <FormControl><Input placeholder="Sesuai KTP" {...field} disabled={isSubmitting} className="uppercase h-12 rounded-xl" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="wali.gender" render={({ field }) => (
            <FormItem>
              <FormLabel>Jenis Kelamin</FormLabel>
              <FormControl><Input placeholder="Contoh: Laki-Laki" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="wali.birthPlace" render={({ field }) => (
              <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input placeholder="Kota" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="wali.birthDate" render={({ field }) => (
              <FormItem><FormLabel>Tgl Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <FormField control={form.control} name="wali.job" render={({ field }) => (
            <FormItem>
              <FormLabel>Pekerjaan</FormLabel>
              <FormControl><Input placeholder="Contoh: Ibu Rumah Tangga" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="wali.address" render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Alamat Lengkap</FormLabel>
              <FormControl><Textarea placeholder="Alamat lengkap sesuai KTP" {...field} disabled={isSubmitting} className="uppercase rounded-2xl" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </FormSection>

        <FormSection title="Data Anak" icon={Baby}>
          <FormField control={form.control} name="anak.nik" render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className="font-bold text-primary">NIK Anak</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input placeholder="3301xxxxxxxxxxxx" {...field} disabled={isSubmitting} maxLength={16} className="h-12 rounded-xl" />
                  {isSearchingAnak && <Loader2 className="absolute right-4 top-3 h-6 w-6 animate-spin text-primary" />}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="anak.name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Lengkap Anak</FormLabel>
              <FormControl><Input placeholder="Nama Lengkap Anak" {...field} disabled={isSubmitting} className="uppercase h-12 rounded-xl" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="anak.gender" render={({ field }) => (
            <FormItem>
              <FormLabel>Jenis Kelamin</FormLabel>
              <FormControl><Input placeholder="Contoh: Laki-Laki" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="anak.birthPlace" render={({ field }) => (
              <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input placeholder="Kota" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="anak.birthDate" render={({ field }) => (
              <FormItem><FormLabel>Tgl Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <FormField control={form.control} name="anak.address" render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Alamat Lengkap Anak</FormLabel>
              <FormControl><Textarea placeholder="Alamat lengkap" {...field} disabled={isSubmitting} className="uppercase rounded-2xl" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </FormSection>

        <FormSection title="Unggah Berkas Lampiran" icon={UploadCloud}>
          <div className="col-span-1 md:col-span-2 space-y-6">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Unggah file format gambar (JPG, PNG) atau PDF. Berkas bertanda * wajib diisi.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
              <GoogleFileUploader label="Foto KTP Wali" fieldName="ktp" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
              <GoogleFileUploader label="Foto KK" fieldName="kk" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
              <GoogleFileUploader label="Surat Pengantar KEPALA Kecamatan" fieldName="pengantarRt" onFileSelect={handleFileSelect} isRequired={false} disabled={isSubmitting} />
            </div>
          </div>
        </FormSection>

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all active:scale-95">
          {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : 'Ajukan Surat Keterangan Wali'}
        </Button>
      </form>
    </Form>
  );
}
