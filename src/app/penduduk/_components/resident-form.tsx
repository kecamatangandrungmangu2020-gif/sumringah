'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, User, Home, FileSignature, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Resident } from '@/lib/types';
import { recalculateStatistics, cacheResident } from '@/lib/residents';


const formSchema = z.object({
  nik: z.string().length(16, 'NIK harus 16 digit.'),
  noKk: z.string().min(1, 'Nomor KK wajib diisi.'),
  fullName: z.string().min(1, 'Nama lengkap (NAMA_LGKP) wajib diisi.'),
  gender: z.string().min(1, 'Jenis Kelamin (JENIS_KLM) wajib diisi.'),
  dateOfBirth: z.string().min(1, 'Tanggal lahir (TGL_LAHIR) wajib diisi.'),
  age: z.string().min(1, 'Umur wajib diisi.'),
  placeOfBirth: z.string().min(1, 'Tempat lahir (TEMPAT_LAHIR) wajib diisi.'),
  address: z.string().min(1, 'Alamat wajib diisi.'),
  rt: z.string().min(1, 'RT (NO_RT) wajib diisi.'),
  rw: z.string().min(1, 'RW (NO_RW) wajib diisi.'),
  kelurahan: z.string().min(1, 'Kelurahan wajib diisi.'),
  relationshipToHeadOfFamily: z.string().min(1, 'SHDK wajib diisi.'),
  maritalStatus: z.string().min(1, 'Status perkawinan (STATUS_KAWIN) wajib diisi.'),
  educationLevel: z.string().min(1, 'Pendidikan wajib diisi.'),
  religion: z.string().min(1, 'Agama wajib diisi.'),
  occupation: z.string().min(1, 'Pekerjaan wajib diisi.'),
  bloodType: z.string().min(1, 'Golongan darah wajib diisi.'),
  hasBirthCertificate: z.string().min(1, 'Status akta lahir (AKTA_LAHIR) wajib diisi.'),
  birthCertificateNumber: z.string().min(1, 'Nomor akta lahir (NO_AKTA_LAHIR) wajib diisi.'),
  hasMarriageCertificate: z.string().min(1, 'Status akta kawin (AKTA_KAWIN) wajib diisi.'),
  marriageCertificateNumber: z.string().min(1, 'Nomor akta kawin (NO_AKTA_KAWIN) wajib diisi.'),
  hasDivorceCertificate: z.string().min(1, 'Status akta cerai (AKTA_CERAI) wajib diisi.'),
  divorceCertificateNumber: z.string().min(1, 'Nomor akta cerai (NO_AKTA_CERAI) wajib diisi.'),
  fatherName: z.string().min(1, 'Nama ayah wajib diisi.'),
  motherName: z.string().min(1, 'Nama ibu wajib diisi.'),
});

interface ResidentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resident?: Resident | null;
}

