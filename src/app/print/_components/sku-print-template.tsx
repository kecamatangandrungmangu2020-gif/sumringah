'use client';

import { LetterSubmission } from '@/lib/types';
import { PrintLayout, DataRow, formatTTL } from './print-layout';

export function SkuPrintTemplate({ submission }: { submission: LetterSubmission }) {
    const { formData } = submission;

    return (
        <PrintLayout submission={submission} hideRequesterSignature={true}>
            <p className="mt-3 text-justify leading-normal">
                Yang bertanda tangan di bawah ini CAMAT GANDRUNGMANGU Kecamatan
                Gandrungmangu, Kabupaten Cilacap, menerangkan dengan sebenar-benarnya bahwa :
            </p>

            <table className="mt-2 border-collapse w-full">
                <tbody>
                    <DataRow compact="tight" label="Nama" value={formData.name} />
                    <DataRow compact="tight" label="NIK" value={formData.nik} />
                    <DataRow compact="tight" label="Tempat/Tgl Lahir" value={formatTTL(formData.birthPlace, formData.birthDate)} />
                    <DataRow compact="tight" label="Jenis Kelamin" value={formData.gender} />
                    <DataRow compact="tight" label="Alamat" value={formData.address} />
                    <DataRow compact="tight" label="Pekerjaan" value={formData.job} />
                </tbody>
            </table>

            <p className="mt-2.5 text-justify leading-normal">
                Adalah benar yang bersangkutan memiliki usaha dengan keterangan sebagai berikut:
            </p>
            <table className="mt-2 border-collapse w-full">
                <tbody>
                    <DataRow compact="tight" label="Nama Usaha" value={formData.businessName} />
                    <DataRow compact="tight" label="Jenis Usaha" value={formData.businessType} />
                    <DataRow compact="tight" label="Alamat Usaha" value={formData.businessAddress} />
                    <DataRow compact="tight" label="Berdiri Sejak" value={formData.businessSince} />
                </tbody>
            </table>

            <p className="mt-2.5 text-justify leading-normal">
                Surat keterangan ini dibuat untuk keperluan : <strong>{formData.purpose}</strong>
            </p>
            <p className="mt-2 text-justify leading-normal">
                Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
            </p>
        </PrintLayout>
    );
}
