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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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

const FormSection = ({ title, children, icon: Icon }: { title?: string; children: React.ReactNode; icon?: any }) => (
  <div className="space-y-6 rounded-[2rem] border p-6 md:p-10 bg-white shadow-sm">
    {title && (
      <div className="flex items-center gap-3 border-b pb-4">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">{title}</h3>
      </div>
    )}
    {children}
  </div>
);

const formSchema = z.object({
  submissionType: z.enum(['self', 'child'], {
    required_error: 'Pilih jenis pengajuan.',
  }),
  purpose: z.string().min(1, 'Keperluan wajib diisi.'),
  applicantNik: z.string().length(16, 'NIK harus 16 digit.'),
  applicantName: z.string().min(1, 'Nama pemohon wajib diisi.'),
  applicantGender: z.string().min(1, 'Jenis kelamin wajib diisi.'),
  applicantBirthPlace: z.string().min(1, 'Tempat lahir wajib diisi.'),
  applicantBirthDate: z.string().min(1, 'Tanggal lahir wajib diisi.'),
  applicantReligion: z.string().min(1, 'Agama wajib diisi.'),
  applicantJob: z.string().min(1, 'Pekerjaan wajib diisi.'),
  applicantAddress: z.string().min(1, 'Alamat wajib diisi.'),
  childNik: z.string().optional(),
  childName: z.string().optional(),
  childGender: z.string().optional(),
  childBirthPlace: z.string().optional(),
  childBirthDate: z.string().optional(),
  childReligion: z.string().optional(),
  childJob: z.string().optional(),
  childAddress: z.string().optional(),
}).refine(data => {
  if (data.submissionType === 'child') {
    return !!data.childName && !!data.childNik && data.childNik.length === 16;
  }
  return true;
}, {
  message: "Data anak (termasuk NIK 16 digit) wajib diisi jika mengajukan untuk anak.",
  path: ["childName"],
});