export function ResidentForm({ open, onOpenChange, resident }: ResidentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nik: '',
      noKk: '',
      fullName: '',
      gender: '',
      dateOfBirth: '',
      age: '',
      placeOfBirth: '',
      address: '',
      rt: '',
      rw: '',
      kelurahan: 'GANDRUNGMANGU',
      relationshipToHeadOfFamily: '',
      maritalStatus: '',
      educationLevel: '',
      religion: '',
      occupation: '',
      bloodType: '',
      hasBirthCertificate: '',
      birthCertificateNumber: '',
      hasMarriageCertificate: '',
      marriageCertificateNumber: '',
      hasDivorceCertificate: '',
      divorceCertificateNumber: '',
      fatherName: '',
      motherName: '',
    },
  });

  useEffect(() => {
    if (resident) {
      form.reset({
        nik: resident.nik || '',
        noKk: resident.noKk || '',
        fullName: resident.fullName || '',
        gender: resident.gender || '',
        dateOfBirth: resident.dateOfBirth || '',
        age: resident.age || '',
        placeOfBirth: resident.placeOfBirth || '',
        address: resident.address || '',
        rt: resident.rt || '',
        rw: resident.rw || '',
        kelurahan: resident.kelurahan || '',
        relationshipToHeadOfFamily: resident.relationshipToHeadOfFamily || '',
        maritalStatus: resident.maritalStatus || '',
        educationLevel: resident.educationLevel || '',
        religion: resident.religion || '',
        occupation: resident.occupation || '',
        bloodType: resident.bloodType || '',
        hasBirthCertificate: resident.hasBirthCertificate || '',
        birthCertificateNumber: resident.birthCertificateNumber || '',
        hasMarriageCertificate: resident.hasMarriageCertificate || '',
        marriageCertificateNumber: resident.marriageCertificateNumber || '',
        hasDivorceCertificate: resident.hasDivorceCertificate || '',
        divorceCertificateNumber: resident.divorceCertificateNumber || '',
        fatherName: resident.fatherName || '',
        motherName: resident.motherName || '',
      });
    } else if (open) {
      form.reset({
        nik: '',
        noKk: '',
        fullName: '',
        gender: '',
        dateOfBirth: '',
        age: '',
        placeOfBirth: '',
        address: '',
        rt: '',
        rw: '',
        kelurahan: 'GANDRUNGMANGU',
        relationshipToHeadOfFamily: '',
        maritalStatus: '',
        educationLevel: '',
        religion: '',
        occupation: '',
        bloodType: '',
        hasBirthCertificate: 'TIDAK',
        birthCertificateNumber: '-',
        hasMarriageCertificate: 'TIDAK',
        marriageCertificateNumber: '-',
        hasDivorceCertificate: 'TIDAK',
        divorceCertificateNumber: '-',
        fatherName: '',
        motherName: '',
      });
    }
  }, [resident, form, open]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const docRef = doc(firestore, 'residents', values.nik);

      await setDoc(docRef, {
        ...values,
        fullName: values.fullName.toUpperCase(),
        updatedAt: serverTimestamp(),
        ...(resident ? {} : { createdAt: serverTimestamp() })
      }, { merge: true });

      cacheResident(values as any);


      // Update cached demographic statistics document
      await recalculateStatistics(firestore);

      toast({ title: resident ? "Data Diperbarui" : "Data Ditambahkan" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[95vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0 border-b">
          <DialogTitle>{resident ? 'Edit Data Penduduk' : 'Tambah Penduduk Baru'}</DialogTitle>
          <DialogDescription>Seluruh 25 data kependudukan wajib diisi sesuai format resmi.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            {/* Area Form yang dapat digulir dengan Keyboard Support */}
            <div
              className="flex-1 overflow-y-auto px-6 py-4 outline-none"
              tabIndex={0}
            >
              <div className="space-y-8 pb-8">
                {/* IDENTITAS POKOK */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm border-b pb-1">
                    <User className="h-4 w-4" /> IDENTITAS UTAMA
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="nik" render={({ field }) => (
                      <FormItem><FormLabel>NIK</FormLabel><FormControl><Input {...field} disabled={!!resident} maxLength={16} placeholder="16 digit NIK" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="noKk" render={({ field }) => (
                      <FormItem><FormLabel>Nomor KK (NO_KK)</FormLabel><FormControl><Input {...field} maxLength={16} placeholder="16 digit No. KK" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem className="md:col-span-2"><FormLabel>Nama Lengkap (NAMA_LGKP)</FormLabel><FormControl><Input className="uppercase" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem><FormLabel>Jenis Kelamin (JENIS_KLM)</FormLabel><FormControl><Input placeholder="Contoh: Laki-laki / Perempuan" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                        <FormItem><FormLabel>Tgl Lahir (TGL_LAHIR)</FormLabel><FormControl><Input {...field} placeholder="DD-MM-YYYY" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="age" render={({ field }) => (
                        <FormItem><FormLabel>Umur</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="placeOfBirth" render={({ field }) => (
                      <FormItem><FormLabel>Tempat Lahir (TEMPAT_LAHIR)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="bloodType" render={({ field }) => (
                      <FormItem><FormLabel>Golongan Darah (GOLONGAN_DARAH)</FormLabel><FormControl><Input placeholder="Contoh: A / B / AB / O" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>

                {/* DOMISILI & STATUS SOSIAL */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm border-b pb-1">
                    <Home className="h-4 w-4" /> DOMISILI, AGAMA & PENDIDIKAN
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem className="md:col-span-2"><FormLabel>Alamat (Dusun/jalan)</FormLabel><FormControl><Textarea {...field} className="uppercase" placeholder="Nama Jalan atau Dusun" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={form.control} name="rt" render={({ field }) => (
                        <FormItem><FormLabel>RT (NO_RT)</FormLabel><FormControl><Input {...field} placeholder="001" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="rw" render={({ field }) => (
                        <FormItem><FormLabel>RW (NO_RW)</FormLabel><FormControl><Input {...field} placeholder="001" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="kelurahan" render={({ field }) => (
                      <FormItem><FormLabel>Kelurahan (KELURAHAN)</FormLabel><FormControl><Input {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="religion" render={({ field }) => (
                      <FormItem><FormLabel>Agama (AGAMA)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="educationLevel" render={({ field }) => (
                      <FormItem><FormLabel>Pendidikan (PENDIDIKAN)</FormLabel><FormControl><Input placeholder="Contoh: SLTA / SEDERAJAT" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="occupation" render={({ field }) => (
                      <FormItem><FormLabel>Pekerjaan (PEKERJAAN)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="relationshipToHeadOfFamily" render={({ field }) => (
                      <FormItem><FormLabel>SHDK (Hubungan Keluarga)</FormLabel><FormControl><Input placeholder="Contoh: KEPALA KELUARGA" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                      <FormItem><FormLabel>Status Kawin (STATUS_KAWIN)</FormLabel><FormControl><Input placeholder="Contoh: KAWIN / BELUM KAWIN" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>

                {/* DOKUMEN & KELUARGA */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm border-b pb-1">
                    <FileSignature className="h-4 w-4" /> DOKUMEN AKTA & ORANG TUA
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={form.control} name="hasBirthCertificate" render={({ field }) => (
                        <FormItem><FormLabel>Akta Lahir (AKTA_LAHIR)</FormLabel><FormControl><Input placeholder="ADA / TIDAK" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="birthCertificateNumber" render={({ field }) => (
                        <FormItem><FormLabel>No. Akta Lahir</FormLabel><FormControl><Input {...field} placeholder="Isi - jika tidak ada" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={form.control} name="hasMarriageCertificate" render={({ field }) => (
                        <FormItem><FormLabel>Akta Kawin (AKTA_KAWIN)</FormLabel><FormControl><Input placeholder="ADA / TIDAK" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="marriageCertificateNumber" render={({ field }) => (
                        <FormItem><FormLabel>No. Akta Kawin</FormLabel><FormControl><Input {...field} placeholder="Isi - jika tidak ada" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={form.control} name="hasDivorceCertificate" render={({ field }) => (
                        <FormItem><FormLabel>Akta Cerai (AKTA_CERAI)</FormLabel><FormControl><Input placeholder="ADA / TIDAK" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="divorceCertificateNumber" render={({ field }) => (
                        <FormItem><FormLabel>No. Akta Cerai</FormLabel><FormControl><Input {...field} placeholder="Isi - jika tidak ada" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="space-y-4 md:col-span-2 pt-2">
                      <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs uppercase">
                        <Users className="h-3 w-3" /> Data Orang Tua
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="fatherName" render={({ field }) => (
                          <FormItem><FormLabel>Nama Ayah (NAMA_AYAH)</FormLabel><FormControl><Input className="uppercase" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="motherName" render={({ field }) => (
                          <FormItem><FormLabel>Nama Ibu (NAMA_IBU)</FormLabel><FormControl><Input className="uppercase" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 bg-muted/20 border-t shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 animate-spin h-4 w-4" />}
                {resident ? 'Simpan Perubahan' : 'Tambah Penduduk'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
