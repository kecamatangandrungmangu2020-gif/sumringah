/**
 * @fileOverview Utilitas penomoran otomatis untuk Naskah Dinas & Buku Agenda.
 */

import { getDocs, collection, query, where, orderBy, limit, Firestore, addDoc } from "firebase/firestore";

export type NaskahType = 'UND' | 'SK' | 'BA' | 'ST';

export const CLASSIFICATION_CODES = [
  { code: "000", label: "Umum" },
  { code: "100", label: "Pemerintahan" },
  { code: "140", label: "Pemerintahan Kecamatan/Kelurahan" },
  { code: "141", label: "Karyawan Kecamatan" },
  { code: "142", label: "SKRETARIS Kecamatan" },
  { code: "143", label: "Lembaga Kemasyarakatan" },
  { code: "145", label: "Administrasi Kecamatan" },
  { code: "146", label: "Kekayaan Kecamatan" },
  { code: "147", label: "Pembangunan Kecamatan" },
  { code: "148", label: "Pemilihan Kepala Kecamatan" },
  { code: "149", label: "Pertanahan Kecamatan" },
  { code: "200", label: "Politik" },
  { code: "300", label: "Keamanan & Ketertiban" },
  { code: "400", label: "Kesejahteraan Rakyat" },
  { code: "410", label: "Pembangunan" },
  { code: "411", label: "Infrastruktur" },
  { code: "420", label: "Pendidikan" },
  { code: "430", label: "Kesehatan" },
  { code: "440", label: "Sosial" },
  { code: "470", label: "Kependudukan" },
  { code: "471", label: "KTP & KK" },
  { code: "472", label: "Pindah Datang Penduduk" },
  { code: "474", label: "Catatan Sipil" },
  { code: "500", label: "Perekonomian" },
  { code: "510", label: "Perdagangan" },
  { code: "520", label: "Pertanian" },
  { code: "530", label: "Perindustrian" },
  { code: "540", label: "Perhubungan" },
  { code: "600", label: "Pekerjaan Umum" },
  { code: "700", label: "Pengawasan" },
  { code: "800", label: "Kepegawaian" },
  { code: "900", label: "Keuangan" },
  { code: "910", label: "APBDes" },
  { code: "912", label: "Pengelolaan Keuangan Kecamatan" },
];

/**
 * Mendapatkan nomor urut terbaru dari Buku Agenda.
 */
export async function getNextSequenceNumber(db: Firestore, kategori: string, classification: string = "000"): Promise<string> {
  const currentYear = new Date().getFullYear().toString();

  // Gunakan kategori 'sppd' sebagai acuan urutan untuk 'surat_tugas_sppd' agar sinkron
  const targetCategory = kategori === 'surat_tugas_sppd' ? 'surat_keluar' : kategori;

  const q = query(
    collection(db, "buku_agenda"),
    where("kategori", "==", targetCategory),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  const snapshot = await getDocs(q);
  let nextVal = 1;

  if (!snapshot.empty) {
    // Cari dokumen terbaru yang dibuat pada tahun berjalan
    const yearDocs = snapshot.docs.filter(d => (d.data().createdAt || "").substring(0, 4) === currentYear);

    if (yearDocs.length > 0) {
      const latestDoc = yearDocs[0].data();
      const lastNomor = latestDoc.nomor || "";

      // Bedah nomor berdasarkan pemisah miring (/)
      // Contoh: 027 / 001 / BA / 2026 -> parts: ["027", "001", "BA", "2026"]
      const parts = lastNomor.split(/[\/\s]+/).filter(Boolean);

      if (parts.length >= 2) {
        // Pada standar penomoran Kecamatan, nomor urut biasanya berada di segmen kedua
        const possibleSeq = parts[1];
        const seqInt = parseInt(possibleSeq);
        if (!isNaN(seqInt)) {
          nextVal = seqInt + 1;
        }
      } else {
        // Fallback jika format tidak standar: cari 3 digit angka pertama
        const match = lastNomor.match(/(\d{3})/);
        if (match) {
          nextVal = parseInt(match[1]) + 1;
        }
      }
    }
  }

  const paddedNum = nextVal.toString().padStart(3, '0');

  // Mengembalikan format tanpa spasi agar parsing di frontend lebih akurat
  if (kategori === "sppd") {
    return `000.1.2.3/${paddedNum}/04/${currentYear}`;
  }

  if (kategori === "surat_tugas_sppd") {
    return `800.1.11.1/${paddedNum}/04/${currentYear}`;
  }

  return `${classification}/${paddedNum}/04/${currentYear}`;
}

/**
 * Mencatat otomatis ke Buku Agenda saat dokumen difinalkan.
 */
export async function saveToBukuAgenda(db: Firestore, data: { kategori: string, nomor: string, perihal: string, userId: string }) {
  const agendaRef = collection(db, "buku_agenda");
  return addDoc(agendaRef, {
    ...data,
    tanggal: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  });
}

export const NASKAH_CONFIG = {
  UND: { label: 'Surat Undangan', code: 'UND', kategori: 'surat_keluar' },
  SK: { label: 'Surat Keputusan', code: 'SK', kategori: 'sk' },
  BA: { label: 'Berita Acara', code: 'BA', kategori: 'surat_keluar' },
  ST: { label: 'Surat Tugas', code: 'ST', kategori: 'surat_keluar' },
};
