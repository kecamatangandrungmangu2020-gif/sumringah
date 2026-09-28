'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function BelumMenikahPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  return (
    <PrintLayout submission={submission} hideRequesterSignature={true}>
      <p className="mt-3 text-justify leading-normal">
        Yang bertanda tangan di bawah ini CAMAT GANDRUNGMANGU Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenar-benarnya bahwa:
      </p>

      <table className="mt-2 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="Nama Lengkap" value={formData.name} />
          <DataRow compact="tight" label="NIK" value={formData.nik} />
          <DataRow compact="tight" label="Jenis Kelamin" value={formData.gender} />
          <DataRow compact="tight" label="Tempat/Tgl Lahir" value={formatTTL(formData.birthPlace || '', formData.birthDate)} />
          <DataRow compact="tight" label="Kewarganegaraan" value={formData.nationality} />
          <DataRow compact="tight" label="Agama" value={formData.religion} />
          <DataRow compact="tight" label="Pekerjaan" value={formData.job} />
          <DataRow compact="tight" label="Alamat" value={formData.address} />
        </tbody>
      </table>

      <p className="mt-2.5 text-justify leading-normal">
        Berdasarkan data kependudukan dan catatan yang ada di kantor kami, serta sepengetahuan kami, nama tersebut di atas adalah benar-benar warga kami yang hingga saat surat keterangan ini dibuat berstatus <strong>BELUM PERNAH MENIKAH / LAJANG</strong>.
      </p>
      <p className="mt-2 text-justify leading-normal">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
