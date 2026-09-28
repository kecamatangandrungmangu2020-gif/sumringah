/**
 * @fileOverview Data anggaran APBDes Kecamatan Gandrungmangu 2026.
 */

export interface ApbItem {
  bidang: number;
  kode: string;
  uraian: string;
  volume: string;
  satuan: string;
  nominal: number;
  sumber: string;
}

export const BIDANG_NAMES: Record<number, string> = {
  1: "Penyelenggaraan Pemerintahan",
  2: "Pelaksanaan Pembangunan",
  3: "Pembinaan Kemasyarakatan",
  4: "Pemberdayaan Masyarakat",
  5: "Penanggulangan Bencana",
};

export const APB_DATA: ApbItem[] = [
  { bidang: 1, kode: "1.1.04", uraian: "Penyediaan Operasional Karyawan Kecamatan (Internet)", volume: "-", satuan: "-", nominal: 5100000, sumber: "DD" },
  { bidang: 1, kode: "1.1.08", uraian: "Operasional Pemdes (Dana Kecamatan) – Rapat & Perjalanan", volume: "135", satuan: "Orang", nominal: 11203000, sumber: "DD" },
  { bidang: 1, kode: "1.3.91", uraian: "Pemutakhiran Data SDGs Kecamatan", volume: "50", satuan: "Orang", nominal: 8680900, sumber: "DD" },
  { bidang: 1, kode: "1.4.0101", uraian: "Musdes Penyusunan RKPDes", volume: "80", satuan: "Orang", nominal: 2950000, sumber: "DD" },
  { bidang: 1, kode: "1.4.0102", uraian: "Pramusrenbangdes", volume: "80", satuan: "Orang", nominal: 2950000, sumber: "DD" },
  { bidang: 1, kode: "1.4.0103", uraian: "Musrenbangdes", volume: "120", satuan: "Orang", nominal: 6000000, sumber: "DD" },
  { bidang: 1, kode: "1.4.0104", uraian: "Musdes Realisasi APBDes 2025", volume: "23", satuan: "Orang", nominal: 955000, sumber: "DD" },
  { bidang: 1, kode: "1.4.0105", uraian: "Musdes Penetapan Perdes APBDes 2027", volume: "23", satuan: "Orang", nominal: 955000, sumber: "DD" },
  { bidang: 1, kode: "1.4.0106", uraian: "Musdes Penetapan Perdes APBDes Perubahan", volume: "23", satuan: "Orang", nominal: 955000, sumber: "DD" },
  { bidang: 1, kode: "1.4.0107", uraian: "Musdes LPPD dan LKPJ", volume: "23", satuan: "Orang", nominal: 955000, sumber: "DD" },
  { bidang: 1, kode: "1.4.0201", uraian: "Musdes KPM BLT", volume: "80", satuan: "Orang", nominal: 2950000, sumber: "DD" },
  { bidang: 1, kode: "1.4.0202", uraian: "Rembug Stunting", volume: "80", satuan: "Orang", nominal: 2950000, sumber: "DD" },
  { bidang: 1, kode: "1.4.0203", uraian: "Panitia HUT RI", volume: "80", satuan: "Orang", nominal: 2950000, sumber: "DD" },
  { bidang: 1, kode: "1.4.0204", uraian: "Musdes KDMP", volume: "50", satuan: "Orang", nominal: 2337000, sumber: "DD" },
  { bidang: 1, kode: "1.4.03", uraian: "Penyusunan Dokumen RKPDes", volume: "26", satuan: "Orang", nominal: 1116000, sumber: "DD" },
  { bidang: 1, kode: "1.4.08", uraian: "Pengembangan Sistem Informasi Kecamatan", volume: "-", satuan: "-", nominal: 5500000, sumber: "DD" },
  { bidang: 2, kode: "2.1.01", uraian: "Honor Guru TK Pertiwi", volume: "1", satuan: "Orang", nominal: 3600000, sumber: "DD" },
  { bidang: 2, kode: "2.2.02", uraian: "Penyelenggaraan Posyandu", volume: "-", satuan: "-", nominal: 78624000, sumber: "DD" },
  { bidang: 2, kode: "2.2.0401", uraian: "Penyuluhan Edukasi Gizi", volume: "54", satuan: "Orang", nominal: 2240000, sumber: "DD" },
  { bidang: 2, kode: "2.2.0402", uraian: "Rontgen Portal (TBC)", volume: "150", satuan: "Orang", nominal: 2650000, sumber: "DD" },
  { bidang: 2, kode: "2.3.05", uraian: "Pemeliharaan Saluran Air", volume: "-", satuan: "-", nominal: 5000000, sumber: "DD" },
  { bidang: 2, kode: "2.3.12", uraian: "Pembangunan JUT Jalan Mawar 1", volume: "-", satuan: "-", nominal: 150320200, sumber: "DD" },
  { bidang: 2, kode: "2.3.13", uraian: "Rehabilitasi Jembatan Plat Decker", volume: "-", satuan: "-", nominal: 16231600, sumber: "DD" },
  { bidang: 2, kode: "2.3.90", uraian: "Pembangunan Talud Jl Melati 1", volume: "-", satuan: "-", nominal: 9952220, sumber: "DD" },
  { bidang: 2, kode: "2.6.02", uraian: "Penyelenggaraan Informasi Publik Kecamatan", volume: "-", satuan: "-", nominal: 3000000, sumber: "DD" },
  { bidang: 3, kode: "3.3.0101", uraian: "Pengiriman Kontingen Sepak Bola", volume: "18", satuan: "Orang", nominal: 3480000, sumber: "DD" },
  { bidang: 3, kode: "3.3.0102", uraian: "Pengiriman Kontingen Bola Voli", volume: "10", satuan: "Orang", nominal: 2400000, sumber: "DD" },
  { bidang: 4, kode: "4.4.0101", uraian: "Pelatihan Mengenali Tanda Kurang Gizi", volume: "54", satuan: "Orang", nominal: 6290000, sumber: "DD" },
  { bidang: 4, kode: "4.4.0102", uraian: "Pelatihan Membuat MP ASI", volume: "54", satuan: "Orang", nominal: 6290000, sumber: "DD" },
  { bidang: 4, kode: "4.5.01", uraian: "Pelatihan Manajemen KDKMP", volume: "30", satuan: "Orang", nominal: 4200000, sumber: "DD" },
  { bidang: 4, kode: "4.5.02", uraian: "Dukungan KDKMP", volume: "-", satuan: "-", nominal: 704930000, sumber: "DD" },
  { bidang: 5, kode: "5.1.00", uraian: "Penanggulangan Bencana", volume: "-", satuan: "-", nominal: 1408080, sumber: "DD" },
  { bidang: 5, kode: "5.3.00", uraian: "BLTD", volume: "6", satuan: "Orang", nominal: 21600000, sumber: "DD" },
  { bidang: 1, kode: "1.1.01", uraian: "Penyediaan Penghasilan Tetap dan Tunjangan Kepala Kecamatan", volume: "1", satuan: "Orang", nominal: 56000000, sumber: "ADD" },
  { bidang: 1, kode: "1.1.02", uraian: "Penyediaan Penghasilan Tetap dan Tunjangan Karyawan Kecamatan", volume: "15", satuan: "Orang", nominal: 478800000, sumber: "ADD" },
  { bidang: 1, kode: "1.1.03", uraian: "Penyediaan Jaminan Sosial bagi Kepala Kecamatan dan Karyawan Kecamatan", volume: "15", satuan: "Orang", nominal: 2475360, sumber: "ADD" },
  { bidang: 1, kode: "1.1.04", uraian: "Penyediaan Operasional Karyawan Kecamatan (ATK, Honor PKPKD dan PPKD dll)", volume: "-", satuan: "-", nominal: 913797, sumber: "ADD" },
  { bidang: 1, kode: "1.1.05", uraian: "Penyediaan Tunjangan SKRETARIS Kecamatan", volume: "7", satuan: "Orang", nominal: 39200000, sumber: "ADD" },
  { bidang: 1, kode: "1.1.06", uraian: "Penyediaan Operasional SKRETARIS Kecamatan", volume: "1", satuan: "Orang", nominal: 929880, sumber: "ADD" },
  { bidang: 1, kode: "1.1.07", uraian: "Penyediaan Insentif/Operasional KEPALA Kecamatan", volume: "1", satuan: "Orang", nominal: 7571880, sumber: "ADD" },
  { bidang: 1, kode: "1.3.01", uraian: "Pelayanan Administrasi Umum dan Kependudukan", volume: "12", satuan: "Bulan", nominal: 136800000, sumber: "ADD" },
  { bidang: 1, kode: "1.4.10", uraian: "Dukungan & Sosialisasi Pelaksanaan Pilkades, Pemilihan Ka. Kewilayahan & SKRETARIS Kecamatan", volume: "120", satuan: "Orang", nominal: 2560000, sumber: "ADD" },
  { bidang: 1, kode: "1.1.04", uraian: "Operasional Karyawan Kecamatan (BHP/R) – ATK, Honor PKPKD, PPKD, Perjalanan Dinas", volume: "7", satuan: "Orang", nominal: 109315000, sumber: "PBK" },
  { bidang: 1, kode: "1.1.06", uraian: "Operasional SKRETARIS Kecamatan (Rapat, ATK, Makan Minum)", volume: "46", satuan: "Orang", nominal: 2500000, sumber: "PBK" },
  { bidang: 1, kode: "1.1.07", uraian: "Operasional KEPALA Kecamatan (ATK)", volume: "-", satuan: "-", nominal: 1116000, sumber: "PBK" },
  { bidang: 1, kode: "1.1.92", uraian: "Operasional Lembaga Kemasyarakatan Kecamatan (Seragam KEPALA Kecamatan & Kader Posyandu)", volume: "117", satuan: "Orang", nominal: 35100000, sumber: "PBK" },
  { bidang: 1, kode: "1.4.10", uraian: "Dukungan Pelaksanaan Pilkades (Rapat, Snack, Honor Panitia)", volume: "302", satuan: "Orang", nominal: 20148000, sumber: "PBK" },
  { bidang: 3, kode: "3.1.02", uraian: "Penguatan & Peningkatan Kapasitas Satinimas", volume: "35", satuan: "Orang", nominal: 10811000, sumber: "PBK" },
  { bidang: 4, kode: "4.3.90", uraian: "Peningkatan Kapasitas Karyawan Kecamatan dan/atau SKRETARIS Kecamatan (BIMTEK APBDes)", volume: "53", satuan: "Orang", nominal: 6231000, sumber: "PBK" },
];
