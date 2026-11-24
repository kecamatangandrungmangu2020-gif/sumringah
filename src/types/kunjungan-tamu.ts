export type VisitorStatusType =
  | 'warga_umum'
  | 'perangkat_desa'
  | 'instansi_pemerintah'
  | 'ormas_lembaga'
  | 'kurir_rekanan';

export type KunjunganCategory =
  | 'KUNJUNGAN_TAMU'
  | 'PENGAJUAN_PROPOSAL'
  | 'PENYERAHAN_SPJ_BERKAS'
  | 'SURAT_KETERANGAN_NON_PATEN'
  | 'PENGIRIMAN_BARANG'
  | 'PENGADUAN';

export type KunjunganStatus =
  | 'MENUNGGU'
  | 'DIPROSES'
  | 'DIDISPOSISI'
  | 'SELESAI'
  | 'DITOLAK';

export type InputChannel = 'mandiri_hp' | 'kiosk' | 'front_office';

export interface TrackingLogItem {
  timestamp: string;
  status: KunjunganStatus;
  actor: string;
  note: string;
}

export interface VisitorIdentity {
  status: VisitorStatusType;
  nama: string;
  whatsapp: string;
  asal_desa_instansi: string;
  asal_manual?: string;
  nik?: string;
}

export interface AttachmentMeta {
  name: string;
  type: string;
  dataUrl: string;
}

export interface KunjunganTamuRecord {
  id?: string;
  ticket_id: string;
  created_at: string;
  updated_at?: string;
  input_channel: InputChannel;
  visitor: VisitorIdentity;
  category: KunjunganCategory;
  target_section: string;
  summary: string;
  details: Record<string, any>;
  attachment?: AttachmentMeta | null;
  status: KunjunganStatus;
  tracking_logs: TrackingLogItem[];
  skm_rating?: number | null;
  skm_feedback?: string;
}

export const DAFTAR_DESA_GANDRUNGMANGU = [
  'Desa Bulusari',
  'Desa Cinangsi',
  'Desa Cisumur',
  'Desa Gandrungmangu',
  'Desa Gandrungmanis',
  'Desa Gintungreja',
  'Desa Karanganyar',
  'Desa Karanggintung',
  'Desa Kertajaya',
  'Desa Layansari',
  'Desa Muktisari',
  'Desa Rungkang',
  'Desa Sidaurip',
  'Desa Wringinharjo',
] as const;

export const VISITOR_STATUS_OPTIONS: { value: VisitorStatusType; label: string }[] = [
  { value: 'warga_umum', label: 'Warga Umum / Perorangan' },
  { value: 'perangkat_desa', label: 'Perangkat Desa / Lembaga Desa' },
  { value: 'instansi_pemerintah', label: 'Instansi Pemerintah / TNI / Polri' },
  { value: 'ormas_lembaga', label: 'Ormas / Panitia / Lembaga' },
  { value: 'kurir_rekanan', label: 'Kurir / Ekspedisi / Rekanan' },
];

export const TARGET_SECTION_OPTIONS = [
  'Camat Gandrungmangu',
  'Sekretaris Kecamatan (Sekcam)',
  'Kasi Pemerintahan',
  'Kasi Pemberdayaan Masyarakat (PMD)',
  'Kasi Ketenteraman & Ketertiban (Trantib)',
  'Kasi Kesejahteraan Rakyat (Kesra)',
  'Kasubag Umum & Kepegawaian (Umpeg)',
  'Kasubag Keuangan & Perencanaan',
  'Front Office / Gudang Logistik',
] as const;

export const CATEGORY_META: Record<
  KunjunganCategory,
  {
    label: string;
    shortLabel: string;
    description: string;
    requiresNik: boolean;
    defaultSection: string;
    colorClass: string;
    badgeBg: string;
  }
> = {
  KUNJUNGAN_TAMU: {
    label: 'Kunjungan Tamu / Konsultasi / Audiensi',
    shortLabel: 'Tamu',
    description: 'Bertemu pejabat/staf kecamatan untuk konsultasi, koordinasi, atau audiensi.',
    requiresNik: false,
    defaultSection: 'Camat Gandrungmangu',
    colorClass: 'text-cyan-700 dark:text-cyan-300',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  },
  PENGAJUAN_PROPOSAL: {
    label: 'Pengajuan Proposal',
    shortLabel: 'Proposal',
    description: 'Proposal hibah/bansos, kegiatan karang taruna/ormas, atau pembangunan infrastruktur.',
    requiresNik: false,
    defaultSection: 'Camat Gandrungmangu',
    colorClass: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  },
  PENYERAHAN_SPJ_BERKAS: {
    label: 'Penyerahan SPJ & Berkas Laporan Desa',
    shortLabel: 'SPJ / Berkas',
    description: 'SPJ Dana Desa/ADD, laporan bulanan, dokumen APBDes/RKPDes, dan berkas monev.',
    requiresNik: false,
    defaultSection: 'Kasi Pemberdayaan Masyarakat (PMD)',
    colorClass: 'text-emerald-700 dark:text-emerald-300',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  },
  SURAT_KETERANGAN_NON_PATEN: {
    label: 'Surat Masuk & Surat Keterangan (Non-PATEN)',
    shortLabel: 'Surat',
    description: 'Surat undangan, pemberitahuan, edaran, atau surat keterangan antar-instansi/desa.',
    requiresNik: false,
    defaultSection: 'Sekretaris Kecamatan (Sekcam)',
    colorClass: 'text-indigo-700 dark:text-indigo-300',
    badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
  },
  PENGIRIMAN_BARANG: {
    label: 'Pengiriman Barang / Paket / Logistik',
    shortLabel: 'Barang',
    description: 'Pengantaran barang pengadaan, ATK, bantuan logistik, atau paket ekspedisi/kurir.',
    requiresNik: false,
    defaultSection: 'Kasubag Umum & Kepegawaian (Umpeg)',
    colorClass: 'text-orange-700 dark:text-orange-300',
    badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-400/30',
  },
  PENGADUAN: {
    label: 'Pengaduan & Aspirasi Masyarakat',
    shortLabel: 'Pengaduan',
    description: 'Laporan keluhan, aduan infrastruktur/sosial/trantib, atau permohonan fasilitasi.',
    requiresNik: false,
    defaultSection: 'Kasi Ketenteraman & Ketertiban (Trantib)',
    colorClass: 'text-rose-700 dark:text-rose-300',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
  },
};

export const STATUS_META: Record<
  KunjunganStatus,
  { label: string; lightBadge: string; darkBadge: string }
> = {
  MENUNGGU: {
    label: 'Menunggu',
    lightBadge: 'bg-amber-100 text-amber-800 border-amber-200',
    darkBadge: 'bg-amber-500/20 text-amber-300 border-amber-400/35',
  },
  DIPROSES: {
    label: 'Diproses',
    lightBadge: 'bg-sky-100 text-sky-800 border-sky-200',
    darkBadge: 'bg-sky-500/20 text-sky-300 border-sky-400/35',
  },
  DIDISPOSISI: {
    label: 'Didisposisi',
    lightBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    darkBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/35',
  },
  SELESAI: {
    label: 'Selesai',
    lightBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    darkBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35',
  },
  DITOLAK: {
    label: 'Ditolak / Dikembalikan',
    lightBadge: 'bg-rose-100 text-rose-800 border-rose-200',
    darkBadge: 'bg-rose-500/20 text-rose-300 border-rose-400/35',
  },
};
