'use client';

import { Button } from '@/components/ui/button';
import { LetterSubmission, KopSuratInfo } from '@/lib/types';
import { Loader2, Printer, FileDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

export interface PrintPageConfig {
  title?: string;
  subtitle?: string;
  showKop?: boolean;
  content: React.ReactNode;
  showSignatures?: boolean;
  inlineSignatures?: boolean;
  pageNumber?: number;
  totalPages?: number;
}

export interface PrintLayoutProps {
  submission: LetterSubmission;
  children?: React.ReactNode;
  pages?: PrintPageConfig[];
  requesterLabel?: string;
  requesterNameOverride?: string;
  additionalFooter?: React.ReactNode;
  hideRequesterSignature?: boolean;
  reverseSignatures?: boolean;
  compact?: boolean | 'tight';
  inlineSignatures?: boolean;
  fontSize?: '12pt' | '11pt' | '10pt';
}

const fallbackKopInfo: KopSuratInfo = {
  letterheadImageUrl: "https://placehold.co/1200x240/f0f0f0/333333?text=Kop+Surat+Belum+Diatur"
};

const parseDateInput = (dateInput: any): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput === 'object') {
    if ('toDate' in dateInput && typeof dateInput.toDate === 'function') {
      const d = dateInput.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if ('seconds' in dateInput && typeof dateInput.seconds === 'number') {
      const d = new Date(dateInput.seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    if ('_seconds' in dateInput && typeof dateInput._seconds === 'number') {
      const d = new Date(dateInput._seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime()) && (trimmed.includes('T') || trimmed.includes('Z'))) {
      return parsed;
    }

    const separators = /[-/]/;
    const parts = trimmed.split(separators);

    if (parts.length === 3) {
      let d, m, y;
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      } else {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        let p2 = parseInt(parts[2], 10);

        if (p2 < 100) {
          const currentYearShort = new Date().getFullYear() % 100;
          p2 += (p2 > currentYearShort + 2) ? 1900 : 2000;
        }

        if (p0 > 12) { d = p0; m = p1 - 1; y = p2; }
        else if (p1 > 12) { m = p0 - 1; d = p1; y = p2; }
        else { d = p0; m = p1 - 1; y = p2; }
      }
      const date = new Date(y, m, d);
      return isNaN(date.getTime()) ? null : date;
    }
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

export const toProperCase = (str: string): string => {
  if (!str) return '';
  let cleaned = str.replace(/`/g, '');

  return cleaned.replace(/\b[a-zA-Z]+\b/g, (word) => {
    const upperWord = word.toUpperCase();
    if (['RT', 'RW', 'WNI', 'KK', 'NIK', 'HP', 'WA', 'BPJS', 'SKCK', 'SKTM', 'KUR', 'UMKM'].includes(upperWord)) {
      return upperWord;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
};

export const formatTTL = (place?: string, dateInput?: any) => {
  const dateObj = parseDateInput(dateInput);
  const city = place ? toProperCase(place) : '';

  if (!dateObj) return city || '-';

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return `${city}, ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
};

export const formatFullDate = (dateInput: any) => {
  const dateObj = parseDateInput(dateInput);
  if (!dateObj) return dateInput || '-';

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = days[dateObj.getDay()];
  const dayNum = String(dateObj.getDate()).padStart(2, '0');
  const monthName = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  return `${dayName}, ${dayNum} ${monthName} ${year}`;
};

export function PrintLayout({
  submission,
  children,
  pages,
  requesterLabel = "Pemohon",
  requesterNameOverride,
  additionalFooter,
  hideRequesterSignature = false,
  reverseSignatures = false,
  compact = false,
  inlineSignatures = true,
  fontSize = '12pt'
}: PrintLayoutProps) {
  const isTight = compact === 'tight';
  const isCompact = Boolean(compact) || Boolean(additionalFooter);
  const [kopInfo, setKopInfo] = useState<KopSuratInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const signerType = searchParams.get('signer') || 'kades';

  useEffect(() => {
    const fetchKopInfo = async () => {
      if (!firestore) return;
      setIsLoading(true);
      try {
        // 1. Cek pengaturan global Kecamatan di settings/village (hasil upload dari /settings/)
        const villageRef = doc(firestore, 'settings', 'village');
        const villageSnap = await getDoc(villageRef);
        if (villageSnap.exists()) {
          const vData = villageSnap.data();
          const kopUrl = vData?.kopSuratUrl || vData?.letterheadImageUrl || vData?.kopUrl;
          if (kopUrl) {
            setKopInfo({ letterheadImageUrl: kopUrl });
            setIsLoading(false);
            return;
          }
        }

        // 2. Fallback ke koleksi kopSurat/default
        const kopSuratRef = doc(firestore, 'kopSurat', 'default');
        const docSnap = await getDoc(kopSuratRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as KopSuratInfo;
          if (data?.letterheadImageUrl) {
            setKopInfo(data);
            setIsLoading(false);
            return;
          }
        }

        setKopInfo(fallbackKopInfo);
      } catch (error) {
        console.error("Error fetching kop surat:", error);
        setKopInfo(fallbackKopInfo);
      } finally {
        setIsLoading(false);
      }
    };
    fetchKopInfo();
  }, [firestore]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;

    setIsDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const pageElements = printAreaRef.current.querySelectorAll('.print-page');

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      if (pageElements && pageElements.length > 0) {
        for (let i = 0; i < pageElements.length; i++) {
          if (i > 0) {
            pdf.addPage('a4', 'p');
          }
          const pageEl = pageElements[i] as HTMLElement;
          const pageDataUrl = await toPng(pageEl, {
            backgroundColor: '#ffffff',
            pixelRatio: 2,
            cacheBust: true,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              margin: '0',
              padding: '0'
            }
          });
          pdf.addImage(pageDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }
      } else {
        const dataUrl = await toPng(printAreaRef.current, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          cacheBust: true,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
            margin: '0',
            padding: '0'
          }
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      const reqName = (submission.requesterName || submission.formData?.name || 'pemohon').replace(/\s+/g, '_');
      const letterType = (submission.letterType || 'surat').replace(/\s+/g, '_');
      const fileName = `${letterType}_${reqName}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Berhasil Mengunduh",
        description: "Dokumen PDF telah disimpan ke Karyawan Anda.",
      });
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast({
        title: "Gagal Mengunduh",
        description: "Terjadi kesalahan saat membuat file PDF.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Memuat templat kop...</p>
      </div>
    );
  }

  const dateObj = parseDateInput(submission.date);
  const formattedDate = dateObj
    ? dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const displayRequesterName = requesterNameOverride || submission.requesterName;

  const renderSignatureBlock = (compactSpacing?: boolean) => (
    <div className={cn("flex justify-between text-center items-start", reverseSignatures && "flex-row-reverse")}>
      <div className={cn("w-[40%]", hideRequesterSignature && "invisible")}>
        {reverseSignatures ? (
          <p className="mb-0.5">Gandrungmangu, {formattedDate}</p>
        ) : (
          <p className="invisible mb-0.5">Gandrungmangu, 00 Bulan 0000</p>
        )}
        <p>{requesterLabel}</p>
        <div className={inlineSignatures ? "h-16" : isTight ? "h-11" : compactSpacing ? "h-14" : "h-16"}></div>
        <p className="font-bold underline tracking-wider uppercase">
          {displayRequesterName}
        </p>
      </div>

      <div className="w-[45%]">
        {!reverseSignatures ? (
          <p className="mb-0.5">Gandrungmangu, {formattedDate}</p>
        ) : (
          <p className="invisible mb-0.5">Gandrungmangu, 00 Bulan 0000</p>
        )}

        {signerType === 'sekdes' ? (
          <>
            <p>A.n. CAMAT GANDRUNGMANGU</p>
            <p>Sekretaris Kecamatan Gandrungmangu</p>
            <div className={inlineSignatures ? "h-16" : isTight ? "h-11" : compactSpacing ? "h-14" : "h-16"}></div>
            <p className="font-bold underline tracking-wider uppercase">PRIYO SUMARNO, S.PD.</p>
          </>
        ) : (
          <>
            <p>CAMAT GANDRUNGMANGU</p>
            <div className={inlineSignatures ? "h-16" : isTight ? "h-11" : compactSpacing ? "h-14" : "h-16"}></div>
            <p className="font-bold underline tracking-wider uppercase">FATHAN ADY CHANDRA, S.STP., M.M.</p>
            <p className="text-xs">Pembina Tingkat I</p>
            <p className="text-xs">NIP. 19810509 199912 1 001</p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-slate-200 text-black font-arial-print print:bg-white min-h-screen py-10 print:p-0">
      <div
        ref={printAreaRef}
        className="print-area-wrapper flex flex-col space-y-10 print:space-y-0"
      >
        {pages && pages.length > 0 ? (
          pages.map((page, idx) => (
            <div
              key={idx}
              className="print-page mx-auto bg-white shadow-2xl print:shadow-none print:border-none flex flex-col justify-between"
              style={{
                width: '210mm',
                height: '297mm',
                minHeight: '297mm',
                maxHeight: '297mm',
                boxSizing: 'border-box'
              }}
            >
              <div>
                {page.showKop !== false && (
                  <header className="pl-[2cm] pr-[1.5cm] pt-[0.3cm]">
                    {kopInfo?.letterheadImageUrl && (
                      <img
                        src={kopInfo.letterheadImageUrl}
                        alt="Kop Surat"
                        className="w-full h-auto"
                        crossOrigin="anonymous"
                      />
                    )}
                  </header>
                )}

                <main className={cn(
                  "pl-[2cm] pr-[1.5cm] pb-[0cm] text-[14.5px] leading-relaxed",
                  page.showKop === false ? "pt-[1.5cm]" : "pt-[0.2cm]"
                )}>
                  {page.title && (
                    <div className="text-center mb-4">
                      <p className="font-bold underline text-lg tracking-wider">{page.title}</p>
                      {page.subtitle && <p>{page.subtitle}</p>}
                    </div>
                  )}

                  {page.content}

                  {page.showSignatures && page.inlineSignatures && (
                    <div className="pt-8 text-[14px]">
                      {renderSignatureBlock(false)}
                      {additionalFooter && (
                        <div className="mt-5">
                          {additionalFooter}
                        </div>
                      )}
                    </div>
                  )}
                </main>
              </div>

              <div className="mt-auto">
                {page.showSignatures && !page.inlineSignatures && (
                  <footer className="px-[2cm] pb-[0.4cm] pt-2 text-[14px]">
                    {renderSignatureBlock(false)}
                    {additionalFooter && (
                      <div className="mt-5">
                        {additionalFooter}
                      </div>
                    )}
                  </footer>
                )}

                {page.pageNumber && page.totalPages && (
                  <div className="text-center pb-2.5 text-[10px] text-slate-400 print:text-black italic">
                    - Halaman {page.pageNumber} dari {page.totalPages} -
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div
            className={cn(
              "print-page mx-auto bg-white shadow-2xl print:shadow-none print:border-none overflow-hidden flex flex-col",
              !inlineSignatures && "justify-between"
            )}
            style={{
              width: '210mm',
              height: '297mm',
              minHeight: '297mm',
              maxHeight: '297mm',
              boxSizing: 'border-box'
            }}
          >
            <div>
              <header className={cn("pl-[2cm] pr-[1.5cm]", isTight ? "pt-[0.2cm]" : "pt-[0.3cm]")}>
                {kopInfo?.letterheadImageUrl && (
                  <img
                    src={kopInfo.letterheadImageUrl}
                    alt="Kop Surat"
                    className="w-full h-auto"
                    crossOrigin="anonymous"
                  />
                )}
              </header>

              <main className={cn(
                "pl-[2cm] pr-[1.5cm] pb-[0cm]",
                fontSize === '12pt'
                  ? "pt-[0.2cm] text-[12pt] leading-normal"
                  : fontSize === '11pt'
                    ? "pt-[0.2cm] text-[11pt] leading-normal"
                    : isTight
                      ? "pt-[0.1cm] text-[13.5px] leading-snug"
                      : isCompact
                        ? "pt-[0.2cm] text-[14.5px] leading-relaxed"
                        : "pt-[0.3cm] text-base"
              )}>
                <div className={cn("text-center", isTight ? "mb-2" : isCompact ? "mb-4" : "mb-6")}>
                  <p className="font-bold underline text-lg tracking-wider">{submission.letterType.toUpperCase()}</p>
                  <p>Nomor : {submission.documentNumber}</p>
                </div>

                {children}

                {inlineSignatures && (
                  <div className="mt-7 text-[12pt]">
                    {renderSignatureBlock(isCompact)}
                    {additionalFooter && (
                      <div className="mt-5">
                        {additionalFooter}
                      </div>
                    )}
                  </div>
                )}
              </main>
            </div>

            {!inlineSignatures && (
              <footer className={cn("px-[2cm]", isTight ? "pt-1.5 pb-[0.7cm] text-[13.5px]" : isCompact ? "pt-3 pb-[0.4cm] text-[14px]" : "pt-4 pb-[0.4cm]")}>
                {renderSignatureBlock(isCompact)}
                {additionalFooter && (
                  <div className={isCompact ? "mt-5" : "mt-10"}>
                    {additionalFooter}
                  </div>
                )}
              </footer>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col sm:flex-row gap-3 print:hidden">
        <Button onClick={handleDownloadPdf} variant="secondary" size="lg" className="shadow-lg h-12" disabled={isDownloading}>
          {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-5 w-5" />}
          Unduh PDF
        </Button>
        <Button onClick={handlePrint} size="lg" className="shadow-lg h-12">
          <Printer className="mr-2 h-5 w-5" />
          Cetak Dokumen
        </Button>
      </div>

      <style jsx global>{`
        .font-arial-print {
            font-family: Arial, sans-serif;
        }
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            width: 210mm;
            height: auto !important;
            background: white;
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            margin: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-area-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          .print-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .print-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .fixed {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export const DataRow = ({ label, value, compact }: { label: string; value: any; compact?: boolean | 'tight' }) => {
  let displayValue = value || '-';
  if (typeof displayValue === 'string') {
    const lowerLabel = label.toLowerCase();
    if (
      lowerLabel.includes('nama') ||
      lowerLabel.includes('alamat') ||
      lowerLabel.includes('tempat') ||
      lowerLabel.includes('tgl lahir') ||
      lowerLabel.includes('tanggal lahir') ||
      lowerLabel.includes('pekerjaan')
    ) {
      displayValue = toProperCase(displayValue);
    }
  }
  const isTight = compact === 'tight';
  return (
    <tr>
      <td className={cn("w-[30%] align-top", isTight ? "py-[2px] leading-normal" : compact ? "py-0.5" : "py-1")}>{label}</td>
      <td className={cn("w-[2%] align-top text-center", isTight ? "py-[2px] leading-normal" : compact ? "py-0.5" : "py-1")}>:</td>
      <td className={cn("align-top pl-1", isTight ? "py-[2px] leading-normal" : compact ? "py-0.5" : "py-1")}>{displayValue}</td>
    </tr>
  );
};
