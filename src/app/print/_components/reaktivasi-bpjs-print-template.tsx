'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function ReaktivasiBpjsPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  return (
    <PrintLayout submission={submission} hideRequesterSignature={true}>
      <p className="mt-3 text-justify leading-normal">
        Yang bertanda tangan di bawah ini CAMAT GANDRUNGMANGU Kecamatan Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa:
      </p>

      <table className="mt-2 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="Rekam Medis" value={formData.rekamMedis} />
          <DataRow compact="tight" label="Jenis Penyakit" value={formData.jenisPenyakit} />
          <DataRow compact="tight" label="No. BPJS" value={formData.noBpjs} />
        </tbody>
      </table>

      <p className="mt-2.5 font-semibold">Menerangkan bahwa:</p>

      <table className="mt-1.5 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="Nama" value={formData.name} />
          <DataRow compact="tight" label="NIK" value={formData.nik} />
          <DataRow compact="tight" label="Tempat/Tanggal Lahir" value={formatTTL(formData.birthPlace, formData.birthDate)} />
          <DataRow compact="tight" label="Pekerjaan" value={formData.job} />
          <DataRow compact="tight" label="Alamat" value={formData.address} />
        </tbody>
      </table>

      <p className="mt-2.5 text-justify leading-normal">
        Adalah benar bahwa yang bersangkutan saat ini sedang sakit <strong>{formData.jenisPenyakit}</strong> dan membutuhkan pelayanan serta keberlanjutan pengobatan secara medis.
      </p>

      <p className="mt-2 text-justify leading-normal">
        Surat ini dipergunakan untuk keperluan <strong>Reaktivasi BPJS Kesehatan</strong> dengan Nomor: <strong>{formData.noBpjs}</strong>, bahwa yang bersangkutan benar memerlukan jaminan pelayanan kesehatan sesuai dengan ketentuan yang berlaku.
      </p>

      <p className="mt-2 text-justify leading-normal">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
