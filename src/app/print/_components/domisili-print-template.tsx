'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function DomisiliPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  return (
    <PrintLayout submission={submission} hideRequesterSignature={true}>
      <p className="mt-3 text-justify leading-normal">
        Yang bertanda tangan dibawah ini, CAMAT GANDRUNGMANGU Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa :
      </p>

      <table className="mt-2 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="Nama" value={formData.name} />
          <DataRow compact="tight" label="NIK" value={formData.nik} />
          <DataRow compact="tight" label="Jenis Kelamin" value={formData.gender} />
          <DataRow compact="tight" label="Tempat/ Tanggal lahir" value={formatTTL(formData.birthPlace, formData.birthDate)} />
          <DataRow compact="tight" label="Warganegara" value={formData.nationality} />
          <DataRow compact="tight" label="Agama" value={formData.religion} />
          <DataRow compact="tight" label="Alamat Asal (KTP)" value={formData.originAddress} />
        </tbody>
      </table>

      <p className="mt-2.5 text-justify leading-normal">
        Adalah benar penduduk Kecamatan Gandrungmangu, Kecamatan Gandrungmangu, Kabupaten Cilacap dan saat ini berdomisili di :
      </p>

      <table className="mt-1.5 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="Alamat Domisili" value={formData.domicileAddress} />
        </tbody>
      </table>

      <p className="mt-2.5 text-justify leading-normal">
        Demikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan seperlunya.
      </p>
    </PrintLayout>
  );
}
