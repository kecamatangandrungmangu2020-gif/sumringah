'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, User, Users, Skull, FileText, UploadCloud, FileCheck, Paperclip } from 'lucide-react';

import { cn, formatDbDateToForm } from '@/lib/utils';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { SubmissionSuccess } from '../submission-success';
import { addSubmission } from '@/lib/submissions';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { getResidentByNik } from '@/lib/residents';

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

const FormSection = ({ title, icon: Icon, children, className }: { title: string; icon: React.ElementType; children: React.ReactNode; className?: string }) => (
  <div className={cn("space-y-6 rounded-[2rem] border p-6 md:p-10 bg-white shadow-sm", className)}>
    <div className="flex items-center gap-3 border-b pb-4">
      <Icon className="h-5 w-5 text-primary" />
      <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">{title}</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
  </div>
);

const formSchema = z.object({
  kkNumber: z.string().min(1, 'Nomor KK wajib diisi.'),
  kkHead: z.string().min(1, 'Nama kepala keluarga wajib diisi.'),
  nik: z.string().length(16, 'NIK harus 16 digit.'),
  name: z.string().min(1, 'Nama wajib diisi.'),
  gender: z.string().min(1, 'Jenis kelamin wajib diisi.'),
  placeOfBirth: z.string().min(1, 'Tempat lahir wajib diisi.'),
  birthDate: z.string().min(1, 'Tanggal lahir wajib diisi.'),
  age: z.string().min(1, 'Umur wajib diisi.'),
  religion: z.string().min(1, 'Agama wajib diisi.'),
  occupation: z.string().min(1, 'Pekerjaan wajib diisi.'),
  address: z.string().min(1, 'Alamat wajib diisi.'),
  anakKe: z.string().min(1, 'Anak ke- wajib diisi.'),
  deathDate: z.date({ required_error: 'Tanggal kematian wajib diisi.' }),
  deathTime: z.string().min(1, 'Jam kematian wajib diisi.'),
  deathCause: z.string().min(1, 'Sebab kematian wajib diisi.'),
  deathLocation: z.string().min(1, 'Tempat kematian wajib diisi.'),
  whoExplains: z.string().min(1, 'Yang menerangkan wajib diisi.'),

  fatherNik: z.string().optional().or(z.literal('')),
  fatherName: z.string().optional(),
  fatherPlaceOfBirth: z.string().optional(),
  fatherBirthDate: z.string().optional(),
  fatherJob: z.string().optional(),
  fatherAddress: z.string().optional(),

  motherNik: z.string().optional().or(z.literal('')),
  motherName: z.string().optional(),
  motherPlaceOfBirth: z.string().optional(),
  motherBirthDate: z.string().optional(),
  motherJob: z.string().optional(),
  motherAddress: z.string().optional(),

  reporterNik: z.string().length(16, 'NIK pelapor harus 16 digit.'),
  reporterName: z.string().min(1, 'Nama pelapor wajib diisi.'),
  reporterPlaceOfBirth: z.string().min(1, 'Tempat lahir pelapor wajib diisi.'),
  reporterBirthDate: z.string().min(1, 'Tanggal lahir pelapor wajib diisi.'),
  reporterGender: z.string().min(1, 'Jenis kelamin pelapor wajib diisi.'),
  reporterJob: z.string().min(1, 'Pekerjaan pelapor wajib diisi.'),
  reporterAddress: z.string().min(1, 'Alamat pelapor wajib diisi.'),

  witness1Nik: z.string().length(16, 'NIK saksi 1 harus 16 digit.'),
  witness1Name: z.string().min(1, 'Nama saksi 1 wajib diisi.'),
  witness1PlaceOfBirth: z.string().min(1, 'Tempat lahir saksi 1 wajib diisi.'),
  witness1BirthDate: z.string().min(1, 'Tanggal lahir saksi 1 wajib diisi.'),
  witness1Job: z.string().min(1, 'Pekerjaan saksi 1 wajib diisi.'),
  witness1Address: z.string().min(1, 'Alamat saksi 1 wajib diisi.'),

  witness2Nik: z.string().length(16, 'NIK saksi 2 harus 16 digit.'),
  witness2Name: z.string().min(1, 'Nama saksi 2 wajib diisi.'),
  witness2PlaceOfBirth: z.string().min(1, 'Tempat lahir saksi 2 wajib diisi.'),
  witness2BirthDate: z.string().min(1, 'Tanggal lahir saksi 2 wajib diisi.'),
  witness2Job: z.string().min(1, 'Pekerjaan saksi 2 wajib diisi.'),
  witness2Address: z.string().min(1, 'Alamat saksi 2 wajib diisi.'),
});

