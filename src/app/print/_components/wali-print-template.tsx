'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function WaliPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;
  const { wali, anak, purpose } = formData;

  return (
    <PrintLayout submission={submission}>
      <p className="mt-3 text-justify leading-normal">
        Yang bertanda tangan di bawah ini CAMAT GANDRUNGMANGU Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa:
      </p>

      <table className="mt-2 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="NIK" value={wali.nik} />
          <DataRow compact="tight" label="Nama" value={wali.name} />
          <DataRow compact="tight" label="Tempat / Tgl Lahir" value={formatTTL(wali.birthPlace, wali.birthDate)} />
          <DataRow compact="tight" label="Pekerjaan" value={wali.job} />
          <DataRow compact="tight" label="Alamat" value={wali.address} />
        </tbody>
      </table>

      <p className="mt-2.5 text-justify leading-normal font-bold">
        Tersebut di atas adalah benar-benar Wali / Nenek dari :
      </p>

      <table className="mt-2 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="NIK" value={anak.nik} />
          <DataRow compact="tight" label="Nama" value={anak.name} />
          <DataRow compact="tight" label="Tempat / Tgl Lahir" value={formatTTL(anak.birthPlace, anak.birthDate)} />
          <DataRow compact="tight" label="Alamat" value={anak.address} />
        </tbody>
      </table>

      <p className="mt-2.5 text-justify leading-normal">
        Surat keterangan ini diberikan kepada yang bersangkutan untuk dipergunakan sebagai persyaratan : <strong>{purpose}</strong>.
      </p>

      <p className="mt-2 text-justify leading-normal">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
