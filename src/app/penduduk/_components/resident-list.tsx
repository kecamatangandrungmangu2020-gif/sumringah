'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Search,
  UserPlus,
  Edit,
  Trash2,
  Users,
  FileUp,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Database,
  BarChart3,
} from 'lucide-react';
import { Resident } from '@/lib/types';
import { useFirestore } from '@/firebase';
import {
  collection,
  query,
  deleteDoc,
  doc,
  getDocs,
  where,
  limit,
  getCountFromServer,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatDateToDDMMYYYY } from '@/lib/utils';
import { ResidentForm } from './resident-form';
import { ImportResidentDialog } from './import-resident-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { seedResidents, recalculateStatistics } from '@/lib/residents';

export function ResidentList() {
  console.log('ResidentList render');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const [residents, setResidents] = useState<Resident[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  const fetchTotalCount = async () => {
    if (!firestore) return;
    try {
      const coll = collection(firestore, 'residents');
      const snapshot = await getCountFromServer(coll);
      setTotalCount(snapshot.data().count);
    } catch (error) {
      console.error("Error fetching count:", error);
    }
  };

  useEffect(() => { if (firestore) fetchTotalCount(); }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!firestore) return;

    const term = searchTerm.trim();
    if (!term) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const residentsCol = collection(firestore, 'residents');

      if (/^\d{16}$/.test(term)) {
        const docRef = doc(firestore, 'residents', term);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setResidents([{ id: docSnap.id, ...docSnap.data() } as Resident]);
          setIsSearching(false);
          return;
        }

        const qNik = query(residentsCol, where('nik', '==', term), limit(1));
        const snapNik = await getDocs(qNik);
        if (!snapNik.empty) {
          const results: Resident[] = [];
          snapNik.forEach(d => results.push({ id: d.id, ...d.data() } as Resident));
          setResidents(results);
          setIsSearching(false);
          return;
        }
      }

      const nameTerm = term.toUpperCase();
      const qName = query(
        residentsCol,
        where('fullName', '>=', nameTerm),
        where('fullName', '<=', nameTerm + '\uf8ff'),
        limit(20)
      );

      const querySnapshot = await getDocs(qName);
      const results: Resident[] = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as Resident);
      });

      setResidents(results);

      if (results.length === 0) {
        toast({
          title: "Tidak Ditemukan",
          description: `Data "${term}" tidak ada di database.`,
        });
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        variant: "destructive",
        title: "Gagal Mencari",
        description: "Terjadi kesalahan kuota atau jaringan."
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'residents', id));
      setResidents(residents.filter(r => r.id !== id));
      if (totalCount !== null) setTotalCount(totalCount - 1);

      // Update demographic cache
      await recalculateStatistics(firestore);

      toast({ title: "Data Dihapus", description: "Data warga telah dihapus." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: error.message });
    }
  };

  const handleDeleteAll = async () => {
    if (!firestore) return;
    setIsDeletingAll(true);

    try {
      const residentsCol = collection(firestore, 'residents');
      const snapshot = await getDocs(residentsCol);

      if (snapshot.empty) {
        toast({ title: "Database Kosong", description: "Tidak ada data yang bisa dihapus." });
        setIsDeletingAll(false);
        return;
      }

      let count = 0;
      const chunks = [];
      const allDocs = snapshot.docs;
      for (let i = 0; i < allDocs.length; i += 500) chunks.push(allDocs.slice(i, i + 500));

      for (const chunk of chunks) {
        const batch = writeBatch(firestore);
        chunk.forEach((d) => {
          batch.delete(d.ref);
          count++;
        });
        await batch.commit();
      }

      // Update demographic cache
      await recalculateStatistics(firestore);

      setResidents([]);
      setTotalCount(0);
      toast({ title: "Berhasil", description: `${count} data penduduk telah dihapus permanen.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menghapus Semua", description: error.message });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleSeedData = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    try {
      await seedResidents(firestore);
      await recalculateStatistics(firestore);
      await fetchTotalCount();
      toast({
        title: "Data Testing Berhasil",
        description: "Beberapa data contoh telah ditambahkan ke database.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menambah Data",
        description: error.message,
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleRecalculate = async () => {
    if (!firestore) return;
    setIsRecalculating(true);
    try {
      await recalculateStatistics(firestore);
      await fetchTotalCount();
      toast({
        title: "Statistik Diperbarui",
        description: "Statistik kependudukan berhasil dihitung ulang dan disimpan.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui Statistik",
        description: error.message,
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleEdit = (resident: Resident) => {
    setEditingResident(resident);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingResident(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-50/70 border border-slate-200/90 rounded-2xl shadow-xs">
          <CardHeader className="pb-1.5 pt-4 px-5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Statistik Database
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-5">
            <div className="text-2xl font-black text-slate-900">
              {totalCount === null ? <Skeleton className="h-7 w-20" /> : totalCount.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-500 font-medium italic mt-0.5">Total dokumen penduduk Kecamatan Gandrungmangu</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/70 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 font-medium shadow-xs">
          <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <p>Sistem dioptimalkan untuk mencari berdasarkan <strong>NIK 16 digit</strong> atau <strong>Nama Depan</strong>. Database tidak dimuat semua sekaligus demi kecepatan dan penghematan kuota.</p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Masukkan NIK 16 Digit atau Nama Depan..."
              className="pl-10 h-10 rounded-xl text-xs font-semibold bg-white border-slate-200 shadow-xs focus:ring-2 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isSearching}
            />
          </div>
          <Button type="submit" size="default" className="px-6 h-10 rounded-xl font-bold uppercase tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs text-xs" disabled={isSearching}>
            {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1.5" />}
            Cari
          </Button>
        </form>

        <div className="flex flex-wrap justify-between gap-4 pt-1">
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="rounded-xl font-bold text-xs" disabled={isDeletingAll || totalCount === 0}>
                  {isDeletingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                  Hapus Semua Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-red-200 rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600 font-bold">
                    <ShieldAlert className="h-5 w-5" />
                    PERINGATAN KERAS!
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4 text-xs">
                      <p className="font-bold text-red-900">Tindakan ini akan menghapus SELURUH ({totalCount ?? 0}) data penduduk dari server secara permanen.</p>
                      <p>Pastikan Anda sudah memiliki cadangan data (backup) sebelum melanjutkan. Tindakan ini tidak dapat dibatalkan.</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl font-bold text-xs">Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll} className="bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold text-xs">Ya, Hapus Semua Selamanya</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs border-slate-200" onClick={handleSeedData} disabled={isSeeding}>
              {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-1.5 h-3.5 w-3.5" />}
              Generate Data Testing
            </Button>

            <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={isRecalculating} className="rounded-xl font-bold text-xs border-primary/40 text-primary hover:bg-primary/10">
              {isRecalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-1.5 h-3.5 w-3.5" />}
              Update Statistik Grafik
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs border-slate-200" onClick={() => setIsImportOpen(true)}>
              <FileUp className="mr-1.5 h-3.5 w-3.5" />
              Impor Excel
            </Button>
            <Button size="sm" className="rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white" onClick={handleAdd}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Tambah Manual
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 shadow-xs bg-white overflow-hidden">

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>NIK</TableHead>
                <TableHead>KK</TableHead>
                <TableHead>Nama Lengkap</TableHead>
                <TableHead>Tgl Lahir</TableHead>
                <TableHead>JK</TableHead>
                <TableHead>Agama</TableHead>
                <TableHead>SHDK</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isSearching ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
                ))
              ) : residents.length > 0 ? (
                residents.map((resident) => (
                  <TableRow key={resident.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-[10px]">{resident.nik}</TableCell>
                    <TableCell className="font-mono text-[10px]">{resident.noKk}</TableCell>
                    <TableCell className="font-medium uppercase text-[10px]">{resident.fullName}</TableCell>
                    <TableCell className="text-[10px] whitespace-nowrap font-mono">{formatDateToDDMMYYYY(resident.dateOfBirth, resident.nik)}</TableCell>
                    <TableCell className="text-[10px]">{resident.gender || '-'}</TableCell>
                    <TableCell className="text-[10px]">{resident.religion || '-'}</TableCell>
                    <TableCell className="text-[10px] font-semibold">{resident.relationshipToHeadOfFamily || '-'}</TableCell>
                    <TableCell className="text-[10px] min-w-[300px]">
                      <p className="leading-tight truncate">
                        {`${resident.address}, RT ${resident.rt} RW ${resident.rw}, ${resident.kelurahan}, kec. Gandrungmangu, Kab. Cilacap`}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(resident)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <div className="flex w-full items-center px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 cursor-default">
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus
                              </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Data?</AlertDialogTitle>
                                <AlertDialogDescription>Data {resident.fullName} akan dihapus permanen.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => resident.id && handleDelete(resident.id)} className="bg-red-600 text-white">Ya, Hapus</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-muted-foreground">
                    {hasSearched ? "Data tidak ditemukan." : "Gunakan pencarian untuk menampilkan data."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ResidentForm open={isFormOpen} onOpenChange={setIsFormOpen} resident={editingResident} />
      <ImportResidentDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