export function SktmForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingResident, setIsSearchingResident] = useState(false);
  const [isSearchingChild, setIsSearchingChild] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<Array<{ fieldName: string; file: File }>>([]);

  const { firestore } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      submissionType: 'child',
      purpose: '',
      applicantNik: '',
      applicantName: '',
      applicantGender: '',
      applicantBirthPlace: '',
      applicantBirthDate: '',
      applicantReligion: '',
      applicantJob: '',
      applicantAddress: '',
      childNik: '',
      childName: '',
      childGender: '',
      childBirthPlace: '',
      childBirthDate: '',
      childReligion: '',
      childJob: '',
      childAddress: '',
    },
  });

  const submissionType = form.watch('submissionType');
  const applicantNikValue = form.watch('applicantNik');
  const childNikValue = form.watch('childNik');

  useEffect(() => {
    const fetchResident = async () => {
      if (applicantNikValue?.length === 16 && firestore) {
        setIsSearchingResident(true);
        try {
          const resident = await getResidentByNik(firestore, applicantNikValue);
          if (resident) {
            form.setValue('applicantName', resident.fullName.toUpperCase());
            form.setValue('applicantGender', resident.gender);
            form.setValue('applicantBirthPlace', resident.placeOfBirth);
            form.setValue('applicantBirthDate', formatDbDateToForm(resident.dateOfBirth));
            form.setValue('applicantReligion', resident.religion);
            form.setValue('applicantJob', resident.occupation);
            const fullAddress = `${resident.address}, RT ${resident.rt} RW ${resident.rw}, ${resident.kelurahan}, kec. Gandrungmangu, Kab. Cilacap`.toUpperCase();
            form.setValue('applicantAddress', fullAddress);
            toast({ title: "Data Pemohon Ditemukan" });
          }
        } finally {
          setIsSearchingResident(false);
        }
      }
    };
    fetchResident();
  }, [applicantNikValue, firestore, form, toast]);

  useEffect(() => {
    const fetchChild = async () => {
      if (submissionType === 'child' && childNikValue?.length === 16 && firestore) {
        setIsSearchingChild(true);
        try {
          const resident = await getResidentByNik(firestore, childNikValue);
          if (resident) {
            form.setValue('childName', resident.fullName.toUpperCase());
            form.setValue('childGender', resident.gender);
            form.setValue('childBirthPlace', resident.placeOfBirth);
            form.setValue('childBirthDate', formatDbDateToForm(resident.dateOfBirth));
            form.setValue('childReligion', resident.religion);
            form.setValue('childJob', resident.occupation);
            const fullAddress = `${resident.address}, RT ${resident.rt} RW ${resident.rw}, ${resident.kelurahan}, kec. Gandrungmangu, Kab. Cilacap`.toUpperCase();
            form.setValue('childAddress', fullAddress);
            toast({ title: "Data Anak Ditemukan" });
          }
        } finally {
          setIsSearchingChild(false);
        }
      }
    };
    fetchChild();
  }, [childNikValue, firestore, form, toast, submissionType]);

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
        toast({ title: "Berkas Belum Lengkap", description: "Mohon unggah foto KTP dan KK Pemohon.", variant: "destructive" });
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
            targetFileName: `${fileData.fieldName}_${values.applicantNik}`,
            fieldName: fileData.fieldName,
          };
        })
      );

      await addSubmission(firestore, {
        ticketNumber: newTicketNumber,
        requesterName: values.applicantName,
        nik: values.applicantNik,
        letterType: 'Surat Keterangan Tidak Mampu',
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
        <div className="p-8 md:p-12 border-2 border-primary/10 rounded-[3rem] bg-emerald-50/30 space-y-8 shadow-sm">
          <FormField
            control={form.control}
            name="submissionType"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="text-lg font-black uppercase tracking-tight text-primary italic">Jenis Pengajuan</FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col sm:flex-row gap-6">
                    <div className="flex items-center space-x-3 bg-white px-6 py-4 rounded-2xl border-2 border-emerald-100 shadow-sm has-[:checked]:border-primary transition-all">
                      <RadioGroupItem value="self" id="self" />
                      <Label htmlFor="self" className="font-bold text-slate-700 cursor-pointer">Yang Bersangkutan</Label>
                    </div>
                    <div className="flex items-center space-x-3 bg-white px-6 py-4 rounded-2xl border-2 border-emerald-100 shadow-sm has-[:checked]:border-primary transition-all">
                      <RadioGroupItem value="child" id="child" />
                      <Label htmlFor="child" className="font-bold text-slate-700 cursor-pointer">Orang Tua / Wali (Anak)</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField control={form.control} name="purpose" render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black text-[10px] uppercase tracking-widest text-slate-400">Keperluan Surat</FormLabel>
                <FormControl><Input placeholder="Contoh: Keringanan Biaya Sekolah" {...field} disabled={isSubmitting} className="h-14 rounded-2xl border-slate-100 shadow-sm" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="applicantNik" render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black text-[10px] uppercase tracking-widest text-slate-400">NIK Pemohon {submissionType === 'child' ? '(Wali)' : ''}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input placeholder="3301xxxxxxxxxxxx" {...field} disabled={isSubmitting} maxLength={16} className="h-14 rounded-2xl border-slate-100 shadow-sm" />
                    {isSearchingResident && <Loader2 className="absolute right-4 top-4 h-6 w-6 animate-spin text-primary" />}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <FormSection title={submissionType === 'child' ? "Data Orang Tua / Wali" : "Data Pemohon"} icon={User}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="applicantName" render={({ field }) => (<FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="Sesuai KTP" {...field} disabled={isSubmitting} className="uppercase h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="applicantGender" render={({ field }) => (<FormItem><FormLabel>Jenis Kelamin</FormLabel><FormControl><Input placeholder="Contoh: Laki-Laki" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="applicantBirthPlace" render={({ field }) => (<FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input placeholder="Cilacap" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="applicantBirthDate" render={({ field }) => (<FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="applicantReligion" render={({ field }) => (<FormItem><FormLabel>Agama</FormLabel><FormControl><Input placeholder="Agama" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="applicantJob" render={({ field }) => (<FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input placeholder="Pekerjaan" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="applicantAddress" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Alamat Lengkap Sesuai KTP</FormLabel><FormControl><Textarea placeholder="Alamat lengkap" {...field} disabled={isSubmitting} className="uppercase rounded-2xl" /></FormControl><FormMessage /></FormItem>)} />
          </div>
        </FormSection>

        {submissionType === 'child' && (
          <FormSection title="Data Anak" icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="childNik" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>NIK Anak</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="3301xxxxxxxxxxxx" {...field} disabled={isSubmitting} maxLength={16} className="h-12 rounded-xl" />
                      {isSearchingChild && <Loader2 className="absolute right-4 top-3 h-6 w-6 animate-spin text-primary" />}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="childName" render={({ field }) => (<FormItem><FormLabel>Nama Anak</FormLabel><FormControl><Input placeholder="Nama Lengkap Anak" {...field} disabled={isSubmitting} className="uppercase h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="childGender" render={({ field }) => (<FormItem><FormLabel>Jenis Kelamin</FormLabel><FormControl><Input placeholder="Jenis Kelamin" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="childBirthPlace" render={({ field }) => (<FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input placeholder="Cilacap" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="childBirthDate" render={({ field }) => (<FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input placeholder="DD-MM-YYYY" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="childReligion" render={({ field }) => (<FormItem><FormLabel>Agama</FormLabel><FormControl><Input placeholder="Agama" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="childJob" render={({ field }) => (<FormItem><FormLabel>Pekerjaan/Status</FormLabel><FormControl><Input placeholder="Status" {...field} disabled={isSubmitting} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="childAddress" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Alamat Anak</FormLabel><FormControl><Textarea placeholder="Alamat lengkap" {...field} disabled={isSubmitting} className="uppercase rounded-2xl" /></FormControl><FormMessage /></FormItem>)} />
            </div>
          </FormSection>
        )}

        <FormSection title="Unggah Berkas Lampiran" icon={UploadCloud}>
          <div className="space-y-6">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Unggah file format gambar (JPG, PNG) atau PDF. Berkas bertanda * wajib diisi.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <GoogleFileUploader label="Foto KTP Pemohon" fieldName="ktp" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
              <GoogleFileUploader label="Foto KK" fieldName="kk" onFileSelect={handleFileSelect} isRequired={!isAdmin} disabled={isSubmitting} />
              <GoogleFileUploader label="Surat Pengantar KEPALA Kecamatan" fieldName="pengantarRt" onFileSelect={handleFileSelect} isRequired={false} disabled={isSubmitting} />
            </div>
          </div>
        </FormSection>

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all active:scale-95">
          {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : 'Ajukan Surat Keterangan'}
        </Button>
      </form>
    </Form>
  );
}
