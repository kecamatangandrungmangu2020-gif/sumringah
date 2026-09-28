'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, formatTTL, toProperCase } from './print-layout';

/**
 * Custom data row for the Birth Certificate template.
 * Uses 3 columns to ensure multiline alignment (e.g. for address).
 */
const CustomDataRow = ({ label, value, indent = false }: { label: string; value?: any; indent?: boolean }) => {
  const colon = value !== undefined && value !== null ? ':' : '';
  let displayValue = value !== undefined && value !== null ? value : '';

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

  return (
    <tr>
      <td className={`py-1 align-top ${indent ? 'pl-8 w-[35%]' : 'w-[30%]'}`}>{label}</td>
      <td className="w-[2%] py-1 align-top text-center">{colon}</td>
      <td className="w-[68%] py-1 align-top pl-1">{displayValue}</td>
    </tr>
  );
};

export function KelahiranPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  const displayWeight = formData.birthWeight
    ? (String(formData.birthWeight).toLowerCase().includes('kg') ? formData.birthWeight : `${formData.birthWeight} Kg`)
    : '-';

  const displayLength = formData.birthLength
    ? (String(formData.birthLength).toLowerCase().includes('cm') ? formData.birthLength : `${formData.birthLength} Cm`)
    : '-';

  const pages = [
    // ========================================================
    // LEMBAR I: DATA ANAK & DATA ORANG TUA
    // ========================================================
    {
      showKop: true,
      title: submission.letterType.toUpperCase(),
      subtitle: `Nomor : ${submission.documentNumber}`,
      content: (
        <>
          <p className="mt-3 text-justify leading-relaxed">
            Yang bertanda tangan di bawah ini, CAMAT GANDRUNGMANGU Kecamatan
            Gandrungmangu, Kabupaten Cilacap, dengan ini menerangkan kepada :
          </p>

          <table className="mt-3 border-collapse w-full text-sm">
            <tbody>
              <tr><td colSpan={3} className="pb-1.5 font-bold border-b text-slate-900 uppercase tracking-wide">I. DATA ANAK</td></tr>
              <CustomDataRow label="Nama Anak" value={formData.childName} />
              <CustomDataRow label="Jenis Kelamin" value={formData.childGender} />
              <CustomDataRow label="NIK Anak" value={formData.childNik || '-'} />
              <CustomDataRow label="Tempat / Tgl Lahir" value={formatTTL(formData.childBirthPlace, formData.childBirthDate)} />
              <CustomDataRow label="Waktu Lahir" value={formData.childBirthTime} />
              <CustomDataRow label="Tempat Dilahirkan" value={formData.childBirthLocation} />
              <CustomDataRow label="Anak Ke" value={formData.childOrder} />
              <CustomDataRow label="Berat Bayi" value={displayWeight} />
              <CustomDataRow label="Panjang Bayi" value={displayLength} />
              <CustomDataRow label="Penolong Kelahiran" value={formData.birthAssistant} />
              <CustomDataRow label="Alamat" value={formData.childAddress} />

              <tr><td colSpan={3} className="pt-4 pb-1.5 font-bold border-b text-slate-900 uppercase tracking-wide">II. DATA ORANG TUA</td></tr>

              <CustomDataRow label="IBU" value={null} />
              <CustomDataRow label="Nama" value={formData.motherName} indent />
              <CustomDataRow label="Tempat/Tgl Lahir" value={formatTTL(formData.motherBirthPlace, formData.motherBirthDate)} indent />
              <CustomDataRow label="Pekerjaan" value={formData.motherJob} indent />
              <CustomDataRow label="Alamat" value={formData.motherAddress} indent />

              <CustomDataRow label="AYAH" value={null} />
              <CustomDataRow label="Nama" value={formData.fatherName} indent />
              <CustomDataRow label="NIK Ayah" value={formData.fatherNik} indent />
              <CustomDataRow label="Tempat/Tgl Lahir" value={formatTTL(formData.fatherBirthPlace, formData.fatherBirthDate)} indent />
              <CustomDataRow label="Pekerjaan" value={formData.fatherJob} indent />
              <CustomDataRow label="Alamat" value={formData.fatherAddress} indent />
            </tbody>
          </table>

          <div className="mt-8 text-right pr-2">
            <span className="text-xs text-slate-400 italic">( Bersambung ke Lembar II )</span>
          </div>
        </>
      ),
      pageNumber: 1,
      totalPages: 2
    },

    // ========================================================
    // LEMBAR II: DATA PELAPOR & SAKSI SERTA PENGESAHAN
    // ========================================================
    {
      showKop: false,
      content: (
        <>
          <table className="border-collapse w-full text-sm">
            <tbody>
              <tr><td colSpan={3} className="pb-2 font-bold border-b text-slate-900 uppercase tracking-wide">III. DATA PELAPOR & SAKSI</td></tr>

              <CustomDataRow label="PELAPOR" value={formData.reporterName} />
              <CustomDataRow label="NIK Pelapor" value={formData.reporterNik} indent />
              <CustomDataRow label="Umur" value={formData.reporterAge ? `${formData.reporterAge} Tahun` : '-'} indent />
              <CustomDataRow label="Pekerjaan" value={formData.reporterJob} indent />
              <CustomDataRow label="Alamat" value={formData.reporterAddress} indent />

              <CustomDataRow label="SAKSI I" value={formData.witness1Name} />
              <CustomDataRow label="NIK Saksi I" value={formData.witness1Nik} indent />
              <CustomDataRow label="Umur" value={formData.witness1Age ? `${formData.witness1Age} Tahun` : '-'} indent />
              <CustomDataRow label="Pekerjaan" value={formData.witness1Job} indent />
              <CustomDataRow label="Alamat" value={formData.witness1Address} indent />

              <CustomDataRow label="SAKSI II" value={formData.witness2Name} />
              <CustomDataRow label="NIK Saksi II" value={formData.witness2Nik} indent />
              <CustomDataRow label="Umur" value={formData.witness2Age ? `${formData.witness2Age} Tahun` : '-'} indent />
              <CustomDataRow label="Pekerjaan" value={formData.witness2Job} indent />
              <CustomDataRow label="Alamat" value={formData.witness2Address} indent />
            </tbody>
          </table>

          <p className="mt-5 text-justify leading-relaxed">
            Demikian Surat Keterangan Lahir ini dibuat dengan sebenarnya untuk dapat digunakan sebagaimana mestinya.
          </p>
        </>
      ),
      showSignatures: true,
      inlineSignatures: true,
      pageNumber: 2,
      totalPages: 2
    }
  ];

  return (
    <PrintLayout
      submission={submission}
      requesterLabel="Pelapor"
      requesterNameOverride={formData.reporterName}
      pages={pages}
    />
  );
}
