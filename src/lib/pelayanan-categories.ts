export interface PelayananCategory {
  id: string;
  label: string;
  description?: string;
}

export const PELAYANAN_CATEGORIES: PelayananCategory[] = [
  { id: 'standar-pelayanan', label: 'Standar Pelayanan Publik' },
  { id: 'visi-misi', label: 'Visi & Misi Pelayanan' },
  { id: 'maklumat', label: 'Maklumat Pelayanan' },
  { id: 'pojok-baca', label: 'Pojok Baca / Informasi' },
  { id: 'regulasi-Kecamatan', label: 'Regulasi & Peraturan Kecamatan' },
  { id: 'panduan-layanan', label: 'Panduan Syarat Layanan' },
  { id: 'lainnya', label: 'Informasi Publik Lainnya' }
];

export function getCategoryLabel(id: string): string {
  const found = PELAYANAN_CATEGORIES.find(c => c.id === id);
  return found ? found.label : id;
}
