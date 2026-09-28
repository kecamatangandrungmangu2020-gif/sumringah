'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, UploadCloud, FileCheck, User, Paperclip } from 'lucide-react';

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
    <FormItem>
      <FormLabel className={cn(isRequired && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
        {label}
      </FormLabel>
      <FormControl>
        <div className="relative">
          <Input type="file" onChange={handleFileChange} disabled={disabled || !!fileName} className="pr-10" accept="image/jpeg,image/png,application/pdf" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
            {fileName ? <FileCheck className="text-green-600" /> : <Paperclip className="text-muted-foreground" />}
          </div>
        </div>
      </FormControl>
      {fileName && <p className="text-xs text-muted-foreground mt-1">File: {fileName}</p>}
      <FormMessage />
    </FormItem>
  );
}

const FormSection = ({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: any }) => (
  <div className="space-y-6 rounded-md border p-4 md:p-6 bg-white shadow-sm">
    <div className="flex items-center gap-2 border-b pb-2">
      {Icon && <Icon className="h-5 w-5 text-primary" />}
      <h3 className="text-lg font-semibold">{title}</h3>
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
  nationality: z.string().min(1, 'Kewarganegaraan wajib diisi.'),
  religion: z.string().min(1, 'Agama wajib diisi.'),
  job: z.string().min(1, 'Pekerjaan wajib diisi.'),
  address: z.string().min(1, 'Alamat wajib diisi.'),
});

const formSchema = z.object({
  moyang: personSchema,
  anak: personSchema,
});

