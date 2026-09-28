'use client';
import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, toProperCase } from './print-layout';

export function PindahPrintTemplate({ submission }: { submission: LetterSubmission }) {
  const { formData } = submission;

  return (
    <PrintLayout
      submission={submission}
      inlineSignatures={true}
      fontSize="12pt"
    >
      <p className="mt-3 text-justify leading-normal">
        Yang bertanda tangan di bawah ini CAMAT GANDRUNGMANGU Kecamatan
        Gandrungmangu, Kabupaten Cilacap, menerangkan bahwa:
      </p>

      <table className="mt-2 border-collapse w-full">
        <tbody>
          <DataRow compact="tight" label="Nama Lengkap" value={formData.name} />
          <DataRow compact="tight" label="NIK" value={formData.nik} />
          <DataRow compact="tight" label="Nomor KK" value={formData.kkNumber} />
          <DataRow compact="tight" label="Nama Kepala Keluarga" value={formData.kkHead} />
          <DataRow
            compact="tight"
            label="Alamat Asal"
            value={`Kecamatan Gandrungmangu, RT ${formData.currentAddressRt} / RW ${formData.currentAddressRw}, Kecamatan Gandrungmangu, Kabupaten Cilacap, Provinsi Jawa Tengah`}
          />
        </tbody>
      </table>

      <p className="mt-2.5 text-justify leading-normal">
        Bermaksud untuk pindah alamat ke:
      </p>

      <table className="mt-2 border-collapse w-full">
        <tbody>
          <DataRow
            compact="tight"
            label="Alamat Tujuan"
            value={`Kecamatan ${formData.destinationAddress}, RT ${formData.destinationAddressRt} / RW ${formData.destinationAddressRw}, Kecamatan ${formData.destinationKecamatan}, Kabupaten ${formData.destinationKabupaten}, Provinsi ${formData.destinationProvinsi}`}
          />
          <DataRow compact="tight" label="Jumlah Keluarga" value={`${formData.familyCount} orang`} />
        </tbody>
      </table>

      {formData.familyMembers && formData.familyMembers.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 font-semibold leading-normal">Adapun anggota keluarga yang ikut pindah adalah sebagai berikut:</p>
          <table className="w-full border-collapse border border-black text-[11pt]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-1 text-center w-10">No</th>
                <th className="border border-black px-2 py-1 text-left w-[32%]">NIK</th>
                <th className="border border-black px-2 py-1 text-left">Nama Lengkap</th>
                <th className="border border-black px-2 py-1 text-left w-[20%]">SHDK</th>
              </tr>
            </thead>
            <tbody>
              {formData.familyMembers.map((member: any, index: number) => (
                <tr key={index}>
                  <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
                  <td className="border border-black px-2 py-1">{member.nik}</td>
                  <td className="border border-black px-2 py-1">{toProperCase(member.name)}</td>
                  <td className="border border-black px-2 py-1">{member.relationship ? member.relationship.toUpperCase() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-justify leading-normal">
        Surat pengantar ini dibuat sebagai kelengkapan administrasi untuk proses pindah domisili yang bersangkutan.
      </p>
      <p className="mt-2 text-justify leading-normal">
        Demikian surat pengantar ini dibuat untuk dapat dipergunakan sebagaimana mestinya.
      </p>
    </PrintLayout>
  );
}