export function KematianForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchingNik, setSearchingNik] = useState<string | null>(null);
  const [filesToUpload, setFilesToUpload] = useState<Array<{ fieldName: string; file: File }>>([]);

  const { firestore } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kkNumber: '',
      kkHead: '',
      nik: '',
      name: '',
      gender: '',
      placeOfBirth: '',
      birthDate: '',
      age: '',
      religion: '',
      occupation: '',
      address: '',
      anakKe: '1',
      deathTime: '09.00',
      deathCause: '',
      deathLocation: '',
      whoExplains: '',
      fatherNik: '',
      fatherName: '',
      fatherPlaceOfBirth: '',
      fatherBirthDate: '',
      fatherJob: '',
      fatherAddress: '',
      motherNik: '',
      motherName: '',
      motherPlaceOfBirth: '',
      motherBirthDate: '',
      motherJob: '',
      motherAddress: '',
      reporterNik: '',
      reporterName: '',
      reporterPlaceOfBirth: '',
      reporterBirthDate: '',
      reporterGender: '',
      reporterJob: '',
      reporterAddress: '',
      witness1Nik: '',
      witness1Name: '',
      witness1PlaceOfBirth: '',
      witness1BirthDate: '',
      witness1Job: '',
      witness1Address: '',
      witness2Nik: '',
      witness2Name: '',
      witness2PlaceOfBirth: '',
      witness2BirthDate: '',
      witness2Job: '',
      witness2Address: '',
    },
  });

  const watchNik = form.watch('nik');
  const watchFatherNik = form.watch('fatherNik');
  const watchMotherNik = form.watch('motherNik');
  const watchReporterNik = form.watch('reporterNik');
  const watchWitness1Nik = form.watch('witness1Nik');
  const watchWitness2Nik = form.watch('witness2Nik');

  const handleFileSelect = (file: File, fieldName: string) => {
    setFilesToUpload(prev => [...prev, { file, fieldName }]);
  };

  const calculateAge = (birthDateStr: string) => {
    try {
      const parts = birthDateStr.split('-');
      if (parts.length !== 3) return '';
      const birthDay = parseInt(parts[0], 10);
      const birthMonth = parseInt(parts[1], 10) - 1;
      const birthYear = parseInt(parts[2], 10);

      const birthDate = new Date(birthYear, birthMonth, birthDay);
      const today = new Date();

      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age >= 0 ? age.toString() : '0';
    } catch {
      return '';
    }
  };

  const handleAutoFill = async (nik: string, prefix: string) => {
    if (nik?.length === 16 && firestore) {
      setSearchingNik(prefix);
      try {
        const resident = await getResidentByNik(firestore, nik);
        if (resident) {
          const nameField = prefix === '' ? 'name' : `${prefix}Name`;
          form.setValue(nameField as any, resident.fullName.toUpperCase());

          if (prefix === '' || prefix === 'father' || prefix === 'mother' || prefix === 'reporter' || prefix === 'witness1' || prefix === 'witness2') {
            const birthPlaceField = prefix === '' ? 'placeOfBirth' : `${prefix}PlaceOfBirth`;
            const birthDateField = prefix === '' ? 'birthDate' : `${prefix}BirthDate`;
            form.setValue(birthPlaceField as any, resident.placeOfBirth);
            form.setValue(birthDateField as any, formatDbDateToForm(resident.dateOfBirth));
          }

          if (prefix === '' || prefix === 'reporter') {
            const genderField = prefix === '' ? 'gender' : `${prefix}Gender`;
            form.setValue(genderField as any, resident.gender);
          }

          if (prefix === '') {
            form.setValue('religion', resident.religion);
            form.setValue('age', calculateAge(resident.dateOfBirth));
            form.setValue('kkNumber', resident.noKk || '');
          }

          const jobField = prefix === '' ? 'occupation' : `${prefix}Job`;
          form.setValue(jobField as any, resident.occupation);

          const addressField = prefix === '' ? 'address' : `${prefix}Address`;
          const fullAddress = `${resident.address}, RT ${resident.rt} RW ${resident.rw}, ${resident.kelurahan}, kec. Gandrungmangu, Kab. Cilacap`.toUpperCase();
          form.setValue(addressField as any, fullAddress);

          toast({ title: `Data Ditemukan`, description: `Data identitas telah diisi otomatis.` });
        }
      } catch (error: any) {
        console.error("Auto-fill error:", error);
      } finally {
        setSearchingNik(null);
      }
    }
  };

  useEffect(() => { handleAutoFill(watchNik, ''); }, [watchNik, firestore]);
  useEffect(() => { handleAutoFill(watchFatherNik || '', 'father'); }, [watchFatherNik, firestore]);
  useEffect(() => { handleAutoFill(watchMotherNik || '', 'mother'); }, [watchMotherNik, firestore]);
  useEffect(() => { handleAutoFill(watchReporterNik, 'reporter'); }, [watchReporterNik, firestore]);
  useEffect(() => { handleAutoFill(watchWitness1Nik, 'witness1'); }, [watchWitness1Nik, firestore]);
  useEffect(() => { handleAutoFill(watchWitness2Nik, 'witness2'); }, [watchWitness2Nik, firestore]);

  const generateTicketNumber = () => {
    return Math.random().toString().substring(2, 8);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;

    if (!isAdmin && !filesToUpload.some(f => f.fieldName === 'ktpJenazah')) {
      toast({ title: "Berkas Belum Lengkap", description: "Mohon unggah foto KTP Almarhum/ah.", variant: "destructive" });
      return;
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
            targetFileName: `${fileData.fieldName}_${values.nik}`,
            fieldName: fileData.fieldName,
          };
        })
      );

      await addSubmission(firestore, {
        ticketNumber: newTicketNumber,
        requesterName: values.reporterName,
        nik: values.nik,
        letterType: 'Surat Keterangan Kematian',
        formData: values,
        filesToUpload: filesPayload,
      });

      setTicketNumber(newTicketNumber);
      setIsSubmitted(true);
      toast({ title: "Pengajuan Berhasil", description: `Nomor tiket Anda: ${newTicketNumber}` });
    } catch (error: any) {
      console.error("Submission Error:", error);
      toast({ title: "Gagal Mengajukan", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) return <SubmissionSuccess ticketNumber={ticketNumber} onReset={() => { form.reset(); setFilesToUpload([]); setIsSubmitted(false); }} />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
        <FormSection title="Data Kartu Keluarga" icon={FileText} className="bg-primary/5">
          <FormField control={form.control} name="kkNumber" render={({ field }) => (
            <FormItem><FormLabel>Nomor Kartu Keluarga (KK)</FormLabel><FormControl><Input placeholder="Nomor KK 16 digit" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="kkHead" render={({ field }) => (
            <FormItem><FormLabel>Nama Kepala Keluarga</FormLabel><FormControl><Input placeholder="Nama Kepala Keluarga" {...field} disabled={isSubmitting} className="uppercase h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
        </FormSection>

        <FormSection title="Data Jenazah" icon={Skull}>
          <FormField control={form.control} name="nik" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel className="font-bold text-primary">NIK Almarhum/Almarhumah</FormLabel><FormControl><div className="relative"><Input placeholder="3301xxxxxxxxxxxx" {...field} disabled={isSubmitting} maxLength={16} className="h-12 rounded-xl" />{searchingNik === '' && <Loader2 className="absolute right-4 top-3 h-6 w-6 animate-spin text-primary" />}</div></FormControl><FormDescription>Masukkan NIK untuk auto-fill data diri jenazah.</FormDescription><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="Sesuai KTP" {...field} disabled={isSubmitting} className="uppercase h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="gender" render={({ field }) => (
            <FormItem><FormLabel>Jenis Kelamin</FormLabel><FormControl><Input placeholder="Laki-Laki / Perempuan" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="placeOfBirth" render={({ field }) => (
              <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input placeholder="Kota" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="birthDate" render={({ field }) => (
              <FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="age" render={({ field }) => (
            <FormItem><FormLabel>Umur</FormLabel><FormControl><Input placeholder="Otomatis dari Tgl Lahir" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="religion" render={({ field }) => (
            <FormItem><FormLabel>Agama</FormLabel><FormControl><Input placeholder="Agama" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="occupation" render={({ field }) => (
            <FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input placeholder="Pekerjaan terakhir" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="anakKe" render={({ field }) => (
            <FormItem><FormLabel>Anak Ke-</FormLabel><FormControl><Input placeholder="1" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel>Alamat Sesuai KTP</FormLabel><FormControl><Textarea placeholder="Alamat lengkap" {...field} disabled={isSubmitting} className="uppercase rounded-2xl" /></FormControl><FormMessage /></FormItem>
          )} />

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border-2 border-dashed mt-4">
            <FormField control={form.control} name="deathDate" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Tanggal Kematian</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full h-12 rounded-xl pl-3 text-left font-normal', !field.value && 'text-muted-foreground')} disabled={isSubmitting}>{field.value ? format(field.value, 'PPP') : <span>Pilih tanggal</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="deathTime" render={({ field }) => (
              <FormItem><FormLabel>Jam Kematian</FormLabel><FormControl><Input placeholder="09.00 WIB" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="deathCause" render={({ field }) => (
              <FormItem><FormLabel>Sebab Kematian</FormLabel><FormControl><Input placeholder="Contoh: Sakit / Tua" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="whoExplains" render={({ field }) => (
              <FormItem><FormLabel>Yang Menerangkan</FormLabel><FormControl><Input placeholder="Contoh: Dokter / Keluarga" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="deathLocation" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>Tempat Kematian</FormLabel><FormControl><Input placeholder="Contoh: Rumah / Rumah Sakit" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </FormSection>

        <FormSection title="Data Orang Tua Jenazah" icon={Users}>
          <FormField control={form.control} name="fatherNik" render={({ field }) => (
            <FormItem><FormLabel className="font-bold">NIK Ayah</FormLabel><FormControl><div className="relative"><Input placeholder="NIK atau -" {...field} disabled={isSubmitting} maxLength={16} className="h-12 rounded-xl" />{searchingNik === 'father' && <Loader2 className="absolute right-4 top-3 h-6 w-6 animate-spin text-primary" />}</div></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="fatherName" render={({ field }) => (
            <FormItem><FormLabel>Nama Ayah</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="uppercase h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="fatherPlaceOfBirth" render={({ field }) => (
              <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="fatherBirthDate" render={({ field }) => (
              <FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="fatherJob" render={({ field }) => (
            <FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="fatherAddress" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel>Alamat</FormLabel><FormControl><Textarea {...field} disabled={isSubmitting} className="uppercase rounded-2xl" /></FormControl><FormMessage /></FormItem>
          )} />
        </FormSection>

        <FormSection title="Data Ibu Jenazah" icon={Users}>
          <FormField control={form.control} name="motherNik" render={({ field }) => (
            <FormItem><FormLabel className="font-bold">NIK Ibu</FormLabel><FormControl><div className="relative"><Input placeholder="NIK atau -" {...field} disabled={isSubmitting} maxLength={16} className="h-12 rounded-xl" />{searchingNik === 'mother' && <Loader2 className="absolute right-4 top-3 h-6 w-6 animate-spin text-primary" />}</div></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="motherName" render={({ field }) => (
            <FormItem><FormLabel>Nama Ibu</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="uppercase h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="motherPlaceOfBirth" render={({ field }) => (
              <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="motherBirthDate" render={({ field }) => (
              <FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="motherJob" render={({ field }) => (
            <FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="motherAddress" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel>Alamat</FormLabel><FormControl><Textarea {...field} disabled={isSubmitting} className="uppercase rounded-2xl" /></FormControl><FormMessage /></FormItem>
          )} />
        </FormSection>

        <FormSection title="Pelapor" icon={User}>
          <FormField control={form.control} name="reporterNik" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel className="font-bold">NIK Pelapor</FormLabel><FormControl><div className="relative"><Input placeholder="3301xxxxxxxxxxxx" {...field} disabled={isSubmitting} maxLength={16} className="h-12 rounded-xl" />{searchingNik === 'reporter' && <Loader2 className="absolute right-4 top-3 h-6 w-6 animate-spin text-primary" />}</div></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="reporterName" render={({ field }) => (
            <FormItem><FormLabel>Nama Pelapor</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="uppercase h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="reporterGender" render={({ field }) => (
            <FormItem><FormLabel>Jenis Kelamin</FormLabel><FormControl><Input placeholder="Jenis Kelamin" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="reporterPlaceOfBirth" render={({ field }) => (
              <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="reporterBirthDate" render={({ field }) => (
              <FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="reporterJob" render={({ field }) => (
            <FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="reporterAddress" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel>Alamat Pelapor</FormLabel><FormControl><Textarea {...field} disabled={isSubmitting} className="uppercase rounded-2xl" /></FormControl><FormMessage /></FormItem>
          )} />
        </FormSection>

        <FormSection title="Saksi 1" icon={Users}>
          <FormField control={form.control} name="witness1Nik" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel className="font-bold">NIK Saksi 1</FormLabel><FormControl><div className="relative"><Input placeholder="3301xxxxxxxxxxxx" {...field} disabled={isSubmitting} maxLength={16} className="h-12 rounded-xl" />{searchingNik === 'witness1' && <Loader2 className="absolute right-4 top-3 h-6 w-6 animate-spin text-primary" />}</div></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="witness1Name" render={({ field }) => (
            <FormItem><FormLabel>Nama Saksi 1</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="uppercase h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="witness1PlaceOfBirth" render={({ field }) => (
              <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="witness1BirthDate" render={({ field }) => (
              <FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="witness1Job" render={({ field }) => (
            <FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="witness1Address" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel>Alamat</FormLabel><FormControl><Textarea {...field} disabled={isSubmitting} className="uppercase rounded-2xl" /></FormControl><FormMessage /></FormItem>
          )} />
        </FormSection>

        <FormSection title="Saksi 2" icon={Users}>
          <FormField control={form.control} name="witness2Nik" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel className="font-bold">NIK Saksi 2</FormLabel><FormControl><div className="relative"><Input placeholder="3301xxxxxxxxxxxx" {...field} disabled={isSubmitting} maxLength={16} className="h-12 rounded-xl" />{searchingNik === 'witness2' && <Loader2 className="absolute right-4 top-3 h-6 w-6 animate-spin text-primary" />}</div></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="witness2Name" render={({ field }) => (
            <FormItem><FormLabel>Nama Saksi 2</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="uppercase h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="witness2PlaceOfBirth" render={({ field }) => (
              <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="witness2BirthDate" render={({ field }) => (
              <FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="witness2Job" render={({ field }) => (
            <FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="witness2Address" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel>Alamat</FormLabel><FormControl><Textarea {...field} disabled={isSubmitting} className="uppercase rounded-2xl" /></FormControl><FormMessage /></FormItem>
          )} />
        </FormSection>

        <FormSection title="Unggah Berkas Lampiran" icon={UploadCloud}>
          <div className="col-span-1 md:col-span-2 space-y-6">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Unggah file format gambar (JPG, PNG) atau PDF. Berkas bertanda * wajib diisi.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
              <GoogleFileUploader
                label="KTP Jenazah"
                fieldName="ktpJenazah"
                onFileSelect={handleFileSelect}
                isRequired={!isAdmin}
                disabled={isSubmitting}
              />
              <GoogleFileUploader
                label="Kartu Keluarga"
                fieldName="kk"
                onFileSelect={handleFileSelect}
                disabled={isSubmitting}
              />
              <GoogleFileUploader
                label="Surat Pengantar KEPALA Kecamatan"
                fieldName="pengantarRt"
                onFileSelect={handleFileSelect}
                isRequired={false}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </FormSection>

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all active:scale-95">
          {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : 'Ajukan Surat Keterangan Kematian'}
        </Button>
      </form>
    </Form>
  );
}
