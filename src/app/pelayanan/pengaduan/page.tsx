'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/firebase';
import {
  MessageSquare,
  Info,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Send,
  RefreshCw,
  Loader2,
  Phone,
  Search,
  Filter,
  User,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PengaduanItem {
  id: string;
  jenis: 'pengaduan' | 'informasi';
  nama: string;
  nik?: string;
  nohp: string;
  email?: string;
  subjek: string;
  isi: string;
  status: 'baru' | 'diproses' | 'selesai' | 'ditolak';
  balasan?: string;
  dibalasOleh?: string;
  diprosesPada?: string;
  dibalas?: boolean;
  createdAt: string;
  updatedAt?: string;
}

const STATUS_CONFIG = {
  baru: { label: 'Baru', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: AlertCircle },
  diproses: { label: 'Diproses', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  selesai: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  ditolak: { label: 'Ditolak', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: XCircle },
};

const JENIS_CONFIG = {
  pengaduan: { label: 'Pengaduan', color: 'bg-rose-50 text-rose-600 border-rose-200' },
  informasi: { label: 'Informasi', color: 'bg-blue-50 text-blue-600 border-blue-200' },
};

export default function PengaduanAdminPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [data, setData] = useState<PengaduanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterJenis, setFilterJenis] = useState<string>('semua');
  const [filterStatus, setFilterStatus] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyStatus, setReplyStatus] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pengaduan', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
        // Init default status for replies
        const initStatus: Record<string, string> = {};
        (json.data || []).forEach((item: PengaduanItem) => {
          initStatus[item.id] = item.status;
        });
        setReplyStatus(initStatus);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveReply = async (item: PengaduanItem) => {
    setSavingId(item.id);
    try {
      const res = await fetch('/api/pengaduan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          balasan: replyText[item.id] ?? item.balasan ?? '',
          status: replyStatus[item.id] ?? item.status,
          dibalasOleh: user?.displayName || user?.email || 'Admin',
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: 'Berhasil', description: 'Balasan dan status berhasil disimpan.' });
        fetchData();
        setExpandedId(null);
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    } finally {
      setSavingId(null);
    }
  };

  const filteredData = data.filter(item => {
    const matchJenis = filterJenis === 'semua' || item.jenis === filterJenis;
    const matchStatus = filterStatus === 'semua' || item.status === filterStatus;
    const matchSearch =
      !searchQuery ||
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subjek.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nohp.includes(searchQuery);
    return matchJenis && matchStatus && matchSearch;
  });

  const countByStatus = (s: string) => data.filter(d => d.status === s).length;

  const formatDate = (iso: string) => {
    try {
      return format(parseISO(iso), 'd MMM yyyy, HH:mm', { locale: localeID });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Manajemen Pengaduan & Informasi
            </h1>
            <p className="text-xs text-slate-500">Kelola dan balas pesan masuk dari masyarakat</p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', count: data.length, color: 'bg-slate-900 text-white', iconBg: 'bg-white/10' },
          { label: 'Baru', count: countByStatus('baru'), color: 'bg-rose-500 text-white', iconBg: 'bg-white/10' },
          { label: 'Diproses', count: countByStatus('diproses'), color: 'bg-amber-500 text-white', iconBg: 'bg-white/10' },
          { label: 'Selesai', count: countByStatus('selesai'), color: 'bg-emerald-500 text-white', iconBg: 'bg-white/10' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4 shadow-sm`}>
            <p className="text-3xl font-black leading-none">{s.count}</p>
            <p className="text-xs font-semibold opacity-80 mt-1 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama, subjek, atau no. HP..."
            className="pl-9 rounded-xl text-sm bg-white"
          />
        </div>
        <Select value={filterJenis} onValueChange={setFilterJenis}>
          <SelectTrigger className="w-full sm:w-36 rounded-xl bg-white text-sm">
            <SelectValue placeholder="Jenis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Jenis</SelectItem>
            <SelectItem value="pengaduan">Pengaduan</SelectItem>
            <SelectItem value="informasi">Informasi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-36 rounded-xl bg-white text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            <SelectItem value="baru">Baru</SelectItem>
            <SelectItem value="diproses">Diproses</SelectItem>
            <SelectItem value="selesai">Selesai</SelectItem>
            <SelectItem value="ditolak">Ditolak</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={fetchData}
          className="rounded-xl shrink-0 gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Muat Ulang
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Memuat data pengaduan...</span>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Belum ada pengaduan</p>
          <p className="text-sm mt-1">Data pengaduan yang masuk akan tampil di sini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredData.map(item => {
            const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.baru;
            const jenisCfg = JENIS_CONFIG[item.jenis] || JENIS_CONFIG.pengaduan;
            const StatusIcon = statusCfg.icon;
            const isExpanded = expandedId === item.id;

            return (
              <Card key={item.id} className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
                {/* Header row */}
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${jenisCfg.color}`}>
                          {jenisCfg.label}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                        {item.dibalas && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                            Sudah Dibalas
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 text-sm leading-snug truncate">{item.subjek}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">{item.nama}</span>
                        {' · '}
                        <span>{item.nohp}</span>
                        {' · '}
                        <span>{formatDate(item.createdAt)}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardContent>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-border/50 p-4 space-y-4 bg-slate-50/60">
                    {/* Detail Pengirim */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[
                        { label: 'Nama Lengkap', value: item.nama },
                        { label: 'No. HP/WA', value: item.nohp },
                        { label: 'NIK', value: item.nik || '-' },
                        { label: 'Email', value: item.email || '-' },
                      ].map(f => (
                        <div key={f.label} className="bg-white rounded-xl p-3 border border-border/60">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{f.label}</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{f.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Isi Pengaduan */}
                    <div className="bg-white rounded-xl p-3.5 border border-border/60">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Isi {item.jenis === 'informasi' ? 'Permintaan Informasi' : 'Pengaduan'}</span>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{item.isi}</p>
                    </div>

                    {/* Balasan sebelumnya */}
                    {item.balasan && (
                      <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-1.5">
                          Balasan dari {item.dibalasOleh || 'Admin'}
                        </span>
                        <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-line">{item.balasan}</p>
                        {item.diprosesPada && (
                          <p className="text-[10px] text-emerald-600 mt-1.5">{formatDate(item.diprosesPada)}</p>
                        )}
                      </div>
                    )}

                    {/* Form Balas */}
                    <div className="space-y-3">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">Tulis Balasan</span>
                      <Textarea
                        value={replyText[item.id] ?? item.balasan ?? ''}
                        onChange={e => setReplyText(prev => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder="Tulis balasan untuk pengirim..."
                        className="rounded-xl min-h-[100px] text-sm bg-white"
                      />

                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="flex-1">
                          <Select
                            value={replyStatus[item.id] ?? item.status}
                            onValueChange={v => setReplyStatus(prev => ({ ...prev, [item.id]: v }))}
                          >
                            <SelectTrigger className="rounded-xl bg-white text-sm">
                              <SelectValue placeholder="Ubah Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="baru">Baru</SelectItem>
                              <SelectItem value="diproses">Diproses</SelectItem>
                              <SelectItem value="selesai">Selesai</SelectItem>
                              <SelectItem value="ditolak">Ditolak</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          {/* Hubungi via WA */}
                          <a
                            href={`https://wa.me/62${item.nohp.replace(/^0/, '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${item.nama}, kami merespons pengaduan Anda: "${item.subjek}".`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            WA
                          </a>

                          <Button
                            onClick={() => handleSaveReply(item)}
                            disabled={savingId === item.id}
                            className="rounded-xl text-xs font-bold gap-2"
                          >
                            {savingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            Simpan Balasan
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
