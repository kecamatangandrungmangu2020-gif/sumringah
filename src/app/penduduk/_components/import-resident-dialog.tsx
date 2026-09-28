'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle2, Save, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useFirestore } from '@/firebase';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { recalculateStatistics, cacheResident } from '@/lib/residents';


interface ImportResidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportResidentDialog({ open, onOpenChange }: ImportResidentDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setImportCount(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({ title: "Peringatan", description: "Silakan pilih file terlebih dahulu.", variant: "destructive" });
      return;
    }

    if (!firestore) {
      toast({ title: "Database Error", description: "Koneksi database belum siap.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[];

        if (json.length === 0) throw new Error("File Excel kosong.");

        const findValue = (row: any, aliases: string[]) => {
          const keys = Object.keys(row);
          const match = keys.find(k =>
            aliases.some(alias => k.toLowerCase().trim().replace(/[\W_]+/g, "") === alias.toLowerCase().trim().replace(/[\W_]+/g, ""))
          );
          return match ? String(row[match]).trim() : '';
        };

        let count = 0;
        const chunks = [];
        for (let i = 0; i < json.length; i += 500) chunks.push(json.slice(i, i + 500));

        for (const chunk of chunks) {
          const batch = writeBatch(firestore);
          chunk.forEach((row) => {
            const nik = findValue(row, ['NIK', 'NomorInduk', 'NO_INDUK']);
            const fullName = findValue(row, ['NAMA_LGKP', 'NamaLengkap', 'NAMA']);

            if (nik && fullName && nik.length === 16) {
              const docRef = doc(firestore, 'residents', nik);

              // We save the RAW values directly from the spreadsheet
              // No sanitation against predefined options to match user request
              const residentData = {
                nik,
                noKk: findValue(row, ['NO_KK', 'NomorKK']),
                fullName: fullName.toUpperCase(),
                gender: findValue(row, ['JENIS_KLM', 'JK', 'Gender', 'JENISKELAMIN']),
                dateOfBirth: findValue(row, ['TGL_LAHIR', 'TanggalLahir']),
                age: findValue(row, ['UMUR']),
                placeOfBirth: findValue(row, ['TEMPAT_LAHIR', 'TempatLahir']),
                address: findValue(row, ['ALAMAT']),
                rt: findValue(row, ['NO_RT', 'RT']),
                rw: findValue(row, ['NO_RW', 'RW']),
                kelurahan: findValue(row, ['KELURAHAN', 'Kecamatan']),
                relationshipToHeadOfFamily: findValue(row, ['SHDK', 'HUBUNGAN']),
                maritalStatus: findValue(row, ['STATUS_KAWIN', 'STATUS']),
                educationLevel: findValue(row, ['PENDIDIKAN']),
                religion: findValue(row, ['AGAMA']),
                occupation: findValue(row, ['PEKERJAAN']),
                bloodType: findValue(row, ['GOLONGAN_DARAH', 'GOL_DARAH']),
                hasBirthCertificate: findValue(row, ['AKTA_LAHIR']),
                birthCertificateNumber: findValue(row, ['NO_AKTA_LAHIR']),
                hasMarriageCertificate: findValue(row, ['AKTA_KAWIN']),
                marriageCertificateNumber: findValue(row, ['NO_AKTA_KAWIN']),
                hasDivorceCertificate: findValue(row, ['AKTA_CERAI']),
                divorceCertificateNumber: findValue(row, ['NO_AKTA_CERAI']),
                fatherName: findValue(row, ['NAMA_AYAH']),
                motherName: findValue(row, ['NAMA_IBU']),
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
              };
              batch.set(docRef, residentData, { merge: true });
              cacheResident(residentData as any);
              count++;

            }
          });
          await batch.commit();
        }

        // Recalculate demographics stats document to avoid reading all resident documents on client pages
        await recalculateStatistics(firestore);

        setImportCount(count);
        toast({ title: "Impor Berhasil", description: `${count} data penduduk disimpan.` });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Impor Data Penduduk
          </DialogTitle>
          <DialogDescription>
            Unggah file Excel (.xlsx). Seluruh nilai teks akan disimpan persis sesuai isi kolom di spreadsheet.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="file">Pilih File Excel</Label>
            <Input id="file" type="file" accept=".xlsx,.xls" onChange={handleFileChange} disabled={isProcessing} />
          </div>

          <div className="p-4 bg-muted/50 rounded-lg text-[10px] space-y-1 font-mono">
            <p className="font-bold text-primary mb-2">FORMAT HEADER KOLOM:</p>
            <p>NIK, NO_KK, NAMA_LGKP, JENIS_KLM, TGL_LAHIR, UMUR, TEMPAT_LAHIR, ALAMAT, NO_RT, NO_RW, KELURAHAN, SHDK, STATUS_KAWIN, PENDIDIKAN, AGAMA, PEKERJAAN, GOLONGAN_DARAH, AKTA_LAHIR, NO_AKTA_LAHIR, AKTA_KAWIN, NO_AKTA_KAWIN, AKTA_CERAI, NO_AKTA_CERAI, NAMA_AYAH, NAMA_IBU</p>
          </div>

          {isProcessing && (
            <div className="flex flex-col items-center justify-center p-4 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium animate-pulse">Sedang memproses data... Mohon tunggu.</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Gagal</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {importCount !== null && (
            <Alert className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle>Berhasil</AlertTitle>
              <AlertDescription>{importCount} data penduduk berhasil diimpor.</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Tutup</Button>
          <Button onClick={handleImport} disabled={isProcessing || !selectedFile} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save className="mr-2 h-4 w-4" /> Mulai Impor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
