'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Users, User, MapPin, UploadCloud, FileCheck, Paperclip } from 'lucide-react';

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

const FormSection = ({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: React.ElementType }) => (
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
  name: z.string().min(1, 'Nama lengkap wajib diisi.'),
  kkNumber: z.string().min(1, 'Nomor KK wajib diisi.'),
  kkHead: z.string().min(1, 'Nama kepala keluarga wajib diisi.'),
  currentAddressRt: z.string().min(1, 'RT wajib diisi.'),
  currentAddressRw: z.string().min(1, 'RW wajib diisi.'),
  destinationAddress: z.string().min(1, 'Kecamatan tujuan wajib diisi.'),
  destinationAddressRt: z.string().min(1, 'RT tujuan wajib diisi.'),
  destinationAddressRw: z.string().min(1, 'RW tujuan wajib diisi.'),
  destinationKecamatan: z.string().min(1, 'Kecamatan tujuan wajib diisi.'),
  destinationKabupaten: z.string().min(1, 'Kabupaten/Kota tujuan wajib diisi.'),
  destinationProvinsi: z.string().min(1, 'Provinsi tujuan wajib diisi.'),
  familyCount: z.coerce.number().min(0, 'Jumlah keluarga minimal 0.'),
  familyMembers: z.array(z.object({
    nik: z.string().length(16, 'NIK harus 16 digit.'),
    name: z.string().min(1, 'Nama harus diisi.'),
    relationship: z.string().min(1, 'Hubungan harus diisi.'),
  })).optional(),
});

