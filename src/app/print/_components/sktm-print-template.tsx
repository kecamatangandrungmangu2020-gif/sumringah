'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function SktmPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;
  const isForChild = formData.submissionType === 'child';

  return (
    <PrintLayout
      submission={submission}
      inlineSignatures={true}
      fontSize="12pt"
    >
      <p className="mt-3 text-justify leading-normal">
        Yang bertanda tangan di bawah ini CAMAT GANDRUNGMANGU Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenar-benarnya bahwa:
      </p>

      <table className="mt-2 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="Nama" value={formData.applicantName} />
          <DataRow compact="tight" label="NIK" value={formData.applicantNik} />
          <DataRow compact="tight" label="Tempat/Tgl Lahir" value={formatTTL(formData.applicantBirthPlace, formData.applicantBirthDate)} />
          <DataRow compact="tight" label="Jenis Kelamin" value={formData.applicantGender} />
          <DataRow compact="tight" label="Agama" value={formData.applicantReligion} />
          <DataRow compact="tight" label="Pekerjaan" value={formData.applicantJob} />
          <DataRow compact="tight" label="Alamat" value={formData.applicantAddress} />
        </tbody>
      </table>

      {isForChild ? (
        <>
          <p className="mt-2.5 text-justify leading-normal">
            Adalah benar orang tua / wali dari:
          </p>

          <table className="mt-2 border-collapse w-full">
            <tbody>
              <DataRow compact="tight" label="Nama" value={formData.childName} />
              <DataRow compact="tight" label="NIK" value={formData.childNik} />
              <DataRow compact="tight" label="Tempat/Tgl Lahir" value={formatTTL(formData.childBirthPlace || '', formData.childBirthDate || '')} />
              <DataRow compact="tight" label="Jenis Kelamin" value={formData.childGender} />
              <DataRow compact="tight" label="Pekerjaan" value={formData.childJob} />
              <DataRow compact="tight" label="Alamat" value={formData.childAddress} />
            </tbody>
          </table>

          <p className="mt-2.5 text-justify leading-normal">
            Nama tersebut di atas adalah benar-benar warga kami dan tergolong keluarga yang tidak mampu / keluarga berpenghasilan rendah. Surat keterangan ini dibuat untuk keperluan : <strong>{formData.purpose}</strong>.
          </p>
        </>
      ) : (
        <p className="mt-3 text-justify leading-normal">
          Nama tersebut di atas adalah benar-benar warga kami dan tergolong keluarga yang tidak mampu / keluarga berpenghasilan rendah. Surat keterangan ini dibuat untuk keperluan : <strong>{formData.purpose}</strong>.
        </p>
      )}

      <p className="mt-2.5 text-justify leading-normal">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
