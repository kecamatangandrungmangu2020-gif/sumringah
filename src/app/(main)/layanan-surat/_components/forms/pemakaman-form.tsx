'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Skull, Paperclip, FileCheck } from 'lucide-react';
import { UploadedFile } from '@/lib/types';

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

// Placeholder for Google Drive Uploader
interface GoogleFileUploaderProps {
  label: string;
  onUploadSuccess: (file: { fieldName: string; fileId: string; fileName: string }) => void;
  fieldName: string;
  isRequired?: boolean;
}

function GoogleFileUploader({ label, onUploadSuccess, fieldName, isRequired }: GoogleFileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);

    await new Promise(resolve => setTimeout(resolve, 1500));
    const mockFileId = `mock_gdrive_${Date.now()}`;

    toast({ title: `Unggah ${label} Berhasil`, description: `File ${file.name} telah diunggah.` });
    onUploadSuccess({ fieldName, fileId: mockFileId, fileName: file.name });
    setIsUploading(false);
  };

  return (
    <FormItem>
      <FormLabel className={cn(isRequired && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
        {label}
      </FormLabel>
      <FormControl>
        <div className="relative">
          <Input type="file" onChange={handleFileChange} disabled={isUploading || !!fileName} className="pr-10" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
            {isUploading ? <Loader2 className="animate-spin text-primary" /> :
              fileName ? <FileCheck className="text-green-600" /> : <Paperclip className="text-muted-foreground" />}
          </div>
        </div>
      </FormControl>
      {fileName && <p className="text-xs text-muted-foreground mt-1">File: {fileName}</p>}
      <FormMessage />
    </FormItem>
  );
}

const FormSection = ({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) => (
  <div className="space-y-6 rounded-md border p-4 md:p-6 bg-white shadow-sm">
    <div className="flex items-center gap-2 border-b pb-2">

      {Icon && <Icon className="h-5 w-5 text-primary" />}
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
  </div>
);

const formSchema = z.object({
  nik: z.string().length(16, 'NIK harus 16 digit.'),
  name: z.string().min(1, 'Nama wajib diisi.'),
  birthPlace: z.string().min(1, 'Tempat lahir wajib diisi.'),
  birthDate: z.string().min(1, 'Tanggal lahir wajib diisi.'),
  religion: z.string().min(1, 'Agama wajib diisi.'),
  gender: z.string().min(1, 'Jenis kelamin wajib diisi.'),
  maritalStatus: z.string().min(1, 'Status perkawinan wajib diisi.'),
  job: z.string().min(1, 'Pekerjaan wajib diisi.'),
  nationality: z.string().min(1, 'Kewarganegaraan wajib diisi.'),
  address: z.string().min(1, 'Alamat wajib diisi.'),

  deathDate: z.date({ required_error: 'Tanggal kematian wajib diisi.' }),
  deathTime: z.string().min(1, 'Jam kematian wajib diisi.'),
  deathLocation: z.string().min(1, 'Tempat kematian wajib diisi.'),
  deathCause: z.string().min(1, 'Sebab kematian wajib diisi.'),
  burialLocation: z.string().min(1, 'Lokasi pemakaman wajib diisi.'),
});

export function PemakamanForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [fileLinks, setFileLinks] = useState<UploadedFile[]>([]);

  const { firestore } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nik: '',
      name: '',
      birthPlace: '',
      birthDate: '',
      religion: '',
      gender: '',
      maritalStatus: '',
      job: '',
      nationality: 'WNI',
      address: '',
      deathTime: '09.00 WIB',
      deathLocation: '',
      deathCause: '',
      burialLocation: '',
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
            form.setValue('religion', resident.religion);
            form.setValue('job', resident.occupation);
            form.setValue('maritalStatus', resident.maritalStatus);

            const fullAddress = `${resident.address}, RT ${resident.rt} RW ${resident.rw}, ${resident.kelurahan}, kec. Gandrungmangu, Kab. Cilacap`.toUpperCase();
            form.setValue('address', fullAddress);

            toast({ title: "Data Almarhum Ditemukan", description: "Data identitas telah diisi otomatis." });
          }
        } catch (error: any) {
          console.error("Auto-fill error:", error);
        } finally {
          setIsSearching(false);
        }
      }
    };
    fetchResident();
  }, [nikValue, firestore, form, toast]);

  const handleUploadSuccess = (uploadedFile: { fieldName: string; fileId: string; fileName: string }) => {
    setFileLinks(prev => [...prev, uploadedFile]);
  };

  const generateTicketNumber = () => {
    return Math.random().toString().substring(2, 8);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;

    if (!isAdmin) {
      if (!fileLinks.some(f => f.fieldName === 'ktp')) {
        toast({ title: "Berkas Belum Lengkap", description: "Mohon unggah KTP Almarhum.", variant: "destructive" });
        return;
      }
      if (!fileLinks.some(f => f.fieldName === 'kk')) {
        toast({ title: "Berkas Belum Lengkap", description: "Mohon unggah Kartu Keluarga.", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const newTicketNumber = generateTicketNumber();
      await addSubmission(firestore, {
        ticketNumber: newTicketNumber,
        requesterName: values.name,
        nik: values.nik,
        letterType: 'Surat Keterangan Pemakaman',
        formData: values,
        fileLinks: fileLinks,
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

  const handleReset = () => {
    form.reset();
    setIsSubmitted(false);
    setTicketNumber('');
    setFileLinks([]);
  };

  if (isSubmitted) {
    return <SubmissionSuccess ticketNumber={ticketNumber} onReset={handleReset} />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormSection title="Identitas Almarhum/Almarhumah" icon={Skull}>
          <FormField control={form.control} name="nik" render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className="font-bold text-primary">NIK Almarhum/ah</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input placeholder="3301xxxxxxxxxxxx" {...field} disabled={isSubmitting} maxLength={16} />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>Masukkan NIK untuk pengisian otomatis data jenazah.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Lengkap</FormLabel>
              <FormControl><Input {...field} disabled={isSubmitting} className="uppercase" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="gender" render={({ field }) => (
            <FormItem>
              <FormLabel>Jenis Kelamin</FormLabel>
              <FormControl><Input placeholder="Laki-Laki / Perempuan" {...field} disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="birthPlace" render={({ field }) => (
              <FormItem>
                <FormLabel>Tempat Lahir</FormLabel>
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="birthDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Tgl Lahir</FormLabel>
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="religion" render={({ field }) => (
            <FormItem>
              <FormLabel>Agama</FormLabel>
              <FormControl><Input placeholder="Agama" {...field} disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="maritalStatus" render={({ field }) => (
            <FormItem>
              <FormLabel>Status Perkawinan</FormLabel>
              <FormControl><Input placeholder="KAWIN / BELUM KAWIN" {...field} disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="nationality" render={({ field }) => (
            <FormItem>
              <FormLabel>Kewarganegaraan</FormLabel>
              <FormControl><Input placeholder="WNI" {...field} disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="job" render={({ field }) => (
            <FormItem>
              <FormLabel>Pekerjaan</FormLabel>
              <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Alamat Lengkap</FormLabel>
              <FormControl><Textarea {...field} disabled={isSubmitting} className="uppercase" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </FormSection>

        <FormSection title="Kejadian Meninggal Dunia">
          <FormField control={form.control} name="deathDate" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Hari / Tanggal Kematian</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')} disabled={isSubmitting}>
                      {field.value ? format(field.value, 'PPP') : <span>Pilih tanggal</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="deathTime" render={({ field }) => (
            <FormItem>
              <FormLabel>Jam Kematian</FormLabel>
              <FormControl><Input placeholder="Contoh: 09.00 WIB" {...field} disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="deathLocation" render={({ field }) => (
            <FormItem>
              <FormLabel>Tempat Kematian</FormLabel>
              <FormControl><Input placeholder="Rumah / Rumah Sakit" {...field} disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="deathCause" render={({ field }) => (
            <FormItem>
              <FormLabel>Sebab Kematian</FormLabel>
              <FormControl><Input placeholder="Contoh: Sakit / Tua" {...field} disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="burialLocation" render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Dimakamkan di (Lokasi Pemakaman)</FormLabel>
              <FormControl><Textarea placeholder="Contoh: Makam Umum Dusun ... RT ... RW ... Kecamatan Gandrungmangu" {...field} disabled={isSubmitting} /></FormControl>
              <FormDescription>Isi detail lokasi pemakaman secara lengkap.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </FormSection>

        <FormSection title="Unggah Berkas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <GoogleFileUploader label="KTP Almarhum" fieldName="ktp" onUploadSuccess={handleUploadSuccess} isRequired={!isAdmin} />
            <GoogleFileUploader label="Kartu Keluarga" fieldName="kk" onUploadSuccess={handleUploadSuccess} isRequired={!isAdmin} />
          </div>
        </FormSection>

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ajukan Surat'}
        </Button>
      </form>
    </Form>
  );
}
