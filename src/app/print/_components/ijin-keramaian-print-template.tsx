'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL, formatFullDate } from './print-layout';

export function IjinKeramaianPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  // Templat Tanda Tangan Mengetahui (Camat, Danramil, Kapolsek)
  const additionalFooter = (
    <div className="space-y-3">
      <div className="text-center">
        <p className="font-bold underline uppercase text-sm">Mengetahui :</p>
      </div>
      <div className="flex justify-between text-center items-start text-sm">
        <div className="w-1/3">
          <p className="font-bold">CAMAT</p>
          <p className="text-xs">Gandrungmangu</p>
          <div className="h-14"></div>
          <div className="border-b-2 border-black w-[80%] mx-auto"></div>
        </div>
        <div className="w-1/3">
          <p className="font-bold">DAN RAMIL 10</p>
          <p className="text-xs">Gandrungmangu</p>
          <div className="h-14"></div>
          <div className="border-b-2 border-black w-[80%] mx-auto"></div>
        </div>
        <div className="w-1/3">
          <p className="font-bold">KAPOLSEK</p>
          <p className="text-xs">Gandrungmangu</p>
          <div className="h-14"></div>
          <div className="border-b-2 border-black w-[80%] mx-auto"></div>
        </div>
      </div>
    </div>
  );

  return (
    <PrintLayout
      submission={submission}
      additionalFooter={additionalFooter}
      compact="tight"
    >
      <p className="mt-2 text-justify leading-snug">
        Yang bertanda tangan dibawah ini CAMAT GANDRUNGMANGU Kecamatan Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa:
      </p>

      <table className="mt-1.5 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="Nama" value={formData.name} />
          <DataRow compact="tight" label="NIK" value={formData.nik} />
          <DataRow compact="tight" label="Tempat / Tgl Lahir" value={formatTTL(formData.birthPlace, formData.birthDate)} />
          <DataRow compact="tight" label="Pekerjaan" value={formData.job} />
          <DataRow compact="tight" label="Alamat" value={formData.address} />
        </tbody>
      </table>

      <p className="mt-2 text-justify leading-snug">
        Orang tersebut di atas adalah benar-benar penduduk Kecamatan Gandrungmangu, Kecamatan Gandrungmangu, Kabupaten Cilacap.
      </p>

      <p className="mt-1.5 text-justify leading-snug">
        Adapun Surat keterangan ini untuk dipergunakan sebagai persyaratan ijin keramaian pada:
      </p>

      <table className="mt-1.5 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="Tanggal Acara" value={formatFullDate(formData.eventDate)} />
          <DataRow compact="tight" label="Sampai dengan Tanggal" value={formatFullDate(formData.eventEndDate)} />
          <DataRow compact="tight" label="Jumlah Undangan" value={formData.guestCount} />
          <DataRow compact="tight" label="Acara" value={formData.eventName} />
          <DataRow compact="tight" label="Hiburan" value={formData.eventEntertainment} />
          <DataRow compact="tight" label="Tempat" value={formData.eventLocation} />
        </tbody>
      </table>

      <p className="mt-2 text-justify leading-snug">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
