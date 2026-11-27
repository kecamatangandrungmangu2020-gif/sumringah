'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageSquare,
  PhoneCall,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  FileCheck2,
  MapPin,
  Ticket,
} from 'lucide-react';
import { BackgroundPattern } from '@/components/landing/BackgroundPattern';
import { NightModeSwitch } from '@/components/ui/NightModeSwitch';

export default function PengaduanPublicPage() {
  const [jenis, setJenis] = useState<'pengaduan' | 'informasi'>('pengaduan');
  const [form, setForm] = useState({ nama: '', nik: '', nohp: '', email: '', subjek: '', isi: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.nohp.trim() || !form.subjek.trim() || !form.isi.trim()) {
      setError('Nama, No. HP/WhatsApp, Subjek, dan Isi wajib diisi.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/pengaduan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, jenis }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setForm({ nama: '', nik: '', nohp: '', email: '', subjek: '', isi: '' });
      } else {
        setError(json.message || 'Gagal mengirim. Silakan coba lagi.');
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const slaItems = [
    { label: 'Pengaduan Darurat', time: '1 x 24 Jam', code: '01' },
    { label: 'Pengaduan Umum', time: '3 x 24 Jam', code: '02' },
    { label: 'Permintaan Informasi', time: '5 x 24 Jam', code: '03' },
  ];

  const alurSteps = [
    { no: '01', title: 'Kirim Laporan', desc: 'Isi formulir lengkap atau hubungi Siaga WA.' },
    { no: '02', title: 'Verifikasi Admin', desc: 'Petugas memvalidasi & mencatat tiket resmi.' },
    { no: '03', title: 'Tindak Lanjut', desc: 'Diteruskan ke bidang / seksi terkait.' },
    { no: '04', title: 'Respons Resmi', desc: 'Jawaban dikirim via WhatsApp / Email Anda.' },
  ];

  return (
    <div className="relative min-h-screen bg-[#FAF8F5] dark:bg-[#05110E] text-[#041E17] dark:text-[#FAF8F5] flex flex-col transition-colors duration-300 overflow-x-clip">
      <BackgroundPattern />

      {/* Floating Capsule Header */}
      <header className="sticky top-0 z-40 px-3 sm:px-6 pt-2.5 pb-1.5">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3 px-4 h-13 sm:h-14 rounded-full bg-white/95 dark:bg-[#0A1F1A]/95 backdrop-blur-xl border border-[#E6E0D3] dark:border-[#C8A253]/20 shadow-[0_8px_24px_rgba(4,30,23,0.08)]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#065F46] hover:bg-[#041E17] text-white font-hero text-xs font-bold transition-all shadow-sm shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Beranda</span>
            </Link>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="font-hero font-extrabold text-sm text-[#041E17] dark:text-white leading-none truncate">
                Pusat Pengaduan &amp; Informasi Warga
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#065F46] dark:text-[#E5C882] mt-0.5">
                Kecamatan Gandrungmangu • Transparan &amp; Responsif
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/Antrian/online/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F3EFE6] hover:bg-[#C8A253] text-[#041E17] dark:bg-white/10 dark:text-[#E5C882] border border-[#C8A253]/30 font-hero text-[11px] font-bold transition-all"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Antrian Online</span>
            </Link>
            <NightModeSwitch size="sm" />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 flex-1 space-y-5">
        {/* Sovereign Deep Emerald Hero Banner */}
        <section className="relative overflow-hidden rounded-[24px] p-5 sm:p-7 bg-gradient-to-br from-[#065F46] via-[#064E3B] to-[#041E17] text-white border border-[#C8A253]/30 shadow-[0_18px_45px_rgba(4,30,23,0.2)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-3 bottom-0 w-32 h-36 opacity-[0.18] bg-no-repeat bg-contain bg-right-bottom"
            style={{ backgroundImage: "url('/images/tugu-gandrungmangu-silhouette.webp')" }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/12 border border-[#E5C882]/35 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#E5C882]">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Pusat Interaksi &amp; Layanan Cepat</span>
              </div>
              <h1 className="font-hero font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight">
                Pengaduan &amp; Permintaan <span className="text-[#E5C882]">Informasi Warga</span>
              </h1>
              <p className="font-hero text-xs sm:text-sm text-[#F5E9CC]/90 leading-relaxed">
                Sampaikan keluhan, aspirasi, masukan pelayanan, atau permintaan informasi resmi. Identitas Anda terlindungi dan setiap laporan ditangani secara transparan.
              </p>
            </div>

            <a
              href="https://wa.me/6289508811484?text=Halo,%20saya%20ingin%20menyampaikan%20pengaduan%20kepada%20Kecamatan%20Gandrungmangu."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#C8A253] hover:bg-white text-[#041E17] font-hero text-xs font-extrabold uppercase tracking-wider shrink-0 shadow-lg transition-all"
            >
              <PhoneCall className="h-4 w-4" />
              <span>WhatsApp 6289508811484</span>
            </a>
          </div>
        </section>

        {/* Alur Penanganan 4 Langkah */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {alurSteps.map((st) => (
            <div
              key={st.no}
              className="rounded-2xl bg-white/95 dark:bg-[#0A1F1A]/95 border border-[#E6E0D3] dark:border-[#C8A253]/20 p-4 shadow-sm flex items-start gap-3"
            >
              <span className="h-8 w-8 rounded-xl bg-[#065F46] text-[#E5C882] font-mono text-xs font-black flex items-center justify-center shrink-0">
                {st.no}
              </span>
              <div className="min-w-0">
                <h2 className="font-hero text-xs sm:text-sm font-extrabold text-[#041E17] dark:text-white leading-tight">
                  {st.title}
                </h2>
                <p className="mt-0.5 font-hero text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {st.desc}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* Konten Utama: Kiri Info SLA + Kanan Form Lengkap */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* KIRI (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="card-Kecamatan p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-hero font-extrabold text-sm sm:text-base text-[#041E17] dark:text-white">
                  Standar Waktu Respons
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#065F46] text-white font-mono text-[9.5px] font-bold uppercase">
                  SLA Resmi
                </span>
              </div>

              <div className="space-y-3">
                {slaItems.map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center gap-3 pb-2.5 border-b border-dashed border-[#E6E0D3] dark:border-white/15 last:border-0 last:pb-0"
                  >
                    <span className="h-7 w-7 rounded-full bg-[#041E17] dark:bg-[#065F46] text-white flex items-center justify-center shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-hero text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1">
                      {item.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#065F46] dark:text-[#E5C882] shrink-0">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] bg-[#F3EFE6] dark:bg-[#064E3B]/40 border border-[#C8A253]/40 p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-[#065F46] dark:text-[#E5C882]">
                <ShieldCheck className="h-4 w-4" />
                <h4 className="font-hero font-extrabold text-xs uppercase tracking-wider">
                  Jaminan Kerahasiaan
                </h4>
              </div>
              <p className="font-hero text-xs text-slate-600 dark:text-slate-200 leading-relaxed">
                Identitas pelapor dilindungi penuh sesuai ketentuan keterbukaan informasi publik dan langsung diteruskan ke petugas berwenang Kecamatan Gandrungmangu.
              </p>
            </div>

            <div className="rounded-[22px] bg-white/95 dark:bg-[#0A1F1A]/95 border border-[#E6E0D3] dark:border-white/10 p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-[#065F46] dark:text-[#E5C882]">
                <MapPin className="h-4 w-4" />
                <h4 className="font-hero font-extrabold text-xs uppercase tracking-wider">
                  Layanan Langsung Kantor
                </h4>
              </div>
              <p className="font-hero text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Kantor Kecamatan Gandrungmangu, Kabupaten Cilacap. Senin–Kamis (07.30–16.00 WIB) &amp; Jumat (07.30–14.30 WIB).
              </p>
              <Link
                href="/kunjungan-tamu/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#065F46] dark:text-[#E5C882] hover:underline pt-1"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Atau buat Register Kunjungan Front Office →</span>
              </Link>
            </div>
          </div>

          {/* KANAN (8 cols): Formulir Lengkap */}
          <div className="lg:col-span-8">
            {success ? (
              <div className="card-Kecamatan p-10 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-hero text-xl font-extrabold text-[#041E17] dark:text-white">
                  {jenis === 'informasi' ? 'Permintaan Informasi Terkirim!' : 'Pengaduan Anda Terkirim!'}
                </h3>
                <p className="font-hero text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
                  Terima kasih atas partisipasi Anda. Tim Kecamatan Gandrungmangu akan segera menindaklanjuti dan menghubungi Anda melalui WhatsApp atau email yang dicantumkan.
                </p>
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#041E17] hover:bg-[#065F46] text-white font-hero font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Kirim Laporan Lainnya
                </button>
              </div>
            ) : (
              <div className="rounded-[24px] bg-white/95 dark:bg-[#0A1F1A]/95 border border-[#E6E0D3] dark:border-[#C8A253]/20 p-5 sm:p-7 shadow-sm space-y-5">
                {/* Tab Switcher */}
                <div className="flex gap-2 p-1.5 rounded-full bg-[#FAF8F5] dark:bg-[#05110E] border border-[#E6E0D3] dark:border-white/10">
                  {[
                    { value: 'pengaduan' as const, label: 'Pengaduan Masyarakat' },
                    { value: 'informasi' as const, label: 'Permintaan Informasi' },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setJenis(tab.value)}
                      className={`flex-1 py-2.5 rounded-full font-hero text-xs font-bold transition-all duration-200 cursor-pointer ${
                        jenis === tab.value
                          ? 'bg-[#065F46] text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-[#041E17] dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#041E17] dark:text-slate-200 mb-1.5">
                        Nama Lengkap <span className="text-rose-500">*</span>
                      </label>
                      <input
                        name="nama"
                        value={form.nama}
                        onChange={handleChange}
                        required
                        placeholder="Nama lengkap Anda"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#05110E] border border-[#E6E0D3] dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#041E17] dark:text-slate-200 mb-1.5">
                        NIK (Opsional)
                      </label>
                      <input
                        name="nik"
                        value={form.nik}
                        onChange={handleChange}
                        maxLength={16}
                        placeholder="16 digit NIK (opsional)"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#05110E] border border-[#E6E0D3] dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#041E17] dark:text-slate-200 mb-1.5">
                        No. HP / WhatsApp <span className="text-rose-500">*</span>
                      </label>
                      <input
                        name="nohp"
                        value={form.nohp}
                        onChange={handleChange}
                        required
                        type="tel"
                        placeholder="08xx-xxxx-xxxx"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#05110E] border border-[#E6E0D3] dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#041E17] dark:text-slate-200 mb-1.5">
                        Email (Opsional)
                      </label>
                      <input
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        type="email"
                        placeholder="email@contoh.com"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#05110E] border border-[#E6E0D3] dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#041E17] dark:text-slate-200 mb-1.5">
                      Subjek / Judul <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="subjek"
                      value={form.subjek}
                      onChange={handleChange}
                      required
                      placeholder={
                        jenis === 'informasi'
                          ? 'Contoh: Permintaan data kependudukan Kecamatan'
                          : 'Contoh: Laporan pelayanan atau infrastruktur wilayah'
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#05110E] border border-[#E6E0D3] dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-hero text-[11px] font-bold uppercase tracking-wider text-[#041E17] dark:text-slate-200 mb-1.5">
                      {jenis === 'informasi' ? 'Detail Informasi yang Diminta' : 'Uraian Pengaduan'}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      name="isi"
                      value={form.isi}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder={
                        jenis === 'informasi'
                          ? 'Jelaskan informasi yang Anda butuhkan secara rinci...'
                          : 'Jelaskan masalah yang terjadi secara rinci (lokasi, waktu, kronologi)...'
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#05110E] border border-[#E6E0D3] dark:border-white/15 text-[#041E17] dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/20 transition-all resize-none leading-relaxed"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-full neu-btn-primary font-hero font-bold text-xs uppercase tracking-wider disabled:opacity-60 cursor-pointer"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>
                        {submitting
                          ? 'Mengirim...'
                          : jenis === 'informasi'
                            ? 'Kirim Permintaan'
                            : 'Kirim Pengaduan'}
                      </span>
                    </button>
                    <p className="font-hero text-slate-500 dark:text-slate-400 text-[11px]">
                      Data Anda dilindungi dan hanya digunakan untuk keperluan pelayanan resmi.
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