export function MoyangForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingMoyang, setIsSearchingMoyang] = useState(false);
  const [isSearchingAnak, setIsSearchingAnak] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<Array<{ fieldName: string; file: File }>>([]);

  const { firestore } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      moyang: { nik: '', name: '', gender: '', birthPlace: '', birthDate: '', nationality: 'WNI', religion: '', job: '', address: '' },
      anak: { nik: '', name: '', gender: '', birthPlace: '', birthDate: '', nationality: 'WNI', religion: '', job: '', address: '' },
    },
  });

  const moyangNik = form.watch('moyang.nik');
  const anakNik = form.watch('anak.nik');

  const handleAutoFill = async (nik: string, prefix: 'moyang' | 'anak') => {
    if (nik.length === 16 && firestore) {
      prefix === 'moyang' ? setIsSearchingMoyang(true) : setIsSearchingAnak(true);
      try {
        const resident = await getResidentByNik(firestore, nik);
        if (resident) {
          form.setValue(`${prefix}.name`, resident.fullName.toUpperCase());
          form.setValue(`${prefix}.gender`, resident.gender);
          form.setValue(`${prefix}.birthPlace`, resident.placeOfBirth);
          form.setValue(`${prefix}.birthDate`, formatDbDateToForm(resident.dateOfBirth));
          form.setValue(`${prefix}.religion`, resident.religion);
          form.setValue(`${prefix}.job`, resident.occupation);

          const fullAddress = `${resident.address}, RT ${resident.rt} RW ${resident.rw}, ${resident.kelurahan}, kec. Gandrungmangu, Kab. Cilacap`.toUpperCase();
          form.setValue(`${prefix}.address`, fullAddress);

          toast({ title: "Data Ditemukan", description: `Data ${prefix === 'moyang' ? 'Orang Tua' : 'Anak'} telah diisi otomatis.` });
        }
      } catch (error) {
        console.error("Auto-fill error:", error);
      } finally {
        prefix === 'moyang' ? setIsSearchingMoyang(false) : setIsSearchingAnak(false);
      }
    }
  };

  useEffect(() => { handleAutoFill(moyangNik, 'moyang'); }, [moyangNik, firestore]);
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
      if (!filesToUpload.some(f => f.fieldName === 'ktpMoyang')) {
        toast({ title: "Berkas Belum Lengkap", description: "Mohon unggah KTP Orang Tua Kandung.", variant: "destructive" });
        return;
      }
      if (!filesToUpload.some(f => f.fieldName === 'ktpAnak')) {
        toast({ title: "Berkas Belum Lengkap", description: "Mohon unggah KTP Anak Kandung.", variant: "destructive" });
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
            targetFileName: `${fileData.fieldName}_${values.moyang.nik}`,
            fieldName: fileData.fieldName,
          };
        })
      );

      await addSubmission(firestore, {
        ticketNumber: newTicketNumber,
        requesterName: values.moyang.name,
        nik: values.moyang.nik,
        letterType: 'Surat Keterangan Moyang',
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormSection title="Data Moyang (Orang Tua Kandung)" icon={User}>
          <FormField control={form.control} name="moyang.nik" render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className="font-bold text-primary">NIK Moyang</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input placeholder="3301xxxxxxxxxxxx" {...field} disabled={isSubmitting} maxLength={16} />
                  {isSearchingMoyang && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-primary" />}
                </div>
              </FormControl>
              <FormDescription>Masukkan NIK Orang Tua untuk pengisian otomatis.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="moyang.name" render={({ field }) => (
            <FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="Sesuai KTP" {...field} disabled={isSubmitting} className="uppercase" /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="moyang.gender" render={({ field }) => (
            <FormItem><FormLabel>Jenis Kelamin</FormLabel><FormControl><Input placeholder="Laki-Laki / Perempuan" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="moyang.birthPlace" render={({ field }) => (
              <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input placeholder="Kota" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="moyang.birthDate" render={({ field }) => (
              <FormItem><FormLabel>Tgl Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <FormField control={form.control} name="moyang.nationality" render={({ field }) => (
            <FormItem><FormLabel>Kewarganegaraan</FormLabel><FormControl><Input placeholder="WNI" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="moyang.religion" render={({ field }) => (
            <FormItem><FormLabel>Agama</FormLabel><FormControl><Input placeholder="Agama" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="moyang.job" render={({ field }) => (
            <FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input placeholder="Contoh: Petani" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="moyang.address" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel>Alamat Domisili</FormLabel><FormControl><Textarea placeholder="Alamat lengkap sesuai KTP" {...field} disabled={isSubmitting} className="uppercase" /></FormControl><FormMessage /></FormItem>
          )} />
        </FormSection>

        <FormSection title="Data Anak Kandung" icon={User}>
          <FormField control={form.control} name="anak.nik" render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className="font-bold text-primary">NIK Anak</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input placeholder="3301xxxxxxxxxxxx" {...field} disabled={isSubmitting} maxLength={16} />
                  {isSearchingAnak && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-primary" />}
                </div>
              </FormControl>
              <FormDescription>Masukkan NIK Anak Kandung untuk pengisian otomatis.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="anak.name" render={({ field }) => (
            <FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="Nama Lengkap Anak" {...field} disabled={isSubmitting} className="uppercase" /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="anak.gender" render={({ field }) => (
            <FormItem><FormLabel>Jenis Kelamin</FormLabel><FormControl><Input placeholder="Laki-Laki / Perempuan" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="anak.birthPlace" render={({ field }) => (
              <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input placeholder="Kota" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="anak.birthDate" render={({ field }) => (
              <FormItem><FormLabel>Tgl Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <FormField control={form.control} name="anak.nationality" render={({ field }) => (
            <FormItem><FormLabel>Kewarganegaraan</FormLabel><FormControl><Input placeholder="WNI" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="anak.religion" render={({ field }) => (
            <FormItem><FormLabel>Agama</FormLabel><FormControl><Input placeholder="Agama" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="anak.job" render={({ field }) => (
            <FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input placeholder="Pekerjaan" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="anak.address" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel>Alamat Domisili</FormLabel><FormControl><Textarea placeholder="Alamat lengkap" {...field} disabled={isSubmitting} className="uppercase" /></FormControl><FormMessage /></FormItem>
          )} />
        </FormSection>

        <FormSection title="Unggah Berkas Lampiran" icon={UploadCloud}>
          <div className="col-span-1 md:col-span-2">
            <p className="text-sm text-muted-foreground italic">Unggah file format gambar (JPG, PNG) atau PDF. Berkas bertanda * wajib diisi.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <GoogleFileUploader label="Foto KTP Moyang" fieldName="ktpMoyang" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
            <GoogleFileUploader label="Foto KTP Anak" fieldName="ktpAnak" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
            <GoogleFileUploader label="Surat Pengantar KEPALA Kecamatan" fieldName="pengantarRt" onFileSelect={handleFileSelect} isRequired={false} disabled={isSubmitting} />
          </div>
        </FormSection>

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ajukan Surat Keterangan Moyang'}
        </Button>
      </form>
    </Form>
  );
}
