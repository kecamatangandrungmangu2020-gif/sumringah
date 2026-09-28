'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL, formatFullDate } from './print-layout';

export function PemakamanPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  return (
    <PrintLayout submission={submission} hideRequesterSignature={true}>
      <p className="mt-2 text-justify leading-normal">
        Yang bertanda tangan di bawah ini CAMAT GANDRUNGMANGU Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa:
      </p>

      <table className="mt-1.5 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="NIK" value={formData.nik} />
          <DataRow compact="tight" label="Nama Lengkap" value={formData.name} />
          <DataRow compact="tight" label="Tempat / Tgl lahir" value={formatTTL(formData.birthPlace, formData.birthDate)} />
          <DataRow compact="tight" label="Agama" value={formData.religion} />
          <DataRow compact="tight" label="Jenis Kelamin" value={formData.gender} />
          <DataRow compact="tight" label="Status Perkawinan" value={formData.maritalStatus} />
          <DataRow compact="tight" label="Pekerjaan" value={formData.job} />
          <DataRow compact="tight" label="Kewarganegaraan" value={formData.nationality} />
          <DataRow compact="tight" label="Alamat" value={formData.address} />
        </tbody>
      </table>

      <p className="mt-2 text-justify leading-normal font-bold">
        Tersebut di atas benar-benar telah meninggal dunia pada:
      </p>

      <table className="mt-1.5 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="Hari / Tanggal" value={formatFullDate(formData.deathDate)} />
          <DataRow compact="tight" label="Jam" value={formData.deathTime} />
          <DataRow compact="tight" label="Tempat Kematian" value={formData.deathLocation} />
          <DataRow compact="tight" label="Sebab Kematian" value={formData.deathCause} />
          <DataRow compact="tight" label="Dimakamkan di" value={formData.burialLocation} />
        </tbody>
      </table>

      <p className="mt-2 text-justify leading-normal">
        Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat digunakan seperlunya.
      </p>
    </PrintLayout>
  );
}