export function PindahForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingResident, setIsSearchingResident] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<Array<{ fieldName: string; file: File }>>([]);
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nik: '',
      name: '',
      kkNumber: '',
      kkHead: '',
      currentAddressRt: '',
      currentAddressRw: '',
      destinationAddress: '',
      destinationAddressRt: '',
      destinationAddressRw: '',
      destinationKecamatan: '',
      destinationKabupaten: '',
      destinationProvinsi: '',
      familyCount: 0,
      familyMembers: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "familyMembers",
  });

  const nikValue = form.watch('nik');
  const familyCount = form.watch('familyCount');

  useEffect(() => {
    const fetchResident = async () => {
      if (nikValue.length === 16 && firestore) {
        setIsSearchingResident(true);
        try {
          const resident = await getResidentByNik(firestore, nikValue);
          if (resident) {
            form.setValue('name', resident.fullName.toUpperCase());
            form.setValue('kkNumber', resident.noKk || '');
            if (resident.rt) form.setValue('currentAddressRt', resident.rt);
            if (resident.rw) form.setValue('currentAddressRw', resident.rw);
            toast({ title: "Data Pemohon Ditemukan" });
          }
        } finally {
          setIsSearchingResident(false);
        }
      }
    };
    fetchResident();
  }, [nikValue, firestore, form, toast]);

  useEffect(() => {
    const count = Math.max(0, familyCount || 0);
    const currentLength = fields.length;
    if (count > currentLength) {
      for (let i = currentLength; i < count; i++) {
        append({ nik: '', name: '', relationship: '' }, { shouldFocus: false });
      }
    } else if (count < currentLength) {
      for (let i = currentLength - 1; i >= count; i--) {
        remove(i);
      }
    }
  }, [familyCount, fields.length, append, remove]);

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
        letterType: 'Surat Pengantar Pindah',
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

  if (isSubmitted) return <SubmissionSuccess ticketNumber={ticketNumber} onReset={() => { form.reset(); setFilesToUpload([]); setIsSubmitted(false); }} />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
        <FormSection title="Data Pemohon" icon={User}>
          <FormField control={form.control} name="nik" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel className="font-bold text-primary">NIK Pemohon</FormLabel><FormControl><div className="relative"><Input placeholder="3301xxxxxxxxxxxx" {...field} disabled={isSubmitting} maxLength={16} className="h-12 rounded-xl" />{isSearchingResident && <Loader2 className="absolute right-4 top-3 h-6 w-6 animate-spin text-primary" />}</div></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="Sesuai KTP" {...field} disabled={isSubmitting} className="uppercase h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="kkNumber" render={({ field }) => (<FormItem><FormLabel>Nomor Kartu Keluarga</FormLabel><FormControl><Input placeholder="3301xxxxxxxxxxxxxxxx" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="kkHead" render={({ field }) => (<FormItem><FormLabel>Nama Kepala Keluarga</FormLabel><FormControl><Input placeholder="Sesuai KK" {...field} disabled={isSubmitting} className="uppercase h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
        </FormSection>

        <FormSection title="Alamat Asal" icon={MapPin}>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="currentAddressRt" render={({ field }) => (<FormItem><FormLabel>RT</FormLabel><FormControl><Input placeholder="001" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="currentAddressRw" render={({ field }) => (<FormItem><FormLabel>RW</FormLabel><FormControl><Input placeholder="001" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <FormItem><FormLabel>Kecamatan</FormLabel><FormControl><Input value="GANDRUNGMANGU" disabled className="h-12 rounded-xl bg-slate-50" /></FormControl></FormItem>
          <FormItem><FormLabel>Kecamatan</FormLabel><FormControl><Input value="GANDRUNGMANGU" disabled className="h-12 rounded-xl bg-slate-50" /></FormControl></FormItem>
          <FormItem><FormLabel>Kabupaten / Kota</FormLabel><FormControl><Input value="CILACAP" disabled className="h-12 rounded-xl bg-slate-50" /></FormControl></FormItem>
          <FormItem><FormLabel>Provinsi</FormLabel><FormControl><Input value="JAWA TENGAH" disabled className="h-12 rounded-xl bg-slate-50" /></FormControl></FormItem>
        </FormSection>

        <FormSection title="Alamat Tujuan Pindah" icon={MapPin}>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="destinationAddressRt" render={({ field }) => (<FormItem><FormLabel>RT</FormLabel><FormControl><Input placeholder="001" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="destinationAddressRw" render={({ field }) => (<FormItem><FormLabel>RW</FormLabel><FormControl><Input placeholder="001" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <FormField control={form.control} name="destinationAddress" render={({ field }) => (<FormItem><FormLabel>Kecamatan Tujuan</FormLabel><FormControl><Input placeholder="Kecamatan Tujuan" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="destinationKecamatan" render={({ field }) => (<FormItem><FormLabel>Kecamatan Tujuan</FormLabel><FormControl><Input placeholder="Kecamatan" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="destinationKabupaten" render={({ field }) => (<FormItem><FormLabel>Kabupaten / Kota Tujuan</FormLabel><FormControl><Input placeholder="Kabupaten" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="destinationProvinsi" render={({ field }) => (<FormItem><FormLabel>Provinsi Tujuan</FormLabel><FormControl><Input placeholder="Provinsi" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
        </FormSection>

        <div className="space-y-6 rounded-[2.5rem] border p-6 md:p-10 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b pb-4">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Keluarga Yang Pindah</h3>
          </div>
          <FormField control={form.control} name="familyCount" render={({ field }) => (
            <FormItem><FormLabel className="font-bold">Jumlah Keluarga Yang Ikut</FormLabel><FormControl><Input type="number" placeholder="0" {...field} disabled={isSubmitting} min={0} className="h-12 rounded-xl max-w-[200px]" /></FormControl><FormMessage /></FormItem>
          )} />

          {fields.length > 0 && (
            <div className="space-y-4 rounded-3xl border-2 border-dashed p-6 bg-slate-50/50">
              {fields.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-white border rounded-2xl shadow-sm relative pt-10">
                  <div className="absolute left-6 top-4 px-3 py-1 rounded-full bg-primary text-white font-black text-[9px] uppercase tracking-widest shadow-sm">Anggota {index + 1}</div>
                  <FormField control={form.control} name={`familyMembers.${index}.nik`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-400">NIK</FormLabel><FormControl><Input placeholder="16 digit" {...field} disabled={isSubmitting} maxLength={16} className="h-10 rounded-lg" /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name={`familyMembers.${index}.name`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-400">Nama Lengkap</FormLabel><FormControl><Input placeholder="Sesuai KK" {...field} disabled={isSubmitting} className="uppercase h-10 rounded-lg" /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name={`familyMembers.${index}.relationship`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-black text-slate-400">SHDK (Hubungan)</FormLabel><FormControl><Input placeholder="Contoh: Istri" {...field} disabled={isSubmitting} className="h-10 rounded-lg" /></FormControl><FormMessage /></FormItem>)} />
                </div>
              ))}
            </div>
          )}
        </div>

        <FormSection title="Unggah Berkas Lampiran" icon={UploadCloud}>
          <div className="col-span-1 md:col-span-2 space-y-6">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Unggah file format gambar (JPG, PNG) atau PDF. Berkas bertanda * wajib diisi.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
              <GoogleFileUploader label="Foto KTP Pemohon" fieldName="ktp" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
              <GoogleFileUploader label="Foto KK" fieldName="kk" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
              <GoogleFileUploader label="Surat Pengantar KEPALA Kecamatan" fieldName="pengantarRt" onFileSelect={handleFileSelect} isRequired={false} disabled={isSubmitting} />
            </div>
          </div>
        </FormSection>

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all active:scale-95">
          {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : 'Ajukan Surat Pindah'}
        </Button>
      </form>
    </Form>
  );
}
