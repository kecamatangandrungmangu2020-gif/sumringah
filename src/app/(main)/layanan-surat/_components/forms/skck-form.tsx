'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, User, UploadCloud, FileCheck, Paperclip, ShieldCheck } from 'lucide-react';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
const skckPurposeOptions = [
  'Persyaratan Melamar Pekerjaan',
  'Melanjutkan Pendidikan / Kuliah',
  'Pendaftaran TNI / POLRI',
  'Pendaftaran PNS / PPPK',
  'Pendaftaran Karyawan Kecamatan',
  'Persyaratan Bepergian ke Luar Negeri / Visa',
  'Persyaratan Izin Usaha / Lisensi',
  'Lainnya',
];
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

const formSchema = z.object({
  nik: z.string().length(16, 'NIK harus 16 digit.'),
  purpose: z.string().min(1, 'Keperluan wajib dipilih.'),
  otherPurpose: z.string().optional(),
  name: z.string().min(1, 'Nama lengkap wajib diisi.'),
  gender: z.string().min(1, 'Jenis kelamin wajib diisi.'),
  birthPlace: z.string().min(1, 'Tempat lahir wajib diisi.'),
  birthDate: z.string().min(1, 'Tanggal lahir wajib diisi.'),
  nationality: z.string().min(1, 'Kewarganegaraan wajib diisi.'),
  religion: z.string().min(1, 'Agama wajib diisi.'),
  job: z.string().min(1, 'Pekerjaan wajib diisi.'),
  address: z.string().min(1, 'Alamat wajib diisi.'),
}).refine((data) => {
  if (data.purpose === 'Lainnya' && !data.otherPurpose) {
    return false;
  }
  return true;
}, {
  message: "Mohon isi keperluan lainnya.",
  path: ["otherPurpose"],
});

export function SkckForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<Array<{ fieldName: string; file: File }>>([]);

  const { firestore } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nik: '',
      purpose: '',
      otherPurpose: '',
      name: '',
      gender: '',
      birthPlace: '',
      birthDate: '',
      nationality: 'WNI',
      religion: '',
      job: '',
      address: '',
    },
  });

  const nikValue = form.watch('nik');
  const watchPurpose = form.watch('purpose');

  useEffect(() => {
    const fetchResident = async () => {
      if (nikValue?.length === 16 && firestore) {
        setIsSearching(true);
        try {
          const res = await getResidentByNik(firestore, nikValue);
          if (res) {
            form.setValue('name', res.fullName.toUpperCase());
            form.setValue('gender', res.gender);
            form.setValue('birthPlace', res.placeOfBirth);
            form.setValue('birthDate', formatDbDateToForm(res.dateOfBirth));
            form.setValue('religion', res.religion);
            form.setValue('job', res.occupation);
            const fullAddress = `${res.address}, RT ${res.rt} RW ${res.rw}, ${res.kelurahan}Kec. Gandrungmangu, Kab. Cilacap`.toUpperCase();
            form.setValue('address', fullAddress);
            toast({ title: "Data Berhasil Dimuat" });
          }
        } finally {
          setIsSearching(false);
        }
      }
    };
    fetchResident();
  }, [nikValue, firestore, form, toast]);

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
        toast({ title: "Berkas Belum Lengkap", description: "Mohon unggah foto KTP dan KK Anda.", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const newTicketNumber = generateTicketNumber();
      const finalPurpose = values.purpose === 'Lainnya' ? values.otherPurpose : values.purpose;

      const filesPayload = await Promise.all(
        filesToUpload.map(async (fileData) => {
          const base64Data = await convertFileToBase64(fileData.file);
          return {
            base64Data,
            mimeType: fileData.file.type,
            targetFileName: `${fileData.fieldName}_${values.nik}`,
            fieldName: fileData.fieldName,
          };
        })
      );

      await addSubmission(firestore, {
        ticketNumber: newTicketNumber,
        requesterName: values.name,
        nik: values.nik,
        letterType: 'Surat Pengantar SKCK',
        formData: {
          ...values,
          purpose: finalPurpose,
        },
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

  if (isSubmitted) return <SubmissionSuccess ticketNumber={ticketNumber} onReset={() => setIsSubmitted(false)} />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
        <FormSection title="Identitas Pemohon" icon={User}>
          <FormField
            control={form.control}
            name="nik"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="font-bold text-primary">NIK Pemohon (16 Digit)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input placeholder="Masukkan NIK untuk mengisi otomatis..." {...field} disabled={isSubmitting} maxLength={16} className="h-12 rounded-xl" />
                    {isSearching && <Loader2 className="absolute right-4 top-3 h-6 w-6 animate-spin text-primary" />}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Keperluan SKCK</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Pilih Keperluan" /></SelectTrigger></FormControl>
                  <SelectContent>{skckPurposeOptions.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchPurpose === 'Lainnya' && (
            <FormField
              control={form.control}
              name="otherPurpose"
              render={({ field }) => (
                <FormItem className="md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormLabel className="font-bold text-accent italic">Sebutkan Keperluan Lainnya</FormLabel>
                  <FormControl>
                    <Input placeholder="Tulis keperluan secara manual..." {...field} disabled={isSubmitting} className="h-12 rounded-xl border-accent/20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input className="uppercase h-12 rounded-xl" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />

          <FormField control={form.control} name="gender" render={({ field }) => (<FormItem><FormLabel>Jenis Kelamin</FormLabel><FormControl><Input placeholder="Contoh: Laki-Laki" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="birthPlace" render={({ field }) => (<FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="birthDate" render={({ field }) => (<FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input {...field} placeholder="DD-MM-YYYY" disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
          </div>

          <FormField control={form.control} name="religion" render={({ field }) => (<FormItem><FormLabel>Agama</FormLabel><FormControl><Input placeholder="Agama" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />

          <FormField control={form.control} name="job" render={({ field }) => (<FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="address" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Alamat Sesuai KTP</FormLabel><FormControl><Textarea {...field} className="uppercase rounded-2xl" disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
        </FormSection>

        <FormSection title="Unggah Berkas Lampiran" icon={UploadCloud}>
          <div className="col-span-1 md:col-span-2 space-y-6">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Unggah file format gambar (JPG, PNG) atau PDF. Berkas bertanda * wajib diisi.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
              <GoogleFileUploader label="Foto KTP" fieldName="ktp" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
              <GoogleFileUploader label="Foto KK" fieldName="kk" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
              <GoogleFileUploader label="Surat Pengantar KEPALA Kecamatan" fieldName="pengantarRt" onFileSelect={handleFileSelect} isRequired={false} disabled={isSubmitting} />
            </div>
          </div>
        </FormSection>

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all active:scale-95">
          {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : 'Ajukan Pengantar SKCK'}
        </Button>
      </form>
    </Form>
  );
}
