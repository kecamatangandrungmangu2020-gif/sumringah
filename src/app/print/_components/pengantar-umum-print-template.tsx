'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function PengantarUmumPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  return (
    <PrintLayout submission={submission}>
      <p className="mt-3 text-justify leading-normal">
        Yang bertanda tangan di bawah ini CAMAT GANDRUNGMANGU Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa:
      </p>

      <table className="mt-2 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="Nama" value={formData.name} />
          <DataRow compact="tight" label="NIK" value={formData.nik} />
          <DataRow compact="tight" label="Tempat / Tgl Lahir" value={formatTTL(formData.birthPlace, formData.birthDate)} />
          <DataRow compact="tight" label="Pekerjaan" value={formData.job} />
          <DataRow compact="tight" label="Alamat" value={formData.address} />
        </tbody>
      </table>

      <p className="mt-2.5 text-justify leading-normal">
        Surat keterangan ini diberikan kepada yang bersangkutan untuk dipergunakan sebagaimana mestinya sesuai dengan keperluan yang dibutuhkan yaitu : <strong>{formData.purpose}</strong>.
      </p>

      <p className="mt-2.5 text-justify leading-normal">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
