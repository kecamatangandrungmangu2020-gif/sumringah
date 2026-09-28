'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function MoyangPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;
  const { moyang, anak } = formData;

  return (
    <PrintLayout submission={submission} hideRequesterSignature={true}>
      <p className="mt-2 text-justify leading-normal">
        Yang bertanda tangan di bawah ini CAMAT GANDRUNGMANGU Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenarnya bahwa:
      </p>

      <table className="mt-1.5 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="Nama Lengkap" value={moyang.name} />
          <DataRow compact="tight" label="NIK" value={moyang.nik} />
          <DataRow compact="tight" label="Jenis Kelamin" value={moyang.gender} />
          <DataRow compact="tight" label="Tempat/Tgl Lahir" value={formatTTL(moyang.birthPlace, moyang.birthDate)} />
          <DataRow compact="tight" label="Kewarganegaraan" value={moyang.nationality} />
          <DataRow compact="tight" label="Agama" value={moyang.religion} />
          <DataRow compact="tight" label="Pekerjaan" value={moyang.job} />
          <DataRow compact="tight" label="Alamat Domisili" value={moyang.address} />
        </tbody>
      </table>

      <p className="mt-2 text-justify leading-normal font-bold italic">
        Tersebut di atas adalah benar-benar Orang Tua Kandung dari:
      </p>

      <table className="mt-1.5 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="Nama Lengkap" value={anak.name} />
          <DataRow compact="tight" label="NIK" value={anak.nik} />
          <DataRow compact="tight" label="Jenis Kelamin" value={anak.gender} />
          <DataRow compact="tight" label="Tempat/Tgl Lahir" value={formatTTL(anak.birthPlace, anak.birthDate)} />
          <DataRow compact="tight" label="Kewarganegaraan" value={anak.nationality} />
          <DataRow compact="tight" label="Agama" value={anak.religion} />
          <DataRow compact="tight" label="Pekerjaan" value={anak.job} />
          <DataRow compact="tight" label="Alamat Domisili" value={anak.address} />
        </tbody>
      </table>

      <p className="mt-2 text-justify leading-normal">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
