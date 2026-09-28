'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LetterSubmission } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Info, Loader2, Search, XCircle } from 'lucide-react';
import { getSubmissionById } from '@/lib/submissions';
import { useFirebase } from '@/firebase';

export function TrackTicket() {
  const [ticketNumber, setTicketNumber] = useState('');
  const [searchResult, setSearchResult] = useState<LetterSubmission | 'not_found' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { firestore } = useFirebase();

  const handleSearch = async () => {
    if (!ticketNumber.trim()) {
      setSearchResult(null);
      return;
    }
    setIsLoading(true);
    setSearchResult(null);

    const foundSubmission = await getSubmissionById(firestore, ticketNumber.trim());

    if (foundSubmission) {
      setSearchResult(foundSubmission);
    } else {
      setSearchResult('not_found');
    }
    setIsLoading(false);
  };

  const getStatusInfo = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
      case 'completed':
      case 'selesai':
      case 'disetujui':
        return {
          title: 'Telah Diproses',
          variant: 'default',
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          description: 'Surat pengajuan Anda telah selesai diproses dan sudah bisa diambil ke Pelayanan Kecamatan Gandrungmangu pada pukul 07.00 WIB s.d 16.00 WIB (Senin s.d Jumat). Terima Kasih.'
        };
      case 'pending':
      case 'processing':
      case 'diproses':
      case 'menunggu':
        return {
          title: 'Sedang Diproses',
          variant: 'default',
          icon: <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />,
          description: 'Pengajuan Anda sedang dalam proses peninjauan oleh administrasi Kecamatan. Silakan cek kembali secara berkala.'
        };
      case 'rejected':
      case 'ditolak':
        return {
          title: 'Ditolak',
          variant: 'destructive',
          icon: <XCircle className="h-4 w-4" />,
          description: 'Maaf, pengajuan Anda ditolak. Silakan hubungi kantor Kecamatan untuk informasi lebih lanjut.'
        };
      default:
        return {
          title: 'Status Pengajuan',
          variant: 'default',
          icon: <Info className="h-4 w-4 text-blue-500" />,
          description: `Status pengajuan Anda saat ini adalah: ${status}`
        };
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Cek Status Pengajuan</CardTitle>
        <CardDescription>Masukkan kode tiket Anda untuk melacak progres pengajuan surat.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            type="text"
            placeholder="Contoh: Abc123Xyz..."
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value)}
            disabled={isLoading}
            onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isLoading || !firestore}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Cek Tiket</span>
          </Button>
        </div>

        {searchResult && (
          <div className="mt-6">
            {searchResult === 'not_found' ? (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Tidak Ditemukan</AlertTitle>
                <AlertDescription>
                  Kode tiket tidak ditemukan. Pastikan Anda memasukkan kode yang benar.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant={getStatusInfo(searchResult.status).variant as 'default' | 'destructive'}>
                {getStatusInfo(searchResult.status).icon}
                <AlertTitle>{getStatusInfo(searchResult.status).title}</AlertTitle>
                <AlertDescription>
                  {getStatusInfo(searchResult.status).description}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
