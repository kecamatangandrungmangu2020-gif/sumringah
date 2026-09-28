'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, User, UploadCloud, FileCheck, Paperclip } from 'lucide-react';

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

const formSchema = z.object({
  nik: z.string().length(16, 'NIK harus 16 digit.'),
  name: z.string().min(1, 'Nama lengkap wajib diisi.'),
  gender: z.string().min(1, 'Jenis kelamin wajib diisi.'),
  birthPlace: z.string().min(1, 'Tempat lahir wajib diisi.'),
  birthDate: z.string().min(1, 'Tanggal lahir wajib diisi.'),
  job: z.string().min(1, 'Pekerjaan wajib diisi.'),
  purpose: z.string().min(1, 'Keperluan wajib diisi.'),
  address: z.string().min(1, 'Alamat wajib diisi.'),
});

export function PengantarUmumForm({ isAdmin = false }: { isAdmin?: boolean }) {
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
      name: '',
      gender: '',
      birthPlace: '',
      birthDate: '',
      job: '',
      purpose: '',
      address: '',
    },
  });

  const nikValue = form.watch('nik');

  useEffect(() => {
    const fetchResident = async () => {
      if (nikValue?.length === 16 && firestore) {
        setIsSearching(true);
        try {
          const resident = await getResidentByNik(firestore, nikValue);
          if (resident) {
            form.setValue('name', resident.fullName.toUpperCase());
            form.setValue('gender', resident.gender);
            form.setValue('birthPlace', resident.placeOfBirth);
            form.setValue('birthDate', formatDbDateToForm(resident.dateOfBirth));
            form.setValue('job', resident.occupation);
            const fullAddress = `${resident.address}, RT ${resident.rt} RW ${resident.rw}, ${resident.kelurahan}, kec. Gandrungmangu, Kab. Cilacap`.toUpperCase();
            form.setValue('address', fullAddress);
            toast({ title: "Data Ditemukan" });
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
      if (!filesToUpload.some(f => f.fieldName === 'ktp')) {
        toast({ title: "Berkas Belum Lengkap", description: "Mohon unggah foto KTP Anda.", variant: "destructive" });
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
            targetFileName: `${fileData.fieldName}_${values.nik}`,
            fieldName: fileData.fieldName,
          };
        })
      );

      await addSubmission(firestore, {
        ticketNumber: newTicketNumber,
        requesterName: values.name,
        nik: values.nik,
        letterType: 'Surat Pengantar Umum',
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6 rounded-md border p-4 md:p-6 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b pb-2">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Data Identitas Pemohon</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="nik" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="font-bold text-primary">NIK (16 Digit)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input placeholder="3301xxxxxxxxxxxx" {...field} disabled={isSubmitting} maxLength={16} />
                    {isSearching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-primary" />}
                  </div>
                </FormControl>
                <FormDescription>Gunakan NIK untuk memuat data otomatis.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input className="uppercase" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="gender" render={({ field }) => (
              <FormItem><FormLabel>Jenis Kelamin</FormLabel><FormControl><Input placeholder="Laki-Laki / Perempuan" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="birthPlace" render={({ field }) => (
                <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="birthDate" render={({ field }) => (
                <FormItem><FormLabel>Tgl Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="job" render={({ field }) => (
              <FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="purpose" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="font-bold text-primary">Keperluan Surat</FormLabel>
                <FormControl><Input placeholder="Contoh: Pengurusan Jamsostek / Persyaratan Kerja" {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>Alamat Lengkap Sesuai KTP</FormLabel><FormControl><Textarea {...field} className="uppercase" disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </div>

        <div className="space-y-6 rounded-md border p-4 md:p-6 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b pb-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Unggah Dokumen Persyaratan</h3>
          </div>
          <FormDescription>Unggah file dalam format gambar (JPG, PNG) atau PDF, maks 2MB. Berkas dengan tanda * wajib diisi.</FormDescription>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <GoogleFileUploader label="Foto KTP" fieldName="ktp" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
            <GoogleFileUploader label="Foto KK" fieldName="kk" onFileSelect={handleFileSelect} disabled={isSubmitting} />
            <GoogleFileUploader label="Surat Pengantar KEPALA Kecamatan" fieldName="pengantarRt" onFileSelect={handleFileSelect} isRequired={false} disabled={isSubmitting} />
          </div>
        </div>

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ajukan Surat Pengantar Umum'}
        </Button>
      </form>
    </Form>
  );
}
