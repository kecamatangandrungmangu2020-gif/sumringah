'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  CATEGORY_META,
  KunjunganCategory,
  KunjunganStatus,
  KunjunganTamuRecord,
  STATUS_META,
  TARGET_SECTION_OPTIONS,
} from '@/types/kunjungan-tamu';
import { printKunjunganReceipt } from './PrintReceipt';
import { PresentationSheet } from '@/components/landing/PresentationSheet';
import {
  Users,
  Search,
  RefreshCw,
  Printer,
  Plus,
  X,
  Clock,
  CheckCircle2,
  FileText,
  Send,
  Loader2,
  Eye,
  MessageCircle,
} from 'lucide-react';

const SKM_SURVEY_URL = 'https://skm.go.id/share/instansi/804defd3-958e-48f9-b9db-10f0ef7a3d29/1';

function buildWhatsAppFinishUrl(record: KunjunganTamuRecord): string {
  let phone = (record.visitor?.whatsapp || '').replace(/\D/g, '');
  if (phone.startsWith('0')) {
    phone = '62' + phone.slice(1);
  } else if (phone && !phone.startsWith('62')) {
    phone = '62' + phone;
  }

  const catLabel = CATEGORY_META[record.category]?.label || record.category;
  const latestNote =
    record.tracking_logs && record.tracking_logs.length > 0
      ? record.tracking_logs[record.tracking_logs.length - 1]?.note
      : '';

  const text = [
    `Yth. Bapak/Ibu *${record.visitor.nama}*,`,
    ``,
    `Kami informasikan bahwa permohonan/kunjungan Anda di *Kecamatan Gandrungmangu* telah *SELESAI* ditindaklanjuti:`,
    `• Kode Tiket: *${record.ticket_id}*`,
    `• Keperluan: ${catLabel}`,
    `• Tujuan/Seksi: ${record.target_section}`,
    latestNote ? `• Catatan: ${latestNote}` : '',
    ``,
    `Mohon kesediaan Bapak/Ibu untuk mengisi Survei Kepuasan Masyarakat (SKM) guna meningkatkan kualitas pelayanan kami melalui tautan berikut:`,
    SKM_SURVEY_URL,
    ``,
    `Terima kasih telah berkunjung. Salam *SEMRINGAH* — Pemerintah Kecamatan Gandrungmangu.`,
  ]
    .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
    .join('\n');

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function getTodayYmdWib(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wib.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function RekapKunjunganTamuCard() {
  const [records, setRecords] = useState<KunjunganTamuRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dateMode, setDateMode] = useState<'today' | 'all' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(getTodayYmdWib());
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [selected, setSelected] = useState<KunjunganTamuRecord | null>(null);
  const [nextStatus, setNextStatus] = useState<KunjunganStatus>('DIPROSES');
  const [nextSection, setNextSection] = useState<string>('');
  const [disposisiNote, setDisposisiNote] = useState('');
  const [actorName, setActorName] = useState('Petugas Front Office');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  const fetchFromApi = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/kunjungan-tamu?date=all&limit=200', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecords(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFromApi();
    if (!db) return;
    try {
      const q = query(collection(db, 'kunjungan_tamu'), orderBy('created_at', 'desc'), limit(200));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const items: KunjunganTamuRecord[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<KunjunganTamuRecord, 'id'>),
          }));
          setRecords(items);
          setLoading(false);
        },
        () => {}
      );
      return () => unsub();
    } catch {
      // ignore
    }
  }, [fetchFromApi]);

  const dateFiltered = useMemo(() => {
    if (dateMode === 'all') return records;
    const targetYmd = (dateMode === 'today' ? getTodayYmdWib() : customDate).replace(/-/g, '');
    return records.filter((r) => (r.ticket_id || '').includes(`-${targetYmd}-`));
  }, [records, dateMode, customDate]);

  const kpi = useMemo(() => {
    const byCategory: Record<KunjunganCategory, number> = {
      KUNJUNGAN_TAMU: 0,
      PENGAJUAN_PROPOSAL: 0,
      PENYERAHAN_SPJ_BERKAS: 0,
      SURAT_KETERANGAN_NON_PATEN: 0,
      PENGIRIMAN_BARANG: 0,
      PENGADUAN: 0,
    };
    let activeCount = 0;
    let doneCount = 0;

    dateFiltered.forEach((r) => {
      if (byCategory[r.category] !== undefined) byCategory[r.category] += 1;
      if (r.status === 'SELESAI') doneCount += 1;
      else if (r.status !== 'DITOLAK') activeCount += 1;
    });

    return { total: dateFiltered.length, activeCount, doneCount, byCategory };
  }, [dateFiltered]);

  const visibleRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return dateFiltered.filter((r) => {
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!q) return true;
      const asal =
        r.visitor.asal_desa_instansi === 'INSTANSI_LUAR'
          ? r.visitor.asal_manual || ''
          : r.visitor.asal_desa_instansi || '';
      return (
        (r.ticket_id || '').toLowerCase().includes(q) ||
        (r.visitor?.nama || '').toLowerCase().includes(q) ||
        asal.toLowerCase().includes(q) ||
        (r.summary || '').toLowerCase().includes(q) ||
        (r.target_section || '').toLowerCase().includes(q)
      );
    });
  }, [dateFiltered, categoryFilter, statusFilter, searchTerm]);

  const openDetailModal = (rec: KunjunganTamuRecord) => {
    setSelected(rec);
    setNextStatus(rec.status);
    setNextSection(rec.target_section);
    setDisposisiNote('');
    setUpdateMsg('');
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?.id) return;
    setUpdating(true);
    setUpdateMsg('');
    try {
      const res = await fetch('/api/kunjungan-tamu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          status: nextStatus,
          target_section: nextSection,
          actor: actorName,
          note: disposisiNote,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSelected(json.data);
        setRecords((prev) => prev.map((r) => (r.id === selected.id ? json.data : r)));
        setDisposisiNote('');
        setUpdateMsg('Status & riwayat disposisi berhasil diperbarui.');
      } else {
        setUpdateMsg(json.message || 'Gagal memperbarui status.');
      }
    } catch {
      setUpdateMsg('Kesalahan jaringan saat memperbarui.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <PresentationSheet
      id="rekap-kunjungan-tamu"
      sectionNumber="02"
      deckLabel="Front Office • Real-time"
      variant="light"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-hero font-bold text-2xl sm:text-3xl tracking-tight text-[#041E17] dark:text-white flex items-center gap-2.5">
            <Users className="h-6 w-6 text-[#065F46] dark:text-[#E5C882]" />
            <span>
              Rekap <span className="text-[#065F46] dark:text-[#E5C882]">Kunjungan Tamu</span>
            </span>
          </h2>
          <p className="mt-1 font-hero text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Pantau kunjungan tamu dinas, proposal, SPJ desa, surat non-PATEN, pengiriman barang, dan pengaduan secara real-time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchFromApi}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FAF8F5] hover:bg-[#F3EFE6] dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 font-hero text-xs font-bold text-[#041E17] dark:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#065F46] dark:text-[#E5C882] ${refreshing ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <Link
            href="/kunjungan-tamu/?channel=front_office"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full neu-btn-primary font-hero text-xs font-bold text-white text-decoration-none"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Input Tamu FO</span>
          </Link>
        </div>
      </div>

      {/* Ringkasan KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
        <div className="rounded-2xl bg-[#FAF8F5] dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 p-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Entri
          </span>
          <div className="font-hero text-2xl sm:text-3xl font-extrabold text-[#041E17] dark:text-white mt-0.5">
            {kpi.total}
          </div>
        </div>
        <div className="rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-700/40 p-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            Menunggu / Diproses
          </span>
          <div className="font-hero text-2xl sm:text-3xl font-extrabold text-amber-700 dark:text-[#C8A253] mt-0.5">
            {kpi.activeCount}
          </div>
        </div>
        <div className="rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-700/40 p-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Selesai Ditindaklanjuti
          </span>
          <div className="font-hero text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
            {kpi.doneCount}
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setCategoryFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-full font-hero text-[11px] font-bold transition-all cursor-pointer border ${
            categoryFilter === 'ALL'
              ? 'bg-[#041E17] dark:bg-[#065F46] text-white border-transparent shadow-xs'
              : 'bg-[#FAF8F5] dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:border-[#065F46]/50'
          }`}
        >
          Semua ({kpi.total})
        </button>
        {(Object.keys(CATEGORY_META) as KunjunganCategory[]).map((catKey) => {
          const meta = CATEGORY_META[catKey];
          const active = categoryFilter === catKey;
          return (
            <button
              key={catKey}
              type="button"
              onClick={() => setCategoryFilter(active ? 'ALL' : catKey)}
              className={`px-3.5 py-1.5 rounded-full font-hero text-[11px] font-bold transition-all cursor-pointer border ${
                active
                  ? 'bg-[#065F46] text-white border-transparent shadow-xs'
                  : 'bg-[#FAF8F5] dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:border-[#065F46]/50'
              }`}
            >
              {meta.shortLabel}: {kpi.byCategory[catKey]}
            </button>
          );
        })}
      </div>

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 mb-5">
        <div className="md:col-span-5 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kode tiket, nama, desa, perihal..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#FAF8F5] dark:bg-white/[0.05] border border-slate-200/90 dark:border-white/15 text-xs sm:text-sm text-[#041E17] dark:text-white focus:outline-none focus:border-[#065F46]"
          />
        </div>
        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 rounded-full bg-[#FAF8F5] dark:bg-[#0A1F1A] border border-slate-200/90 dark:border-white/15 text-xs sm:text-sm text-[#041E17] dark:text-white focus:outline-none focus:border-[#065F46]"
          >
            <option value="ALL">Semua Status</option>
            {(Object.keys(STATUS_META) as KunjunganStatus[]).map((st) => (
              <option key={st} value={st}>
                {STATUS_META[st].label}
              </option>
            ))}
          </select>
        </div>
        <div className={dateMode === 'custom' ? 'md:col-span-2' : 'md:col-span-4'}>
          <select
            value={dateMode}
            onChange={(e) => setDateMode(e.target.value as 'today' | 'all' | 'custom')}
            className="w-full px-4 py-2.5 rounded-full bg-[#FAF8F5] dark:bg-[#0A1F1A] border border-slate-200/90 dark:border-white/15 text-xs sm:text-sm text-[#041E17] dark:text-white focus:outline-none focus:border-[#065F46]"
          >
            <option value="today">Hari Ini</option>
            <option value="all">Semua Tanggal</option>
            <option value="custom">Pilih Tanggal</option>
          </select>
        </div>
        {dateMode === 'custom' && (
          <div className="md:col-span-2">
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-full bg-[#FAF8F5] dark:bg-[#0A1F1A] border border-slate-200/90 dark:border-white/15 text-xs text-[#041E17] dark:text-white focus:outline-none focus:border-[#065F46]"
            />
          </div>
        )}
      </div>

      {/* Tabel Rekap */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/85 dark:border-white/10">
        <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
          <thead>
            <tr className="bg-[#F3EFE6] dark:bg-white/[0.05] text-[#041E17] dark:text-[#E5C882] font-hero uppercase text-[10.5px] tracking-wider border-b border-slate-200/80 dark:border-white/10">
              <th className="py-3 px-4 font-bold">Kode Tiket &amp; Waktu</th>
              <th className="py-3 px-4 font-bold">Pengunjung &amp; Asal</th>
              <th className="py-3 px-4 font-bold">Kategori &amp; Tujuan</th>
              <th className="py-3 px-4 font-bold">Ringkasan Keperluan</th>
              <th className="py-3 px-4 font-bold">Status</th>
              <th className="py-3 px-4 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-[#065F46]" />
                  Memuat data kunjungan tamu...
                </td>
              </tr>
            ) : visibleRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500 dark:text-slate-400 font-hero">
                  Belum ada data kunjungan tamu pada filter ini.
                </td>
              </tr>
            ) : (
              visibleRecords.map((item) => {
                const cat = CATEGORY_META[item.category];
                const st = STATUS_META[item.status] || STATUS_META.MENUNGGU;
                const asal =
                  item.visitor.asal_desa_instansi === 'INSTANSI_LUAR'
                    ? item.visitor.asal_manual || 'Instansi / Luar Wilayah'
                    : item.visitor.asal_desa_instansi;
                const timeStr = new Date(item.created_at).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr
                    key={item.id || item.ticket_id}
                    onClick={() => openDetailModal(item)}
                    className="hover:bg-[#FAF8F5] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 align-middle">
                      <div className="font-mono font-bold text-[#065F46] dark:text-[#E5C882]">
                        {item.ticket_id}
                      </div>
                      <div className="font-mono text-[10.5px] text-slate-500 dark:text-slate-400">
                        {timeStr} WIB
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="font-hero font-bold text-[#041E17] dark:text-white">
                        {item.visitor.nama}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{asal}</div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#E5C882] font-hero text-[10px] font-bold">
                        {cat?.shortLabel || item.category}
                      </span>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        → {item.target_section}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle max-w-[230px]">
                      <div className="truncate text-slate-600 dark:text-slate-300" title={item.summary}>
                        {item.summary}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.lightBadge}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetailModal(item)}
                          className="h-8 w-8 rounded-full bg-[#FAF8F5] hover:bg-[#041E17] text-[#041E17] hover:text-white dark:bg-white/10 dark:text-white flex items-center justify-center transition-colors cursor-pointer"
                          title="Detail & Update Status"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => printKunjunganReceipt(item, 'resi')}
                          className="h-8 w-8 rounded-full bg-[#F3EFE6] hover:bg-[#065F46] text-[#065F46] hover:text-white dark:bg-[#064E3B]/60 dark:text-[#E5C882] flex items-center justify-center transition-colors cursor-pointer"
                          title="Cetak Struk Thermal"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        {item.status === 'SELESAI' && (
                          <a
                            href={buildWhatsAppFinishUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-hero text-[11px] font-bold transition-colors text-decoration-none"
                            title="Kirim WhatsApp Konfirmasi Selesai + Link SKM"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>WA</span>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DETAIL, RIWAYAT & UPDATE DISPOSISI PETUGAS */}
      {selected && (
        <div
          className="fixed inset-0 z-[1060] flex items-center justify-center p-3 sm:p-4 bg-[#041E17]/75 backdrop-blur-md"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[26px] bg-white dark:bg-[#0A1F1A] border border-slate-200/85 dark:border-white/15 p-5 sm:p-7 text-[#041E17] dark:text-slate-100 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/10">
              <div>
                <span className="font-mono text-sm font-extrabold text-[#065F46] dark:text-[#E5C882]">
                  {selected.ticket_id}
                </span>
                <h4 className="font-hero text-lg font-bold text-[#041E17] dark:text-white mt-0.5">
                  {CATEGORY_META[selected.category]?.label}
                </h4>
                <p className="font-hero text-xs text-slate-500 dark:text-slate-400">
                  {selected.visitor.nama} • WA: {selected.visitor.whatsapp}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Rincian Detail Dinamis */}
            <div className="rounded-2xl bg-[#FAF8F5] dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-mono text-[10px] uppercase text-slate-400 block">Asal Desa / Instansi</span>
                <strong className="font-hero text-sm text-[#041E17] dark:text-white">
                  {selected.visitor.asal_desa_instansi === 'INSTANSI_LUAR'
                    ? selected.visitor.asal_manual
                    : selected.visitor.asal_desa_instansi}
                </strong>
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase text-slate-400 block">Tujuan Pejabat / Seksi</span>
                <strong className="font-hero text-sm text-[#065F46] dark:text-[#E5C882]">
                  {selected.target_section}
                </strong>
              </div>
              {Object.entries(selected.details || {}).map(([k, v]) =>
                v ? (
                  <div key={k}>
                    <span className="font-mono text-[10px] uppercase text-slate-400 block">
                      {k.replace(/_/g, ' ')}
                    </span>
                    <span className="font-hero font-semibold text-[#041E17] dark:text-slate-200">
                      {String(v)}
                    </span>
                  </div>
                ) : null
              )}

              {selected.attachment?.dataUrl && (
                <div className="sm:col-span-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
                  <span className="font-mono text-[10px] uppercase text-slate-400 block mb-1.5">
                    Lampiran: {selected.attachment.name}
                  </span>
                  {selected.attachment.type.startsWith('image/') ? (
                    <img
                      src={selected.attachment.dataUrl}
                      alt={selected.attachment.name}
                      className="max-h-44 rounded-xl object-contain border border-slate-200 dark:border-white/10"
                    />
                  ) : (
                    <a
                      href={selected.attachment.dataUrl}
                      download={selected.attachment.name}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F3EFE6] text-[#065F46] font-hero text-xs font-bold text-decoration-none"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Unduh Lampiran</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Form Update Status & Disposisi Petugas */}
            <form
              onSubmit={handleUpdateStatus}
              className="rounded-2xl bg-[#F3EFE6]/80 dark:bg-[#064E3B]/30 border border-[#E5C882]/80 dark:border-cyan-800/40 p-4 space-y-3"
            >
              <div className="font-hero text-xs font-extrabold uppercase tracking-wider text-[#065F46] dark:text-[#E5C882]">
                Update Status &amp; Disposisi Petugas
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as KunjunganStatus)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-[#070f18] border border-slate-200 dark:border-white/15 text-xs font-semibold"
                >
                  {(Object.keys(STATUS_META) as KunjunganStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {STATUS_META[st].label}
                    </option>
                  ))}
                </select>
                <select
                  value={nextSection}
                  onChange={(e) => setNextSection(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-[#070f18] border border-slate-200 dark:border-white/15 text-xs font-semibold"
                >
                  {TARGET_SECTION_OPTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
                <input
                  value={actorName}
                  onChange={(e) => setActorName(e.target.value)}
                  placeholder="Nama Petugas"
                  className="px-3 py-2 rounded-xl bg-white dark:bg-[#070f18] border border-slate-200 dark:border-white/15 text-xs"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={disposisiNote}
                  onChange={(e) => setDisposisiNote(e.target.value)}
                  placeholder="Catatan disposisi / tindak lanjut (opsional)..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-[#070f18] border border-slate-200 dark:border-white/15 text-xs"
                />
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full bg-[#C8A253] hover:bg-[#041E17] text-[#041E17] hover:text-white font-hero text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>Simpan</span>
                </button>
              </div>
              {updateMsg && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{updateMsg}</span>
                </div>
              )}
            </form>

            {/* Riwayat Tracking Logs */}
            <div className="space-y-2">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Riwayat Disposisi &amp; Log Progres
              </div>
              <div className="space-y-2">
                {(selected.tracking_logs || []).map((log, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-white/[0.04] border-l-4 border-[#065F46] text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <strong className="text-[#065F46] dark:text-[#E5C882]">
                        {STATUS_META[log.status]?.label || log.status}
                      </strong>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </span>
                      <span>•</span>
                      <span>{log.actor}</span>
                    </div>
                    <div className="mt-1 font-hero text-[#041E17] dark:text-slate-200">{log.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Aksi */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-200/80 dark:border-white/10">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => printKunjunganReceipt(selected, 'resi')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#065F46] hover:bg-[#041E17] text-white font-hero text-xs font-bold transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Cetak Tanda Terima</span>
                </button>
                <button
                  type="button"
                  onClick={() => printKunjunganReceipt(selected, 'disposisi')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FAF8F5] hover:bg-[#F3EFE6] dark:bg-white/10 text-[#041E17] dark:text-white border border-slate-200 dark:border-white/15 font-hero text-xs font-bold transition-colors cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-[#065F46] dark:text-[#E5C882]" />
                  <span>Cetak Lembar Disposisi</span>
                </button>
                {selected.status === 'SELESAI' && (
                  <a
                    href={buildWhatsAppFinishUrl(selected)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-hero text-xs font-bold transition-colors text-decoration-none"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>Kirim WA + Link SKM</span>
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-5 py-2 rounded-full bg-[#041E17] hover:bg-[#065F46] text-white font-hero text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </PresentationSheet>
  );
}
